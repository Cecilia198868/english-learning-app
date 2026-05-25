import { authOptions } from "@/auth";
import { listNotificationsForUser } from "@/lib/notifications";
import {
  getSubscriptionNotificationMessages,
  type SubscriptionNotificationState,
} from "@/lib/subscriptionNotifications";
import {
  getAccountSubscriptionForEmail,
  type AccountSubscriptionState,
} from "@/lib/subscriptionService";
import { findProfileByEmail, type StoredUser } from "@/lib/userStore";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NotificationResponseItem = {
  createdAt: string;
  id: string;
  isRead: boolean;
  message: string;
  title: string;
  type: "subscription" | "learning" | "account" | "system";
  userEmail: string;
};

function getProfileSubscriptionState(
  profile: StoredUser | null
): AccountSubscriptionState | null {
  if (!profile?.subscriptionStatus) return null;

  return {
    bonusProUntil: null,
    cancelAtPeriodEnd:
      profile.cancelAtPeriodEnd === true ||
      profile.subscriptionStatus === "cancels_at_period_end",
    currentPeriodEnd: profile.currentPeriodEnd || null,
    entitlementSource:
      profile.subscriptionStatus === "free"
        ? ("free" as const)
        : ("stripe" as const),
    stripeCustomerId: profile.stripeCustomerId || "",
    stripeSubscriptionId: profile.stripeSubscriptionId || "",
    subscriptionStatus: profile.subscriptionStatus,
  };
}

function createSubscriptionFallbackNotifications(
  email: string,
  state: SubscriptionNotificationState | null
): NotificationResponseItem[] {
  if (!state) return [];

  return getSubscriptionNotificationMessages(state).map(
    (notification, index) => ({
      createdAt: new Date(Date.now() - index).toISOString(),
      id: `subscription-fallback-${state.subscriptionStatus}-${index}`,
      isRead: true,
      message: notification.message,
      title: notification.title,
      type: "subscription",
      userEmail: email,
    })
  );
}

function mergeSubscriptionFallbackNotifications(
  notifications: NotificationResponseItem[],
  fallbackNotifications: NotificationResponseItem[]
) {
  if (!fallbackNotifications.length) return notifications;

  const existingKeys = new Set(
    notifications.map(
      (notification) =>
        `${notification.type}:${notification.title}:${notification.message}`
    )
  );

  const missingFallbackNotifications = fallbackNotifications.filter(
    (notification) =>
      !existingKeys.has(
        `${notification.type}:${notification.title}:${notification.message}`
      )
  );

  return [...missingFallbackNotifications, ...notifications];
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let subscriptionState: AccountSubscriptionState | null = null;

  try {
    subscriptionState = await getAccountSubscriptionForEmail(email);
  } catch (error) {
    console.error("Sync subscription before notification load failed", error);

    const profile = await findProfileByEmail(email).catch(() => null);
    subscriptionState = getProfileSubscriptionState(profile);
  }

  const fallbackNotifications = createSubscriptionFallbackNotifications(
    email,
    subscriptionState
  );

  try {
    const notifications = await listNotificationsForUser(email);
    const visibleNotifications = mergeSubscriptionFallbackNotifications(
      notifications,
      fallbackNotifications
    );

    return NextResponse.json(
      { notifications: visibleNotifications },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Load notifications failed", error);

    if (fallbackNotifications.length) {
      return NextResponse.json(
        { notifications: fallbackNotifications },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        notifications: [],
        warning:
          error instanceof Error ? error.message : "Load notifications failed",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
