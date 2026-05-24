import { authOptions } from "@/auth";
import { restoreSubscriptionForEmail } from "@/lib/subscriptionService";
import { findUserByEmail } from "@/lib/userStore";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const authSession = await getServerSession(authOptions);
    const email = authSession?.user?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!stripeSecretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    if (!appUrl) {
      throw new Error("Missing NEXT_PUBLIC_APP_URL");
    }

    const user = await findUserByEmail(email);
    let stripeCustomerId = user?.stripeCustomerId?.trim() || "";

    if (!stripeCustomerId) {
      const restoredSubscription = await restoreSubscriptionForEmail(email);
      stripeCustomerId = restoredSubscription.stripeCustomerId.trim();
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe subscription is linked to this account." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/speak-english?account=1`,
    });

    if (!portalSession.url) {
      return NextResponse.json(
        { error: "Stripe billing portal url is missing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Create Stripe Billing Portal Session failed",
      },
      { status: 500 }
    );
  }
}
