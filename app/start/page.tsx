import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import StartPageClient from "@/components/StartPageClient";
import { featuredLessonRecords } from "@/data/featuredCourses";
import { classicSceneCategoryMenus } from "@/data/classicSceneCategoryMenus";
import { restaurantSceneSectionMenus } from "@/data/restaurantSceneSectionMenus";
import { getAiGuidedProgress } from "@/lib/aiGuidedExpressionProgress";
import { parseTrainingContent } from "@/lib/training";

const DEFAULT_AI_PROGRESS = {
  challengeCompleted: 0,
  challengeGoal: 10,
  dailyGoal: 10,
  level: 1,
  streakDays: 0,
  todayCompleted: 0,
  totalCompleted: 0,
};

const FEATURED_LESSON_SUMMARIES = featuredLessonRecords.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  total: parseTrainingContent(lesson.txt_content || "").length,
}));

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
  const section = restaurantSceneSectionMenus["basic-ordering"];
  const sectionCard = restaurantMenu.cards.find(
    (card) => card.id === "basic-ordering"
  );
  const coffeeLesson =
    section.lessons.find((lesson) => lesson.title.includes("咖啡")) ||
    section.lessons[0];

  return {
    categoryLabel: "场景练习",
    completed: 0,
    href: sectionCard?.href || "/classic-scenes/restaurant-takeout/basic-ordering",
    statusLabel: "可开始",
    title: coffeeLesson?.title || section.title,
    total: sectionCard?.count || section.lessons.length,
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
      featuredLessons={FEATURED_LESSON_SUMMARIES}
      userEmail={session?.user?.email || ""}
      userImage={session?.user?.image || ""}
      userName={session?.user?.name || ""}
    />
  );
}
