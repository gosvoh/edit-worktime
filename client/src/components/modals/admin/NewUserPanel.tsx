import type { FormEvent } from "react";
import type { Employee, UserRole } from "../../../types";
import type { NewUserForm } from "./types";

type NewUserPanelProps = {
  newUser: NewUserForm;
  availableEmployeesForUser: Employee[];
  onNewUserChange: (patch: Partial<NewUserForm>) => void;
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void;
};

export function NewUserPanel({
  newUser,
  availableEmployeesForUser,
  onNewUserChange,
  onCreateUser
}: NewUserPanelProps) {
  return (
    <section className="panel">
      <h2>Новый пользователь</h2>
      <form onSubmit={onCreateUser}>
        <label>
          Логин
          <input
            type="text"
            value={newUser.login}
            onChange={(event) => onNewUserChange({ login: event.target.value })}
            required
          />
        </label>
        <label>
          ФИО
          <input
            type="text"
            value={newUser.fullName}
            onChange={(event) => onNewUserChange({ fullName: event.target.value })}
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            minLength={8}
            value={newUser.password}
            onChange={(event) => onNewUserChange({ password: event.target.value })}
            required
          />
        </label>
        <label>
          Роль
          <select
            value={newUser.role}
            onChange={(event) => {
              const role = event.target.value as UserRole;
              onNewUserChange({
                role,
                employeeId: role === "employee" ? newUser.employeeId : ""
              });
            }}
          >
            <option value="employee">employee</option>
            <option value="admin">admin</option>
          </select>
        </label>
        {newUser.role === "employee" && (
          <label>
            Привязка к сотруднику
            <select
              value={newUser.employeeId}
              onChange={(event) => onNewUserChange({ employeeId: event.target.value })}
              required
            >
              <option value="">Выберите сотрудника</option>
              {availableEmployeesForUser.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} (ID {employee.id})
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit">Создать пользователя</button>
      </form>
      <small className="muted-note">
        Для роли employee привязка обязательна: пользователь увидит только свою карточку.
      </small>
    </section>
  );
}
