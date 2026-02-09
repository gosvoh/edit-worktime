import type { CurrentUser } from "../types";
import type { ThemeMode } from "../lib/board";

type TopBarProps = {
  user: CurrentUser;
  theme: ThemeMode;
  showGuide: boolean;
  onToggleTheme: () => void;
  onToggleGuide: () => void;
  onOpenAdminModal: () => void;
  onOpenImportModal: () => void;
  onOpenPasswordModal: () => void;
  onRefresh: () => void;
  onLogout: () => void;
};

export function TopBar({
  user,
  theme,
  showGuide,
  onToggleTheme,
  onToggleGuide,
  onOpenAdminModal,
  onOpenImportModal,
  onOpenPasswordModal,
  onRefresh,
  onLogout
}: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <h1>Нагрузка команды</h1>
        <p>
          Пользователь: <b>{user.fullName}</b> ({user.role})
        </p>
      </div>
      <div className="topbar-actions">
        <button type="button" onClick={onToggleTheme} title="Переключить тему">
          {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        </button>
        <button type="button" onClick={onToggleGuide} title="Показать инструкцию по управлению">
          {showGuide ? "Скрыть инструкцию" : "Инструкция"}
        </button>
        {user.role === "admin" && (
          <button type="button" onClick={onOpenAdminModal}>
            Администрирование
          </button>
        )}
        {user.role === "admin" && (
          <button type="button" onClick={onOpenImportModal}>
            Импорт / экспорт
          </button>
        )}
        <button type="button" onClick={onOpenPasswordModal}>
          Сменить пароль
        </button>
        <button type="button" onClick={onRefresh}>
          Обновить
        </button>
        <button type="button" onClick={onLogout}>
          Выйти
        </button>
      </div>
    </header>
  );
}
