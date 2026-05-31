import { NextResponse } from "next/server";

type SignInResponse = {
  url?: string;
};

type OAuthStartOptions = {
  callbackPath?: string;
  decorateUrl?: (url: string) => string;
  providerId: string;
};

function getAuthOrigin(fallbackOrigin: string) {
  if (!process.env.NEXTAUTH_URL) return fallbackOrigin;

  try {
    return new URL(process.env.NEXTAUTH_URL).origin;
  } catch {
    return fallbackOrigin;
  }
}

function safeCallbackUrl(requestUrl: URL, authOrigin: string, callbackPath: string) {
  const requestedCallback = requestUrl.searchParams.get("callbackUrl");

  if (requestedCallback) {
    try {
      const parsed = new URL(requestedCallback, authOrigin);
      if (parsed.origin === authOrigin) return parsed.toString();
    } catch {
      // Fall back to the default callback below.
    }
  }

  return new URL(callbackPath, authOrigin).toString();
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

export async function createOAuthStartResponse(
  request: Request,
  {
    callbackPath = "/start",
    decorateUrl = (url) => url,
    providerId,
  }: OAuthStartOptions
) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const preferredAuthOrigin = getAuthOrigin(origin);
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
  const callbackUrl = safeCallbackUrl(requestUrl, authOrigin, callbackPath);

  if (!csrfResponse.ok) {
    return NextResponse.redirect(new URL(`/login?${providerId}=csrf`, origin));
  }

  const csrfData = (await csrfResponse.json()) as { csrfToken?: string };

  if (!csrfData.csrfToken) {
    return NextResponse.redirect(new URL(`/login?${providerId}=csrf`, origin));
  }

  const csrfCookies = getSetCookieHeaders(csrfResponse.headers);
  const cookieHeader = [incomingCookie, ...csrfCookies.map(cookiePair)]
    .filter(Boolean)
    .join("; ");

  const signInResponse = await fetch(
    new URL(`/api/auth/signin/${providerId}`, authOrigin),
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
    return NextResponse.redirect(new URL(`/login?${providerId}=signin`, origin));
  }

  const signInData = (await signInResponse.json()) as SignInResponse;

  if (!signInData.url || signInData.url.includes("csrf=true")) {
    return NextResponse.redirect(new URL(`/login?${providerId}=signin`, origin));
  }

  const response = NextResponse.redirect(decorateUrl(signInData.url));
  appendSetCookies(response, csrfCookies);
  appendSetCookies(response, getSetCookieHeaders(signInResponse.headers));

  return response;
}
