import {
  findUserByStripeCustomerId,
  updateUserSubscriptionByEmail,
} from "@/lib/userStore";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type EntitlementStatus = "pro" | "free";
type StripeSubscriptionStatus = Stripe.Subscription.Status | "deleted";

type SubscriptionPersistencePayload = {
  currentPeriodEnd: string | null;
  email?: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: EntitlementStatus;
};

function getStripeId(value: string | { id?: string } | null | undefined) {
  if (!value) return "";
  return typeof value === "string" ? value : value.id || "";
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  return currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null;
}

function getEntitlementStatus(status: StripeSubscriptionStatus) {
  if (status === "active" || status === "trialing") {
    return "pro";
  }

  if (
    status === "canceled" ||
    status === "deleted" ||
    status === "past_due" ||
    status === "unpaid"
  ) {
    return "free";
  }

  return null;
}

async function saveSubscriptionState(payload: SubscriptionPersistencePayload) {
  const subscriptionData = {
    currentPeriodEnd: payload.currentPeriodEnd || undefined,
    stripeCustomerId: payload.stripeCustomerId,
    stripeSubscriptionId: payload.stripeSubscriptionId,
    subscriptionStatus: payload.subscriptionStatus,
  };

  if (payload.email) {
    const updatedUser = await updateUserSubscriptionByEmail(
      payload.email,
      subscriptionData
    );

    if (updatedUser) {
      return;
    }
  }

  const user = await findUserByStripeCustomerId(payload.stripeCustomerId);

  if (!user) {
    return;
  }

  await updateUserSubscriptionByEmail(user.email, subscriptionData);
}

async function persistSubscription(
  subscription: Stripe.Subscription,
  options: {
    email?: string;
    forcedStatus?: StripeSubscriptionStatus;
    stripeCustomerId?: string;
  } = {}
) {
  const status = options.forcedStatus || subscription.status;
  const subscriptionStatus = getEntitlementStatus(status);

  if (!subscriptionStatus) {
    return;
  }

  const stripeCustomerId =
    options.stripeCustomerId || getStripeId(subscription.customer);
  const stripeSubscriptionId = subscription.id;

  if (!stripeCustomerId || !stripeSubscriptionId) {
    return;
  }

  await saveSubscriptionState({
    currentPeriodEnd: getCurrentPeriodEnd(subscription),
    email: options.email,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
  });
}

function getCheckoutSessionEmail(session: Stripe.Checkout.Session) {
  return (
    session.metadata?.email?.trim().toLowerCase() ||
    session.client_reference_id?.trim().toLowerCase() ||
    session.customer_details?.email?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    ""
  );
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  console.log("webhook checkout metadata email:", session.metadata?.email);
  console.log(
    "webhook checkout client_reference_id:",
    session.client_reference_id
  );
  console.log("stripe customer:", session.customer);
  console.log("stripe subscription:", session.subscription);

  const subscriptionId = getStripeId(session.subscription);
  const stripeCustomerId = getStripeId(session.customer);
  const email = getCheckoutSessionEmail(session);

  if (!email) {
    console.error("Missing email in checkout session");
    return;
  }

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const resolvedStripeCustomerId =
    stripeCustomerId || getStripeId(subscription.customer);
  const currentPeriodEnd = getCurrentPeriodEnd(subscription);

  if (resolvedStripeCustomerId) {
    const updatedUser = await updateUserSubscriptionByEmail(email, {
      currentPeriodEnd: currentPeriodEnd || undefined,
      stripeCustomerId: resolvedStripeCustomerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: "pro",
    });

    if (updatedUser) {
      return;
    }
  }

  await persistSubscription(subscription, {
    email,
    stripeCustomerId: resolvedStripeCustomerId,
  });
}

async function handleStripeEvent(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        stripe,
        event.data.object as Stripe.Checkout.Session
      );
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await persistSubscription(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await persistSubscription(event.data.object as Stripe.Subscription, {
        forcedStatus: "deleted",
      });
      break;
    default:
      break;
  }
}

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY" },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid Stripe webhook signature",
      },
      { status: 400 }
    );
  }

  try {
    await handleStripeEvent(stripe, event);
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Handle Stripe webhook failed",
      },
      { status: 500 }
    );
  }
}
