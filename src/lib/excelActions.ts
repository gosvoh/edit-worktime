"use server";

import * as XLSX from "xlsx";
import * as fs from "fs";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";
XLSX.set_fs(fs);

const filepath = "private/file.xlsx";

export type Users = {
  id: string;
  ФИО: string;
  Ставка: number;
  Нагрузка: number;
};

const readWorkbook = async () => {
  const file = await fs.promises.readFile(filepath);
  return XLSX.read(file);
};

export async function read() {
  const workbook = await readWorkbook();
  const users: Users[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[workbook.SheetNames[0]]
  );
  return JSON.stringify(users);
}

export async function update(users: Users[]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(users));
  XLSX.writeFile(workbook, filepath, { compression: true });
}

export async function updateRow(user: Users) {
  const workbook = await readWorkbook();
  const users: Users[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[workbook.SheetNames[0]]
  );
  const index = users.findIndex((x) => x.id === user.id);
  users[index] = user;
  workbook.Sheets[workbook.SheetNames[0]] = XLSX.utils.json_to_sheet(users);
  XLSX.writeFile(workbook, filepath, { compression: true });
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
  XLSX.writeFile(workbook, filepath, { compression: true });
  revalidatePath("/admin");
}

export async function download() {
  const file = await fs.promises.readFile(filepath);
  const fd = new FormData();
  fd.append(
    "file",
    new Blob([file], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filepath
  );
  return JSON.stringify(fd);
}
