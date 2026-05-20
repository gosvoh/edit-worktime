import { useAppModalsContext } from "../contexts/AppModalsContext";
import { withRoleGate } from "../hoc/withRoleGate";
import { AdminModal } from "./modals/AdminModal";
import { ChangePasswordModal } from "./modals/ChangePasswordModal";
import { ImportExportModal } from "./modals/ImportExportModal";

const AdminOnlyAdminModal = withRoleGate(AdminModal, ["admin"]);
const AdminOnlyImportExportModal = withRoleGate(ImportExportModal, ["admin"]);

export function AppModals() {
  const { user, showAdminModal, showImportModal, showPasswordModal } = useAppModalsContext();

  return (
    <>
      <AdminOnlyAdminModal isOpen={showAdminModal} currentRole={user.role} />

      <AdminOnlyImportExportModal isOpen={showImportModal} currentRole={user.role} />

      {showPasswordModal && <ChangePasswordModal />}
    </>
  );
}
