"use client";

import {
  Excalidraw,
  restore,
  restoreLibraryItems,
  restoreAppState,
  restoreElements,
  serializeAsJSON,
  serializeLibraryAsJSON,
} from "@excalidraw/excalidraw";
import type { LibraryItem } from "@excalidraw/excalidraw/types/types";
import { useEffect, useState } from "react";

export default function Editor() {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>();

  useEffect(() => {
    const libJson = localStorage.getItem("libraryItems");
    if (!libJson) return;
    const libObj = JSON.parse(libJson);
    const lib = restoreLibraryItems(libObj, "unpublished");
    setLibraryItems(lib);
    console.log(lib);
  }, []);

  if (!document) return <></>;

  return (
    <div className="editor">
      <Excalidraw
        initialData={{ libraryItems }}
        onLibraryChange={(items) =>
          localStorage.setItem("libraryItems", serializeLibraryAsJSON(items))
        }
      />
    </div>
  );
}
