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

  describe("insertBefore an existing node", () => {
    const abc = () => {
      const list = new LinkedList<Item>();
      for (const id of ["a", "b", "c"]) list.insertBefore({ id }, null);
      return list;
    };
    const links = (list: LinkedList<Item>) =>
      [...list].map((item) => {
        const node = list.get(item.id);
        return `${node?.prev?.value.id ?? "-"}<${item.id}>${node?.next?.value.id ?? "-"}`;
      });

    it("makes the value first when inserted before the first node", () => {
      const list = abc();
      list.insertBefore({ id: "x" }, "a");
      expect(ids(list)).toEqual(["x", "a", "b", "c"]);
      expect(list.first?.value.id).toBe("x");
      expect(links(list)).toEqual(["-<x>a", "x<a>b", "a<b>c", "b<c>-"]);
    });

    it("links the value between its neighbours before a middle or the last node", () => {
      const list = abc();
      list.insertBefore({ id: "x" }, "b");
      list.insertBefore({ id: "y" }, "c");
      expect(ids(list)).toEqual(["a", "x", "b", "y", "c"]);
      expect(list.size).toBe(5);
      expect(list.last?.value.id).toBe("c");
      expect(links(list)).toEqual(["-<a>x", "a<x>b", "x<b>y", "b<y>c", "y<c>-"]);
    });

    it("throws on an unknown beforeId and stays unchanged", () => {
      const list = abc();
      expect(() => list.insertBefore({ id: "x" }, "nope")).toThrow(
        'list-picker: unknown id "nope"',
      );
      expect(ids(list)).toEqual(["a", "b", "c"]);
      expect(list.has("x")).toBe(false);
      expect(links(list)).toEqual(["-<a>b", "a<b>c", "b<c>-"]);
    });

    it("throws on a duplicate id with a valid beforeId and stays unchanged", () => {
      const list = abc();
      expect(() => list.insertBefore({ id: "c" }, "a")).toThrow('list-picker: duplicate id "c"');
      expect(links(list)).toEqual(["-<a>b", "a<b>c", "b<c>-"]);
    });

    it("throws on any beforeId in an empty list", () => {
      const list = new LinkedList<Item>();
      expect(() => list.insertBefore({ id: "x" }, "a")).toThrow('list-picker: unknown id "a"');
      expect(list.size).toBe(0);
    });
  });
});

describe("LinkedList.remove", () => {
  const list3 = () => {
    const list = new LinkedList<Item>();
    for (const id of ["a", "b", "c"]) list.insertBefore({ id }, null);
    return list;
  };
  const links = (list: LinkedList<Item>) =>
    [...list].map((item) => {
      const node = list.get(item.id);
      return `${node?.prev?.value.id ?? "-"}<${item.id}>${node?.next?.value.id ?? "-"}`;
    });

  it("leaves an empty list after removing the only node", () => {
    const list = new LinkedList<Item>();
    list.insertBefore({ id: "a" }, null);
    expect(list.remove("a")).toEqual({ id: "a" });
    expect(list.size).toBe(0);
    expect(list.first).toBeNull();
    expect(list.last).toBeNull();
    expect(ids(list)).toEqual([]);
  });

  it.each([
    ["a", ["-<b>c", "b<c>-"], "b", "c"],
    ["b", ["-<a>c", "a<c>-"], "a", "c"],
    ["c", ["-<a>b", "a<b>-"], "a", "b"],
  ])("relinks the neighbours after removing %s", (id, expected, first, last) => {
    const list = list3();
    const node = list.get(id);
    expect(list.remove(id)).toEqual({ id });
    expect(links(list)).toEqual(expected);
    expect(list.size).toBe(2);
    expect(list.first?.value.id).toBe(first);
    expect(list.last?.value.id).toBe(last);
    expect(list.has(id)).toBe(false);
    expect(node?.prev).toBeNull();
    expect(node?.next).toBeNull();
  });

  it("throws on an unknown id and stays unchanged", () => {
    const list = list3();
    expect(() => list.remove("x")).toThrow('list-picker: unknown id "x"');
    expect(links(list)).toEqual(["-<a>b", "a<b>c", "b<c>-"]);
  });

  it("accepts a removed id again", () => {
    const list = list3();
    list.remove("b");
    list.insertBefore({ id: "b" }, "a");
    expect(links(list)).toEqual(["-<b>a", "b<a>c", "a<c>-"]);
  });
});

describe("LinkedList.replace", () => {
  it("swaps the value of the node with the same id, keeping its place", () => {
    const list = new LinkedList<Item & { v?: number }>();
    for (const id of ["a", "b", "c"]) list.insertBefore({ id }, null);
    const next = { id: "b", v: 2 };
    expect(list.replace(next)).toEqual({ id: "b" });
    expect(list.get("b")?.value).toBe(next);
    expect(list.get("a")?.next?.value).toBe(next);
    expect(ids(list)).toEqual(["a", "b", "c"]);
  });

  it("throws on an unknown id and stays unchanged", () => {
    const list = new LinkedList<Item>();
    list.insertBefore({ id: "a" }, null);
    expect(() => list.replace({ id: "x" })).toThrow('list-picker: unknown id "x"');
    expect(ids(list)).toEqual(["a"]);
  });
});
