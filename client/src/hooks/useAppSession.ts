import { useCallback, useRef, useState } from "react";
import { ApiError, api } from "../api";
import { normalizeApiError } from "../lib/errors";
import type { AppSettings, CurrentUser, Employee, UserSummary } from "../types";

export function useAppSession() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasAutoCenteredRef = useRef(false);

  const clearSessionState = useCallback(() => {
    setIsAuthenticated(false);
    hasAutoCenteredRef.current = false;
    setUser(null);
    setSettings(null);
    setEmployees([]);
    setUsers([]);
    setErrorMessage(null);
  }, []);

  const bootstrap = useCallback(async (withSpinner: boolean) => {
    if (withSpinner) {
      setLoading(true);
    }

    try {
      const me = await api.me();
      setIsAuthenticated(true);
      setUser(me.user);
      setSettings(me.settings);

      const employeesDataPromise = api.listEmployees();
      const usersDataPromise = me.user.role === "admin"
        ? api.listUsers()
        : Promise.resolve([] as UserSummary[]);

      const [employeesData, usersData] = await Promise.all([employeesDataPromise, usersDataPromise]);
      setEmployees(employeesData);
      setUsers(usersData);
      setErrorMessage(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSessionState();
      } else {
        setErrorMessage(normalizeApiError(err));
      }
    } finally {
      if (withSpinner) {
        setLoading(false);
      }
    }
  }, [clearSessionState]);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    await bootstrap(false);
  }, [isAuthenticated, bootstrap]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore network errors on logout
    }
    clearSessionState();
  }, [clearSessionState]);

  return {
    isAuthenticated,
    user,
    settings,
    employees,
    users,
    loading,
    errorMessage,
    hasAutoCenteredRef,
    setSettings,
    setEmployees,
    setUsers,
    setLoading,
    setErrorMessage,
    bootstrap,
    refreshData,
    logout
  };
}
