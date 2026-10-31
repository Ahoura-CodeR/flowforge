import type { TaskPriority, TaskStatus } from "./types";

export const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "in_review", label: "In review" },
  { status: "done", label: "Done" },
];

export const STATUS_LABEL = Object.fromEntries(COLUMNS.map((c) => [c.status, c.label])) as Record<
  TaskStatus,
  string
>;

export const PRIORITIES: { value: TaskPriority; label: string; className: string }[] = [
  { value: "low", label: "Low", className: "bg-slate-100 text-slate-700" },
  { value: "medium", label: "Medium", className: "bg-blue-100 text-blue-800" },
  { value: "high", label: "High", className: "bg-amber-100 text-amber-800" },
  { value: "urgent", label: "Urgent", className: "bg-red-100 text-red-800" },
];

export const PRIORITY_LABEL = Object.fromEntries(PRIORITIES.map((p) => [p.value, p.label])) as Record<
  TaskPriority,
  string
>;
