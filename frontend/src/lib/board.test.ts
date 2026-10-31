import { describe, expect, it } from "vitest";
import { groupByStatus, moveInList } from "./board";
import type { Task, TaskStatus } from "./types";

const task = (id: string, status: TaskStatus) => ({ id, status }) as Task;
const column = (tasks: Task[], status: TaskStatus) =>
  tasks
    .filter((t) => t.status === status)
    .map((t) => t.id)
    .join("");

const tasks = [task("A", "todo"), task("B", "todo"), task("C", "todo"), task("D", "in_progress"), task("E", "in_progress")];

describe("moveInList", () => {
  it("puts the card at the end of another column when there is no target card", () => {
    const result = moveInList(tasks, "A", "in_progress", null);
    expect(column(result, "in_progress")).toBe("DEA");
    expect(column(result, "todo")).toBe("BC");
  });

  it("puts the card before the given card", () => {
    expect(column(moveInList(tasks, "C", "in_progress", "D"), "in_progress")).toBe("CDE");
  });

  it("reorders inside the same column", () => {
    expect(column(moveInList(tasks, "A", "todo", "C"), "todo")).toBe("BAC");
  });

  it("moves into an empty column", () => {
    expect(column(moveInList(tasks, "A", "done", null), "done")).toBe("A");
  });

  it("ignores unknown task ids and does not mutate the input", () => {
    const snapshot = [...tasks];
    expect(moveInList(tasks, "Z", "done", null)).toBe(tasks);
    moveInList(tasks, "A", "done", null);
    expect(tasks).toEqual(snapshot);
  });

  it("falls back to the end of the column if the target card is missing", () => {
    expect(column(moveInList(tasks, "A", "in_progress", "nope"), "in_progress")).toBe("DEA");
  });
});

describe("groupByStatus", () => {
  it("groups tasks by status and keeps their order", () => {
    const groups = groupByStatus(tasks);
    expect(groups.todo.map((t) => t.id)).toEqual(["A", "B", "C"]);
    expect(groups.in_progress.map((t) => t.id)).toEqual(["D", "E"]);
    expect(groups.done).toEqual([]);
  });
});
