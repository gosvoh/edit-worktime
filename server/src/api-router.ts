import type { ApiRouterDeps } from "./api-types";
import { handleAuthedAuthRoutes, handlePublicAuthRoutes } from "./routes/auth-routes";
import { handleEmployeeRoutes } from "./routes/employee-routes";
import { handleImportExportRoutes } from "./routes/import-export-routes";
import { handleSettingsRoutes } from "./routes/settings-routes";
import { handleUserRoutes } from "./routes/user-routes";

export function createApiRouter(deps: ApiRouterDeps) {
  return async function handleApiRequest(request: Request, pathname: string): Promise<Response | null> {
    if (!pathname.startsWith("/api/")) {
      return null;
    }

    if (pathname === "/api/health" && request.method === "GET") {
      return deps.json({ ok: true, now: new Date().toISOString() });
    }

    const publicAuthResponse = await handlePublicAuthRoutes({ request, pathname, deps });
    if (publicAuthResponse) {
      return publicAuthResponse;
    }

    const auth = deps.authenticate(request);
    if (!auth) {
      return deps.error(401, "Требуется авторизация.");
    }

    const authedContext = { request, pathname, auth, deps };

    const handlers = [
      handleAuthedAuthRoutes,
      handleSettingsRoutes,
      handleImportExportRoutes,
      handleEmployeeRoutes,
      handleUserRoutes
    ];

    for (const handler of handlers) {
      const response = await handler(authedContext);
      if (response) {
        return response;
      }
    }

    return deps.error(404, "Маршрут API не найден.");
  };
}
