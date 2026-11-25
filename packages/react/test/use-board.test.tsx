// @vitest-environment happy-dom
import { Board } from "@list-picker/core";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { useBoard } from "../src/index.ts";

type Entity = { id: string };

function setup() {
  const board = new Board<Entity, Entity>();
  board.addList({ id: "todo" }, null);
  board.addCard("todo", { id: "a" }, null);
  return board;
}

/** Renders the Board's lists and cards. */
function Lists({ board }: { board: Board<Entity, Entity> }) {
  const snapshot = useBoard(board);
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
  render(<Lists board={board} />);
  expect(screen.getByRole("list", { name: "todo" }).textContent).toBe("a");
  act(() => board.addCard("todo", { id: "b" }, null));
  expect(screen.getByRole("list", { name: "todo" }).textContent).toBe("ab");
  act(() => board.addList({ id: "done" }, null));
  act(() => board.moveCard("a", "done", null));
  expect(screen.getByRole("list", { name: "done" }).textContent).toBe("a");
});

/** Records the Snapshot of each render. */
function Seen({ board, seen }: { board: Board<Entity, Entity>; seen: unknown[] }) {
  seen.push(useBoard(board));
  return null;
}

/** Counts the Board's live `change` listeners. */
function listeners(board: Board<Entity, Entity>) {
  const live = { count: 0 };
  const on = board.on.bind(board);
  vi.spyOn(board, "on").mockImplementation((event, listener) => {
    const off = on(event, listener);
    live.count++;
    let done = false;
    return () => {
      if (!done) live.count--;
      done = true;
      off();
    };
  });
  return live;
}

it("keeps the same Snapshot between changes, a new one after each", () => {
  const board = setup();
  const seen: unknown[] = [];
  const { rerender } = render(<Seen board={board} seen={seen} />);
  rerender(<Seen board={board} seen={seen} />); // a parent's render, no Board change
  expect(seen.at(-1)).toBe(seen[0]);
  act(() => board.addCard("todo", { id: "b" }, null));
  expect(seen.at(-1)).not.toBe(seen[0]);
});

it("leaves no listener on the Board after unmount", () => {
  const board = setup();
  const live = listeners(board);
  const { unmount } = render(<Seen board={board} seen={[]} />);
  expect(live.count).toBe(1);
  unmount();
  expect(live.count).toBe(0);
});

it("follows a new board given in place of the old one, and only it", () => {
  const [a, b] = [setup(), setup()];
  const seen: unknown[] = [];
  const { rerender } = render(<Seen board={a} seen={seen} />);
  rerender(<Seen board={b} seen={seen} />);
  const count = seen.length;
  act(() => b.addCard("todo", { id: "b" }, null));
  expect(seen.length).toBe(count + 1);
  act(() => a.addCard("todo", { id: "b" }, null));
  expect(seen.length).toBe(count + 1);
});

it("renders on the server with the current Snapshot", () => {
  const board = setup();
  expect(renderToString(<Lists board={board} />)).toBe('<ul aria-label="todo"><li>a</li></ul>');
});
