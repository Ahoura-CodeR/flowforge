import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user';
import { CurrentMembership } from './decorators/current-membership.decorator';
import { RequireProjectRole } from './decorators/require-project-role.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectRoleGuard } from './guards/project-role.guard';
import { ProjectMember } from './project-member.entity';
import { ProjectRole } from './project-role.enum';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.projectsService.findAllForUser(user.id);
  }

  @Get(':projectId')
  @UseGuards(ProjectRoleGuard)
  findOne(@Param('projectId') projectId: string, @CurrentMembership() membership: ProjectMember) {
    return this.projectsService.findOne(projectId, membership.role);
  }

  @Patch(':projectId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.OWNER)
  update(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentMembership() membership: ProjectMember,
  ) {
    return this.projectsService.update(projectId, dto, membership.role);
  }

  @Delete(':projectId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('projectId') projectId: string) {
    return this.projectsService.remove(projectId);
  }
}
