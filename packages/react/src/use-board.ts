import type { Board, Snapshot } from "@list-picker/core";
import { useCallback, useSyncExternalStore } from "react";

/**
 * The Board's Snapshot as React state (DEC-18): the component renders again after each Board change
 * and never otherwise; the Snapshot is the same object until the Board changes, so it is the store's
 * value as is. On the server, the current Snapshot.
 */
export function useBoard<L extends { id: string }, C extends { id: string }>(
  board: Board<L, C>,
): Snapshot<L, C> {
  const subscribe = useCallback((changed: () => void) => board.on("change", changed), [board]);
  const snapshot = () => board.snapshot();
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
