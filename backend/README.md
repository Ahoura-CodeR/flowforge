# FlowForge API

Backend for FlowForge, a team project management app (projects, tasks, Kanban board).
Built with NestJS, TypeORM and PostgreSQL.

## Status

- [x] Auth (register, login, JWT) and role-based access control
- [x] Projects, tasks, priorities, team membership
- [x] Comments, change history, filtering and pagination
- [x] Frontend (Next.js + Kanban board), see `../frontend`
- [x] Tests, API docs, Docker, deployment (see the root README)

## Getting started

Requirements: Node 20+, Docker (or a local PostgreSQL 14+).

```bash
cp .env.example .env
docker compose up -d        # starts PostgreSQL
npm install
npm run start:dev           # http://localhost:4000/api
npm run seed                # creates the first admin from SEED_ADMIN_* in .env
```

Pending migrations are applied automatically on startup. Interactive API docs (Swagger) are at
`http://localhost:4000/api/docs`; health check at `/api/health`.

## Database migrations

The schema changes only through migrations (`src/database/migrations`).

```bash
npm run migration:generate -- src/database/migrations/AddSomething   # diff entities vs. database
npm run migration:run
npm run migration:revert
```

## Tests

```bash
npm test            # unit tests (pure logic, guard, auth service)
npm run test:e2e    # API tests against PostgreSQL; uses its own database (flowforge_test)
```

Create the test database once: `createdb -O flowforge flowforge_test`. Override with
`TEST_DB_NAME` or the usual `DB_*` variables. Rate limiting is switched off when `NODE_ENV=test`.

## Endpoints

| Method | Path                  | Access        | Description                      |
| ------ | --------------------- | ------------- | -------------------------------- |
| POST   | `/api/auth/register`  | public        | Create an account (role: member) |
| POST   | `/api/auth/login`     | public        | Returns an access token          |
| GET    | `/api/auth/me`        | authenticated | Current user                     |
| GET    | `/api/users`          | admin         | List users                       |
| PATCH  | `/api/users/:id/role` | admin         | Change a user's role             |

### Projects and members

Project roles: `owner` > `member` > `viewer`. Non-members get a 404, so the API never
reveals which projects exist.

| Method | Path                                  | Minimum role | Description                          |
| ------ | ------------------------------------- | ------------ | ------------------------------------ |
| POST   | `/api/projects`                       | authenticated | Create a project (caller becomes owner) |
| GET    | `/api/projects`                       | authenticated | Projects the caller belongs to       |
| GET    | `/api/projects/:projectId`            | viewer       | Project details                      |
| PATCH  | `/api/projects/:projectId`            | owner        | Update name or description           |
| DELETE | `/api/projects/:projectId`            | owner        | Delete project, members and tasks    |
| GET    | `/api/projects/:projectId/members`    | viewer       | List members                         |
| POST   | `/api/projects/:projectId/members`    | owner        | Add an existing user by email        |
| PATCH  | `/api/projects/:projectId/members/:userId` | owner   | Change a member's role               |
| DELETE | `/api/projects/:projectId/members/:userId` | member  | Owner removes anyone; others can only leave |

### Tasks

| Method | Path                                  | Minimum role | Description                          |
| ------ | ------------------------------------- | ------------ | ------------------------------------ |
| GET    | `/api/projects/:projectId/tasks`      | viewer       | List tasks (filters, search, pagination, sorting) |
| GET    | `/api/projects/:projectId/tasks/:id`  | viewer       | Task details                         |
| POST   | `/api/projects/:projectId/tasks`      | member       | Create a task (gets key like `FF-12`) |
| PATCH  | `/api/projects/:projectId/tasks/:id`  | member       | Update fields, assign, change status |
| PATCH  | `/api/projects/:projectId/tasks/:id/move` | member   | Move to a column and position (`{ status, beforeId }`) |
| DELETE | `/api/projects/:projectId/tasks/:id`  | owner        | Delete a task                        |

#### Task list query parameters

| Param       | Example                          | Notes                                            |
| ----------- | -------------------------------- | ------------------------------------------------ |
| `status`    | `todo,in_progress`               | Comma-separated or repeated                      |
| `priority`  | `high,urgent`                    | Comma-separated or repeated                      |
| `assignee`  | `me`, `unassigned`, a user id    |                                                  |
| `search`    | `login`                          | Case-insensitive match on title and description  |
| `dueBefore` / `dueAfter` | `2026-12-01`        | Inclusive, ISO date                              |
| `sortBy`    | `number` (default), `createdAt`, `updatedAt`, `dueDate`, `priority`, `position` | |
| `order`     | `desc` (default), `asc`          |                                                  |
| `page` / `limit` | `1` / `20` (max 100)        | Response is `{ data, meta: { total, page, limit, totalPages } }` |

### Comments and history

| Method | Path                                                  | Minimum role | Description                              |
| ------ | ----------------------------------------------------- | ------------ | ---------------------------------------- |
| GET    | `/api/projects/:projectId/tasks/:taskId/comments`     | viewer       | List comments (oldest first, paginated)  |
| POST   | `/api/projects/:projectId/tasks/:taskId/comments`     | member       | Add a comment                            |
| PATCH  | `/api/projects/:projectId/tasks/:taskId/comments/:id` | member       | Edit your own comment                    |
| DELETE | `/api/projects/:projectId/tasks/:taskId/comments/:id` | member       | Delete your own comment (owner: any)     |
| GET    | `/api/projects/:projectId/tasks/:taskId/activity`     | viewer       | Change history (newest first, paginated) |

Send the token as `Authorization: Bearer <token>`.

## Design notes

- **Secure by default.** `JwtAuthGuard` is registered globally; routes opt out with `@Public()`.
  Role checks use `@Roles(...)` and a second global guard.
- **Roles are read from the database, not the token.** The JWT only carries the user id,
  so a role change or a deleted account applies on the next request.
- **Password hashes never leave the database layer.** The column is `select: false`
  and only the login query asks for it.
- **Registration relies on the unique constraint** and maps the Postgres error to a 409,
  instead of checking first and inserting after, which races under concurrent requests.
- **Environment is validated at boot.** The app refuses to start with a missing
  variable or a short JWT secret.
- **Two levels of authorization.** The global role (`admin`/`member`) is checked by `RolesGuard`;
  the per-project role is checked by `ProjectRoleGuard`, which loads the caller's membership
  and attaches it to the request.
- **Task numbers come from an atomic SQL increment** on the project row, inside the same
  transaction that inserts the task, so parallel requests can't produce duplicates.
- **Database enforces the invariants it can.** Unique (project, user) membership, a partial
  unique index for a single owner per project, and cascading deletes.
- **Business rules in the service layer.** Assignees must be project members, and removing
  a member unassigns their tasks.
- **Task history is written in the same transaction as the change.** A pure `diffTask`
  function lists the fields that actually changed; edits that change nothing leave no entry.
  Assignee changes are stored as user ids and resolved to names when read.
- **List filters are built with parameterized query-builder conditions.** `sortBy` is checked
  against a whitelist, and `%`, `_` in search text are escaped so they match literally.
- **Kanban order uses fractional positions.** Dropping a card between two others gives it the
  midpoint of their positions, so a move is one row update. If midpoints ever run out of
  floating point precision, the column is re-spaced. Moves lock the project row so two
  simultaneous drags can't compute from stale neighbours.
- **Validation is strict.** Unknown properties are rejected, so a client can't send
  `role: "admin"` to register.
