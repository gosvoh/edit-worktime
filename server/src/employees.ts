import { db } from "./db";
import type { EmployeeRecord, SessionUser } from "./types";

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

export function mapEmployeeRow(row: EmployeeRow): EmployeeRecord {
  return {
    id: row.id,
    fullName: row.fullName,
    rate: Number(row.rate),
    currentLoadHours: Number(row.currentLoadHours),
    payPerRate: Number(row.payPerRate),
    hoursPerRate: row.hoursPerRate === null ? null : Number(row.hoursPerRate),
    x: Number.isFinite(Number(row.x)) ? Number(row.x) : 100,
    y: Number.isFinite(Number(row.y)) ? Number(row.y) : 100,
    updatedAt: row.updatedAt
  };
}

export function listEmployeesForUser(user: SessionUser): EmployeeRecord[] {
  if (user.role === "admin") {
    const rows = db
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
        ORDER BY full_name
        `
      )
      .all() as EmployeeRow[];
    return rows.map(mapEmployeeRow);
  }

  if (!user.employeeId) {
    return [];
  }

  const row = db
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
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(user.employeeId) as EmployeeRow | null;

  return row ? [mapEmployeeRow(row)] : [];
}
