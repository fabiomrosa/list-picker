import type { Board } from "@list-picker/core";
import type { Announcer } from "./announce.ts";
import type { ProposedMove } from "./drag.ts";
import { landed } from "./landed.ts";

/** The engine's keyboard moving; `destroy()` removes its listeners. */
export interface Keyboard {
  destroy(): void;
  /** Drops the picked-up item, if any, where it is (a pointer press takes over). */
  drop(): void;
  /** Puts `next` in the place of `current`; the focus and a pick up of `current` move to `next`. */
  replace(current: HTMLElement, next: HTMLElement): void;
}

/**
 * What moves: a card (focused itself) among the cards of its list container, or a list (focused
 * by its handle) among its sibling lists.
 */
type Kind = "card" | "list";
const ATTRIBUTE = { card: "data-lp-card", list: "data-lp-list" } as const;

/**
 * A picked-up item, where it was picked up (its container and the item after it, also by id: with
 * `moveElements: false` the renderer may replace those elements), what holds focus.
 */
interface Grab {
  readonly kind: Kind;
  readonly id: string;
  readonly item: HTMLElement;
  readonly focus: HTMLElement;
  readonly container: HTMLElement;
  readonly before: HTMLElement | null;
  /** The list it was picked up in (`null` for a list) and the id of the item after it. */
  readonly origin: { readonly listId: string | null; readonly beforeId: string | null };
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
 * focused card, or a list's focused `[data-lp-list-handle]`, Space picks it up; a card's ↑ ↓ move
 * it one place in its list and ← → to the same position (or the end) in the neighbouring list; a
 * list's ← → move it one place; Space drops it; Esc moves it back to where it was picked up; the
 * focus leaving drops it. Each step is one Board move, then the element moves and the focus stays
 * (with `moveElements: false`, the renderer draws the move and the pick-up follows the item's id).
 * Enter, when nothing is picked up, calls `activate` instead (DEC-17). Nothing is picked up or
 * activated while `pointerBusy()`.
 */
export function createKeyboard<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
  pointerBusy: () => boolean,
  say: Announcer["say"],
  activate?: (kind: Kind, id: string) => void,
  canMove?: (move: ProposedMove) => boolean,
  moveElements = true,
): Keyboard {
  let grab: Grab | undefined;
  /**
   * `moveElements: false` (DEC-18): a step only moves the Board and the renderer draws it, maybe
   * with new elements; while an item is picked up, this finds its element again by id after each
   * redraw and puts the pick-up and the focus back on it.
   */
  const observer = moveElements ? undefined : new MutationObserver(() => follow());
  /** Set by a step of ours until the next key or `focusout` decision: only then is a focus on body a redraw's. */
  let stepped = false;
  /** Set while the focused element (or the list around it) moves: leaving the document may blur it. */
  let moving = false;

  /** The card or the list (by its handle) that `focus` would move, if any. */
  function movable(focus: HTMLElement): Omit<Grab, "before" | "id" | "origin"> | undefined {
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
    if (!moveElements) {
      follow();
      stepped = false;
    }
    if (!grab?.item.isConnected) release(); // its item removed by other code
    const held = grab;
    if (event.key === "Enter") {
      // Enter activates (DEC-17); it never picks up or drops (DEC-15, amended).
      const what = held ? undefined : movable(focus);
      if (!what || !activate || pointerBusy()) return;
      activate(what.kind, what.item.getAttribute(ATTRIBUTE[what.kind]) ?? "");
      event.preventDefault();
      return;
    }
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
    const by = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    if (!held) {
      const what = movable(focus);
      if (event.key !== " " || !what || pointerBusy()) return;
      pick(what);
    } else if (held.focus !== focus) {
      return;
    } else if (event.key === " ") {
      release();
      say("drop", held.kind, held.item);
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
    if (moving || !grab || event.target !== grab.focus) return;
    if (moveElements) {
      const { kind, item } = grab;
      release();
      say("drop", kind, item);
      return;
    }
    // A redraw that replaced or moved the focused element blurs it too (Chrome): decide once the
    // renderer and `follow` are done; only a focus that really left drops the item.
    setTimeout(() => {
      follow();
      stepped = false;
      if (!grab || grab.focus.contains(document.activeElement)) return;
      const { kind, item } = grab;
      release();
      say("drop", kind, item);
    }, 0);
  }

  /** `moveElements: false`: the grab's elements, found again by id after a redraw; the focus too. */
  function follow(): void {
    if (!grab) return;
    const { kind, id } = grab;
    const item = [...root.querySelectorAll<HTMLElement>(`[${ATTRIBUTE[kind]}]`)].find(
      (element) => element.getAttribute(ATTRIBUTE[kind]) === id,
    );
    const focus =
      kind === "card" ? item : item?.querySelector<HTMLElement>("[data-lp-list-handle]");
    if (!item?.parentElement || !focus) return; // not drawn (yet): the next redraw may
    if (item !== grab.item) {
      grab.item.removeAttribute("data-lp-grabbed");
      item.setAttribute("data-lp-grabbed", "");
    }
    // Taken back only from the old element, or from body right after our own step (a redraw blur);
    // body otherwise is a click away, which drops the item.
    const lost =
      grab.focus.contains(document.activeElement) ||
      (stepped && document.activeElement === document.body);
    grab = { ...grab, item, focus, container: item.parentElement };
    if (lost && document.activeElement !== focus) focus.focus();
    if (document.activeElement === focus) stepped = false; // back on it: the redraw is over
  }

  function pick(what: Omit<Grab, "before" | "id" | "origin">): void {
    const items = itemsIn(what.container, what.kind);
    const before = items[items.indexOf(what.item) + 1] ?? null;
    const listId = what.kind === "card" ? what.container.getAttribute("data-lp-cards") : null;
    grab = {
      ...what,
      id: what.item.getAttribute(ATTRIBUTE[what.kind]) ?? "",
      before,
      origin: { listId, beforeId: before?.getAttribute(ATTRIBUTE[what.kind]) ?? null },
    };
    what.item.setAttribute("data-lp-grabbed", "");
    root.addEventListener("focusout", onFocusOut);
    observer?.observe(root, { childList: true, subtree: true });
    say("pickUp", what.kind, what.item); // last, so a message that throws leaves a full grab
  }

  function release(): void {
    if (!grab) return;
    grab.item.removeAttribute("data-lp-grabbed");
    root.removeEventListener("focusout", onFocusOut);
    observer?.disconnect();
    grab = undefined;
  }

  /**
   * Whether `canMove` lets the grabbed item go before `before` (or last) in `container`; where it
   * was picked up always may.
   */
  function allowed({ kind, id, origin }: Grab, container: HTMLElement, before: HTMLElement | null) {
    const toListId = kind === "card" ? container.getAttribute("data-lp-cards") : null;
    const beforeId = before?.getAttribute(ATTRIBUTE[kind]) ?? null;
    // By id: the elements of the origin may have been redrawn since.
    const home = toListId === origin.listId && beforeId === origin.beforeId;
    return !canMove || home || canMove({ kind, id, toListId, beforeId });
  }

  /**
   * One place back (`-1`) or forward (`1`) among its siblings, or further to the first place
   * `canMove` allows; nothing past either end.
   */
  function within(held: Grab, by: -1 | 1): void {
    const { kind, item, focus } = held;
    const container = item.parentElement as HTMLElement;
    const items = itemsIn(container, kind);
    const at = items.indexOf(item);
    // Before items[at - 1], items[at - 2]… going back; before items[at + 2]… (or last) forward.
    for (let k = by === -1 ? at - 1 : at + 2; by === -1 ? k >= 0 : k <= items.length; k += by) {
      const before = items[k] ?? null;
      if (allowed(held, container, before)) {
        place(kind, item, focus, container, before);
        return;
      }
    }
  }

  /**
   * A card to the same position (or the end) in the previous (`-1`) or next (`1`) list, or the
   * first list beyond it that `canMove` allows there.
   */
  function across(held: Grab, by: -1 | 1): void {
    const { item, focus } = held;
    const from = item.parentElement as HTMLElement;
    const at = itemsIn(from, "card").indexOf(item);
    const lists = [...root.querySelectorAll<HTMLElement>("[data-lp-cards]")];
    for (let i = lists.indexOf(from) + by; i >= 0 && i < lists.length; i += by) {
      const to = lists[i] as HTMLElement;
      const before = itemsIn(to, "card")[at] ?? null;
      if (allowed(held, to, before)) {
        place("card", item, focus, to, before);
        return;
      }
    }
  }

  /**
   * Drops it back where it was picked up (at the end if the item after it has left that
   * container); a move to the same place emits nothing.
   */
  function back({ kind, id, item, focus, container, before, origin }: Grab): void {
    release();
    if (!moveElements) {
      // By id, on the Board alone (the renderer draws it); at the end if the item after it left.
      const listId = origin.listId ?? "";
      const there = kind === "card" ? board.getList(listId) : true;
      if (!there) {
        say("cancel", kind, item);
        return;
      }
      const next = origin.beforeId;
      const stays =
        next !== null &&
        (kind === "card" ? board.listOf(next)?.id === listId : board.getList(next) !== undefined);
      byId(kind, id, item, listId, stays ? next : null, "cancel");
      return;
    }
    if (container.isConnected) {
      place(
        kind,
        item,
        focus,
        container,
        before?.parentElement === container ? before : null,
        "cancel",
      );
    } else {
      say("cancel", kind, item);
    }
  }

  /**
   * Moves the item on the Board, then (unless `moveElements` is false) its element, before `before`
   * (or last) in `container`, keeps
   * the focus and announces `event`. If the Board throws, the element follows only when the move happened anyway;
   * the error is rethrown.
   */
  function place(
    kind: Kind,
    item: HTMLElement,
    focus: HTMLElement,
    container: HTMLElement,
    before: HTMLElement | null,
    event: "move" | "cancel" = "move",
  ): void {
    const id = item.getAttribute(ATTRIBUTE[kind]) ?? "";
    const listId = kind === "card" ? (container.getAttribute("data-lp-cards") ?? "") : "";
    const beforeId = before?.getAttribute(ATTRIBUTE[kind]) ?? null;
    if (!moveElements) {
      byId(kind, id, item, listId, beforeId, event);
      return;
    }
    const moveElement = () => {
      moving = true;
      try {
        if (before) before.before(item);
        else container.append(item);
      } finally {
        moving = false;
      }
      focus.focus();
      say(event, kind, item);
    };
    try {
      if (kind === "list") board.moveList(id, beforeId);
      else board.moveCard(id, listId, beforeId);
    } catch (error) {
      if (landed(board, kind, id, listId, beforeId)) moveElement();
      throw error;
    }
    moveElement();
  }

  /** `moveElements: false`: one Board move, announced; the renderer draws it and `follow` refocuses. */
  function byId(
    kind: Kind,
    id: string,
    item: HTMLElement,
    listId: string,
    beforeId: string | null,
    event: "move" | "cancel",
  ): void {
    stepped = true;
    try {
      if (kind === "list") board.moveList(id, beforeId);
      else board.moveCard(id, listId, beforeId);
    } catch (error) {
      // Announced only if the Board moved it anyway (a listener threw after the move).
      if (landed(board, kind, id, listId, beforeId)) say(event, kind, item);
      throw error;
    }
    say(event, kind, item);
  }

  function replace(current: HTMLElement, next: HTMLElement): void {
    const focused = current.contains(document.activeElement);
    moving = true;
    try {
      current.replaceWith(next);
    } finally {
      moving = false;
    }
    if (grab) {
      const swap = (element: HTMLElement) => (element === current ? next : element);
      const { item, focus, before } = grab;
      grab = { ...grab, item: swap(item), focus: swap(focus), before: before && swap(before) };
      if (item === current) next.setAttribute("data-lp-grabbed", "");
    }
    if (focused) next.focus();
  }

  root.addEventListener("keydown", onKeyDown);
  return {
    destroy() {
      release();
      root.removeEventListener("keydown", onKeyDown);
    },
    drop: release,
    replace,
  };
}
