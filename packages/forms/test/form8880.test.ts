import { describe, expect, it } from "vitest";
import { form8880 } from "../src/forms/form8880.ts";
import { prepareFormValues } from "../src/engine/return.ts";

describe("Form 8880", () => {
  it("picks the rate from the AGI table and caps contributions at $2,000 per person", () => {
    const r = form8880.compute({ filing_status: "mfj", line1a: 5000, line2b: 1200, line4a: 500, line8: 45000, ws_line1: 3000, ws_line2: 200 }, { year: 2025, rounding: "whole" });
    expect(r.values["line5a"]).toBe(4500);
    expect(r.values["line6a"]).toBe(2000);
    expect(r.values["line6b"]).toBe(1200);
    expect(r.values["line7"]).toBe(3200);
    expect(r.values["line9"]).toBe("5");
    expect(r.values["line10"]).toBe(1600);
    expect(r.values["ws_line3"]).toBe(2800);
    expect(r.values["line12"]).toBe(1600);
    const limited = form8880.compute({ filing_status: "single", line1a: 2000, line8: 25000, line11: 150 }, { year: 2025, rounding: "whole" });
    expect(limited.values["line9"]).toBe("2");
    expect(limited.values["line12"]).toBe(150);
    const none = form8880.compute({ filing_status: "single", line1a: 2000, line8: 40000, line11: 5000 }, { year: 2025, rounding: "whole" });
    expect(none.values["line9"]).toBe("0");
    expect(none.values["line12"]).toBe(0);
    const student = form8880.compute({ filing_status: "single", line1a: 2000, line8: 20000, line11: 5000, full_time_student: true }, { year: 2024, rounding: "whole" });
    expect(student.values["line12"]).toBe(0);
    expect(student.warnings.some((w) => w.includes("not allowed"))).toBe(true);
  });
  it("maps every line in both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f8880", year, { name: "A", ssn: "111223333", filing_status: "single", line1a: 1000, line2a: 500, line4a: 100, line8: 20000, ws_line1: 900, ws_line2: 0 }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBeGreaterThanOrEqual(16);
    }
  });
});
