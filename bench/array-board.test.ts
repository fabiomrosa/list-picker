// The comparison is fair only if both boards do the same work: same moves, same resulting order.
import { describe, expect, it } from "vitest";
import { makeArrayBoard, makeBoard, makeMoves, type Shape } from "./moves.ts";

describe("benchmark fixtures", () => {
  it.each<Shape>([
    { lists: 10, cardsPerList: 10 },
    { lists: 10, cardsPerList: 100 },
    { lists: 20, cardsPerList: 500 },
  ])("give the Board and the ArrayBoard the same order after the same moves (%o)", (shape) => {
    const board = makeBoard(shape);
    const array = makeArrayBoard(shape);
    let noOps = 0;
    for (const m of makeMoves(shape, 2000)) {
      const changed = board.moveCard(m.id, m.toListId, m.beforeCardId);
      expect(changed).toBe(array.moveCard(m.id, m.toListId, m.beforeCardId));
      if (!changed) noOps++;
    }
    expect(noOps).toBeGreaterThan(0);
    const order = board
      .snapshot()
      .lists.map(({ list, cards }) => [list.id, cards.map((c) => c.id)]);
    expect(order).toEqual(array.lists.map((l) => [l.id, l.cards.map((c) => c.id)]));
  });
});
