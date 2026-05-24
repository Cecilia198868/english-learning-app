import Stripe from "stripe";
import {
  findUserByEmail,
  updateUserSubscriptionByEmail,
  type StoredUser,
} from "@/lib/userStore";

export type AccountSubscriptionState = {
  currentPeriodEnd: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: "free" | "pro";
};

type SelectedStripeSubscription = {
  customerId: string;
  subscription: Stripe.Subscription;
};

function toAccountSubscriptionState(
  user: StoredUser | null | undefined
): AccountSubscriptionState {
  return {
    currentPeriodEnd: user?.currentPeriodEnd || null,
    stripeCustomerId: user?.stripeCustomerId || "",
    stripeSubscriptionId: user?.stripeSubscriptionId || "",
    subscriptionStatus: user?.subscriptionStatus === "pro" ? "pro" : "free",
  };
}

function isStoredProStillCurrent(subscription: AccountSubscriptionState) {
  if (subscription.subscriptionStatus !== "pro") return false;
  if (!subscription.currentPeriodEnd) return true;

  const currentPeriodEnd = new Date(subscription.currentPeriodEnd).getTime();
  return Number.isNaN(currentPeriodEnd) || currentPeriodEnd > Date.now();
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  return currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null;
}

function getEntitlementStatus(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

async function findLatestSubscriptionForCustomer(
  stripe: Stripe,
  customerId: string
) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 10,
    status: "all",
  });
  const sortedSubscriptions = subscriptions.data.sort(
    (left, right) => right.created - left.created
  );

  return (
    sortedSubscriptions.find(
      (subscription) =>
        subscription.status === "active" || subscription.status === "trialing"
    ) ||
    sortedSubscriptions[0] ||
    null
  );
}

async function findSubscriptionByEmail(
  stripe: Stripe,
  email: string,
  storedStripeCustomerId?: string
): Promise<SelectedStripeSubscription | null> {
  const customerIds = new Set<string>();

  if (storedStripeCustomerId?.trim()) {
    customerIds.add(storedStripeCustomerId.trim());
  }

  const customers = await stripe.customers.list({
    email,
    limit: 10,
  });

  customers.data.forEach((customer) => {
    customerIds.add(customer.id);
  });

  let selectedSubscription: SelectedStripeSubscription | null = null;
  let latestFallbackSubscription: SelectedStripeSubscription | null = null;

  for (const customerId of customerIds) {
    const subscription = await findLatestSubscriptionForCustomer(
      stripe,
      customerId
    );

    if (!subscription) {
      continue;
    }

    if (
      subscription.status === "active" ||
      subscription.status === "trialing"
    ) {
      selectedSubscription = { customerId, subscription };
      break;
    }

    if (
      !latestFallbackSubscription ||
      subscription.created > latestFallbackSubscription.subscription.created
    ) {
      latestFallbackSubscription = { customerId, subscription };
    }
  }

  return selectedSubscription || latestFallbackSubscription;
}

export async function restoreSubscriptionForEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  const stripe = new Stripe(stripeSecretKey);
  const selectedSubscription = await findSubscriptionByEmail(
    stripe,
    normalizedEmail,
    user?.stripeCustomerId
  );

  if (!selectedSubscription) {
    return toAccountSubscriptionState(user);
  }

  const { customerId, subscription } = selectedSubscription;
  const currentPeriodEnd = getCurrentPeriodEnd(subscription);
  const updatedUser = await updateUserSubscriptionByEmail(normalizedEmail, {
    currentPeriodEnd: currentPeriodEnd || undefined,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: getEntitlementStatus(subscription.status),
  });

  return toAccountSubscriptionState(updatedUser);
}

export async function getAccountSubscriptionForEmail(email: string) {
  const user = await findUserByEmail(email);
  const storedSubscription = toAccountSubscriptionState(user);

  if (isStoredProStillCurrent(storedSubscription)) {
    return storedSubscription;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return storedSubscription;
  }

  try {
    return await restoreSubscriptionForEmail(email);
  } catch {
    return storedSubscription;
  }
}
