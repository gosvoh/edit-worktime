import type { FormEvent } from "react";
import type { SettingsDraft } from "./types";

type SettingsPanelProps = {
  settingsDraft: SettingsDraft;
  onSettingsDraftChange: (patch: Partial<SettingsDraft>) => void;
  onUpdateSettings: (event: FormEvent<HTMLFormElement>) => void;
};

export function SettingsPanel({
  settingsDraft,
  onSettingsDraftChange,
  onUpdateSettings,
}: SettingsPanelProps) {
  return (
    <section className="panel">
      <h2>Настройки</h2>
      <form onSubmit={onUpdateSettings}>
        <label>
          Часы на 1 ставку в месяц
          <input
            type="number"
            min={1}
            step={0.1}
            value={settingsDraft.baseHoursPerRate}
            onChange={(event) =>
              onSettingsDraftChange({ baseHoursPerRate: event.target.value })
            }
            required
          />
        </label>
        <label>
          Порог предупреждения (0..1)
          <input
            type="number"
            min={0.01}
            max={0.99}
            step={0.01}
            value={settingsDraft.warningThreshold}
            onChange={(event) =>
              onSettingsDraftChange({ warningThreshold: event.target.value })
            }
            required
          />
        </label>
        <button type="submit">Сохранить настройки</button>
      </form>
    </section>
  );
}
