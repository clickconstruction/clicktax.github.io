import { describe, expect, it } from "vitest";
import { scheduleSE } from "../src/forms/scheduleSE.ts";

describe("Schedule SE", () => {
  it("computes SE tax below the wage base (2025)", () => {
    const r = scheduleSE.compute({ line2: 89100 }, { year: 2025, rounding: "whole" });
    expect(r.values["line4a"]).toBe(82284); // 89,100 x 0.9235 = 82,283.85
    expect(r.values["line9"]).toBe(176100);
    expect(r.values["line10"]).toBe(10203); // 82,284 x 0.124
    expect(r.values["line11"]).toBe(2386); // 82,284 x 0.029 = 2,386.24
    expect(r.values["line12"]).toBe(12589);
    expect(r.values["line13"]).toBe(6295); // 12,589 / 2 = 6,294.5 -> 6,295
  });
  it("caps social security at the wage base net of W-2 wages (2024)", () => {
    const r = scheduleSE.compute({ line2: 150000, line8a: 100000 }, { year: 2024, rounding: "whole" });
    expect(r.values["line4a"]).toBe(138525);
    expect(r.values["line9"]).toBe(68600);
    expect(r.values["line10"]).toBe(8506); // 68,600 x 0.124 = 8,506.4
    expect(r.values["line11"]).toBe(4017); // 138,525 x 0.029 = 4,017.2
    expect(r.values["line12"]).toBe(12523);
  });
  it("warns when net earnings are under $400", () => {
    const r = scheduleSE.compute({ line2: 300 }, { year: 2025, rounding: "whole" });
    expect(r.warnings.some((w) => w.includes("under $400"))).toBe(true);
  });
});
