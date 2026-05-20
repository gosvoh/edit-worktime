export type UserRole = "admin" | "employee";

export interface SessionUser {
  id: number;
  login: string;
  fullName: string;
  role: UserRole;
  employeeId: number | null;
}

export interface AppSettings {
  baseHoursPerRate: number;
  warningThreshold: number;
}

export interface EmployeeRecord {
  id: number;
  fullName: string;
  rate: number;
  currentLoadHours: number;
  payPerRate: number;
  hoursPerRate: number | null;
  x: number;
  y: number;
  updatedAt: string;
}
