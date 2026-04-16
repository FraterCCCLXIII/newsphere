import {
  cloneElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const DEFAULT_OPEN_DELAY = 200;
const DEFAULT_CLOSE_DELAY = 80;
const SIDE_OFFSET = 6;

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): Ref<T> | undefined {
  return (node: T | null) => {
    for (const r of refs) {
      if (typeof r === "function") r(node);
      else if (r && typeof r === "object")
        (r as MutableRefObject<T | null>).current = node;
    }
  };
}

type TriggerProps = {
  onPointerEnter?: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave?: (e: ReactPointerEvent<HTMLElement>) => void;
  ref?: Ref<HTMLElement>;
} & Record<string, unknown>;

/**
 * Article preview on hover: panel opens below, left-aligned with the trigger.
 * Moving the pointer onto the panel closes it (preview is trigger-only).
 */
export function FeedArticleHoverCard({
  trigger,
  children,
  openDelay = DEFAULT_OPEN_DELAY,
  closeDelay = DEFAULT_CLOSE_DELAY,
  panelClassName,
}: {
  trigger: ReactElement<TriggerProps>;
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const scheduleShow = useCallback(() => {
    clearTimers();
    showTimerRef.current = setTimeout(() => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const margin = 8;
      const panelMaxW = Math.min(vw - 2 * margin, 22 * 16);
      const left = Math.max(margin, Math.min(r.left, vw - margin - panelMaxW));
      setCoords({ top: r.bottom + SIDE_OFFSET, left });
      setOpen(true);
    }, openDelay);
  }, [clearTimers, openDelay]);

  const scheduleHide = useCallback(() => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => setOpen(false), closeDelay);
  }, [clearTimers, closeDelay]);

  const closePanel = useCallback(() => {
    clearTimers();
    setOpen(false);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const triggerRefFromProps = trigger.props.ref;
  const triggerEl = cloneElement(trigger, {
    ref: mergeRefs(triggerRef, triggerRefFromProps),
    onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "touch") return;
      scheduleShow();
      trigger.props.onPointerEnter?.(e);
    },
    onPointerLeave: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "touch") return;
      scheduleHide();
      trigger.props.onPointerLeave?.(e);
    },
  });

  return (
    <>
      {triggerEl}
      {open
        ? createPortal(
            <div
              className={cn(
                "fixed z-50 w-[min(100vw-2rem,22rem)] max-w-[min(100vw-2rem,22rem)] rounded-md border border-border bg-popover p-0 text-popover-foreground shadow-md outline-none",
                panelClassName,
              )}
              style={{ top: coords.top, left: coords.left }}
              onPointerEnter={(e) => {
                if (e.pointerType === "touch") return;
                closePanel();
              }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
