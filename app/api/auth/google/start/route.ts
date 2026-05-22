import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SignInResponse = {
  url?: string;
};

type HandoffLocale = "en" | "zh-CN";

const LANGUAGE_COOKIE_NAME = "english-app-language";

function getAuthOrigin(fallbackOrigin: string) {
  if (!process.env.NEXTAUTH_URL) return fallbackOrigin;

  try {
    return new URL(process.env.NEXTAUTH_URL).origin;
  } catch {
    return fallbackOrigin;
  }
}

async function fetchAuthEndpoint(
  path: string,
  preferredOrigin: string,
  fallbackOrigin: string,
  init?: RequestInit
) {
  const preferredUrl = new URL(path, preferredOrigin);

  try {
    const response = await fetch(preferredUrl, init);
    if (response.ok || preferredOrigin === fallbackOrigin) {
      return { authOrigin: preferredOrigin, response };
    }
  } catch {
    if (preferredOrigin === fallbackOrigin) {
      throw new Error(`Unable to reach auth endpoint: ${preferredUrl}`);
    }
  }

  const fallbackUrl = new URL(path, fallbackOrigin);
  return {
    authOrigin: fallbackOrigin,
    response: await fetch(fallbackUrl, init),
  };
}

function selectedLocaleFromRequest(request: Request): HandoffLocale {
  const cookieHeader = request.headers.get("cookie") ?? "";

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name !== LANGUAGE_COOKIE_NAME) {
      continue;
    }

    try {
      return decodeURIComponent(valueParts.join("=")) === "zh-CN"
        ? "zh-CN"
        : "en";
    } catch {
      return valueParts.join("=") === "zh-CN" ? "zh-CN" : "en";
    }
  }

  return "en";
}

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

function withGoogleAccountChooser(url: string) {
  try {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set("prompt", "select_account");
    return nextUrl.toString();
  } catch {
    return url;
  }
}

function googleHandoffResponse(url: string, locale: HandoffLocale) {
  const escapedUrl = escapeHtml(url);
  const isChinese = locale === "zh-CN";
  const message = isChinese
    ? "点击下面的按钮，继续使用 Google 登录。"
    : "Tap the button below to continue with your Google account.";
  const buttonLabel = isChinese ? "继续使用 Google 登录" : "Continue to Google";
  const backLabel = isChinese ? "返回登录方式" : "Back to login options";

  return new NextResponse(
    `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SpeakFlow</title>
    <style>
      body {
        margin: 0;
        min-height: 100dvh;
        box-sizing: border-box;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: clamp(7rem, 19dvh, 12rem) 20px 32px;
        background:
          radial-gradient(circle at 12% 4%, rgba(255, 255, 255, 0.42), transparent 30%),
          radial-gradient(circle at 88% 7%, rgba(223, 234, 255, 0.74), transparent 34%),
          linear-gradient(180deg, #c5b7ff 0%, #d4cdff 47%, #e5ecff 100%);
        color: #201833;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      }
      main {
        width: min(100%, 390px);
        border: 0;
        border-radius: 0;
        padding: 0;
        text-align: center;
        background: transparent;
        box-shadow: none;
        backdrop-filter: none;
      }
      .back-link {
        position: fixed;
        top: calc(env(safe-area-inset-top, 0px) + clamp(18px, 4dvh, 28px));
        left: clamp(20px, 8vw, 38px);
        display: grid;
        place-items: center;
        width: clamp(48px, 11vw, 58px);
        height: clamp(48px, 11vw, 58px);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.48);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.64);
        text-decoration: none;
      }
      .back-link span {
        width: 14px;
        height: 14px;
        margin-left: 4px;
        border-bottom: 2px solid #35304f;
        border-left: 2px solid #35304f;
        transform: rotate(45deg);
      }
      h1 {
        margin: 0;
        font-size: clamp(30px, 8.4vw, 40px);
        font-weight: 800;
        letter-spacing: -0.03em;
        background: transparent;
      }
      p {
        color: rgba(32, 24, 51, 0.68);
        line-height: 1.6;
        margin: 18px 0 28px;
        font-size: clamp(17px, 4.8vw, 21px);
        font-weight: 700;
        background: transparent;
      }
      .continue-link {
        display: inline-flex;
        justify-content: center;
        width: 100%;
        box-sizing: border-box;
        color: white;
        border: 1px solid rgba(123, 97, 255, 0.24);
        border-radius: 999px;
        padding: 16px 20px;
        text-decoration: none;
        font-weight: 700;
        background: linear-gradient(135deg, #7b61ff 0%, #5b8cff 62%, #75d7ff 100%);
        box-shadow: 0 20px 46px rgba(91, 140, 255, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.26);
      }
    </style>
  </head>
  <body>
    <a class="back-link" href="/login" aria-label="${backLabel}">
      <span aria-hidden="true"></span>
    </a>
    <main>
      <h1>SpeakFlow</h1>
      <p>${message}</p>
      <a class="continue-link" href="${escapedUrl}">${buttonLabel}</a>
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
  const preferredAuthOrigin = getAuthOrigin(origin);
  const selectedLocale = selectedLocaleFromRequest(request);
  const incomingCookie = request.headers.get("cookie") ?? "";

  const { authOrigin, response: csrfResponse } = await fetchAuthEndpoint(
    "/api/auth/csrf",
    preferredAuthOrigin,
    origin,
    {
      cache: "no-store",
      headers: incomingCookie ? { cookie: incomingCookie } : undefined,
    }
  );
  const callbackUrl = new URL("/speak-english", authOrigin).toString();

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
    new URL("/api/auth/signin/google", authOrigin),
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

  const response = googleHandoffResponse(
    withGoogleAccountChooser(signInData.url),
    selectedLocale
  );
  appendSetCookies(response, csrfCookies);
  appendSetCookies(response, getSetCookieHeaders(signInResponse.headers));

  return response;
}
