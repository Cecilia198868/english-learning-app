import { isAppleAuthConfigured } from "@/auth";
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appleHandoffResponse(url: string) {
  const escapedUrl = escapeHtml(url);

  return new NextResponse(
    `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SpeakFlow</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #090110;
        color: white;
        font-family: Arial, sans-serif;
      }
      main {
        width: min(100vw - 40px, 390px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 32px;
        padding: 34px 24px;
        text-align: center;
        background: linear-gradient(145deg, rgba(28, 50, 72, 0.88), rgba(45, 16, 55, 0.88));
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.4);
      }
      h1 {
        margin: 0;
        font-size: 28px;
      }
      h1,
      p,
      a {
        -webkit-text-stroke: 0.55px rgba(0, 0, 0, 0.94);
        paint-order: stroke fill;
        text-shadow:
          0 1px 0 rgba(0, 0, 0, 0.9),
          1px 0 0 rgba(0, 0, 0, 0.78),
          -1px 0 0 rgba(0, 0, 0, 0.78),
          0 -1px 0 rgba(0, 0, 0, 0.66);
        -webkit-font-smoothing: antialiased;
      }
      p {
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.6;
        margin: 16px 0 26px;
      }
      a {
        display: inline-flex;
        justify-content: center;
        width: 100%;
        box-sizing: border-box;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 999px;
        padding: 16px 20px;
        text-decoration: none;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.12);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>SpeakFlow</h1>
      <p>点击下面的按钮继续使用 Apple 登录。</p>
      <a href="${escapedUrl}">继续使用 Apple</a>
    </main>
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    }
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const callbackUrl = new URL("/dashboard", origin).toString();
  const incomingCookie = request.headers.get("cookie") ?? "";

  if (!isAppleAuthConfigured) {
    return NextResponse.redirect(new URL("/login?apple=not-configured", origin));
  }

  const csrfResponse = await fetch(new URL("/api/auth/csrf", origin), {
    cache: "no-store",
    headers: incomingCookie ? { cookie: incomingCookie } : undefined,
  });

  if (!csrfResponse.ok) {
    return NextResponse.redirect(new URL("/login?apple=csrf", origin));
  }

  const csrfData = (await csrfResponse.json()) as { csrfToken?: string };

  if (!csrfData.csrfToken) {
    return NextResponse.redirect(new URL("/login?apple=csrf", origin));
  }

  const csrfCookies = getSetCookieHeaders(csrfResponse.headers);
  const cookieHeader = [incomingCookie, ...csrfCookies.map(cookiePair)]
    .filter(Boolean)
    .join("; ");

  const signInResponse = await fetch(new URL("/api/auth/signin/apple", origin), {
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
  });

  if (!signInResponse.ok) {
    return NextResponse.redirect(new URL("/login?apple=signin", origin));
  }

  const signInData = (await signInResponse.json()) as SignInResponse;

  if (!signInData.url || signInData.url.includes("csrf=true")) {
    return NextResponse.redirect(new URL("/login?apple=signin", origin));
  }

  const response = appleHandoffResponse(signInData.url);
  appendSetCookies(response, csrfCookies);
  appendSetCookies(response, getSetCookieHeaders(signInResponse.headers));

  return response;
}
