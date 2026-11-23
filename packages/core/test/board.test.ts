import { describe, expect, it } from "vitest";
import { Board } from "../src/index.ts";

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
