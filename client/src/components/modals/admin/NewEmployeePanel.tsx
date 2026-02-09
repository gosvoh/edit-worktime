import type { FormEvent } from "react";
import type { AppSettings } from "../../../types";
import type { NewEmployeeForm } from "./types";

type NewEmployeePanelProps = {
  settings: AppSettings;
  newEmployee: NewEmployeeForm;
  onNewEmployeeChange: (patch: Partial<NewEmployeeForm>) => void;
  onCreateEmployee: (event: FormEvent<HTMLFormElement>) => void;
};

export function NewEmployeePanel({
  settings,
  newEmployee,
  onNewEmployeeChange,
  onCreateEmployee
}: NewEmployeePanelProps) {
  return (
    <section className="panel">
      <h2>Новый сотрудник</h2>
      <form onSubmit={onCreateEmployee}>
        <label>
          ФИО
          <input
            type="text"
            value={newEmployee.fullName}
            onChange={(event) => onNewEmployeeChange({ fullName: event.target.value })}
            required
          />
        </label>
        <label>
          Ставка
          <input
            type="number"
            min={0.05}
            step={0.05}
            value={newEmployee.rate}
            onChange={(event) => onNewEmployeeChange({ rate: event.target.value })}
            required
          />
        </label>
        <label>
          Текущая нагрузка, ч
          <input
            type="number"
            min={0}
            step={0.1}
            value={newEmployee.currentLoadHours}
            onChange={(event) => onNewEmployeeChange({ currentLoadHours: event.target.value })}
            required
          />
        </label>
        <label>
          Оплата за 1 ставку, руб.
          <input
            type="number"
            min={0}
            step={1}
            value={newEmployee.payPerRate}
            onChange={(event) => onNewEmployeeChange({ payPerRate: event.target.value })}
            required
          />
        </label>
        <label>
          Индивидуальные часы на ставку (опционально)
          <input
            type="number"
            min={0.1}
            step={0.1}
            placeholder={String(settings.baseHoursPerRate)}
            value={newEmployee.hoursPerRate}
            onChange={(event) => onNewEmployeeChange({ hoursPerRate: event.target.value })}
          />
        </label>
        <button type="submit">Создать сотрудника</button>
      </form>
    </section>
  );
}
