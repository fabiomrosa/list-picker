// A pretend backend for the Board demos (L5.13): it keeps the board in the browser's storage and
// answers after a delay, as `fetch` to your API would; it can fail the next save. It places a moved
// card or list with core's own `Board`, from the neighbours the `move` event names (DEC-11), as a
// real backend would from the same request. In your app, `load` and `save` are `fetch` calls.
import { Board, type MoveEvent, type Snapshot } from "@list-picker/core";

/** A request as the panel shows it, once answered. */
export type Answered = { method: string; path: string; body?: unknown; status: number };

const DELAY = 400; // ms, as a slow network

export function fakeServer<L extends { id: string }, C extends { id: string }>(
  key: string,
  start: Snapshot<L, C>,
) {
  let failNext = false;
  let memory = start; // where the board is kept when the browser has no storage (a private window)
  const listeners = new Set<(request: Answered) => void>();

  const read = (): Snapshot<L, C> => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : start;
    } catch {
      return memory;
    }
  };
  const write = (data: Snapshot<L, C>) => {
    memory = data;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  };

  /** Answers after the delay: 500 for a save when failing was asked for, 409 if `handle` throws. */
  function request<T>(method: string, path: string, body: unknown, handle: () => T): Promise<T> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let status = 200;
        let out: T | undefined;
        if (method === "PATCH" && failNext) {
          failNext = false;
          status = 500;
        } else {
          try {
            out = handle();
          } catch {
            status = 409;
          }
        }
        for (const listener of listeners) listener({ method, path, body, status });
        if (status === 200) resolve(out as T);
        else reject(new Error(`${method} ${path}: ${status}`));
      }, DELAY);
    });
  }

  return {
    /** `GET /board`: the saved board, or the starting one. */
    load: () => request("GET", "/board", undefined, read),
    /** `PATCH /cards/:id` or `/lists/:id`: places it before `nextId` (in `toListId` for a card). */
    save: (move: MoveEvent) => {
      const { kind, id, toListId, prevId, nextId } = move;
      const body = kind === "card" ? { toListId, prevId, nextId } : { prevId, nextId };
      return request("PATCH", `/${kind}s/${id}`, body, () => {
        const board = new Board<L, C>();
        for (const { list, cards } of read().lists) {
          board.addList(list, null);
          for (const card of cards) board.addCard(list.id, card, null);
        }
        if (kind === "card") board.moveCard(id, toListId ?? "", nextId);
        else board.moveList(id, nextId);
        write(board.snapshot());
      });
    },
    /** `POST /reset`: the starting board again. */
    reset: () =>
      request("POST", "/reset", undefined, () => {
        write(start);
        return start;
      }),
    /** The next save answers 500. */
    failNextSave: (on: boolean) => {
      failNext = on;
    },
    /** Each answered request, for the panel. */
    onRequest: (listener: (request: Answered) => void) => listeners.add(listener),
  };
}
