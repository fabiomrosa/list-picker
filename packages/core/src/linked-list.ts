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

  /** Inserts `value` at the end (`null`). L1.2 adds inserting before an existing id. */
  insertBefore(value: T, _beforeId: null): void {
    if (this.#index.has(value.id)) {
      throw new Error(`list-picker: duplicate id "${value.id}"`);
    }
    const node: MutableNode<T> = { value, prev: this.#last, next: null };
    if (this.#last) {
      this.#last.next = node;
    } else {
      this.#first = node;
    }
    this.#last = node;
    this.#index.set(value.id, node);
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let node = this.#first; node; node = node.next) {
      yield node.value;
    }
  }
}
