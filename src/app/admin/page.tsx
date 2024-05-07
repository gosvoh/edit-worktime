import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button, Table } from "antd";
import UsersTable from "./Table";
import { Users, read } from "@/lib/excelActions";

export default async function Admin() {
  const { user } = await validateRequest();
  if (!user || !user.admin) return redirect("/login");

  const users: Users[] = JSON.parse(await read());

  return <UsersTable users={users} />;
}
