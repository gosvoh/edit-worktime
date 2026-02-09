import { getAppSettings, updateAppSettings } from "../db";
import type { AppSettings } from "../types";
import { parsePositiveNumber } from "../validation";
import { requireAdmin, type AuthedRouteContext } from "../api-types";

export async function handleSettingsRoutes(
  context: AuthedRouteContext
): Promise<Response | null> {
  const { request, pathname, deps } = context;

  if (pathname === "/api/settings" && request.method === "GET") {
    return deps.json(getAppSettings());
  }

  if (pathname !== "/api/settings" || request.method !== "PUT") {
    return null;
  }

  const roleError = requireAdmin(context);
  if (roleError) {
    return roleError;
  }

  const body = await deps.readJsonBody<{
    baseHoursPerRate?: unknown;
    warningThreshold?: unknown;
  }>(request);

  if (!body) {
    return deps.error(400, "Ожидался JSON.");
  }

  let patch: Partial<AppSettings> = {};

  try {
    if (typeof body.baseHoursPerRate !== "undefined") {
      patch = {
        ...patch,
        baseHoursPerRate: parsePositiveNumber(body.baseHoursPerRate, "baseHoursPerRate")
      };
    }

    if (typeof body.warningThreshold !== "undefined") {
      patch = {
        ...patch,
        warningThreshold: parsePositiveNumber(body.warningThreshold, "warningThreshold", {
          min: 0.01,
          max: 0.99
        })
      };
    }
  } catch (err) {
    return deps.error(400, (err as Error).message);
  }

  if (Object.keys(patch).length === 0) {
    return deps.error(400, "Нет данных для обновления.");
  }

  const updatedSettings = updateAppSettings(patch);
  deps.broadcastRefresh("settings_updated");
  return deps.json(updatedSettings);
}
