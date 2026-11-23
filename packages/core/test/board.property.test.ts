import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Board } from "../src/index.ts";

type Entity = { id: string };
type Op =
  | { kind: "addList"; id: string; before: string | null }
  | { kind: "addCard"; list: string; id: string; before: string | null }
  | { kind: "removeCard"; id: string }
  | { kind: "removeList"; id: string }
  | { kind: "moveCard"; id: string; list: string; before: string | null }
  | { kind: "moveList"; id: string; before: string | null };

const LISTS = ["L1", "L2", "L3"];
const CARDS = ["a", "b", "c", "d", "e"];
const list = fc.constantFrom(...LISTS);
const card = fc.constantFrom(...CARDS);
const beforeList = fc.option(list, { nil: null });
const beforeCard = fc.option(card, { nil: null });
const op: fc.Arbitrary<Op> = fc.oneof(
  {
    weight: 1,
    arbitrary: fc.record({ kind: fc.constant("addList" as const), id: list, before: beforeList }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("addCard" as const),
      list,
      id: card,
      before: beforeCard,
    }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("removeCard" as const), id: card }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("removeList" as const), id: list }) },
  {
    weight: 4,
    arbitrary: fc.record({
      kind: fc.constant("moveCard" as const),
      id: card,
      list,
      before: beforeCard,
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({ kind: fc.constant("moveList" as const), id: list, before: beforeList }),
  },
);

/** Every run starts from a populated Board: all lists, each card in a random list or absent. */
const setup: fc.Arbitrary<Op[]> = fc
  .tuple(...CARDS.map(() => fc.option(list, { nil: null })))
  .map((homes) => [
    ...LISTS.map((id): Op => ({ kind: "addList", id, before: null })),
    ...CARDS.flatMap((id, i): Op[] => {
      const home = homes[i];
      return home ? [{ kind: "addCard", list: home, id, before: null }] : [];
    }),
  ]);

/** The reference: an ordered array of [listId, cardIds[]], with the Board's rules written plainly. */
type Model = [string, string[]][];
type Result = "changed" | "same" | "error";

function applyToModel(model: Model, o: Op): Result {
  const at = (id: string) => model.findIndex(([listId]) => listId === id);
  const holder = (id: string) => model.find(([, cards]) => cards.includes(id));
  switch (o.kind) {
    case "addList": {
      if (at(o.id) >= 0) return "error";
      const i = o.before === null ? model.length : at(o.before);
      if (i < 0) return "error";
      model.splice(i, 0, [o.id, []]);
      return "changed";
    }
    case "addCard": {
      const target = model[at(o.list)];
      if (!target || holder(o.id)) return "error";
      const i = o.before === null ? target[1].length : target[1].indexOf(o.before);
      if (i < 0) return "error";
      target[1].splice(i, 0, o.id);
      return "changed";
    }
    case "removeCard": {
      const from = holder(o.id);
      if (!from) return "error";
      from[1].splice(from[1].indexOf(o.id), 1);
      return "changed";
    }
    case "removeList": {
      const i = at(o.id);
      if (i < 0) return "error";
      model.splice(i, 1);
      return "changed";
    }
    case "moveCard": {
      const from = holder(o.id);
      const target = model[at(o.list)];
      if (!from || !target) return "error";
      if (o.before !== null && !target[1].includes(o.before)) return "error";
      if (o.before === o.id) return "same";
      const before = JSON.stringify(model);
      from[1].splice(from[1].indexOf(o.id), 1);
      const i = o.before === null ? target[1].length : target[1].indexOf(o.before);
      target[1].splice(i, 0, o.id);
      return JSON.stringify(model) === before ? "same" : "changed";
    }
    case "moveList": {
      const i = at(o.id);
      if (i < 0 || (o.before !== null && at(o.before) < 0)) return "error";
      if (o.before === o.id) return "same";
      const before = JSON.stringify(model);
      const [entry] = model.splice(i, 1) as [[string, string[]]];
      const j = o.before === null ? model.length : at(o.before);
      model.splice(j, 0, entry);
      return JSON.stringify(model) === before ? "same" : "changed";
    }
  }
}

/** Runs `o` on the Board. A removal returns the removed id so the caller can check it. */
function applyToBoard(board: Board<Entity, Entity>, o: Op): [Result, string?] {
  try {
    switch (o.kind) {
      case "addList":
        board.addList({ id: o.id }, o.before);
        return ["changed"];
      case "addCard":
        board.addCard(o.list, { id: o.id }, o.before);
        return ["changed"];
      case "removeCard":
        return ["changed", board.removeCard(o.id).id];
      case "removeList":
        return ["changed", board.removeList(o.id).id];
      case "moveCard":
        return [board.moveCard(o.id, o.list, o.before) ? "changed" : "same"];
      case "moveList":
        return [board.moveList(o.id, o.before) ? "changed" : "same"];
    }
  } catch {
    return ["error"];
  }
}

function expectInvariants(board: Board<Entity, Entity>, model: Model): void {
  const actual = [...board.lists()].map((l): [string, string[]] => [
    l.id,
    [...board.cards(l.id)].map((c) => c.id),
  ]);
  expect(actual).toEqual(model);
  const snapshot = board.snapshot();
  expect(snapshot.lists.map(({ list, cards }) => [list.id, cards.map((c) => c.id)])).toEqual(model);
  for (const id of CARDS) {
    const owner = model.find(([, cards]) => cards.includes(id));
    expect(board.listOf(id)?.id).toBe(owner?.[0]);
    expect(board.getCard(id)?.id).toBe(owner ? id : undefined);
  }
  for (const id of LISTS) {
    expect(board.getList(id)?.id).toBe(model.some(([l]) => l === id) ? id : undefined);
  }
}

describe("Board invariants", () => {
  it("match a nested-array model after any sequence of operations", () => {
    const reached = new Map<string, number>();
    fc.assert(
      fc.property(setup, fc.array(op, { minLength: 20, maxLength: 60 }), (start, ops) => {
        const board = new Board<Entity, Entity>();
        const model: Model = [];
        for (const o of [...start, ...ops]) {
          const expected = applyToModel(model, o);
          const previous = board.snapshot();
          const [actual, removed] = applyToBoard(board, o);
          expect(actual).toBe(expected);
          // A Snapshot is replaced exactly when the Board changed.
          expect(board.snapshot() === previous).toBe(expected !== "changed");
          if (removed !== undefined) expect(removed).toBe("id" in o ? o.id : undefined);
          expectInvariants(board, model);
          const key = `${o.kind}:${expected}`;
          reached.set(key, (reached.get(key) ?? 0) + 1);
        }
      }),
      { numRuns: 500, interruptAfterTimeLimit: 50_000, markInterruptAsFailure: true },
    );
    // The generator must keep reaching the interesting cases, or the property goes blind.
    for (const key of ["moveCard:changed", "moveCard:same", "moveList:changed", "moveList:same"]) {
      expect(reached.get(key) ?? 0, key).toBeGreaterThan(50);
    }
  }, 60_000);
});
