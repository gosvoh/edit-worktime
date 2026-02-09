import { useAppModalsContext } from "../../contexts/AppModalsContext";
import { Modal } from "../Modal";
import { EmployeeDeletePanel } from "./admin/EmployeeDeletePanel";
import { NewEmployeePanel } from "./admin/NewEmployeePanel";
import { NewUserPanel } from "./admin/NewUserPanel";
import { SettingsPanel } from "./admin/SettingsPanel";
import { UsersPanel } from "./admin/UsersPanel";

export function AdminModal() {
  const {
    errorMessage,
    settings,
    settingsDraft,
    newEmployee,
    newUser,
    availableEmployeesForUser,
    users,
    employees,
    user,
    resetPasswordUserId,
    newPasswordValue,
    onCloseAdminModal,
    onSettingsDraftChange,
    onNewEmployeeChange,
    onNewUserChange,
    onToggleResetPasswordUser,
    onNewPasswordValueChange,
    onUpdateSettings,
    onCreateEmployee,
    onCreateUser,
    onToggleUserActive,
    onUnbindUser,
    onDeleteUser,
    onResetPassword,
    onDeleteEmployee
  } = useAppModalsContext();

  return (
    <Modal title="Администрирование" wide onClose={onCloseAdminModal}>
      {errorMessage && <div className="error-banner">{errorMessage}</div>}
      <div className="modal-panels">
        <SettingsPanel
          settingsDraft={settingsDraft}
          onSettingsDraftChange={onSettingsDraftChange}
          onUpdateSettings={onUpdateSettings}
        />

        <NewEmployeePanel
          settings={settings}
          newEmployee={newEmployee}
          onNewEmployeeChange={onNewEmployeeChange}
          onCreateEmployee={onCreateEmployee}
        />

        <NewUserPanel
          newUser={newUser}
          availableEmployeesForUser={availableEmployeesForUser}
          onNewUserChange={onNewUserChange}
          onCreateUser={onCreateUser}
        />

        <UsersPanel
          users={users}
          currentUserId={user.id}
          resetPasswordUserId={resetPasswordUserId}
          newPasswordValue={newPasswordValue}
          onToggleUserActive={onToggleUserActive}
          onUnbindUser={onUnbindUser}
          onDeleteUser={onDeleteUser}
          onToggleResetPasswordUser={onToggleResetPasswordUser}
          onResetPassword={onResetPassword}
          onNewPasswordValueChange={onNewPasswordValueChange}
        />

        <EmployeeDeletePanel
          employees={employees}
          users={users}
          onDeleteEmployee={onDeleteEmployee}
        />
      </div>
    </Modal>
  );
}
