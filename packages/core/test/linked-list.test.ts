import { describe, expect, it } from "vitest";
import { LinkedList } from "../src/index.ts";

type Item = { id: string };
const ids = (list: LinkedList<Item>) => [...list].map((item) => item.id);

describe("LinkedList", () => {
  it("is empty when created", () => {
    const list = new LinkedList<Item>();
    expect(list.size).toBe(0);
    expect(list.first).toBeNull();
    expect(list.last).toBeNull();
    expect(ids(list)).toEqual([]);
  });

  it("iterates appended values in insertion order", () => {
    const list = new LinkedList<Item>();
    list.insertBefore({ id: "a" }, null);
    list.insertBefore({ id: "b" }, null);
    list.insertBefore({ id: "c" }, null);
    expect(ids(list)).toEqual(["a", "b", "c"]);
    expect(list.size).toBe(3);
    expect(list.first?.value.id).toBe("a");
    expect(list.last?.value.id).toBe("c");
  });

  it("finds a node by id, linked to its neighbours", () => {
    const list = new LinkedList<Item>();
    for (const id of ["a", "b", "c"]) list.insertBefore({ id }, null);
    const b = list.get("b");
    expect(b?.value.id).toBe("b");
    expect(b?.prev?.value.id).toBe("a");
    expect(b?.next?.value.id).toBe("c");
    expect(list.get("a")?.prev).toBeNull();
    expect(list.get("c")?.next).toBeNull();
    expect(list.has("b")).toBe(true);
  });

  it("gives undefined for an unknown id", () => {
    const list = new LinkedList<Item>();
    list.insertBefore({ id: "a" }, null);
    expect(list.get("x")).toBeUndefined();
    expect(list.has("x")).toBe(false);
  });

  it("throws on a duplicate id and stays unchanged", () => {
    const list = new LinkedList<Item>();
    list.insertBefore({ id: "a" }, null);
    list.insertBefore({ id: "b" }, null);
    expect(() => list.insertBefore({ id: "a" }, null)).toThrow('list-picker: duplicate id "a"');
    expect(ids(list)).toEqual(["a", "b"]);
    expect(list.size).toBe(2);
    expect(list.last?.value.id).toBe("b");
  });
});
