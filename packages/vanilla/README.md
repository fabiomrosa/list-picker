# @list-picker/vanilla

Draws a [`@list-picker/core`](https://github.com/fabiomrosa/list-picker/tree/main/packages/core)
Board in the page and lets people reorder its cards and lists, by pointer (mouse, touch, pen) or
keyboard, with screen reader announcements. It is headless: you render each card and each list
header; it owns the containers, the dragging and the order, and ships no styles. No framework, no runtime dependencies besides the core.

## Install

```sh
npm install @list-picker/core @list-picker/vanilla
```

ES modules only; the types need TypeScript 5 or later.

## Example

```html
<div id="board"></div>
```

```ts
import { Board } from "@list-picker/core";
import { mount } from "@list-picker/vanilla";

type List = { id: string; title: string };
type Card = { id: string; text: string };

const board = new Board<List, Card>();
board.addList({ id: "todo", title: "To do" }, null);
board.addList({ id: "done", title: "Done" }, null);
board.addCard("todo", { id: "a", text: "Write the README" }, null);
board.addCard("todo", { id: "b", text: "Publish" }, null);

const root = document.getElementById("board") as HTMLElement;
const renderers = {
  renderList(list: List) {
    const header = document.createElement("h2");
    header.textContent = list.title;
    return header;
  },
  renderCard(card: Card) {
    const element = document.createElement("div");
    element.textContent = card.text;
    return element;
  },
};
const view = mount(root, board, renderers);

board.on("move", (move) => console.log(move)); // save the new order
window.addEventListener("pagehide", () => view.destroy());
```

Every Board change (yours, or a drag's drop) shows in the page; a Renderer runs once per list or
card, and its elements are moved, never redrawn, until `updateList` or `updateCard` gives that item
a new value: then its Renderer runs again and the new element takes the old one's place, keeping
the focus and a keyboard pick up. The styles are yours; for touch dragging, the cards
and headers need `touch-action: none` (otherwise a touch scrolls the page instead):

```css
#board { display: flex; gap: 1rem; }
[data-lp-card], [data-lp-list-handle] { touch-action: none; user-select: none; cursor: grab; }
[data-lp-placeholder] { outline: 2px dashed #999; }
```

## API

### `mount(root, board, renderers, options?)`

Draws `board` into `root` (its other children stay where they are) and makes it draggable.
Returns `{ destroy() }`, which removes what it added and every listener.

- `renderers.renderList(list)` returns the list's header, a new `HTMLElement`; people drag the
  list by it.
- `renderers.renderCard(card)` returns the card, a new `HTMLElement`.
- A Renderer runs again for a list or card whose value is a different object than the one it drew
  (`board.updateCard({ ...card, text })`); changing the same object draws nothing.
- `options.onActivate({ kind, id })`: called on a click on a card or a list header that started
  no drag, and on Enter on a focused one; open your modal from it. A click that would follow a drag
  never reaches the card. Clicks and Enter on controls inside an item keep their own
  behaviour.
- `options.messages`: see [Announcements](#announcements).

A Renderer's error is thrown from the Board operation that needed it. A list or card removed from
the Board while it is dragged ends that drag.

### `createDrag(root, board, options?)`

The drag engine alone, for markup you draw yourself (keep it in line with the Board):

```html
<div id="board">
  <section data-lp-list="todo">
    <h2 data-lp-list-handle tabindex="0">To do</h2>
    <ul data-lp-cards="todo">
      <li data-lp-card="a" tabindex="0">Write the README</li>
    </ul>
  </section>
</div>
```

Cards are direct children of their `[data-lp-cards]`, and lists direct children of one parent.
Returns `{ destroy() }`. A drop moves the item on the Board and then its element. It takes the
same `options` as `mount`.

## Markup and styling hooks

| Attribute | On |
|---|---|
| `data-lp-list="<id>"` | A list's element. |
| `data-lp-list-handle` | The element a list is dragged by (its header). |
| `data-lp-cards="<list id>"` | A list's container of cards. |
| `data-lp-card="<id>"` | A card. |
| `data-lp-clone` | The copy that follows the pointer during a drag (`position: fixed`, inside `root`). |
| `data-lp-placeholder` | The empty slot where the item would drop; give it a look, e.g. a dashed outline. |
| `data-lp-dragging` | The item being dragged (hidden while the Clone stands in for it). |
| `data-lp-grabbed` | A card or list picked up with the keyboard. |
| `data-lp-live` | The live region (visually hidden, in `document.body`). |

`mount` writes the first four; with `createDrag` you write them. Presses on a `button`, `input`,
`select`, `textarea`, link or `contenteditable` inside a card or a list header start no drag.

## Keyboard

`mount` makes cards and list headers focusable. On a focused card or list header:

| Key | |
|---|---|
| Space | Pick up; again to drop. |
| Enter | Activate it (`onActivate`), as a click does. |
| ↑ ↓ | Move a card one place in its list. |
| ← → | Move a card to the same position (or the end) in the previous or next list; move a list one place. |
| Esc | Put it back where it was picked up. |

Moving the focus away drops it where it is. During a pointer drag, Esc cancels the drag.

## Announcements

Picking up, moving (by keyboard), dropping and cancelling are announced in an `aria-live` region,
in English, for example "Moved Write the README. Done, position 1 of 1." An item is named by its
`aria-label`, else its text; a list by its header's. Set an `aria-label` on a card or header whose
text is long or holds controls.

`options.messages` replaces any of the four messages, for another language for example (in the
example above, instead of `mount(root, board, renderers)`):

```ts
const view = mount(root, board, renderers, {
  messages: {
    move: ({ label, listLabel, position, count }) =>
      `${label} movido. ${listLabel ?? "Listas"}, posição ${position} de ${count}.`,
  },
});
```

Each message (`pickUp`, `move`, `drop`, `cancel`) receives an `Announcement`:
`{ kind: "card" | "list", label, listLabel, position, count }`, where `listLabel` is a card's
list (`null` for a list) and `position` is 1-based among the cards of that list, or among the lists.

## License

MIT
