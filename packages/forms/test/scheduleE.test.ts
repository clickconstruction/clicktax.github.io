import { describe, expect, it } from "vitest";
import { scheduleE } from "../src/forms/scheduleE.ts";
import { prepareFormValues } from "../src/engine/return.ts";

describe("Schedule E", () => {
  it("totals each property and the pass-through parts", () => {
    const r = scheduleE.compute({ properties: [{ type: "1", line3: 24000, line12: 8000, line18: 6000, line14: 1000 }, { type: "1", line3: 10000, line12: 9000, line18: 4000 }, { type: "6", line4: 500, line16: 700 }], partnerships: [{ name: "P", type: "P", passive_income: 3000, section179: 500 }, { name: "S", type: "S", nonpassive_loss: 1200 }], estates: [{ name: "T", other_income: 800 }], line40: -300 }, { year: 2025, rounding: "whole" });
    const props = r.values["properties"] as Array<Record<string, unknown>>;
    expect(props[0]!["line20"]).toBe(15000);
    expect(props[0]!["line21"]).toBe(9000);
    expect(props[1]!["line21"]).toBe(-3000);
    expect(props[1]!["line22"]).toBe(-3000);
    expect(props[2]!["line21"]).toBe(-200);
    expect(r.values["line23a"]).toBe(34000);
    expect(r.values["line23b"]).toBe(500);
    expect(r.values["line23c"]).toBe(17000);
    expect(r.values["line24"]).toBe(9000);
    expect(r.values["line25"]).toBe(-3200);
    expect(r.values["line26"]).toBe(5800);
    expect(r.values["line30"]).toBe(3000);
    expect(r.values["line31"]).toBe(-1700);
    expect(r.values["line32"]).toBe(1300);
    expect(r.values["line37"]).toBe(800);
    expect(r.values["line41"]).toBe(5800 + 1300 + 800 - 300);
  });
  it("maps every column for both years", () => {
    for (const year of [2024, 2025] as const) {
      const prop = (i: number) => ({ address: `Addr ${i}`, type: String(i), fair_rental_days: 300, personal_use_days: 10, qjv: true, line3: 1000 * i, line4: 10, line5: 1, line6: 2, line7: 3, line8: 4, line9: 5, line10: 6, line11: 7, line12: 8, line13: 9, line14: 10, line15: 11, line16: 12, line17: 13, line18: 14, line19: 15 });
      const p = prepareFormValues("f1040se", year, { name: "A", ssn: "111223333", lineA: true, lineB: true, properties: [prop(1), prop(2), prop(3)], line19_description: "misc", line27: false, partnerships: [1, 2, 3, 4].map((i) => ({ name: `P${i}`, type: "P", foreign: true, ein: "12-3456789", basis_computation: true, not_at_risk: false, passive_loss: 1, passive_income: 2, nonpassive_loss: 3, section179: 4, nonpassive_income: 5 })), estates: [1, 2].map((i) => ({ name: `E${i}`, ein: "98-7654321", passive_loss: 1, passive_income: 2, other_loss: 3, other_income: 4 })), remic_name: "R", remic_ein: "11-1111111", remic_excess_inclusion: 1, remic_taxable_income: 2, remic_income: 3, line40: 5, line42: 6, line43: 7 }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBeGreaterThanOrEqual(160);
    }
  });
});
