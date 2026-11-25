// The React player (L5.11): the vanilla player (`player.ts`) written with `@list-picker/react`, in
// the same markup, so `player.css` styles it. The playing track, the clock and the tick are React
// state; the order is the Board's. Driven by `e2e/player.e2e.ts`, as the vanilla one.
import { Board } from "@list-picker/core";
import { useBoard, useListPicker } from "@list-picker/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

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

/** A pretend play: no sound, the clock ten times faster than real time. */
const SPEED = 10;
const STEP = 0.25; // seconds of real time between clock ticks
const seconds = (time: string) => {
  const [m, s] = time.split(":").map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const title = (id: string) => board.getCard(id)?.title;

function Player() {
  const { lists } = useBoard(board);
  const [playing, setPlaying] = useState("t1");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  /** The track ticked first, waiting for a second tick to swap with. */
  const [picked, setPicked] = useState<string>();
  const [status, setStatus] = useState("");

  const play = (id: string) => {
    setPlaying(id);
    setElapsed(0);
    setStatus(`Playing ${title(id)}`);
  };
  const picker = useListPicker(board, {
    onActivate: ({ kind, id }) => {
      if (kind !== "card") return;
      play(id);
      setRunning(true);
    },
  });

  // The clock, while playing.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed((e) => e + STEP * SPEED), STEP * 1000);
    return () => clearInterval(timer);
  }, [running]);
  // At a track's end, the next one in the playlist's current order, or a stop.
  useEffect(() => {
    const total = seconds(board.getCard(playing)?.time ?? "0:00");
    if (elapsed < total) return;
    const { next } = board.neighbours(playing);
    if (next) play(next.id);
    else {
      setElapsed(total);
      setRunning(false);
    }
  });

  /** A tick picks a track; a tick on another swaps the two; a tick on the same one unpicks it. */
  const tick = (id: string) => {
    setPicked(undefined);
    if (picked === undefined) {
      setPicked(id);
      setStatus(`Picked ${title(id)}: tick another track to swap them`);
    } else if (picked === id) setStatus("");
    else {
      board.swapCards(picked, id);
      setStatus(`Swapped ${title(picked)} and ${title(id)}`);
    }
  };

  const tracks = lists[0]?.cards ?? [];
  const track = board.getCard(playing);
  const total = seconds(track?.time ?? "0:00");
  const { prev, next } = board.neighbours(playing);
  return (
    <section className="player" aria-label="Music player" data-running={running ? "" : undefined}>
      <header className="now">
        <div className="cover" aria-hidden="true" />
        <div className="now-text">
          <p className="artist">Coldplay</p>
          <p className="title" id="now-title">
            {track?.title}
          </p>
          <div className="progress">
            <div
              className="progress-bar"
              id="progress"
              role="progressbar"
              aria-label="Played"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={Math.floor(elapsed)}
              aria-valuetext={`${clock(elapsed)} of ${track?.time}`}
            >
              <span
                id="progress-fill"
                // Back to the start at once (a new track), sliding only while it plays.
                style={{
                  transform: `scaleX(${Math.min(elapsed, total) / total})`,
                  transition: elapsed === 0 ? "none" : undefined,
                }}
              />
            </div>
            <span id="now-time">{`${clock(elapsed)} / ${track?.time}`}</span>
          </div>
        </div>
        <div className="controls">
          <button
            type="button"
            id="prev"
            aria-label="Previous track"
            disabled={!prev}
            onClick={() => prev && play(prev.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 17 5 12l6-5M19 17l-6-5 6-5" />
            </svg>
          </button>
          <button
            type="button"
            id="toggle"
            aria-label={running ? "Pause" : "Play"}
            onClick={() => {
              // At the end of the last track, play starts it over.
              if (!running && elapsed >= total) setElapsed(0);
              setRunning(!running);
            }}
          >
            <svg className="icon-play" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg className="icon-pause" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14M16 5v14" />
            </svg>
          </button>
          <button
            type="button"
            id="next"
            aria-label="Next track"
            disabled={!next}
            onClick={() => next && play(next.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m13 17 6-5-6-5M5 17l6-5-6-5" />
            </svg>
          </button>
        </div>
      </header>
      <div id="playlist" ref={picker.ref}>
        {lists.map(({ list }) => (
          <div key={list.id} {...picker.list(list.id)}>
            <h2 className="playlist-name" {...picker.listHandle(list.id)}>
              {list.name}
            </h2>
            <div {...picker.cards(list.id)}>
              {tracks.map((t, i) => (
                // A named group (its checkbox inside): read as "Shiver, group" when focused; a div as
                // the vanilla player's row (a fieldset lays out its legend and grid its own way).
                // biome-ignore lint/a11y/useSemanticElements: the same row as the vanilla player's
                <div
                  key={t.id}
                  className="track"
                  role="group"
                  aria-label={t.title}
                  data-playing={t.id === playing ? "" : undefined}
                  // The playing track, for screen readers too, not only by its look.
                  aria-current={t.id === playing ? "true" : undefined}
                  {...picker.card(t.id)}
                >
                  <input
                    type="checkbox"
                    aria-label={`Pick ${t.title} to swap`}
                    checked={picked === t.id}
                    onChange={() => tick(t.id)}
                  />
                  <span className="track-number">{i + 1}.</span>
                  <span className="track-title">{t.title}</span>
                  {/* The playing track's equalizer (animated while playing; decorative). */}
                  <span className="eq" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="track-time">{t.time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="hint" id="player-status" role="status">
        {status}
      </p>
    </section>
  );
}

createRoot(document.getElementById("player-root") as HTMLElement).render(
  <StrictMode>
    <Player />
  </StrictMode>,
);
