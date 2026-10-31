"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ErrorText, Field, inputClass, Modal, Spinner } from "@/components/ui";
import { useCreateProject, useProjects } from "@/lib/hooks";

const suggestKey = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 4);

function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateProject();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);

  return (
    <Modal title="New project" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ name, key }, { onSuccess: onClose });
        }}
      >
        <Field label="Name">
          <input
            className={inputClass}
            value={name}
            autoFocus
            required
            minLength={2}
            onChange={(e) => {
              setName(e.target.value);
              if (!keyTouched) setKey(suggestKey(e.target.value));
            }}
          />
        </Field>
        <Field label="Key (used in task ids, e.g. FF-12)">
          <input
            className={`${inputClass} font-mono uppercase`}
            value={key}
            required
            maxLength={10}
            onChange={(e) => {
              setKeyTouched(true);
              setKey(e.target.value.toUpperCase());
            }}
          />
        </Field>
        <ErrorText error={create.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Button onClick={() => setCreating(true)}>New project</Button>
      </div>

      {isLoading && <Spinner />}
      <ErrorText error={error} />
      {projects?.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          You don&apos;t belong to any project yet. Create one to get started.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
          >
            <div className="flex items-center justify-between">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{project.key}</span>
              <span className="text-xs capitalize text-slate-500">{project.myRole}</span>
            </div>
            <h2 className="mt-3 font-medium">{project.name}</h2>
            {project.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description}</p>}
          </Link>
        ))}
      </div>

      {creating && <CreateProjectDialog onClose={() => setCreating(false)} />}
    </>
  );
}
