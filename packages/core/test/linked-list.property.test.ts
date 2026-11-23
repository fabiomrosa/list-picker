import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { LinkedList } from "../src/index.ts";

type Item = { id: string };
type Op = { kind: "insert"; id: string; before: string | null } | { kind: "remove"; id: string };

// A small id pool makes duplicates, unknown ids and removals of present ids all frequent.
const id = fc.constantFrom("a", "b", "c", "d", "e", "f");
const op: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant("insert" as const), id, before: fc.option(id, { nil: null }) }),
  fc.record({ kind: fc.constant("remove" as const), id }),
);

/** The reference: a plain array with the same rules, written independently of the linked list. */
function applyToArray(model: string[], o: Op): boolean {
  if (o.kind === "remove") {
    const at = model.indexOf(o.id);
    if (at < 0) return false;
    model.splice(at, 1);
    return true;
  }
  if (model.includes(o.id)) return false;
  if (o.before === null) {
    model.push(o.id);
    return true;
  }
  const at = model.indexOf(o.before);
  if (at < 0) return false;
  model.splice(at, 0, o.id);
  return true;
}

function applyToList(list: LinkedList<Item>, o: Op): boolean {
  try {
    if (o.kind === "remove") list.remove(o.id);
    else list.insertBefore({ id: o.id }, o.before);
    return true;
  } catch {
    return false;
  }
}

function expectInvariants(list: LinkedList<Item>, model: string[]): void {
  const order = [...list].map((item) => item.id);
  expect(order).toEqual(model);
  expect(list.size).toBe(model.length);
  expect(list.first?.value.id ?? null).toBe(model[0] ?? null);
  expect(list.last?.value.id ?? null).toBe(model.at(-1) ?? null);
  expect(list.first?.prev ?? null).toBeNull();
  expect(list.last?.next ?? null).toBeNull();
  for (const known of ["a", "b", "c", "d", "e", "f"]) {
    expect(list.has(known)).toBe(model.includes(known));
  }
  order.forEach((itemId, i) => {
    const node = list.get(itemId);
    expect(node?.value.id).toBe(itemId);
    expect(node?.prev?.value.id ?? null).toBe(order[i - 1] ?? null);
    expect(node?.next?.value.id ?? null).toBe(order[i + 1] ?? null);
    if (node?.next) expect(node.next.prev).toBe(node);
  });
}

describe("LinkedList invariants", () => {
  it("match an array model after any sequence of operations", () => {
    fc.assert(
      fc.property(fc.array(op, { maxLength: 40 }), (ops) => {
        const list = new LinkedList<Item>();
        const model: string[] = [];
        for (const o of ops) {
          expect(applyToList(list, o)).toBe(applyToArray(model, o));
          expectInvariants(list, model);
        }
      }),
      { numRuns: 1000 },
    );
  });
});
