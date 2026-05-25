import { authOptions } from "@/auth";
import { listNotificationsForUser } from "@/lib/notifications";
import { getAccountSubscriptionForEmail } from "@/lib/subscriptionService";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await getAccountSubscriptionForEmail(email);
    const notifications = await listNotificationsForUser(email);

    return NextResponse.json(
      { notifications },
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
          error instanceof Error ? error.message : "Load notifications failed",
      },
      { status: 500 }
    );
  }
}
