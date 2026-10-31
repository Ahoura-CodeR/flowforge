import type { Task, TaskStatus } from "./types";

/**
 * Optimistic version of what the server does on a move: take the task out, set its status,
 * and put it before `beforeId` (or at the end of its new column). The list order is the
 * column order, so the board can render straight from it.
 */
export function moveInList(
  tasks: Task[],
  taskId: string,
  status: TaskStatus,
  beforeId: string | null,
): Task[] {
  const moving = tasks.find((t) => t.id === taskId);
  if (!moving) return tasks;

  const rest = tasks.filter((t) => t.id !== taskId);
  const moved = { ...moving, status };

  if (beforeId) {
    const index = rest.findIndex((t) => t.id === beforeId);
    if (index >= 0) return [...rest.slice(0, index), moved, ...rest.slice(index)];
  }

  let lastInColumn = -1;
  rest.forEach((t, i) => {
    if (t.status === status) lastInColumn = i;
  });
  const insertAt = lastInColumn >= 0 ? lastInColumn + 1 : rest.length;
  return [...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)];
}

export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] };
  for (const task of tasks) groups[task.status].push(task);
  return groups;
}
