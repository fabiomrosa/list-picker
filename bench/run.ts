// `npm run bench`: times the same random card moves on the Board (linked lists) and on an
// ArrayBoard (arrays + splice). Boards are built outside the timing; each sample is a fresh board.
import { type Move, makeArrayBoard, makeBoard, makeMoves, type Shape } from "./moves.ts";

type Mover = { moveCard(id: string, toListId: string, beforeCardId: string | null): boolean };

const SHAPES: Shape[] = [
  { lists: 10, cardsPerList: 10 },
  { lists: 10, cardsPerList: 100 },
  { lists: 20, cardsPerList: 500 },
];
const MOVES = 2000;
const SAMPLES = 30;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

function time(make: () => Mover, moves: Move[]): number {
  const samples: number[] = [];
  for (let i = 0; i < SAMPLES + 5; i++) {
    const board = make();
    const start = performance.now();
    for (const m of moves) board.moveCard(m.id, m.toListId, m.beforeCardId);
    if (i >= 5) samples.push(performance.now() - start); // the first 5 are warm-up
  }
  return median(samples);
}

console.log(`${MOVES} random card moves, median of ${SAMPLES} fresh boards (µs per move)\n`);
console.log("board            linked list   arrays   arrays / linked");
for (const shape of SHAPES) {
  const moves = makeMoves(shape, MOVES);
  const linked = time(() => makeBoard(shape), moves);
  const arrays = time(() => makeArrayBoard(shape), moves);
  const perMove = (ms: number) => ((ms * 1000) / MOVES).toFixed(3).padStart(8);
  const name = `${shape.lists} × ${shape.cardsPerList}`.padEnd(14);
  console.log(
    `${name} ${perMove(linked)}    ${perMove(arrays)}   ${(arrays / linked).toFixed(1).padStart(6)}×`,
  );
}
