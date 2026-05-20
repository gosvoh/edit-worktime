import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { SessionUser, UserRole } from "./types";

type AuditLogTarget = "console" | "file" | "both";
type AuditPrimitive = string | number | boolean | null;
type AuditActor = Pick<SessionUser, "id" | "login" | "fullName" | "role">;

export type AuditFieldChange = {
  from: AuditPrimitive;
  to: AuditPrimitive;
};

export type AuditChange = AuditFieldChange | { changed: true };

export type EmployeeAuditSnapshot = {
  id: number;
  fullName: string;
  rate: number;
  currentLoadHours: number;
  payPerRate: number;
  hoursPerRate: number | null;
  x: number;
  y: number;
};

export type UserAuditSnapshot = {
  id: number;
  login: string;
  fullName: string;
  role: UserRole;
  employeeId: number | null;
  isActive: boolean;
};

export type EmployeeCardAuditPayload = {
  actor: SessionUser;
  employeeId: number;
  employeeFullName: string;
  changes: Record<string, AuditChange>;
};

const AUDIT_LOG_TARGET_RAW = (process.env.AUDIT_LOG_TARGET ?? "console").toLowerCase();
const AUDIT_LOG_TARGET: AuditLogTarget = AUDIT_LOG_TARGET_RAW === "file" || AUDIT_LOG_TARGET_RAW === "both"
  ? AUDIT_LOG_TARGET_RAW
  : "console";
const AUDIT_LOG_FILE = process.env.AUDIT_LOG_FILE ?? "./data/audit.log";

let isAuditFileReady = false;

function shouldWriteToConsole() {
  return AUDIT_LOG_TARGET === "console" || AUDIT_LOG_TARGET === "both";
}

function shouldWriteToFile() {
  return AUDIT_LOG_TARGET === "file" || AUDIT_LOG_TARGET === "both";
}

function ensureAuditFileDirectory() {
  if (isAuditFileReady || !shouldWriteToFile()) {
    return;
  }
  mkdirSync(dirname(AUDIT_LOG_FILE), { recursive: true });
  isAuditFileReady = true;
}

function writeAuditLine(line: string) {
  if (shouldWriteToConsole()) {
    console.log(line);
  }

  if (!shouldWriteToFile()) {
    return;
  }

  try {
    ensureAuditFileDirectory();
    appendFileSync(AUDIT_LOG_FILE, `${line}\n`, "utf8");
  } catch (err) {
    console.error("[AUDIT][write_failed]", err);
  }
}

function toAuditActor(actor: SessionUser): AuditActor {
  return {
    id: actor.id,
    login: actor.login,
    fullName: actor.fullName,
    role: actor.role
  };
}

function writeAuditEntry(event: string, payload: Record<string, unknown>) {
  const entry = {
    at: new Date().toISOString(),
    event,
    ...payload
  };
  writeAuditLine(`[AUDIT] ${JSON.stringify(entry)}`);
}

export function logEmployeeCardUpdated(payload: EmployeeCardAuditPayload) {
  if (Object.keys(payload.changes).length === 0) {
    return;
  }

  writeAuditEntry("employee_card_updated", {
    actor: toAuditActor(payload.actor),
    employee: {
      id: payload.employeeId,
      fullName: payload.employeeFullName
    },
    changes: payload.changes
  });
}

export function logEmployeeCreated(actor: SessionUser, employee: EmployeeAuditSnapshot) {
  writeAuditEntry("employee_created", {
    actor: toAuditActor(actor),
    employee
  });
}

export function logEmployeeDeleted(actor: SessionUser, employee: EmployeeAuditSnapshot) {
  writeAuditEntry("employee_deleted", {
    actor: toAuditActor(actor),
    employee
  });
}

export function logUserCreated(actor: SessionUser, user: UserAuditSnapshot) {
  writeAuditEntry("user_created", {
    actor: toAuditActor(actor),
    user
  });
}

export function logUserUpdated(
  actor: SessionUser,
  user: Pick<UserAuditSnapshot, "id" | "login" | "fullName" | "role">,
  changes: Record<string, AuditChange>
) {
  if (Object.keys(changes).length === 0) {
    return;
  }

  writeAuditEntry("user_updated", {
    actor: toAuditActor(actor),
    user,
    changes
  });
}

export function logUserDeleted(actor: SessionUser, user: UserAuditSnapshot) {
  writeAuditEntry("user_deleted", {
    actor: toAuditActor(actor),
    user
  });
}
