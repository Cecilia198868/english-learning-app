import { authOptions } from "@/auth";
import { findUserByEmail } from "@/lib/userStore";
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

  const user = await findUserByEmail(email);

  return NextResponse.json(
    {
      currentPeriodEnd: user?.currentPeriodEnd || null,
      subscriptionStatus: user?.subscriptionStatus === "pro" ? "pro" : "free",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
