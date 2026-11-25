// @vitest-environment happy-dom
import { Board } from "@list-picker/core";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it } from "vitest";
import { useBoard } from "../src/index.ts";

type Entity = { id: string };

function setup() {
  const board = new Board<Entity, Entity>();
  board.addList({ id: "todo" }, null);
  board.addCard("todo", { id: "a" }, null);
  return board;
}

/** Renders the Board's lists and cards, and counts its renders. */
function Lists({ board, renders }: { board: Board<Entity, Entity>; renders: { count: number } }) {
  const snapshot = useBoard(board);
  renders.count++;
  return (
    <>
      {snapshot.lists.map(({ list, cards }) => (
        <ul key={list.id} aria-label={list.id}>
          {cards.map((card) => (
            <li key={card.id}>{card.id}</li>
          ))}
        </ul>
      ))}
    </>
  );
}

afterEach(cleanup); // Vitest runs without globals: Testing Library cannot register it itself

it("renders the Board's lists and cards, and again after each change", () => {
  const board = setup();
  render(<Lists board={board} renders={{ count: 0 }} />);
  expect(screen.getByRole("list", { name: "todo" }).textContent).toBe("a");
  act(() => board.addCard("todo", { id: "b" }, null));
  expect(screen.getByRole("list", { name: "todo" }).textContent).toBe("ab");
  act(() => board.addList({ id: "done" }, null));
  act(() => board.moveCard("a", "done", null));
  expect(screen.getByRole("list", { name: "done" }).textContent).toBe("a");
});

it("does not render again without a change, and stops following after unmount", () => {
  const board = setup();
  const renders = { count: 0 };
  const { rerender, unmount } = render(<Lists board={board} renders={renders} />);
  const after = renders.count;
  rerender(<Lists board={board} renders={renders} />); // a parent's render: one more, no loop
  expect(renders.count).toBe(after + 1);
  act(() => board.addCard("todo", { id: "b" }, null));
  expect(renders.count).toBe(after + 2);
  unmount();
  board.addCard("todo", { id: "c" }, null); // no listener left, no error
  expect(renders.count).toBe(after + 2);
});

it("renders on the server with the current Snapshot", () => {
  const board = setup();
  expect(renderToString(<Lists board={board} renders={{ count: 0 }} />)).toBe(
    '<ul aria-label="todo"><li>a</li></ul>',
  );
});
