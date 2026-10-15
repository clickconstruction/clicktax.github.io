import { describe, expect, it } from "vitest";
import { scheduleC } from "../src/forms/scheduleC.ts";
import { prepareFormValues } from "../src/engine/return.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };

describe("Schedule C compute", () => {
  it("computes gross profit, totals, and net profit", () => {
    const r = scheduleC.compute(
      { line1: 120000, line2: 2000, line6: 500, line8: 1200, line9: 4300, line11: 15000, line22: 8000, line24b: 900, accounting_method: "cash", material_participation: true, line44a_business_miles: 12000 },
      ctx,
    );
    expect(r.values["line3"]).toBe(118000);
    expect(r.values["line5"]).toBe(118000);
    expect(r.values["line7"]).toBe(118500);
    expect(r.values["line28"]).toBe(29400);
    expect(r.values["line29"]).toBe(89100);
    expect(r.values["line31"]).toBe(89100);
    expect(r.warnings.some((w) => w.includes("1099"))).toBe(true);
  });
  it("uses Part III for cost of goods sold and Part V for other expenses", () => {
    const r = scheduleC.compute(
      { line1: 50000, line35: 1000, line36: 20000, line41: 3000, other_expenses: [{ description: "Software", amount: 1200 }, { description: "Bank fees", amount: "$300.49" }] },
      ctx,
    );
    expect(r.values["line40"]).toBe(21000);
    expect(r.values["line42"]).toBe(18000);
    expect(r.values["line4"]).toBe(18000);
    expect(r.values["line48"]).toBe(1500);
    expect(r.values["line27b"]).toBe(1500);
    expect(r.values["line31"]).toBe(50000 - 18000 - 1500);
  });
  it("flags a loss without the at-risk box and applies the simplified home office", () => {
    const r = scheduleC.compute({ line1: 1000, line8: 5000 }, ctx);
    expect(r.values["line31"]).toBe(-4000);
    expect(r.warnings.some((w) => w.includes("investment_at_risk"))).toBe(true);
    const h = scheduleC.compute({ line1: 10000, line30_business_sqft: 400 }, ctx);
    expect(h.values["line30"]).toBe(1500);
    expect(h.warnings.some((w) => w.includes("300 square feet"))).toBe(true);
  });
});

describe("Schedule C fill", () => {
  it("maps semantic values to real PDF widgets for both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f1040sc", year, { name: "ROBERT DOUGLAS", ssn: "123456789", line1: 1000, accounting_method: "cash", material_participation: false, line43_vehicle_date: "03/15/2023", other_expenses: [{ description: "Software", amount: 50 }] }, "whole");
      const keys = Object.keys(p.pdfFields);
      expect(keys.some((k) => k.endsWith("f1_1[0]"))).toBe(true);
      expect(p.pdfFields[keys.find((k) => k.endsWith("f1_2[0]"))!]).toBe("123-45-6789");
      expect(p.pdfFields[keys.find((k) => k.endsWith("c1_1[0]"))!]).toBe(true);
      expect(p.pdfFields[keys.find((k) => k.endsWith("c1_2[1]"))!]).toBe(true); // No box
      expect(p.pdfFields[keys.find((k) => k.endsWith("f2_9[0]"))!]).toBe("03");
      expect(p.pdfFields[keys.find((k) => k.endsWith("f2_11[0]"))!]).toBe("2023");
      expect(p.pdfFields[keys.find((k) => k.endsWith("Item1[0].f2_15[0]"))!]).toBe("Software");
      expect(p.pdfFields[keys.find((k) => k.endsWith("f1_46[0]"))!]).toBe("950");
      expect(p.summary.find((s) => s.label.includes("Social security"))?.value).toBe("***-**-6789");
    }
  });
});
