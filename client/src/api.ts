import type {
  AppSettings,
  CurrentUser,
  Employee,
  ExportPayload,
  LoginResponse,
  UserSummary,
  UserRole
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    let message = `Ошибка HTTP ${response.status}`;
    try {
      const payload = await response.json() as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return await response.json() as T;
}

export const api = {
  login(login: string, password: string) {
    return request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password })
    });
  },

  me() {
    return request<{ user: CurrentUser; settings: AppSettings }>("/api/auth/me", { method: "GET" });
  },

  logout() {
    return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  },

  changeOwnPassword(currentPassword: string, newPassword: string) {
    return request<{ ok: boolean }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  getSettings() {
    return request<AppSettings>("/api/settings", { method: "GET" });
  },

  updateSettings(payload: Partial<AppSettings>) {
    return request<AppSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },

  listEmployees() {
    return request<Employee[]>("/api/employees", { method: "GET" });
  },

  createEmployee(
    payload: {
      fullName: string;
      rate: number;
      currentLoadHours: number;
      payPerRate: number;
      hoursPerRate: number | null;
      x?: number;
      y?: number;
    }
  ) {
    return request<Employee>("/api/employees", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  patchEmployee(
    employeeId: number,
    payload: Partial<{
      fullName: string;
      rate: number;
      currentLoadHours: number;
      payPerRate: number;
      hoursPerRate: number | null;
      x: number;
      y: number;
    }>
  ) {
    return request<Employee>(`/api/employees/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  deleteEmployee(employeeId: number) {
    return request<{ ok: boolean; deleted: { id: number; fullName: string } }>(`/api/employees/${employeeId}`, {
      method: "DELETE"
    });
  },

  listUsers() {
    return request<UserSummary[]>("/api/users", { method: "GET" });
  },

  createUser(
    payload: {
      login: string;
      password: string;
      fullName: string;
      role: UserRole;
      employeeId: number | null;
    }
  ) {
    return request<UserSummary>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  patchUser(
    userId: number,
    payload: Partial<{
      isActive: boolean;
      password: string;
      employeeId: number | null;
    }>
  ) {
    return request<UserSummary>(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  deleteUser(userId: number) {
    return request<{ ok: boolean; deleted: { id: number; login: string; fullName: string } }>(
      `/api/users/${userId}`,
      {
        method: "DELETE"
      }
    );
  },

  exportData() {
    return request<ExportPayload>("/api/export", { method: "GET" });
  },

  importData(payload: ExportPayload) {
    return request<{ ok: boolean }>("/api/import", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

export { ApiError };
