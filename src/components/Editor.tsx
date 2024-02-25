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
} from "@excalidraw/excalidraw";
import { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import {
  ExcalidrawImperativeAPI,
  LibraryItems,
} from "@excalidraw/excalidraw/types/types";
import { useLocalStorageValue } from "@react-hookz/web";
import { LanguagesIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

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

  useEffect(() => {
    const interval = setInterval(
      async () =>
        await saveElements(JSON.stringify(api?.getSceneElements() ?? [])),
      10000
    );
    return () => clearInterval(interval);
  }, [api]);

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
        onChange={async (elements, appState, files) => {
          if (appState.theme !== theme.value) theme.set(appState.theme);
          const nonDeletedElements = elements.filter((x) => !x.isDeleted);
          if (nonDeletedElements.length !== elementsLength) {
            const customElements = nonDeletedElements.filter(
              (x) => x.customData?.id === "-1"
            );
            if (customElements.length !== 0 && customElements.length !== 6) {
              customElements.forEach((element) => {
                mutateElement(element, { isDeleted: true });
              });
              api?.updateScene({
                elements: nonDeletedElements.filter((x) => !x.isDeleted),
              });
            }
            if (customElements.length === 6) {
              const newId = uuid();
              customElements.forEach((element) => {
                mutateElement(element, {
                  customData: { ...element.customData, id: `${newId}` },
                });
              });
            }

            await saveElements(JSON.stringify(nonDeletedElements));
            setElementsLength(nonDeletedElements.length);
          }
        }}
        onLibraryChange={async (library) =>
          await saveLibrary(JSON.stringify(library))
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
