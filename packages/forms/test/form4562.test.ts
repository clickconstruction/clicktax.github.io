import { describe, expect, it } from "vitest";
import { form4562 } from "../src/forms/form4562.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";

describe("Form 4562", () => {
  it("applies the section 179 limits and the business income limitation", () => {
    const r = form4562.compute({ section179_property: [{ description: "Machine", cost: 30000, elected: 30000 }], line11: 20000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line1"]).toBe(2500000);
    expect(r.values["line5"]).toBe(2500000);
    expect(r.values["line8"]).toBe(30000);
    expect(r.values["line9"]).toBe(30000);
    expect(r.values["line12"]).toBe(20000);
    expect(r.values["line13"]).toBe(10000);
    expect(r.values["line22"]).toBe(20000);
  });
  it("figures first-year MACRS for 7-year property and mid-month real property", () => {
    const r = form4562.compute({ macrs_7yr_b: "03/2025", macrs_7yr_c: 10000, nonresidential_real_1_b: "07/2025", nonresidential_real_1_c: 390000, macrs_5yr_b: "11/2025", macrs_5yr_c: 10000, macrs_5yr_e: "MQ" }, { year: 2025, rounding: "whole" });
    expect(r.values["macrs_7yr_g"]).toBe(1429);
    expect(r.values["macrs_7yr_f"]).toBe("200DB");
    expect(r.values["nonresidential_real_1_g"]).toBe(Math.round((390000 * ((12.5 - 7) / 12 / 39))));
    expect(r.values["macrs_5yr_g"]).toBe(500);
    expect(r.values["line22"]).toBe(1429 + 500 + Math.round(390000 * ((12.5 - 7) / 12 / 39)));
  });
  it("handles listed property, vehicle miles, and amortization", () => {
    const r = form4562.compute({ listed_property: [{ type: "Pickup truck", date: "06/01/2025", business_pct: 80, cost: 50000, recovery: 5, section179: 10000 }], vehicles: [{ business_miles: 9000, commuting_miles: 1000, other_miles: 2000, available_off_duty: true }], amortization: [{ description: "Startup costs", amount: 15000, period: "15" }], line43: 500 }, { year: 2025, rounding: "whole" });
    const lp = r.values["listed_property"] as Array<Record<string, unknown>>;
    expect(lp[0]!["basis"]).toBe(40000);
    expect(lp[0]!["depreciation"]).toBe(6000); // (40,000 - 10,000) x 20%
    expect(r.values["line28"]).toBe(6000);
    expect(r.values["line29"]).toBe(10000);
    expect(r.values["line7"]).toBe(10000);
    expect(r.values["line21"]).toBe(6000);
    expect((r.values["vehicles"] as Array<Record<string, unknown>>)[0]!["total_miles"]).toBe(12000);
    expect(r.values["line44"]).toBe(1500);
  });
  it("maps every row for both years and replaces Schedule C line 13 in a return", async () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f4562", year, { name: "A", macrs_7yr_b: "03/2024", macrs_7yr_c: 10000, listed_property: [{ type: "Truck", date: "06/01/2024", business_pct: 100, cost: 30000 }], vehicles: [{ business_miles: 100, available_off_duty: false }], line37: true }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBeGreaterThan(15);
    }
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false }, scheduleC: [{ line1: 80000, line22: 5000 }], form4562: { section179_property: [{ description: "Saw", cost: 4000, elected: 4000 }], macrs_7yr_b: "03/2025", macrs_7yr_c: 7000 } },
      { renderBase: "https://clicktax.org" },
    );
    const sc = r.forms.find((x) => x.form === "f1040sc")!;
    const d = r.forms.find((x) => x.form === "f4562")!;
    expect(d.values["line11"]).toBe(75000);
    expect(d.values["line22"]).toBe(4000 + 1000);
    expect(sc.values["line13"]).toBe(5000);
    expect(sc.values["line31"]).toBe(80000 - 5000 - 5000);
  });
});
