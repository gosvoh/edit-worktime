import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction
} from "react";
import { api } from "../api";
import type { NewEmployeeForm, NewUserForm, SettingsDraft } from "../components/modals/admin/types";
import { parseInputNumber } from "../lib/board";
import { normalizeApiError } from "../lib/errors";
import {
  createInitialNewEmployeeForm,
  createInitialNewUserForm,
  createInitialSettingsDraft
} from "../lib/forms";
import type { AppSettings, CurrentUser, Employee, ExportPayload, UserSummary } from "../types";

type UseAdminActionsParams = {
  isAuthenticated: boolean;
  user: CurrentUser | null;
  employees: Employee[];
  users: UserSummary[];
  settings: AppSettings | null;
  setSettings: Dispatch<SetStateAction<AppSettings | null>>;
  setEmployees: Dispatch<SetStateAction<Employee[]>>;
  setUsers: Dispatch<SetStateAction<UserSummary[]>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  bootstrap: (withSpinner: boolean) => Promise<void>;
};

export function useAdminActions({
  isAuthenticated,
  user,
  employees,
  users,
  settings,
  setSettings,
  setEmployees,
  setUsers,
  setErrorMessage,
  bootstrap
}: UseAdminActionsParams) {
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>(createInitialNewEmployeeForm);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(createInitialSettingsDraft);
  const [newUser, setNewUser] = useState<NewUserForm>(createInitialNewUserForm);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [importingData, setImportingData] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }
    setSettingsDraft({
      baseHoursPerRate: String(settings.baseHoursPerRate),
      warningThreshold: String(settings.warningThreshold)
    });
  }, [settings?.baseHoursPerRate, settings?.warningThreshold]);

  const availableEmployeesForUser = useMemo(() => {
    const occupied = new Set(
      users
        .filter((item) => item.role === "employee" && item.employeeId !== null)
        .map((item) => item.employeeId as number)
    );
    return employees.filter((employee) => !occupied.has(employee.id));
  }, [employees, users]);

  const onSettingsDraftChange = useCallback((patch: Partial<SettingsDraft>) => {
    setSettingsDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const onNewEmployeeChange = useCallback((patch: Partial<NewEmployeeForm>) => {
    setNewEmployee((prev) => ({ ...prev, ...patch }));
  }, []);

  const onNewUserChange = useCallback((patch: Partial<NewUserForm>) => {
    setNewUser((prev) => ({ ...prev, ...patch }));
  }, []);

  const onNewPasswordValueChange = useCallback((value: string) => {
    setNewPasswordValue(value);
  }, []);

  const onCreateEmployee = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated || user?.role !== "admin") {
      return;
    }

    const rate = parseInputNumber(newEmployee.rate);
    const currentLoadHours = parseInputNumber(newEmployee.currentLoadHours);
    const payPerRate = parseInputNumber(newEmployee.payPerRate);
    const customHoursPerRate = newEmployee.hoursPerRate.trim().length > 0
      ? parseInputNumber(newEmployee.hoursPerRate)
      : null;

    if (!newEmployee.fullName.trim()) {
      setErrorMessage("Укажите ФИО сотрудника.");
      return;
    }
    if (rate === null || rate <= 0) {
      setErrorMessage("Ставка должна быть больше 0.");
      return;
    }
    if (currentLoadHours === null || currentLoadHours < 0) {
      setErrorMessage("Нагрузка должна быть числом >= 0.");
      return;
    }
    if (payPerRate === null || payPerRate < 0) {
      setErrorMessage("Оплата должна быть числом >= 0.");
      return;
    }
    if (customHoursPerRate !== null && customHoursPerRate <= 0) {
      setErrorMessage("Часы на ставку должны быть больше 0.");
      return;
    }

    const index = employees.length;
    const x = 120 + (index % 6) * 380;
    const y = 120 + Math.floor(index / 6) * 280;

    try {
      const created = await api.createEmployee({
        fullName: newEmployee.fullName.trim(),
        rate,
        currentLoadHours,
        payPerRate,
        hoursPerRate: customHoursPerRate,
        x,
        y
      });
      setEmployees((prev) => [...prev, created]);
      setNewEmployee(createInitialNewEmployeeForm());
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, user, newEmployee, employees.length, setEmployees, setErrorMessage]);

  const onUpdateSettings = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated || user?.role !== "admin") {
      return;
    }

    const baseHoursPerRate = parseInputNumber(settingsDraft.baseHoursPerRate);
    const warningThreshold = parseInputNumber(settingsDraft.warningThreshold);

    if (baseHoursPerRate === null || baseHoursPerRate <= 0) {
      setErrorMessage("Базовые часы должны быть > 0.");
      return;
    }
    if (warningThreshold === null || warningThreshold <= 0 || warningThreshold >= 1) {
      setErrorMessage("Порог предупреждения должен быть в диапазоне 0..1.");
      return;
    }

    try {
      const updated = await api.updateSettings({ baseHoursPerRate, warningThreshold });
      setSettings(updated);
      setSettingsDraft({
        baseHoursPerRate: String(updated.baseHoursPerRate),
        warningThreshold: String(updated.warningThreshold)
      });
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, user, settingsDraft, setSettings, setErrorMessage]);

  const onCreateUser = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated || user?.role !== "admin") {
      return;
    }

    const role = newUser.role;
    const employeeId = role === "employee" ? parseInputNumber(newUser.employeeId) : null;

    if (!newUser.login.trim() || !newUser.fullName.trim() || !newUser.password) {
      setErrorMessage("Заполните логин, ФИО и пароль пользователя.");
      return;
    }
    if (newUser.password.length < 8) {
      setErrorMessage("Пароль должен содержать минимум 8 символов.");
      return;
    }
    if (role === "employee" && (employeeId === null || employeeId <= 0)) {
      setErrorMessage("Выберите сотрудника для пользователя employee.");
      return;
    }

    try {
      const created = await api.createUser({
        login: newUser.login.trim().toLowerCase(),
        fullName: newUser.fullName.trim(),
        password: newUser.password,
        role,
        employeeId: role === "employee" ? employeeId : null
      });
      setUsers((prev) => [...prev, created]);
      setNewUser(createInitialNewUserForm());
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, user, newUser, setUsers, setErrorMessage]);

  const onToggleUserActive = useCallback(async (targetUser: UserSummary) => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const updated = await api.patchUser(targetUser.id, { isActive: targetUser.isActive === 0 });
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, setUsers, setErrorMessage]);

  const onUnbindUser = useCallback(async (targetUser: UserSummary) => {
    if (!isAuthenticated || user?.role !== "admin") {
      return;
    }
    if (targetUser.role !== "employee" || targetUser.employeeId === null) {
      return;
    }

    const confirmed = window.confirm(
      `Снять привязку пользователя @${targetUser.login} от сотрудника "${targetUser.employeeName ?? "неизвестно"}"?`
    );
    if (!confirmed) {
      return;
    }

    try {
      const updated = await api.patchUser(targetUser.id, { employeeId: null });
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, user, setUsers, setErrorMessage]);

  const onDeleteUser = useCallback(async (targetUser: UserSummary) => {
    if (!isAuthenticated || !user || user.role !== "admin") {
      return;
    }
    if (targetUser.id === user.id) {
      setErrorMessage("Нельзя удалить текущего пользователя.");
      return;
    }

    const code = targetUser.login;
    const typed = window.prompt(
      `Для удаления пользователя "${targetUser.fullName}" введите его логин: ${code}`
    );
    if (typed !== code) {
      return;
    }

    const confirmed = window.confirm(
      `Подтвердите удаление пользователя @${targetUser.login}. Это действие нельзя отменить.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((item) => item.id !== targetUser.id));
      setResetPasswordUserId((prev) => (prev === targetUser.id ? null : prev));
      setNewPasswordValue("");
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, user, setUsers, setErrorMessage]);

  const onResetPassword = useCallback(async (userId: number) => {
    if (!isAuthenticated || !newPasswordValue.trim()) {
      return;
    }
    if (newPasswordValue.trim().length < 8) {
      setErrorMessage("Новый пароль должен содержать минимум 8 символов.");
      return;
    }

    try {
      await api.patchUser(userId, { password: newPasswordValue.trim() });
      setResetPasswordUserId(null);
      setNewPasswordValue("");
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, newPasswordValue, setErrorMessage]);

  const onToggleResetPasswordUser = useCallback((userId: number) => {
    setResetPasswordUserId((prev) => (prev === userId ? null : userId));
    setNewPasswordValue("");
  }, []);

  const onDeleteEmployee = useCallback(async (targetEmployee: Employee) => {
    if (!isAuthenticated || user?.role !== "admin") {
      return;
    }

    const code = `${targetEmployee.id}`;
    const typed = window.prompt(
      `Для удаления сотрудника "${targetEmployee.fullName}" введите его ID: ${code}`
    );
    if (typed !== code) {
      return;
    }

    const confirmed = window.confirm(
      `Подтвердите удаление сотрудника "${targetEmployee.fullName}". Это действие нельзя отменить.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteEmployee(targetEmployee.id);
      setEmployees((prev) => prev.filter((employee) => employee.id !== targetEmployee.id));
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, user, setEmployees, setErrorMessage]);

  const onExportData = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "admin") {
      return;
    }

    try {
      const payload = await api.exportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      link.href = url;
      link.download = `worktime-export-${date}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, user, setErrorMessage]);

  const onImportFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !isAuthenticated || user?.role !== "admin") {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text) as ExportPayload;

      if (!window.confirm("Импорт заменит текущих сотрудников, пользователей и настройки. Продолжить?")) {
        return;
      }

      setImportingData(true);
      await api.importData(payload);
      await bootstrap(true);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    } finally {
      setImportingData(false);
    }
  }, [isAuthenticated, user, bootstrap, setErrorMessage]);

  const resetAdminModalTransientState = useCallback(() => {
    setResetPasswordUserId(null);
    setNewPasswordValue("");
  }, []);

  return {
    settingsDraft,
    newEmployee,
    newUser,
    availableEmployeesForUser,
    resetPasswordUserId,
    newPasswordValue,
    importingData,
    onSettingsDraftChange,
    onNewEmployeeChange,
    onNewUserChange,
    onNewPasswordValueChange,
    onUpdateSettings,
    onCreateEmployee,
    onCreateUser,
    onToggleUserActive,
    onUnbindUser,
    onDeleteUser,
    onResetPassword,
    onToggleResetPasswordUser,
    onDeleteEmployee,
    onExportData,
    onImportFileChange,
    resetAdminModalTransientState
  };
}
