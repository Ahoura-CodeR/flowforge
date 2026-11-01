// One public origin: /api/* -> NestJS, everything else -> Next.js.
const http = require("http");

const PORT = Number(process.env.PORT || 7860);
const WEB = { host: "127.0.0.1", port: 3000 };
const API = { host: "127.0.0.1", port: 4000 };

http
  .createServer((req, res) => {
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
