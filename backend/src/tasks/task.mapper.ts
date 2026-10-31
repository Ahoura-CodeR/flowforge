import { Task } from './task.entity';

type Person = { id: string; name: string } | null;

const toPerson = (user: { id: string; name: string } | null): Person =>
  user ? { id: user.id, name: user.name } : null;

/** Expects the `project`, `assignee` and `reporter` relations to be loaded. */
export function toTaskResponse(task: Task) {
  return {
    id: task.id,
    key: `${task.project.key}-${task.number}`,
    number: task.number,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    position: task.position,
    assignee: toPerson(task.assignee),
    reporter: toPerson(task.reporter),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
