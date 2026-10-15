import { describe, expect, it } from "vitest";
import { form8829 } from "../src/forms/form8829.ts";
import { prepareReturn } from "../src/engine/return.ts";

describe("Form 8829", () => {
  it("applies the business percentage to indirect costs and limits to profit", () => {
    const r = form8829.compute({ line1: 200, line2: 2000, line8: 5000, line10b: 12000, line11b: 4000, line18b: 1200, line21b: 3600, line37: 300000, line38: 60000, first_business_use_year: 2020 }, { year: 2025, rounding: "whole" });
    expect(r.values["line3"]).toBe(10);
    expect(r.values["line7"]).toBe(10);
    expect(r.values["line12b"]).toBe(16000);
    expect(r.values["line13"]).toBe(1600);
    expect(r.values["line14"]).toBe(1600);
    expect(r.values["line15"]).toBe(3400);
    expect(r.values["line23b"]).toBe(4800);
    expect(r.values["line24"]).toBe(480);
    expect(r.values["line27"]).toBe(480);
    expect(r.values["line40"]).toBe(24000);
    expect(r.values["line41"]).toBe(2.564);
    expect(r.values["line42"]).toBe(615);
    expect(r.values["line33"]).toBe(615);
    expect(r.values["line36"]).toBe(1600 + 480 + 615);
    expect(r.values["line43"]).toBe(0);
  });
  it("uses the first-year mid-month percentage and carries the excess forward when profit is small", () => {
    const r = form8829.compute({ line1: 300, line2: 1500, line8: 500, line18b: 2000, line21b: 1000, line37: 250000, line38: 50000, first_business_use_month: 7, first_business_use_year: 2024 }, { year: 2024, rounding: "whole" });
    expect(r.values["line7"]).toBe(20);
    expect(r.values["line41"]).toBe(1.177);
    expect(r.values["line26"]).toBe(600);
    expect(r.values["line27"]).toBe(500);
    expect(r.values["line43"]).toBe(100);
    expect(r.values["line33"]).toBe(0);
    expect(Number(r.values["line44"])).toBeGreaterThan(0);
    expect(r.values["line36"]).toBe(500);
  });
  it("replaces Schedule C line 30 when preparing a return", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false }, scheduleC: [{ line1: 50000, line22: 5000, line30_business_sqft: 100 }], form8829: { line1: 200, line2: 2000, line21b: 2400, line18b: 1200 } },
      { renderBase: "https://clicktax.org" },
    );
    const sc = r.forms.find((x) => x.form === "f1040sc")!;
    const h = r.forms.find((x) => x.form === "f8829")!;
    expect(h.values["line8"]).toBe(45000);
    expect(h.values["line36"]).toBe(360);
    expect(sc.values["line30"]).toBe(360);
    expect(sc.values["line31"]).toBe(45000 - 360);
    expect(r.warnings.some((w) => w.includes("replaced by Form 8829"))).toBe(true);
  });
});
