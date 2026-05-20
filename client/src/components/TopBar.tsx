import { useCallback, useState } from "react";
import { LogOut, Moon, RefreshCw, Sun } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const runAndClose = useCallback((action: () => void) => {
    return () => {
      action();
      setMobileMenuOpen(false);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-main">
        <div>
          <h1>Нагрузка команды</h1>
          <p>
            Пользователь: <b>{user.fullName}</b> ({user.role})
          </p>
        </div>
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? "Скрыть меню" : "Меню"}
        </button>
      </div>
      <div className={`topbar-actions ${mobileMenuOpen ? "open" : ""}`}>
        <button
          type="button"
          className="icon-button"
          onClick={runAndClose(onToggleTheme)}
          title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          type="button"
          onClick={runAndClose(onToggleGuide)}
          title="Показать инструкцию по управлению"
        >
          {showGuide ? "Скрыть инструкцию" : "Инструкция"}
        </button>
        {user.role === "admin" && (
          <button type="button" onClick={runAndClose(onOpenAdminModal)}>
            Администрирование
          </button>
        )}
        {user.role === "admin" && (
          <button type="button" onClick={runAndClose(onOpenImportModal)}>
            Импорт / экспорт
          </button>
        )}
        <button type="button" onClick={runAndClose(onOpenPasswordModal)}>
          Сменить пароль
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={runAndClose(onRefresh)}
          title="Обновить"
          aria-label="Обновить"
        >
          <RefreshCw size={18} />
        </button>
        <button
          type="button"
          className="icon-button danger-icon-button"
          onClick={runAndClose(onLogout)}
          title="Выйти"
          aria-label="Выйти"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
