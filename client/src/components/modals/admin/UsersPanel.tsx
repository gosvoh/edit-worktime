import type { FormEvent } from "react";
import type { UserSummary } from "../../../types";

type UsersPanelProps = {
  users: UserSummary[];
  currentUserId: number;
  resetPasswordUserId: number | null;
  newPasswordValue: string;
  onToggleUserActive: (targetUser: UserSummary) => Promise<void>;
  onUnbindUser: (targetUser: UserSummary) => Promise<void>;
  onDeleteUser: (targetUser: UserSummary) => Promise<void>;
  onToggleResetPasswordUser: (userId: number) => void;
  onResetPassword: (userId: number) => Promise<void>;
  onNewPasswordValueChange: (value: string) => void;
};

export function UsersPanel({
  users,
  currentUserId,
  resetPasswordUserId,
  newPasswordValue,
  onToggleUserActive,
  onUnbindUser,
  onDeleteUser,
  onToggleResetPasswordUser,
  onResetPassword,
  onNewPasswordValueChange
}: UsersPanelProps) {
  return (
    <section className="panel">
      <h2>Пользователи</h2>
      <div className="users-list">
        {users.map((item) => (
          <div className="user-row" key={item.id}>
            <div>
              <b>{item.fullName}</b>
            </div>
            <small>
              @{item.login} | {item.role} | {item.isActive ? "активен" : "отключен"}
              {item.employeeName ? ` | ${item.employeeName}` : ""}
            </small>
            {item.id !== currentUserId && (
              <div className="user-row-actions">
                <button type="button" onClick={() => void onToggleUserActive(item)}>
                  {item.isActive ? "Отключить" : "Включить"}
                </button>
                {item.role === "employee" && item.employeeId !== null && (
                  <button type="button" onClick={() => void onUnbindUser(item)}>
                    Снять привязку
                  </button>
                )}
                <button type="button" onClick={() => onToggleResetPasswordUser(item.id)}>
                  Сбросить пароль
                </button>
                <button type="button" className="danger-button" onClick={() => void onDeleteUser(item)}>
                  Удалить
                </button>
              </div>
            )}
            {resetPasswordUserId === item.id && (
              <form
                className="password-reset"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void onResetPassword(item.id);
                }}
              >
                <input
                  type="password"
                  minLength={8}
                  placeholder="Новый пароль"
                  value={newPasswordValue}
                  onChange={(event) => onNewPasswordValueChange(event.target.value)}
                  required
                />
                <button type="submit">Сохранить</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
