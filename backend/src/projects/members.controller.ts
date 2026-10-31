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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentMembership } from './decorators/current-membership.decorator';
import { RequireProjectRole } from './decorators/require-project-role.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ProjectRoleGuard } from './guards/project-role.guard';
import { MembersService } from './members.service';
import { ProjectMember } from './project-member.entity';
import { ProjectRole } from './project-role.enum';

// Any member can see the team; the minimum role is raised per route where needed.
@ApiTags('members')
@ApiBearerAuth()
@Controller('projects/:projectId/members')
@UseGuards(ProjectRoleGuard)
@RequireProjectRole(ProjectRole.VIEWER)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.membersService.list(projectId);
  }

  @Post()
  @RequireProjectRole(ProjectRole.OWNER)
  add(@Param('projectId') projectId: string, @Body() dto: AddMemberDto) {
    return this.membersService.add(projectId, dto);
  }

  @Patch(':userId')
  @RequireProjectRole(ProjectRole.OWNER)
  updateRole(
    @Param('projectId') projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(projectId, userId, dto.role);
  }

  // Owner removes anyone; any member can remove themselves. The service enforces that.
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('projectId') projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentMembership() actor: ProjectMember,
  ) {
    return this.membersService.remove(projectId, userId, actor);
  }
}
