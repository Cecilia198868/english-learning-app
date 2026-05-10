import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SignInResponse = {
  url?: string;
};

function getSetCookieHeaders(headers: Headers) {
  const headerWithHelpers = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headerWithHelpers.getSetCookie === "function") {
    return headerWithHelpers.getSetCookie();
  }

  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

function cookiePair(setCookie: string) {
  return setCookie.split(";")[0];
}

function appendSetCookies(response: NextResponse, cookies: string[]) {
  cookies.forEach((cookie) => {
    response.headers.append("set-cookie", cookie);
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const callbackUrl = new URL("/dashboard", origin).toString();
  const incomingCookie = request.headers.get("cookie") ?? "";

  const csrfResponse = await fetch(new URL("/api/auth/csrf", origin), {
    cache: "no-store",
    headers: incomingCookie ? { cookie: incomingCookie } : undefined,
  });

  if (!csrfResponse.ok) {
    return NextResponse.redirect(new URL("/login?google=csrf", origin));
  }

  const csrfData = (await csrfResponse.json()) as { csrfToken?: string };

  if (!csrfData.csrfToken) {
    return NextResponse.redirect(new URL("/login?google=csrf", origin));
  }

  const csrfCookies = getSetCookieHeaders(csrfResponse.headers);
  const cookieHeader = [incomingCookie, ...csrfCookies.map(cookiePair)]
    .filter(Boolean)
    .join("; ");

  const signInResponse = await fetch(
    new URL("/api/auth/signin/google", origin),
    {
      method: "POST",
      cache: "no-store",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        callbackUrl,
        json: "true",
      }),
    }
  );

  if (!signInResponse.ok) {
    return NextResponse.redirect(new URL("/login?google=signin", origin));
  }

  const signInData = (await signInResponse.json()) as SignInResponse;

  if (!signInData.url || signInData.url.includes("csrf=true")) {
    return NextResponse.redirect(new URL("/login?google=signin", origin));
  }

  const response = NextResponse.redirect(signInData.url);
  appendSetCookies(response, csrfCookies);
  appendSetCookies(response, getSetCookieHeaders(signInResponse.headers));

  return response;
}
