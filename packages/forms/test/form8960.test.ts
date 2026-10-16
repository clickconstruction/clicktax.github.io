import { describe, expect, it } from "vitest";
import { form8960 } from "../src/forms/form8960.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";

describe("Form 8960", () => {
  it("taxes the smaller of net investment income or MAGI over the threshold", () => {
    const r = form8960.compute({ filing_status: "single", line1: 10000, line2: 20000, line5a: 30000, line9b: 2000, line13: 260000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line8"]).toBe(60000);
    expect(r.values["line11"]).toBe(2000);
    expect(r.values["line12"]).toBe(58000);
    expect(r.values["line14"]).toBe(200000);
    expect(r.values["line15"]).toBe(60000);
    expect(r.values["line16"]).toBe(58000);
    expect(r.values["line17"]).toBe(2204);
    const mfj = form8960.compute({ filing_status: "mfj", line1: 50000, line13: 240000 }, { year: 2024, rounding: "whole" });
    expect(mfj.values["line17"]).toBe(0);
  });
  it("maps every line in both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f8960", year, { name: "A", ssn: "111223333", filing_status: "single", election_6013g: true, line1: 1, line2: 2, line3: 3, line4a: 4, line4b: -1, line5a: 5, line5b: -1, line5c: 1, line6: 1, line7: 1, line9a: 1, line9b: 1, line9c: 1, line10: 1, line13: 300000, line18a: 1, line18b: 1, line18c: 1, line19a: 1, line19b: 1, line19c: 1, line20: 1, line21: 1 }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBe(36);
    }
  });
  it("adds the tax to Schedule 2 automatically when AGI crosses the threshold", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 230000, line2b: 1000, line3b: 15000 }, scheduleB: { interest: [{ payer: "Bank", amount: 1000 }], dividends: [{ payer: "Fund", amount: 15000 }] } },
      { renderBase: "https://clicktax.org" },
    );
    const f = r.forms.find((x) => x.form === "f8960")!;
    const s2 = r.forms.find((x) => x.form === "f1040s2")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(f.values["line13"]).toBe(246000);
    expect(f.values["line12"]).toBe(16000);
    expect(f.values["line17"]).toBe(608);
    expect(s2.values["line12"]).toBe(608);
    expect(f1040.values["line23"]).toBe(608 + 270); // plus the Additional Medicare Tax on wages over $200,000
    expect(r.totals["net_investment_income_tax"]).toBe(608);
    const low = await prepareReturn({ year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 100000, line2b: 500 } }, { renderBase: "https://clicktax.org" });
    expect(low.forms.map((x) => x.form)).not.toContain("f8960");
  });
});
