"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useMemo } from "react";
import { groupByStatus } from "@/lib/board";
import { COLUMNS } from "@/lib/constants";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./task-card";

interface BoardProps {
  tasks: Task[];
  canEdit: boolean;
  onOpenTask: (task: Task) => void;
  onCreateTask: (status: TaskStatus) => void;
  onMove: (move: { taskId: string; status: TaskStatus; beforeId: string | null }) => void;
}

export function Board({ tasks, canEdit, onOpenTask, onCreateTask, onMove }: BoardProps) {
  const groups = useMemo(() => groupByStatus(tasks), [tasks]);

  function handleDragEnd({ source, destination, draggableId }: DropResult) {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const status = destination.droppableId as TaskStatus;
    // The card is placed before whatever sits at the drop index once it is out of the list.
    const targetColumn = groups[status].filter((task) => task.id !== draggableId);
    const beforeId = targetColumn[destination.index]?.id ?? null;
    onMove({ taskId: draggableId, status, beforeId });
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(({ status, label }) => (
          <section key={status} className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/80 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <h2 className="text-sm font-semibold text-slate-700">
                {label} <span className="ml-1 font-normal text-slate-400">{groups[status].length}</span>
              </h2>
              {canEdit && (
                <button
                  onClick={() => onCreateTask(status)}
                  aria-label={`Add task to ${label}`}
                  className="rounded px-1.5 text-lg leading-none text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  +
                </button>
              )}
            </div>

            <Droppable droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-24 flex-1 space-y-2 rounded-lg p-1 transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50" : ""}`}
                >
                  {groups[status].map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canEdit}>
                      {(drag, dragSnapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          {...drag.dragHandleProps}
                          onClick={() => onOpenTask(task)}
                          className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm ${dragSnapshot.isDragging ? "border-indigo-400 shadow-lg" : "border-slate-200 hover:border-slate-300"}`}
                        >
                          <TaskCard task={task} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </section>
        ))}
      </div>
    </DragDropContext>
  );
}
