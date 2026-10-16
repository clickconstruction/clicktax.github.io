import { describe, expect, it } from "vitest";
import { prepareForm, prepareFormValues, prepareReturn } from "../src/engine/return.ts";

const assets = [
  { description: "Truck", date_placed: "06/15/2025", cost: 50000, life: 5, listed: true, section179: 10000, business_pct: 100 },
  { description: "Lathe", date_placed: "03/01/2023", cost: 20000, life: 7 },
  { description: "Shop", date_placed: "07/01/2025", cost: 390000, life: 39 },
  { description: "Saw", date_placed: "02/01/2025", cost: 6000, life: 7, bonus_full: true },
];

describe("Form 4562 asset schedule", () => {
  it("routes each asset's depreciation to the right lines and builds the report", () => {
    const p = prepareFormValues("f4562", 2025, { name: "A", line11: 500000, assets }, "whole");
    const v = p.values;
    expect(Math.abs(Number(v["line17"]) - 3498)).toBeLessThanOrEqual(2); // lathe year 3
    expect(v["nonresidential_real_1_c"]).toBe(390000);
    expect(v["nonresidential_real_1_g"]).toBe(Math.round(390000 * ((12 - 7 + 0.5) / 12) / 39));
    expect(v["line14"]).toBe(6000); // saw: 100% special allowance after January 19, 2025
    expect(v["macrs_7yr_c"]).toBe(0);
    const listed = v["listed_property"] as Array<Record<string, unknown>>;
    expect(listed[0]!["type"]).toBe("Truck");
    expect(listed[0]!["depreciation"]).toBe(8000); // (50,000 - 10,000) x 20%
    expect(listed[0]!["section179"]).toBe(10000);
    expect(v["line29"]).toBe(10000);
    expect(v["line7"]).toBe(10000);
    expect(v["line12"]).toBe(10000);
    expect(v["line21"]).toBe(8000);
    expect(Number(v["line22"])).toBe(Number(v["line12"]) + 6000 + Number(v["line17"]) + Number(v["nonresidential_real_1_g"]) + 8000);
    const report = v["depreciation_report"] as Array<Record<string, unknown>>;
    expect(report.length).toBe(4);
    expect(report[1]!["recovery_year"]).toBe(3);
    expect(report[2]!["method"]).toBe("SL/MM");
    expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
  });
  it("applies the mid-quarter convention automatically", () => {
    const p = prepareFormValues("f4562", 2025, { name: "A", assets: [{ description: "A", date_placed: "11/20/2025", cost: 70000, life: 5 }, { description: "B", date_placed: "02/01/2025", cost: 30000, life: 5 }] }, "whole");
    expect(p.warnings.some((w) => w.includes("mid-quarter"))).toBe(true);
    expect(p.values["macrs_5yr_e"]).toBe("MQ");
    expect(p.values["macrs_5yr_g"]).toBe(Math.round(70000 * 0.05 + 30000 * 0.35));
  });
  it("attaches a depreciation report statement to single forms and returns", async () => {
    const single = await prepareForm("f4562", 2025, { name: "A", assets }, { renderBase: "https://clicktax.org" });
    expect(single.statements.length).toBe(1);
    expect(single.statements[0]!.rows!.length).toBe(5); // 4 assets + totals
    const r = await prepareReturn({ year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false }, scheduleC: [{ principal_business: "Plumbing", line1: 200000 }, { principal_business: "Ranch", line1: 50000 }], form4562: [{ business: 1, assets }, { business: 2, assets: [{ description: "Tractor", date_placed: "04/01/2024", cost: 80000, life: 7 }] }] }, { renderBase: "https://clicktax.org" });
    const dep = r.statements.filter((s) => s.id.startsWith("depreciation"));
    expect(dep.length).toBe(2);
    expect(dep[1]!.rows![0]![0]).toBe("Tractor");
    const sc = r.forms.filter((x) => x.form === "f1040sc");
    expect(Math.abs(Number(sc[1]!.values["line13"]) - Math.round(80000 * 0.2449))).toBeLessThanOrEqual(2);
  });
});
