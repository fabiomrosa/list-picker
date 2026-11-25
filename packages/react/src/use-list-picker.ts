import type { Board } from "@list-picker/core";
import { createDrag, type DragOptions, type Messages } from "@list-picker/vanilla";
import { useEffect, useRef, useState } from "react";

/** The engine's options (DEC-16, DEC-17); React draws every move, so `moveElements` is not one. */
export type ListPickerOptions = Omit<DragOptions, "moveElements">;

/** What the user's components spread on their own elements (DEC-07, DEC-13). */
export interface ListPicker {
  /** On the element that holds the lists. */
  ref(element: HTMLElement | null): void;
  /** On a list's element (its cards' container and its handle inside it). */
  list(id: string): { "data-lp-list": string };
  /** On what drags a list and takes the keyboard (its title). */
  listHandle(id: string): { "data-lp-list-handle": ""; tabIndex: 0 };
  /** On a list's cards' container: its cards are its direct children. */
  cards(listId: string): { "data-lp-cards": string };
  /** On a card's element. */
  card(id: string): { "data-lp-card": string; tabIndex: 0 };
}

const getters = {
  list: (id: string) => ({ "data-lp-list": id }),
  listHandle: () => ({ "data-lp-list-handle": "", tabIndex: 0 }) as const,
  cards: (listId: string) => ({ "data-lp-cards": listId }),
  card: (id: string) => ({ "data-lp-card": id, tabIndex: 0 }) as const,
};

/**
 * Messages read from the latest options at each announcement (the engine reads them then). Getters
 * by `defineProperties`: a getter that may return `undefined` is not a `Partial<Messages>` member
 * under `exactOptionalPropertyTypes`.
 */
function latestMessages(current: () => ListPickerOptions): Partial<Messages> {
  const keys = ["pickUp", "move", "drop", "cancel"] as const;
  const getters = keys.map((key) => [
    key,
    { get: () => current().messages?.[key], enumerable: true },
  ]);
  return Object.defineProperties({}, Object.fromEntries(getters)) as Partial<Messages>;
}

/**
 * Pointer and keyboard moving for a board React draws (DEC-18): the engine starts when the element
 * given `ref` mounts, with `moveElements: false` (a move changes only the Board, and `useBoard`
 * draws it), and stops when that element unmounts or changes. Its options are the latest render's;
 * giving or removing `onActivate` or `canMove` restarts it, which ends a drag in progress: keep them
 * given (or not) for the board's lifetime.
 */
export function useListPicker<L extends { id: string }, C extends { id: string }>(
  board: Board<L, C>,
  options: ListPickerOptions = {},
): ListPicker {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  // The latest render's options, kept after each commit (not during the render: React's rule), so
  // the engine runs them without restarting.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  // Only whether they are given restarts it: the engine decides at its start whether Enter
  // activates (otherwise a link or a button in a card keeps its Enter) and whether rules apply.
  const activates = options.onActivate !== undefined;
  const rules = options.canMove !== undefined;
  useEffect(() => {
    if (!root) return;
    const current = () => latest.current;
    const drag = createDrag(root, board, {
      moveElements: false,
      messages: latestMessages(current),
      ...(activates && { onActivate: (item) => current().onActivate?.(item) }),
      ...(rules && { canMove: (move) => current().canMove?.(move) ?? true }),
    });
    return () => drag.destroy();
  }, [root, board, activates, rules]);
  return { ref: setRoot, ...getters };
}
