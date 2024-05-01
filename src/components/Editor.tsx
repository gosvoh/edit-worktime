"use client";

import { saveElements, saveLibrary } from "@/lib/actions";
import {
  Excalidraw,
  MainMenu,
  THEME,
  WelcomeScreen,
  restoreElements,
  restoreLibraryItems,
  mutateElement,
  getNonDeletedElements,
  newElementWith,
} from "@excalidraw/excalidraw";
import {
  NonDeletedExcalidrawElement,
  ExcalidrawElement,
  ExcalidrawTextElement,
} from "@excalidraw/excalidraw/types/element/types";
import {
  AppState,
  ExcalidrawImperativeAPI,
  LibraryItems,
} from "@excalidraw/excalidraw/types/types";
import { useDebouncedCallback, useLocalStorageValue } from "@react-hookz/web";
import { LanguagesIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";

enum ElementTypes {
  containerName = "containerName",
  name = "name",
  containerTime = "containerTime",
  containerScale = "containerScale",
  scale = "scale",
  containerWorkTime = "containerWorkTime",
  containerBurden = "containerBurden",
  burden = "burden",
}

export default function Editor(props: {
  elements: readonly NonDeletedExcalidrawElement[];
  library: LibraryItems;
}) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI>();
  const locale = useLocalStorageValue<"ru" | "en">("locale", {
    defaultValue: "en",
  });
  const theme = useLocalStorageValue<(typeof THEME)[keyof typeof THEME]>(
    "theme",
    { defaultValue: THEME.DARK }
  );
  const router = useRouter();
  const [elementsLength, setElementsLength] = useState(props.elements.length);
  const currentEditingElementsRef = useRef<ExcalidrawElement[]>([]);
  const lastEditedElementIdRef = useRef("");
  const debouncedSave = useDebouncedCallback(
    () => {
      saveElements(JSON.stringify(api?.getSceneElements() ?? [], null, 2));
    },
    [api],
    1000,
    10000
  );

  useEffect(
    () => setElementsLength(props.elements.length),
    [props.elements.length]
  );

  const onResize = useCallback(
    (gridSize: number | null) => {
      debouncedSave();

      const scaleElement = currentEditingElementsRef.current.find(
        (x) => x.customData!.type === ElementTypes.scale
      ) as ExcalidrawTextElement;
      const burdenElement = currentEditingElementsRef.current.find(
        (x) => x.customData!.type === ElementTypes.burden
      ) as ExcalidrawTextElement;
      const containerWorkTime = currentEditingElementsRef.current.find(
        (x) => x.customData!.type === ElementTypes.containerWorkTime
      )!;

      const scale = Number(scaleElement.text.replace(/\D/g, ""));

      const newWorkTimeValue = String(
        Math.round(
          (containerWorkTime.height * containerWorkTime.width * scale) /
            Math.pow(gridSize ?? 20, 2)
        )
      );

      if (burdenElement.text !== newWorkTimeValue) {
        api?.updateScene({
          elements: [
            ...api
              .getSceneElementsIncludingDeleted()
              .filter((x) => x.id !== burdenElement.id),
            newElementWith(burdenElement, {
              text: newWorkTimeValue,
              originalText: newWorkTimeValue,
            }),
          ],
        });
      }
    },
    [api, debouncedSave]
  );

  const getElementsByCustomId = useCallback(
    (elements: readonly NonDeletedExcalidrawElement[], id: string) =>
      elements.filter((x) => x.customData?.id === id),
    []
  );

  const onScaleChange = useCallback(
    (
      appState: AppState,
      nonDeletedElements: readonly NonDeletedExcalidrawElement[]
    ) => {
      const scaleElement =
        lastEditedElementIdRef.current !== ""
          ? (nonDeletedElements.find(
              (x) => x.id === lastEditedElementIdRef.current
            ) as ExcalidrawTextElement | undefined)
          : undefined;
      if (
        appState.editingElement?.customData?.type !== ElementTypes.scale &&
        scaleElement?.customData?.type !== ElementTypes.scale
      )
        return;

      debouncedSave();

      if (
        appState.editingElement &&
        lastEditedElementIdRef.current !== appState.editingElement.id
      )
        lastEditedElementIdRef.current = appState.editingElement.id;

      if (appState.editingElement || !scaleElement) return;

      let newValue = scaleElement.text.replace(/\D/g, "");
      if (!newValue) newValue = "1";
      const customElements = getElementsByCustomId(
        nonDeletedElements,
        scaleElement.customData!.id
      );
      const burdenElement = customElements.find(
        (x) => x.customData!.type === ElementTypes.burden
      ) as ExcalidrawTextElement;
      const containerWorkTime = customElements.find(
        (x) => x.customData!.type === ElementTypes.containerWorkTime
      )!;
      const newWorkTimeValue = Math.round(
        (containerWorkTime.height *
          containerWorkTime.width *
          Number(newValue)) /
          Math.pow(appState.gridSize ?? 20, 2)
      );

      lastEditedElementIdRef.current = "";

      api?.updateScene({
        elements: [
          ...nonDeletedElements.filter((x) => {
            if (x.id === scaleElement.id) return false;
            if (x.id === burdenElement.id) return false;
            return true;
          }),
          {
            ...scaleElement,
            text: `x${newValue}`,
            originalText: `x${newValue}`,
          },
          {
            ...burdenElement,
            text: `${newWorkTimeValue}`,
            originalText: `${newWorkTimeValue}`,
          },
        ],
      });
    },
    [debouncedSave, getElementsByCustomId, api]
  );

  const onInsertDelete = useCallback(
    async (nonDeletedElements: readonly NonDeletedExcalidrawElement[]) => {
      if (!api) return;
      debouncedSave();

      const customElements = Object.groupBy(
        nonDeletedElements.filter((x) => x.customData?.id),
        (x) => x.customData?.id
      );

      Object.entries(customElements).forEach(([id, customElements]) => {
        if (customElements!.length !== 0 && customElements!.length !== 8)
          api.updateScene({
            elements: api
              .getSceneElementsIncludingDeleted()
              .filter((x) => !customElements!.includes(x)),
          });

        if (customElements!.length === 8 && id === "-1") {
          const newId = uuid();
          customElements!.forEach((element) => {
            mutateElement(element, {
              customData: { ...element.customData, id: `${newId}` },
            });
          });
        }
      });

      debouncedSave();
      setElementsLength(
        getNonDeletedElements(api.getSceneElements() ?? []).length
      );
    },
    [api, debouncedSave, setElementsLength]
  );

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (appState.theme !== theme.value) theme.set(appState.theme);

      const nonDeletedElements = getNonDeletedElements(elements);

      if (nonDeletedElements.length !== elementsLength) {
        console.log(
          "nonDeletedElements.length !== elementsLength",
          nonDeletedElements.length,
          elementsLength
        );
        onInsertDelete(nonDeletedElements);
      }

      if (appState.resizingElement?.customData) {
        const customElements = getElementsByCustomId(
          nonDeletedElements,
          appState.resizingElement.customData.id
        );

        if (customElements.length === 8) {
          if (currentEditingElementsRef.current.length === 0)
            currentEditingElementsRef.current = customElements;
          if (
            currentEditingElementsRef.current[0].customData?.id !==
            appState.resizingElement.customData.id
          )
            currentEditingElementsRef.current = customElements;
        } else currentEditingElementsRef.current = [];
      } else {
        if (currentEditingElementsRef.current.length === 8)
          onResize(appState.gridSize);
        currentEditingElementsRef.current = [];
      }

      onScaleChange(appState, nonDeletedElements);
    },
    [
      elementsLength,
      getElementsByCustomId,
      onInsertDelete,
      onResize,
      onScaleChange,
      theme,
    ]
  );

  useEffect(() => api?.onChange(onChange), [api, onChange]);

  return (
    <div className="editor">
      <Excalidraw
        autoFocus
        gridModeEnabled
        objectsSnapModeEnabled
        isCollaborating={false}
        langCode={locale.value === "en" ? "en-US" : "ru-RU"}
        theme={theme.value}
        UIOptions={{
          tools: { image: false },
          canvasActions: { toggleTheme: true },
        }}
        excalidrawAPI={setApi}
        initialData={{
          elements: restoreElements(props.elements, undefined),
          libraryItems: restoreLibraryItems(props.library, "unpublished"),
        }}
        onLibraryChange={(library) =>
          saveLibrary(JSON.stringify(library, null, 2))
        }
      >
        <WelcomeScreen>
          <WelcomeScreen.Hints.HelpHint />
          <WelcomeScreen.Hints.MenuHint />
          <WelcomeScreen.Hints.ToolbarHint />
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Logo />
            <WelcomeScreen.Center.Heading>
              {locale.value === "en"
                ? "Faculty of Biotechnologies ITMO University"
                : "Факультет Биотехнологий Университета ИТМО"}
            </WelcomeScreen.Center.Heading>
          </WelcomeScreen.Center>
        </WelcomeScreen>
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.Separator />
          <MainMenu.Item
            icon={<LanguagesIcon />}
            onSelect={() => locale.set(locale.value === "en" ? "ru" : "en")}
          >
            {locale.value === "en"
              ? "Сменить язык на русский"
              : "Change locale to english"}
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.Item
            icon={<LogOutIcon />}
            onSelect={async () =>
              await fetch("/logout", { method: "POST" }).finally(() =>
                router.refresh()
              )
            }
          >
            Logout
          </MainMenu.Item>
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
