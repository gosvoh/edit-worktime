import { db } from "./db";
import type { SessionUser } from "./types";

export interface AuthData {
  token: string;
  user: SessionUser;
}

export function createAuthenticate(getSessionToken: (request: Request) => string | null) {
  function getSessionUser(token: string): SessionUser | null {
    const row = db
      .query(
        `
        SELECT
          u.id,
          u.login,
          u.full_name AS fullName,
          u.role,
          u.employee_id AS employeeId
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
        LIMIT 1
        `
      )
      .get(token, Date.now()) as SessionUser | null;

    return row;
  }

  return function authenticate(request: Request): AuthData | null {
    const token = getSessionToken(request);
    if (!token) {
      return null;
    }
    const user = getSessionUser(token);
    if (!user) {
      return null;
    }
    return { token, user };
  };
}
