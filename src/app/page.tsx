import { validateRequest } from "@/lib/auth";
import { Users, read } from "@/lib/excelActions";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { readFile } from "fs/promises";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { v4 as uuid } from "uuid";

const Editor = dynamic(
  async () => (await import("@/components/Editor")).default,
  { ssr: false }
);

export default async function Home() {
  const { user } = await validateRequest();
  if (!user) return redirect("/login");

  return (
    <main>
      <Editor
        isAdmin={user.admin === 0 ? false : true}
        users={JSON.parse(await read()) as Users[]}
        elements={await readFile("elements.json", "utf-8")
          .then(JSON.parse)
          .catch(() => [])}
        // library={await readFile("library.json", "utf-8")
        //   .then(JSON.parse)
        //   .catch(() => [])}
      />
    </main>
  );
}
