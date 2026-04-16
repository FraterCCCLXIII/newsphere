import {
  closestCorners,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";

/**
 * Prefer droppables under the pointer, then fall back to corner distances.
 * `closestCenter` is a poor fit for mixed full-width headers and column cards;
 * it can pick the wrong target and make shuffles look like they pass behind.
 */
export const gridSortCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }
  return closestCorners(args);
};

/**
 * During sort, give higher z-index to items closer to the active drag index so
 * displaced cards paint above ones farther away (reduces “behind” overlap).
 */
export function sortableStackZIndex(
  isSorting: boolean,
  isDragging: boolean,
  index: number,
  activeIndex: number,
): number | undefined {
  if (!isSorting || isDragging) return undefined;
  if (activeIndex < 0) return undefined;
  const proximity = 80 - Math.abs(index - activeIndex);
  return 200 + Math.max(0, proximity);
}
