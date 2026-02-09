import type { PointerEvent as ReactPointerEvent } from "react";
import { hourFormatter, moneyFormatter } from "../lib/formatters";
import { loadStatus, maxHoursForEmployee, parseInputNumber, type EmployeePatch } from "../lib/board";
import type { AppSettings, Employee } from "../types";

type EmployeeCardProps = {
  employee: Employee;
  settings: AppSettings;
  isAdmin: boolean;
  isDragging: boolean;
  onPatch: (employeeId: number, patch: EmployeePatch) => Promise<void>;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, employee: Employee) => void;
};

export function EmployeeCard({
  employee,
  settings,
  isAdmin,
  isDragging,
  onPatch,
  onPointerDown
}: EmployeeCardProps) {
  const maxHours = maxHoursForEmployee(employee, settings);
  const ratio = maxHours > 0 ? employee.currentLoadHours / maxHours : 0;
  const status = loadStatus(ratio, settings.warningThreshold);
  const currentSalary = employee.payPerRate * employee.rate;
  const usedPercent = Math.max(0, ratio * 100);

  return (
    <article
      className={`employee-card ${status} ${isDragging ? "is-dragging" : ""}`}
      style={{ left: employee.x, top: employee.y }}
    >
      <header>
        <div className="title-block">
          {isAdmin ? (
            <input
              key={`name-${employee.id}-${employee.fullName}`}
              className="name-input"
              type="text"
              defaultValue={employee.fullName}
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (value && value !== employee.fullName) {
                  void onPatch(employee.id, { fullName: value });
                }
              }}
            />
          ) : (
            <h3>{employee.fullName}</h3>
          )}
          <small>ID: {employee.id}</small>
        </div>
        {isAdmin && (
          <button
            className="drag-handle"
            type="button"
            title="Перетащить карточку"
            onPointerDown={(event) => onPointerDown(event, employee)}
          >
            move
          </button>
        )}
      </header>

      <div className="metrics-grid">
        <label>
          Ставка
          <input
            key={`rate-${employee.id}-${employee.rate}`}
            type="number"
            step="0.05"
            defaultValue={employee.rate}
            disabled={!isAdmin}
            onBlur={(event) => {
              const parsed = parseInputNumber(event.target.value);
              if (parsed !== null && parsed > 0 && parsed !== employee.rate) {
                void onPatch(employee.id, { rate: parsed });
              }
            }}
          />
        </label>

        <label>
          Нагрузка, ч
          <input
            key={`load-${employee.id}-${employee.currentLoadHours}`}
            type="number"
            step="0.1"
            defaultValue={employee.currentLoadHours}
            disabled={!isAdmin}
            onBlur={(event) => {
              const parsed = parseInputNumber(event.target.value);
              if (parsed !== null && parsed >= 0 && parsed !== employee.currentLoadHours) {
                void onPatch(employee.id, { currentLoadHours: parsed });
              }
            }}
          />
        </label>

        <label>
          Оплата за 1 ставку, ₽
          <input
            key={`pay-${employee.id}-${employee.payPerRate}`}
            type="number"
            step="1"
            defaultValue={employee.payPerRate}
            disabled={!isAdmin}
            onBlur={(event) => {
              const parsed = parseInputNumber(event.target.value);
              if (parsed !== null && parsed >= 0 && parsed !== employee.payPerRate) {
                void onPatch(employee.id, { payPerRate: parsed });
              }
            }}
          />
        </label>

        <label>
          Часы на ставку
          <input
            key={`hours-${employee.id}-${employee.hoursPerRate ?? "null"}`}
            type="number"
            step="0.1"
            placeholder={String(settings.baseHoursPerRate)}
            defaultValue={employee.hoursPerRate ?? ""}
            disabled={!isAdmin}
            onBlur={(event) => {
              const raw = event.target.value.trim();
              if (raw.length === 0) {
                if (employee.hoursPerRate !== null) {
                  void onPatch(employee.id, { hoursPerRate: null });
                }
                return;
              }
              const parsed = parseInputNumber(raw);
              if (parsed !== null && parsed > 0 && parsed !== employee.hoursPerRate) {
                void onPatch(employee.id, { hoursPerRate: parsed });
              }
            }}
          />
        </label>
      </div>

      {isAdmin && (
        <div className="quick-load-buttons">
          <button
            type="button"
            onClick={() =>
              void onPatch(employee.id, {
                currentLoadHours: Math.max(0, employee.currentLoadHours - 8)
              })
            }
          >
            -8ч
          </button>
          <button
            type="button"
            onClick={() =>
              void onPatch(employee.id, {
                currentLoadHours: employee.currentLoadHours + 8
              })
            }
          >
            +8ч
          </button>
        </div>
      )}

      <div className="summary-row">
        <span>Максимум: {hourFormatter.format(maxHours)}ч</span>
        <span>Занято: {hourFormatter.format(employee.currentLoadHours)}ч</span>
      </div>
      <div className="summary-row">
        <span>Оплата на текущую ставку:</span>
        <span>{moneyFormatter.format(currentSalary)}</span>
      </div>

      <div className="progress-track">
        <div
          className={`progress-fill ${status}`}
          style={{ width: `${Math.min(100, usedPercent)}%` }}
        />
      </div>
      <div className={`status-label ${status}`}>
        {status === "normal" && `Норма (${usedPercent.toFixed(0)}%)`}
        {status === "warning" && `Близко к лимиту (${usedPercent.toFixed(0)}%)`}
        {status === "max" && "Лимит достигнут"}
        {status === "over" && `Перегруз (+${hourFormatter.format(employee.currentLoadHours - maxHours)}ч)`}
      </div>
    </article>
  );
}
