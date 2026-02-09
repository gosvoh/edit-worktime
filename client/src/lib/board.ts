import type { AppSettings, Employee } from "../types";

export const CANVAS_WIDTH = 2800;
export const CANVAS_HEIGHT = 1700;
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 250;
export const MIN_CANVAS_WIDTH = 1200;
export const MIN_CANVAS_HEIGHT = 800;
export const MAX_COORD = 50000;
export const THEME_KEY = "worktime_theme";
export const BOARD_VIEW_KEY = "worktime_board_view";

export type EmployeePatch = Partial<{
  fullName: string;
  rate: number;
  currentLoadHours: number;
  payPerRate: number;
  hoursPerRate: number | null;
  x: number;
  y: number;
}>;

export type LoadStatus = "normal" | "warning" | "max" | "over";

export type ThemeMode = "light" | "dark";

export type BoardView = {
  zoom: number;
  left: number;
  top: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function loadStatus(ratio: number, warningThreshold: number): LoadStatus {
  if (ratio > 1) {
    return "over";
  }
  if (ratio >= 1) {
    return "max";
  }
  if (ratio >= warningThreshold) {
    return "warning";
  }
  return "normal";
}

export function parseInputNumber(raw: string): number | null {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function maxHoursForEmployee(employee: Employee, settings: AppSettings) {
  return employee.rate * (employee.hoursPerRate ?? settings.baseHoursPerRate);
}

export function readSavedBoardView(): BoardView | null {
  const raw = localStorage.getItem(BOARD_VIEW_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<BoardView>;
    if (
      typeof parsed.zoom !== "number" ||
      typeof parsed.left !== "number" ||
      typeof parsed.top !== "number" ||
      !Number.isFinite(parsed.zoom) ||
      !Number.isFinite(parsed.left) ||
      !Number.isFinite(parsed.top)
    ) {
      return null;
    }
    return {
      zoom: clamp(parsed.zoom, 0.6, 1.4),
      left: Math.max(0, parsed.left),
      top: Math.max(0, parsed.top)
    };
  } catch {
    return null;
  }
}
