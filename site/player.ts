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
const toggle = byId<HTMLButtonElement>("toggle");
const progress = byId("progress");
const fill = byId("progress-fill");
const player = document.querySelector(".player") as HTMLElement;
const next = byId<HTMLButtonElement>("next");
const status = byId("player-status");
const root = byId("playlist");

let playing = "t1";

/** A pretend play: no sound, the clock ten times faster than real time. */
const SPEED = 10;
const STEP = 0.25; // seconds of real time between clock ticks
let elapsed = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const seconds = (time: string) => {
  const [m, s] = time.split(":").map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** The track ticked first, waiting for a second tick to swap with. */
let picked: string | undefined;

/** Shows the playing track and which way previous and next can go; numbers the tracks. */
function show(): void {
  const track = board.getCard(playing);
  if (!track) return;
  nowTitle.textContent = track.title;
  showProgress();
  const { prev: before, next: after } = board.neighbours(playing);
  prev.disabled = !before;
  next.disabled = !after;
  [...board.cards("playlist")].forEach((t, i) => {
    const row = root.querySelector(`[data-lp-card="${CSS.escape(t.id)}"]`);
    if (!row) return;
    (row.querySelector(".track-number") as HTMLElement).textContent = `${i + 1}.`;
    row.toggleAttribute("data-playing", t.id === playing);
    // The playing track, for screen readers too, not only by its look.
    if (t.id === playing) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
  });
}

/** The bar and the time played, for the playing track. */
function showProgress(): void {
  const track = board.getCard(playing);
  if (!track) return;
  const total = seconds(track.time);
  // Back to the start at once (a new track), sliding only while it plays.
  fill.style.transition = elapsed === 0 ? "none" : "";
  fill.style.transform = `scaleX(${Math.min(elapsed, total) / total})`;
  progress.setAttribute("aria-valuemax", String(total));
  // Once per shown second, not every tick: some screen readers sound each change.
  const now = String(Math.floor(elapsed));
  if (progress.getAttribute("aria-valuenow") !== now) {
    progress.setAttribute("aria-valuenow", now);
    progress.setAttribute("aria-valuetext", `${clock(elapsed)} of ${track.time}`);
  }
  nowTime.textContent = `${clock(elapsed)} / ${track.time}`;
}

/** Starts or pauses the pretend play. */
function run(on: boolean): void {
  clearInterval(timer);
  timer = on ? setInterval(advance, STEP * 1000) : undefined;
  player.toggleAttribute("data-running", on);
  toggle.setAttribute("aria-label", on ? "Pause" : "Play");
}

/** One clock tick; at the track's end, the next one in the playlist's order, or a stop. */
function advance(): void {
  const track = board.getCard(playing);
  if (!track) return;
  elapsed += STEP * SPEED;
  if (elapsed < seconds(track.time)) {
    showProgress();
    return;
  }
  const { next: after } = board.neighbours(playing);
  if (after) {
    play(after.id);
  } else {
    elapsed = seconds(track.time);
    showProgress();
    run(false);
  }
}

function play(id: string): void {
  playing = id;
  elapsed = 0;
  status.textContent = `Playing ${board.getCard(id)?.title}`;
  show();
}

toggle.addEventListener("click", () => {
  // At the end of the last track, play starts it over.
  const track = board.getCard(playing);
  if (timer === undefined && track && elapsed >= seconds(track.time)) elapsed = 0;
  run(timer === undefined);
});

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
      // A named group (its checkbox inside): read as "Shiver, group" when focused.
      row.setAttribute("role", "group");
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
      // The playing track's equalizer (animated while playing; decorative).
      const eq = document.createElement("span");
      eq.className = "eq";
      eq.setAttribute("aria-hidden", "true");
      eq.append(
        document.createElement("i"),
        document.createElement("i"),
        document.createElement("i"),
      );
      row.append(box, number, title, eq, time);
      return row;
    },
  },
  {
    onActivate: ({ kind, id }) => {
      if (kind !== "card") return;
      play(id);
      run(true);
    },
  },
);

// After every change (a swap, a drop): numbers and previous / next follow the Board (rows are found
// by id, so it does not matter whether `mount` has moved them yet).
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
