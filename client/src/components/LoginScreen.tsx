import type { FormEvent } from "react";

type LoginFormState = {
  login: string;
  password: string;
};

type LoginScreenProps = {
  loading: boolean;
  errorMessage: string | null;
  form: LoginFormState;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (patch: Partial<LoginFormState>) => void;
};

export function LoginScreen({ loading, errorMessage, form, onSubmit, onChange }: LoginScreenProps) {
  return (
    <div className="login-layout">
      <div className="login-card">
        <h1>Worktime Board</h1>
        <p>Войдите, чтобы просматривать и редактировать нагрузку сотрудников.</p>
        <form onSubmit={onSubmit}>
          <label>
            Логин
            <input
              type="text"
              autoComplete="username"
              value={form.login}
              onChange={(event) => onChange({ login: event.target.value })}
              required
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => onChange({ password: event.target.value })}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        <div className="hint">
          <div>Демо-админ: admin / admin12345</div>
          <div>Демо-сотрудник: employee1 / employee12345</div>
        </div>
      </div>
    </div>
  );
}
