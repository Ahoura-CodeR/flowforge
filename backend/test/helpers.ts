import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app); // same pipes and prefix as production
  // Listening on a random port lets supertest reuse one server instead of opening one per request.
  await app.listen(0);
  return app;
}

/** Wipes all data (cascades to every table that references users or projects). */
export async function resetDatabase(app: INestApplication) {
  await app.get(DataSource).query('TRUNCATE TABLE users, projects RESTART IDENTITY CASCADE');
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

export async function registerUser(app: INestApplication, name: string): Promise<TestUser> {
  const email = `${name.toLowerCase()}@test.dev`;
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, name, password: 'password123' })
    .expect(201);
  return { id: res.body.user.id, email, token: res.body.accessToken };
}

/** Tiny wrapper so specs read like `http.post(path, user, body)`. */
export function client(app: INestApplication) {
  const server = app.getHttpServer();
  const auth = (req: request.Test, user?: { token: string }) =>
    user ? req.set('Authorization', `Bearer ${user.token}`) : req;

  return {
    get: (path: string, user?: { token: string }) => auth(request(server).get(path), user),
    post: (path: string, user?: { token: string }, body?: object) =>
      auth(request(server).post(path), user).send(body),
    patch: (path: string, user?: { token: string }, body?: object) =>
      auth(request(server).patch(path), user).send(body),
    delete: (path: string, user?: { token: string }) => auth(request(server).delete(path), user),
  };
}
