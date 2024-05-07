import { BetterSqlite3Adapter } from "@lucia-auth/adapter-sqlite";
import { Lucia, type Session, type User } from "lucia";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, DatabaseUser } from "./db";

const adapter = new BetterSqlite3Adapter(db, {
  user: "user",
  session: "session",
});

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (attributes) => ({
    username: attributes.username,
    admin: attributes.admin,
  }),
});

export const validateRequest = cache(
  async (): Promise<
    | { user: User & { admin: number }; session: Session }
    | { user: null; session: null }
  > => {
    const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
    if (!sessionId) return { user: null, session: null };

    const result = await lucia.validateSession(sessionId);
    try {
      if (result.session && result.session.fresh) {
        const sessionCookie = lucia.createSessionCookie(result.session.id);
        cookies().set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );
      }
      if (!result.session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        cookies().set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );
      }
    } catch {}
    // @ts-ignore
    return result;
  }
);

declare module "lucia" {
  interface Register {
    Lucia: typeof Lucia;
    DatabaseUserAttributes: Omit<DatabaseUser, "id"> & { admin: number };
  }
}
