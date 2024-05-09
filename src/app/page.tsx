import { Users, read } from "@/lib/excelActions";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { readFile } from "fs/promises";
import dyn from "next/dynamic";
import { auth, signIn } from "./auth";

const Editor = dyn(async () => (await import("@/components/Editor")).default, {
  ssr: false,
});

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session) await signIn();

  const users = JSON.parse(await read()) as Users[];
  const elements = JSON.parse(
    await readFile("elements.json", "utf-8").catch(() => "[]")
  ) as ExcalidrawElement[];

  return (
    <main>
      <Editor
        isAdmin={session?.user?.name === "admin" ? true : false}
        users={users}
        elements={elements}
        // library={await readFile("library.json", "utf-8")
        //   .then(JSON.parse)
        //   .catch(() => [])}
      />
    </main>
  );
}
