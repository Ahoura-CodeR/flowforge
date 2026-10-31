import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment]), ProjectsModule, TasksModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
