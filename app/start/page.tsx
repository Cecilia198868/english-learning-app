import { redirect } from "next/navigation";
import StartPageClient from "@/components/StartPageClient";
import { getAiGuidedProgress } from "@/lib/aiGuidedExpressionProgress";
import {
  getLearningHomeProgress,
  type LearningHomeContinueStudy,
} from "@/lib/learningHomeProgress";
import { getBonusProUntilForEmail } from "@/lib/referrals";
import { getValidatedServerSession } from "@/lib/serverSession";
import { findUserByEmail } from "@/lib/userStore";

const DEFAULT_AI_PROGRESS = {
  challengeCompleted: 0,
  challengeGoal: 10,
  dailyGoal: 10,
  level: 1,
  streakDays: 0,
  todayCompleted: 0,
  totalCompleted: 0,
};

async function loadAiProgress(email: string) {
  if (!email) return DEFAULT_AI_PROGRESS;

  try {
    const progress = await getAiGuidedProgress(`user:${email}`);

    return {
      challengeCompleted: progress.challenge.completed,
      challengeGoal: progress.challenge.goal,
      dailyGoal: progress.dailyGoal,
      level: progress.level,
      streakDays: progress.streakDays,
      todayCompleted: progress.todayCompleted,
      totalCompleted: progress.totalCompleted,
    };
  } catch {
    return DEFAULT_AI_PROGRESS;
  }
}

function isFutureDate(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

async function loadHasProEntitlement(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;

  try {
    const [profile, bonusProUntil] = await Promise.all([
      findUserByEmail(normalizedEmail),
      getBonusProUntilForEmail(normalizedEmail).catch(() => null),
    ]);

    if (isFutureDate(bonusProUntil)) return true;
    if (profile?.subscriptionStatus === "pro") return true;

    if (profile?.subscriptionStatus === "cancels_at_period_end") {
      return isFutureDate(profile.currentPeriodEnd);
    }
  } catch {
    return false;
  }

  return false;
}

async function loadContinueStudy(
  email: string
): Promise<LearningHomeContinueStudy | null> {
  if (!email) return null;

  try {
    const progress = await getLearningHomeProgress(`user:${email}`);
    return progress.continueStudy;
  } catch {
    return null;
  }
}

function createFallbackContinueStudy() {
  return {
    categoryLabel: "学习记录",
    completed: 0,
    href: "/classic-scenes",
    statusLabel: "暂无记录",
    title: "选择一个课程开始学习",
    total: 0,
  };
}

export default async function StartPage() {
  const { invalidated, session } = await getValidatedServerSession();

  if (invalidated) {
    redirect("/api/auth/session-replaced");
  }

  const userEmail = session?.user?.email?.trim().toLowerCase() || "";
  const [aiProgress, backendContinueStudy, hasProEntitlement] = await Promise.all([
    loadAiProgress(userEmail),
    loadContinueStudy(userEmail),
    loadHasProEntitlement(userEmail),
  ]);

  return (
    <StartPageClient
      aiProgress={aiProgress}
      backendContinueStudy={backendContinueStudy}
      fallbackContinueStudy={createFallbackContinueStudy()}
      hasProEntitlement={hasProEntitlement}
      userEmail={session?.user?.email || ""}
      userImage={session?.user?.image || ""}
      userName={session?.user?.name || ""}
    />
  );
}
