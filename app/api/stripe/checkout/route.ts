import {
  getValidatedServerSession,
  sessionInvalidatedJsonResponse,
} from "@/lib/serverSession";
import {
  findProfileByEmail,
  upsertProfileStripeCustomerByEmail,
} from "@/lib/userStore";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type CheckoutPlan = "monthly" | "yearly";

function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return value === "monthly" || value === "yearly";
}

async function getReusableStripeCustomer(stripe: Stripe, email: string) {
  const profile = await findProfileByEmail(email);
  const storedStripeCustomerId = profile?.stripeCustomerId?.trim();

  if (storedStripeCustomerId) {
    try {
      const storedCustomer =
        await stripe.customers.retrieve(storedStripeCustomerId);

      if (!("deleted" in storedCustomer && storedCustomer.deleted)) {
        return storedCustomer as Stripe.Customer;
      }
    } catch {
      // Fall back to lookup by email below.
    }
  }

  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  return (
    customers.data[0] ||
    (await stripe.customers.create({
      email,
      metadata: {
        email,
      },
    }))
  );
}

export async function POST(req: Request) {
  try {
    const { invalidated, session: authSession } =
      await getValidatedServerSession();
    if (invalidated) return sessionInvalidatedJsonResponse();

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

    const stripeCustomer = await getReusableStripeCustomer(stripe, email);

    await upsertProfileStripeCustomerByEmail(email, stripeCustomer.id);

    const session = await stripe.checkout.sessions.create({
      cancel_url: `${appUrl}/account?checkout=cancel`,
      client_reference_id: email,
      customer: stripeCustomer.id,
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
      success_url: `${appUrl}/account?checkout=success`,
    });

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
