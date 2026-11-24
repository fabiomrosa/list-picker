// The player (L4.25): the owner's first sketch of list-picker, a playlist. One list drawn by
// `mount`; previous and next by `board.neighbours`; tick two tracks to swap them
// (`board.swapCards`); drag or keyboard moves by the engine; a click or Enter plays a track
// (`onActivate`). Not published; `e2e/player.e2e.ts` drives it.
import { Board } from "../packages/core/src/index.ts";
import { mount } from "../packages/vanilla/src/index.ts";

type Playlist = { id: string; name: string };
type Track = { id: string; title: string; time: string };

const TRACKS: [string, string][] = [
  ["Don't Panic", "2:17"],
  ["Shiver", "5:04"],
  ["Spies", "5:18"],
  ["Sparks", "3:47"],
  ["Yellow", "4:29"],
  ["Trouble", "4:30"],
  ["Parachutes", "0:46"],
  ["High Speed", "4:14"],
  ["We Never Change", "4:09"],
  ["Everything's Not Lost", "7:15"],
];

const board = new Board<Playlist, Track>();
board.addList({ id: "playlist", name: "Parachutes" }, null);
for (const [i, [title, time]] of TRACKS.entries()) {
  board.addCard("playlist", { id: `t${i + 1}`, title, time }, null);
}

const byId = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const nowTitle = byId("now-title");
const nowTime = byId("now-time");
const prev = byId<HTMLButtonElement>("prev");
const next = byId<HTMLButtonElement>("next");
const status = byId("player-status");
const root = byId("playlist");

let playing = "t1";
/** The track ticked first, waiting for a second tick to swap with. */
let picked: string | undefined;

/** Shows the playing track and which way previous and next can go; numbers the tracks. */
function show(): void {
  const track = board.getCard(playing);
  if (!track) return;
  nowTitle.textContent = track.title;
  nowTime.textContent = track.time;
  const { prev: before, next: after } = board.neighbours(playing);
  prev.disabled = !before;
  next.disabled = !after;
  [...board.cards("playlist")].forEach((t, i) => {
    const row = root.querySelector(`[data-lp-card="${CSS.escape(t.id)}"]`);
    if (!row) return;
    (row.querySelector(".track-number") as HTMLElement).textContent = `${i + 1}.`;
    row.toggleAttribute("data-playing", t.id === playing);
  });
}

function play(id: string): void {
  playing = id;
  status.textContent = `Playing ${board.getCard(id)?.title}`;
  show();
}

prev.addEventListener("click", () => {
  const { prev: before } = board.neighbours(playing);
  if (before) play(before.id);
});
next.addEventListener("click", () => {
  const { next: after } = board.neighbours(playing);
  if (after) play(after.id);
});

/** A tick picks a track; a tick on another swaps the two; a tick on the same one unpicks it. */
function tick(id: string, box: HTMLInputElement): void {
  if (picked === undefined) {
    picked = id;
    status.textContent = `Picked ${board.getCard(id)?.title}: tick another track to swap them`;
    return;
  }
  const first = picked;
  picked = undefined;
  box.checked = false;
  const firstBox = root.querySelector<HTMLInputElement>(
    `[data-lp-card="${CSS.escape(first)}"] input[type=checkbox]`,
  );
  if (firstBox) firstBox.checked = false;
  if (first === id) {
    status.textContent = "";
    return;
  }
  board.swapCards(first, id);
  status.textContent = `Swapped ${board.getCard(first)?.title} and ${board.getCard(id)?.title}`;
}

mount(
  root,
  board,
  {
    renderList(list) {
      const head = document.createElement("h2");
      head.className = "playlist-name";
      head.textContent = list.name;
      return head;
    },
    renderCard(track) {
      const row = document.createElement("div");
      row.className = "track";
      row.setAttribute("aria-label", track.title);
      const box = document.createElement("input");
      box.type = "checkbox";
      box.setAttribute("aria-label", `Pick ${track.title} to swap`);
      box.addEventListener("change", () => tick(track.id, box));
      const number = document.createElement("span");
      number.className = "track-number";
      const title = document.createElement("span");
      title.className = "track-title";
      title.textContent = track.title;
      const time = document.createElement("span");
      time.className = "track-time";
      time.textContent = track.time;
      row.append(box, number, title, time);
      return row;
    },
  },
  {
    onActivate: ({ kind, id }) => {
      if (kind === "card") play(id);
    },
  },
);

// After every change (a swap, a drop), once `mount` has drawn it (its microtask runs first).
let queued = false;
board.on("change", () => {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    show();
  });
});
show();
// For the browser tests and the console.
Object.assign(window, { board });
