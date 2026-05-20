import { db } from "./db";
import type { ExportPayload, ExportUserRecord } from "./export";
import type { AppSettings, EmployeeRecord, UserRole } from "./types";
import { parsePositiveNumber, parseString } from "./validation";

const MAX_COORD = 50000;

function clampPosition(value: number) {
  return Math.min(Math.max(value, 0), MAX_COORD);
}
export async function importPayload(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new Error("Некорректный формат импорта.");
  }

  const payload = rawPayload as Partial<ExportPayload>;
  if (!payload.settings || typeof payload.settings !== "object") {
    throw new Error("В импортируемом файле нет блока settings.");
  }
  if (!Array.isArray(payload.employees)) {
    throw new Error("В импортируемом файле нет массива employees.");
  }
  if (!Array.isArray(payload.users)) {
    throw new Error("В импортируемом файле нет массива users.");
  }
  const employeesInput = payload.employees;
  const usersInput = payload.users;

  const settings = payload.settings as Partial<AppSettings>;
  const normalizedSettings: AppSettings = {
    baseHoursPerRate: parsePositiveNumber(settings.baseHoursPerRate, "settings.baseHoursPerRate"),
    warningThreshold: parsePositiveNumber(settings.warningThreshold, "settings.warningThreshold", {
      min: 0.01,
      max: 0.99
    })
  };

  const employeeIds = new Set<number>();
  const normalizedEmployees = employeesInput.map((employee, index) => {
    if (!employee || typeof employee !== "object") {
      throw new Error(`employees[${index}] имеет некорректный формат.`);
    }
    const row = employee as Partial<EmployeeRecord>;
    const id = parsePositiveNumber(row.id, `employees[${index}].id`, { allowZero: false });
    if (!Number.isInteger(id)) {
      throw new Error(`employees[${index}].id должен быть целым числом.`);
    }
    if (employeeIds.has(id)) {
      throw new Error(`Дублирующийся employees.id: ${id}`);
    }
    employeeIds.add(id);

    return {
      id,
      fullName: parseString(row.fullName, `employees[${index}].fullName`, 3, 150),
      rate: parsePositiveNumber(row.rate, `employees[${index}].rate`),
      currentLoadHours: parsePositiveNumber(
        row.currentLoadHours,
        `employees[${index}].currentLoadHours`,
        { allowZero: true }
      ),
      payPerRate: parsePositiveNumber(row.payPerRate, `employees[${index}].payPerRate`, {
        allowZero: true
      }),
      hoursPerRate: row.hoursPerRate === null || typeof row.hoursPerRate === "undefined"
        ? null
        : parsePositiveNumber(row.hoursPerRate, `employees[${index}].hoursPerRate`),
      x: clampPosition(parsePositiveNumber(row.x, `employees[${index}].x`, { allowZero: true })),
      y: clampPosition(parsePositiveNumber(row.y, `employees[${index}].y`, { allowZero: true }))
    };
  });

  const logins = new Set<string>();
  const normalizedUsers: Array<{
    login: string;
    fullName: string;
    passwordHash: string;
    role: UserRole;
    employeeId: number | null;
    isActive: 0 | 1;
  }> = [];

  for (let index = 0; index < usersInput.length; index += 1) {
    const item = usersInput[index];
    if (!item || typeof item !== "object") {
      throw new Error(`users[${index}] имеет некорректный формат.`);
    }
    const row = item as Partial<ExportUserRecord> & { password?: unknown };

    const login = parseString(row.login, `users[${index}].login`, 3, 60).toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(login)) {
      throw new Error(`users[${index}].login содержит недопустимые символы.`);
    }
    if (logins.has(login)) {
      throw new Error(`Дублирующийся users.login: ${login}`);
    }
    logins.add(login);

    const fullName = parseString(row.fullName, `users[${index}].fullName`, 3, 150);

    if (row.role !== "admin" && row.role !== "employee") {
      throw new Error(`users[${index}].role должен быть "admin" или "employee".`);
    }
    const role = row.role;

    let employeeId: number | null = null;
    if (role === "employee") {
      employeeId = parsePositiveNumber(row.employeeId, `users[${index}].employeeId`, { allowZero: false });
      if (!Number.isInteger(employeeId) || !employeeIds.has(employeeId)) {
        throw new Error(`users[${index}].employeeId не найден в employees.`);
      }
    }

    let passwordHash: string | null = null;
    if (typeof row.passwordHash === "string" && row.passwordHash.trim().length > 10) {
      passwordHash = row.passwordHash.trim();
    } else if (typeof row.password === "string" && row.password.trim().length >= 8) {
      passwordHash = await Bun.password.hash(row.password.trim());
    }

    if (!passwordHash) {
      throw new Error(`users[${index}] не содержит passwordHash или валидный password.`);
    }

    let isActive: 0 | 1 = 1;
    if (typeof row.isActive === "number") {
      isActive = row.isActive === 0 ? 0 : 1;
    }

    normalizedUsers.push({
      login,
      fullName,
      passwordHash,
      role,
      employeeId,
      isActive
    });
  }

  if (!normalizedUsers.some((user) => user.role === "admin")) {
    throw new Error("После импорта должен существовать хотя бы один администратор.");
  }

  db.transaction(() => {
    db.prepare("DELETE FROM sessions").run();
    db.prepare("DELETE FROM users").run();
    db.prepare("DELETE FROM employees").run();
    db.prepare(
      `
      INSERT INTO settings(key, value)
      VALUES ('base_hours_per_rate', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `
    ).run(String(normalizedSettings.baseHoursPerRate));
    db.prepare(
      `
      INSERT INTO settings(key, value)
      VALUES ('warning_threshold', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `
    ).run(String(normalizedSettings.warningThreshold));

    const insertEmployee = db.prepare(
      `
      INSERT INTO employees(id, full_name, rate, current_load_hours, pay_per_rate, hours_per_rate, x, y, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
    );

    for (const employee of normalizedEmployees) {
      insertEmployee.run(
        employee.id,
        employee.fullName,
        employee.rate,
        employee.currentLoadHours,
        employee.payPerRate,
        employee.hoursPerRate,
        employee.x,
        employee.y
      );
    }

    if (normalizedEmployees.length > 0) {
      const maxEmployeeId = normalizedEmployees.reduce((acc, employee) => Math.max(acc, employee.id), 0);
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'employees'").run();
      db.prepare("INSERT INTO sqlite_sequence(name, seq) VALUES ('employees', ?)").run(maxEmployeeId);
    }

    const insertUser = db.prepare(
      `
      INSERT INTO users(login, full_name, password_hash, role, employee_id, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
    );

    for (const user of normalizedUsers) {
      insertUser.run(
        user.login,
        user.fullName,
        user.passwordHash,
        user.role,
        user.employeeId,
        user.isActive
      );
    }
  })();
}

