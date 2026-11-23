import { describe, expect, it } from "vitest";
import { Board, type MoveEvent } from "../src/index.ts";

type List = { id: string; title?: string };
type Card = { id: string; text?: string };

const listIds = (board: Board<List, Card>) => [...board.lists()].map((list) => list.id);
const cardIds = (board: Board<List, Card>, listId: string) =>
  [...board.cards(listId)].map((card) => card.id);

describe("Board", () => {
  it("keeps lists and cards in the order they were placed", () => {
    const board = new Board<List, Card>();
    board.addList({ id: "todo" }, null);
    board.addList({ id: "done" }, null);
    board.addList({ id: "doing" }, "done");
    board.addCard("todo", { id: "c1" }, null);
    board.addCard("todo", { id: "c3" }, null);
    board.addCard("todo", { id: "c2" }, "c3");
    board.addCard("done", { id: "c4" }, null);
    expect(listIds(board)).toEqual(["todo", "doing", "done"]);
    expect(cardIds(board, "todo")).toEqual(["c1", "c2", "c3"]);
    expect(cardIds(board, "doing")).toEqual([]);
    expect(cardIds(board, "done")).toEqual(["c4"]);
  });

  it("finds any card and its list by id", () => {
    const board = new Board<List, Card>();
    board.addList({ id: "todo", title: "To do" }, null);
    board.addList({ id: "done" }, null);
    board.addCard("todo", { id: "c1", text: "write tests" }, null);
    board.addCard("done", { id: "c2" }, null);
    expect(board.getList("todo")).toEqual({ id: "todo", title: "To do" });
    expect(board.getCard("c1")).toEqual({ id: "c1", text: "write tests" });
    expect(board.listOf("c1")?.id).toBe("todo");
    expect(board.listOf("c2")?.id).toBe("done");
    expect(board.getList("nope")).toBeUndefined();
    expect(board.getCard("nope")).toBeUndefined();
    expect(board.listOf("nope")).toBeUndefined();
  });

  it("throws when asked for the cards of an unknown list, before any iteration", () => {
    const board = new Board<List, Card>();
    expect(() => board.cards("nope")).toThrow('list-picker: unknown list "nope"');
  });

  describe("rejects bad input and changes nothing", () => {
    const board = () => {
      const b = new Board<List, Card>();
      b.addList({ id: "todo" }, null);
      b.addList({ id: "done" }, null);
      b.addCard("todo", { id: "c1" }, null);
      b.addCard("done", { id: "c2" }, null);
      return b;
    };
    const snapshot = (b: Board<List, Card>) => listIds(b).map((id) => [id, cardIds(b, id)]);
    const before = snapshot(board());

    it.each([
      [
        "a card id already in another list",
        (b: Board<List, Card>) => b.addCard("todo", { id: "c2" }, null),
        'list-picker: duplicate id "c2"',
      ],
      [
        "a card id already in the same list",
        (b: Board<List, Card>) => b.addCard("todo", { id: "c1" }, null),
        'list-picker: duplicate id "c1"',
      ],
      [
        "a duplicate list id",
        (b: Board<List, Card>) => b.addList({ id: "done" }, null),
        'list-picker: duplicate id "done"',
      ],
      [
        "an unknown list",
        (b: Board<List, Card>) => b.addCard("nope", { id: "c3" }, null),
        'list-picker: unknown list "nope"',
      ],
      [
        "an unknown before card",
        (b: Board<List, Card>) => b.addCard("todo", { id: "c3" }, "nope"),
        'list-picker: unknown id "nope"',
      ],
      [
        "a before card in another list",
        (b: Board<List, Card>) => b.addCard("todo", { id: "c3" }, "c2"),
        'list-picker: unknown id "c2"',
      ],
      [
        "an unknown before list",
        (b: Board<List, Card>) => b.addList({ id: "x" }, "nope"),
        'list-picker: unknown id "nope"',
      ],
    ])("throws on %s", (_name, act, message) => {
      const b = board();
      expect(() => act(b)).toThrow(message);
      expect(snapshot(b)).toEqual(before);
      expect(b.listOf("c3")).toBeUndefined();
    });
  });
});

describe("Board removal", () => {
  const sample = () => {
    const b = new Board<List, Card>();
    b.addList({ id: "todo" }, null);
    b.addList({ id: "done" }, null);
    b.addCard("todo", { id: "c1" }, null);
    b.addCard("todo", { id: "c2" }, null);
    b.addCard("done", { id: "c3" }, null);
    return b;
  };

  it("forgets a removed card, whose id can be added again", () => {
    const b = sample();
    expect(b.removeCard("c1")).toEqual({ id: "c1" });
    expect(cardIds(b, "todo")).toEqual(["c2"]);
    expect(b.getCard("c1")).toBeUndefined();
    expect(b.listOf("c1")).toBeUndefined();
    b.addCard("done", { id: "c1" }, null);
    expect(cardIds(b, "done")).toEqual(["c3", "c1"]);
  });

  it("removes a list together with its cards", () => {
    const b = sample();
    expect(b.removeList("todo")).toEqual({ id: "todo" });
    expect(listIds(b)).toEqual(["done"]);
    expect(b.getList("todo")).toBeUndefined();
    for (const id of ["c1", "c2"]) {
      expect(b.getCard(id)).toBeUndefined();
      expect(b.listOf(id)).toBeUndefined();
    }
    b.addCard("done", { id: "c1" }, null);
    expect(cardIds(b, "done")).toEqual(["c3", "c1"]);
  });

  it.each([
    ["card", (b: Board<List, Card>) => b.removeCard("nope"), 'list-picker: unknown id "nope"'],
    ["list", (b: Board<List, Card>) => b.removeList("nope"), 'list-picker: unknown id "nope"'],
  ])("throws on an unknown %s and changes nothing", (_kind, act, message) => {
    const b = sample();
    expect(() => act(b)).toThrow(message);
    expect(listIds(b)).toEqual(["todo", "done"]);
    expect(cardIds(b, "todo")).toEqual(["c1", "c2"]);
    expect(cardIds(b, "done")).toEqual(["c3"]);
  });
});

describe("Board.moveCard", () => {
  const sample = () => {
    const b = new Board<List, Card>();
    for (const id of ["todo", "doing", "done"]) b.addList({ id }, null);
    for (const id of ["a", "b", "c", "d"]) b.addCard("todo", { id }, null);
    b.addCard("done", { id: "x" }, null);
    return b;
  };
  const all = (b: Board<List, Card>) => listIds(b).map((id) => `${id}:${cardIds(b, id).join("")}`);

  it.each([
    ["up", "c", "a", "todo:cabd"],
    ["down", "a", "d", "todo:bcad"],
    ["to the end", "b", null, "todo:acdb"],
    ["before its previous card", "c", "b", "todo:acbd"],
  ])("moves a card %s within its list", (_how, id, before, expected) => {
    const b = sample();
    expect(b.moveCard(id, "todo", before)).toBe(true);
    expect(all(b)[0]).toBe(expected);
  });

  it("moves a card to another list, before a card or into an empty list", () => {
    const b = sample();
    expect(b.moveCard("b", "done", "x")).toBe(true);
    expect(b.moveCard("c", "doing", null)).toBe(true);
    expect(all(b)).toEqual(["todo:ad", "doing:c", "done:bx"]);
    expect(b.listOf("b")?.id).toBe("done");
    expect(b.listOf("c")?.id).toBe("doing");
  });

  it.each([
    ["before its own next card", "b", "c"],
    ["before itself", "b", "b"],
    ["to the end when already last", "d", null],
  ])("returns false and changes nothing when moved %s", (_how, id, before) => {
    const b = sample();
    expect(b.moveCard(id, "todo", before)).toBe(false);
    expect(all(b)).toEqual(["todo:abcd", "doing:", "done:x"]);
  });

  it.each([
    [
      "an unknown card",
      (b: Board<List, Card>) => b.moveCard("nope", "todo", null),
      'list-picker: unknown id "nope"',
    ],
    [
      "an unknown list",
      (b: Board<List, Card>) => b.moveCard("a", "nope", null),
      'list-picker: unknown list "nope"',
    ],
    [
      "an unknown before card",
      (b: Board<List, Card>) => b.moveCard("a", "todo", "nope"),
      'list-picker: unknown id "nope"',
    ],
    [
      "a before card in another list",
      (b: Board<List, Card>) => b.moveCard("a", "todo", "x"),
      'list-picker: card "x" is not in list "todo"',
    ],
    [
      "a before card that is the card itself, in another list",
      (b: Board<List, Card>) => b.moveCard("a", "done", "a"),
      'list-picker: card "a" is not in list "done"',
    ],
  ])("throws on %s and changes nothing", (_name, act, message) => {
    const b = sample();
    expect(() => act(b)).toThrow(message);
    expect(all(b)).toEqual(["todo:abcd", "doing:", "done:x"]);
    expect(b.listOf("a")?.id).toBe("todo");
  });
});

describe("Board.moveList", () => {
  const sample = () => {
    const b = new Board<List, Card>();
    for (const id of ["a", "b", "c", "d"]) b.addList({ id }, null);
    b.addCard("b", { id: "x" }, null);
    return b;
  };

  it.each([
    ["before the first", "c", "a", "cabd"],
    ["before a later list", "a", "d", "bcad"],
    ["to the end", "b", null, "acdb"],
    ["before its previous list", "c", "b", "acbd"],
  ])("moves a list %s, with its cards", (_how, id, before, expected) => {
    const b = sample();
    expect(b.moveList(id, before)).toBe(true);
    expect(listIds(b).join("")).toBe(expected);
    expect(cardIds(b, "b")).toEqual(["x"]);
    expect(b.listOf("x")?.id).toBe("b");
  });

  it.each([
    ["before itself", "b", "b"],
    ["before its own next", "b", "c"],
    ["to the end when already last", "d", null],
  ])("returns false and changes nothing when moved %s", (_how, id, before) => {
    const b = sample();
    expect(b.moveList(id, before)).toBe(false);
    expect(listIds(b).join("")).toBe("abcd");
  });

  it.each([
    ["an unknown list", "nope", null, 'list-picker: unknown id "nope"'],
    ["an unknown before list", "a", "nope", 'list-picker: unknown id "nope"'],
  ])("throws on %s and changes nothing", (_name, id, before, message) => {
    const b = sample();
    expect(() => b.moveList(id, before)).toThrow(message);
    expect(listIds(b).join("")).toBe("abcd");
  });
});

describe("Board events", () => {
  const sample = () => {
    const b = new Board<List, Card>();
    for (const id of ["todo", "done"]) b.addList({ id }, null);
    for (const id of ["a", "b", "c"]) b.addCard("todo", { id }, null);
    const moves: MoveEvent[] = [];
    let changes = 0;
    b.on("move", (event) => moves.push(event));
    b.on("change", () => changes++);
    return { b, moves, changes: () => changes };
  };

  it("emits one move with the new neighbours and one change for a card move", () => {
    const { b, moves, changes } = sample();
    b.moveCard("c", "todo", "a");
    b.moveCard("a", "done", null);
    expect(moves).toEqual([
      { kind: "card", id: "c", fromListId: "todo", toListId: "todo", prevId: null, nextId: "a" },
      { kind: "card", id: "a", fromListId: "todo", toListId: "done", prevId: null, nextId: null },
    ]);
    expect(changes()).toBe(2);
  });

  it("emits one move and one change for a list move", () => {
    const { b, moves, changes } = sample();
    b.moveList("done", "todo");
    expect(moves).toEqual([
      { kind: "list", id: "done", fromListId: null, toListId: null, prevId: null, nextId: "todo" },
    ]);
    expect(changes()).toBe(1);
  });

  it("emits nothing for a move to the same place or a call that throws", () => {
    const { b, moves, changes } = sample();
    b.moveCard("a", "todo", "b");
    b.moveList("done", null);
    expect(() => b.moveCard("nope", "todo", null)).toThrow();
    expect(() => b.addCard("todo", { id: "a" }, null)).toThrow();
    expect(() => b.removeList("nope")).toThrow();
    expect(moves).toEqual([]);
    expect(changes()).toBe(0);
  });

  it("emits one change per add and remove, and stops after unsubscribe", () => {
    const { b, moves, changes } = sample();
    b.addList({ id: "later" }, null);
    b.addCard("later", { id: "d" }, null);
    b.removeCard("d");
    b.removeList("later");
    expect(changes()).toBe(4);
    const seen: string[] = [];
    const off = b.on("change", () => seen.push("change"));
    off();
    b.addList({ id: "x" }, null);
    expect(seen).toEqual([]);
    expect(moves).toEqual([]);
  });

  it("keeps the change when a listener throws", () => {
    const { b } = sample();
    b.on("move", () => {
      throw new Error("listener failed");
    });
    expect(() => b.moveCard("a", "done", null)).toThrow("listener failed");
    expect(b.listOf("a")?.id).toBe("done");
  });
});
