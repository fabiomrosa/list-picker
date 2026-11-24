# list-picker — Product

The top of the precedence list (SESSION §8). Only the owner changes it, through a docs pull request.

## What it is
A headless, framework-agnostic library for lists people reorder: a kanban board's lists of cards, a
playlist's tracks. Items can be added, removed, reordered and dragged between lists, and lists can
themselves be reordered. It ships
the data model, the drag behaviour and the containers; the look of every card and list belongs to
the user. A lab: it rewrites `list-picker-js` (2017) to test one idea, that doubly linked lists make
the board's operations simpler and cheaper than recomputing positions in JavaScript.

## Who it serves
Front-end developers building a UI where people reorder items (a Trello-like board, a playlist, a
ranked list) who want the behaviour without a visual style or a framework imposed on them. No one pays: it is an open-source lab.

## Business model
None. Success is learning: the theory tested, measured and written down.

## Product principles
- **Headless.** The library never ships a card's look. The user passes their own card (and list)
  component with its own behaviour; the library provides containers, the clone and the placeholder.
- **The browser does the layout.** Cards stay in the normal document flow and stack by themselves;
  a placeholder the size of the dragged card holds its place. No absolute positioning, no computed
  `top`/`height` per card.
- **One model, two levels.** The board is a linked list of lists; each list is a linked list of
  cards. Moving a list and moving a card are the same operation.
- **Framework-agnostic core.** `core` knows no DOM and no framework; the vanilla adapter comes first,
  React and Angular adapters are thin layers over the same core and engine.
- **Measured, not assumed.** A performance claim needs a benchmark or a trace.

## Launch v1
- **In:** `core` (the linked-list model and its operations, events, a snapshot for rendering), the
  drag engine, the vanilla adapter, a demo page.
- **Out:** React and Angular adapters (after v1), persistence, a default theme, multi-select,
  virtualisation.

## Ubiquitous language

| Term | Meaning |
|---|---|
| Board | The ordered collection of lists; a linked list of List nodes |
| List | An ordered collection of cards; a linked list of Card nodes, and itself a node of the Board |
| Card | One item of a List, identified by a unique `id` |
| Node | A linked-list entry: the value plus `prev` and `next` |
| Index | The `Map<id, Node>` kept next to each linked list, so finding a node is O(1) |
| Move | Taking a node out of its place and inserting it before or after another node, possibly in another List |
| Snapshot | An immutable array view of the Board, in order, for renderers that need arrays |
| Drag | The gesture: from pointer down past the threshold until drop or cancel |
| Clone | The copy of the dragged card that follows the pointer (moved only with a transform (the `translate` property)) |
| Placeholder | An empty element the size of the dragged card, placed where the card would drop |
| Drop target | The List (and position in it) under the pointer during a Drag |
| Renderer | The user's function or component that renders a Card or a List |
| Adapter | A thin layer that binds core and the engine to a UI layer (vanilla, React, Angular) |

## Engineering-critical invariants
- Every `id` is unique within its level (lists on the Board, cards across the Board).
- The Index and the links always agree: the Index holds exactly the nodes reachable from `head`;
  `a.next === b` exactly when `b.prev === a`; `head.prev` and `tail.next` are `null`; `size` equals
  the node count.
- A Move never loses or duplicates a card, including a Move to the same place.
- A Snapshot's order equals the traversal order from `head`.
- A completed drop that changes the order emits exactly one move event; a cancelled drag or a drop
  in the same place emits none, and leaves the model unchanged.
- The library never changes the inside of the user's card; it touches only its containers, the
  Clone and the Placeholder.
