/** A linked-list entry: the value and its neighbours (`null` at the ends). */
export interface Node<T> {
  readonly value: T;
  readonly prev: Node<T> | null;
  readonly next: Node<T> | null;
}

interface MutableNode<T> {
  value: T;
  prev: MutableNode<T> | null;
  next: MutableNode<T> | null;
}

/** A doubly linked list of values with unique string ids, with an Index for O(1) lookup (DEC-06). */
export class LinkedList<T extends { id: string }> {
  #first: MutableNode<T> | null = null;
  #last: MutableNode<T> | null = null;
  #index = new Map<string, MutableNode<T>>();

  get size(): number {
    return this.#index.size;
  }

  get first(): Node<T> | null {
    return this.#first;
  }

  get last(): Node<T> | null {
    return this.#last;
  }

  get(id: string): Node<T> | undefined {
    return this.#index.get(id);
  }

  has(id: string): boolean {
    return this.#index.has(id);
  }

  /** Inserts `value` before the node with `beforeId`, or at the end when `beforeId` is `null`. */
  insertBefore(value: T, beforeId: string | null): void {
    if (this.#index.has(value.id)) {
      throw new Error(`list-picker: duplicate id "${value.id}"`);
    }
    const next = beforeId === null ? null : this.#node(beforeId);
    const prev = next ? next.prev : this.#last;
    const node: MutableNode<T> = { value, prev, next };
    if (prev) prev.next = node;
    else this.#first = node;
    if (next) next.prev = node;
    else this.#last = node;
    this.#index.set(value.id, node);
  }

  /** Puts `value` in the place of the node with the same id, and returns the value it replaces. */
  replace(value: T): T {
    const node = this.#node(value.id);
    const old = node.value;
    node.value = value;
    return old;
  }

  /** Removes the node with `id` and returns its value. */
  remove(id: string): T {
    const node = this.#node(id);
    if (node.prev) node.prev.next = node.next;
    else this.#first = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.#last = node.prev;
    node.prev = null;
    node.next = null;
    this.#index.delete(id);
    return node.value;
  }

  #node(id: string): MutableNode<T> {
    const node = this.#index.get(id);
    if (!node) throw new Error(`list-picker: unknown id "${id}"`);
    return node;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let node = this.#first; node; node = node.next) {
      yield node.value;
    }
  }
}
