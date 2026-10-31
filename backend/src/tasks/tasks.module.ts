import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '../projects/projects.module';
import { User } from '../users/user.entity';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { TaskActivity } from './task-activity.entity';
import { Task } from './task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskActivity, User]), ProjectsModule],
  controllers: [TasksController, ActivityController],
  providers: [TasksService, ActivityService],
  exports: [TasksService],
})
export class TasksModule {}
