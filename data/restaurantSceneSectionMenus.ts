import type { ClassicSceneCategoryIcon } from "./classicSceneCategoryMenus";
import { restaurantSceneCourseSections } from "./restaurantSceneCourses";

export type RestaurantSceneSectionId =
  | "basic-ordering"
  | "restaurant-dining"
  | "takeout-delivery"
  | "special-dining"
  | "restaurant-payment-after-sale"
  | "restaurant-reservation-group";

export type RestaurantSceneLesson = {
  accent: string;
  icon: ClassicSceneCategoryIcon;
  id: string;
  number: number;
  tile: string;
  title: string;
};

export type RestaurantSceneSectionMenu = {
  accent: string;
  id: RestaurantSceneSectionId;
  lessons: RestaurantSceneLesson[];
  subtitle: string;
  title: string;
};

function courseSectionMenu(
  section: (typeof restaurantSceneCourseSections)[keyof typeof restaurantSceneCourseSections]
): RestaurantSceneSectionMenu {
  return {
    id: section.id,
    title: section.title,
    subtitle: section.subtitle,
    accent: section.accent,
    lessons: section.lessons.map(({ accent, icon, id, number, tile, title }) => ({
      accent,
      icon,
      id,
      number,
      tile,
      title,
    })),
  };
}

export const restaurantSceneSectionMenus: Record<
  RestaurantSceneSectionId,
  RestaurantSceneSectionMenu
> = {
  "basic-ordering": {
    ...courseSectionMenu(restaurantSceneCourseSections["basic-ordering"]),
  },
  "restaurant-dining": {
    ...courseSectionMenu(restaurantSceneCourseSections["restaurant-dining"]),
  },
  "takeout-delivery": {
    ...courseSectionMenu(restaurantSceneCourseSections["takeout-delivery"]),
  },
  "special-dining": {
    ...courseSectionMenu(restaurantSceneCourseSections["special-dining"]),
  },
  "restaurant-payment-after-sale": {
    ...courseSectionMenu(
      restaurantSceneCourseSections["restaurant-payment-after-sale"]
    ),
  },
  "restaurant-reservation-group": {
    ...courseSectionMenu(
      restaurantSceneCourseSections["restaurant-reservation-group"]
    ),
  },
};

export const restaurantSceneSectionMenuIds = Object.keys(
  restaurantSceneSectionMenus
) as RestaurantSceneSectionId[];

export function getRestaurantSceneSectionMenu(sectionId: string) {
  return restaurantSceneSectionMenus[sectionId as RestaurantSceneSectionId];
}
