// One public origin: /api/* -> NestJS, everything else -> Next.js.
const http = require("http");
const fs = require("fs");

const PORT = Number(process.env.PORT || 7860);
const WEB = { host: "127.0.0.1", port: 3000 };
const API = { host: "127.0.0.1", port: 4000 };

// Until /tmp/ready exists the port still answers, so a health check never sees a dead container.
const READY = "/tmp/ready";
const PAGE = `<!doctype html><meta charset="utf-8"><title>Starting FlowForge…</title>
<meta http-equiv="refresh" content="3">
<style>body{font:16px/1.6 system-ui;margin:0;height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a}
main{text-align:center}h1{font-size:20px;margin:0 0 8px}p{margin:0;color:#64748b}</style>
<main><h1>Starting the demo…</h1><p>The free instance was asleep. This page refreshes itself.</p></main>`;

http
  .createServer((req, res) => {
    if (req.url === "/_boot") {
      res.writeHead(200, { "content-type": "text/plain" });
      return res.end("ok");
    }
    if (!fs.existsSync(READY)) {
      res.writeHead(503, { "content-type": "text/html; charset=utf-8", "retry-after": "3" });
      return res.end(PAGE);
    }
    const target = req.url.startsWith("/api") ? API : WEB;
    const proxy = http.request(
      { host: target.host, port: target.port, path: req.url, method: req.method, headers: req.headers },
      (upstream) => {
        res.writeHead(upstream.statusCode || 502, upstream.headers);
        upstream.pipe(res);
      }
    );
    proxy.on("error", () => {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end("upstream unavailable");
    });
    req.pipe(proxy);
  })
  .listen(PORT, "0.0.0.0", () => console.log("demo listening on " + PORT));
