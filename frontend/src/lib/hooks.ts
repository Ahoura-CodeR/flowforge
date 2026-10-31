"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { moveInList } from "./board";
import type {
  Activity,
  Comment,
  Member,
  Paginated,
  Project,
  ProjectRole,
  Task,
  TaskFilters,
  TaskPriority,
  TaskStatus,
} from "./types";

// ---------- projects ----------

export const useProjects = () =>
  useQuery({ queryKey: ["projects"], queryFn: () => api<Project[]>("/projects") });

export const useProject = (projectId: string) =>
  useQuery({ queryKey: ["project", projectId], queryFn: () => api<Project>(`/projects/${projectId}`) });

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; key: string; description?: string }) =>
      api<Project>("/projects", { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// ---------- members ----------

export const useMembers = (projectId: string) =>
  useQuery({ queryKey: ["members", projectId], queryFn: () => api<Member[]>(`/projects/${projectId}/members`) });

export function useMemberMutations(projectId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["members", projectId] });

  return {
    add: useMutation({
      mutationFn: (body: { email: string; role: ProjectRole }) =>
        api(`/projects/${projectId}/members`, { method: "POST", body }),
      onSuccess: refresh,
    }),
    changeRole: useMutation({
      mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
        api(`/projects/${projectId}/members/${userId}`, { method: "PATCH", body: { role } }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (userId: string) => api(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
      onSuccess: () => {
        refresh();
        // Removing a member unassigns their tasks on the server.
        queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      },
    }),
  };
}

// ---------- tasks ----------

/** The board needs every task, so we walk through all pages (the API caps a page at 100). */
async function fetchAllTasks(projectId: string, filters: TaskFilters): Promise<Task[]> {
  const tasks: Task[] = [];
  for (let page = 1; ; page++) {
    const result = await api<Paginated<Task>>(`/projects/${projectId}/tasks`, {
      query: { ...filters, sortBy: "position", order: "asc", limit: 100, page },
    });
    tasks.push(...result.data);
    if (page >= result.meta.totalPages) return tasks;
  }
}

export const useTasks = (projectId: string, filters: TaskFilters) =>
  useQuery({
    queryKey: ["tasks", projectId, filters],
    queryFn: () => fetchAllTasks(projectId, filters),
  });

export interface TaskInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
}

export function useTaskMutations(projectId: string) {
  const queryClient = useQueryClient();
  const tasksKey = ["tasks", projectId];
  const refreshTask = (taskId?: string) => {
    queryClient.invalidateQueries({ queryKey: tasksKey });
    if (taskId) queryClient.invalidateQueries({ queryKey: ["activity", projectId, taskId] });
  };

  return {
    create: useMutation({
      mutationFn: (body: TaskInput) => api<Task>(`/projects/${projectId}/tasks`, { method: "POST", body }),
      onSuccess: () => refreshTask(),
    }),
    update: useMutation({
      mutationFn: ({ taskId, body }: { taskId: string; body: Partial<TaskInput> }) =>
        api<Task>(`/projects/${projectId}/tasks/${taskId}`, { method: "PATCH", body }),
      onSuccess: (_task, { taskId }) => refreshTask(taskId),
    }),
    remove: useMutation({
      mutationFn: (taskId: string) => api(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" }),
      onSuccess: () => refreshTask(),
    }),
    // Optimistic: the card jumps immediately and rolls back if the server refuses.
    move: useMutation({
      mutationFn: ({ taskId, status, beforeId }: { taskId: string; status: TaskStatus; beforeId: string | null }) =>
        api<Task>(`/projects/${projectId}/tasks/${taskId}/move`, { method: "PATCH", body: { status, beforeId } }),
      onMutate: async ({ taskId, status, beforeId }) => {
        await queryClient.cancelQueries({ queryKey: tasksKey });
        const snapshots = queryClient.getQueriesData<Task[]>({ queryKey: tasksKey });
        queryClient.setQueriesData<Task[]>({ queryKey: tasksKey }, (old) =>
          old ? moveInList(old, taskId, status, beforeId) : old,
        );
        return { snapshots };
      },
      onError: (_error, _vars, context) => {
        context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      },
      onSettled: (_data, _error, { taskId }) => refreshTask(taskId),
    }),
  };
}

// ---------- comments and history ----------

export const useComments = (projectId: string, taskId: string) =>
  useQuery({
    queryKey: ["comments", projectId, taskId],
    queryFn: () =>
      api<Paginated<Comment>>(`/projects/${projectId}/tasks/${taskId}/comments`, { query: { limit: 100 } }),
  });

export function useCommentMutations(projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["comments", projectId, taskId] });

  return {
    add: useMutation({
      mutationFn: (body: string) =>
        api<Comment>(`/projects/${projectId}/tasks/${taskId}/comments`, { method: "POST", body: { body } }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (commentId: string) =>
        api(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" }),
      onSuccess: refresh,
    }),
  };
}

export const useActivity = (projectId: string, taskId: string) =>
  useQuery({
    queryKey: ["activity", projectId, taskId],
    queryFn: () =>
      api<Paginated<Activity>>(`/projects/${projectId}/tasks/${taskId}/activity`, { query: { limit: 50 } }),
  });
