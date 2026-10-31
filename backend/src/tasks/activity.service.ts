import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginated } from '../common/pagination';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { User } from '../users/user.entity';
import { TaskActivity } from './task-activity.entity';
import { TasksService } from './tasks.service';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(TaskActivity)
    private readonly activityRepo: Repository<TaskActivity>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly tasksService: TasksService,
  ) {}

  async list(projectId: string, taskId: string, query: PaginationQueryDto) {
    await this.tasksService.assertExists(projectId, taskId);

    const [activities, total] = await this.activityRepo.findAndCount({
      where: { taskId },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    const assignees = await this.loadAssigneeNames(activities);

    const data = activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      actor: activity.actor ? { id: activity.actor.id, name: activity.actor.name } : null,
      changes: (activity.changes ?? []).map((change) =>
        change.field === 'assignee'
          ? { ...change, from: assignees(change.from), to: assignees(change.to) }
          : change,
      ),
      createdAt: activity.createdAt,
    }));

    return paginated(data, total, query);
  }

  // History stores user ids; names are looked up in one query so renames show up correctly.
  private async loadAssigneeNames(activities: TaskActivity[]) {
    const ids = new Set<string>();
    for (const activity of activities) {
      for (const change of activity.changes ?? []) {
        if (change.field !== 'assignee') continue;
        if (change.from) ids.add(change.from);
        if (change.to) ids.add(change.to);
      }
    }

    const users = ids.size > 0 ? await this.usersRepo.find({ where: { id: In([...ids]) } }) : [];
    const byId = new Map(users.map((u) => [u.id, u.name]));

    return (id: string | null) => (id ? { id, name: byId.get(id) ?? null } : null);
  }
}
