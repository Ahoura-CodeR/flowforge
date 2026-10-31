import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isUniqueViolation } from '../common/db-errors';
import { Task } from '../tasks/task.entity';
import { UsersService } from '../users/users.service';
import { AddMemberDto } from './dto/add-member.dto';
import { ProjectMember } from './project-member.entity';
import { ProjectRole } from './project-role.enum';
import { toMemberResponse } from './project.mapper';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly membersRepo: Repository<ProjectMember>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  findMembership(projectId: string, userId: string): Promise<ProjectMember | null> {
    return this.membersRepo.findOne({ where: { projectId, userId } });
  }

  async list(projectId: string) {
    const members = await this.membersRepo.find({
      where: { projectId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });
    return members.map(toMemberResponse);
  }

  async add(projectId: string, dto: AddMemberDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('No registered user with this email');
    }

    try {
      const member = await this.membersRepo.save(
        this.membersRepo.create({ projectId, userId: user.id, role: dto.role }),
      );
      return toMemberResponse({ ...member, user });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('This user is already a member of the project');
      }
      throw err;
    }
  }

  async updateRole(projectId: string, userId: string, role: ProjectRole) {
    const member = await this.membersRepo.findOne({
      where: { projectId, userId },
      relations: { user: true },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    if (member.role === ProjectRole.OWNER) {
      throw new BadRequestException('The owner role cannot be changed');
    }

    member.role = role;
    await this.membersRepo.save(member);
    return toMemberResponse(member);
  }

  /** The owner can remove anyone; everyone else can only remove themselves (leave). */
  async remove(projectId: string, targetUserId: string, actor: ProjectMember): Promise<void> {
    const isSelf = actor.userId === targetUserId;
    if (!isSelf && actor.role !== ProjectRole.OWNER) {
      throw new ForbiddenException('Only the project owner can remove other members');
    }

    const target = isSelf ? actor : await this.findMembership(projectId, targetUserId);
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    if (target.role === ProjectRole.OWNER) {
      throw new BadRequestException('The project owner cannot be removed');
    }

    await this.dataSource.transaction(async (manager) => {
      // A removed member shouldn't keep tasks assigned to them.
      await manager.update(Task, { projectId, assigneeId: targetUserId }, { assigneeId: null });
      await manager.delete(ProjectMember, { id: target.id });
    });
  }
}
