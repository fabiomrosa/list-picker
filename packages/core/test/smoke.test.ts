import { describe, expect, it } from "vitest";
import * as core from "../src/index.ts";

describe("@list-picker/core", () => {
  it("loads its public API", () => {
    expect(core.packageName).toBe("@list-picker/core");
  });
});
