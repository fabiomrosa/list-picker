# @list-picker/react

React hooks for a [`@list-picker/core`](https://github.com/fabiomrosa/list-picker/tree/main/packages/core)
Board: your components draw its lists and cards (a card is any item: a kanban board's task, a
playlist's track), and people reorder them by pointer (mouse, touch, pen) or keyboard, with screen
reader announcements. It is headless: the markup and its look are yours; the hooks give your
elements what the drag engine of
[`@list-picker/vanilla`](https://github.com/fabiomrosa/list-picker/tree/main/packages/vanilla)
needs, and every move changes the Board, which React then draws.

## Install

```sh
npm install @list-picker/core @list-picker/react
```

React 18.3 or 19 (`react` is a peer dependency). ES modules only; the types need TypeScript 5 or
later.

## Example

```html
<div id="board"></div>
```

```tsx
import { Board } from "@list-picker/core";
import { useBoard, useListPicker } from "@list-picker/react";
import { createRoot } from "react-dom/client";

type List = { id: string; title: string };
type Card = { id: string; text: string };

const board = new Board<List, Card>();
board.addList({ id: "todo", title: "To do" }, null);
board.addList({ id: "done", title: "Done" }, null);
board.addCard("todo", { id: "a", text: "Write the README" }, null);
board.addCard("todo", { id: "b", text: "Publish" }, null);
board.on("move", (move) => console.log(move)); // save the new order

function Kanban() {
  const { lists } = useBoard(board);
  const picker = useListPicker(board);
  return (
    <div ref={picker.ref} className="board">
      {lists.map(({ list, cards }) => (
        <section key={list.id} {...picker.list(list.id)}>
          <h2 {...picker.listHandle(list.id)}>{list.title}</h2>
          <ul {...picker.cards(list.id)}>
            {cards.map((card) => (
              <li key={card.id} {...picker.card(card.id)}>
                {card.text}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

createRoot(document.getElementById("board") as HTMLElement).render(<Kanban />);
```

Cards are direct children of the element given `cards(listId)`, and lists direct children of the
element given `ref`. The styles are yours; for touch dragging, the cards and handles need
`touch-action: none` (see [Styling a board](https://github.com/fabiomrosa/list-picker/tree/main/packages/vanilla#styling-a-board)).

## API

### `useBoard(board)`

The Board's Snapshot as React state: `{ lists: [{ list, cards }] }`, the same object until the Board
changes. A component using it renders again after each Board change, and never otherwise; on the
server it renders the current Snapshot.

### `useListPicker(board, options?)`

Starts the drag engine on the element given `ref` when it mounts, and stops it when it unmounts.
Returns what your elements spread:

| Getter | On | Gives |
|---|---|---|
| `ref` | The element that holds the lists. | Where the engine listens. |
| `list(id)` | A list's element. | `data-lp-list` |
| `listHandle(id)` | What a list is dragged and focused by (its title). | `data-lp-list-handle`, `tabIndex: 0` |
| `cards(listId)` | A list's container of cards. | `data-lp-cards` |
| `card(id)` | A card's element. | `data-lp-card`, `tabIndex: 0` |

A move changes only the Board, and `useBoard` draws it; a card moved by keyboard keeps its focus and
its pick-up through the redraw. A card moved to another list is a new component instance there
(React's keys are per parent): keep its state on the Board, not in the component.

`options` are those of `createDrag`
([vanilla's API](https://github.com/fabiomrosa/list-picker/tree/main/packages/vanilla#api)):
`canMove({ kind, id, toListId, beforeId })` to refuse a place, `onActivate({ kind, id })` on a click
or Enter, and `messages` for the announcements. They are read from the latest render; giving or
removing `onActivate` or `canMove` restarts the engine, which ends a drag in progress, so keep them
given (or not) for the board's lifetime. Their types (`ProposedMove`, `Activation`, `Messages`,
`Announcement`) are exported here too.

## Markup, keyboard and announcements

The same as vanilla's: the
[`data-lp-*` styling hooks](https://github.com/fabiomrosa/list-picker/tree/main/packages/vanilla#markup-and-styling-hooks)
(the Clone, the Placeholder, `data-lp-grabbed`…), the
[keys](https://github.com/fabiomrosa/list-picker/tree/main/packages/vanilla#keyboard) and the
[announcements](https://github.com/fabiomrosa/list-picker/tree/main/packages/vanilla#announcements).

## License

MIT
