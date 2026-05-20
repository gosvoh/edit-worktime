import { useCallback, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { api } from "../api";
import { normalizeApiError } from "../lib/errors";
import type { LoginForm, PasswordForm } from "../lib/forms";

type UseAuthHandlersParams = {
  loginForm: LoginForm;
  passwordForm: PasswordForm;
  isAuthenticated: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  bootstrap: (withSpinner: boolean) => Promise<void>;
  onPasswordChangeSuccess: () => void;
};

export function useAuthHandlers({
  loginForm,
  passwordForm,
  isAuthenticated,
  setLoading,
  setErrorMessage,
  bootstrap,
  onPasswordChangeSuccess
}: UseAuthHandlersParams) {
  const onLoginSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      await api.login(loginForm.login.trim(), loginForm.password);
      await bootstrap(true);
    } catch (err) {
      setLoading(false);
      setErrorMessage(normalizeApiError(err));
    }
  }, [loginForm, setLoading, setErrorMessage, bootstrap]);

  const onChangeOwnPassword = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      return;
    }

    if (
      !passwordForm.currentPassword.trim() ||
      !passwordForm.newPassword.trim() ||
      !passwordForm.confirmPassword.trim()
    ) {
      setErrorMessage("Заполните все поля пароля.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setErrorMessage("Новый пароль должен содержать минимум 8 символов.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage("Новый пароль и подтверждение не совпадают.");
      return;
    }

    try {
      await api.changeOwnPassword(passwordForm.currentPassword, passwordForm.newPassword);
      onPasswordChangeSuccess();
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
    }
  }, [isAuthenticated, passwordForm, onPasswordChangeSuccess, setErrorMessage]);

  return {
    onLoginSubmit,
    onChangeOwnPassword
  };
}
