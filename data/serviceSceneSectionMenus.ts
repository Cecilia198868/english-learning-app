import type { ClassicSceneCategoryIcon } from "./classicSceneCategoryMenus";
import { serviceSceneCourseSections } from "./serviceSceneCourses";

export type ServiceSceneSectionId =
  | "delivery-logistics"
  | "after-sale-return"
  | "home-appliance-repair"
  | "beauty-hair-service"
  | "electronics-repair"
  | "professional-services";

export type ServiceSceneLesson = {
  accent: string;
  description: string;
  icon: ClassicSceneCategoryIcon;
  id: string;
  number: number;
  tile: string;
  title: string;
};

export type ServiceSceneSectionMenu = {
  accent: string;
  id: ServiceSceneSectionId;
  lessons: ServiceSceneLesson[];
  subtitle: string;
  title: string;
};

function courseSectionMenu(
  section: (typeof serviceSceneCourseSections)[keyof typeof serviceSceneCourseSections]
): ServiceSceneSectionMenu {
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

export const serviceSceneSectionMenus: Record<
  ServiceSceneSectionId,
  ServiceSceneSectionMenu
> = {
  "delivery-logistics": {
    ...courseSectionMenu(serviceSceneCourseSections["delivery-logistics"]),
  },
  "after-sale-return": {
    ...courseSectionMenu(serviceSceneCourseSections["after-sale-return"]),
  },
  "home-appliance-repair": {
    ...courseSectionMenu(serviceSceneCourseSections["home-appliance-repair"]),
  },
  "beauty-hair-service": {
    ...courseSectionMenu(serviceSceneCourseSections["beauty-hair-service"]),
  },
  "electronics-repair": {
    ...courseSectionMenu(serviceSceneCourseSections["electronics-repair"]),
  },
  "professional-services": {
    ...courseSectionMenu(serviceSceneCourseSections["professional-services"]),
  },
};

export const serviceSceneSectionMenuIds = Object.keys(
  serviceSceneSectionMenus
) as ServiceSceneSectionId[];

export function getServiceSceneSectionMenu(sectionId: string) {
  return serviceSceneSectionMenus[sectionId as ServiceSceneSectionId];
}
