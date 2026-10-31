"use client";

import { useState } from "react";
import { useMemberMutations, useMembers } from "@/lib/hooks";
import type { ProjectRole } from "@/lib/types";
import { Button, ErrorText, inputClass, Modal, Spinner } from "../ui";

export function MembersDialog({
  projectId,
  isOwner,
  onClose,
}: {
  projectId: string;
  isOwner: boolean;
  onClose: () => void;
}) {
  const { data: members, isLoading } = useMembers(projectId);
  const { add, changeRole, remove } = useMemberMutations(projectId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");

  return (
    <Modal title="Team members" onClose={onClose}>
      {isLoading && <Spinner />}
      <ul className="divide-y divide-slate-100">
        {members?.map((member) => (
          <li key={member.userId} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{member.name}</p>
              <p className="truncate text-xs text-slate-500">{member.email}</p>
            </div>
            {isOwner && member.role !== "owner" ? (
              <div className="flex items-center gap-2">
                <select
                  className={`${inputClass} w-28`}
                  aria-label={`Role of ${member.name}`}
                  value={member.role}
                  onChange={(e) => changeRole.mutate({ userId: member.userId, role: e.target.value as ProjectRole })}
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button variant="danger" onClick={() => remove.mutate(member.userId)}>
                  Remove
                </Button>
              </div>
            ) : (
              <span className="text-xs capitalize text-slate-500">{member.role}</span>
            )}
          </li>
        ))}
      </ul>

      <ErrorText error={changeRole.error ?? remove.error} />

      {isOwner && (
        <form
          className="mt-4 space-y-2 border-t border-slate-200 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate({ email, role }, { onSuccess: () => setEmail("") });
          }}
        >
          <p className="text-xs font-medium text-slate-600">Add a registered user by email</p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select className={`${inputClass} w-28`} value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="submit" disabled={add.isPending}>
              Add
            </Button>
          </div>
          <ErrorText error={add.error} />
        </form>
      )}
    </Modal>
  );
}
