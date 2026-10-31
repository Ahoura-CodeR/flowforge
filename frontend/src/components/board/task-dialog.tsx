"use client";

import { useState } from "react";
import { PRIORITIES, PRIORITY_LABEL, STATUS_LABEL, COLUMNS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import {
  useActivity,
  useCommentMutations,
  useComments,
  useTaskMutations,
  type TaskInput,
} from "@/lib/hooks";
import type { ActivityChange, Member, Person, ProjectRole, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { Button, ErrorText, Field, inputClass, Modal, Spinner } from "../ui";

interface TaskDialogProps {
  projectId: string;
  task: Task | null; // null = creating
  defaultStatus: TaskStatus;
  members: Member[];
  role: ProjectRole;
  currentUserId: string;
  onClose: () => void;
}

export function TaskDialog({ projectId, task, defaultStatus, members, role, currentUserId, onClose }: TaskDialogProps) {
  const { create, update, remove } = useTaskMutations(projectId);
  const [tab, setTab] = useState<"details" | "comments" | "history">("details");
  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? ("medium" as TaskPriority),
    assigneeId: task?.assignee?.id ?? "",
    dueDate: task?.dueDate ?? "",
  });

  const canEdit = role !== "viewer";
  const mutation = task ? update : create;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const body: TaskInput = {
      title: form.title,
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      dueDate: form.dueDate || null,
    };
    if (task) update.mutate({ taskId: task.id, body }, { onSuccess: onClose });
    else create.mutate(body, { onSuccess: onClose });
  }

  return (
    <Modal title={task ? `${task.key} · ${task.title}` : "New task"} onClose={onClose} wide>
      {task && (
        <div className="-mt-2 mb-4 flex gap-4 border-b border-slate-200 text-sm">
          {(["details", "comments", "history"] as const).map((name) => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`-mb-px border-b-2 pb-2 capitalize ${tab === name ? "border-indigo-600 font-medium text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {tab === "details" && (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Title">
            <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} disabled={!canEdit} autoFocus />
          </Field>
          <Field label="Description">
            <textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} disabled={!canEdit} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value as TaskStatus)} disabled={!canEdit}>
                {COLUMNS.map((c) => (
                  <option key={c.status} value={c.status}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select className={inputClass} value={form.priority} onChange={(e) => set("priority", e.target.value as TaskPriority)} disabled={!canEdit}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select className={inputClass} value={form.assigneeId} onChange={(e) => set("assigneeId", e.target.value)} disabled={!canEdit}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due date">
              <input className={inputClass} type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} disabled={!canEdit} />
            </Field>
          </div>

          <ErrorText error={mutation.error ?? remove.error} />

          <div className="flex items-center justify-between">
            <div>
              {task && role === "owner" && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={remove.isPending}
                  onClick={() => window.confirm("Delete this task and its comments?") && remove.mutate(task.id, { onSuccess: onClose })}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                {canEdit ? "Cancel" : "Close"}
              </Button>
              {canEdit && (
                <Button type="submit" disabled={mutation.isPending}>
                  {task ? "Save changes" : "Create task"}
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      {task && tab === "comments" && (
        <CommentsPanel projectId={projectId} taskId={task.id} role={role} canComment={canEdit} currentUserId={currentUserId} />
      )}
      {task && tab === "history" && <HistoryPanel projectId={projectId} taskId={task.id} />}
    </Modal>
  );
}

function CommentsPanel({
  projectId,
  taskId,
  role,
  canComment,
  currentUserId,
}: {
  projectId: string;
  taskId: string;
  role: ProjectRole;
  canComment: boolean;
  currentUserId: string;
}) {
  const { data, isLoading } = useComments(projectId, taskId);
  const { add, remove } = useCommentMutations(projectId, taskId);
  const [body, setBody] = useState("");

  return (
    <div className="space-y-4">
      {isLoading && <Spinner />}
      {data?.data.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
      <ul className="space-y-3">
        {data?.data.map((comment) => (
          <li key={comment.id} className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                <span className="font-medium text-slate-700">{comment.author?.name ?? "Deleted user"}</span> ·{" "}
                {formatDateTime(comment.createdAt)}
                {comment.editedAt && " (edited)"}
              </span>
              {(comment.author?.id === currentUserId || role === "owner") && (
                <button className="text-red-600 hover:underline" onClick={() => remove.mutate(comment.id)}>
                  Delete
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
          </li>
        ))}
      </ul>

      {canComment && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate(body, { onSuccess: () => setBody("") });
          }}
        >
          <textarea className={`${inputClass} min-h-20`} placeholder="Write a comment..." value={body} onChange={(e) => setBody(e.target.value)} required maxLength={5000} />
          <ErrorText error={add.error ?? remove.error} />
          <div className="flex justify-end">
            <Button type="submit" disabled={add.isPending || !body.trim()}>
              Comment
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

const personName = (value: string | Person | null) => (value && typeof value === "object" ? (value.name ?? "Unknown user") : value);

function describeChange(change: ActivityChange): string {
  const show = (value: string | Person | null) => {
    if (value === null || value === "") return "none";
    if (change.field === "assignee") return String(personName(value));
    if (change.field === "status") return STATUS_LABEL[value as TaskStatus] ?? String(value);
    if (change.field === "priority") return PRIORITY_LABEL[value as TaskPriority] ?? String(value);
    return String(value);
  };
  if (change.field === "description") return "updated the description";
  const field = change.field === "dueDate" ? "due date" : change.field;
  return `changed ${field} from ${show(change.from)} to ${show(change.to)}`;
}

function HistoryPanel({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { data, isLoading } = useActivity(projectId, taskId);

  return (
    <div>
      {isLoading && <Spinner />}
      <ul className="space-y-3">
        {data?.data.map((activity) => (
          <li key={activity.id} className="border-l-2 border-slate-200 pl-3 text-sm">
            <p className="text-xs text-slate-500">{formatDateTime(activity.createdAt)}</p>
            <p>
              <span className="font-medium">{activity.actor?.name ?? "Deleted user"}</span>{" "}
              {activity.action === "created" ? "created this task" : null}
            </p>
            {activity.changes.map((change) => (
              <p key={change.field} className="text-slate-600">
                {describeChange(change)}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
