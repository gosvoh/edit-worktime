import type { AuthData } from "./auth";

export type ApiRouterDeps = {
  authenticate: (request: Request) => AuthData | null;
  json: (data: unknown, status?: number, extraHeaders?: HeadersInit) => Response;
  error: (status: number, message: string) => Response;
  readJsonBody: <T>(request: Request) => Promise<T | null>;
  buildSessionCookie: (token: string, maxAgeSeconds: number) => string;
  buildClearSessionCookie: () => string;
  sessionTtlMs: number;
  broadcastRefresh: (reason: string) => void;
  clampPosition: (value: number) => number;
};

export type PublicRouteContext = {
  request: Request;
  pathname: string;
  deps: ApiRouterDeps;
};

export type AuthedRouteContext = {
  request: Request;
  pathname: string;
  auth: AuthData;
  deps: ApiRouterDeps;
};

export function requireAdmin(context: AuthedRouteContext): Response | null {
  if (context.auth.user.role !== "admin") {
    return context.deps.error(403, "Недостаточно прав.");
  }
  return null;
}
