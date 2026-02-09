import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction
} from "react";
import { MAX_COORD, clamp, type EmployeePatch } from "../lib/board";
import type { Employee, UserRole } from "../types";

type DragState = {
  employeeId: number;
  offsetX: number;
  offsetY: number;
};

type UseBoardInteractionsParams = {
  userRole: UserRole | null | undefined;
  zoom: number;
  setEmployees: Dispatch<SetStateAction<Employee[]>>;
  patchEmployee: (employeeId: number, patch: EmployeePatch) => Promise<void>;
};

export function useBoardInteractions({
  userRole,
  zoom,
  setEmployees,
  patchEmployee
}: UseBoardInteractionsParams) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const panStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
          return;
        }
        event.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return { x: 0, y: 0 };
      }
      return {
        x: (clientX - rect.left) / zoom,
        y: (clientY - rect.top) / zoom
      };
    },
    [zoom]
  );

  const onBoardPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.closest(".drag-handle")) {
      return;
    }
    if (event.button === 0 && target.closest("input,button,select,textarea,label")) {
      return;
    }

    const canPanByMouse = event.button === 1 || event.button === 2;
    const canPanBySpace = event.button === 0 && isSpacePressed;
    const canPanByLeftDragOnEmptyBoard = event.button === 0 && target.closest(".employee-card") === null;

    if (!canPanByMouse && !canPanBySpace && !canPanByLeftDragOnEmptyBoard) {
      return;
    }

    const container = boardScrollRef.current;
    if (!container) {
      return;
    }

    event.preventDefault();
    panStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: container.scrollLeft,
      startScrollTop: container.scrollTop
    };
    setIsPanning(true);
  }, [dragState, isSpacePressed]);

  useEffect(() => {
    if (!isPanning) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const state = panStateRef.current;
      const container = boardScrollRef.current;
      if (!state || !container) {
        return;
      }
      const dx = event.clientX - state.startClientX;
      const dy = event.clientY - state.startClientY;
      container.scrollLeft = state.startScrollLeft - dx;
      container.scrollTop = state.startScrollTop - dy;
    };

    const onUp = () => {
      panStateRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isPanning]);

  const onCardPointerDown = useCallback(
    (event: ReactPointerEvent, employee: Employee) => {
      if (userRole !== "admin") {
        return;
      }
      event.preventDefault();
      const point = toCanvasPoint(event.clientX, event.clientY);
      setDragState({
        employeeId: employee.id,
        offsetX: point.x - employee.x,
        offsetY: point.y - employee.y
      });
      dragPositionRef.current = { x: employee.x, y: employee.y };
    },
    [userRole, toCanvasPoint]
  );

  useEffect(() => {
    if (!dragState || userRole !== "admin") {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const point = toCanvasPoint(event.clientX, event.clientY);
      const nextX = clamp(point.x - dragState.offsetX, 0, MAX_COORD);
      const nextY = clamp(point.y - dragState.offsetY, 0, MAX_COORD);
      dragPositionRef.current = { x: nextX, y: nextY };

      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === dragState.employeeId ? { ...employee, x: nextX, y: nextY } : employee
        )
      );
    };

    const onUp = () => {
      const current = dragPositionRef.current;
      const employeeId = dragState.employeeId;
      setDragState(null);
      dragPositionRef.current = null;
      if (current) {
        void patchEmployee(employeeId, { x: current.x, y: current.y });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragState, userRole, patchEmployee, setEmployees, toCanvasPoint]);

  return {
    dragState,
    isSpacePressed,
    isPanning,
    canvasRef,
    boardScrollRef,
    onBoardPointerDown,
    onCardPointerDown
  };
}
