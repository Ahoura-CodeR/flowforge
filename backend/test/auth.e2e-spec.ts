import { INestApplication } from '@nestjs/common';
import { UserRole } from '../src/users/user.entity';
import { UsersService } from '../src/users/users.service';
import { client, createTestApp, registerUser, resetDatabase } from './helpers';

describe('Auth and users', () => {
  let app: INestApplication;
  let http: ReturnType<typeof client>;

  beforeAll(async () => {
    app = await createTestApp();
    http = client(app);
    await resetDatabase(app);
  });

  afterAll(() => app.close());

  describe('registration', () => {
    it('creates an account, normalizes the email and never returns the hash', async () => {
      const res = await http
        .post('/api/auth/register', undefined, { email: '  Ali@Test.DEV ', name: ' Ali ', password: 'password123' })
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email: 'ali@test.dev', name: 'Ali', role: 'member' });
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });

    it('rejects a duplicate email, even with different casing', async () => {
      const res = await http
        .post('/api/auth/register', undefined, { email: 'ALI@test.dev', name: 'Other', password: 'password123' })
        .expect(409);
      expect(res.body.message).toMatch(/already registered/i);
    });

    it('validates the body', async () => {
      await http.post('/api/auth/register', undefined, { email: 'nope', name: 'A', password: '1' }).expect(400);
    });

    it('refuses extra fields, so a client cannot register itself as admin', async () => {
      await http
        .post('/api/auth/register', undefined, { email: 'evil@test.dev', name: 'Evil', password: 'password123', role: 'admin' })
        .expect(400);
    });
  });

  describe('login and session', () => {
    it('logs in and returns a token that works on /auth/me', async () => {
      const login = await http.post('/api/auth/login', undefined, { email: 'ali@test.dev', password: 'password123' }).expect(200);
      const me = await http.get('/api/auth/me', { token: login.body.accessToken }).expect(200);
      expect(me.body).toMatchObject({ email: 'ali@test.dev', name: 'Ali' });
      expect(me.body.passwordHash).toBeUndefined();
    });

    it('gives the same 401 for a wrong password and an unknown email', async () => {
      const wrong = await http.post('/api/auth/login', undefined, { email: 'ali@test.dev', password: 'wrong-password' }).expect(401);
      const unknown = await http.post('/api/auth/login', undefined, { email: 'ghost@test.dev', password: 'password123' }).expect(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('protects routes by default and rejects bad tokens', async () => {
      await http.get('/api/auth/me').expect(401);
      await http.get('/api/auth/me', { token: 'garbage' }).expect(401);
      await http.get('/api/projects').expect(401);
    });

    it('keeps the health check public', async () => {
      const res = await http.get('/api/health').expect(200);
      expect(res.body).toEqual({ status: 'ok', database: 'up' });
    });
  });

  describe('system roles (admin)', () => {
    it('blocks members from the admin endpoints', async () => {
      const member = await registerUser(app, 'Member');
      await http.get('/api/users', member).expect(403);
    });

    it('lets an admin list users and change roles, but not their own', async () => {
      await app.get(UsersService).create({ email: 'admin@test.dev', name: 'Admin', password: 'password123', role: UserRole.ADMIN });
      const login = await http.post('/api/auth/login', undefined, { email: 'admin@test.dev', password: 'password123' }).expect(200);
      const admin = { token: login.body.accessToken as string, id: login.body.user.id as string };

      const users = await http.get('/api/users', admin).expect(200);
      expect(users.body.length).toBeGreaterThanOrEqual(3);

      const target = users.body.find((u: { email: string }) => u.email === 'ali@test.dev');
      const promoted = await http.patch(`/api/users/${target.id}/role`, admin, { role: 'admin' }).expect(200);
      expect(promoted.body.role).toBe('admin');

      await http.patch(`/api/users/${admin.id}/role`, admin, { role: 'member' }).expect(400);
      await http.patch('/api/users/not-a-uuid/role', admin, { role: 'member' }).expect(400);
      await http.patch('/api/users/00000000-0000-4000-8000-000000000000/role', admin, { role: 'member' }).expect(404);
    });

    it('applies a role change on the very next request, even with an old token', async () => {
      const login = await http.post('/api/auth/login', undefined, { email: 'ali@test.dev', password: 'password123' }).expect(200);
      // Ali was promoted in the previous test. Keep his token, demote him, and use the same token again.
      const adminLogin = await http.post('/api/auth/login', undefined, { email: 'admin@test.dev', password: 'password123' }).expect(200);
      const aliToken = { token: login.body.accessToken as string };
      await http.get('/api/users', aliToken).expect(200);

      await http.patch(`/api/users/${login.body.user.id}/role`, { token: adminLogin.body.accessToken }, { role: 'member' }).expect(200);
      await http.get('/api/users', aliToken).expect(403);
    });
  });
});
