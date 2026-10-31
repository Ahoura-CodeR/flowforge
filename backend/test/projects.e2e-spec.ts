import { INestApplication } from '@nestjs/common';
import { client, createTestApp, registerUser, resetDatabase, TestUser } from './helpers';

describe('Projects and members', () => {
  let app: INestApplication;
  let http: ReturnType<typeof client>;
  let owner: TestUser, sara: TestUser, viewer: TestUser, outsider: TestUser;
  let projectId: string;

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
  });

  afterAll(() => app.close());

  describe('creating and reading', () => {
    it('creates a project, uppercases the key and makes the creator the owner', async () => {
      const res = await http.post('/api/projects', owner, { name: 'FlowForge', key: ' ff ' }).expect(201);
      expect(res.body).toMatchObject({ name: 'FlowForge', key: 'FF', myRole: 'owner' });
      projectId = res.body.id;
    });

    it('rejects a duplicate key and an invalid key', async () => {
      await http.post('/api/projects', sara, { name: 'Other', key: 'FF' }).expect(409);
      await http.post('/api/projects', sara, { name: 'Other', key: '1x' }).expect(400);
    });

    it('lists only the projects the caller belongs to', async () => {
      const mine = await http.get('/api/projects', owner).expect(200);
      const theirs = await http.get('/api/projects', outsider).expect(200);
      expect(mine.body).toHaveLength(1);
      expect(theirs.body).toHaveLength(0);
    });

    it('answers 404 to non-members and to malformed ids', async () => {
      await http.get(`/api/projects/${projectId}`, outsider).expect(404);
      await http.get('/api/projects/abc', owner).expect(404);
    });
  });

  describe('membership', () => {
    it('lets the owner add members by email with member or viewer roles', async () => {
      const added = await http.post(`/api/projects/${projectId}/members`, owner, { email: 'SARA@test.dev', role: 'member' }).expect(201);
      expect(added.body).toMatchObject({ name: 'Sara', role: 'member' });
      await http.post(`/api/projects/${projectId}/members`, owner, { email: viewer.email, role: 'viewer' }).expect(201);
    });

    it('refuses to hand out ownership, unknown users and duplicates', async () => {
      await http.post(`/api/projects/${projectId}/members`, owner, { email: outsider.email, role: 'owner' }).expect(400);
      await http.post(`/api/projects/${projectId}/members`, owner, { email: 'nobody@test.dev', role: 'member' }).expect(404);
      await http.post(`/api/projects/${projectId}/members`, owner, { email: sara.email, role: 'member' }).expect(409);
    });

    it('only lets the owner manage the team', async () => {
      await http.post(`/api/projects/${projectId}/members`, sara, { email: outsider.email, role: 'member' }).expect(403);
      await http.patch(`/api/projects/${projectId}`, sara, { name: 'Hijacked' }).expect(403);
      await http.delete(`/api/projects/${projectId}`, sara).expect(403);
    });

    it('lets any member see the team', async () => {
      const res = await http.get(`/api/projects/${projectId}/members`, viewer).expect(200);
      expect(res.body.map((m: { name: string }) => m.name).sort()).toEqual(['Owner', 'Sara', 'Viewer']);
    });

    it('protects the owner from role changes and removal', async () => {
      await http.patch(`/api/projects/${projectId}/members/${owner.id}`, owner, { role: 'member' }).expect(400);
      await http.delete(`/api/projects/${projectId}/members/${owner.id}`, owner).expect(400);
    });

    it('lets the owner change a role and lets a member leave on their own', async () => {
      await http.patch(`/api/projects/${projectId}/members/${viewer.id}`, owner, { role: 'member' }).expect(200);
      await http.patch(`/api/projects/${projectId}/members/${viewer.id}`, owner, { role: 'viewer' }).expect(200);

      await http.delete(`/api/projects/${projectId}/members/${viewer.id}`, sara).expect(403); // not allowed to remove others
      await http.delete(`/api/projects/${projectId}/members/${sara.id}`, sara).expect(204); // leaving is fine
      await http.get(`/api/projects/${projectId}`, sara).expect(404); // and she no longer sees the project
    });
  });

  describe('updating and deleting', () => {
    it('lets the owner update name and description but not the key', async () => {
      const res = await http.patch(`/api/projects/${projectId}`, owner, { name: 'FlowForge v2', description: 'demo' }).expect(200);
      expect(res.body).toMatchObject({ name: 'FlowForge v2', key: 'FF', description: 'demo' });
      await http.patch(`/api/projects/${projectId}`, owner, { key: 'ZZ' }).expect(400);
    });

    it('removing a member unassigns their tasks', async () => {
      await http.post(`/api/projects/${projectId}/members`, owner, { email: sara.email, role: 'member' }).expect(201);
      const task = await http.post(`/api/projects/${projectId}/tasks`, owner, { title: 'Assigned', assigneeId: sara.id }).expect(201);
      expect(task.body.assignee.id).toBe(sara.id);

      await http.delete(`/api/projects/${projectId}/members/${sara.id}`, owner).expect(204);
      const after = await http.get(`/api/projects/${projectId}/tasks/${task.body.id}`, owner).expect(200);
      expect(after.body.assignee).toBeNull();
    });

    it('deleting a project removes it for everyone', async () => {
      await http.delete(`/api/projects/${projectId}`, owner).expect(204);
      await http.get(`/api/projects/${projectId}`, owner).expect(404);
    });
  });
});
