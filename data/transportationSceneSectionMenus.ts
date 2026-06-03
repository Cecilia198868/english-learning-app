import type { ClassicSceneCategoryIcon } from "./classicSceneCategoryMenus";
import { transportationSceneCourseSections } from "./transportationSceneCourses";

export type TransportationSceneSectionId =
  | "airport-scenes"
  | "public-transport"
  | "taxi-rideshare"
  | "directions-navigation"
  | "car-rental-self-driving"
  | "travel-emergency";

export type TransportationSceneLesson = {
  accent: string;
  icon: ClassicSceneCategoryIcon;
  id: string;
  number: number;
  tile: string;
  title: string;
};

export type TransportationSceneSectionMenu = {
  accent: string;
  id: TransportationSceneSectionId;
  lessons: TransportationSceneLesson[];
  subtitle: string;
  title: string;
};

function courseSectionMenu(
  section: (typeof transportationSceneCourseSections)[keyof typeof transportationSceneCourseSections]
): TransportationSceneSectionMenu {
  return {
    accent: section.accent,
    id: section.id,
    lessons: section.lessons.map(
      ({ accent, icon, id, number, tile, title }) => ({
        accent,
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

export const transportationSceneSectionMenus: Record<
  TransportationSceneSectionId,
  TransportationSceneSectionMenu
> = {
  "airport-scenes": {
    ...courseSectionMenu(transportationSceneCourseSections["airport-scenes"]),
  },
  "public-transport": {
    ...courseSectionMenu(transportationSceneCourseSections["public-transport"]),
  },
  "taxi-rideshare": {
    ...courseSectionMenu(transportationSceneCourseSections["taxi-rideshare"]),
  },
  "directions-navigation": {
    ...courseSectionMenu(transportationSceneCourseSections["directions-navigation"]),
  },
  "car-rental-self-driving": {
    ...courseSectionMenu(transportationSceneCourseSections["car-rental-self-driving"]),
  },
  "travel-emergency": {
    ...courseSectionMenu(transportationSceneCourseSections["travel-emergency"]),
  },
};

export const transportationSceneSectionMenuIds = Object.keys(
  transportationSceneSectionMenus
) as TransportationSceneSectionId[];

export function getTransportationSceneSectionMenu(sectionId: string) {
  return transportationSceneSectionMenus[
    sectionId as TransportationSceneSectionId
  ];
}
