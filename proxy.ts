import { NextRequest, NextResponse } from "next/server";
import { accessToken, AUTH_COOKIE } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const accessCode = process.env.APP_ACCESS_CODE;
  if (!accessCode) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("APP_ACCESS_CODE is not configured", { status: 503 });
  }

  const pathname = request.nextUrl.pathname;
  if (pathname === "/login" || pathname === "/api/auth") return NextResponse.next();

  const authorized = request.cookies.get(AUTH_COOKIE)?.value === await accessToken(accessCode);
  if (authorized) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
