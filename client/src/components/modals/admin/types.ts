import type { UserRole } from "../../../types";

export type SettingsDraft = {
  baseHoursPerRate: string;
  warningThreshold: string;
};

export type NewEmployeeForm = {
  fullName: string;
  rate: string;
  currentLoadHours: string;
  payPerRate: string;
  hoursPerRate: string;
};

export type NewUserForm = {
  login: string;
  fullName: string;
  password: string;
  role: UserRole;
  employeeId: string;
};
