import * as fs from "fs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = await fs.promises.readFile("private/file.xlsx");
  const ret = new NextResponse(file);
  ret.headers.set(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  return ret;
}
