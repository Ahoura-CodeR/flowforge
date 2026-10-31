import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Not, Repository } from 'typeorm';
import { omitUndefined } from '../common/omit-undefined';
import { paginated } from '../common/pagination';
import { MembersService } from '../projects/members.service';
import { Project } from '../projects/project.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskActivity, TaskActivityAction } from './task-activity.entity';
import { diffTask, pickTracked } from './task-diff';
import { needsRebalance, POSITION_GAP, positionBetween } from './task-position';
import { Task, TaskStatus } from './task.entity';
import { toTaskResponse } from './task.mapper';

const TASK_RELATIONS = { project: true, assignee: true, reporter: true } as const;

/** Makes user input safe to embed in a LIKE pattern: %, _ and \ lose their special meaning. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepo: Repository<Task>,
    private readonly membersService: MembersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(projectId: string, reporterId: string, dto: CreateTaskDto) {
    await this.assertAssigneeIsMember(projectId, dto.assigneeId);

    const taskId = await this.dataSource.transaction(async (manager) => {
      // Incrementing in SQL (not read-then-write) keeps numbers unique under concurrent requests.
      const result = await manager
        .createQueryBuilder()
        .update(Project)
        .set({ taskCounter: () => 'task_counter + 1' })
        .where('id = :projectId', { projectId })
        .returning('task_counter')
        .execute();

      const nextNumber = (result.raw as { task_counter: number }[])[0]?.task_counter;
      if (nextNumber === undefined) {
        throw new NotFoundException('Project not found');
      }

      const task = await manager.save(
        manager.create(Task, {
          ...omitUndefined(dto),
          projectId,
          reporterId,
          number: nextNumber,
          position: await this.endPosition(manager, projectId, dto.status ?? TaskStatus.TODO),
        }),
      );

      await manager.save(
        manager.create(TaskActivity, {
          taskId: task.id,
          actorId: reporterId,
          action: TaskActivityAction.CREATED,
          changes: null,
        }),
      );
      return task.id;
    });

    return this.findOne(projectId, taskId);
  }

  async findAll(projectId: string, userId: string, query: ListTasksQueryDto) {
    const qb = this.tasksRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.reporter', 'reporter')
      .where('task.projectId = :projectId', { projectId });

    if (query.status?.length) {
      qb.andWhere('task.status IN (:...statuses)', { statuses: query.status });
    }
    if (query.priority?.length) {
      qb.andWhere('task.priority IN (:...priorities)', { priorities: query.priority });
    }
    if (query.assignee === 'unassigned') {
      qb.andWhere('task.assigneeId IS NULL');
    } else if (query.assignee) {
      const assigneeId = query.assignee === 'me' ? userId : query.assignee;
      qb.andWhere('task.assigneeId = :assigneeId', { assigneeId });
    }
    if (query.search) {
      const pattern = `%${escapeLike(query.search)}%`;
      qb.andWhere(
        new Brackets((sub) =>
          sub
            .where('task.title ILIKE :pattern', { pattern })
            .orWhere('task.description ILIKE :pattern', { pattern }),
        ),
      );
    }
    if (query.dueBefore) {
      qb.andWhere('task.dueDate <= :dueBefore', { dueBefore: query.dueBefore });
    }
    if (query.dueAfter) {
      qb.andWhere('task.dueDate >= :dueAfter', { dueAfter: query.dueAfter });
    }

    // sortBy is validated against a whitelist in the DTO, so it's safe to build the column name.
    const direction = query.order === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`task.${query.sortBy}`, direction, 'NULLS LAST');
    if (query.sortBy !== 'number') {
      qb.addOrderBy('task.number', 'DESC'); // tie-breaker so pages don't overlap
    }

    const [tasks, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return paginated(tasks.map(toTaskResponse), total, query);
  }

  async findOne(projectId: string, taskId: string) {
    // Filtering by projectId too means a task id from another project is a 404, not a data leak.
    const task = await this.tasksRepo.findOne({
      where: { id: taskId, projectId },
      relations: TASK_RELATIONS,
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return toTaskResponse(task);
  }

  async assertExists(projectId: string, taskId: string): Promise<void> {
    const exists = await this.tasksRepo.exists({ where: { id: taskId, projectId } });
    if (!exists) {
      throw new NotFoundException('Task not found');
    }
  }

  async update(projectId: string, taskId: string, actorId: string, dto: UpdateTaskDto) {
    const task = await this.tasksRepo.findOne({ where: { id: taskId, projectId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.assertAssigneeIsMember(projectId, dto.assigneeId);

    const before = pickTracked(task);
    Object.assign(task, omitUndefined(dto));
    const changes = diffTask(before, pickTracked(task));

    // Nothing actually changed: no write, no noise in the history.
    if (changes.length > 0) {
      await this.dataSource.transaction(async (manager) => {
        // A task whose status changed lands at the bottom of its new column.
        if (task.status !== before.status) {
          task.position = await this.endPosition(manager, projectId, task.status);
        }
        await manager.save(task);
        await manager.save(
          manager.create(TaskActivity, {
            taskId,
            actorId,
            action: TaskActivityAction.UPDATED,
            changes,
          }),
        );
      });
    }

    return this.findOne(projectId, taskId);
  }

  /** Drag and drop on the board: change column and/or order in one call. */
  async move(projectId: string, taskId: string, actorId: string, dto: MoveTaskDto) {
    await this.dataSource.transaction(async (manager) => {
      // Lock the project row so two simultaneous drags can't compute positions from stale neighbours.
      await manager.findOne(Project, { where: { id: projectId }, lock: { mode: 'pessimistic_write' } });

      const task = await manager.findOne(Task, { where: { id: taskId, projectId } });
      if (!task) {
        throw new NotFoundException('Task not found');
      }

      let column = await manager.find(Task, {
        where: { projectId, status: dto.status, id: Not(taskId) },
        order: { position: 'ASC', number: 'ASC' },
        select: { id: true, position: true },
      });

      let index = column.length; // default: end of the column
      if (dto.beforeId) {
        index = column.findIndex((t) => t.id === dto.beforeId);
        if (index === -1) {
          throw new BadRequestException('beforeId is not a task in the target column');
        }
      }

      if (needsRebalance(column[index - 1]?.position, column[index]?.position)) {
        column = await this.rebalance(manager, column);
      }
      const position = positionBetween(column[index - 1]?.position, column[index]?.position);

      const before = pickTracked(task);
      task.status = dto.status;
      task.position = position;
      await manager.save(task);

      // Reordering inside a column isn't history; changing column is.
      const changes = diffTask(before, pickTracked(task));
      if (changes.length > 0) {
        await manager.save(
          manager.create(TaskActivity, {
            taskId,
            actorId,
            action: TaskActivityAction.UPDATED,
            changes,
          }),
        );
      }
    });

    return this.findOne(projectId, taskId);
  }

  async remove(projectId: string, taskId: string): Promise<void> {
    const result = await this.tasksRepo.delete({ id: taskId, projectId });
    if (result.affected === 0) {
      throw new NotFoundException('Task not found');
    }
  }

  // `null` (unassign) and `undefined` (not provided) are both fine; only real ids are checked.
  private async assertAssigneeIsMember(projectId: string, assigneeId?: string | null) {
    if (!assigneeId) {
      return;
    }
    const membership = await this.membersService.findMembership(projectId, assigneeId);
    if (!membership) {
      throw new BadRequestException('Assignee must be a member of the project');
    }
  }

  private async endPosition(manager: EntityManager, projectId: string, status: TaskStatus) {
    const row = await manager
      .createQueryBuilder(Task, 'task')
      .select('MAX(task.position)', 'max')
      .where('task.projectId = :projectId AND task.status = :status', { projectId, status })
      .getRawOne<{ max: number | null }>();
    return Number(row?.max ?? 0) + POSITION_GAP;
  }

  /** Re-spaces a column evenly. Rare: only when repeated midpoints exhaust floating point precision. */
  private async rebalance(manager: EntityManager, column: Task[]): Promise<Task[]> {
    const respaced = column.map((task, i) => ({ ...task, position: (i + 1) * POSITION_GAP }) as Task);
    for (const task of respaced) {
      await manager.update(Task, { id: task.id }, { position: task.position });
    }
    return respaced;
  }
}
