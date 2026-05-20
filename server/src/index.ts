import { join, normalize, sep } from "node:path";
import type { ServerWebSocket } from "bun";
import { createApiRouter } from "./api-router";
import { createAuthenticate } from "./auth";
import { db, initDb } from "./db";
import { createHttpHelpers } from "./http";
import { createSessionHelpers } from "./session";
import type { UserRole } from "./types";

const PORT = Number(process.env.PORT ?? 3000);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 1000 * 60 * 60 * 24 * 7);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const SESSION_COOKIE_NAME = "worktime_session";
const CLIENT_DIST = process.env.CLIENT_DIST ?? join(process.cwd(), "client", "dist");
const MAX_COORD = 50000;

type WsClientData = {
  userId: number;
  role: UserRole;
};

const wsClients = new Set<ServerWebSocket<WsClientData>>();
const { withCors, json, error, readJsonBody } = createHttpHelpers(CORS_ORIGIN);
const { getSessionToken, buildSessionCookie, buildClearSessionCookie } = createSessionHelpers(
  SESSION_COOKIE_NAME,
  COOKIE_SECURE
);
const authenticate = createAuthenticate(getSessionToken);

function broadcastRefresh(reason: string) {
  if (wsClients.size === 0) {
    return;
  }

  const payload = JSON.stringify({
    type: "refresh",
    reason,
    at: Date.now()
  });

  for (const client of wsClients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

async function serveSpa(pathname: string): Promise<Response> {
  const normalizedRoot = normalize(CLIENT_DIST + sep);
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const normalizedTarget = normalize(join(CLIENT_DIST, requested));

  if (!normalizedTarget.startsWith(normalizedRoot)) {
    return new Response("Forbidden", { status: 403 });
  }

  const requestedFile = Bun.file(normalizedTarget);
  if (await requestedFile.exists()) {
    return withCors(new Response(requestedFile));
  }

  const indexFile = Bun.file(join(CLIENT_DIST, "index.html"));
  if (await indexFile.exists()) {
    return withCors(new Response(indexFile));
  }

  return withCors(
    new Response(
      "Frontend не найден. Выполните `bun install` и `bun run build:web`, либо запустите vite в dev-режиме.",
      { status: 503 }
    )
  );
}

function clampPosition(value: number) {
  return Math.min(Math.max(value, 0), MAX_COORD);
}

const handleApiRequest = createApiRouter({
  authenticate,
  json,
  error,
  readJsonBody,
  buildSessionCookie,
  buildClearSessionCookie,
  sessionTtlMs: SESSION_TTL_MS,
  broadcastRefresh,
  clampPosition
});

await initDb();
db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());

const server = Bun.serve<WsClientData>({
  port: PORT,
  async fetch(request) {
    try {
      if (request.method === "OPTIONS") {
        return withCors(new Response(null, { status: 204 }));
      }

      const url = new URL(request.url);
      const pathname = url.pathname;

      if (pathname === "/ws") {
        const auth = authenticate(request);
        if (!auth) {
          return error(401, "Требуется авторизация.");
        }

        const upgraded = server.upgrade(request, {
          data: {
            userId: auth.user.id,
            role: auth.user.role
          }
        });
        if (upgraded) {
          return;
        }

        return error(500, "Не удалось открыть WebSocket.");
      }

      const apiResponse = await handleApiRequest(request, pathname);
      if (apiResponse) {
        return apiResponse;
      }

      return await serveSpa(pathname);
    } catch (err) {
      console.error(err);
      return error(500, "Внутренняя ошибка сервера.");
    }
  },
  websocket: {
    open(ws) {
      wsClients.add(ws);
      ws.send(JSON.stringify({ type: "ready", at: Date.now() }));
    },
    message(ws, message) {
      const parsed = typeof message === "string" ? message : "";
      if (parsed === "ping") {
        ws.send(JSON.stringify({ type: "pong", at: Date.now() }));
      }
    },
    close(ws) {
      wsClients.delete(ws);
    }
  }
});

console.log(`Worktime Board API started on http://localhost:${PORT}`);
