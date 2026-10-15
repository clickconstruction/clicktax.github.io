import { describe, expect, it } from "vitest";
import { incomeTax, qdcgWorksheet } from "../src/tax.ts";
import { form1040 } from "../src/forms/form1040.ts";

describe("Qualified Dividends and Capital Gain Tax Worksheet", () => {
  it("taxes gains within the 0% bracket at zero (2024 mfj)", () => {
    // taxable income 80,000 incl. 10,000 qualified dividends: ordinary on 70,000, 0% on 10,000 (all under 94,050)
    const w = qdcgWorksheet({ taxableIncome: 80000, qualifiedDividends: 10000, capitalGain: 0, status: "mfj", year: 2024 });
    expect(w.lines[9]).toBe(10000);
    expect(w.lines[17]).toBe(0);
    expect(w.tax).toBe(incomeTax(70000, "mfj", 2024));
    expect(w.tax).toBeLessThan(incomeTax(80000, "mfj", 2024));
  });
  it("splits across 0% and 15% (2025 single)", () => {
    // TI 60,000 with 20,000 gain: ordinary 40,000; 0% on 48,350-40,000 = 8,350; 15% on 11,650 = 1,747.50
    const w = qdcgWorksheet({ taxableIncome: 60000, qualifiedDividends: 0, capitalGain: 20000, status: "single", year: 2025 });
    expect(w.lines[9]).toBe(8350);
    expect(w.lines[17]).toBe(11650);
    expect(w.lines[20]).toBe(0);
    expect(w.tax).toBe(Math.floor(1747.5 + incomeTax(40000, "single", 2025) + 0.5));
  });
  it("applies 20% above the 15% breakpoint and never exceeds ordinary tax", () => {
    const w = qdcgWorksheet({ taxableIncome: 700000, qualifiedDividends: 0, capitalGain: 200000, status: "single", year: 2025 });
    expect(w.lines[20]).toBeGreaterThan(0);
    expect(w.tax).toBeLessThanOrEqual(incomeTax(700000, "single", 2025));
    const none = qdcgWorksheet({ taxableIncome: 50000, qualifiedDividends: 0, capitalGain: 0, status: "single", year: 2025 });
    expect(none.tax).toBe(incomeTax(50000, "single", 2025));
  });
  it("is used by Form 1040 line 16 when line 3a is present", () => {
    const r = form1040.compute({ filing_status: "mfj", line1a: 70000, line3a: 10000, line3b: 10000, digital_assets: false }, { year: 2024, rounding: "whole" });
    expect(r.values["line15"]).toBe(80000 - 29200);
    expect(r.values["line16"]).toBe(incomeTax(80000 - 29200 - 10000, "mfj", 2024));
    expect(r.warnings.some((w) => w.includes("Qualified"))).toBe(false);
  });
});
