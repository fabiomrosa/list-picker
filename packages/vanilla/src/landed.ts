import type { Board } from "@list-picker/core";

/**
 * Whether `board` holds item `id` right before `beforeId` (or last): a list among the lists, or a
 * card in list `listId`. After a Board call throws, it tells whether the move happened anyway (a
 * listener failed after it), so the DOM can follow.
 */
export function landed<L extends { id: string }, C extends { id: string }>(
  board: Board<L, C>,
  kind: "card" | "list",
  id: string,
  listId: string,
  beforeId: string | null,
): boolean {
  if (kind === "card" && board.listOf(id)?.id !== listId) return false;
  const items = kind === "list" ? board.lists() : board.cards(listId);
  const ids = [...items].map((value) => value.id);
  return ids.includes(id) && (ids[ids.indexOf(id) + 1] ?? null) === beforeId;
}
