import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { ProjectMember } from './project-member.entity';
import { Project } from './project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember]), UsersModule],
  controllers: [ProjectsController, MembersController],
  providers: [ProjectsService, MembersService],
  exports: [MembersService],
})
export class ProjectsModule {}
