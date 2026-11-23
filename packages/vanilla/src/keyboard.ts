import type { Board } from "@list-picker/core";
import { landed } from "./landed.ts";

/** The engine's keyboard moving; `destroy()` removes its listeners. */
export interface Keyboard {
  destroy(): void;
  /** The card picked up, if any. */
  grabbed(): HTMLElement | undefined;
}

/** A picked-up card, and where it was picked up: its list container and the card after it. */
interface Grab {
  readonly item: HTMLElement;
  readonly container: HTMLElement;
  readonly before: HTMLElement | null;
}

const CARD = "data-lp-card";
const CARDS = "data-lp-cards";

/** The cards among the children of `container`, in order. */
function cardsIn(container: Element): HTMLElement[] {
  return [...container.children].filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.hasAttribute(CARD),
  );
}

/**
 * Moves cards with the keyboard (DEC-15), in the drag engine's markup (DEC-13): on a focused card,
 * Space or Enter picks it up; ↑ ↓ move it one place in its list; ← → to the same position (or the
 * end) in the neighbouring list; Space or Enter drops it; Esc moves it back to where it was picked
 * up; the focus leaving it drops it. Each step is one Board move, then the card's element moves
 * and keeps the focus. Nothing is picked up while `pointerBusy()`.
 */
export function createKeyboard<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
  pointerBusy: () => boolean,
): Keyboard {
  let grab: Grab | undefined;
  /** Set while the card's own element moves: leaving the document may blur it. */
  let moving = false;

  /** The grab, dropped first if its card has left the document (removed by other code). */
  function current(): Grab | undefined {
    if (grab && !grab.item.isConnected) release();
    return grab;
  }

  function onKeyDown(event: KeyboardEvent): void {
    const item = event.target;
    // Only on the card itself: its controls keep their keys.
    if (!(item instanceof HTMLElement) || !item.hasAttribute(CARD) || !root.contains(item)) return;
    const held = current();
    if (!held) {
      if (event.key !== " " && event.key !== "Enter") return;
      if (pointerBusy() || !item.parentElement?.hasAttribute(CARDS)) return;
      pick(item);
    } else if (held.item !== item) {
      return;
    } else if (event.key === " " || event.key === "Enter") {
      release();
    } else if (event.key === "Escape") {
      back(held);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      within(item, event.key === "ArrowUp" ? -1 : 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      across(item, event.key === "ArrowLeft" ? -1 : 1);
    } else {
      return;
    }
    // A handled key does not also scroll the page or press a button.
    event.preventDefault();
  }

  function onFocusOut(event: FocusEvent): void {
    if (!moving && event.target === grab?.item) release();
  }

  function pick(item: HTMLElement): void {
    const container = item.parentElement as HTMLElement;
    const cards = cardsIn(container);
    grab = { item, container, before: cards[cards.indexOf(item) + 1] ?? null };
    item.setAttribute("data-lp-grabbed", "");
    root.addEventListener("focusout", onFocusOut);
  }

  function release(): void {
    if (!grab) return;
    grab.item.removeAttribute("data-lp-grabbed");
    root.removeEventListener("focusout", onFocusOut);
    grab = undefined;
  }

  /** One place up (`-1`) or down (`1`) in its list; nothing past either end. */
  function within(item: HTMLElement, by: -1 | 1): void {
    const container = item.parentElement as HTMLElement;
    const cards = cardsIn(container);
    const at = cards.indexOf(item);
    if (by === -1 && at > 0) place(item, container, cards[at - 1] ?? null);
    if (by === 1 && at < cards.length - 1) place(item, container, cards[at + 2] ?? null);
  }

  /** To the same position (or the end) in the previous (`-1`) or next (`1`) list. */
  function across(item: HTMLElement, by: -1 | 1): void {
    const from = item.parentElement as HTMLElement;
    const lists = [...root.querySelectorAll<HTMLElement>(`[${CARDS}]`)];
    const to = lists[lists.indexOf(from) + by];
    if (!to) return;
    place(item, to, cardsIn(to)[cardsIn(from).indexOf(item)] ?? null);
  }

  /**
   * Drops it back where it was picked up (at its list's end if the card after it has left that
   * list); a move to the same place emits nothing.
   */
  function back({ item, container, before }: Grab): void {
    release();
    if (container.isConnected)
      place(item, container, before?.parentElement === container ? before : null);
  }

  /**
   * Moves the card on the Board, then its element, before `before` (or last) in `container`. If
   * the Board throws, the element follows only when the move happened anyway; the error is rethrown.
   */
  function place(item: HTMLElement, container: HTMLElement, before: HTMLElement | null): void {
    const id = item.getAttribute(CARD) ?? "";
    const listId = container.getAttribute(CARDS) ?? "";
    const beforeId = before?.getAttribute(CARD) ?? null;
    const follow = () => {
      moving = true;
      try {
        if (before) before.before(item);
        else container.append(item);
      } finally {
        moving = false;
      }
      item.focus();
    };
    try {
      board.moveCard(id, listId, beforeId);
    } catch (error) {
      if (landed(board, "card", id, listId, beforeId)) follow();
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
    grabbed: () => current()?.item,
  };
}
