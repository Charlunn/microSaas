import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATH_PREFIX = "/admin";
const ADMIN_API_PREFIX = "/api/admin";
const LOGIN_PATH = "/admin/login";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith(ADMIN_PATH_PREFIX) && pathname !== LOGIN_PATH;
  const isAdminApi = pathname.startsWith(ADMIN_API_PREFIX) && pathname !== "/api/admin/session";

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const hasAuthHeader = !!request.headers.get("authorization");
  const hasCookieToken = !!request.cookies.get("admin_access_token")?.value;

  if (hasAuthHeader || hasCookieToken) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", error: "Admin login required" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
