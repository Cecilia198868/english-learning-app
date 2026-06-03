import type { ClassicSceneCategoryIcon } from "./classicSceneCategoryMenus";
import {
  shoppingSceneCourseSections,
  type ShoppingSceneSectionId,
} from "./shoppingSceneCourses";

export type { ShoppingSceneSectionId } from "./shoppingSceneCourses";

export type ShoppingSceneLesson = {
  accent: string;
  icon: ClassicSceneCategoryIcon;
  id: string;
  number: number;
  tile: string;
  title: string;
};

export type ShoppingSceneSectionMenu = {
  accent: string;
  id: ShoppingSceneSectionId;
  lessons: ShoppingSceneLesson[];
  subtitle: string;
  title: string;
};

export const shoppingSceneSectionMenus: Record<
  ShoppingSceneSectionId,
  ShoppingSceneSectionMenu
> = Object.fromEntries(
  Object.entries(shoppingSceneCourseSections).map(([sectionId, section]) => [
    sectionId,
    {
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      accent: section.accent,
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
    },
  ])
) as Record<ShoppingSceneSectionId, ShoppingSceneSectionMenu>;

export const shoppingSceneSectionMenuIds = Object.keys(
  shoppingSceneSectionMenus
) as ShoppingSceneSectionId[];

export function getShoppingSceneSectionMenu(sectionId: string) {
  return shoppingSceneSectionMenus[sectionId as ShoppingSceneSectionId];
}
