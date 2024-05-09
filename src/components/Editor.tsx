"use client";

import { logout, saveElements } from "@/lib/actions";
import { Users, update } from "@/lib/excelActions";
import {
  Excalidraw,
  MainMenu,
  THEME,
  WelcomeScreen,
  convertToExcalidrawElements,
  getNonDeletedElements,
  mutateElement,
  newElementWith,
  restoreElements,
  restoreLibraryItems,
} from "@excalidraw/excalidraw";
import { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/types/data/transform";
import {
  ExcalidrawElement,
  ExcalidrawTextElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/excalidraw/types/element/types";
import {
  AppState,
  ExcalidrawImperativeAPI,
  LibraryItems,
} from "@excalidraw/excalidraw/types/types";
import { useDebouncedCallback, useLocalStorageValue } from "@react-hookz/web";
import { LanguagesIcon, LogOutIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";

enum ElementTypes {
  name = "name",
  nameContainer = "nameContainer",
  rate = "rate",
  rateContainer = "rateContainer",
  burden = "burden",
  maxWorkTime = "maxWorkTime",
  burdenContainer = "burdenContainer",
  maxWorkTimeContainer = "maxWorkTimeContainer",
  burdenTextContainer = "burdenTextContainer",
  maxWorkTimeTextContainer = "maxWorkTimeTextContainer",
}

const template: (ExcalidrawElementSkeleton & {
  customData: { id: string; type: ElementTypes };
  label?: {
    text: string;
    customData: { id: string; type: ElementTypes };
  };
  x: number;
  y: number;
  height: number;
  width: number;
  backgroundColor?: string;
})[] = [
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    roundness: { type: 3 },
    label: {
      text: "Сотрудников Сотрудник Сотрудникович",
      customData: {
        id: "-1",
        type: ElementTypes.name,
      },
    },
    customData: {
      id: "-1",
      type: ElementTypes.nameContainer,
    },
  },
  {
    type: "rectangle",
    x: 0,
    y: 100,
    width: 500,
    height: 300,
    roundness: { type: 3 },
    customData: {
      id: "-1",
      type: ElementTypes.maxWorkTimeContainer,
    },
  },
  {
    type: "rectangle",
    x: 200,
    y: 0,
    width: 100,
    height: 100,
    roundness: { type: 3 },
    label: {
      text: "Ставка:\n1",
      customData: {
        id: "-1",
        type: ElementTypes.rate,
      },
    },
    customData: {
      id: "-1",
      type: ElementTypes.rateContainer,
    },
  },
  {
    type: "rectangle",
    x: 0,
    y: 100,
    backgroundColor: "hsl(88,100%,50%)",
    fillStyle: "hachure",
    width: 200,
    height: 200,
    roundness: { type: 3 },
    customData: {
      id: "-1",
      type: ElementTypes.burdenContainer,
    },
  },
  {
    type: "rectangle",
    x: 300,
    y: 0,
    width: 100,
    height: 100,
    roundness: { type: 3 },
    label: {
      text: "400",
      customData: {
        id: "-1",
        type: ElementTypes.burden,
      },
    },
    customData: {
      id: "-1",
      type: ElementTypes.burdenTextContainer,
    },
  },
  {
    type: "rectangle",
    x: 400,
    y: 0,
    width: 100,
    height: 100,
    roundness: { type: 3 },
    label: {
      text: "1500",
      customData: {
        id: "-1",
        type: ElementTypes.maxWorkTime,
      },
    },
    customData: {
      id: "-1",
      type: ElementTypes.maxWorkTimeTextContainer,
    },
  },
];

function getColor(value: number) {
  var hue = (1 - (value < 0 ? 0 : value > 1 ? 1 : value)) * 120;
  return ["hsl(", hue, ",100%,50%)"].join("");
}

function parseNumber(value: string) {
  return parseFloat(
    value
      .replace(",", ".")
      .replace(/(?:\r\n|\r|\n)/g, "")
      .match(/[+-]?\d+(\.\d+)?$/)?.[0] ?? "0"
  );
}

export default function Editor(props: {
  elements: readonly NonDeletedExcalidrawElement[];
  library?: LibraryItems;
  users: Users[];
  isAdmin: boolean;
}) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI>();
  const locale = useLocalStorageValue<"ru" | "en">("locale", {
    defaultValue: "en",
  });
  const theme = useLocalStorageValue<(typeof THEME)[keyof typeof THEME]>(
    "theme",
    { defaultValue: THEME.DARK }
  );
  const [elementsLength, setElementsLength] = useState(props.elements.length);
  const currentEditingElementsRef = useRef<ExcalidrawElement[]>([]);
  const resizingElementRef = useRef<NonDeletedExcalidrawElement>();
  const lastEditedElementRef = useRef<NonDeletedExcalidrawElement>();
  const debouncedSave = useDebouncedCallback(
    () => {
      if (!api) return;

      const elements = api.getSceneElements() ?? [];
      saveElements(JSON.stringify(elements, null, 2));
      const employeesElements = Object.groupBy(
        getNonDeletedElements(elements),
        (x) => x.customData?.id
      );
      const employees: Users[] = [];
      Object.entries(employeesElements).forEach(([id, elements]) => {
        if (id === "undefined" || !elements) return;
        const employee = {
          ФИО: (
            elements.find(
              (x) => x.customData?.type === ElementTypes.name
            ) as ExcalidrawTextElement
          ).text,
          Ставка: parseNumber(
            (
              elements.find(
                (x) => x.customData?.type === ElementTypes.rate
              ) as ExcalidrawTextElement
            ).text ?? "1"
          ),
          Нагрузка: parseNumber(
            (
              elements.find(
                (x) => x.customData?.type === ElementTypes.burden
              ) as ExcalidrawTextElement
            ).text ?? "0"
          ),
          id,
        };
        employees.push(employee);
      });
      update(employees);
    },
    [api],
    1000,
    10000
  );

  useEffect(
    () => setElementsLength(props.elements.length),
    [props.elements.length]
  );

  const updateBurdenColor = useCallback(() => {
    if (!api || !lastEditedElementRef.current) return;

    const elements = api.getSceneElementsIncludingDeleted();
    const burdenContainer = elements.find(
      (x) =>
        x.customData?.id === lastEditedElementRef.current?.customData?.id &&
        x.customData?.type === ElementTypes.burdenContainer
    );
    const burdenTextContainer = elements.find(
      (x) =>
        x.customData?.id === lastEditedElementRef.current?.customData?.id &&
        x.customData?.type === ElementTypes.burdenTextContainer
    );
    const maxWorkTime = elements.find(
      (x) =>
        x.customData?.id === lastEditedElementRef.current?.customData?.id &&
        x.customData?.type === ElementTypes.maxWorkTime
    ) as ExcalidrawTextElement | undefined;

    if (!burdenContainer || !burdenTextContainer || !maxWorkTime) return;

    const newColor = getColor(
      Number(
        (
          elements.find(
            (x) =>
              x.customData?.id ===
                lastEditedElementRef.current?.customData?.id &&
              x.customData?.type === ElementTypes.burden
          ) as ExcalidrawTextElement
        ).text
      ) / Number(maxWorkTime.text)
    );

    api.updateScene({
      elements: [
        ...elements.filter((x) => {
          if (x.id === burdenContainer.id) return false;
          // if (x.id === burdenTextContainer.id) return false;
          return true;
        }),
        newElementWith(burdenContainer, { backgroundColor: newColor }),
        // newElementWith(burdenTextContainer, { backgroundColor: newColor }),
      ],
    });
  }, [api]);

  const onResize = useCallback(() => {
    if (!resizingElementRef.current || !currentEditingElementsRef.current)
      return;
    debouncedSave();

    const key = resizingElementRef.current.customData!.type as ElementTypes;

    if (
      ![
        ElementTypes.burdenContainer,
        ElementTypes.maxWorkTimeContainer,
      ].includes(key)
    )
      return;

    const textElement = currentEditingElementsRef.current.find(
      (x) => x.customData!.type === key.replace("Container", "")
    ) as ExcalidrawTextElement;

    const newWorkTextValue = Math.round(
      (resizingElementRef.current.height * resizingElementRef.current.width) /
        100
    );
    if (textElement.text !== String(newWorkTextValue)) {
      const elements =
        api?.getSceneElementsIncludingDeleted().filter((x) => {
          if (x.id === textElement.id) return false;
          return true;
        }) ?? [];

      elements.push(
        newElementWith(textElement, {
          text: String(newWorkTextValue),
          originalText: String(newWorkTextValue),
          textAlign: "center",
          verticalAlign: "middle",
        })
      );

      if (key === ElementTypes.maxWorkTimeContainer) {
        const rate = currentEditingElementsRef.current.find(
          (x) => x.customData!.type === ElementTypes.rate
        ) as ExcalidrawTextElement;
        const newRate = Math.round((newWorkTextValue / 1500) * 100) / 100;
        elements.splice(
          elements.findIndex((x) => x.id === rate.id),
          1,
          newElementWith(rate, {
            text: `Ставка:\n${newRate}`,
            originalText: `Ставка:\n${newRate}`,
          })
        );
      }

      api?.updateScene({ elements });
      lastEditedElementRef.current = resizingElementRef.current;
      updateBurdenColor();
      lastEditedElementRef.current = undefined;
    }
  }, [api, debouncedSave, updateBurdenColor]);

  const getElementsByCustomId = useCallback(
    (elements: readonly NonDeletedExcalidrawElement[], id: string) =>
      elements.filter((x) => x.customData?.id === id),
    []
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
        if (customElements!.length !== 0 && customElements!.length !== 10)
          api.updateScene({
            elements: api
              .getSceneElementsIncludingDeleted()
              .filter((x) => !customElements!.includes(x)),
          });

        if (customElements!.length === 10 && id === "-1") {
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

  const onTextEdit = useCallback(() => {
    if (
      !lastEditedElementRef.current ||
      !api ||
      lastEditedElementRef.current.type !== "text"
    )
      return;
    debouncedSave();

    const id = lastEditedElementRef.current.customData!.id as string;
    const key = lastEditedElementRef.current.customData!.type as ElementTypes;

    if (
      ![
        ElementTypes.burden,
        ElementTypes.maxWorkTime,
        ElementTypes.rate,
      ].includes(key)
    )
      return;

    let elements = api
      .getSceneElementsIncludingDeleted()
      .filter((x) => x.customData?.id === id);

    const rate = elements.find(
      (x) => x.customData!.type === ElementTypes.rate
    ) as ExcalidrawTextElement;
    const rateContainer = elements.find(
      (x) => x.customData!.type === ElementTypes.rateContainer
    ) as NonDeletedExcalidrawElement;
    const burden = elements.find(
      (x) => x.customData!.type === ElementTypes.burden
    ) as ExcalidrawTextElement;
    const burdenContainer = elements.find(
      (x) => x.customData!.type === ElementTypes.burdenContainer
    ) as NonDeletedExcalidrawElement;
    const maxWorkTime = elements.find(
      (x) => x.customData!.type === ElementTypes.maxWorkTime
    ) as ExcalidrawTextElement;
    const maxWorkTimeContainer = elements.find(
      (x) => x.customData!.type === ElementTypes.maxWorkTimeContainer
    ) as NonDeletedExcalidrawElement;

    const numberValue = parseNumber(
      (
        elements.find(
          (x) => x.id === lastEditedElementRef.current!.id
        ) as ExcalidrawTextElement
      ).text
    );

    if (key === ElementTypes.rate) {
      elements =
        api.getSceneElementsIncludingDeleted().filter((x) => {
          if (x.id === rate.containerId || x.id === rate.id) return false;
          if (x.id === maxWorkTime.id) return false;
          if (x.id === maxWorkTimeContainer.id) return false;
          return true;
        }) ?? [];
      const aspectRatio = 5 / 3;
      const height = Math.sqrt(
        (1500 * (numberValue > 0 ? numberValue : 1) * 100) / aspectRatio
      );
      const width = aspectRatio * height;

      elements.push(
        ...convertToExcalidrawElements([
          {
            x: rateContainer.x,
            y: rateContainer.y,
            width: rateContainer.width,
            height: rateContainer.height,
            type: "rectangle",
            roundness: { type: 3 },
            customData: {
              id,
              type: ElementTypes.rateContainer,
            },
            label: {
              text: `Ставка:\n${numberValue > 0 ? numberValue : 1}`,
              customData: {
                id,
                type: ElementTypes.rate,
              },
            },
          },
        ]),
        newElementWith(maxWorkTime, {
          text: String(Math.round(1500 * (numberValue > 0 ? numberValue : 1))),
          originalText: String(
            Math.round(1500 * (numberValue > 0 ? numberValue : 1))
          ),
          textAlign: "center",
          verticalAlign: "middle",
        }),
        newElementWith(maxWorkTimeContainer, {
          width,
          height,
        })
      );
    }
    if (key === ElementTypes.burden) {
      elements =
        api.getSceneElementsIncludingDeleted().filter((x) => {
          if (x.id === burdenContainer.id) return false;
          return true;
        }) ?? [];

      const aspectRatio =
        maxWorkTimeContainer.width / maxWorkTimeContainer.height;
      const height = Math.sqrt((numberValue * 100) / aspectRatio);
      const width = aspectRatio * height;

      elements.push(
        newElementWith(burdenContainer, {
          width,
          height,
          x: maxWorkTimeContainer.x,
          y: maxWorkTimeContainer.y,
        })
      );
    }
    if (key === ElementTypes.maxWorkTime) {
      elements =
        api.getSceneElementsIncludingDeleted().filter((x) => {
          if (x.id === maxWorkTimeContainer.id) return false;
          if (x.id === rate.id) return false;
          return true;
        }) ?? [];

      const aspectRatio = 5 / 3;
      const height = Math.sqrt(
        ((numberValue > 10 ? numberValue : 1500) * 100) / aspectRatio
      );
      const width = aspectRatio * height;
      const newRate =
        Math.round(((numberValue > 10 ? numberValue : 1500) / 1500) * 100) /
        100;
      elements.push(
        newElementWith(maxWorkTimeContainer, { width, height }),
        newElementWith(rate, {
          text: `Ставка:\n${newRate}`,
          originalText: `Ставка:\n${newRate}`,
        })
      );
    }

    api.updateScene({ elements });
    updateBurdenColor();

    lastEditedElementRef.current = undefined;
  }, [api, debouncedSave, updateBurdenColor]);

  const initializeElements = useMemo(() => {
    let elements = restoreElements(props.elements, undefined);
    if (!props.users.length) {
      setElementsLength(elements.length);
      return elements;
    }

    const users = props.users;

    elements = elements.filter((x) => !x.customData?.id);

    const squareSize = Math.floor(Math.sqrt(users.length));
    users.forEach((user, i) => {
      const newElements = JSON.parse(
        JSON.stringify(template)
      ) as typeof template;
      newElements.forEach((element) => {
        element.customData.id = user.id;
        if (element.label) element.label.customData.id = user.id;
        element.x += 750 * (i % squareSize);
        element.y += 750 * Math.floor(i / squareSize);

        switch (element.customData?.type) {
          case ElementTypes.nameContainer:
            element.label!.text = user.ФИО;
            break;
          case ElementTypes.maxWorkTimeContainer: {
            const aspectRatio = 5 / 3;
            element.height = Math.sqrt(
              (1500 * user.Ставка * 100) / aspectRatio
            );
            element.width = aspectRatio * element.height;
            break;
          }
          case ElementTypes.rateContainer:
            element.label!.text = `Ставка:\n${user.Ставка}`;
            break;
          case ElementTypes.burdenTextContainer:
            element.label!.text = String(user.Нагрузка);
            break;
          case ElementTypes.burdenContainer: {
            element.backgroundColor = getColor(
              user.Нагрузка / (1500 * user.Ставка)
            );
            const aspectRatio = 5 / 3;
            element.height = Math.sqrt((user.Нагрузка * 100) / aspectRatio);
            element.width = aspectRatio * element.height;
            break;
          }
          case ElementTypes.maxWorkTime: {
            const aspectRatio = 5 / 3;
            element.height = Math.sqrt(
              (1500 * user.Ставка * 100) / aspectRatio
            );
            element.width = aspectRatio * element.height;
            break;
          }
          case ElementTypes.maxWorkTimeTextContainer:
            element.label!.text = String(Math.round(1500 * user.Ставка));
            break;
        }
      });
      elements.push(...convertToExcalidrawElements(newElements));
    });

    // @ts-ignore TODO fix
    if (!props.isAdmin) elements.forEach((x) => (x.locked = true));

    setElementsLength(elements.length);
    return elements;
  }, [props.elements, props.isAdmin, props.users]);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (appState.theme !== theme.value) theme.set(appState.theme);

      const nonDeletedElements = getNonDeletedElements(elements);
      if (nonDeletedElements.length !== elementsLength)
        onInsertDelete(nonDeletedElements);

      if (
        appState.editingElement &&
        appState.editingElement.customData?.id &&
        !lastEditedElementRef.current
      )
        lastEditedElementRef.current = appState.editingElement;
      if (!appState.editingElement && lastEditedElementRef.current) {
        onTextEdit();
      }

      if (appState.resizingElement?.customData) {
        const customElements = getElementsByCustomId(
          nonDeletedElements,
          appState.resizingElement.customData.id
        );
        resizingElementRef.current = appState.resizingElement;

        if (customElements.length === 10) {
          if (currentEditingElementsRef.current.length === 0)
            currentEditingElementsRef.current = customElements;
          if (
            currentEditingElementsRef.current[0].customData?.id !==
            appState.resizingElement.customData.id
          )
            currentEditingElementsRef.current = customElements;
        } else currentEditingElementsRef.current = [];
      } else {
        if (currentEditingElementsRef.current.length === 10) {
          onResize();
        }
        currentEditingElementsRef.current = [];
      }
    },
    [
      elementsLength,
      getElementsByCustomId,
      onInsertDelete,
      onResize,
      onTextEdit,
      theme,
    ]
  );

  useEffect(() => api?.onChange(onChange), [api, onChange]);

  return (
    <div className="editor">
      <Excalidraw
        autoFocus
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
          elements: initializeElements,
          libraryItems: restoreLibraryItems(props.library, "unpublished"),
        }}
        // onLibraryChange={(library) =>
        //   saveLibrary(JSON.stringify(library, null, 2))
        // }
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
          {props.isAdmin && (
            <>
              <MainMenu.ItemLink href="/admin" target="_parent">
                {locale.value === "en"
                  ? "Admin panel"
                  : "Панель администратора"}
              </MainMenu.ItemLink>
              <MainMenu.Separator />
            </>
          )}
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
            onSelect={async () => await logout()}
          >
            {`${props.isAdmin ? "Admin" : "Viewer"} - ${
              locale.value === "en" ? "Log out" : "Выйти"
            }`}
          </MainMenu.Item>
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
