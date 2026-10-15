import { describe, expect, it } from "vitest";
import { form8949 } from "../src/forms/form8949.ts";
import { scheduleD } from "../src/forms/scheduleD.ts";
import { prepareFormValues } from "../src/engine/return.ts";

describe("Form 8949 and Schedule D", () => {
  it("computes each row's gain and the totals", () => {
    const r = form8949.compute({ short_term_box: "A", short_term: [{ proceeds: 1000, cost: 800 }, { proceeds: 500, cost: 700, code: "W", adjustment: 200 }], long_term_box: "D", long_term: [{ proceeds: 9000, cost: 4000 }] }, { year: 2025, rounding: "whole" });
    const st = r.values["short_term"] as Array<Record<string, unknown>>;
    expect(st[0]!["gain"]).toBe(200);
    expect(st[1]!["gain"]).toBe(0);
    expect(r.values["line2_proceeds"]).toBe(1500);
    expect(r.values["line2_cost"]).toBe(1500);
    expect(r.values["line2_adjustment"]).toBe(200);
    expect(r.values["line2_gain"]).toBe(200);
    expect(r.values["line2_long_gain"]).toBe(5000);
  });
  it("maps 14 rows in 2024 and 11 rows in 2025 with the box checkboxes", () => {
    for (const year of [2024, 2025] as const) {
      const n = year === 2024 ? 14 : 11;
      const rows = Array.from({ length: n }, (_, i) => ({ description: `Lot ${i + 1}`, date_acquired: "01/01/2020", date_sold: "06/01/2024", proceeds: 100 + i, cost: 50, code: "W", adjustment: 1 }));
      const p = prepareFormValues("f8949", year, { name: "A", ssn: "111223333", short_term_box: "B", short_term: rows, long_term_box: "E", long_term: rows }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      const keys = Object.keys(p.pdfFields);
      expect(keys.filter((k) => /Row\d+\[0\]/.test(k)).length).toBe(2 * n * 8);
      expect(p.pdfFields[`topmostSubform[0].Page1[0].c1_1[1]`]).toBe(true);
      expect(p.pdfFields[`topmostSubform[0].Page2[0].c2_1[1]`]).toBe(true);
      expect(keys.filter((k) => /f[12]_0?[12]\[0\]$/.test(k)).length).toBe(4); // name and SSN on both pages
    }
    const r25 = prepareFormValues("f8949", 2025, { short_term_box: "G", short_term: [{ proceeds: 1, cost: 1 }] }, "whole");
    expect(r25.pdfFields["topmostSubform[0].Page1[0].c1_1[3]"]).toBe(true);
    const r24 = prepareFormValues("f8949", 2024, { short_term_box: "G", short_term: [{ proceeds: 1, cost: 1 }] }, "whole");
    expect(r24.pdfFields["topmostSubform[0].Page1[0].c1_1[3]"]).toBeUndefined();
    expect(r24.warnings.some((w) => w.includes("only on the 2025 form"))).toBe(true);
  });
  it("nets Schedule D and applies the capital loss limit", () => {
    const gain = scheduleD.compute({ filing_status: "single", line1b_d: 10000, line1b_e: 8000, line1b_g: 0, line8b_d: 20000, line8b_e: 12000, line13: 500, line14: -1000 }, { year: 2025, rounding: "whole" });
    expect(gain.values["line7"]).toBe(2000);
    expect(gain.values["line15"]).toBe(7500);
    expect(gain.values["line16"]).toBe(9500);
    expect(gain.values["line17"]).toBe(true);
    expect(gain.values["line20"]).toBe(true);
    const loss = scheduleD.compute({ filing_status: "mfs", line1a_d: 5000, line1a_e: 9000, line22: false }, { year: 2024, rounding: "whole" });
    expect(loss.values["line16"]).toBe(-4000);
    expect(loss.values["line21"]).toBe(-1500);
    expect(loss.warnings.some((w) => w.includes("carries over"))).toBe(true);
  });
  it("maps every Schedule D line in both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f1040sd", year, { name: "A", ssn: "111223333", filing_status: "single", qof_disposal: false, line1a_d: 1, line1a_e: 1, line1b_d: 2, line1b_e: 1, line1b_g: 1, line2_d: 3, line2_e: 1, line2_g: 1, line3_d: 4, line3_e: 1, line3_g: 1, line4: 5, line5: 6, line6: -7, line8a_d: 8, line8a_e: 1, line8b_d: 9, line8b_e: 1, line8b_g: 1, line9_d: 10, line9_e: 1, line9_g: 1, line10_d: 11, line10_e: 1, line10_g: 1, line11: 12, line12: 13, line13: 14, line14: -15, line18: 0, line19: 0 }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBeGreaterThanOrEqual(44);
    }
  });
});
