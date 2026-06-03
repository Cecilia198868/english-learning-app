import type { ClassicSceneCategoryIcon } from "./classicSceneCategoryMenus";
import { educationSceneCourseSections } from "./educationSceneCourses";

export type EducationSceneSectionId =
  | "school-campus"
  | "job-interview"
  | "workplace-communication"
  | "social-relationship"
  | "career-growth"
  | "community-integration";

export type EducationSceneLesson = {
  accent: string;
  description: string;
  icon: ClassicSceneCategoryIcon;
  id: string;
  number: number;
  tile: string;
  title: string;
};

export type EducationSceneSectionMenu = {
  accent: string;
  id: EducationSceneSectionId;
  lessons: EducationSceneLesson[];
  subtitle: string;
  title: string;
};

function courseSectionMenu(
  section: (typeof educationSceneCourseSections)[keyof typeof educationSceneCourseSections]
): EducationSceneSectionMenu {
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

export const educationSceneSectionMenus: Record<
  EducationSceneSectionId,
  EducationSceneSectionMenu
> = {
  "school-campus": {
    ...courseSectionMenu(educationSceneCourseSections["school-campus"]),
  },
  "job-interview": {
    ...courseSectionMenu(educationSceneCourseSections["job-interview"]),
  },
  "workplace-communication": {
    ...courseSectionMenu(
      educationSceneCourseSections["workplace-communication"]
    ),
  },
  "social-relationship": {
    ...courseSectionMenu(educationSceneCourseSections["social-relationship"]),
  },
  "career-growth": {
    ...courseSectionMenu(educationSceneCourseSections["career-growth"]),
  },
  "community-integration": {
    ...courseSectionMenu(educationSceneCourseSections["community-integration"]),
  },
};

export const educationSceneSectionMenuIds = Object.keys(
  educationSceneSectionMenus
) as EducationSceneSectionId[];

export function getEducationSceneSectionMenu(sectionId: string) {
  return educationSceneSectionMenus[sectionId as EducationSceneSectionId];
}
