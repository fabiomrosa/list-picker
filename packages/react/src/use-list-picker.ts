import type { Board } from "@list-picker/core";
import { createDrag, type DragOptions } from "@list-picker/vanilla";
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
 * Pointer and keyboard moving for a board React draws (DEC-18): the engine starts when the element
 * given `ref` mounts, with `moveElements: false` (a move changes only the Board, and `useBoard`
 * draws it), and stops when that element unmounts or changes.
 */
export function useListPicker<L extends { id: string }, C extends { id: string }>(
  board: Board<L, C>,
  options: ListPickerOptions = {},
): ListPicker {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  // Read when the engine starts (keeping them current between renders is L5.5).
  const latest = useRef(options);
  latest.current = options;
  useEffect(() => {
    if (!root) return;
    const drag = createDrag(root, board, { ...latest.current, moveElements: false });
    return () => drag.destroy();
  }, [root, board]);
  return { ref: setRoot, ...getters };
}
