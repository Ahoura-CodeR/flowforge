# FlowForge Web

Frontend for FlowForge: sign in, manage projects and teams, and plan work on a Kanban board.
Built with Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query and @hello-pangea/dnd.

## Getting started

Requires Node 20+ and the API from `../backend` running on port 4000.

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000
```

## Features

- Register, sign in, session restored on reload, sign out
- Projects list and creation (task key such as `FF`)
- Kanban board with drag and drop; card order is saved on the server
- Filters: text search (debounced), assignee, priority
- Task dialog: edit fields, comments, change history, delete (owner)
- Team dialog: add members by email, change roles, remove (owner)
- Viewers get a read-only board

## Structure

```
src/
  app/            routes (login, register, projects, projects/[projectId])
  components/     UI primitives, auth form, board/ (board, card, dialogs, filters)
  lib/
    api.ts        fetch wrapper: base URL, token, error mapping
    auth.tsx      session context (login, register, logout)
    hooks.ts      all server state: queries and mutations
    board.ts      pure functions for the optimistic drag and drop update
```

## Design notes

- **Server state lives in TanStack Query**, not in component state. Mutations invalidate
  the affected queries, so the board, history and comments stay consistent.
- **Dragging is optimistic.** `moveInList` updates the cached list immediately, the move
  request goes out, and the cache is rolled back if the server rejects it.
- **The server owns ordering.** The client only says "put this card before that one";
  the API computes the stored position.
- **The token is kept in `localStorage`.** Simple for a SPA-style client, but readable by any
  script on the page. An httpOnly cookie would be the safer choice in production.
- **Filters are applied by the API**, so the board never has to hold every task in memory
  unfiltered; it fetches all pages of the filtered result.
