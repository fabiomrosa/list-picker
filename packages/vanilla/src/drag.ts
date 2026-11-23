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

interface Active {
  readonly card: HTMLElement;
  readonly clone: HTMLElement;
  readonly placeholder: HTMLElement;
}

/**
 * Makes the cards under `root` draggable (DEC-08, DEC-10, DEC-13). Cards are `[data-lp-card]`
 * elements inside `[data-lp-cards]` list containers, in the user's own markup.
 */
export function createDrag<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  _board: Board<L, C>,
): Drag {
  let press: Press | undefined;
  let active: Active | undefined;

  function onPointerDown(event: PointerEvent): void {
    if (press || event.button !== 0 || !(event.target instanceof Element)) return;
    const card = event.target.closest<HTMLElement>("[data-lp-card]");
    if (!card || !root.contains(card) || event.target.closest(INTERACTIVE)) return;
    press = { card, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!press || event.pointerId !== press.pointerId || active) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) <= THRESHOLD) return;
    active = start(press.card);
    press.card.setPointerCapture?.(press.pointerId);
  }

  function onPointerUp(event: PointerEvent): void {
    if (!press || event.pointerId !== press.pointerId) return;
    end();
  }

  /** Reads the card's box once, then shows the Clone and holds the card's place. */
  function start(card: HTMLElement): Active {
    const rect = card.getBoundingClientRect();
    const margin = getComputedStyle(card).margin;

    const clone = card.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
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

    card.before(placeholder);
    card.hidden = true;
    card.setAttribute("data-lp-dragging", "");
    document.body.append(clone);
    return { card, clone, placeholder };
  }

  /** Ends the press or drag: the card is shown where it was (dropping comes in L2.4). */
  function end(): void {
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerup", onPointerUp);
    if (active) {
      active.clone.remove();
      active.placeholder.remove();
      active.card.hidden = false;
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
