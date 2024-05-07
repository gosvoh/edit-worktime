"use server";

import * as XLSX from "xlsx";
import * as fs from "fs";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";
XLSX.set_fs(fs);

export type Users = {
  id: string;
  ФИО: string;
  Ставка: number;
  Нагрузка: number;
};

export async function read() {
  const file = await fs.promises.readFile("file.xlsx");
  const workbook = XLSX.read(file);
  const users: Users[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[workbook.SheetNames[0]]
  );
  return JSON.stringify(users);
}

export async function update() {
  revalidatePath("/admin");
}

export async function upload(formData: FormData) {
  const file = formData.get("file") as File;
  let workbook = XLSX.read(await file.arrayBuffer());
  const users: Users[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[workbook.SheetNames[0]]
  );
  users.forEach((x) => (x.id = uuid()));
  workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(users));
  XLSX.writeFile(workbook, "file.xlsx", { compression: true });
  revalidatePath("/admin");
}

export async function download() {
  const file = await fs.promises.readFile("file.xlsx");
  const fd = new FormData();
  fd.append(
    "file",
    new Blob([file], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "file.xlsx"
  );
  return JSON.stringify(fd);
}
