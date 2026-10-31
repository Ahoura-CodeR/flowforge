"use client";

import { useEffect, useState } from "react";
import { PRIORITIES } from "@/lib/constants";
import type { Member, TaskFilters, TaskPriority } from "@/lib/types";
import { inputClass } from "../ui";

interface FilterBarProps {
  filters: TaskFilters;
  members: Member[];
  onChange: (filters: TaskFilters) => void;
}

export function FilterBar({ filters, members, onChange }: FilterBarProps) {
  // Typing updates local state at once; the board refetches only after a short pause.
  const [search, setSearch] = useState(filters.search ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (filters.search ?? "")) onChange({ ...filters, search: search || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filters, onChange]);

  return (
    <div className="flex flex-wrap gap-2">
      <input
        className={`${inputClass} w-56`}
        placeholder="Search tasks..."
        aria-label="Search tasks"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        className={`${inputClass} w-44`}
        aria-label="Filter by assignee"
        value={filters.assignee ?? ""}
        onChange={(e) => onChange({ ...filters, assignee: e.target.value || undefined })}
      >
        <option value="">Everyone</option>
        <option value="me">Assigned to me</option>
        <option value="unassigned">Unassigned</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>
      <select
        className={`${inputClass} w-40`}
        aria-label="Filter by priority"
        value={filters.priority?.[0] ?? ""}
        onChange={(e) =>
          onChange({ ...filters, priority: e.target.value ? [e.target.value as TaskPriority] : undefined })
        }
      >
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
