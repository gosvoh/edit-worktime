import { useCallback, useEffect, type MutableRefObject, type RefObject } from "react";
import { BOARD_VIEW_KEY, clamp, readSavedBoardView, type BoardView } from "../lib/board";
import type { CurrentUser } from "../types";

type CanvasSize = {
  width: number;
  height: number;
};

type UseBoardViewPersistenceParams = {
  loading: boolean;
  isAuthenticated: boolean;
  user: CurrentUser | null;
  zoom: number;
  canvasSize: CanvasSize;
  boardScrollRef: RefObject<HTMLDivElement>;
  hasAutoCenteredRef: MutableRefObject<boolean>;
};

export function useBoardViewPersistence({
  loading,
  isAuthenticated,
  user,
  zoom,
  canvasSize,
  boardScrollRef,
  hasAutoCenteredRef
}: UseBoardViewPersistenceParams) {
  useEffect(() => {
    if (loading || !isAuthenticated || !user) {
      return;
    }
    if (hasAutoCenteredRef.current) {
      return;
    }

    const container = boardScrollRef.current;
    if (!container) {
      return;
    }

    const saved = readSavedBoardView();
    if (saved) {
      const maxScrollLeft = Math.max(0, canvasSize.width * zoom - container.clientWidth);
      const maxScrollTop = Math.max(0, canvasSize.height * zoom - container.clientHeight);
      container.scrollLeft = clamp(saved.left, 0, maxScrollLeft);
      container.scrollTop = clamp(saved.top, 0, maxScrollTop);
    } else {
      const centeredLeft = Math.max(0, (canvasSize.width * zoom - container.clientWidth) / 2);
      container.scrollLeft = centeredLeft;
      container.scrollTop = 60;
    }

    hasAutoCenteredRef.current = true;
  }, [loading, isAuthenticated, user, zoom, canvasSize.width, canvasSize.height, boardScrollRef, hasAutoCenteredRef]);

  const saveBoardView = useCallback(() => {
    const container = boardScrollRef.current;
    if (!container) {
      return;
    }

    const payload: BoardView = {
      zoom,
      left: container.scrollLeft,
      top: container.scrollTop
    };
    localStorage.setItem(BOARD_VIEW_KEY, JSON.stringify(payload));
  }, [zoom, boardScrollRef]);

  useEffect(() => {
    saveBoardView();
  }, [saveBoardView]);

  useEffect(() => {
    const container = boardScrollRef.current;
    if (!container) {
      return;
    }

    const onScroll = () => saveBoardView();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [saveBoardView, loading, isAuthenticated, user, boardScrollRef]);
}
