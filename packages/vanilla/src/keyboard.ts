import type { Board } from "@list-picker/core";
import { landed } from "./landed.ts";

/** The engine's keyboard moving; `destroy()` removes its listeners. */
export interface Keyboard {
  destroy(): void;
  /** Drops the picked-up item, if any, where it is (a pointer press takes over). */
  drop(): void;
}

/**
 * What moves: a card (focused itself) among the cards of its list container, or a list (focused
 * by its handle) among its sibling lists.
 */
type Kind = "card" | "list";
const ATTRIBUTE = { card: "data-lp-card", list: "data-lp-list" } as const;

/** A picked-up item, where it was picked up (its container, the item after it), what holds focus. */
interface Grab {
  readonly kind: Kind;
  readonly item: HTMLElement;
  readonly focus: HTMLElement;
  readonly container: HTMLElement;
  readonly before: HTMLElement | null;
}

/** The items of `kind` among the children of `container`, in order. */
function itemsIn(container: Element, kind: Kind): HTMLElement[] {
  return [...container.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.hasAttribute(ATTRIBUTE[kind]),
  );
}

/**
 * Moves cards and lists with the keyboard (DEC-15), in the drag engine's markup (DEC-13): on a
 * focused card, or a list's focused `[data-lp-list-handle]`, Space or Enter picks it up; a card's
 * ↑ ↓ move it one place in its list and ← → to the same position (or the end) in the neighbouring
 * list; a list's ← → move it one place; Space or Enter drops it; Esc moves it back to where it was
 * picked up; the focus leaving drops it. Each step is one Board move, then the element moves and
 * the focus stays. Nothing is picked up while `pointerBusy()`.
 */
export function createKeyboard<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
  pointerBusy: () => boolean,
): Keyboard {
  let grab: Grab | undefined;
  /** Set while the focused element (or the list around it) moves: leaving the document may blur it. */
  let moving = false;

  /** The card or the list (by its handle) that `focus` would move, if any. */
  function movable(focus: HTMLElement): Omit<Grab, "before"> | undefined {
    if (focus.hasAttribute(ATTRIBUTE.card) && focus.parentElement?.hasAttribute("data-lp-cards")) {
      return { kind: "card", item: focus, focus, container: focus.parentElement };
    }
    const list = focus.hasAttribute("data-lp-list-handle")
      ? focus.closest<HTMLElement>(`[${ATTRIBUTE.list}]`)
      : null;
    if (!list?.parentElement || !root.contains(list)) return undefined;
    return { kind: "list", item: list, focus, container: list.parentElement };
  }

  function onKeyDown(event: KeyboardEvent): void {
    const focus = event.target;
    // Only on the card or the handle itself: their controls keep their keys.
    if (!(focus instanceof HTMLElement) || !root.contains(focus)) return;
    if (event.repeat && (event.key === " " || event.key === "Enter")) return;
    if (!grab?.item.isConnected) release(); // its item removed by other code
    const held = grab;
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
    const by = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    if (!held) {
      const what = movable(focus);
      if ((event.key !== " " && event.key !== "Enter") || !what || pointerBusy()) return;
      pick(what);
    } else if (held.focus !== focus) {
      return;
    } else if (event.key === " " || event.key === "Enter") {
      release();
    } else if (event.key === "Escape") {
      back(held);
    } else if (horizontal && held.kind === "card") {
      across(held, by);
    } else if (horizontal || (vertical && held.kind === "card")) {
      within(held, by);
    } else {
      return;
    }
    // A handled key does not also scroll the page or press a button.
    event.preventDefault();
  }

  function onFocusOut(event: FocusEvent): void {
    if (!moving && event.target === grab?.focus) release();
  }

  function pick(what: Omit<Grab, "before">): void {
    const items = itemsIn(what.container, what.kind);
    grab = { ...what, before: items[items.indexOf(what.item) + 1] ?? null };
    what.item.setAttribute("data-lp-grabbed", "");
    root.addEventListener("focusout", onFocusOut);
  }

  function release(): void {
    if (!grab) return;
    grab.item.removeAttribute("data-lp-grabbed");
    root.removeEventListener("focusout", onFocusOut);
    grab = undefined;
  }

  /** One place back (`-1`) or forward (`1`) among its siblings; nothing past either end. */
  function within({ kind, item, focus }: Grab, by: -1 | 1): void {
    const container = item.parentElement as HTMLElement;
    const items = itemsIn(container, kind);
    const at = items.indexOf(item);
    if (by === -1 && at > 0) place(kind, item, focus, container, items[at - 1] ?? null);
    if (by === 1 && at < items.length - 1) {
      place(kind, item, focus, container, items[at + 2] ?? null);
    }
  }

  /** A card to the same position (or the end) in the previous (`-1`) or next (`1`) list. */
  function across({ item, focus }: Grab, by: -1 | 1): void {
    const from = item.parentElement as HTMLElement;
    const lists = [...root.querySelectorAll<HTMLElement>("[data-lp-cards]")];
    const to = lists[lists.indexOf(from) + by];
    if (!to) return;
    place(
      "card",
      item,
      focus,
      to,
      itemsIn(to, "card")[itemsIn(from, "card").indexOf(item)] ?? null,
    );
  }

  /**
   * Drops it back where it was picked up (at the end if the item after it has left that
   * container); a move to the same place emits nothing.
   */
  function back({ kind, item, focus, container, before }: Grab): void {
    release();
    if (container.isConnected) {
      place(kind, item, focus, container, before?.parentElement === container ? before : null);
    }
  }

  /**
   * Moves the item on the Board, then its element, before `before` (or last) in `container`, and
   * keeps the focus. If the Board throws, the element follows only when the move happened anyway;
   * the error is rethrown.
   */
  function place(
    kind: Kind,
    item: HTMLElement,
    focus: HTMLElement,
    container: HTMLElement,
    before: HTMLElement | null,
  ): void {
    const id = item.getAttribute(ATTRIBUTE[kind]) ?? "";
    const listId = kind === "card" ? (container.getAttribute("data-lp-cards") ?? "") : "";
    const beforeId = before?.getAttribute(ATTRIBUTE[kind]) ?? null;
    const follow = () => {
      moving = true;
      try {
        if (before) before.before(item);
        else container.append(item);
      } finally {
        moving = false;
      }
      focus.focus();
    };
    try {
      if (kind === "list") board.moveList(id, beforeId);
      else board.moveCard(id, listId, beforeId);
    } catch (error) {
      if (landed(board, kind, id, listId, beforeId)) follow();
      throw error;
    }
    follow();
  }

  root.addEventListener("keydown", onKeyDown);
  return {
    destroy() {
      release();
      root.removeEventListener("keydown", onKeyDown);
    },
    drop: release,
  };
}
