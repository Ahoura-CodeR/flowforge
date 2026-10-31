import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';
import { toStringArray } from '../../common/query-transforms';
import { TaskPriority, TaskStatus } from '../task.entity';

export const TASK_SORT_FIELDS = ['number', 'createdAt', 'updatedAt', 'dueDate', 'priority', 'position'] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

const ASSIGNEE_FILTER =
  /^(me|unassigned|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export class ListTasksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(toStringArray)
  @IsEnum(TaskStatus, { each: true })
  status?: TaskStatus[];

  @IsOptional()
  @Transform(toStringArray)
  @IsEnum(TaskPriority, { each: true })
  priority?: TaskPriority[];

  // A user id, "me" (the caller) or "unassigned".
  @IsOptional()
  @Matches(ASSIGNEE_FILTER, { message: 'assignee must be a user id, "me" or "unassigned"' })
  assignee?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueBefore?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueAfter?: string;

  @IsOptional()
  @IsIn(TASK_SORT_FIELDS)
  sortBy: TaskSortField = 'number';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
