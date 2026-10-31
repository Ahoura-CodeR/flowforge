import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '../task.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTaskDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  // For the optional fields below, `null` is accepted and means "clear this value".
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string | null;
}
