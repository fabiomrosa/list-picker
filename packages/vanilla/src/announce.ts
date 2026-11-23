import type { Board } from "@list-picker/core";

/** What an announcement is about: the moved card or list, where it is now. */
export interface Announcement {
  readonly kind: "card" | "list";
  /** The item's `aria-label`, else its text, else its id (a list's from its handle). */
  readonly label: string;
  /** A card's list, labelled the same way; `null` for a list. */
  readonly listLabel: string | null;
  /** 1-based, among the cards of its list or among the lists. */
  readonly position: number;
  readonly count: number;
}

/** The text announced for each event (DEC-16); the `messages` option replaces any of them. */
export interface Messages {
  pickUp(item: Announcement): string;
  move(item: Announcement): string;
  drop(item: Announcement): string;
  cancel(item: Announcement): string;
}

/** Options of `createDrag` and `mount`. */
export interface DragOptions {
  readonly messages?: Partial<Messages>;
}

const where = ({ listLabel, position, count }: Announcement) =>
  `${listLabel === null ? "Position" : `${listLabel}, position`} ${position} of ${count}.`;

const DEFAULTS: Messages = {
  pickUp: (item) => `Picked up ${item.label}. ${where(item)}`,
  move: (item) => `Moved ${item.label}. ${where(item)}`,
  drop: (item) => `Dropped ${item.label}. ${where(item)}`,
  cancel: (item) => `Cancelled moving ${item.label}. ${where(item)}`,
};

/** The engine's live region: `say` announces an event for a card or list element. */
export interface Announcer {
  say(event: keyof Messages, kind: "card" | "list", item: HTMLElement): void;
  destroy(): void;
}

function labelOf(element: Element | null | undefined, id: string): string {
  return element?.getAttribute("aria-label")?.trim() || element?.textContent?.trim() || id;
}

/**
 * Adds a visually hidden `aria-live="assertive"` region to the document's body (so `root` holds only
 * the user's markup) and announces into it, with the position read from the Board (an item no
 * longer on the Board is not announced).
 */
export function createAnnouncer<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
  messages: Partial<Messages> = {},
): Announcer {
  const region = document.createElement("div");
  region.setAttribute("data-lp-live", "");
  region.setAttribute("aria-live", "assertive");
  region.setAttribute("aria-atomic", "true");
  Object.assign(region.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
  });
  document.body.append(region);

  /** The label of list `id`, from its handle in `root` if there is one. */
  const labelOfList = (id: string) => {
    const list = [...root.querySelectorAll("[data-lp-list]")].find(
      (element) => element.getAttribute("data-lp-list") === id,
    );
    return labelOf(list?.querySelector("[data-lp-list-handle]"), id);
  };

  return {
    say(event, kind, item) {
      const id = item.getAttribute(kind === "card" ? "data-lp-card" : "data-lp-list") ?? "";
      const list = kind === "card" ? board.listOf(id) : undefined;
      if (kind === "card" ? !list : !board.getList(id)) return;
      const ids = [...(list ? board.cards(list.id) : board.lists())].map((value) => value.id);
      region.textContent = (messages[event] ?? DEFAULTS[event])({
        kind,
        label: kind === "card" ? labelOf(item, id) : labelOfList(id),
        listLabel: list ? labelOfList(list.id) : null,
        position: ids.indexOf(id) + 1,
        count: ids.length,
      });
    },
    destroy: () => region.remove(),
  };
}
