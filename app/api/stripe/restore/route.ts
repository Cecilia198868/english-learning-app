import {
  getValidatedServerSession,
  sessionInvalidatedJsonResponse,
} from "@/lib/serverSession";
import { restoreSubscriptionForEmail } from "@/lib/subscriptionService";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const { invalidated, session: authSession } =
      await getValidatedServerSession();
    if (invalidated) return sessionInvalidatedJsonResponse();

    const email = authSession?.user?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await restoreSubscriptionForEmail(email);
    return NextResponse.json(
      subscription,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Restore Stripe subscription failed",
      },
      { status: 500 }
    );
  }
}
