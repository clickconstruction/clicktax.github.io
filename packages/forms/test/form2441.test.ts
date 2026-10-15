import { describe, expect, it } from "vitest";
import { form2441 } from "../src/forms/form2441.ts";
import { prepareFormValues } from "../src/engine/return.ts";

describe("Form 2441", () => {
  it("limits expenses, picks the AGI decimal, and caps at the tax limit", () => {
    const r = form2441.compute({ filing_status: "single", persons: [{ first_name: "A", last_name: "B", ssn: "111223333", expenses: 5000 }], line4: 40000, line7: 30000, line10: 2000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line3"]).toBe(3000);
    expect(r.values["line5"]).toBe(40000);
    expect(r.values["line6"]).toBe(3000);
    expect(r.values["line8"]).toBe("27"); // 30,000 AGI
    expect(r.values["line9a"]).toBe(810);
    expect(r.values["line11"]).toBe(810);
    const two = form2441.compute({ filing_status: "mfj", persons: [{ expenses: 4000 }, { expenses: 4000 }], line4: 50000, line5: 20000, line7: 100000, line10: 9000 }, { year: 2024, rounding: "whole" });
    expect(two.values["line3"]).toBe(6000);
    expect(two.values["line8"]).toBe("20");
    expect(two.values["line11"]).toBe(1200);
  });
  it("handles dependent care benefits in Part III", () => {
    const r = form2441.compute({ filing_status: "mfj", persons: [{ expenses: 8000 }], line4: 60000, line5: 45000, line7: 105000, line10: 8000, line12: 5000, line16: 8000, line22_sole_proprietorship: false }, { year: 2025, rounding: "whole" });
    expect(r.values["line15"]).toBe(5000);
    expect(r.values["line20"]).toBe(5000);
    expect(r.values["line25"]).toBe(5000);
    expect(r.values["line26"]).toBe(0);
    expect(r.values["line29"]).toBe(0); // 3,000 limit fully used by excluded benefits
    expect(r.values["line3"]).toBe(0);
    expect(r.values["line11"]).toBe(0);
    const taxable = form2441.compute({ filing_status: "single", persons: [{ expenses: 2000 }], line4: 60000, line7: 60000, line10: 5000, line12: 6000, line16: 2000, line22_sole_proprietorship: false }, { year: 2025, rounding: "whole" });
    expect(taxable.values["line25"]).toBe(2000);
    expect(taxable.values["line26"]).toBe(4000);
    expect(taxable.values["line31"]).toBe(1000);
  });
  it("maps all rows and lines in both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f2441", year, { name: "A", ssn: "111223333", filing_status: "single", mfs_exception: false, providers: [1, 2, 3].map((i) => ({ name: `P${i}`, address: "addr", id_number: "12-3456789", household_employee: i === 1, amount_paid: 100 * i })), persons: [1, 2, 3].map((i) => ({ first_name: `F${i}`, last_name: "L", ssn: "111223333", over_12_disabled: i === 2, expenses: 1000 })), line4: 30000, line7: 30000, line9b: 10, line10: 900, line12: 1000, line13: 0, line14: 0, line16: 1000, line22_sole_proprietorship: true, line22: 500 }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBeGreaterThanOrEqual(55);
    }
  });
});
