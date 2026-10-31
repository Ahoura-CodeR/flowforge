import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginated } from '../common/pagination';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { ProjectMember } from '../projects/project-member.entity';
import { ProjectRole } from '../projects/project-role.enum';
import { TasksService } from '../tasks/tasks.service';
import { Comment } from './comment.entity';

const toCommentResponse = (comment: Comment) => ({
  id: comment.id,
  body: comment.body,
  author: comment.author ? { id: comment.author.id, name: comment.author.name } : null,
  createdAt: comment.createdAt,
  editedAt: comment.editedAt,
});

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepo: Repository<Comment>,
    private readonly tasksService: TasksService,
  ) {}

  async list(projectId: string, taskId: string, query: PaginationQueryDto) {
    await this.tasksService.assertExists(projectId, taskId);

    const [comments, total] = await this.commentsRepo.findAndCount({
      where: { taskId },
      relations: { author: true },
      order: { createdAt: 'ASC' }, // conversations read oldest to newest
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(comments.map(toCommentResponse), total, query);
  }

  async create(projectId: string, taskId: string, authorId: string, body: string) {
    await this.tasksService.assertExists(projectId, taskId);

    const saved = await this.commentsRepo.save(
      this.commentsRepo.create({ taskId, authorId, body }),
    );
    return this.findOneOrFail(projectId, taskId, saved.id).then(toCommentResponse);
  }

  async update(projectId: string, taskId: string, commentId: string, userId: string, body: string) {
    const comment = await this.findOneOrFail(projectId, taskId, commentId);
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.body = body;
    comment.editedAt = new Date();
    await this.commentsRepo.save(comment);
    return toCommentResponse(comment);
  }

  /** Authors can delete their own comments; the project owner can moderate any comment. */
  async remove(
    projectId: string,
    taskId: string,
    commentId: string,
    userId: string,
    membership: ProjectMember,
  ): Promise<void> {
    const comment = await this.findOneOrFail(projectId, taskId, commentId);
    const canDelete = comment.authorId === userId || membership.role === ProjectRole.OWNER;
    if (!canDelete) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.commentsRepo.delete(comment.id);
  }

  // The nested `task.projectId` condition makes sure the comment really belongs to this project.
  private async findOneOrFail(projectId: string, taskId: string, commentId: string) {
    const comment = await this.commentsRepo.findOne({
      where: { id: commentId, taskId, task: { projectId } },
      relations: { author: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }
}
