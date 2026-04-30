import { describe, it, expect } from "vitest";
import { foldName } from "@/lib/import/normalize";

describe("foldName", () => {
  it("lowercases", () => {
    expect(foldName("Carburante")).toBe("carburante");
  });

  it("strips accents (NFD)", () => {
    expect(foldName("Caffè")).toBe("caffe");
    expect(foldName("Perché")).toBe("perche");
    expect(foldName("È")).toBe("e");
  });

  it("collapses internal whitespace and trims", () => {
    expect(foldName("  Spese    Casa  ")).toBe("spese casa");
  });

  it("returns empty string for empty / whitespace-only input", () => {
    expect(foldName("")).toBe("");
    expect(foldName("   ")).toBe("");
  });

  it("treats accented + cased + spaced variants as equal", () => {
    expect(foldName("ASSICURAZIONE")).toBe(foldName("  Assicurazione  "));
  });
});
