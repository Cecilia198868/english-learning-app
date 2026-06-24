import { getReferralAccountState } from "@/lib/referrals";
import {
  getValidatedServerSession,
  sessionInvalidatedJsonResponse,
} from "@/lib/serverSession";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { invalidated, session } = await getValidatedServerSession();
  if (invalidated) return sessionInvalidatedJsonResponse();

  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const origin = new URL(request.url).origin;
    const referralState = await getReferralAccountState(email, origin);

    return NextResponse.json(referralState, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Load referrals failed",
      },
      { status: 500 }
    );
  }
}
