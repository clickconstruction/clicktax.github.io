import { describe, expect, it } from "vitest";
import { prepareReturn } from "../src/engine/return.ts";
import { eicTable } from "../src/forms/scheduleEIC.ts";

describe("Schedule E and the earned income credit in a full return", () => {
  it("routes Schedule E to Schedule 1 line 5 and the EIC to Form 1040 line 27", async () => {
    const r = await prepareReturn(
      {
        year: 2025,
        form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "hoh", digital_assets: false, line1a: 22000, line25a: 900, dependents: [{ first_name: "C", last_name: "B", ssn: "222222222", relationship: "daughter", child_tax_credit: true }] },
        scheduleE: { properties: [{ address: "1 Main", type: "1", fair_rental_days: 365, line3: 12000, line12: 4000, line18: 3000, line14: 1000 }] },
        scheduleEIC: { children: [{ name: "C B", ssn: "222222222", year_of_birth: "2018", relationship: "daughter", months_lived: 12 }] },
      },
      { renderBase: "https://clicktax.org" },
    );
    const ids = r.forms.map((x) => x.form);
    expect(ids).toContain("f1040se");
    expect(ids).toContain("f1040sei");
    expect(ids).toContain("f1040s1");
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    const s1 = r.forms.find((x) => x.form === "f1040s1")!;
    const sE = r.forms.find((x) => x.form === "f1040se")!;
    const eic = r.forms.find((x) => x.form === "f1040sei")!;
    expect(sE.values["line26"]).toBe(4000);
    expect(sE.values["line41"]).toBe(4000);
    expect(s1.values["line5"]).toBe(4000);
    expect(f1040.values["line8"]).toBe(4000);
    expect(f1040.values["line11"]).toBe(26000);
    expect(eic.values["earned_income"]).toBe(22000);
    expect(eic.values["agi"]).toBe(26000);
    const expected = Math.min(eicTable(2025, 22000, 1, false), eicTable(2025, 26000, 1, false));
    expect(eic.values["eic_credit"]).toBe(expected);
    expect(f1040.values["line27"]).toBe(expected);
    expect(Number(f1040.values["line32"])).toBeGreaterThanOrEqual(expected);
  });
  it("computes the childless credit without attaching Schedule EIC", async () => {
    const r = await prepareReturn(
      { year: 2024, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 9000 }, scheduleEIC: { no_qualifying_children: true, age_25_to_64: true } },
      { renderBase: "https://clicktax.org" },
    );
    expect(r.forms.map((x) => x.form)).not.toContain("f1040sei");
    expect(r.forms.find((x) => x.form === "f1040")!.values["line27"]).toBe(632);
  });
});
