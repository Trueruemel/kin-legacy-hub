// Runs the built app inside the desktop package.
// The production bundle is a module worker (`export default { fetch }`), so we
// bridge Node's http server to that fetch handler.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Server-side configuration shipped with the package.
try {
  const raw = readFileSync(join(root, "desktop.env"), "utf8");
  for (const line of raw.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {
  // no bundled config — rely on the ambient environment
}

const worker = (await import(join(root, "dist", "server", "index.mjs"))).default;
const port = Number(process.env.PORT ?? 47821);
const host = process.env.HOST ?? "127.0.0.1";

createServer(async (req, res) => {
  try {
    const url = `http://${req.headers.host ?? `${host}:${port}`}${req.url}`;
    const method = req.method ?? "GET";
    let body;
    if (method !== "GET" && method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }
    const request = new Request(url, { method, headers: req.headers, body });
    const response = await worker.fetch(request, process.env, {
      waitUntil() {},
      passThroughOnException() {},
    });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`Server error: ${error instanceof Error ? error.message : String(error)}`);
  }
}).listen(port, host, () => {
  console.log(`Eternal Memories running on http://${host}:${port}`);
});
