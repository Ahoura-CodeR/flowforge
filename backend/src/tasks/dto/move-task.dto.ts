import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TaskStatus } from '../task.entity';

export class MoveTaskDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  // Place the card right before this task in the target column. Omit or null = end of column.
  @IsOptional()
  @IsUUID()
  beforeId?: string | null;
}
