import { isAppleAuthConfigured } from "@/auth";
import { createOAuthFailureResponse } from "@/lib/oauthFailureResponse";
import { createOAuthStartResponse } from "@/lib/oauthStart";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAppleAuthConfigured) {
    return createOAuthFailureResponse("apple", "not-configured");
  }

  return createOAuthStartResponse(request, {
    providerId: "apple",
  });
}
