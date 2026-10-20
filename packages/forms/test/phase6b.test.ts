import { describe, expect, it } from "vitest";
import { applicableFigure, form8962 } from "../src/forms/form8962.ts";
import { form1116 } from "../src/forms/form1116.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import type { Values } from "../src/types.ts";

const clean = (id: Parameters<typeof prepareFormValues>[0], values: Values, min: number) => {
  for (const year of [2024, 2025] as const) {
    const p = prepareFormValues(id, year, values, "whole");
    expect(p.issues.filter((i) => i.severity === "error"), `${id} ${year}`).toEqual([]);
    expect(p.warnings.filter((w) => w.includes("No PDF field")), `${id} ${year}`).toEqual([]);
    expect(Object.keys(p.pdfFields).length, `${id} ${year}`).toBeGreaterThanOrEqual(min);
  }
};

describe("Form 8962", () => {
  it("reproduces the applicable figure schedule", () => {
    expect(applicableFigure(140)).toBe(0);
    expect(applicableFigure(175)).toBe(0.01);
    expect(applicableFigure(200)).toBe(0.02);
    expect(applicableFigure(250)).toBe(0.04);
    expect(applicableFigure(300)).toBe(0.06);
    expect(applicableFigure(350)).toBe(0.0725);
    expect(applicableFigure(401)).toBe(0.085);
  });
  it("reconciles annual totals with the repayment limitation", () => {
    const r = form8962.compute({ filing_status: "single", line1: 2, line2a: 42000, line11a: 9600, line11b: 10200, line11f: 6000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line4"]).toBe(20440);
    expect(r.values["line5"]).toBe(205);
    expect(r.values["line7"]).toBe("0.0220");
    expect(r.values["line8a"]).toBe(924);
    expect(r.values["line11d"]).toBe(10200 - 924);
    expect(r.values["line24"]).toBe(9276);
    expect(r.values["line26"]).toBe(3276);
    expect(r.values["line29"]).toBe(0);
    const excess = form8962.compute({ filing_status: "mfj", line1: 3, line2a: 90000, line11a: 14000, line11b: 13000, line11f: 9000 }, { year: 2024, rounding: "whole" });
    expect(excess.values["line5"]).toBe(362);
    expect(excess.values["line7"]).toBe("0.0755");
    expect(excess.values["line27"]).toBe(9000 - (13000 - 6795));
    expect(excess.values["line28"]).toBe(3000);
    expect(excess.values["line29"]).toBe(2795);
    const over = form8962.compute({ filing_status: "single", line1: 1, line2a: 100000, line11a: 8000, line11b: 7000, line11f: 2000 }, { year: 2025, rounding: "whole" });
    expect(over.values["line5"]).toBe(401);
    expect(over.values["line29"]).toBe(2000);
  });
  it("handles monthly rows and maps both years", () => {
    const months = Array.from({ length: 12 }, (_, m) => (m < 6 ? { premium: 800, slcsp: 850, aptc: 500 } : {}));
    const r = form8962.compute({ filing_status: "single", line1: 1, line2a: 30000, months }, { year: 2025, rounding: "whole" });
    expect(r.values["line10"]).toBe(false);
    const out = r.values["months"] as Array<Record<string, unknown>>;
    expect(out[0]!["contribution"]).toBe(r.values["line8b"]);
    expect(r.values["line25"]).toBe(3000);
    clean("f8962", { name: "A", ssn: "111223333", filing_status: "single", line1: 1, line2a: 30000, line2b: 0, state_group: "hawaii", line9: true, months, allocations: [{ policy_number: "P1", other_ssn: "222334444", start_month: 1, stop_month: 6, premium_pct: 50, slcsp_pct: 50, aptc_pct: 50 }], line34: true, line35a: 1, line35b: 100, line35c: 1, line35d: 6, line36a: 1, line36b: 100, line36c: 7, line36d: 12 }, 60);
  });
});

describe("Form 1116", () => {
  it("limits the credit to the U.S. tax on foreign income and carries the rest", () => {
    const r = form1116.compute({ filing_status: "single", category: "passive", countries: [{ country: "RIC", line1a: 10000, line3a: 15000, line3d: 10000, line3e: 100000 }], taxes: [{ date: "12/31/2025", us_dividends: 2500 }], line18: 85000, line20: 14000 }, { year: 2025, rounding: "whole" });
    const c0 = (r.values["countries"] as Array<Record<string, unknown>>)[0]!;
    expect(c0["line3f"]).toBe("0.1000");
    expect(c0["line3g"]).toBe(1500);
    expect(r.values["line7"]).toBe(8500);
    expect(r.values["line19"]).toBe("0.1000");
    expect(r.values["line21"]).toBe(1400);
    expect(r.values["line24"]).toBe(1400);
    expect(r.values["line27"]).toBe(1400);
    expect(r.values["line35"]).toBe(1400);
    expect(r.warnings.some((w) => w.includes("carry"))).toBe(true);
    const withOther = form1116.compute({ category: "general", countries: [{ country: "DE", line1a: 50000, line3d: 50000, line3e: 200000 }], taxes: [{ us_other: 9000 }], line18: 150000, line20: 30000, other_category_credits: JSON.stringify({ passive: 400 }) }, { year: 2024, rounding: "whole" });
    expect(withOther.values["line28"]).toBe(9000);
    expect(withOther.values["line27"]).toBe(400);
    expect(withOther.values["line35"]).toBe(9400);
  });
  it("maps both years", () => clean("f1116", { name: "A", ssn: "111223333", category: "general", resident_of: "US", line1a_description: "Wages", countries: [1, 2, 3].map((i) => ({ country: `C${i}`, line1a: 1000 * i, line2: 10, line3a: 100, line3b: 10, line3d: 1000, line3e: 5000, line4a: 5, line4b: 5, line5: 5 })), line1b: true, paid_or_accrued: "accrued", taxes: [1, 2, 3].map((i) => ({ date: "01/01/2025", fc_dividends: i, fc_rents: i, fc_interest: i, fc_other: i, us_dividends: i, us_rents: i, us_interest: i, us_other: i })), line10: 5, schedule_b_attached: true, line12: -1, line13: 1, line16: 1, line18: 50000, line20: 8000, line22: 1, line34: 1 }, 100));
});

describe("return wiring for 8962 and 1116", () => {
  it("routes the net credit, the repayment, and the foreign tax credit", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 42000, line3b: 1000, line3a: 1000 }, form8962: { line11a: 9600, line11b: 10200, line11f: 6000 }, form1116: { category: "passive", countries: [{ country: "RIC", line1a: 1000, line3d: 1000, line3e: 43000 }], taxes: [{ us_dividends: 150 }] } },
      { renderBase: "https://clicktax.org" },
    );
    const ids = r.forms.map((x) => x.form);
    expect(ids).toContain("f8962");
    expect(ids).toContain("f1116");
    expect(ids).toContain("f1040s3");
    const p = r.forms.find((x) => x.form === "f8962")!;
    const s3 = r.forms.find((x) => x.form === "f1040s3")!;
    const t = r.forms.find((x) => x.form === "f1116")!;
    expect(p.values["line2a"]).toBe(43000);
    expect(p.values["line1"]).toBe(1);
    expect(s3.values["line9"]).toBe(p.values["line26"]);
    expect(t.values["line18"]).toBe(43000 - 15750);
    expect(s3.values["line1"]).toBe(t.values["line35"]);
    expect(r.totals["net_premium_tax_credit"]).toBe(p.values["line26"]);
    const repay = await prepareReturn({ year: 2024, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 95000 }, form8962: { line11a: 8000, line11b: 7000, line11f: 5000 } }, { renderBase: "https://clicktax.org" });
    const s2 = repay.forms.find((x) => x.form === "f1040s2")!;
    expect(s2.values["line1a"]).toBe(5000);
    expect(repay.totals["excess_advance_ptc_repayment"]).toBe(5000);
  });
});
