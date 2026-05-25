import Stripe from "stripe";
import { getBonusProUntilForEmail } from "@/lib/referrals";
import { ensureSubscriptionNotificationsForState } from "@/lib/subscriptionNotifications";
import {
  findProfileByEmail,
  upsertProfileSubscriptionByEmail,
  type StoredUser,
} from "@/lib/userStore";

export type SubscriptionStatus = "free" | "pro" | "cancels_at_period_end";

export type AccountSubscriptionState = {
  bonusProUntil: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  entitlementSource: "bonus" | "free" | "stripe";
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: SubscriptionStatus;
};

type SelectedStripeSubscription = {
  customerId: string;
  subscription: Stripe.Subscription;
};

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const subscriptionWithPeriodEnd = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
  };
  const currentPeriodEnd =
    subscriptionWithPeriodEnd.current_period_end ||
    subscription.items.data[0]?.current_period_end;

  return currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null;
}

function getEntitlementStatus(subscription: Stripe.Subscription) {
  if (subscription.status === "active" || subscription.status === "trialing") {
    return subscription.cancel_at_period_end
      ? "cancels_at_period_end"
      : "pro";
  }

  return "free";
}

function isUsableSubscription(subscription: Stripe.Subscription) {
  return subscription.status === "active" || subscription.status === "trialing";
}

function byNewestCreated(
  left: Stripe.Subscription,
  right: Stripe.Subscription
) {
  return right.created - left.created;
}

function toFreeState(profile: StoredUser | null): AccountSubscriptionState {
  return {
    bonusProUntil: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    entitlementSource: "free",
    stripeCustomerId: profile?.stripeCustomerId || "",
    stripeSubscriptionId: profile?.stripeSubscriptionId || "",
    subscriptionStatus: "free",
  };
}

function toAccountSubscriptionState(
  customerId: string,
  subscription: Stripe.Subscription
): AccountSubscriptionState {
  const subscriptionStatus = getEntitlementStatus(subscription);

  return {
    bonusProUntil: null,
    cancelAtPeriodEnd: subscriptionStatus === "cancels_at_period_end",
    currentPeriodEnd: getCurrentPeriodEnd(subscription),
    entitlementSource: "stripe",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus,
  };
}

function getFutureIso(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return date.getTime() > Date.now() ? value : null;
}

async function applyBonusEntitlement(
  email: string,
  state: AccountSubscriptionState
): Promise<AccountSubscriptionState> {
  const bonusProUntil = getFutureIso(await getBonusProUntilForEmail(email));

  if (!bonusProUntil) {
    return {
      ...state,
      bonusProUntil: null,
      entitlementSource:
        state.subscriptionStatus === "free"
          ? ("free" as const)
          : ("stripe" as const),
    };
  }

  if (state.subscriptionStatus === "free") {
    return {
      ...state,
      bonusProUntil,
      currentPeriodEnd: bonusProUntil,
      entitlementSource: "bonus" as const,
      subscriptionStatus: "pro" as const,
    };
  }

  return {
    ...state,
    bonusProUntil,
    entitlementSource: "stripe" as const,
  };
}

async function findLatestSubscriptionForCustomer(
  stripe: Stripe,
  customerId: string
): Promise<SelectedStripeSubscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
    status: "all",
  });

  const sortedSubscriptions = [...subscriptions.data].sort(byNewestCreated);
  const latestUsableSubscription =
    sortedSubscriptions.find(isUsableSubscription) || null;
  const latestSubscription = latestUsableSubscription || sortedSubscriptions[0];

  return latestSubscription
    ? {
        customerId,
        subscription: latestSubscription,
      }
    : null;
}

async function persistAccountSubscriptionState(
  email: string,
  state: AccountSubscriptionState
) {
  await upsertProfileSubscriptionByEmail(email, {
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    currentPeriodEnd: state.currentPeriodEnd || undefined,
    stripeCustomerId: state.stripeCustomerId,
    stripeSubscriptionId: state.stripeSubscriptionId,
    subscriptionStatus: state.subscriptionStatus,
  });

  await ensureSubscriptionNotificationsForState(email, state);
}

export async function getAccountSubscriptionForEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const profile = await findProfileByEmail(normalizedEmail);
  const stripeCustomerId = profile?.stripeCustomerId?.trim() || "";

  if (!stripeCustomerId) {
    return applyBonusEntitlement(normalizedEmail, toFreeState(profile));
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  const stripe = new Stripe(stripeSecretKey);
  const selectedSubscription = await findLatestSubscriptionForCustomer(
    stripe,
    stripeCustomerId
  );

  const nextState = selectedSubscription
    ? toAccountSubscriptionState(
        selectedSubscription.customerId,
        selectedSubscription.subscription
      )
    : {
        ...toFreeState(profile),
        stripeCustomerId,
        stripeSubscriptionId: "",
      };

  await persistAccountSubscriptionState(normalizedEmail, nextState);

  return applyBonusEntitlement(normalizedEmail, nextState);
}

export async function restoreSubscriptionForEmail(email: string) {
  return getAccountSubscriptionForEmail(email);
}
