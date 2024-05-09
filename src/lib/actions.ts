"use server";

import { signOut } from "@/app/auth";
import { writeFile } from "fs/promises";

export async function logout() {
  await signOut();
}

export async function saveElements(elements: string) {
  try {
    await writeFile("private/elements.json", elements, "utf-8");
  } catch {}
}

export async function saveLibrary(library: string) {
  try {
    await writeFile("private/library.json", library, "utf-8");
  } catch {}
}
