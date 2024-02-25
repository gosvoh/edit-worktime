import { logout } from "@/lib/actions";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function POST() {
  const res = await logout();
  if (res && res.error)
    return NextResponse.json(res, { status: 400, statusText: res.error });
  revalidatePath("/");
  return NextResponse.redirect("/");
}
