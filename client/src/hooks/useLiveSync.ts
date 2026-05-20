import { useEffect } from "react";
import type { CurrentUser } from "../types";

type UseLiveSyncParams = {
  isAuthenticated: boolean;
  user: CurrentUser | null;
  isDragging: boolean;
  bootstrap: (withSpinner: boolean) => Promise<void>;
};

export function useLiveSync({ isAuthenticated, user, isDragging, bootstrap }: UseLiveSyncParams) {
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const interval = window.setInterval(() => {
      if (isDragging) {
        return;
      }
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "SELECT" || activeTag === "TEXTAREA") {
        return;
      }
      void bootstrap(false);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, user, isDragging, bootstrap]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    let closedByApp = false;
    let reconnectTimer: number | null = null;
    let socket: WebSocket | null = null;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as { type?: string };
          if (payload.type === "refresh") {
            void bootstrap(false);
          }
        } catch {
          // ignore malformed payloads
        }
      };

      socket.onclose = () => {
        if (closedByApp) {
          return;
        }
        reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      closedByApp = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [isAuthenticated, user, bootstrap]);
}
