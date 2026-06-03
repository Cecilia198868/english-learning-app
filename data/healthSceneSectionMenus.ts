import type { ClassicSceneCategoryIcon } from "./classicSceneCategoryMenus";
import { healthSceneCourseSections } from "./healthSceneCourses";

export type HealthSceneSectionId =
  | "first-visit"
  | "pharmacy-medicine"
  | "checkup-prevention"
  | "medical-insurance"
  | "medical-emergency"
  | "health-followup";

export type HealthSceneLesson = {
  accent: string;
  description?: string;
  icon: ClassicSceneCategoryIcon;
  id: string;
  number: number;
  tile: string;
  title: string;
};

export type HealthSceneSectionMenu = {
  accent: string;
  id: HealthSceneSectionId;
  lessons: HealthSceneLesson[];
  subtitle: string;
  title: string;
};

function courseSectionMenu(
  section: (typeof healthSceneCourseSections)[keyof typeof healthSceneCourseSections]
): HealthSceneSectionMenu {
  return {
    accent: section.accent,
    id: section.id,
    lessons: section.lessons.map(
      ({ accent, description, icon, id, number, tile, title }) => ({
        accent,
        description,
        icon,
        id,
        number,
        tile,
        title,
      })
    ),
    subtitle: section.subtitle,
    title: section.title,
  };
}

export const healthSceneSectionMenus: Record<
  HealthSceneSectionId,
  HealthSceneSectionMenu
> = {
  "first-visit": {
    ...courseSectionMenu(healthSceneCourseSections["first-visit"]),
  },
  "pharmacy-medicine": {
    ...courseSectionMenu(healthSceneCourseSections["pharmacy-medicine"]),
  },
  "checkup-prevention": {
    ...courseSectionMenu(healthSceneCourseSections["checkup-prevention"]),
  },
  "medical-insurance": {
    ...courseSectionMenu(healthSceneCourseSections["medical-insurance"]),
  },
  "medical-emergency": {
    ...courseSectionMenu(healthSceneCourseSections["medical-emergency"]),
  },
  "health-followup": {
    ...courseSectionMenu(healthSceneCourseSections["health-followup"]),
  },
};

export const healthSceneSectionMenuIds = Object.keys(
  healthSceneSectionMenus
) as HealthSceneSectionId[];

export function getHealthSceneSectionMenu(sectionId: string) {
  return healthSceneSectionMenus[sectionId as HealthSceneSectionId];
}
