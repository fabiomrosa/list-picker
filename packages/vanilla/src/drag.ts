import type { Board } from "@list-picker/core";

/** A running drag engine; `destroy()` removes every listener it added. */
export interface Drag {
  destroy(): void;
}

/** How far (px) the pointer must move after a press before the press becomes a drag. */
const THRESHOLD = 4;
/** Presses on these start no drag, so controls inside a card keep working. */
const INTERACTIVE = "button, input, select, textarea, a[href], [contenteditable]";

interface Press {
  readonly card: HTMLElement;
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

/** A place in a list: before a card, or at the end (`before: null`). */
interface Target {
  readonly list: HTMLElement;
  readonly before: HTMLElement | null;
}

interface Active {
  readonly card: HTMLElement;
  readonly clone: HTMLElement;
  readonly placeholder: HTMLElement;
  /** The card's own inline `display`, restored when it is shown again. */
  readonly display: string;
}

/**
 * Makes the cards under `root` draggable (DEC-08, DEC-10, DEC-13). Cards are `[data-lp-card]`
 * elements inside `[data-lp-cards]` list containers, in the user's own markup.
 */
export function createDrag<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
): Drag {
  let press: Press | undefined;
  let active: Active | undefined;
  /** The latest pointer position; read once per animation frame. */
  let pointerAt = { x: 0, y: 0 };
  let frame: number | undefined;

  function onPointerDown(event: PointerEvent): void {
    if (press || event.button !== 0 || !(event.target instanceof Element)) return;
    const card = event.target.closest<HTMLElement>("[data-lp-card]");
    if (!card || !root.contains(card)) return;
    const control = event.target.closest(INTERACTIVE);
    if (control && card.contains(control)) return;
    press = { card, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    // Captured from the press, so the release always comes back here, even outside `root`.
    try {
      card.setPointerCapture(event.pointerId);
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
      active = start(press.card);
    }
    // Only store the pointer here; the DOM is written once per frame (no layout thrashing).
    frame ??= requestAnimationFrame(update);
  }

  /** Once per frame: reads what is under the pointer, then writes (no read after a write). */
  function update(): void {
    frame = undefined;
    if (!press || !active) return;
    const target = dropTarget(active);
    active.clone.style.transform = `translate(${pointerAt.x - press.x}px, ${pointerAt.y - press.y}px)`;
    if (target) place(active, target);
  }

  /**
   * Where the Placeholder belongs: in the list container under the pointer (directly, or through a
   * card or the Placeholder), before the first visible card whose vertical middle is below the
   * pointer, or at the end. Gaps and padding between cards follow the same rule, so the
   * Placeholder never jumps while crossing them. `undefined` outside every list: stay put.
   */
  function dropTarget(drag: Active): Target | undefined {
    const under = document.elementFromPoint(pointerAt.x, pointerAt.y);
    const list = under?.closest<HTMLElement>("[data-lp-cards]");
    if (!list || !root.contains(list)) return undefined;
    for (const card of list.querySelectorAll<HTMLElement>(":scope > [data-lp-card]")) {
      if (card === drag.card) continue;
      const rect = card.getBoundingClientRect();
      if (pointerAt.y < rect.top + rect.height / 2) return { list, before: card };
    }
    return { list, before: null };
  }

  /** Moves the Placeholder to `target`, writing the DOM only when its place changes. */
  function place({ placeholder, card: dragged, clone }: Active, { list, before }: Target): void {
    // The hidden dragged card and the Clone may sit next to it in the DOM: look through them.
    let next = placeholder.nextElementSibling;
    while (next === dragged || next === clone) next = next.nextElementSibling;
    if (placeholder.parentElement === list && next === before) return;
    if (before) before.before(placeholder);
    else list.append(placeholder);
  }

  function onPointerEnd(event: PointerEvent): void {
    if (!press || event.pointerId !== press.pointerId) return;
    if (event.type === "pointerup" && active) drop(active);
    else end();
  }

  /**
   * Applies the drop to the Board (DEC-13): the card goes before the Placeholder's next card, or
   * to the end of its list, then takes the Placeholder's place in the DOM. If the Board rejects
   * the move, the card stays where it was and the error is rethrown.
   */
  function drop({ card, placeholder, clone }: Active): void {
    const listId = placeholder.parentElement?.getAttribute("data-lp-cards");
    const id = card.getAttribute("data-lp-card");
    let next = placeholder.nextElementSibling;
    while (next === card || next === clone) next = next.nextElementSibling;
    const beforeId = next?.getAttribute("data-lp-card") ?? null;
    if (listId == null || id == null) return end();
    try {
      board.moveCard(id, listId, beforeId);
    } catch (error) {
      end();
      throw error;
    }
    placeholder.replaceWith(card);
    end();
  }

  /** Reads the card's box once, then shows the Clone and holds the card's place. */
  function start(card: HTMLElement): Active {
    const rect = card.getBoundingClientRect();
    const margin = getComputedStyle(card).margin;

    const clone = card.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    for (const withId of clone.querySelectorAll("[id]")) withId.removeAttribute("id");
    clone.removeAttribute("data-lp-card");
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

    const placeholder = document.createElement(card.tagName);
    placeholder.setAttribute("data-lp-placeholder", "");
    Object.assign(placeholder.style, {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin,
      boxSizing: "border-box",
    });

    const display = card.style.display;
    card.before(placeholder);
    // Inline, so it wins over the author's `display` rules; restored afterwards.
    card.style.display = "none";
    card.setAttribute("data-lp-dragging", "");
    // Inside `root`, so the user's descendant selectors still style it.
    root.append(clone);
    return { card, clone, placeholder, display };
  }

  /** Ends the press or drag: removes the Clone and the Placeholder and shows the card. */
  function end(): void {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerup", onPointerEnd);
    root.removeEventListener("pointercancel", onPointerEnd);
    if (active) {
      active.clone.remove();
      active.placeholder.remove();
      active.card.style.display = active.display;
      active.card.removeAttribute("data-lp-dragging");
    }
    press = undefined;
    active = undefined;
  }

  root.addEventListener("pointerdown", onPointerDown);
  return {
    destroy() {
      end();
      root.removeEventListener("pointerdown", onPointerDown);
    },
  };
}
