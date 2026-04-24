import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function getPort() {
  const portFlagIndex = process.argv.indexOf("--port");
  if (portFlagIndex >= 0 && process.argv[portFlagIndex + 1]) {
    return Number(process.argv[portFlagIndex + 1]);
  }

  return Number(process.env.PORT || 4173);
}

function getRootDir() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, "..");
}

function sendStatus(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(message);
}

async function resolveFile(rootDir, requestPath) {
  const safePath = decodeURIComponent(requestPath.split("?")[0]).replace(/^\/+/, "");
  const candidate = safePath ? path.resolve(rootDir, safePath) : path.join(rootDir, "index.html");
  const normalized = candidate.startsWith(rootDir) ? candidate : rootDir;
  const target = normalized === rootDir ? path.join(rootDir, "index.html") : normalized;

  if (!target.startsWith(rootDir)) {
    return null;
  }

  if (!existsSync(target)) {
    return null;
  }

  const targetStats = await stat(target);
  if (targetStats.isDirectory()) {
    const indexFile = path.join(target, "index.html");
    if (!existsSync(indexFile)) {
      return null;
    }

    return indexFile;
  }

  return target;
}

const rootDir = getRootDir();
const port = getPort();
const server = http.createServer(async (request, response) => {
  try {
    const target = await resolveFile(rootDir, request.url || "/");
    if (!target) {
      sendStatus(response, 404, "Not Found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(target).pipe(response);
  } catch (error) {
    sendStatus(response, 500, error instanceof Error ? error.message : "Internal Server Error");
  }
});

function shutdown(signal) {
  server.close(() => {
    process.exit(signal ? 0 : 1);
  });
}

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${rootDir} at http://127.0.0.1:${port}`);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
