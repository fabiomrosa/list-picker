// The React demo (L5.6): the home's kanban board written with `@list-picker/react`, in the markup
// `mount` draws (but for the handle: the list's title, not its whole header), so `home.css`'s skins
// style it as they do the home's. Saving the order (L5.14): `keepSaved` (`saving.ts`) loads the
// Board from a pretend server and saves each `move`, as the vanilla demo does; the panel below shows
// the requests. Driven by `e2e/react.e2e.ts` and `e2e/saving.e2e.ts`.
import { Board } from "@list-picker/core";
import { type ListPickerOptions, useBoard, useListPicker } from "@list-picker/react";
import { Fragment, StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Answered } from "./fake-server.ts";
import { type Card, keepSaved, type List, server } from "./saving.ts";

const LIMIT = 3;
const HINT =
  "Drag a card or a list title, or use Space and the arrows. Doing holds 3 cards; a click or Enter opens a card or a list.";
const STATUS: Record<number, string> = {
  200: "200 OK",
  409: "409 Conflict",
  500: "500 Server error",
};
const board = new Board<List, Card>();
const saving = keepSaved(board);
const opening = saving.open(); // the board as the server has it: drawn when it comes

const SKINS = ["Cards", "Terminal", "Pop"] as const;

function Kanban() {
  const { lists } = useBoard(board);
  const [skin, setSkin] = useState<(typeof SKINS)[number]>("Cards");
  const [status, setStatus] = useState("Loading the board…");
  useEffect(() => {
    opening.then(() => setStatus(HINT));
  }, []);
  const [requests, setRequests] = useState<Answered[]>([]);
  const [failNext, setFailNext] = useState(false);
  useEffect(
    () =>
      saving.onNotSaved(() =>
        setStatus("Not saved: the server answered an error, so the board is back to its order."),
      ),
    [],
  );
  // The requests as answered, newest first (the last six); a failed save unticks the box.
  useEffect(
    () =>
      server.onRequest((request) => {
        setRequests((shown) => [request, ...shown].slice(0, 6));
        if (request.status === 500) setFailNext(false);
      }),
    [],
  );
  const options: ListPickerOptions = {
    // Doing holds 3 cards: a fourth is never shown there, nor dropped.
    canMove: ({ kind, id, toListId }) =>
      kind === "list" ||
      toListId !== "doing" ||
      board.listOf(id)?.id === "doing" ||
      [...board.cards("doing")].length < LIMIT,
    onActivate: ({ kind, id }) =>
      setStatus(`Opened: ${kind === "card" ? board.getCard(id)?.text : board.getList(id)?.title}.`),
  };
  const picker = useListPicker(board, options);
  return (
    <>
      <div className="skins" role="radiogroup" aria-labelledby="skins-label">
        <span id="skins-label">Same board, your look:</span>
        {/* The input before its label, as on the home: `home.css` styles `input:checked + label`. */}
        {SKINS.map((name) => (
          <Fragment key={name}>
            <input
              type="radio"
              name="skin"
              id={`skin-${name}`}
              checked={skin === name}
              onChange={() => setSkin(name)}
            />
            <label htmlFor={`skin-${name}`}>{name}</label>
          </Fragment>
        ))}
      </div>
      <div id="hero-board" data-skin={skin.toLowerCase()} ref={picker.ref}>
        {lists.map(({ list, cards }) => (
          <div key={list.id} {...picker.list(list.id)}>
            <header className="hb-head">
              {/* The title is the handle: its text, not the count beside it, names the list. */}
              <h3 className="hb-title" {...picker.listHandle(list.id)}>
                {list.title}
              </h3>
              <span className="hb-count">
                {list.id === "doing" ? `${cards.length}/${LIMIT}` : cards.length}
              </span>
            </header>
            <div {...picker.cards(list.id)}>
              {cards.map((card) => (
                <article
                  key={card.id}
                  className="hb-card"
                  aria-label={card.text}
                  {...picker.card(card.id)}
                >
                  <span className="hb-tag">{card.tag}</span>
                  <p className="hb-text">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="hint" id="board-status" role="status">
        {status}
      </p>
      <section className="server" aria-labelledby="server-title">
        <h2 id="server-title">Saved on a server</h2>
        <p>
          A pretend backend in this page: it keeps the board in your browser's storage and answers
          after 400&nbsp;ms. Each move is shown at once and saved; reload, and the order stays. A
          failed save puts the server's order back.
        </p>
        <p className="server-actions">
          <label>
            <input
              type="checkbox"
              checked={failNext}
              onChange={(event) => {
                setFailNext(event.target.checked);
                server.failNextSave(event.target.checked);
              }}
            />{" "}
            Fail the next save
          </label>
          <button
            type="button"
            onClick={() => {
              setStatus("Reset: the starting board.");
              saving.reset();
            }}
          >
            Reset the data
          </button>
        </p>
        <ol className="requests" id="requests" aria-label="Requests, newest first">
          {requests.map(({ method, path, body, status: code }, i) => (
            // Requests have no id; the rows hold no state and are at most six, so an index will do.
            // biome-ignore lint/suspicious/noArrayIndexKey: stateless rows, at most six
            <li key={i} data-failed={code !== 200 ? "" : undefined}>
              {`${method} ${path}${body ? ` ${JSON.stringify(body)}` : ""} → ${STATUS[code]}`}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

createRoot(document.getElementById("react-board") as HTMLElement).render(
  <StrictMode>
    <Kanban />
  </StrictMode>,
);
