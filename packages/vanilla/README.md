# @list-picker/vanilla

Draws a [`@list-picker/core`](https://github.com/fabiomrosa/list-picker/tree/main/packages/core)
Board in the page and lets people reorder its cards and lists (a card is any item: a kanban
board's task, a playlist's track) by pointer (mouse, touch, pen) or keyboard, with screen reader
announcements. It is headless: you render each card and each list header; it owns the containers,
the dragging and the order, and ships no styles. No framework, no runtime dependencies besides the core.

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
    element.className = "card";
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
the focus and a keyboard pick up. The styles are yours (see [Styling a board](#styling-a-board));
for touch dragging, the cards and headers need `touch-action: none` (otherwise a touch scrolls the
page instead):

```css
#board { display: flex; gap: 1rem; }
[data-lp-card], [data-lp-list-handle] { touch-action: none; user-select: none; cursor: grab; }
[data-lp-placeholder] { border: 2px dashed #999; border-radius: 8px; }
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
- `options.canMove({ kind, id, toListId, beforeId })`: return `false` to refuse a place, for
  example a locked card, a list that takes no cards, or a list that is full. It is asked in every frame
  of a drag, again at the drop, and before each keyboard step, so keep it quick. A refused place is
  never shown or applied: the Placeholder stays at the last allowed one, a drop the rule now
  refuses (the Board changed during the drag) cancels, and the keyboard skips to the next allowed
  place in that direction. Where the item was picked up is always allowed while it is shown. `toListId` is `null` for a list. The Board itself is not guarded: your own calls
  are yours.

  ```ts
  const LIMIT = 3;
  mount(root, board, renderers, {
    canMove: ({ kind, id, toListId }) =>
      kind === "list" || toListId !== "doing" || board.listOf(id)?.id === "doing" ||
      [...board.cards("doing")].length < LIMIT,
  });
  ```
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
same `options` as `mount`; one of them is for markup that a renderer draws from the Snapshot (a
framework redrawing on each Board change; `mount` has no need for it):

- `options.moveElements: false`: a pointer drop and each keyboard step only change the Board; the
  element stays where it was, for your renderer to move. A keyboard pick-up follows the item by its
  id to the element your renderer draws for it (the focus too, even when the redraw replaced it).
  A Board change that removes the dragged item, or the list its Placeholder is in, ends a pointer
  drag. The default, `true`, moves the element itself.

## Markup and styling hooks

| Attribute | On |
|---|---|
| `data-lp-list="<id>"` | A list's element. |
| `data-lp-list-handle` | The element a list is dragged by (its header). |
| `data-lp-cards="<list id>"` | A list's container of cards. |
| `data-lp-card="<id>"` | A card. |
| `data-lp-clone` | The copy that follows the pointer during a drag (`position: fixed`, inside `root`; `inert` and `aria-hidden`: its copied controls are neither reachable nor announced). |
| `data-lp-placeholder` | The empty slot where the item would drop; give it a look, e.g. a dashed outline. |
| `data-lp-dragging` | The item being dragged (hidden while the Clone stands in for it). |
| `data-lp-grabbed` | A card or list picked up with the keyboard. |
| `data-lp-live` | The live region (visually hidden, in `document.body`). |

`mount` writes the first four; with `createDrag` you write them. Presses on a `button`, `input`,
`select`, `textarea`, link or `contenteditable` inside a card or a list header start no drag.

## Styling a board

The package ships no styles: your Renderers' elements keep your classes, and the engine adds only
the attributes above. A starting point:

```css
#board { display: flex; align-items: flex-start; gap: 1rem; }
[data-lp-list], [data-lp-clone]:has(> [data-lp-cards]) { width: 16rem; padding: 0.75rem; background: #eef1f4; border-radius: 10px; }
[data-lp-cards] { display: flex; flex-direction: column; gap: 0.5rem; min-height: 3rem; }
.card { padding: 0.6rem; background: #fff; border-radius: 8px; box-shadow: 0 1px 2px #0003; }
[data-lp-card], [data-lp-list-handle] { touch-action: none; user-select: none; cursor: grab; }
[data-lp-placeholder] { border: 2px dashed #9aa5b1; border-radius: 8px; }
[data-lp-clone] { rotate: 2deg; box-shadow: 0 10px 24px #0004; }
:is(.card, [data-lp-list-handle]):focus-visible { outline: 2px solid #0c66e4; outline-offset: -2px; }
:is([data-lp-card], [data-lp-list])[data-lp-grabbed] { outline: 3px solid #e8590c; outline-offset: -3px; }
```

The rules that are easy to miss:

1. **What is dragged needs `touch-action: none`** (cards and list headers), or the browser takes a
   touch for a scroll and cancels the drag.
2. **The Clone loses its `data-lp-card` or `data-lp-list`.** It is a copy of the item with your
   classes, plus `data-lp-clone`: style a card's Clone by its class (`.card`), and a list's by what
   it holds (`[data-lp-clone]:has(> [data-lp-cards])`). Rules keyed on the item (a list's colour by
   its position, say) need their own line for the Clone.
3. **The engine writes the Clone's position and size, and moves it with an inline `translate`:** a
   `translate` of yours is replaced. `rotate`, `scale` and `transform` are yours: they apply after
   the move, around the Clone's centre, so a tilted Clone stays under the pointer. The Clone has
   `pointer-events: none`, so a `cursor` on it never shows.
4. **During a drag the Placeholder and the hidden item are siblings of the other items,** and among
   the lists so is the Clone, so `:nth-child(…)` and `:last-child` shift. Count only the items:
   `[data-lp-list]:nth-child(odd of [data-lp-list])`.
5. **A keyboard pick up of a list marks the whole list** with `data-lp-grabbed`, not its header:
   style it so its cards stay readable, and give `[data-lp-grabbed]` a look of its own (a picked-up
   card is also focused, so a focus style alone does not show the pick up).
6. **A list that scrolls (`overflow: auto`) clips what is drawn outside a card:** draw outlines
   inside (a negative `outline-offset`), and give shadows room with the list's padding.
7. **The Clone is `position: fixed` inside your root:** an ancestor of the root with `transform`,
   `filter`, `will-change: transform` or `contain: layout` (or `paint`) becomes its frame, and the Clone lands off the
   pointer (or is clipped by that ancestor's `overflow: hidden`). Keep those off the board's
   ancestors.

The [site](https://fabiomrosa.github.io/list-picker/) shows one board in three skins (Cards,
Terminal, Pop) that change only CSS.

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

## Saving the order

The Board lives in the page; your backend keeps the order. Load the Board from it, then save each
`move` event: it names where the card (or list) went by its new neighbours, `prevId` and `nextId`,
so the backend can place it without indexes that shift. Show the move at once; if the save fails,
put the backend's order back. The [Board demo](https://fabiomrosa.github.io/list-picker/board.html)
does this against a pretend server.

```ts
type Saved = { lists: { list: List; cards: Card[] }[] };
const load = async (): Promise<Saved> => (await fetch("/api/board")).json();

const saved = new Board<List, Card>();
for (const { list, cards } of (await load()).lists) {
  saved.addList(list, null);
  for (const card of cards) saved.addCard(list.id, card, null);
}
mount(root, saved, renderers);

let restoring = false;
saved.on("move", async ({ kind, id, toListId, prevId, nextId }) => {
  if (restoring) return; // putting the backend's order back: nothing to save
  const response = await fetch(`/api/${kind}s/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toListId, prevId, nextId }),
  }).catch(() => undefined);
  if (response?.ok) return;
  // Not saved: the backend's order again, each list then each of its cards moved to the end.
  const { lists } = await load();
  restoring = true;
  for (const { list, cards } of lists) {
    saved.moveList(list.id, null);
    for (const card of cards) saved.moveCard(card.id, list.id, null);
  }
  restoring = false;
});
```

## License

MIT
