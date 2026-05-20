import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { createContext, useContext } from "react";
import type { NewEmployeeForm, NewUserForm, SettingsDraft } from "../components/modals/admin/types";
import type { PasswordForm } from "../lib/forms";
import type { AppSettings, CurrentUser, Employee, UserSummary } from "../types";

export type AppModalsContextValue = {
  user: CurrentUser;
  settings: AppSettings;
  errorMessage: string | null;
  showAdminModal: boolean;
  showImportModal: boolean;
  showPasswordModal: boolean;
  settingsDraft: SettingsDraft;
  newEmployee: NewEmployeeForm;
  newUser: NewUserForm;
  availableEmployeesForUser: Employee[];
  users: UserSummary[];
  employees: Employee[];
  resetPasswordUserId: number | null;
  newPasswordValue: string;
  importingData: boolean;
  passwordForm: PasswordForm;
  onCloseAdminModal: () => void;
  onCloseImportModal: () => void;
  onClosePasswordModal: () => void;
  onSettingsDraftChange: (patch: Partial<SettingsDraft>) => void;
  onNewEmployeeChange: (patch: Partial<NewEmployeeForm>) => void;
  onNewUserChange: (patch: Partial<NewUserForm>) => void;
  onToggleResetPasswordUser: (userId: number) => void;
  onNewPasswordValueChange: (value: string) => void;
  onUpdateSettings: (event: FormEvent<HTMLFormElement>) => void;
  onCreateEmployee: (event: FormEvent<HTMLFormElement>) => void;
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void;
  onToggleUserActive: (targetUser: UserSummary) => Promise<void>;
  onUnbindUser: (targetUser: UserSummary) => Promise<void>;
  onDeleteUser: (targetUser: UserSummary) => Promise<void>;
  onResetPassword: (userId: number) => Promise<void>;
  onDeleteEmployee: (targetEmployee: Employee) => Promise<void>;
  onExportData: () => Promise<void>;
  onImportFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onPasswordFormChange: (patch: Partial<PasswordForm>) => void;
  onChangeOwnPassword: (event: FormEvent<HTMLFormElement>) => void;
};

const AppModalsContext = createContext<AppModalsContextValue | null>(null);

type AppModalsProviderProps = {
  value: AppModalsContextValue;
  children: ReactNode;
};

export function AppModalsProvider({ value, children }: AppModalsProviderProps) {
  return <AppModalsContext.Provider value={value}>{children}</AppModalsContext.Provider>;
}

export function useAppModalsContext() {
  const context = useContext(AppModalsContext);
  if (!context) {
    throw new Error("useAppModalsContext must be used within AppModalsProvider");
  }
  return context;
}
