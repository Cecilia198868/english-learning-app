import NextAuth from "next-auth";
import { authOptions } from "@/auth";
import { sanitizeAuthLogValue } from "@/lib/authLogging";

const handler = NextAuth(authOptions);

function logAuthCallback(request: Request, method: string) {
  const url = new URL(request.url);

  if (!url.pathname.includes("/api/auth/callback/")) {
    return;
  }

  console.log(
    "[auth][callback.urlParams]",
    sanitizeAuthLogValue({
      method,
      pathname: url.pathname,
      params: Object.fromEntries(url.searchParams.entries()),
      provider: url.pathname.split("/").pop(),
      userAgent: request.headers.get("user-agent"),
    })
  );
}

export function GET(request: Request) {
  logAuthCallback(request, "GET");
  return handler(request);
}

export function POST(request: Request) {
  logAuthCallback(request, "POST");
  return handler(request);
}
