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
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';
import { ProjectRoleGuard } from '../projects/guards/project-role.guard';
import { ProjectRole } from '../projects/project-role.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

// Viewers can read; members can create and edit; only the owner can delete.
@ApiTags('tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
@UseGuards(ProjectRoleGuard)
@RequireProjectRole(ProjectRole.VIEWER)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.findAll(projectId, user.id, query);
  }

  @Get(':taskId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasksService.findOne(projectId, taskId);
  }

  @Post()
  @RequireProjectRole(ProjectRole.MEMBER)
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, user.id, dto);
  }

  @Patch(':taskId')
  @RequireProjectRole(ProjectRole.MEMBER)
  update(
    @Param('projectId') projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(projectId, taskId, user.id, dto);
  }

  @Patch(':taskId/move')
  @RequireProjectRole(ProjectRole.MEMBER)
  move(
    @Param('projectId') projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasksService.move(projectId, taskId, user.id, dto);
  }

  @Delete(':taskId')
  @RequireProjectRole(ProjectRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('projectId') projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasksService.remove(projectId, taskId);
  }
}
