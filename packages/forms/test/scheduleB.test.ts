import { describe, expect, it } from "vitest";
import { scheduleB } from "../src/forms/scheduleB.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";

describe("Schedule B", () => {
  it("totals interest and dividends and nets the Form 8815 exclusion", () => {
    const r = scheduleB.compute({ interest: [{ payer: "Bank", amount: 1200 }, { payer: "Bonds", amount: 800 }], line3: 300, dividends: [{ payer: "Fund", amount: 2500 }] }, { year: 2025, rounding: "whole" });
    expect(r.values["line2"]).toBe(2000);
    expect(r.values["line4"]).toBe(1700);
    expect(r.values["line6"]).toBe(2500);
  });
  it("maps all 14 interest rows and 15 dividend rows in both years", () => {
    for (const year of [2024, 2025] as const) {
      const interest = Array.from({ length: 14 }, (_, i) => ({ payer: `Payer ${i + 1}`, amount: 10 * (i + 1) }));
      const dividends = Array.from({ length: 15 }, (_, i) => ({ payer: `Fund ${i + 1}`, amount: 5 * (i + 1) }));
      const p = prepareFormValues("f1040sb", year, { name: "A", ssn: "111223333", interest, dividends, line7a_foreign_account: true, line7a_fincen_required: false, line8_foreign_trust: false }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      const keys = Object.keys(p.pdfFields);
      expect(keys.filter((k) => /f1_(0[3-9]|[12]\d|30)\[0\]$/.test(k)).length).toBe(28);
      expect(keys.filter((k) => /f1_(3[4-9]|[45]\d|6[0-3])\[0\]$/.test(k)).length).toBe(30);
      expect(p.pdfFields[year === 2025 ? "topmostSubform[0].Page1[0].TagcorrectingSubform[0].c1_1[0]" : "topmostSubform[0].Page1[0].c1_1[0]"]).toBe(true);
    }
  });
  it("feeds Form 1040 lines 2b and 3b in a return and warns when it is missing", async () => {
    const base = { year: 2025 as const, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 40000 } };
    const r = await prepareReturn({ ...base, scheduleB: { interest: [{ payer: "Bank", amount: 2000 }], dividends: [{ payer: "Fund", amount: 3000 }] } }, { renderBase: "https://clicktax.org" });
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(f1040.values["line2b"]).toBe(2000);
    expect(f1040.values["line3b"]).toBe(3000);
    expect(f1040.values["line9"]).toBe(45000);
    expect(r.forms.map((x) => x.form)).toContain("f1040sb");
    const r2 = await prepareReturn({ ...base, form1040: { ...base.form1040, line2b: 2000 } }, { renderBase: "https://clicktax.org" });
    expect(r2.warnings.some((w) => w.includes("Schedule B is required"))).toBe(true);
  });
});
