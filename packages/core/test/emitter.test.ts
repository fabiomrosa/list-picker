import { describe, expect, it } from "vitest";
import { Emitter } from "../src/emitter.ts";

type Events = { ping: number; done: undefined };

describe("Emitter", () => {
  it("delivers each event to its listeners, in subscription order", () => {
    const emitter = new Emitter<Events>();
    const seen: string[] = [];
    emitter.on("ping", (n) => seen.push(`first ${n}`));
    emitter.on("ping", (n) => seen.push(`second ${n}`));
    emitter.on("done", () => seen.push("done"));
    emitter.emit("ping", 1);
    emitter.emit("done", undefined);
    expect(seen).toEqual(["first 1", "second 1", "done"]);
  });

  it("stops delivering after unsubscribe", () => {
    const emitter = new Emitter<Events>();
    const seen: number[] = [];
    const off = emitter.on("ping", (n) => seen.push(n));
    emitter.emit("ping", 1);
    off();
    off();
    emitter.emit("ping", 2);
    expect(seen).toEqual([1]);
  });

  it("still calls every listener when one throws, then rethrows the first error", () => {
    const emitter = new Emitter<Events>();
    const seen: string[] = [];
    emitter.on("ping", () => {
      throw new Error("boom");
    });
    emitter.on("ping", () => seen.push("after"));
    expect(() => emitter.emit("ping", 1)).toThrow("boom");
    expect(seen).toEqual(["after"]);
  });
});
