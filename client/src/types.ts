export type UserRole = "admin" | "employee";

export interface CurrentUser {
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

export interface Employee {
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

export interface LoginResponse {
  ok: boolean;
  expiresAt: number;
  user: CurrentUser;
}

export interface UserSummary {
  id: number;
  login: string;
  fullName: string;
  role: UserRole;
  employeeId: number | null;
  employeeName: string | null;
  isActive: 0 | 1;
}

export interface ExportUserRecord {
  id: number;
  login: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  employeeId: number | null;
  isActive: 0 | 1;
}

export interface ExportPayload {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  employees: Employee[];
  users: ExportUserRecord[];
}
