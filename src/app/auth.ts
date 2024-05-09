import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const user = await prisma.user.findFirst({
          where: { name: credentials.username as string },
        });

        // if (!user)
        //   return await prisma.user.create({
        //     data: {
        //       name: credentials.username as string,
        //       password: await bcrypt.hash(credentials.password as string, 10),
        //     },
        //   });

        if (!user) return null;

        if (await bcrypt.compare(credentials.password as string, user.password))
          return user;
        return null;
      },
    }),
  ],
});
