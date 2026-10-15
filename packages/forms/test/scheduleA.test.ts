import { describe, expect, it } from "vitest";
import { scheduleA } from "../src/forms/scheduleA.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";

describe("Schedule A", () => {
  it("applies the 7.5% medical floor and the 2024 $10,000 SALT cap", () => {
    const r = scheduleA.compute({ filing_status: "single", line1: 10000, line2: 100000, line5a: 8000, line5b: 7000, line8a: 9000, line11: 1000 }, { year: 2024, rounding: "whole" });
    expect(r.values["line3"]).toBe(7500);
    expect(r.values["line4"]).toBe(2500);
    expect(r.values["line5d"]).toBe(15000);
    expect(r.values["line5e"]).toBe(10000);
    expect(r.values["line17"]).toBe(2500 + 10000 + 9000 + 1000);
  });
  it("applies the 2025 $40,000 cap with the 30% phase-down to the $10,000 floor", () => {
    const low = scheduleA.compute({ filing_status: "mfj", line2: 300000, line5a: 30000, line5b: 15000 }, { year: 2025, rounding: "whole" });
    expect(low.values["line5e"]).toBe(40000);
    const mid = scheduleA.compute({ filing_status: "mfj", line2: 550000, line5a: 30000, line5b: 15000 }, { year: 2025, rounding: "whole" });
    expect(mid.values["line5e"]).toBe(40000 - 15000); // 30% of 50,000 over the threshold
    const high = scheduleA.compute({ filing_status: "single", line2: 700000, line5a: 50000 }, { year: 2025, rounding: "whole" });
    expect(high.values["line5e"]).toBe(10000);
    const mfs = scheduleA.compute({ filing_status: "mfs", line2: 100000, line5a: 50000 }, { year: 2025, rounding: "whole" });
    expect(mfs.values["line5e"]).toBe(20000);
  });
  it("maps every line in both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f1040sa", year, { name: "A", ssn: "111223333", filing_status: "single", line1: 100, line2: 1000, line5a: 1, line5b: 2, line5c: 3, line6_description: "x", line6: 4, line8a: 5, line8b_payee: "p", line8b: 6, line8c: 7, line9: 8, line11: 9, line12: 10, line13: 11, line15: 12, line16_description: "y", line16: 13, line18: true, line5a_general_sales_tax: true, line8_not_all_qualified: true }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBeGreaterThanOrEqual(30);
    }
  });
  it("itemizes on Form 1040 line 12 only when it beats the standard deduction", async () => {
    const base = { year: 2025 as const, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 120000 } };
    const big = await prepareReturn({ ...base, scheduleA: { line5a: 9000, line5b: 6000, line8a: 14000, line11: 3000 } }, { renderBase: "https://clicktax.org" });
    const f1040 = big.forms.find((x) => x.form === "f1040")!;
    expect(f1040.values["line12"]).toBe(15000 + 14000 + 3000);
    expect(big.forms.map((x) => x.form)).toContain("f1040sa");
    const small = await prepareReturn({ ...base, scheduleA: { line5a: 2000, line11: 500 } }, { renderBase: "https://clicktax.org" });
    expect(small.forms.map((x) => x.form)).not.toContain("f1040sa");
    expect(small.forms.find((x) => x.form === "f1040")!.values["line12"]).toBe(15750);
    expect(small.warnings.some((w) => w.includes("standard deduction is used"))).toBe(true);
  });
});
