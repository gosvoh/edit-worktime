import type { SQLQueryBindings } from "bun:sqlite";
import {
  logUserCreated,
  logUserDeleted,
  logUserUpdated,
  type AuditChange,
  type AuditFieldChange,
  type UserAuditSnapshot
} from "../audit";
import { db } from "../db";
import { parseUserId } from "../path-parsers";
import type { UserRole } from "../types";
import { parsePositiveNumber, parseString } from "../validation";
import { requireAdmin, type AuthedRouteContext } from "../api-types";

type UserSummaryRow = {
  id: number;
  login: string;
  fullName: string;
  role: UserRole;
  employeeId: number | null;
  isActive: number;
  employeeName: string | null;
};

type UserForAuditRow = {
  id: number;
  login: string;
  fullName: string;
  role: UserRole;
  employeeId: number | null;
  isActive: number;
};

const USER_AUDIT_FIELDS: Array<keyof UserAuditSnapshot> = [
  "login",
  "fullName",
  "role",
  "employeeId",
  "isActive"
];

function toUserAuditSnapshot(row: UserForAuditRow | UserSummaryRow): UserAuditSnapshot {
  return {
    id: row.id,
    login: row.login,
    fullName: row.fullName,
    role: row.role,
    employeeId: row.employeeId,
    isActive: Boolean(row.isActive)
  };
}

function collectUserChanges(
  previous: UserAuditSnapshot,
  current: UserAuditSnapshot,
  passwordChanged: boolean
): Record<string, AuditChange> {
  const changes: Record<string, AuditChange> = {};

  for (const field of USER_AUDIT_FIELDS) {
    if (previous[field] === current[field]) {
      continue;
    }
    changes[field] = {
      from: previous[field],
      to: current[field]
    } satisfies AuditFieldChange;
  }

  if (passwordChanged) {
    changes.password = { changed: true };
  }

  return changes;
}

export async function handleUserRoutes(
  context: AuthedRouteContext
): Promise<Response | null> {
  const { request, pathname, auth, deps } = context;

  if (pathname === "/api/users" && request.method === "GET") {
    const roleError = requireAdmin(context);
    if (roleError) {
      return roleError;
    }

    const users = db
      .query(
        `
        SELECT
          u.id,
          u.login,
          u.full_name AS fullName,
          u.role,
          u.employee_id AS employeeId,
          u.is_active AS isActive,
          e.full_name AS employeeName
        FROM users u
        LEFT JOIN employees e ON e.id = u.employee_id
        ORDER BY u.role DESC, u.login
        `
      )
      .all();

    return deps.json(users);
  }

  if (pathname === "/api/users" && request.method === "POST") {
    const roleError = requireAdmin(context);
    if (roleError) {
      return roleError;
    }

    const body = await deps.readJsonBody<{
      login?: unknown;
      password?: unknown;
      fullName?: unknown;
      role?: unknown;
      employeeId?: unknown;
    }>(request);

    if (!body) {
      return deps.error(400, "Ожидался JSON.");
    }

    let login: string;
    let password: string;
    let fullName: string;
    let role: UserRole;
    let employeeId: number | null = null;

    try {
      login = parseString(body.login, "login", 3, 60).toLowerCase();
      if (!/^[a-z0-9._-]+$/.test(login)) {
        throw new Error("Логин может содержать только латиницу, цифры, точку, тире и _.");
      }

      password = parseString(body.password, "password", 8, 200);
      fullName = parseString(body.fullName, "fullName", 3, 150);

      if (body.role !== "admin" && body.role !== "employee") {
        throw new Error('Поле "role" должно быть "admin" или "employee".');
      }

      role = body.role;
      if (role === "employee") {
        employeeId = parsePositiveNumber(body.employeeId, "employeeId", { allowZero: false });
        const employeeExists = db
          .query("SELECT 1 FROM employees WHERE id = ? LIMIT 1")
          .get(employeeId);
        if (!employeeExists) {
          throw new Error("Указанный сотрудник не найден.");
        }
      }
    } catch (err) {
      return deps.error(400, (err as Error).message);
    }

    const duplicate = db.query("SELECT 1 FROM users WHERE login = ? LIMIT 1").get(login);
    if (duplicate) {
      return deps.error(409, "Логин уже используется.");
    }

    if (role === "employee" && employeeId !== null) {
      const alreadyLinked = db
        .query("SELECT 1 FROM users WHERE employee_id = ? LIMIT 1")
        .get(employeeId);
      if (alreadyLinked) {
        return deps.error(409, "Для этого сотрудника уже создан пользователь.");
      }
    }

    const passwordHash = await Bun.password.hash(password);

    const created = db
      .query(
        `
        INSERT INTO users(login, full_name, password_hash, role, employee_id)
        VALUES (?, ?, ?, ?, ?)
        RETURNING
          id,
          login,
          full_name AS fullName,
          role,
          employee_id AS employeeId,
          is_active AS isActive,
          (SELECT full_name FROM employees WHERE id = employee_id) AS employeeName
        `
      )
      .get(login, fullName, passwordHash, role, employeeId) as UserSummaryRow | null;

    if (!created) {
      return deps.error(500, "Не удалось создать пользователя.");
    }

    logUserCreated(auth.user, toUserAuditSnapshot(created));

    deps.broadcastRefresh("user_created");
    return deps.json(created, 201);
  }

  const userId = parseUserId(pathname);
  if (userId && request.method === "PATCH") {
    const roleError = requireAdmin(context);
    if (roleError) {
      return roleError;
    }

    const targetUser = db
      .query(
        `
        SELECT
          id,
          login,
          full_name AS fullName,
          role,
          employee_id AS employeeId,
          is_active AS isActive
        FROM users
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(userId) as UserForAuditRow | null;

    if (!targetUser) {
      return deps.error(404, "Пользователь не найден.");
    }

    const body = await deps.readJsonBody<{
      isActive?: unknown;
      password?: unknown;
      employeeId?: unknown;
    }>(request);

    if (!body) {
      return deps.error(400, "Ожидался JSON.");
    }

    const updates: string[] = [];
    const values: SQLQueryBindings[] = [];
    let passwordChanged = false;

    if (typeof body.isActive !== "undefined") {
      if (typeof body.isActive !== "boolean") {
        return deps.error(400, 'Поле "isActive" должно быть boolean.');
      }
      if (userId === auth.user.id && body.isActive === false) {
        return deps.error(400, "Нельзя отключить текущего пользователя.");
      }
      updates.push("is_active = ?");
      values.push(body.isActive ? 1 : 0);
    }

    if (typeof body.password !== "undefined") {
      try {
        const password = parseString(body.password, "password", 8, 200);
        const hash = await Bun.password.hash(password);
        updates.push("password_hash = ?");
        values.push(hash);
        passwordChanged = true;
      } catch (err) {
        return deps.error(400, (err as Error).message);
      }
    }

    if (typeof body.employeeId !== "undefined") {
      if (body.employeeId === null) {
        updates.push("employee_id = ?");
        values.push(null);
      } else {
        let employeeId: number;

        try {
          employeeId = parsePositiveNumber(body.employeeId, "employeeId", { allowZero: false });
          if (!Number.isInteger(employeeId)) {
            throw new Error('Поле "employeeId" должно быть целым числом.');
          }
        } catch (err) {
          return deps.error(400, (err as Error).message);
        }

        if (targetUser.role !== "employee") {
          return deps.error(400, "Привязка к сотруднику доступна только для роли employee.");
        }

        const employeeExists = db
          .query("SELECT 1 FROM employees WHERE id = ? LIMIT 1")
          .get(employeeId);
        if (!employeeExists) {
          return deps.error(400, "Указанный сотрудник не найден.");
        }

        const alreadyLinked = db
          .query("SELECT id FROM users WHERE employee_id = ? AND id != ? LIMIT 1")
          .get(employeeId, userId) as { id: number } | null;

        if (alreadyLinked) {
          return deps.error(409, "Для этого сотрудника уже создан другой пользователь.");
        }

        updates.push("employee_id = ?");
        values.push(employeeId);
      }
    }

    if (updates.length === 0) {
      return deps.error(400, "Нет данных для обновления.");
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(userId);

    const updated = db
      .query(
        `
        UPDATE users
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING
          id,
          login,
          full_name AS fullName,
          role,
          employee_id AS employeeId,
          is_active AS isActive,
          (SELECT full_name FROM employees WHERE id = employee_id) AS employeeName
        `
      )
      .get(...values) as UserSummaryRow | null;

    if (!updated) {
      return deps.error(404, "Пользователь не найден.");
    }

    const changes = collectUserChanges(
      toUserAuditSnapshot(targetUser),
      toUserAuditSnapshot(updated),
      passwordChanged
    );
    logUserUpdated(
      auth.user,
      {
        id: updated.id,
        login: updated.login,
        fullName: updated.fullName,
        role: updated.role
      },
      changes
    );

    deps.broadcastRefresh("user_updated");
    return deps.json(updated);
  }

  if (userId && request.method === "DELETE") {
    const roleError = requireAdmin(context);
    if (roleError) {
      return roleError;
    }

    if (userId === auth.user.id) {
      return deps.error(400, "Нельзя удалить текущего пользователя.");
    }

    const targetUser = db
      .query(
        `
        SELECT
          id,
          login,
          full_name AS fullName,
          role,
          employee_id AS employeeId,
          is_active AS isActive
        FROM users
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(userId) as UserForAuditRow | null;

    if (!targetUser) {
      return deps.error(404, "Пользователь не найден.");
    }

    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);

    const deleted = db
      .query(
        `
        DELETE FROM users
        WHERE id = ?
        RETURNING id
        `
      )
      .get(userId) as { id: number } | null;

    if (!deleted) {
      return deps.error(404, "Пользователь не найден.");
    }

    logUserDeleted(auth.user, toUserAuditSnapshot(targetUser));

    deps.broadcastRefresh("user_deleted");
    return deps.json({
      ok: true,
      deleted: {
        id: targetUser.id,
        login: targetUser.login,
        fullName: targetUser.fullName,
        role: targetUser.role,
        employeeId: targetUser.employeeId
      }
    });
  }

  return null;
}
