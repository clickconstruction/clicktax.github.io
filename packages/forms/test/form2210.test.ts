import { describe, expect, it } from "vitest";
import { form2210, penaltyBetween } from "../src/forms/form2210.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";

describe("Form 2210", () => {
  it("applies the safe harbors", () => {
    const none = form2210.compute({ filing_status: "single", line1: 10000, line6: 9500 }, { year: 2025, rounding: "whole" });
    expect(none.values["owe_penalty"]).toBe(false);
    expect(none.values["line19"]).toBe(0);
    const prior = form2210.compute({ filing_status: "single", line1: 30000, line6: 5000, prior_year_tax: 20000, prior_year_agi: 90000, estimated_payments: [{ date: "04/15/2025", amount: 5000 }, { date: "06/15/2025", amount: 5000 }, { date: "09/15/2025", amount: 5000 }] }, { year: 2025, rounding: "whole" });
    expect(prior.values["line8"]).toBe(20000);
    expect(prior.values["line9"]).toBe(20000);
    expect(prior.values["owe_penalty"]).toBe(true);
    expect(prior.values["line10_a"]).toBe(5000);
    expect(prior.values["line11_a"]).toBe(6250);
    expect(prior.values["line18_a"]).toBe(1250);
    expect(prior.values["line18_c"]).toBe(3750); // overpayments carry forward
    expect(prior.values["line17_d"]).toBe(0);
    expect(prior.values["line19"]).toBe(0);
    const high = form2210.compute({ filing_status: "mfj", line1: 50000, line6: 0, prior_year_tax: 40000, prior_year_agi: 200000 }, { year: 2024, rounding: "whole" });
    expect(high.values["line8"]).toBe(44000);
  });
  it("charges interest at the quarterly rates by days", () => {
    const p = penaltyBetween(10000, new Date(Date.UTC(2024, 3, 15)), new Date(Date.UTC(2025, 3, 15)));
    expect(Math.round(p)).toBe(Math.round((10000 * 0.08 * 261) / 365 + (10000 * 0.07 * 104) / 365));
    const r = form2210.compute({ filing_status: "single", line1: 20000, line6: 0, prior_year_tax: 40000 }, { year: 2025, rounding: "whole" });
    // 90% of 20,000 = 18,000, four installments of 4,500 each unpaid until April 15, 2026 at 7%.
    const expected = [[4, 15, 2025], [6, 15, 2025], [9, 15, 2025], [1, 15, 2026]].map(([m, d, y]) => penaltyBetween(4500, new Date(Date.UTC(y!, m! - 1, d!)), new Date(Date.UTC(2026, 3, 15)))).reduce((a, b) => a + b, 0);
    expect(r.values["line19"]).toBe(Math.round(expected));
  });
  it("uses Schedule AI when the income was uneven", () => {
    const r = form2210.compute({ filing_status: "single", line1: 22000, line6: 0, prior_year_tax: 50000, box_c_annualized: true, ai_periods: [{ line1: 5000 }, { line1: 10000 }, { line1: 20000 }, { line1: 120000 }] }, { year: 2025, rounding: "whole" });
    const ai = r.values["ai_periods"] as Array<Record<string, unknown>>;
    expect(ai[0]!["line3"]).toBe(20000);
    expect(ai[0]!["line7"]).toBe(15750);
    expect(ai[0]!["line13"]).toBe(4250);
    expect(ai[3]!["line3"]).toBe(120000);
    expect(r.values["line10_a"]).toBe(ai[0]!["line27"]);
    expect(Number(r.values["line10_a"])).toBeLessThan(Number(r.values["line10_d"]));
    expect(Number(r.values["line19"])).toBeGreaterThan(0);
  });
  it("maps every widget in both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f2210", year, { name: "A", ssn: "111223333", filing_status: "single", line1: 40000, line2: 2000, line3: -500, line6: 1000, prior_year_tax: 30000, prior_year_agi: 100000, box_a_waiver: true, box_b_partial_waiver: true, box_c_annualized: true, box_d_withholding_dates: true, box_e_joint_change: true, withholding_by_period: "250,250,250,250", estimated_payments: [{ date: `04/15/${year}`, amount: 2000 }, { date: `09/15/${year}`, amount: 9000 }], ai_periods: [1, 2, 3, 4].map((i) => ({ line1: 10000 * i, line4: 1000 * i, line9: 100, line12: 0, line16: 50, line18: 20, line28: 5000 * i, line30: 100 })) }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBeGreaterThanOrEqual(120);
    }
  });
  it("attaches to a return that owes $1,000 or more and fills Form 1040 line 38", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 150000, line25a: 10000 }, form2210: { prior_year_tax: 20000, prior_year_agi: 120000 } }, { renderBase: "https://clicktax.org" });
    const f = r.forms.find((x) => x.form === "f2210")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(f.values["line1"]).toBe(f1040.values["line22"]);
    expect(f.values["line6"]).toBe(10000);
    expect(Number(f.values["line19"])).toBeGreaterThan(0);
    expect(f1040.values["line38"]).toBe(f.values["line19"]);
    expect(r.totals["estimated_tax_penalty"]).toBe(f.values["line19"]);
    const small = await prepareReturn({ year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 50000, line25a: 4000 } }, { renderBase: "https://clicktax.org" });
    expect(small.forms.map((x) => x.form)).not.toContain("f2210");
  });
});
