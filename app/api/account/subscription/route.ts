import { authOptions } from "@/auth";
import { getAccountSubscriptionForEmail } from "@/lib/subscriptionService";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await getAccountSubscriptionForEmail(email);

  return NextResponse.json(
    subscription,
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
