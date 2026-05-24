import { authOptions } from "@/auth";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

export const runtime = "nodejs";

type CheckoutPlan = "monthly" | "yearly";

function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return value === "monthly" || value === "yearly";
}

export async function POST(req: Request) {
  try {
    const authSession = await getServerSession(authOptions);
    const email = authSession?.user?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { plan?: unknown };
    const plan = body.plan;

    if (!isCheckoutPlan(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;
    const priceId = plan === "monthly" ? monthlyPriceId : yearlyPriceId;

    if (!stripeSecretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    if (!appUrl) {
      throw new Error("Missing NEXT_PUBLIC_APP_URL");
    }

    if (!priceId) {
      throw new Error(
        plan === "monthly"
          ? "Missing STRIPE_MONTHLY_PRICE_ID"
          : "Missing STRIPE_YEARLY_PRICE_ID"
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    console.log("creating checkout for email:", email);

    const session = await stripe.checkout.sessions.create({
      cancel_url: `${appUrl}/speak-english?pro=1&checkout=cancel`,
      client_reference_id: email,
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: {
        email,
        plan,
      },
      payment_method_types: ["card"],
      success_url: `${appUrl}/speak-english?pro=1&checkout=success`,
    });

    console.log("Stripe checkout session url:", session.url);

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe checkout session url is missing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Create Stripe Checkout Session failed",
      },
      { status: 500 }
    );
  }
}
