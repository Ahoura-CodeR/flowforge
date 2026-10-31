import { PRIORITIES } from "@/lib/constants";
import { formatDueDate, initials, isOverdue } from "@/lib/format";
import type { Task } from "@/lib/types";

export function TaskCard({ task }: { task: Task }) {
  const priority = PRIORITIES.find((p) => p.value === task.priority)!;
  const overdue = isOverdue(task.dueDate, task.status === "done");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-slate-500">{task.key}</span>
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${priority.className}`}>{priority.label}</span>
      </div>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <div className="flex items-center justify-between text-xs">
        {task.dueDate ? (
          <span className={overdue ? "font-medium text-red-600" : "text-slate-500"}>
            {overdue ? "Overdue · " : ""}
            {formatDueDate(task.dueDate)}
          </span>
        ) : (
          <span />
        )}
        {task.assignee && (
          <span
            title={task.assignee.name}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700"
          >
            {initials(task.assignee.name)}
          </span>
        )}
      </div>
    </div>
  );
}
