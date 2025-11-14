
import { IronSession, getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, defaultSession } from "@/lib/types";
import dotenv from "dotenv";

dotenv.config();

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), {
    password: process.env.SECRET_COOKIE_PASSWORD as string,
    cookieName: "user-session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
    },
  });
}
