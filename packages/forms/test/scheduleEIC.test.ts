import { describe, expect, it } from "vitest";
import { completedPhaseout, eicTable, scheduleEIC } from "../src/forms/scheduleEIC.ts";
import { prepareFormValues } from "../src/engine/return.ts";

describe("Schedule EIC", () => {
  it("reproduces the EIC table shape: ramp, plateau, phaseout", () => {
    expect(eicTable(2025, 5000, 1, false)).toBe(Math.round(0.34 * 5025));
    expect(eicTable(2025, 15000, 1, false)).toBe(4328);
    expect(eicTable(2025, 23000, 1, false)).toBe(4328);
    expect(eicTable(2025, 30000, 1, false)).toBe(Math.round(4328 - 0.1598 * (30025 - 23350)));
    expect(eicTable(2025, 51000, 1, false)).toBe(0);
    expect(completedPhaseout(2025, 1, false)).toBe(50434);
    expect(completedPhaseout(2025, 3, true)).toBe(68675);
    expect(completedPhaseout(2024, 2, false)).toBe(55768);
    expect(completedPhaseout(2024, 0, true)).toBe(25511);
    expect(eicTable(2024, 20000, 2, true)).toBe(6960);
    expect(eicTable(2024, 9000, 0, false)).toBe(632);
  });
  it("computes the credit with the AGI limit and eligibility rules", () => {
    const r = scheduleEIC.compute({ filing_status: "hoh", earned_income: 20000, agi: 26000, children: [{ name: "A", ssn: "111223333", year_of_birth: "2017", relationship: "daughter", months_lived: 12 }] }, { year: 2025, rounding: "whole" });
    expect(r.values["qualifying_children"]).toBe(1);
    expect(r.values["eic_credit"]).toBe(Math.min(4328, Math.round(4328 - 0.1598 * (26025 - 23350))));
    const kids = r.values["children"] as Array<Record<string, unknown>>;
    expect(kids[0]!["yob1"]).toBe("2");
    expect(kids[0]!["yob4"]).toBe("7");
    const none = scheduleEIC.compute({ filing_status: "single", earned_income: 9000, agi: 9000 }, { year: 2025, rounding: "whole" });
    expect(none.values["eic_credit"]).toBe(0);
    const childless = scheduleEIC.compute({ filing_status: "single", earned_income: 9000, agi: 9000, no_qualifying_children: true, age_25_to_64: true }, { year: 2025, rounding: "whole" });
    expect(childless.values["eic_credit"]).toBe(649);
    const rich = scheduleEIC.compute({ filing_status: "single", earned_income: 20000, agi: 20000, investment_income: 12000, children: [{ name: "A", ssn: "111223333", year_of_birth: "2017", months_lived: 12 }] }, { year: 2025, rounding: "whole" });
    expect(rich.values["eic_credit"]).toBe(0);
    const mfs = scheduleEIC.compute({ filing_status: "mfs", earned_income: 20000, agi: 20000, children: [{ name: "A", ssn: "111223333", year_of_birth: "2017", months_lived: 12 }] }, { year: 2024, rounding: "whole" });
    expect(mfs.values["eic_credit"]).toBe(0);
  });
  it("maps three children, the digit boxes, and the yes/no boxes in both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f1040sei", year, { name: "A", ssn: "111223333", filing_status: "mfj", earned_income: 30000, agi: 30000, separated_spouse_mfs: false, children: [1, 2, 3].map((i) => ({ name: `Kid ${i}`, ssn: "111223333", year_of_birth: "2005", under_24_student: i !== 2, permanently_disabled: i === 2, relationship: "son", months_lived: 12 })) }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      const keys = Object.keys(p.pdfFields);
      expect(keys.filter((k) => /Year[12]_ReadOrder|f1_(17|18|19|20)\[0\]$/.test(k)).length).toBe(12);
      expect(keys.filter((k) => /c1_\d\[0\]$/.test(k)).length).toBe(6);
      expect(keys.length).toBeGreaterThanOrEqual(29);
    }
  });
});
