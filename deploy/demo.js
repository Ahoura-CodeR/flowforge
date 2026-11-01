// Demo data: one project with a populated board, created through the public API.
const BASE = "http://127.0.0.1:4000/api";

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: Object.assign(
      { "content-type": "application/json" },
      token ? { authorization: "Bearer " + token } : {}
    ),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(method + " " + path + " -> " + res.status);
  return res.json().catch(() => ({}));
}

const unwrap = (r) => (r && r.data !== undefined ? r.data : r);

const TASKS = [
  ["Design empty states for the board filters", "todo", "medium", null],
  ["Add CSV export to the task list", "todo", "low", "2026-12-14T00:00:00.000Z"],
  ["Keyboard shortcuts for moving cards", "todo", "low", null],
  ["Show the assignee's workload in the member dialog", "todo", "medium", null],
  ["Wire optimistic moves on the board", "in_progress", "high", "2026-12-06T00:00:00.000Z"],
  ["Rate limit the member invite endpoint", "in_progress", "urgent", null],
  ["Project role guard returns 404 for non-members", "in_review", "high", "2026-12-04T00:00:00.000Z"],
  ["Pagination on the activity feed", "in_review", "medium", null],
  ["Task numbers with an atomic increment", "done", "high", null],
  ["Kanban ordering with fractional positions", "done", "medium", null],
  ["Comment thread with change history", "done", "low", null],
];

(async () => {
  const auth = await call("POST", "/auth/login", { email: "admin@flowforge.local", password: "admin12345" });
  const token = auth.accessToken;
  const me = (await call("GET", "/auth/me", null, token)).id;

  const projects = unwrap(await call("GET", "/projects", null, token)) || [];
  let project = projects.find((p) => p.key === "WEB");
  if (!project) {
    project = unwrap(
      await call("POST", "/projects", {
        name: "Web platform",
        key: "WEB",
        description: "Customer-facing web app: billing, dashboard and the public API.",
      }, token)
    );
  }

  const existing = new Set((unwrap(await call("GET", "/projects/" + project.id + "/tasks?limit=100", null, token)) || []).map((t) => t.title));
  let created = 0;
  for (const [title, status, priority, dueDate] of TASKS) {
    if (existing.has(title)) continue;
    await call("POST", "/projects/" + project.id + "/tasks", {
      title, status, priority, assigneeId: me, dueDate,
    }, token);
    created++;
  }
  console.log("[demo] project " + project.key + ", tasks created: " + created);
})().catch((e) => console.error("[demo] failed:", e.message));
