"use client";

import {
  Excalidraw,
  restore,
  restoreLibraryItems,
  restoreAppState,
  restoreElements,
  serializeAsJSON,
  serializeLibraryAsJSON,
  WelcomeScreen,
  MainMenu,
  loadFromBlob,
} from "@excalidraw/excalidraw";
import {
  type ExcalidrawAPIRefValue,
  type LibraryItem,
  type LibraryItems,
  type AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { useDebouncedCallback } from "use-debounce";

function useLocalStorage<T>(
  key: string,
  defaultValue: T
): { get: () => T; set: (value: T) => void } {
  return {
    get: () => {
      try {
        const item = JSON.parse(localStorage.getItem(key)!);
        return item;
      } catch {
        return defaultValue;
      }
    },
    set: (value: T) => localStorage.setItem(key, JSON.stringify(value)),
  };
}

export default function Editor() {
  // const [editor, setEditor] = useState<ExcalidrawAPIRefValue | null>(null);
  const [language, setLanguage] = useState<"en-US" | "ru-RU">("en-US");
  const ref = useRef<ExcalidrawAPIRefValue>(null);
  const libraryItems = useLocalStorage<LibraryItems>("libraryItems", []);
  const [appState, setAppState] = useState<AppState>();
  const [elements, setElements] = useState<readonly ExcalidrawElement[]>([]);
  const [isReady, setIsReady] = useState(false);
  const setData = useDebouncedCallback(
    (
      newElements: readonly ExcalidrawElement[],
      newAppState: AppState & { [key: string]: any }
    ) => {
      const filteredElements = newElements.filter((el) => !el.isDeleted);
      if (elements.length !== filteredElements.length) {
        const wtf = filteredElements.filter((el) => !elements.includes(el));
        ref.current?.readyPromise?.then((ed) => {});
        console.log("newElements", wtf);
      }
      setElements(() => filteredElements);
      const state = JSON.parse(JSON.stringify(newAppState));
      Object.keys(state).forEach((k) => {
        if (
          ![
            "gridSize",
            "viewBackgroundColor",
            "isBindingEnabled",
            "theme",
          ].includes(k)
        )
          delete state[k];
      });

      localStorage.setItem(
        "appData",
        JSON.stringify({
          type: "excalidraw",
          version: 2,
          source: "http://localhost:3000",
          elements: filteredElements,
          appState: state,
        })
      );
    },
    500
  );

  type Data = {
    appState: AppState;
    elements: readonly ExcalidrawElement[];
    source: string;
    type: string;
    version: number;
  };

  useEffect(() => {
    try {
      const dataJson = localStorage.getItem("appData");
      if (!dataJson) return;

      const data: Data = JSON.parse(dataJson);
      if (data.type !== "excalidraw") return;

      setAppState(data.appState);
      setElements(data.elements);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReady(true);
    }
  }, []);

  if (!isReady) return <div className="editor">Loading...</div>;

  return (
    <div className="editor">
      <Excalidraw
        ref={ref}
        initialData={{
          libraryItems: libraryItems.get(),
          elements,
          appState,
        }}
        gridModeEnabled
        onLibraryChange={(items) => {
          libraryItems.set(items);
        }}
        onChange={(newElements, newAppState, newFiles) => {
          setData(newElements, newAppState);
        }}
        langCode={language}
      >
        <WelcomeScreen />
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.Item
            onSelect={() =>
              setLanguage((val) => (val === "en-US" ? "ru-RU" : "en-US"))
            }
          >
            {language}
          </MainMenu.Item>
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
