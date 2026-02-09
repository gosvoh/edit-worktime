import type { NewEmployeeForm, NewUserForm, SettingsDraft } from "../components/modals/admin/types";

export type LoginForm = {
  login: string;
  password: string;
};

export type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function createInitialLoginForm(): LoginForm {
  return {
    login: "admin",
    password: "admin12345"
  };
}

export function createInitialNewEmployeeForm(): NewEmployeeForm {
  return {
    fullName: "",
    rate: "1",
    currentLoadHours: "0",
    payPerRate: "0",
    hoursPerRate: ""
  };
}

export function createInitialSettingsDraft(): SettingsDraft {
  return {
    baseHoursPerRate: "1500",
    warningThreshold: "0.9"
  };
}

export function createInitialNewUserForm(): NewUserForm {
  return {
    login: "",
    fullName: "",
    password: "",
    role: "employee",
    employeeId: ""
  };
}

export function createInitialPasswordForm(): PasswordForm {
  return {
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  };
}
