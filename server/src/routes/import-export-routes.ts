import { buildExportPayload } from "../export";
import { importPayload } from "../import-payload";
import { requireAdmin, type AuthedRouteContext } from "../api-types";

export async function handleImportExportRoutes(
  context: AuthedRouteContext
): Promise<Response | null> {
  const { request, pathname, deps } = context;

  if (pathname === "/api/export" && request.method === "GET") {
    const roleError = requireAdmin(context);
    if (roleError) {
      return roleError;
    }

    return deps.json(buildExportPayload());
  }

  if (pathname === "/api/import" && request.method === "POST") {
    const roleError = requireAdmin(context);
    if (roleError) {
      return roleError;
    }

    const body = await deps.readJsonBody<unknown>(request);
    if (!body) {
      return deps.error(400, "Ожидался JSON.");
    }

    try {
      await importPayload(body);
    } catch (err) {
      return deps.error(400, (err as Error).message);
    }

    deps.broadcastRefresh("data_imported");
    return deps.json({ ok: true });
  }

  return null;
}
