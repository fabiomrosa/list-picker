import type { Board } from "@list-picker/core";
import { createAnnouncer, type Messages } from "./announce.ts";
import { createKeyboard } from "./keyboard.ts";
import { landed } from "./landed.ts";

/** A running drag engine; `destroy()` removes every listener it added. */
export interface Drag {
  destroy(): void;
}

/** What was activated: a card, or a list (by its handle). */
export interface Activation {
  readonly kind: "card" | "list";
  readonly id: string;
}

/** A move the engine is about to show or apply, for `canMove` to allow or refuse. */
export interface ProposedMove {
  readonly kind: "card" | "list";
  readonly id: string;
  /** The list a card would go into; `null` for a list. */
  readonly toListId: string | null;
  /** The card (or list) it would go before; `null` for the end. */
  readonly beforeId: string | null;
}

/** Options of `createDrag` and `mount`. */
export interface DragOptions {
  readonly messages?: Partial<Messages>;
  /**
   * Called on a click on a card or a list's handle that started no drag, and on Enter on a
   * focused one (DEC-17), to open the app's own view of it; not on its controls.
   */
  readonly onActivate?: (item: Activation) => void;
  /**
   * Whether an item may go to a place (DEC-17), asked before a pointer drag shows it there (in
   * each frame the place changes) and before a keyboard step: a refused place is never shown or
   * applied. Where the item was picked up is always allowed. Synchronous and cheap.
   */
  readonly canMove?: (move: ProposedMove) => boolean;
}

/** How far (px) the pointer must move after a press before the press becomes a drag. */
const THRESHOLD = 4;
/** Auto-scroll: within this many px of a scrollable container's edge… */
const EDGE = 40;
/** …scroll up to this many px per frame, more the closer the pointer is to the edge. */
const MAX_STEP = 20;
const SCROLLS = /auto|scroll/;

/** Pixels to scroll this frame for a pointer `distance` px inside an edge (0 beyond EDGE). */
function speed(distance: number): number {
  return distance < EDGE ? Math.ceil(((EDGE - Math.max(distance, 0)) / EDGE) * MAX_STEP) : 0;
}

/** Where to scroll a container this frame; an axis is absent when it does not move. */
interface ScrollStep {
  readonly element: HTMLElement;
  readonly left?: number;
  readonly top?: number;
}

/** Presses on these start no drag, so controls inside a card or a list keep working. */
const INTERACTIVE = "button, input, select, textarea, a[href], [contenteditable]";

/**
 * What is being dragged: a card among the cards of the list container under the pointer
 * (vertically), or a list among its sibling lists (horizontally, pressed by its handle).
 */
interface Kind {
  readonly attribute: "data-lp-card" | "data-lp-list";
  readonly horizontal: boolean;
}
const CARD: Kind = { attribute: "data-lp-card", horizontal: false };
const LIST: Kind = { attribute: "data-lp-list", horizontal: true };

interface Press {
  readonly kind: Kind;
  readonly item: HTMLElement;
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

/** A place among the items of `container`: before an item, or at the end (`before: null`). */
interface Target {
  readonly container: HTMLElement;
  readonly before: HTMLElement | null;
}

interface Active {
  readonly kind: Kind;
  readonly item: HTMLElement;
  readonly clone: HTMLElement;
  readonly placeholder: HTMLElement;
  /** The item's own inline `display`, restored when it is shown again. */
  readonly display: string;
  /** Where it was picked up: always an allowed place. */
  readonly origin: Target;
}

/**
 * Makes the cards and lists under `root` draggable (DEC-08, DEC-10, DEC-13), in the user's own
 * markup: cards are `[data-lp-card]` elements inside `[data-lp-cards]` list containers; lists are
 * `[data-lp-list]` elements, dragged by a `[data-lp-list-handle]` inside them. Pick up, drop
 * and cancel (and each keyboard step) are announced in a live region (DEC-16), in English unless
 * `options.messages` replaces a message. A click (that started no drag) or Enter on an item calls
 * `options.onActivate`; the click that ends a drag reaches neither the item nor the page.
 */
export function createDrag<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
  options: DragOptions = {},
): Drag {
  const { destroy } = startDrag(root, board, () => {}, options);
  return { destroy };
}

/** `mount`'s view of the engine (not exported from the package). */
export interface MountedDrag extends Drag {
  /** The card or list being dragged, if a drag is active. */
  dragged(): HTMLElement | undefined;
  /** Abandons the active drag, as Esc does. */
  cancel(): void;
  /** Puts `next` in the place of `current`; the focus, a keyboard pick up and a press follow. */
  replace(current: HTMLElement, next: HTMLElement): void;
}

/** `createDrag`, plus `onEnd`, called each time a drag ends (dropped or abandoned). */
export function startDrag<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
  onEnd: () => void,
  options: DragOptions = {},
): MountedDrag {
  let press: Press | undefined;
  let active: Active | undefined;
  /** The latest press became a drag: the click that ends it is swallowed. */
  let dragged = false;
  const announcer = createAnnouncer(root, board, options.messages);
  const { onActivate, canMove } = options;
  const keyboard = createKeyboard(
    root,
    board,
    () => press !== undefined,
    announcer.say,
    onActivate && ((kind, id) => onActivate({ kind, id })),
    canMove,
  );
  const name = (kind: Kind) => (kind === LIST ? "list" : "card");
  /** The latest pointer position; read once per animation frame. */
  let pointerAt = { x: 0, y: 0 };
  let frame: number | undefined;

  /** The list (by its handle) or the card a press on `target` would drag, if any. */
  function pressed(target: Element): { kind: Kind; item: HTMLElement } | undefined {
    const handle = target.closest("[data-lp-list-handle]");
    const list = handle?.closest<HTMLElement>("[data-lp-list]");
    const [kind, item] = list
      ? [LIST, list]
      : [CARD, target.closest<HTMLElement>("[data-lp-card]")];
    if (!item || !root.contains(item)) return undefined;
    const control = target.closest(INTERACTIVE);
    // A control inside the item keeps working; a handle that is itself a control still drags.
    if (control && item.contains(control) && control !== handle) return undefined;
    return { kind, item };
  }

  function onPointerDown(event: PointerEvent): void {
    keyboard.drop(); // a pointer drag and a keyboard move never run at once
    if (press || event.button !== 0 || !(event.target instanceof Element)) return;
    const what = pressed(event.target);
    if (!what) return;
    press = { ...what, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    // Captured from the press, so the release always comes back here, even outside `root`.
    try {
      what.item.setPointerCapture(event.pointerId);
    } catch {
      // An inactive pointer (synthetic events): the root listeners still see bubbling events.
    }
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerEnd);
    root.addEventListener("pointercancel", onPointerEnd);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!press || event.pointerId !== press.pointerId) return;
    pointerAt = { x: event.clientX, y: event.clientY };
    if (!active) {
      if (Math.hypot(pointerAt.x - press.x, pointerAt.y - press.y) <= THRESHOLD) return;
      // Removed since the press (`mount` follows the Board until a drag starts): nothing to drag.
      if (!press.item.isConnected) {
        end();
        return;
      }
      active = start(press.kind, press.item);
      dragged = true;
      // Only during a drag (AGENTS: no document listener outside one).
      document.addEventListener("keydown", onKeyDown);
      // Last: a user's message that throws leaves a drag that Esc still cancels.
      announcer.say("pickUp", name(press.kind), press.item);
    }
    // Only store the pointer here; the DOM is written once per frame (no layout thrashing).
    frame ??= requestAnimationFrame(update);
  }

  /** Once per frame: reads what is under the pointer, then writes (no read after a write). */
  function update(): void {
    frame = undefined;
    if (!press || !active) return;
    const under = document.elementFromPoint(pointerAt.x, pointerAt.y);
    const target = dropTarget(active, under);
    const steps = scrollSteps(under);
    active.clone.style.transform = `translate(${pointerAt.x - press.x}px, ${pointerAt.y - press.y}px)`;
    if (target && allowed(active, target)) place(active, target);
    for (const { element, left, top } of steps) {
      if (left !== undefined) element.scrollLeft = left;
      if (top !== undefined) element.scrollTop = top;
    }
    // Keep scrolling while the pointer rests near an edge; the Placeholder retargets each frame.
    if (steps.length > 0) frame = requestAnimationFrame(update);
  }

  /**
   * For each scrollable container around the pointer (from the element under it up to `root`), how
   * far to scroll this frame: within EDGE px of an edge, faster closer to it.
   */
  function scrollSteps(under: Element | null): ScrollStep[] {
    if (!under || !root.contains(under)) return [];
    const steps: ScrollStep[] = [];
    for (let el: Element | null = under; el; el = el === root ? null : el.parentElement) {
      if (!(el instanceof HTMLElement)) continue;
      const style = getComputedStyle(el);
      const canY = SCROLLS.test(style.overflowY) && el.scrollHeight > el.clientHeight;
      const canX = SCROLLS.test(style.overflowX) && el.scrollWidth > el.clientWidth;
      if (!canX && !canY) continue;
      // Only the visible part counts: a list cut off by the window scrolls at the window's edge.
      const rect = el.getBoundingClientRect();
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      const left = Math.max(rect.left, 0);
      const right = Math.min(rect.right, window.innerWidth);
      const dy = canY ? speed(bottom - pointerAt.y) - speed(pointerAt.y - top) : 0;
      const dx = canX ? speed(right - pointerAt.x) - speed(pointerAt.x - left) : 0;
      // Targets are computed here, in the read phase; an axis already at its limit stays put, so
      // the frame loop stops when there is nothing left to scroll.
      const step: { element: HTMLElement; left?: number; top?: number } = { element: el };
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight : dy < 0 && el.scrollTop > 0) {
        step.top = el.scrollTop + dy;
      }
      if (dx > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth : dx < 0 && el.scrollLeft > 0) {
        step.left = el.scrollLeft + dx;
      }
      if (step.top !== undefined || step.left !== undefined) steps.push(step);
    }
    return steps;
  }

  /**
   * Where the Placeholder belongs: among the items of its container — for a card, the list
   * container under the pointer (directly, or through a card or the Placeholder); for a list, its
   * own parent — before the first visible item whose middle (vertical for cards, horizontal for
   * lists) is past the pointer, or at the end. Gaps between items follow the same rule, so the
   * Placeholder never jumps while crossing them. `undefined` outside: stay put.
   */
  function dropTarget(drag: Active, under: Element | null): Target | undefined {
    if (!under || !root.contains(under)) return undefined;
    const container =
      drag.kind === LIST
        ? drag.placeholder.parentElement
        : under.closest<HTMLElement>("[data-lp-cards]");
    if (!container || !root.contains(container)) return undefined;
    // A list the Board no longer holds, still shown while `mount` waits for the drag to end.
    if (drag.kind === CARD && !board.getList(container.getAttribute("data-lp-cards") ?? "")) {
      return undefined;
    }
    const { attribute, horizontal } = drag.kind;
    for (const item of container.querySelectorAll<HTMLElement>(`:scope > [${attribute}]`)) {
      if (item === drag.item) continue;
      const rect = item.getBoundingClientRect();
      const middle = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      if ((horizontal ? pointerAt.x : pointerAt.y) < middle) return { container, before: item };
    }
    return { container, before: null };
  }

  /** Whether `canMove` lets the dragged item go to `target` (its origin always may). */
  function allowed({ kind, item, origin }: Active, { container, before }: Target): boolean {
    if (!canMove || (container === origin.container && before === origin.before)) return true;
    return canMove({
      kind: name(kind),
      id: item.getAttribute(kind.attribute) ?? "",
      toListId: kind === LIST ? null : container.getAttribute("data-lp-cards"),
      beforeId: before?.getAttribute(kind.attribute) ?? null,
    });
  }

  /** Moves the Placeholder to `target`, writing the DOM only when its place changes. */
  function place({ placeholder, item, clone }: Active, { container, before }: Target): void {
    // The hidden dragged item and the Clone may sit next to it in the DOM: look through them.
    let next = placeholder.nextElementSibling;
    while (next === item || next === clone) next = next.nextElementSibling;
    if (placeholder.parentElement === container && next === before) return;
    if (before) before.before(placeholder);
    else container.append(placeholder);
  }

  /** Esc abandons the drag: everything goes back, nothing moves. */
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") cancel();
  }

  function onPointerEnd(event: PointerEvent): void {
    if (!press || event.pointerId !== press.pointerId) return;
    if (event.type === "pointerup" && active) drop(active);
    else cancel();
  }

  /** Ends the press or drag without a move, announcing an abandoned drag. */
  function cancel(): void {
    const ended = active;
    end();
    if (ended) announcer.say("cancel", name(ended.kind), ended.item);
  }

  /**
   * Applies the drop to the Board (DEC-13): the item goes before the Placeholder's next item, or
   * to the end (`moveCard` into the Placeholder's list, or `moveList`), then takes the
   * Placeholder's place in the DOM. If the Board rejects the move, the item stays where it was;
   * either way an error is rethrown.
   */
  function drop({ kind, item, placeholder, clone }: Active): void {
    // Missing attributes become "", which the Board rejects like any unknown id.
    const id = item.getAttribute(kind.attribute) ?? "";
    const listId = placeholder.parentElement?.getAttribute("data-lp-cards") ?? "";
    let next = placeholder.nextElementSibling;
    // Past the item, the Clone, and anything the Board does not hold there: the DOM may lag
    // behind a change made during the drag (`mount` writes after it ends).
    while (next && (next === item || next === clone || !holds(kind, next, listId))) {
      next = next.nextElementSibling;
    }
    const beforeId = next?.getAttribute(kind.attribute) ?? null;
    try {
      if (kind === LIST) board.moveList(id, beforeId);
      else board.moveCard(id, listId, beforeId);
    } catch (error) {
      // A listener may throw after the Board has moved the item: keep the DOM in step anyway.
      const moved = landed(board, name(kind), id, listId, beforeId);
      if (moved) placeholder.replaceWith(item);
      end();
      announcer.say(moved ? "drop" : "cancel", name(kind), item);
      throw error;
    }
    placeholder.replaceWith(item);
    end();
    announcer.say("drop", name(kind), item);
  }

  /** Whether `element` is an item the Board holds (for a card, in list `listId`). */
  function holds(kind: Kind, element: Element, listId: string): boolean {
    const id = element.getAttribute(kind.attribute) ?? "";
    return kind === LIST ? board.getList(id) !== undefined : board.listOf(id)?.id === listId;
  }

  /** Reads the item's box once, then shows the Clone and holds the item's place. */
  function start(kind: Kind, item: HTMLElement): Active {
    const rect = item.getBoundingClientRect();
    const margin = getComputedStyle(item).margin;

    const clone = item.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    for (const withId of clone.querySelectorAll("[id]")) withId.removeAttribute("id");
    clone.removeAttribute(kind.attribute);
    clone.setAttribute("data-lp-clone", "");
    Object.assign(clone.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: "0",
      boxSizing: "border-box",
      pointerEvents: "none",
    });

    const placeholder = document.createElement(item.tagName);
    placeholder.setAttribute("data-lp-placeholder", "");
    Object.assign(placeholder.style, {
      // A card's Placeholder keeps the card's height but takes the width of the list it is in,
      // like any card there (a list with a scrollbar is narrower); a list's keeps both.
      width: kind.horizontal ? `${rect.width}px` : "",
      // Stretch across a flex column even when its items are not stretched (width auto alone
      // would collapse to 0 there); block and grid lists fill the width anyway.
      alignSelf: kind.horizontal ? "" : "stretch",
      height: `${rect.height}px`,
      margin,
      boxSizing: "border-box",
      flex: "none",
    });

    const display = item.style.display;
    let after = item.nextElementSibling;
    while (after && !after.hasAttribute(kind.attribute)) after = after.nextElementSibling;
    const origin = {
      container: item.parentElement as HTMLElement,
      before: after as HTMLElement | null,
    };
    item.before(placeholder);
    // Inline, so it wins over the author's `display` rules; restored afterwards.
    item.style.display = "none";
    item.setAttribute("data-lp-dragging", "");
    // Inside `root`, so the user's descendant selectors still style it.
    root.append(clone);
    return { kind, item, clone, placeholder, display, origin };
  }

  /** Ends the press or drag: removes the Clone and the Placeholder and shows the item. */
  function end(): void {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerup", onPointerEnd);
    root.removeEventListener("pointercancel", onPointerEnd);
    const ended = active;
    press = undefined;
    active = undefined;
    if (ended) {
      document.removeEventListener("keydown", onKeyDown);
      ended.clone.remove();
      ended.placeholder.remove();
      ended.item.style.display = ended.display;
      ended.item.removeAttribute("data-lp-dragging");
      onEnd();
    }
  }

  /**
   * Every press in `root`, even one a control stops from bubbling: a click after it is its own,
   * not the one ending the last drag (no browser tested fires that one at all).
   */
  function onPressCapture(): void {
    dragged = false;
  }

  /** First of every click in `root` (capture): the one ending a drag goes no further. */
  function onClickCapture(event: MouseEvent): void {
    // A keyboard's click (`detail` 0, Enter on a control) never ends a drag.
    if (!dragged || event.detail === 0) return;
    dragged = false;
    event.stopPropagation();
    event.preventDefault();
  }

  function onClick(event: MouseEvent): void {
    if (!onActivate || !(event.target instanceof Element)) return;
    const what = pressed(event.target);
    if (what)
      onActivate({ kind: name(what.kind), id: what.item.getAttribute(what.kind.attribute) ?? "" });
  }

  root.addEventListener("pointerdown", onPressCapture, true);
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("click", onClickCapture, true);
  root.addEventListener("click", onClick);
  return {
    destroy() {
      end();
      keyboard.destroy();
      announcer.destroy();
      root.removeEventListener("pointerdown", onPressCapture, true);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("click", onClickCapture, true);
      root.removeEventListener("click", onClick);
    },
    dragged: () => active?.item,
    cancel,
    replace(current, next) {
      keyboard.replace(current, next);
      // A press not yet a drag (`mount` writes until one starts) goes on from the new element.
      if (press?.item !== current) return;
      press = { ...press, item: next };
      try {
        next.setPointerCapture(press.pointerId);
      } catch {
        // An inactive pointer (synthetic events), as in `onPointerDown`.
      }
    },
  };
}
