import {
  findProfileByStripeCustomerId,
  upsertProfileSubscriptionByEmail,
} from "@/lib/userStore";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type EntitlementStatus = "pro" | "free" | "cancels_at_period_end";
type StripeSubscriptionStatus = Stripe.Subscription.Status | "deleted";

type SubscriptionPersistencePayload = {
  currentPeriodEnd: string | null;
  email?: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: EntitlementStatus;
  cancelAtPeriodEnd: boolean;
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

function getEntitlementStatus(
  subscription: Stripe.Subscription,
  forcedStatus?: StripeSubscriptionStatus
) {
  const status = forcedStatus || subscription.status;

  if (status === "active" || status === "trialing") {
    return subscription.cancel_at_period_end
      ? "cancels_at_period_end"
      : "pro";
  }

  if (
    status === "canceled" ||
    status === "deleted" ||
    status === "past_due" ||
    status === "unpaid"
  ) {
    return "free";
  }

  return "free";
}

async function saveSubscriptionState(payload: SubscriptionPersistencePayload) {
  const subscriptionData = {
    currentPeriodEnd: payload.currentPeriodEnd || undefined,
    cancelAtPeriodEnd: payload.cancelAtPeriodEnd,
    stripeCustomerId: payload.stripeCustomerId,
    stripeSubscriptionId: payload.stripeSubscriptionId,
    subscriptionStatus: payload.subscriptionStatus,
  };

  if (payload.email) {
    const updatedProfile = await upsertProfileSubscriptionByEmail(
      payload.email,
      subscriptionData
    );

    if (updatedProfile) {
      return;
    }
  }

  const profile = await findProfileByStripeCustomerId(payload.stripeCustomerId);

  if (!profile) {
    return;
  }

  await upsertProfileSubscriptionByEmail(profile.email, subscriptionData);
}

async function persistSubscription(
  subscription: Stripe.Subscription,
  options: {
    email?: string;
    forcedStatus?: StripeSubscriptionStatus;
    stripeCustomerId?: string;
  } = {}
) {
  const subscriptionStatus = getEntitlementStatus(
    subscription,
    options.forcedStatus
  );

  const stripeCustomerId =
    options.stripeCustomerId || getStripeId(subscription.customer);
  const stripeSubscriptionId = subscription.id;

  if (!stripeCustomerId || !stripeSubscriptionId) {
    return;
  }

  await saveSubscriptionState({
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
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
    const updatedProfile = await upsertProfileSubscriptionByEmail(email, {
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      currentPeriodEnd: currentPeriodEnd || undefined,
      stripeCustomerId: resolvedStripeCustomerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: getEntitlementStatus(subscription),
    });

    if (updatedProfile) {
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
