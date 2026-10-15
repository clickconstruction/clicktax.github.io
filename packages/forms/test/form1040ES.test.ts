import { describe, expect, it } from "vitest";
import { form1040ES } from "../src/forms/form1040ES.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { incomeTax } from "../src/tax.ts";

describe("Form 1040-ES", () => {
  it("figures the required payment and splits it over four vouchers", () => {
    const r = form1040ES.compute({ filing_status: "single", line1: 90000, line2a: 15750, line9: 8000, prior_year_tax: 20000, prior_year_agi: 90000, line13: 3000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line3"]).toBe(74250);
    expect(r.values["line4"]).toBe(incomeTax(74250, "single", 2025));
    expect(r.values["line11c"]).toBe(Number(r.values["line4"]) + 8000);
    expect(r.values["line12b"]).toBe(20000);
    expect(r.values["line12c"]).toBe(Math.min(Number(r.values["line12a"]), 20000));
    expect(r.values["line15"]).toBe(Math.ceil((Number(r.values["line12c"]) - 3000) / 4));
    expect((r.values["vouchers"] as Array<{ amount: number }>).map((v) => v.amount)).toEqual(Array(4).fill(r.values["line15"]));
  });
  it("uses 110% of prior tax for high earners and stops when withholding covers it", () => {
    const high = form1040ES.compute({ filing_status: "mfj", line1: 300000, line2a: 31500, prior_year_tax: 50000, prior_year_agi: 300000, line13: 10000 }, { year: 2025, rounding: "whole" });
    expect(high.values["line12b"]).toBe(55000);
    const covered = form1040ES.compute({ filing_status: "single", line1: 60000, line2a: 15750, prior_year_tax: 5000, prior_year_agi: 60000, line13: 9000 }, { year: 2025, rounding: "whole" });
    expect(covered.values["line14a"]).toBe(0);
    expect(covered.values["line14a_zero"]).toBe(true);
    expect(covered.values["line15"]).toBe(0);
    expect(covered.warnings.some((w) => w.includes("No estimated payments"))).toBe(true);
  });
  it("writes the person's details and the amount on all four vouchers, both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f1040es", year, { first_name: "Jane", last_name: "Sample", ssn: "123456789", address: "1 Main", city: "Austin", state: "TX", zip: "78701", filing_status: "single", line1: 90000, line2a: 15000, line9: 8000, prior_year_tax: 20000, prior_year_agi: 90000, line13: 3000 }, "whole");
      const vals = Object.values(p.pdfFields);
      expect(vals.filter((v) => v === "Jane").length).toBe(4);
      expect(vals.filter((v) => v === "123-45-6789").length).toBe(4);
      const amount = String(p.values["line15"]);
      expect(vals.filter((v) => v === Number(amount).toLocaleString("en-US")).length).toBeGreaterThanOrEqual(4);
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
    }
  });
  it("is filled from the return when requested", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 20000, line25a: 1000 }, scheduleC: [{ line1: 90000 }], form1040es: {} },
      { renderBase: "https://clicktax.org" },
    );
    const es = r.forms.find((x) => x.form === "f1040es")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(es.values["prior_year_tax"]).toBe(f1040.values["line24"]);
    expect(es.values["line13"]).toBe(1000);
    expect(Number(es.values["line15"])).toBeGreaterThan(0);
  });
});
