import { INestApplication } from '@nestjs/common';
import { client, createTestApp, registerUser, resetDatabase, TestUser } from './helpers';

describe('Tasks, comments, history and Kanban', () => {
  let app: INestApplication;
  let http: ReturnType<typeof client>;
  let owner: TestUser, sara: TestUser, viewer: TestUser, outsider: TestUser;
  let projectId: string;
  const tasksUrl = () => `/api/projects/${projectId}/tasks`;

  const createTask = async (user: TestUser, body: object) => (await http.post(tasksUrl(), user, body).expect(201)).body;
  const titles = (body: { data: { title: string }[] }) => body.data.map((t) => t.title);

  beforeAll(async () => {
    app = await createTestApp();
    http = client(app);
    await resetDatabase(app);
    [owner, sara, viewer, outsider] = [
      await registerUser(app, 'Owner'),
      await registerUser(app, 'Sara'),
      await registerUser(app, 'Viewer'),
      await registerUser(app, 'Outsider'),
    ];
    projectId = (await http.post('/api/projects', owner, { name: 'Board', key: 'BD' }).expect(201)).body.id;
    await http.post(`/api/projects/${projectId}/members`, owner, { email: sara.email, role: 'member' }).expect(201);
    await http.post(`/api/projects/${projectId}/members`, owner, { email: viewer.email, role: 'viewer' }).expect(201);
  });

  afterAll(() => app.close());

  describe('permissions and rules', () => {
    it('numbers tasks per project and builds readable keys', async () => {
      const first = await createTask(owner, { title: 'First' });
      const second = await createTask(sara, { title: 'Second' });
      expect([first.key, second.key]).toEqual(['BD-1', 'BD-2']);
      expect(second.reporter.name).toBe('Sara');
      expect(second).toMatchObject({ status: 'todo', priority: 'medium', assignee: null });
    });

    it('lets viewers read but not write, and hides the project from outsiders', async () => {
      await http.get(tasksUrl(), viewer).expect(200);
      await http.post(tasksUrl(), viewer, { title: 'nope' }).expect(403);
      await http.get(tasksUrl(), outsider).expect(404);
    });

    it('only lets the owner delete tasks', async () => {
      const task = await createTask(sara, { title: 'Disposable' });
      await http.delete(`${tasksUrl()}/${task.id}`, sara).expect(403);
      await http.delete(`${tasksUrl()}/${task.id}`, owner).expect(204);
      await http.get(`${tasksUrl()}/${task.id}`, owner).expect(404);
    });

    it('requires assignees to be project members and validates input', async () => {
      const res = await http.post(tasksUrl(), owner, { title: 'x', assigneeId: outsider.id }).expect(400);
      expect(res.body.message).toMatch(/must be a member/i);
      await http.post(tasksUrl(), owner, { title: 'x', status: 'bogus' }).expect(400);
      await http.post(tasksUrl(), owner, { title: 'x', unknownField: 1 }).expect(400);
    });

    it('gives unique, sequential numbers under concurrent creation', async () => {
      const responses = await Promise.all(
        Array.from({ length: 15 }, (_, i) => http.post(tasksUrl(), owner, { title: `Parallel ${i}` })),
      );
      expect(responses.every((r) => r.status === 201)).toBe(true);
      const numbers = responses.map((r) => r.body.number as number).sort((a, b) => a - b);
      expect(new Set(numbers).size).toBe(15);
      expect(numbers[14] - numbers[0]).toBe(14); // no gaps
    });
  });

  describe('listing: filters, search, sorting, pagination', () => {
    let filterProject: string;
    const list = (query: string, user: TestUser = owner) =>
      http.get(`/api/projects/${filterProject}/tasks${query}`, user).expect(200).then((r) => r.body);

    beforeAll(async () => {
      filterProject = (await http.post('/api/projects', owner, { name: 'Filters', key: 'FIL' }).expect(201)).body.id;
      await http.post(`/api/projects/${filterProject}/members`, owner, { email: sara.email, role: 'member' }).expect(201);
      const post = (body: object) => http.post(`/api/projects/${filterProject}/tasks`, owner, body).expect(201);
      await post({ title: 'Login page', description: '100% done_ok', priority: 'high', status: 'in_progress', assigneeId: sara.id, dueDate: '2026-11-10' });
      await post({ title: 'Write docs', priority: 'low', dueDate: '2026-12-01' });
      await post({ title: 'Fix bug', priority: 'urgent', status: 'todo', assigneeId: owner.id });
      await post({ title: 'Deploy', priority: 'medium', status: 'done', dueDate: '2026-11-20' });
      await post({ title: 'Refactor auth', priority: 'high', assigneeId: sara.id });
    });

    it('paginates and reports totals', async () => {
      const page = await list('?page=2&limit=2');
      expect(page.meta).toEqual({ total: 5, page: 2, limit: 2, totalPages: 3 });
      expect(titles(page)).toEqual(['Fix bug', 'Write docs']); // default order: newest number first
    });

    it('filters by status and priority (comma-separated or repeated)', async () => {
      expect(titles(await list('?status=todo,done')).sort()).toEqual(['Deploy', 'Fix bug', 'Refactor auth', 'Write docs']);
      expect(titles(await list('?status=todo&status=done')).sort()).toEqual(['Deploy', 'Fix bug', 'Refactor auth', 'Write docs']);
      expect(titles(await list('?priority=high')).sort()).toEqual(['Login page', 'Refactor auth']);
    });

    it('filters by assignee: me, unassigned and a user id', async () => {
      expect(titles(await list('?assignee=me', sara)).sort()).toEqual(['Login page', 'Refactor auth']);
      expect(titles(await list('?assignee=unassigned')).sort()).toEqual(['Deploy', 'Write docs']);
      expect(titles(await list(`?assignee=${owner.id}`))).toEqual(['Fix bug']);
    });

    it('searches title and description case-insensitively, treating % and _ literally', async () => {
      expect(titles(await list('?search=AUTH'))).toEqual(['Refactor auth']);
      expect(titles(await list('?search=done_ok'))).toEqual(['Login page']);
      expect(titles(await list('?search=%25'))).toEqual(['Login page']); // only the "100%" description
      expect(titles(await list('?search=_'))).toEqual(['Login page']);
    });

    it('filters by due date range', async () => {
      expect(titles(await list('?dueAfter=2026-11-15&dueBefore=2026-12-31')).sort()).toEqual(['Deploy', 'Write docs']);
    });

    it('sorts by priority and puts missing due dates last', async () => {
      const byPriority = await list('?sortBy=priority&order=desc');
      expect(byPriority.data.map((t: { priority: string }) => t.priority)).toEqual(['urgent', 'high', 'high', 'medium', 'low']);
      const byDue = await list('?sortBy=dueDate&order=asc');
      expect(byDue.data.map((t: { dueDate: string | null }) => t.dueDate)).toEqual(['2026-11-10', '2026-11-20', '2026-12-01', null, null]);
    });

    it('rejects invalid or unknown query parameters', async () => {
      for (const bad of ['?limit=1000', '?page=0', '?status=bogus', '?sortBy=title;DROP', '?assignee=nobody', '?foo=1']) {
        await http.get(`/api/projects/${filterProject}/tasks${bad}`, owner).expect(400);
      }
    });
  });

  describe('history', () => {
    it('records who changed what, resolves assignee names and ignores no-op edits', async () => {
      const task = await createTask(owner, { title: 'Tracked' });
      const url = `${tasksUrl()}/${task.id}`;

      await http.patch(url, sara, { status: 'in_review', priority: 'urgent', assigneeId: owner.id }).expect(200);
      await http.patch(url, sara, { status: 'in_review' }).expect(200); // nothing changed
      await http.patch(url, owner, { title: 'Tracked v2', assigneeId: null }).expect(200);

      const history = (await http.get(`${url}/activity`, viewer).expect(200)).body;
      expect(history.meta.total).toBe(3); // created + 2 real updates, the no-op left no entry

      const [latest, middle, created] = history.data;
      expect(created).toMatchObject({ action: 'created', actor: { name: 'Owner' } });
      expect(middle.actor.name).toBe('Sara');
      expect(middle.changes).toEqual(
        expect.arrayContaining([
          { field: 'status', from: 'todo', to: 'in_review' },
          { field: 'assignee', from: null, to: { id: owner.id, name: 'Owner' } },
        ]),
      );
      expect(latest.changes).toEqual(
        expect.arrayContaining([
          { field: 'title', from: 'Tracked', to: 'Tracked v2' },
          { field: 'assignee', from: { id: owner.id, name: 'Owner' }, to: null },
        ]),
      );
    });
  });

  describe('comments', () => {
    let taskId: string;
    const base = () => `${tasksUrl()}/${taskId}/comments`;

    beforeAll(async () => {
      taskId = (await createTask(owner, { title: 'Discussed' })).id;
    });

    it('lets members write, trims text, and keeps viewers read-only', async () => {
      const res = await http.post(base(), sara, { body: '  Looks good  ' }).expect(201);
      expect(res.body).toMatchObject({ body: 'Looks good', author: { name: 'Sara' }, editedAt: null });
      await http.post(base(), viewer, { body: 'hi' }).expect(403);
      await http.post(base(), sara, { body: '   ' }).expect(400);
    });

    it('lets only the author edit, and marks the comment as edited', async () => {
      const comment = (await http.post(base(), sara, { body: 'v1' }).expect(201)).body;
      await http.patch(`${base()}/${comment.id}`, owner, { body: 'hijacked' }).expect(403);
      const edited = await http.patch(`${base()}/${comment.id}`, sara, { body: 'v2' }).expect(200);
      expect(edited.body.body).toBe('v2');
      expect(edited.body.editedAt).not.toBeNull();
    });

    it('lets authors delete their own and the project owner moderate any', async () => {
      const mine = (await http.post(base(), sara, { body: 'mine' }).expect(201)).body;
      const theirs = (await http.post(base(), sara, { body: 'to moderate' }).expect(201)).body;
      const ownersComment = (await http.post(base(), owner, { body: 'owner says' }).expect(201)).body;

      await http.delete(`${base()}/${ownersComment.id}`, sara).expect(403);
      await http.delete(`${base()}/${mine.id}`, sara).expect(204);
      await http.delete(`${base()}/${theirs.id}`, owner).expect(204);
    });

    it('lists oldest first, hides the discussion from outsiders and cascades with the task', async () => {
      const list = (await http.get(base(), viewer).expect(200)).body;
      const times = list.data.map((c: { createdAt: string }) => new Date(c.createdAt).getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
      await http.get(base(), outsider).expect(404);

      await http.delete(`${tasksUrl()}/${taskId}`, owner).expect(204);
      await http.get(base(), owner).expect(404);
    });
  });

  describe('Kanban ordering', () => {
    let boardProject: string;
    const move = (taskId: string, body: object, user: TestUser = owner) =>
      http.patch(`/api/projects/${boardProject}/tasks/${taskId}/move`, user, body);
    const column = async (status: string) =>
      titles((await http.get(`/api/projects/${boardProject}/tasks?sortBy=position&order=asc&status=${status}&limit=100`, owner).expect(200)).body);

    let ids: Record<string, string>;

    beforeAll(async () => {
      boardProject = (await http.post('/api/projects', owner, { name: 'Kanban', key: 'KB' }).expect(201)).body.id;
      await http.post(`/api/projects/${boardProject}/members`, owner, { email: viewer.email, role: 'viewer' }).expect(201);
      const make = async (title: string, status: string) =>
        (await http.post(`/api/projects/${boardProject}/tasks`, owner, { title, status }).expect(201)).body.id as string;
      ids = {
        A: await make('A', 'todo'),
        B: await make('B', 'todo'),
        C: await make('C', 'todo'),
        D: await make('D', 'in_progress'),
        E: await make('E', 'in_progress'),
      };
    });

    it('appends new tasks to the end of their column', async () => {
      expect(await column('todo')).toEqual(['A', 'B', 'C']);
      expect(await column('in_progress')).toEqual(['D', 'E']);
    });

    it('moves a card to the end of another column, or before a given card', async () => {
      await move(ids.A, { status: 'in_progress' }).expect(200);
      expect(await column('in_progress')).toEqual(['D', 'E', 'A']);

      await move(ids.C, { status: 'in_progress', beforeId: ids.D }).expect(200);
      expect(await column('in_progress')).toEqual(['C', 'D', 'E', 'A']);
      expect(await column('todo')).toEqual(['B']);
    });

    it('reorders inside a column without writing history, but logs a column change', async () => {
      await move(ids.E, { status: 'in_progress', beforeId: ids.C }).expect(200);
      expect(await column('in_progress')).toEqual(['E', 'C', 'D', 'A']);

      const reordered = (await http.get(`/api/projects/${boardProject}/tasks/${ids.E}/activity`, owner).expect(200)).body;
      expect(reordered.data.map((a: { action: string }) => a.action)).toEqual(['created']);

      const moved = (await http.get(`/api/projects/${boardProject}/tasks/${ids.A}/activity`, owner).expect(200)).body;
      expect(moved.data[0].changes).toEqual([{ field: 'status', from: 'todo', to: 'in_progress' }]);
    });

    it('puts a task whose status was edited at the bottom of the new column', async () => {
      await http.patch(`/api/projects/${boardProject}/tasks/${ids.D}`, owner, { status: 'done' }).expect(200);
      expect(await column('done')).toEqual(['D']);
    });

    it('validates the move request and the caller', async () => {
      await move(ids.B, { status: 'todo', beforeId: ids.C }).expect(400); // C is not in the todo column
      await move(ids.B, { status: 'nope' }).expect(400);
      await move(ids.B, { status: 'done' }, viewer).expect(403);
      await move(ids.B, { status: 'done' }, outsider).expect(404);
    });

    it('keeps the order correct after many inserts at the same spot (forces a rebalance)', async () => {
      const r1 = (await http.post(`/api/projects/${boardProject}/tasks`, owner, { title: 'R1', status: 'in_review' }).expect(201)).body.id;
      const r2 = (await http.post(`/api/projects/${boardProject}/tasks`, owner, { title: 'R2', status: 'in_review' }).expect(201)).body.id;
      expect(r1).toBeDefined();

      for (let i = 1; i <= 40; i++) {
        const id = (await http.post(`/api/projects/${boardProject}/tasks`, owner, { title: `X${i}`, status: 'todo' }).expect(201)).body.id;
        await move(id, { status: 'in_review', beforeId: r2 }).expect(200);
      }

      const expected = ['R1', ...Array.from({ length: 40 }, (_, i) => `X${i + 1}`), 'R2'];
      expect(await column('in_review')).toEqual(expected);
    });
  });
});
