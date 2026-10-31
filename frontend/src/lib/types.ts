export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ProjectRole = "owner" | "member" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
}

export interface Person {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  myRole: ProjectRole;
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: ProjectRole;
}

export interface Task {
  id: string;
  key: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  assignee: Person | null;
  reporter: Person | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  body: string;
  author: Person | null;
  createdAt: string;
  editedAt: string | null;
}

export interface ActivityChange {
  field: "title" | "description" | "status" | "priority" | "assignee" | "dueDate";
  from: string | Person | null;
  to: string | Person | null;
}

export interface Activity {
  id: string;
  action: "created" | "updated";
  actor: Person | null;
  changes: ActivityChange[];
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface TaskFilters {
  search?: string;
  assignee?: string; // "me", "unassigned" or a user id
  priority?: TaskPriority[];
}
