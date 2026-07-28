import { NextResponse } from "next/server";
import { accessToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const configuredCode = process.env.APP_ACCESS_CODE;
  if (!configuredCode) {
    return NextResponse.json({ error: "Access is not configured" }, { status: 503 });
  }
  const { code } = (await request.json()) as { code?: string };
  if (!code || (await accessToken(code)) !== (await accessToken(configuredCode))) {
    return NextResponse.json({ error: "That access code is not correct" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, await accessToken(configuredCode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
