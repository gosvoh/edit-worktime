"use server";

import { cookies } from "next/headers";
import { lucia, validateRequest } from "./auth";
import { DatabaseUser, db } from "./db";
import { Argon2id } from "oslo/password";
import { redirect } from "next/navigation";
import { generateId } from "lucia";
import { SqliteError } from "better-sqlite3";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";

export async function login(_: any, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const existingUser = db
    .prepare("SELECT * FROM user WHERE username = ?")
    .get(username) as DatabaseUser | undefined;
  if (!existingUser) return { error: "Incorrect username or password" };
  const validPassword = await new Argon2id().verify(
    existingUser.password,
    password
  );
  if (!validPassword) return { error: "Incorrect username or password" };

  const session = await lucia.createSession(existingUser.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return redirect("/");
}

export async function register(_: any, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const hashedPassword = await new Argon2id().hash(password);
  const userId = generateId(15);

  try {
    db.prepare("INSERT INTO user (id, username, password) VALUES(?, ?, ?)").run(
      userId,
      username,
      hashedPassword
    );

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
  } catch (e) {
    if (e instanceof SqliteError && e.code === "SQLITE_CONSTRAINT_UNIQUE")
      return { error: "Username already used" };

    return { error: "An unknown error occurred" };
  }

  return redirect("/");
}

export async function logout() {
  const { session } = await validateRequest();
  if (!session) return { error: "Unauthorized" };

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return redirect("/");
}

export async function saveElements(elements: string) {
  const { user } = await validateRequest();
  if (!user) return;

  try {
    await writeFile("elements.json", elements, "utf-8");
  } catch {}
}

export async function saveLibrary(library: string) {
  const { user } = await validateRequest();
  if (!user) return;

  try {
    await writeFile("library.json", library, "utf-8");
  } catch {}
}
