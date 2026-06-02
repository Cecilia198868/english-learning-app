import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import StartPageClient from "@/components/StartPageClient";
import { classicSceneCategoryMenus } from "@/data/classicSceneCategoryMenus";
import { getAiGuidedProgress } from "@/lib/aiGuidedExpressionProgress";

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

function createFallbackContinueStudy() {
  const restaurantMenu = classicSceneCategoryMenus["restaurant-takeout"];
  const sectionCard = restaurantMenu.cards.find(
    (card) => card.id === "basic-ordering"
  );

  return {
    categoryLabel: "场景练习",
    completed: 23,
    href: sectionCard?.href || "/classic-scenes/restaurant-takeout/basic-ordering",
    statusLabel: "进行中",
    title: "在咖啡馆点咖啡",
    total: 80,
  };
}

export default async function StartPage() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.trim().toLowerCase() || "";
  const aiProgress = await loadAiProgress(userEmail);

  return (
    <StartPageClient
      aiProgress={aiProgress}
      fallbackContinueStudy={createFallbackContinueStudy()}
      userEmail={session?.user?.email || ""}
      userImage={session?.user?.image || ""}
      userName={session?.user?.name || ""}
    />
  );
}
