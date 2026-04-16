import { Heading, Newspaper } from "lucide-react";
import {
  cloneElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type MouseEventHandler,
  type MutableRefObject,
  type ReactElement,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

type GridInsertPlusMenuProps = {
  insertAfterId: string | null;
  onInsertSectionHeader: (afterId: string | null) => void;
  onOpenAddFeedModal: (afterId: string | null) => void;
  /** Fires when the menu opens or closes (e.g. to keep the trigger visible). */
  onOpenChange?: (open: boolean) => void;
  /** Must be a single element that accepts onClick (e.g. button). */
  trigger: ReactElement<
    { onClick?: MouseEventHandler; ref?: Ref<HTMLElement> } & Record<
      string,
      unknown
    >
  >;
};

function mergeRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): Ref<T> | undefined {
  return (node: T | null) => {
    for (const r of refs) {
      if (typeof r === "function") r(node);
      else if (r && typeof r === "object")
        (r as MutableRefObject<T | null>).current = node;
    }
  };
}

/**
 * Menu anchored to the pointer position (top-left of menu below the click point).
 */
export function GridInsertPlusMenu({
  insertAfterId,
  onInsertSectionHeader,
  onOpenAddFeedModal,
  onOpenChange,
  trigger,
}: GridInsertPlusMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      close();
    };

    const onScroll = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (menuRef.current?.contains(t)) return;
      close();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close]);

  const triggerRefFromProps = (
    trigger as ReactElement & {
      props: { ref?: Ref<HTMLElement> };
    }
  ).props.ref;

  const triggerEl = cloneElement(trigger, {
    ref: mergeRefs(
      triggerRef as MutableRefObject<HTMLElement | null>,
      triggerRefFromProps,
    ),
    "aria-expanded": open,
    "data-state": open ? "open" : "closed",
    onClick: (e: ReactMouseEvent<HTMLElement>) => {
      e.preventDefault();
      setOpen((prev) => {
        if (prev) return false;
        setCoords({ x: e.clientX, y: e.clientY });
        return true;
      });
      trigger.props.onClick?.(e);
    },
  });

  const menu = open ? (
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[100] min-w-[13rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in duration-200 ease-out"
        style={{
          left: coords.x,
          top: coords.y + 4,
          transform: "translateX(-50%)",
        }}
      >
        <button
          type="button"
          role="menuitem"
          className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
          onClick={() => {
            onInsertSectionHeader(insertAfterId);
            close();
          }}
        >
          <Heading className="size-4 shrink-0" aria-hidden />
          New section header
        </button>
        <button
          type="button"
          role="menuitem"
          className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
          onClick={() => {
            onOpenAddFeedModal(insertAfterId);
            close();
          }}
        >
          <Newspaper className="size-4 shrink-0" aria-hidden />
          New feed
        </button>
      </div>,
      document.body,
    )
  ) : null;

  return (
    <>
      {triggerEl}
      {menu}
    </>
  );
}
