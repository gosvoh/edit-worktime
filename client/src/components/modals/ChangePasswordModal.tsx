import { useAppModalsContext } from "../../contexts/AppModalsContext";
import { Modal } from "../Modal";

export function ChangePasswordModal() {
  const {
    errorMessage,
    passwordForm,
    onClosePasswordModal,
    onPasswordFormChange,
    onChangeOwnPassword
  } = useAppModalsContext();

  return (
    <Modal title="Смена пароля" onClose={onClosePasswordModal}>
      {errorMessage && <div className="error-banner">{errorMessage}</div>}
      <section className="panel">
        <form onSubmit={onChangeOwnPassword}>
          <label>
            Текущий пароль
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(event) => onPasswordFormChange({ currentPassword: event.target.value })}
              required
            />
          </label>
          <label>
            Новый пароль
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={passwordForm.newPassword}
              onChange={(event) => onPasswordFormChange({ newPassword: event.target.value })}
              required
            />
          </label>
          <label>
            Повторите новый пароль
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={passwordForm.confirmPassword}
              onChange={(event) => onPasswordFormChange({ confirmPassword: event.target.value })}
              required
            />
          </label>
          <button type="submit">Сохранить пароль</button>
        </form>
      </section>
    </Modal>
  );
}
