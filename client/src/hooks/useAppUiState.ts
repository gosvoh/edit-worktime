import { useCallback, useEffect, useState } from "react";
import {
  SNAP_TO_GRID_KEY,
  THEME_KEY,
  readSavedBoardView,
  type ThemeMode
} from "../lib/board";
import {
  createInitialLoginForm,
  createInitialPasswordForm,
  type LoginForm,
  type PasswordForm
} from "../lib/forms";

export function useAppUiState() {
  const [zoom, setZoom] = useState(() => readSavedBoardView()?.zoom ?? 1);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [snapToGrid, setSnapToGrid] = useState(() => localStorage.getItem(SNAP_TO_GRID_KEY) === "1");

  const [showGuide, setShowGuide] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [loginForm, setLoginForm] = useState<LoginForm>(createInitialLoginForm);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(createInitialPasswordForm);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SNAP_TO_GRID_KEY, snapToGrid ? "1" : "0");
  }, [snapToGrid]);

  useEffect(() => {
    if (!showAdminModal && !showImportModal && !showPasswordModal) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showAdminModal, showImportModal, showPasswordModal]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const toggleGuide = useCallback(() => {
    setShowGuide((prev) => !prev);
  }, []);

  const onLoginFormChange = useCallback((patch: Partial<LoginForm>) => {
    setLoginForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const onPasswordFormChange = useCallback((patch: Partial<PasswordForm>) => {
    setPasswordForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetPasswordForm = useCallback(() => {
    setPasswordForm(createInitialPasswordForm());
  }, []);

  const closePasswordModal = useCallback(() => {
    setShowPasswordModal(false);
    resetPasswordForm();
  }, [resetPasswordForm]);

  return {
    zoom,
    setZoom,
    theme,
    snapToGrid,
    showGuide,
    showAdminModal,
    showImportModal,
    showPasswordModal,
    loginForm,
    passwordForm,
    setShowAdminModal,
    setShowImportModal,
    setShowPasswordModal,
    setSnapToGrid,
    toggleTheme,
    toggleGuide,
    onLoginFormChange,
    onPasswordFormChange,
    closePasswordModal
  };
}
