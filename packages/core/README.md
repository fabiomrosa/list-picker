# @list-picker/core

The model of lists people reorder (a kanban board's tasks, a playlist's tracks): ordered lists of
ordered cards (a card is any item: a task, a track), kept as doubly linked lists with an index, so
finding, adding, removing and moving a card or a list is O(1) (removing a list is O(its cards)). No
DOM, no framework, no runtime dependencies. To draw a Board and drag its cards, add
[`@list-picker/vanilla`](https://github.com/fabiomrosa/list-picker/tree/main/packages/vanilla).

## Install

```sh
npm install @list-picker/core
```

ES modules only; the types need TypeScript 5 or later.

## Example

```ts
import { Board } from "@list-picker/core";

type List = { id: string; title: string };
type Card = { id: string; text: string };

const board = new Board<List, Card>();
board.addList({ id: "todo", title: "To do" }, null); // null: at the end
board.addList({ id: "done", title: "Done" }, null);
board.addCard("todo", { id: "a", text: "Write the README" }, null);
board.addCard("todo", { id: "b", text: "Publish" }, null);

board.on("move", (move) => console.log(move)); // save the new order
board.moveCard("a", "done", null);
// { kind: "card", id: "a", fromListId: "todo", toListId: "done", prevId: null, nextId: null }
```

## API

Lists and cards are your own values; each needs a string `id`, unique among the lists or among all
the cards, that never changes. Use your backend's id, or `crypto.randomUUID()` when you create the
item; not its text (a list's display name is a field of your own, changed with `updateList`).
Positions are given by the item to go before (`null` for the end), never by an index.

### `new Board<L, C>()`

| Method | |
|---|---|
| `addList(list, beforeListId)` | Adds a list before another, or at the end (`null`). |
| `addCard(listId, card, beforeCardId)` | Adds a card to a list. |
| `removeList(id)` | Removes a list and its cards; returns the list. |
| `removeCard(id)` | Removes a card; returns it. |
| `updateList(list)` | Replaces the list with `list.id` (same place, its cards); returns the old one. |
| `updateCard(card)` | Replaces the card with `card.id` (same place); returns the old one. |
| `moveList(id, beforeListId)` | Moves a list (with its cards); returns whether the order changed. |
| `moveCard(id, toListId, beforeCardId)` | Moves a card, in its list or to another; returns whether the order changed. |
| `swapCards(a, b)` | Exchanges two cards' places, in one list or across lists, in O(1); returns whether the order changed. |
| `getList(id)`, `getCard(id)` | The list or card with that id, or `undefined`. |
| `listOf(cardId)` | The list holding a card, or `undefined`. |
| `neighbours(cardId)` | The cards before and after it in its list, `{ prev, next }` (`null` at an end), in O(1): a playlist's previous and next track. |
| `lists()`, `cards(listId)` | The lists, or a list's cards, in order. |
| `snapshot()` | The Board as one frozen value, `{ lists: [{ list, cards }] }`; the same object until the Board changes. |
| `on(event, listener)` | Subscribes to an event; returns the function that unsubscribes. |

Pass a new object to `updateList` and `updateCard` (`{ ...card, text }`), not the same one changed:
a renderer redraws an item when its value is a different object.

An unknown id, a duplicate id or a `before` that is not in the target list throws an `Error`, and
the Board is left unchanged.

### Events

- `move`: after a move that changed the order (a `swapCards` emits one per card that moved, in an
  order you can replay with `moveCard(id, toListId, nextId)`). It names the new neighbours rather than indexes:
  `{ kind: "card" | "list", id, fromListId, toListId, prevId, nextId }` (`fromListId` and
  `toListId` are `null` for a list; `prevId` and `nextId` are `null` at an end).
- `change`: after every change (add, remove, update or move), with no payload; redraw from it.

Listeners run synchronously, once the Board is consistent; a listener must not change the Board.
Every listener runs even if one throws; the first error is then rethrown from the operation (the
change itself has happened).

### `LinkedList<T>`

The list the Board is made of, exported for direct use: `insertBefore(value, beforeId)`,
`remove(id)`, `replace(value)`, `get(id)` (a `Node` with `value`, `prev` and `next`), `has(id)`,
`first`, `last`, `size`, and iteration over the values in order.

## License

MIT
