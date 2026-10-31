"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Board } from "@/components/board/board";
import { FilterBar } from "@/components/board/filter-bar";
import { MembersDialog } from "@/components/board/members-dialog";
import { TaskDialog } from "@/components/board/task-dialog";
import { Button, ErrorText, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useMembers, useProject, useTaskMutations, useTasks } from "@/lib/hooks";
import type { Task, TaskFilters, TaskStatus } from "@/lib/types";

type DialogState =
  | { type: "task"; task: Task | null; status: TaskStatus }
  | { type: "members" }
  | null;

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { state } = useAuth();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [dialog, setDialog] = useState<DialogState>(null);

  const project = useProject(projectId);
  const members = useMembers(projectId);
  const tasks = useTasks(projectId, filters);
  const { move } = useTaskMutations(projectId);

  if (project.isLoading) return <Spinner />;
  if (project.error || !project.data) {
    return (
      <div className="space-y-4">
        <ErrorText error={project.error ?? new Error("Project not found")} />
        <Link href="/projects" className="text-sm text-indigo-600 hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const role = project.data.myRole;
  const canEdit = role !== "viewer";
  const currentUserId = state.user?.id ?? "";
  const hasFilters = Boolean(filters.search || filters.assignee || filters.priority);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/projects" className="text-xs text-slate-500 hover:underline">
            ← Projects
          </Link>
          <h1 className="text-xl font-semibold">
            {project.data.name} <span className="ml-1 font-mono text-sm font-normal text-slate-400">{project.data.key}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDialog({ type: "members" })}>
            Team
          </Button>
          {canEdit && <Button onClick={() => setDialog({ type: "task", task: null, status: "todo" })}>New task</Button>}
        </div>
      </div>

      <div className="mb-4">
        <FilterBar filters={filters} members={members.data ?? []} onChange={setFilters} />
        {hasFilters && <p className="mt-2 text-xs text-slate-500">Filters are on, so some tasks are hidden.</p>}
      </div>

      {tasks.isLoading && <Spinner label="Loading tasks..." />}
      <ErrorText error={tasks.error ?? move.error} />
      {tasks.data && (
        <Board
          tasks={tasks.data}
          canEdit={canEdit}
          onOpenTask={(task) => setDialog({ type: "task", task, status: task.status })}
          onCreateTask={(status) => setDialog({ type: "task", task: null, status })}
          onMove={(args) => move.mutate(args)}
        />
      )}

      {dialog?.type === "task" && (
        <TaskDialog
          // Remount when switching tasks so the form starts from that task's values.
          key={dialog.task?.id ?? "new"}
          projectId={projectId}
          task={dialog.task}
          defaultStatus={dialog.status}
          members={members.data ?? []}
          role={role}
          currentUserId={currentUserId}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "members" && (
        <MembersDialog projectId={projectId} isOwner={role === "owner"} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
