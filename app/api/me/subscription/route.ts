import {
  getValidatedServerSession,
  sessionInvalidatedJsonResponse,
} from "@/lib/serverSession";
import { getAccountSubscriptionForEmail } from "@/lib/subscriptionService";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { invalidated, session } = await getValidatedServerSession();
  if (invalidated) return sessionInvalidatedJsonResponse();

  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await getAccountSubscriptionForEmail(email);

    return NextResponse.json(subscription, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Load subscription failed",
      },
      { status: 500 }
    );
  }
}
