import { db, getAppSettings } from "../db";
import type { UserRole } from "../types";
import { parseString } from "../validation";
import type { AuthedRouteContext, PublicRouteContext } from "../api-types";

export async function handlePublicAuthRoutes(
  context: PublicRouteContext
): Promise<Response | null> {
  const { request, pathname, deps } = context;

  if (pathname !== "/api/auth/login" || request.method !== "POST") {
    return null;
  }

  const body = await deps.readJsonBody<{ login?: unknown; password?: unknown }>(request);
  if (!body) {
    return deps.error(400, "Ожидался JSON.");
  }

  let login: string;
  let password: string;

  try {
    login = parseString(body.login, "login", 3, 60);
    password = parseString(body.password, "password", 8, 200);
  } catch (err) {
    return deps.error(400, (err as Error).message);
  }

  const user = db
    .query(
      `
      SELECT
        id,
        login,
        full_name AS fullName,
        password_hash AS passwordHash,
        role,
        employee_id AS employeeId
      FROM users
      WHERE login = ? AND is_active = 1
      LIMIT 1
      `
    )
    .get(login) as {
    id: number;
    login: string;
    fullName: string;
    passwordHash: string;
    role: UserRole;
    employeeId: number | null;
  } | null;

  if (!user) {
    return deps.error(401, "Неверный логин или пароль.");
  }

  const isValid = await Bun.password.verify(password, user.passwordHash);
  if (!isValid) {
    return deps.error(401, "Неверный логин или пароль.");
  }

  const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
  const expiresAt = Date.now() + deps.sessionTtlMs;
  const maxAgeSeconds = Math.max(1, Math.floor(deps.sessionTtlMs / 1000));

  db.transaction(() => {
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
    db.prepare("INSERT INTO sessions(token, user_id, expires_at) VALUES (?, ?, ?)").run(
      token,
      user.id,
      expiresAt
    );
  })();

  return deps.json({
    ok: true,
    expiresAt,
    user: {
      id: user.id,
      login: user.login,
      fullName: user.fullName,
      role: user.role,
      employeeId: user.employeeId
    }
  }, 200, {
    "Set-Cookie": deps.buildSessionCookie(token, maxAgeSeconds)
  });
}

export async function handleAuthedAuthRoutes(
  context: AuthedRouteContext
): Promise<Response | null> {
  const { request, pathname, auth, deps } = context;

  if (pathname === "/api/auth/me" && request.method === "GET") {
    return deps.json({ user: auth.user, settings: getAppSettings() });
  }

  if (pathname === "/api/auth/logout" && request.method === "POST") {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(auth.token);
    return deps.json({ ok: true }, 200, {
      "Set-Cookie": deps.buildClearSessionCookie()
    });
  }

  if (pathname === "/api/auth/change-password" && request.method === "POST") {
    const body = await deps.readJsonBody<{
      currentPassword?: unknown;
      newPassword?: unknown;
    }>(request);

    if (!body) {
      return deps.error(400, "Ожидался JSON.");
    }

    let currentPassword: string;
    let newPassword: string;
    try {
      currentPassword = parseString(body.currentPassword, "currentPassword", 8, 200);
      newPassword = parseString(body.newPassword, "newPassword", 8, 200);
    } catch (err) {
      return deps.error(400, (err as Error).message);
    }

    const currentUser = db
      .query("SELECT password_hash AS passwordHash FROM users WHERE id = ? LIMIT 1")
      .get(auth.user.id) as { passwordHash: string } | null;

    if (!currentUser) {
      return deps.error(404, "Пользователь не найден.");
    }

    const isValid = await Bun.password.verify(currentPassword, currentUser.passwordHash);
    if (!isValid) {
      return deps.error(401, "Текущий пароль указан неверно.");
    }

    const nextHash = await Bun.password.hash(newPassword);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      nextHash,
      auth.user.id
    );

    return deps.json({ ok: true });
  }

  return null;
}
