import { diffTask, TrackedTask } from './task-diff';
import { TaskPriority, TaskStatus } from './task.entity';

const base: TrackedTask = {
  title: 'Login page',
  description: null,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  assigneeId: null,
  dueDate: null,
};

describe('diffTask', () => {
  it('returns nothing when no tracked field changed', () => {
    expect(diffTask(base, { ...base })).toEqual([]);
  });

  it('lists only the fields that changed, with before and after values', () => {
    const after = { ...base, status: TaskStatus.DONE, assigneeId: 'user-1' };
    expect(diffTask(base, after)).toEqual([
      { field: 'status', from: 'todo', to: 'done' },
      { field: 'assignee', from: null, to: 'user-1' },
    ]);
  });

  it('treats undefined and null as the same empty value', () => {
    const before = { ...base, description: undefined as unknown as null };
    expect(diffTask(before, { ...base, description: null })).toEqual([]);
  });

  it('reports clearing a value', () => {
    const before = { ...base, dueDate: '2026-12-01' };
    expect(diffTask(before, base)).toEqual([{ field: 'dueDate', from: '2026-12-01', to: null }]);
  });
});
