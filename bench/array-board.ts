// The comparison for the benchmark: a board kept in plain arrays, the usual way. It keeps a
// card-to-list map too, so finding a card's list is O(1) like the Board; the cost left is the
// `indexOf` and `splice` inside a list, which is what the linked list is meant to avoid.

type Entity = { id: string };

export class ArrayBoard<C extends Entity> {
  readonly lists: { id: string; cards: C[] }[] = [];
  #listOf = new Map<string, { id: string; cards: C[] }>();

  addList(id: string): void {
    this.lists.push({ id, cards: [] });
  }

  addCard(listId: string, card: C): void {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) throw new Error(`unknown list ${listId}`);
    list.cards.push(card);
    this.#listOf.set(card.id, list);
  }

  moveCard(id: string, toListId: string, beforeCardId: string | null): boolean {
    const from = this.#listOf.get(id);
    const to = this.lists.find((l) => l.id === toListId); // O(lists): lists are few
    if (!from || !to) throw new Error("unknown id");
    const at = from.cards.findIndex((c) => c.id === id);
    if (from === to) {
      const next = from.cards[at + 1]?.id ?? null;
      if (beforeCardId === id || beforeCardId === next) return false;
    }
    const [card] = from.cards.splice(at, 1) as [C];
    const before =
      beforeCardId === null ? to.cards.length : to.cards.findIndex((c) => c.id === beforeCardId);
    if (before < 0) throw new Error(`unknown id ${beforeCardId}`);
    to.cards.splice(before, 0, card);
    this.#listOf.set(id, to);
    return true;
  }
}
