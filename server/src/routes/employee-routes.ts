import type { SQLQueryBindings } from "bun:sqlite";
import {
  logEmployeeCardUpdated,
  logEmployeeCreated,
  logEmployeeDeleted,
  type AuditFieldChange,
  type EmployeeAuditSnapshot
} from "../audit";
import { db } from "../db";
import { listEmployeesForUser, mapEmployeeRow } from "../employees";
import { parseEmployeeId } from "../path-parsers";
import { parsePositiveNumber, parseString } from "../validation";
import { requireAdmin, type AuthedRouteContext } from "../api-types";

type EmployeeForAudit = EmployeeAuditSnapshot;

const EMPLOYEE_AUDIT_FIELDS: Array<keyof EmployeeForAudit> = [
  "fullName",
  "rate",
  "currentLoadHours",
  "payPerRate",
  "hoursPerRate",
  "x",
  "y"
];

function collectEmployeeChanges(
  previous: EmployeeForAudit,
  current: EmployeeForAudit
): Record<string, AuditFieldChange> {
  const changes: Record<string, AuditFieldChange> = {};

  for (const field of EMPLOYEE_AUDIT_FIELDS) {
    if (previous[field] === current[field]) {
      continue;
    }
    changes[field] = {
      from: previous[field],
      to: current[field]
    };
  }

  return changes;
}

export async function handleEmployeeRoutes(
  context: AuthedRouteContext
): Promise<Response | null> {
  const { request, pathname, deps } = context;

  if (pathname === "/api/employees" && request.method === "GET") {
    return deps.json(listEmployeesForUser(context.auth.user));
  }

  if (pathname === "/api/employees" && request.method === "POST") {
    const roleError = requireAdmin(context);
    if (roleError) {
      return roleError;
    }

    const body = await deps.readJsonBody<{
      fullName?: unknown;
      rate?: unknown;
      currentLoadHours?: unknown;
      payPerRate?: unknown;
      hoursPerRate?: unknown;
      x?: unknown;
      y?: unknown;
    }>(request);

    if (!body) {
      return deps.error(400, "Ожидался JSON.");
    }

    try {
      const fullName = parseString(body.fullName, "fullName", 3, 150);
      const rate = parsePositiveNumber(body.rate, "rate");
      const currentLoadHours = typeof body.currentLoadHours === "undefined"
        ? 0
        : parsePositiveNumber(body.currentLoadHours, "currentLoadHours", { allowZero: true });
      const payPerRate = typeof body.payPerRate === "undefined"
        ? 0
        : parsePositiveNumber(body.payPerRate, "payPerRate", { allowZero: true });
      const hoursPerRate = body.hoursPerRate === null || typeof body.hoursPerRate === "undefined"
        ? null
        : parsePositiveNumber(body.hoursPerRate, "hoursPerRate");
      const x = typeof body.x === "undefined"
        ? 120
        : deps.clampPosition(parsePositiveNumber(body.x, "x", { allowZero: true }));
      const y = typeof body.y === "undefined"
        ? 120
        : deps.clampPosition(parsePositiveNumber(body.y, "y", { allowZero: true }));

      const result = db
        .query(
          `
          INSERT INTO employees(full_name, rate, current_load_hours, pay_per_rate, hours_per_rate, x, y, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          RETURNING
            id,
            full_name AS fullName,
            rate,
            current_load_hours AS currentLoadHours,
            pay_per_rate AS payPerRate,
            hours_per_rate AS hoursPerRate,
            x,
            y,
            updated_at AS updatedAt
          `
        )
        .get(fullName, rate, currentLoadHours, payPerRate, hoursPerRate, x, y) as {
        id: number;
        fullName: string;
        rate: number;
        currentLoadHours: number;
        payPerRate: number;
        hoursPerRate: number | null;
        x: number;
        y: number;
        updatedAt: string;
      };

      logEmployeeCreated(context.auth.user, {
        id: result.id,
        fullName: result.fullName,
        rate: result.rate,
        currentLoadHours: result.currentLoadHours,
        payPerRate: result.payPerRate,
        hoursPerRate: result.hoursPerRate,
        x: result.x,
        y: result.y
      });

      deps.broadcastRefresh("employee_created");
      return deps.json(mapEmployeeRow(result), 201);
    } catch (err) {
      return deps.error(400, (err as Error).message);
    }
  }

  const employeeId = parseEmployeeId(pathname);
  if (employeeId && request.method === "PATCH") {
    const roleError = requireAdmin(context);
    if (roleError) {
      return roleError;
    }

    const body = await deps.readJsonBody<{
      fullName?: unknown;
      rate?: unknown;
      currentLoadHours?: unknown;
      payPerRate?: unknown;
      hoursPerRate?: unknown;
      x?: unknown;
      y?: unknown;
    }>(request);

    if (!body) {
      return deps.error(400, "Ожидался JSON.");
    }

    const updates: string[] = [];
    const values: SQLQueryBindings[] = [];

    try {
      if (typeof body.fullName !== "undefined") {
        updates.push("full_name = ?");
        values.push(parseString(body.fullName, "fullName", 3, 150));
      }
      if (typeof body.rate !== "undefined") {
        updates.push("rate = ?");
        values.push(parsePositiveNumber(body.rate, "rate"));
      }
      if (typeof body.currentLoadHours !== "undefined") {
        updates.push("current_load_hours = ?");
        values.push(
          parsePositiveNumber(body.currentLoadHours, "currentLoadHours", { allowZero: true })
        );
      }
      if (typeof body.payPerRate !== "undefined") {
        updates.push("pay_per_rate = ?");
        values.push(parsePositiveNumber(body.payPerRate, "payPerRate", { allowZero: true }));
      }
      if (typeof body.hoursPerRate !== "undefined") {
        updates.push("hours_per_rate = ?");
        if (body.hoursPerRate === null) {
          values.push(null);
        } else {
          values.push(parsePositiveNumber(body.hoursPerRate, "hoursPerRate"));
        }
      }
      if (typeof body.x !== "undefined") {
        updates.push("x = ?");
        values.push(
          deps.clampPosition(parsePositiveNumber(body.x, "x", { allowZero: true }))
        );
      }
      if (typeof body.y !== "undefined") {
        updates.push("y = ?");
        values.push(
          deps.clampPosition(parsePositiveNumber(body.y, "y", { allowZero: true }))
        );
      }
    } catch (err) {
      return deps.error(400, (err as Error).message);
    }

    if (updates.length === 0) {
      return deps.error(400, "Нет данных для обновления.");
    }

    const previous = db
      .query(
        `
        SELECT
          id,
          full_name AS fullName,
          rate,
          current_load_hours AS currentLoadHours,
          pay_per_rate AS payPerRate,
          hours_per_rate AS hoursPerRate,
          x,
          y
        FROM employees
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(employeeId) as EmployeeForAudit | null;

    if (!previous) {
      return deps.error(404, "Сотрудник не найден.");
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(employeeId);

    const result = db
      .query(
        `
        UPDATE employees
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING
          id,
          full_name AS fullName,
          rate,
          current_load_hours AS currentLoadHours,
          pay_per_rate AS payPerRate,
          hours_per_rate AS hoursPerRate,
          x,
          y,
          updated_at AS updatedAt
        `
      )
      .get(...values) as {
      id: number;
      fullName: string;
      rate: number;
      currentLoadHours: number;
      payPerRate: number;
      hoursPerRate: number | null;
      x: number;
      y: number;
      updatedAt: string;
    } | null;

    if (!result) {
      return deps.error(404, "Сотрудник не найден.");
    }

    const changes = collectEmployeeChanges(previous, result);
    logEmployeeCardUpdated({
      actor: context.auth.user,
      employeeId: result.id,
      employeeFullName: result.fullName,
      changes
    });

    deps.broadcastRefresh("employee_updated");
    return deps.json(mapEmployeeRow(result));
  }

  if (employeeId && request.method === "DELETE") {
    const roleError = requireAdmin(context);
    if (roleError) {
      return roleError;
    }

    const linkedUser = db
      .query(
        `
        SELECT id, login
        FROM users
        WHERE employee_id = ?
        LIMIT 1
        `
      )
      .get(employeeId) as { id: number; login: string } | null;

    if (linkedUser) {
      return deps.error(
        409,
        `Нельзя удалить сотрудника: он привязан к пользователю ${linkedUser.login}. Сначала удалите или перепривяжите пользователя.`
      );
    }

    const deleted = db
      .query(
        `
        DELETE FROM employees
        WHERE id = ?
        RETURNING
          id,
          full_name AS fullName,
          rate,
          current_load_hours AS currentLoadHours,
          pay_per_rate AS payPerRate,
          hours_per_rate AS hoursPerRate,
          x,
          y
        `
      )
      .get(employeeId) as EmployeeForAudit | null;

    if (!deleted) {
      return deps.error(404, "Сотрудник не найден.");
    }

    logEmployeeDeleted(context.auth.user, deleted);

    deps.broadcastRefresh("employee_deleted");
    return deps.json({ ok: true, deleted });
  }

  return null;
}
