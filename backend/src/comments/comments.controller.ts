import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { CurrentMembership } from '../projects/decorators/current-membership.decorator';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';
import { ProjectRoleGuard } from '../projects/guards/project-role.guard';
import { ProjectMember } from '../projects/project-member.entity';
import { ProjectRole } from '../projects/project-role.enum';
import { CommentsService } from './comments.service';
import { CommentBodyDto } from './dto/comment-body.dto';

// Viewers can read the discussion; members can write. Edit/delete rules live in the service.
@ApiTags('comments')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks/:taskId/comments')
@UseGuards(ProjectRoleGuard)
@RequireProjectRole(ProjectRole.VIEWER)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.commentsService.list(projectId, taskId, query);
  }

  @Post()
  @RequireProjectRole(ProjectRole.MEMBER)
  create(
    @Param('projectId') projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CommentBodyDto,
  ) {
    return this.commentsService.create(projectId, taskId, user.id, dto.body);
  }

  @Patch(':commentId')
  @RequireProjectRole(ProjectRole.MEMBER)
  update(
    @Param('projectId') projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CommentBodyDto,
  ) {
    return this.commentsService.update(projectId, taskId, commentId, user.id, dto.body);
  }

  @Delete(':commentId')
  @RequireProjectRole(ProjectRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('projectId') projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthUser,
    @CurrentMembership() membership: ProjectMember,
  ) {
    return this.commentsService.remove(projectId, taskId, commentId, user.id, membership);
  }
}
