import { TaskChange } from './task-activity.entity';
import { Task } from './task.entity';

export type TrackedTask = Pick<
  Task,
  'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'dueDate'
>;

export function pickTracked(task: TrackedTask): TrackedTask {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
  };
}

/** Pure function: compares two snapshots and lists only the fields that actually changed. */
export function diffTask(before: TrackedTask, after: TrackedTask): TaskChange[] {
  const candidates: TaskChange[] = [
    { field: 'title', from: before.title, to: after.title },
    { field: 'description', from: before.description ?? null, to: after.description ?? null },
    { field: 'status', from: before.status, to: after.status },
    { field: 'priority', from: before.priority, to: after.priority },
    { field: 'assignee', from: before.assigneeId ?? null, to: after.assigneeId ?? null },
    { field: 'dueDate', from: before.dueDate ?? null, to: after.dueDate ?? null },
  ];
  return candidates.filter((change) => change.from !== change.to);
}
