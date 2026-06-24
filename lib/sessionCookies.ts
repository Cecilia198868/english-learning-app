import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function isSessionCookieName(name: string) {
  return SESSION_COOKIE_NAMES.some(
    (cookieName) => name === cookieName || name.startsWith(`${cookieName}.`)
  );
}

export function clearNextAuthSessionCookies(
  request: NextRequest,
  response: NextResponse
) {
  request.cookies
    .getAll()
    .filter((cookie) => isSessionCookieName(cookie.name))
    .forEach((cookie) => {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    });

  SESSION_COOKIE_NAMES.forEach((cookieName) => {
    response.cookies.set(cookieName, "", {
      expires: new Date(0),
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  });

  return response;
}
