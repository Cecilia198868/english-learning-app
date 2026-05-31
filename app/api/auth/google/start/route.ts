import { isGoogleAuthConfigured } from "@/auth";
import { createOAuthStartResponse } from "@/lib/oauthStart";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function withGoogleAccountChooser(url: string) {
  try {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set("prompt", "select_account");
    return nextUrl.toString();
  } catch {
    return url;
  }
}

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured) {
    return NextResponse.redirect(new URL("/login?google=not-configured", request.url));
  }

  return createOAuthStartResponse(request, {
    decorateUrl: withGoogleAccountChooser,
    providerId: "google",
  });
}
