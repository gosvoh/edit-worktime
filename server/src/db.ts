import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";
import type { AppSettings } from "./types";

const DEFAULT_BASE_HOURS_PER_RATE = 1500;
const DEFAULT_WARNING_THRESHOLD = 0.9;

const dbPath = process.env.DB_PATH ?? "./data/worktime.sqlite";
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

function runMigrations() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      rate REAL NOT NULL,
      current_load_hours REAL NOT NULL DEFAULT 0,
      pay_per_rate REAL NOT NULL DEFAULT 0,
      hours_per_rate REAL,
      x REAL NOT NULL DEFAULT 120,
      y REAL NOT NULL DEFAULT 120,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
      employee_id INTEGER UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);
}

function seedSettings() {
  const upsert = db.prepare(`
    INSERT INTO settings(key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const hasBaseHours = db
    .query("SELECT 1 FROM settings WHERE key = 'base_hours_per_rate' LIMIT 1")
    .get();
  const hasWarning = db
    .query("SELECT 1 FROM settings WHERE key = 'warning_threshold' LIMIT 1")
    .get();

  if (!hasBaseHours) {
    upsert.run("base_hours_per_rate", String(DEFAULT_BASE_HOURS_PER_RATE));
  }

  if (!hasWarning) {
    upsert.run("warning_threshold", String(DEFAULT_WARNING_THRESHOLD));
  }
}

function seedEmployees() {
  const employeesCountRow = db
    .query("SELECT COUNT(*) as count FROM employees")
    .get() as { count: number } | null;
  const employeesCount = Number(employeesCountRow?.count ?? 0);

  if (employeesCount > 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO employees(full_name, rate, current_load_hours, pay_per_rate, hours_per_rate, x, y)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run("Иванов Иван Иванович", 1, 1200, 180000, null, 120, 120);
  insert.run("Петрова Анна Сергеевна", 0.5, 680, 140000, null, 520, 120);
  insert.run("Сидоров Максим Олегович", 0.25, 420, 120000, null, 920, 120);
}

async function seedUsers() {
  const adminExists = db
    .query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1")
    .get();
  if (!adminExists) {
    const adminLogin = (process.env.ADMIN_LOGIN ?? "admin").trim();
    const adminPassword = (process.env.ADMIN_PASSWORD ?? "admin12345").trim();
    const adminHash = await Bun.password.hash(adminPassword);
    db.prepare(
      `
      INSERT INTO users(login, full_name, password_hash, role, employee_id)
      VALUES (?, ?, ?, 'admin', NULL)
      `
    ).run(adminLogin, "Администратор", adminHash);
  }

  const employeeExists = db
    .query("SELECT 1 FROM users WHERE role = 'employee' LIMIT 1")
    .get();
  if (!employeeExists) {
    const firstEmployee = db
      .query("SELECT id, full_name FROM employees ORDER BY id LIMIT 1")
      .get() as { id: number; full_name: string } | null;
    if (firstEmployee) {
      const employeeLogin = (process.env.EMPLOYEE_LOGIN ?? "employee1").trim();
      const employeePassword = (process.env.EMPLOYEE_PASSWORD ?? "employee12345").trim();
      const employeeHash = await Bun.password.hash(employeePassword);
      db.prepare(
        `
        INSERT INTO users(login, full_name, password_hash, role, employee_id)
        VALUES (?, ?, ?, 'employee', ?)
        `
      ).run(employeeLogin, firstEmployee.full_name, employeeHash, firstEmployee.id);
    }
  }
}

export async function initDb() {
  runMigrations();
  seedSettings();
  seedEmployees();
  await seedUsers();
}

export function getAppSettings(): AppSettings {
  const rows = db.query("SELECT key, value FROM settings").all() as Array<{
    key: string;
    value: string;
  }>;
  const map = new Map(rows.map((row) => [row.key, row.value]));

  const parsedBase = Number(map.get("base_hours_per_rate"));
  const parsedThreshold = Number(map.get("warning_threshold"));

  return {
    baseHoursPerRate: Number.isFinite(parsedBase) && parsedBase > 0
      ? parsedBase
      : DEFAULT_BASE_HOURS_PER_RATE,
    warningThreshold: Number.isFinite(parsedThreshold) && parsedThreshold > 0 && parsedThreshold < 1
      ? parsedThreshold
      : DEFAULT_WARNING_THRESHOLD
  };
}

export function updateAppSettings(input: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const next: AppSettings = {
    baseHoursPerRate: input.baseHoursPerRate ?? current.baseHoursPerRate,
    warningThreshold: input.warningThreshold ?? current.warningThreshold
  };

  db.transaction(() => {
    db.prepare(
      `
      INSERT INTO settings(key, value)
      VALUES ('base_hours_per_rate', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `
    ).run(String(next.baseHoursPerRate));

    db.prepare(
      `
      INSERT INTO settings(key, value)
      VALUES ('warning_threshold', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `
    ).run(String(next.warningThreshold));
  })();

  return next;
}
