import { NextResponse } from "next/server";
import { registerReferralForNewUser } from "@/lib/referrals";
import { createUser } from "@/lib/userStore";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: string; password?: string; referralCode?: string }
      | null;

    const email = body?.email?.trim().toLowerCase() || "";
    const password = body?.password || "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }

    if (password.trim().length < 6) {
      return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 400 });
    }

    await createUser(email, password);
    let referralBonusGranted = false;

    if (body?.referralCode) {
      try {
        const referralResult = await registerReferralForNewUser(
          email,
          body.referralCode
        );
        referralBonusGranted = referralResult.bonusGranted;
      } catch (referralError) {
        console.error("Register referral failed", referralError);
      }
    }

    return NextResponse.json({ ok: true, referralBonusGranted });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_EXISTS") {
      return NextResponse.json({ error: "USER_EXISTS" }, { status: 409 });
    }

    return NextResponse.json({ error: "REGISTER_FAILED" }, { status: 500 });
  }
}
