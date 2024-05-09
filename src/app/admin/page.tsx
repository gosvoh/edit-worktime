import { redirect } from "next/navigation";
import UsersTable from "./EditableTable";
import { Users, read } from "@/lib/excelActions";
import { auth } from "../auth";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const session = await auth();
  if (!session || session.user?.name !== "admin") return redirect("/");

  const users: Users[] = JSON.parse(await read());

  return <UsersTable users={users} />;
}
