type Listener<P> = (payload: P) => void;

/**
 * A minimal typed event emitter. Every listener runs even if one throws; the first error is
 * rethrown afterwards, so one failing subscriber neither hides the event from the others nor
 * goes unnoticed. An emit calls the listeners subscribed when it started; a listener is a set
 * member, so subscribing the same function twice registers it once.
 */
export class Emitter<Events extends Record<string, unknown>> {
  #listeners = new Map<keyof Events, Set<Listener<never>>>();

  /** Subscribes `listener` to `event`; the returned function unsubscribes it. */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    let set = this.#listeners.get(event);
    if (!set) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.#listeners.get(event) as Set<Listener<Events[K]>> | undefined;
    if (!set) return;
    let failure: { error: unknown } | undefined;
    for (const listener of [...set]) {
      try {
        listener(payload);
      } catch (error) {
        failure ??= { error };
      }
    }
    if (failure) throw failure.error;
  }
}
