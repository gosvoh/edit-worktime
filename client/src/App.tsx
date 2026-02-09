import { useCallback, useEffect, useMemo } from "react";
import { api } from "./api";
import { AppModals } from "./components/AppModals";
import { BoardCanvas } from "./components/BoardCanvas";
import { LoginScreen } from "./components/LoginScreen";
import { TopBar } from "./components/TopBar";
import { AppModalsProvider, type AppModalsContextValue } from "./contexts/AppModalsContext";
import { useAdminActions } from "./hooks/useAdminActions";
import { useAppSession } from "./hooks/useAppSession";
import { useAppUiState } from "./hooks/useAppUiState";
import { useAuthHandlers } from "./hooks/useAuthHandlers";
import { useBoardInteractions } from "./hooks/useBoardInteractions";
import { useBoardViewPersistence } from "./hooks/useBoardViewPersistence";
import { useLiveSync } from "./hooks/useLiveSync";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CARD_HEIGHT,
  CARD_WIDTH,
  MIN_CANVAS_HEIGHT,
  MIN_CANVAS_WIDTH,
  type EmployeePatch
} from "./lib/board";
import { normalizeApiError } from "./lib/errors";

export default function App() {
  const ui = useAppUiState();

  const {
    isAuthenticated,
    user,
    settings,
    employees,
    users,
    loading,
    errorMessage,
    hasAutoCenteredRef,
    setSettings,
    setEmployees,
    setUsers,
    setLoading,
    setErrorMessage,
    bootstrap,
    refreshData,
    logout
  } = useAppSession();

  useEffect(() => {
    void bootstrap(true);
  }, [bootstrap]);

  const patchEmployee = useCallback(async (employeeId: number, patch: EmployeePatch) => {
    if (!isAuthenticated || user?.role !== "admin") {
      return;
    }

    setEmployees((prev) =>
      prev.map((item) => (item.id === employeeId ? { ...item, ...patch } : item))
    );

    try {
      const updated = await api.patchEmployee(employeeId, patch);
      setEmployees((prev) => prev.map((item) => (item.id === employeeId ? updated : item)));
    } catch (err) {
      setErrorMessage(normalizeApiError(err));
      await bootstrap(false);
    }
  }, [isAuthenticated, user, setEmployees, setErrorMessage, bootstrap]);

  const {
    dragState,
    isSpacePressed,
    isPanning,
    canvasRef,
    boardScrollRef,
    onBoardPointerDown,
    onCardPointerDown
  } = useBoardInteractions({
    userRole: user?.role,
    zoom: ui.zoom,
    setEmployees,
    patchEmployee
  });

  const canvasSize = useMemo(() => {
    const maxRight = employees.reduce(
      (acc, employee) => Math.max(acc, employee.x + CARD_WIDTH + 280),
      CANVAS_WIDTH
    );
    const maxBottom = employees.reduce(
      (acc, employee) => Math.max(acc, employee.y + CARD_HEIGHT + 260),
      CANVAS_HEIGHT
    );

    return {
      width: Math.max(MIN_CANVAS_WIDTH, maxRight),
      height: Math.max(MIN_CANVAS_HEIGHT, maxBottom)
    };
  }, [employees]);

  useBoardViewPersistence({
    loading,
    isAuthenticated,
    user,
    zoom: ui.zoom,
    canvasSize,
    boardScrollRef,
    hasAutoCenteredRef
  });

  useLiveSync({
    isAuthenticated,
    user,
    isDragging: dragState !== null,
    bootstrap
  });

  const adminActions = useAdminActions({
    isAuthenticated,
    user,
    employees,
    users,
    settings,
    setSettings,
    setEmployees,
    setUsers,
    setErrorMessage,
    bootstrap
  });

  const { onLoginSubmit, onChangeOwnPassword } = useAuthHandlers({
    loginForm: ui.loginForm,
    passwordForm: ui.passwordForm,
    isAuthenticated,
    setLoading,
    setErrorMessage,
    bootstrap,
    onPasswordChangeSuccess: ui.closePasswordModal
  });

  if (loading && !isAuthenticated) {
    return <div className="loading-screen">Проверка сессии...</div>;
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        loading={loading}
        errorMessage={errorMessage}
        form={ui.loginForm}
        onSubmit={onLoginSubmit}
        onChange={ui.onLoginFormChange}
      />
    );
  }

  if (loading || !settings || !user) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  const modalsContextValue: AppModalsContextValue = {
    user,
    settings,
    errorMessage,
    showAdminModal: ui.showAdminModal,
    showImportModal: ui.showImportModal,
    showPasswordModal: ui.showPasswordModal,
    settingsDraft: adminActions.settingsDraft,
    newEmployee: adminActions.newEmployee,
    newUser: adminActions.newUser,
    availableEmployeesForUser: adminActions.availableEmployeesForUser,
    users,
    employees,
    resetPasswordUserId: adminActions.resetPasswordUserId,
    newPasswordValue: adminActions.newPasswordValue,
    importingData: adminActions.importingData,
    passwordForm: ui.passwordForm,
    onCloseAdminModal: () => {
      ui.setShowAdminModal(false);
      adminActions.resetAdminModalTransientState();
    },
    onCloseImportModal: () => ui.setShowImportModal(false),
    onClosePasswordModal: ui.closePasswordModal,
    onSettingsDraftChange: adminActions.onSettingsDraftChange,
    onNewEmployeeChange: adminActions.onNewEmployeeChange,
    onNewUserChange: adminActions.onNewUserChange,
    onToggleResetPasswordUser: adminActions.onToggleResetPasswordUser,
    onNewPasswordValueChange: adminActions.onNewPasswordValueChange,
    onUpdateSettings: adminActions.onUpdateSettings,
    onCreateEmployee: adminActions.onCreateEmployee,
    onCreateUser: adminActions.onCreateUser,
    onToggleUserActive: adminActions.onToggleUserActive,
    onUnbindUser: adminActions.onUnbindUser,
    onDeleteUser: adminActions.onDeleteUser,
    onResetPassword: adminActions.onResetPassword,
    onDeleteEmployee: adminActions.onDeleteEmployee,
    onExportData: adminActions.onExportData,
    onImportFileChange: adminActions.onImportFileChange,
    onPasswordFormChange: ui.onPasswordFormChange,
    onChangeOwnPassword
  };

  return (
    <div className="app">
      <TopBar
        user={user}
        theme={ui.theme}
        showGuide={ui.showGuide}
        onToggleTheme={ui.toggleTheme}
        onToggleGuide={ui.toggleGuide}
        onOpenAdminModal={() => ui.setShowAdminModal(true)}
        onOpenImportModal={() => ui.setShowImportModal(true)}
        onOpenPasswordModal={() => ui.setShowPasswordModal(true)}
        onRefresh={() => void refreshData()}
        onLogout={() => void logout()}
      />

      {errorMessage && <div className="error-banner global">{errorMessage}</div>}

      <BoardCanvas
        zoom={ui.zoom}
        onZoomChange={ui.setZoom}
        isPanning={isPanning}
        isSpacePressed={isSpacePressed}
        showGuide={ui.showGuide}
        canvasSize={canvasSize}
        boardScrollRef={boardScrollRef}
        canvasRef={canvasRef}
        employees={employees}
        settings={settings}
        isAdmin={user.role === "admin"}
        draggingEmployeeId={dragState?.employeeId ?? null}
        onPatchEmployee={patchEmployee}
        onCardPointerDown={onCardPointerDown}
        onBoardPointerDown={onBoardPointerDown}
      />

      <AppModalsProvider value={modalsContextValue}>
        <AppModals />
      </AppModalsProvider>
    </div>
  );
}
