import { LinkedList } from "./linked-list.ts";

type Entity = { id: string };

/** A List on the Board: the user's list value and its linked list of cards. */
interface ListEntry<L, C extends Entity> {
  readonly id: string;
  readonly list: L;
  readonly cards: LinkedList<C>;
}

/**
 * Ordered Lists of ordered Cards (DEC-06): a linked list of Lists, each holding a linked list of
 * Cards, plus a card-to-list index so any card and its List are found in O(1).
 */
export class Board<L extends Entity, C extends Entity> {
  #lists = new LinkedList<ListEntry<L, C>>();
  #listOfCard = new Map<string, ListEntry<L, C>>();

  addList(list: L, beforeListId: string | null): void {
    this.#lists.insertBefore({ id: list.id, list, cards: new LinkedList<C>() }, beforeListId);
  }

  addCard(listId: string, card: C, beforeCardId: string | null): void {
    const entry = this.#entry(listId);
    if (this.#listOfCard.has(card.id)) {
      throw new Error(`list-picker: duplicate id "${card.id}"`);
    }
    entry.cards.insertBefore(card, beforeCardId);
    this.#listOfCard.set(card.id, entry);
  }

  getList(id: string): L | undefined {
    return this.#lists.get(id)?.value.list;
  }

  getCard(id: string): C | undefined {
    return this.#listOfCard.get(id)?.cards.get(id)?.value;
  }

  listOf(cardId: string): L | undefined {
    return this.#listOfCard.get(cardId)?.list;
  }

  *lists(): Generator<L> {
    for (const entry of this.#lists) yield entry.list;
  }

  cards(listId: string): Iterable<C> {
    return this.#entry(listId).cards;
  }

  #entry(listId: string): ListEntry<L, C> {
    const node = this.#lists.get(listId);
    if (!node) throw new Error(`list-picker: unknown list "${listId}"`);
    return node.value;
  }
}
