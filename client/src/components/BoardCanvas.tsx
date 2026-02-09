import { useCallback, useEffect, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { EmployeeCard } from "./EmployeeCard";
import {
  GRID_SIZE,
  clamp,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type EmployeePatch
} from "../lib/board";
import type { AppSettings, Employee } from "../types";

type CanvasSize = {
  width: number;
  height: number;
};

type BoardCanvasProps = {
  zoom: number;
  onZoomChange: (value: number) => void;
  snapToGrid: boolean;
  onSnapToGridChange: (value: boolean) => void;
  isPanning: boolean;
  isSpacePressed: boolean;
  showGuide: boolean;
  canvasSize: CanvasSize;
  boardScrollRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLDivElement>;
  employees: Employee[];
  settings: AppSettings;
  isAdmin: boolean;
  draggingEmployeeId: number | null;
  onPatchEmployee: (employeeId: number, patch: EmployeePatch) => Promise<void>;
  onCardPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, employee: Employee) => void;
  onBoardPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export function BoardCanvas({
  zoom,
  onZoomChange,
  snapToGrid,
  onSnapToGridChange,
  isPanning,
  isSpacePressed,
  showGuide,
  canvasSize,
  boardScrollRef,
  canvasRef,
  employees,
  settings,
  isAdmin,
  draggingEmployeeId,
  onPatchEmployee,
  onCardPointerDown,
  onBoardPointerDown
}: BoardCanvasProps) {
  const onCtrlWheelZoom = useCallback((event: WheelEvent) => {
    if (!event.ctrlKey) {
      return;
    }

    const container = boardScrollRef.current;
    if (!container) {
      return;
    }
    if (!(event.target instanceof Node) || !container.contains(event.target)) {
      return;
    }

    event.preventDefault();

    const direction = Math.sign(event.deltaY);
    if (direction === 0) {
      return;
    }

    const nextZoom = clamp(Number((zoom - direction * ZOOM_STEP).toFixed(2)), ZOOM_MIN, ZOOM_MAX);
    if (nextZoom === zoom) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const worldX = (container.scrollLeft + pointerX) / zoom;
    const worldY = (container.scrollTop + pointerY) / zoom;
    const nextLeft = worldX * nextZoom - pointerX;
    const nextTop = worldY * nextZoom - pointerY;

    onZoomChange(nextZoom);

    requestAnimationFrame(() => {
      const maxLeft = Math.max(0, canvasSize.width * nextZoom - container.clientWidth);
      const maxTop = Math.max(0, canvasSize.height * nextZoom - container.clientHeight);
      container.scrollLeft = clamp(nextLeft, 0, maxLeft);
      container.scrollTop = clamp(nextTop, 0, maxTop);
    });
  }, [zoom, onZoomChange, boardScrollRef, canvasSize.width, canvasSize.height]);

  useEffect(() => {
    const container = boardScrollRef.current;
    if (!container) {
      return;
    }

    container.addEventListener("wheel", onCtrlWheelZoom, { passive: false });
    return () => {
      container.removeEventListener("wheel", onCtrlWheelZoom);
    };
  }, [boardScrollRef, onCtrlWheelZoom]);

  return (
    <div className="content content-board-only">
      <main className="board-area board-area-full">
        <div className="board-top-controls">
          <label className="zoom-control">
            Масштаб: {Math.round(zoom * 100)}%
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(event) => onZoomChange(Number(event.target.value))}
            />
          </label>
          <div className="board-help-inline">
            Перемещение: тяните пустое поле мышью или пальцем. Масштаб: ползунок или Ctrl + колесо.
          </div>
          <div className="board-options">
            {isAdmin && (
              <label className="board-toggle">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(event) => onSnapToGridChange(event.target.checked)}
                />
                Привязка к сетке
              </label>
            )}
            <div className="legend">
              <span className="legend-item normal">Норма</span>
              <span className="legend-item warning">Близко к лимиту</span>
              <span className="legend-item max">Лимит</span>
              <span className="legend-item over">Перегруз</span>
            </div>
          </div>
        </div>

        {showGuide && (
          <section className="guide-panel">
            <h3>Как пользоваться доской</h3>
            <ul>
              <li>Навигация: зажмите ЛКМ на пустом фоне и тяните поле по горизонтали и вертикали.</li>
              <li>Альтернатива: зажмите среднюю кнопку мыши и тяните.</li>
              <li>Альтернатива: удерживайте Space + ЛКМ и тяните.</li>
              <li>Телефон/планшет: тяните поле одним пальцем.</li>
              <li>Масштаб меняется ползунком «Масштаб» сверху.</li>
              <li>На ПК также работает Ctrl + колесо мыши для приближения и отдаления.</li>
              <li>Администратор может перетаскивать карточки за кнопку move.</li>
              <li>Для администратора: «Привязка к сетке» выравнивает карточки по клеткам.</li>
              <li>Поля в карточке (ставка, нагрузка, оплата) сохраняются при выходе из поля.</li>
              <li>Цвета: зеленый - норма, желтый - близко к лимиту, оранжевый - лимит, красный - перегруз.</li>
            </ul>
          </section>
        )}

        <div
          ref={boardScrollRef}
          className={`board-scroll ${isPanning ? "panning" : ""} ${isSpacePressed ? "can-pan" : ""}`}
          onPointerDown={onBoardPointerDown}
          onContextMenu={(event) => {
            if (isPanning || isSpacePressed) {
              event.preventDefault();
            }
          }}
        >
          <div
            className="board-surface"
            style={{
              width: canvasSize.width * zoom,
              height: canvasSize.height * zoom,
              minWidth: "100%",
              minHeight: "100%",
              backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`
            }}
          >
            <div
              ref={canvasRef}
              className={`board-canvas ${draggingEmployeeId !== null ? "dragging" : ""}`}
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                transform: `scale(${zoom})`
              }}
            >
              {employees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  settings={settings}
                  isAdmin={isAdmin}
                  isDragging={draggingEmployeeId === employee.id}
                  onPatch={onPatchEmployee}
                  onPointerDown={onCardPointerDown}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
