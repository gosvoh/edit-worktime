import { validateRequest } from "@/lib/auth";
import { readFile } from "fs/promises";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

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
        elements={await readFile("elements.json", "utf-8")
          .then(JSON.parse)
          .catch(() => [])}
        library={await readFile("library.json", "utf-8")
          .then(JSON.parse)
          .catch(() => [])}
      />
    </main>
  );
}
