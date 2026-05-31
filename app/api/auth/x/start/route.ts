import { isXAuthConfigured } from "@/auth";
import { createOAuthStartResponse } from "@/lib/oauthStart";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isXAuthConfigured) {
    return NextResponse.redirect(new URL("/login?x=not-configured", request.url));
  }

  return createOAuthStartResponse(request, {
    providerId: "twitter",
  });
}
