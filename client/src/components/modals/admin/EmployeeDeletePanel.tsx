import { hourFormatter } from "../../../lib/formatters";
import type { Employee, UserSummary } from "../../../types";

type EmployeeDeletePanelProps = {
  employees: Employee[];
  users: UserSummary[];
  onDeleteEmployee: (targetEmployee: Employee) => Promise<void>;
};

export function EmployeeDeletePanel({
  employees,
  users,
  onDeleteEmployee,
}: EmployeeDeletePanelProps) {
  return (
    <section className="panel">
      <h2>Удаление сотрудников</h2>
      <div className="users-list employee-delete-list">
        {employees
          .slice()
          .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"))
          .map((employee) => {
            const linkedUser = users.find(
              (item) => item.employeeId === employee.id,
            );
            return (
              <div className="user-row" key={`delete-${employee.id}`}>
                <div>
                  <b>{employee.fullName}</b>
                </div>
                <small>
                  ID {employee.id} | ставка {employee.rate} | нагрузка{" "}
                  {hourFormatter.format(employee.currentLoadHours)}ч
                  {linkedUser ? ` | привязан: @${linkedUser.login}` : ""}
                </small>
                <div className="user-row-actions">
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => void onDeleteEmployee(employee)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
      </div>
      <small className="muted-note">
        Удаление подтверждается вручную. Если сотрудник привязан к пользователю,
        API отклонит удаление.
      </small>
    </section>
  );
}
