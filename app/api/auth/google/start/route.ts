import { isGoogleAuthConfigured } from "@/auth";
import { createOAuthFailureResponse } from "@/lib/oauthFailureResponse";
import { createOAuthStartResponse } from "@/lib/oauthStart";

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
    return createOAuthFailureResponse("google", "not-configured");
  }

  return createOAuthStartResponse(request, {
    decorateUrl: withGoogleAccountChooser,
    providerId: "google",
  });
}
