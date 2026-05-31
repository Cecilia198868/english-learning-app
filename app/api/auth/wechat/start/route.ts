import { isWechatAuthConfigured } from "@/auth";
import { createOAuthStartResponse } from "@/lib/oauthStart";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isWechatAuthConfigured) {
    return NextResponse.redirect(
      new URL("/login?wechat=not-configured", request.url)
    );
  }

  return createOAuthStartResponse(request, {
    providerId: "wechat",
  });
}
