import { db, getAppSettings } from "./db";
import { mapEmployeeRow } from "./employees";
import type { AppSettings, EmployeeRecord, UserRole } from "./types";

export type ExportUserRecord = {
  id: number;
  login: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  employeeId: number | null;
  isActive: 0 | 1;
};

export type ExportPayload = {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  employees: EmployeeRecord[];
  users: ExportUserRecord[];
};

type EmployeeRow = {
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

export function buildExportPayload(): ExportPayload {
  const employeesRows = db
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
        y,
        updated_at AS updatedAt
      FROM employees
      ORDER BY id
      `
    )
    .all() as EmployeeRow[];

  const users = db
    .query(
      `
      SELECT
        id,
        login,
        full_name AS fullName,
        password_hash AS passwordHash,
        role,
        employee_id AS employeeId,
        is_active AS isActive
      FROM users
      ORDER BY id
      `
    )
    .all() as ExportUserRecord[];

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getAppSettings(),
    employees: employeesRows.map(mapEmployeeRow),
    users
  };
}
