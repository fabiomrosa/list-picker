// Saving the order, shared by both Board demos: the board they start with, the pretend server that
// keeps it (fake-server.ts; in your app, `fetch` to your API), and `keepSaved`, which loads a Board
// from it and saves each move. The Board, not the view, holds the order, so this is the same code
// for vanilla and React.
import type { Board, Snapshot } from "@list-picker/core";
import { fakeServer } from "./fake-server.ts";

export type List = { id: string; title: string };
export type Card = { id: string; text: string; tag: string };

/** The board the server starts with (and goes back to on reset). */
const START: Snapshot<List, Card> = {
  lists: [
    {
      list: { id: "todo", title: "To do" },
      cards: [
        { id: "a", text: "Sketch the onboarding flow", tag: "design" },
        { id: "b", text: "Write the release notes", tag: "docs" },
        { id: "c", text: "Fix the date picker on Safari", tag: "bug" },
      ],
    },
    {
      list: { id: "doing", title: "Doing" },
      cards: [
        { id: "d", text: "Move cards with the keyboard", tag: "a11y" },
        { id: "e", text: "Profile the drag on a long list", tag: "perf" },
      ],
    },
    {
      list: { id: "done", title: "Done" },
      cards: [{ id: "f", text: "Model lists as linked lists", tag: "core" }],
    },
  ],
};
/** One server for both demos: a move made in one shows in the other. */
export const server = fakeServer<List, Card>("list-picker-board", START);

/**
 * Keeps `board` saved: `open()` fills it from the server; each move is then shown at once and
 * saved. Once a save fails (or `reset()` resets the data), it takes the server's order again, when
 * no save is in flight and no move was made since it asked. `onNotSaved` hears each failed save.
 */
export function keepSaved(board: Board<List, Card>) {
  const notSaved = new Set<() => void>();
  let restoring = false;
  let inFlight = 0;
  let moves = 0;
  let stale = false;

  /** The server's order: each list, then each of its cards, moved to the end in turn. */
  function restore(saved: Snapshot<List, Card>): void {
    restoring = true;
    try {
      for (const { list, cards } of saved.lists) {
        board.moveList(list.id, null);
        for (const card of cards) board.moveCard(card.id, list.id, null);
      }
    } finally {
      restoring = false;
    }
  }
  async function resync(): Promise<void> {
    if (!stale || inFlight > 0) return; // the last save to settle calls it again
    const asked = moves;
    const saved = await server.load();
    if (moves !== asked) return; // a newer move is being saved: its answer calls it again
    stale = false;
    restore(saved);
  }

  board.on("move", async (move) => {
    if (restoring) return; // putting the server's order back: nothing to save
    moves++;
    inFlight++;
    try {
      await server.save(move);
    } catch {
      stale = true;
      for (const listener of notSaved) listener();
    } finally {
      inFlight--;
    }
    await resync();
  });

  return {
    open: async () => {
      for (const { list, cards } of (await server.load()).lists) {
        board.addList(list, null);
        for (const card of cards) board.addCard(list.id, card, null);
      }
    },
    reset: async () => {
      await server.reset();
      stale = true;
      await resync();
    },
    onNotSaved: (listener: () => void) => {
      notSaved.add(listener);
      return () => {
        notSaved.delete(listener);
      };
    },
  };
}
