// `npm run bench`: times the same random card moves on the Board (linked lists) and on an
// ArrayBoard (arrays + splice). Boards are built outside the timing; each sample is a fresh board.
// A plain runner rather than `vitest bench`: every sample needs a fresh board, built untimed.
import { type Move, makeArrayBoard, makeBoard, makeMoves, type Shape } from "./moves.ts";

type Mover = { moveCard(id: string, toListId: string, beforeCardId: string | null): boolean };

const SHAPES: Shape[] = [
  { lists: 10, cardsPerList: 10 },
  { lists: 10, cardsPerList: 100 },
  { lists: 20, cardsPerList: 500 },
];
const MOVES = 2000;
const SAMPLES = 40;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

/** One sample: a fresh board, built outside the timing, then the moves. */
function sample(make: () => Mover, moves: Move[]): number {
  const board = make();
  const start = performance.now();
  for (const m of moves) board.moveCard(m.id, m.toListId, m.beforeCardId);
  return performance.now() - start;
}

/** Warms both sides for ~100 ms each, then alternates which side runs first in every round. */
function compare(a: () => Mover, b: () => Mover, moves: Move[]): [number, number] {
  for (const make of [a, b]) {
    const until = performance.now() + 100;
    while (performance.now() < until) sample(make, moves);
  }
  const as: number[] = [];
  const bs: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    if (i % 2 === 0) {
      as.push(sample(a, moves));
      bs.push(sample(b, moves));
    } else {
      bs.push(sample(b, moves));
      as.push(sample(a, moves));
    }
  }
  return [median(as), median(bs)];
}

console.log(`${MOVES} random card moves, median of ${SAMPLES} fresh boards (µs per move)\n`);
console.log("board            linked list   arrays   arrays / linked");
for (const shape of SHAPES) {
  const moves = makeMoves(shape, MOVES);
  const [linked, arrays] = compare(
    () => makeBoard(shape),
    () => makeArrayBoard(shape),
    moves,
  );
  const perMove = (ms: number) => ((ms * 1000) / MOVES).toFixed(3).padStart(8);
  const name = `${shape.lists} × ${shape.cardsPerList}`.padEnd(14);
  console.log(
    `${name} ${perMove(linked)}    ${perMove(arrays)}   ${(arrays / linked).toFixed(1).padStart(6)}×`,
  );
}
