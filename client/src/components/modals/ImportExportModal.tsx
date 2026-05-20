import { useAppModalsContext } from "../../contexts/AppModalsContext";
import { Modal } from "../Modal";

export function ImportExportModal() {
  const {
    errorMessage,
    importingData,
    onCloseImportModal,
    onExportData,
    onImportFileChange
  } = useAppModalsContext();

  return (
    <Modal title="Импорт / экспорт" onClose={onCloseImportModal}>
      {errorMessage && <div className="error-banner">{errorMessage}</div>}
      <div className="modal-panels">
        <section className="panel import-export-actions">
          <h2>Экспорт</h2>
          <button type="button" onClick={() => void onExportData()}>
            Скачать JSON
          </button>
          <small className="muted-note">
            Экспорт включает сотрудников, пользователей (с хешами паролей) и настройки.
          </small>
        </section>

        <section className="panel import-export-actions">
          <h2>Импорт</h2>
          <label className="file-input-label">
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => void onImportFileChange(event)}
              disabled={importingData}
            />
            {importingData ? "Импорт..." : "Выбрать JSON"}
          </label>
          <small className="muted-note">
            Импорт полностью заменяет текущие настройки, сотрудников и пользователей.
          </small>
        </section>
      </div>
    </Modal>
  );
}
