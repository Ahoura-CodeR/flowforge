import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';
import { ProjectRoleGuard } from '../projects/guards/project-role.guard';
import { ProjectRole } from '../projects/project-role.enum';
import { ActivityService } from './activity.service';

@ApiTags('activity')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks/:taskId/activity')
@UseGuards(ProjectRoleGuard)
@RequireProjectRole(ProjectRole.VIEWER)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.activityService.list(projectId, taskId, query);
  }
}
