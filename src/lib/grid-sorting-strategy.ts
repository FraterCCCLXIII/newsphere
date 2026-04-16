import type { SortingStrategy } from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import type { Transform } from "@dnd-kit/utilities";

/**
 * Same layout motion as `rectSortingStrategy`, but without scaling. The default
 * strategy scales items to the target cell’s width/height, which looks like
 * squashing/stretching when reordering multi-column grid cards of different sizes.
 */
export const rectSortingNoScaleStrategy: SortingStrategy = ({
  rects,
  activeIndex,
  overIndex,
  index,
}) => {
  const newRects = arrayMove(rects, overIndex, activeIndex);
  const oldRect = rects[index];
  const newRect = newRects[index];

  if (!newRect || !oldRect) {
    return null;
  }

  const transform: Transform = {
    x: newRect.left - oldRect.left,
    y: newRect.top - oldRect.top,
    scaleX: 1,
    scaleY: 1,
  };
  return transform;
};
