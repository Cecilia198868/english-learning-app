import { NextResponse } from "next/server";
import { sanitizeAuthLogValue } from "@/lib/authLogging";
import { resolveAuthOrigin } from "@/lib/authOrigin";

type SignInResponse = {
  url?: string;
};

type OAuthStartOptions = {
  callbackPath?: string;
  decorateUrl?: (url: string) => string;
  providerId: string;
};

function logOAuthStart(scope: string, metadata?: unknown) {
  console.log(`[auth][oauthStart.${scope}]`, sanitizeAuthLogValue(metadata));
}

function logOAuthStartError(scope: string, metadata?: unknown) {
  console.error(`[auth][oauthStart.${scope}]`, sanitizeAuthLogValue(metadata));
}

function summarizeRedirectUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return {
      origin: url.origin,
      pathname: url.pathname,
      searchParamKeys: Array.from(url.searchParams.keys()),
    };
  } catch {
    return { value };
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
  const authOriginResolution = resolveAuthOrigin(origin);
  const preferredAuthOrigin = authOriginResolution.origin;
  const incomingCookie = request.headers.get("cookie") ?? "";

  logOAuthStart("received", {
    authOriginResolution,
    callbackUrl: requestUrl.searchParams.get("callbackUrl"),
    providerId,
    requestOrigin: origin,
    requestPathname: requestUrl.pathname,
    userAgent: request.headers.get("user-agent"),
  });

  if (origin !== preferredAuthOrigin) {
    const canonicalStartUrl = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      preferredAuthOrigin
    );

    logOAuthStart("canonicalRedirect", {
      from: origin,
      providerId,
      to: canonicalStartUrl.toString(),
    });

    return NextResponse.redirect(canonicalStartUrl);
  }

  try {
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

    logOAuthStart("redirectTo", {
      authOrigin,
      callbackUrl,
      providerId,
    });

    if (!csrfResponse.ok) {
      logOAuthStartError("csrfFailed", {
        providerId,
        status: csrfResponse.status,
        statusText: csrfResponse.statusText,
      });
      return NextResponse.redirect(new URL(`/login?${providerId}=csrf`, origin));
    }

    const csrfData = (await csrfResponse.json()) as { csrfToken?: string };

    logOAuthStart("csrfResponse", {
      hasCsrfToken: Boolean(csrfData.csrfToken),
      providerId,
    });

    if (!csrfData.csrfToken) {
      return NextResponse.redirect(new URL(`/login?${providerId}=csrf`, origin));
    }

    const csrfCookies = getSetCookieHeaders(csrfResponse.headers);
    const cookieHeader = [incomingCookie, ...csrfCookies.map(cookiePair)]
      .filter(Boolean)
      .join("; ");

    logOAuthStart("signInWithOAuthExecute", {
      note: "NextAuth OAuth start endpoint; Supabase Auth signInWithOAuth is not used in this app.",
      providerId,
      redirectTo: callbackUrl,
    });

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

    logOAuthStart("signInResponse", {
      ok: signInResponse.ok,
      providerId,
      status: signInResponse.status,
      statusText: signInResponse.statusText,
    });

    if (!signInResponse.ok) {
      const errorText = await signInResponse.text().catch(() => "");
      logOAuthStartError("signInFailed", {
        errorText,
        providerId,
        status: signInResponse.status,
        statusText: signInResponse.statusText,
      });
      return NextResponse.redirect(new URL(`/login?${providerId}=signin`, origin));
    }

    const signInData = (await signInResponse.json()) as SignInResponse;
    const decoratedUrl = decorateUrl(signInData.url || "");

    logOAuthStart("signInData", {
      data: {
        ...signInData,
        url: summarizeRedirectUrl(signInData.url),
      },
      providerId,
    });

    if (!signInData.url || signInData.url.includes("csrf=true")) {
      logOAuthStartError("missingRedirectUrl", {
        data: {
          ...signInData,
          url: summarizeRedirectUrl(signInData.url),
        },
        providerId,
      });
      return NextResponse.redirect(new URL(`/login?${providerId}=signin`, origin));
    }

    logOAuthStart("enteringRedirect", {
      providerId,
      redirectUrl: summarizeRedirectUrl(decoratedUrl),
    });

    const response = NextResponse.redirect(decoratedUrl);
    appendSetCookies(response, csrfCookies);
    appendSetCookies(response, getSetCookieHeaders(signInResponse.headers));

    return response;
  } catch (error) {
    logOAuthStartError("exception", {
      error,
      providerId,
    });
    return NextResponse.redirect(new URL(`/login?${providerId}=exception`, origin));
  }
}
