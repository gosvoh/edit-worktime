import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { EmployeeCard } from "./EmployeeCard";
import type { EmployeePatch } from "../lib/board";
import type { AppSettings, Employee } from "../types";

type CanvasSize = {
  width: number;
  height: number;
};

type BoardCanvasProps = {
  zoom: number;
  onZoomChange: (value: number) => void;
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
  onCardPointerDown: (event: ReactPointerEvent, employee: Employee) => void;
  onBoardPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export function BoardCanvas({
  zoom,
  onZoomChange,
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
  return (
    <div className="content content-board-only">
      <main className="board-area board-area-full">
        <div className="board-top-controls">
          <label>
            Масштаб: {Math.round(zoom * 100)}%
            <input
              type="range"
              min={0.6}
              max={1.4}
              step={0.05}
              value={zoom}
              onChange={(event) => onZoomChange(Number(event.target.value))}
            />
          </label>
          <div className="board-help-inline">
            {isPanning && "Режим перемещения активен"}
            {!isPanning && isSpacePressed && "Удерживайте ЛКМ и тяните для перемещения"}
            {!isPanning &&
              !isSpacePressed &&
              "ЛКМ по пустому полю, средняя кнопка мыши или Space + ЛКМ: перемещение по X/Y"}
          </div>
          <div className="legend">
            <span className="legend-item normal">Норма</span>
            <span className="legend-item warning">Близко к лимиту</span>
            <span className="legend-item max">Лимит</span>
            <span className="legend-item over">Перегруз</span>
          </div>
        </div>

        {showGuide && (
          <section className="guide-panel">
            <h3>Как пользоваться доской</h3>
            <ul>
              <li>Навигация: зажмите ЛКМ на пустом фоне и тяните поле по горизонтали и вертикали.</li>
              <li>Альтернатива: зажмите среднюю кнопку мыши и тяните.</li>
              <li>Альтернатива: удерживайте Space + ЛКМ и тяните.</li>
              <li>Масштаб меняется ползунком «Масштаб» сверху.</li>
              <li>Администратор может перетаскивать карточки за кнопку move.</li>
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
              backgroundSize: `${40 * zoom}px ${40 * zoom}px`
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
