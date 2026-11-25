// The React demo (L5.6): the home's kanban board written with `@list-picker/react`, in the markup
// `mount` draws, so `home.css`'s skins style it as they do the home's. Driven by `e2e/react.e2e.ts`.
import { Board } from "@list-picker/core";
import { type ListPickerOptions, useBoard, useListPicker } from "@list-picker/react";
import { Fragment, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

type List = { id: string; title: string };
type Card = { id: string; text: string; tag: string };

const LIMIT = 3;
const board = new Board<List, Card>();
board.addList({ id: "todo", title: "To do" }, null);
board.addList({ id: "doing", title: "Doing" }, null);
board.addList({ id: "done", title: "Done" }, null);
board.addCard("todo", { id: "a", text: "Sketch the onboarding flow", tag: "design" }, null);
board.addCard("todo", { id: "b", text: "Write the release notes", tag: "docs" }, null);
board.addCard("todo", { id: "c", text: "Fix the date picker on Safari", tag: "bug" }, null);
board.addCard("doing", { id: "d", text: "Move cards with the keyboard", tag: "a11y" }, null);
board.addCard("doing", { id: "e", text: "Profile the drag on a long list", tag: "perf" }, null);
board.addCard("done", { id: "f", text: "Model lists as linked lists", tag: "core" }, null);

const SKINS = ["Cards", "Terminal", "Pop"] as const;

function Kanban() {
  const { lists } = useBoard(board);
  const [skin, setSkin] = useState<(typeof SKINS)[number]>("Cards");
  const [opened, setOpened] = useState<string>();
  const options: ListPickerOptions = {
    // Doing holds 3 cards: a fourth is never shown there, nor dropped.
    canMove: ({ kind, id, toListId }) =>
      kind === "list" ||
      toListId !== "doing" ||
      board.listOf(id)?.id === "doing" ||
      [...board.cards("doing")].length < LIMIT,
    onActivate: ({ kind, id }) =>
      setOpened(kind === "card" ? board.getCard(id)?.text : board.getList(id)?.title),
  };
  const picker = useListPicker(board, options);
  return (
    <>
      <div className="skins" role="radiogroup" aria-label="Skin">
        <span>Same board, your look:</span>
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
      <p className="hint" role="status">
        {opened
          ? `Opened: ${opened}.`
          : "Drag a card or a list title, or use Space and the arrows. Doing holds 3 cards; a click or Enter opens a card."}
      </p>
    </>
  );
}

createRoot(document.getElementById("react-board") as HTMLElement).render(
  <StrictMode>
    <Kanban />
  </StrictMode>,
);
