import { describe, expect, it } from "vitest";
import { form8582 } from "../src/forms/form8582.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";

const ws1 = [{ name: "A", form_schedule: "Sch E", net_income: 5000 }, { name: "B", form_schedule: "Sch E", net_loss: 20000 }];

describe("Form 8582", () => {
  it("allows the whole loss under the special allowance when MAGI is low", () => {
    const r = form8582.compute({ filing_status: "single", line6: 120000, rental_activities: ws1 }, { year: 2025, rounding: "whole" });
    expect(r.values["line1d"]).toBe(-15000);
    expect(r.values["line3"]).toBe(-15000);
    expect(r.values["line4"]).toBe(15000);
    expect(r.values["line7"]).toBe(30000);
    expect(r.values["line8"]).toBe(15000);
    expect(r.values["line9"]).toBe(15000);
    expect(r.values["line11"]).toBe(20000);
    const allowed = r.values["allowed_losses"] as Array<Record<string, unknown>>;
    expect(allowed.find((x) => x["name"] === "B")!["allowed"]).toBe(20000);
    expect(allowed.find((x) => x["name"] === "B")!["unallowed"]).toBe(0);
  });
  it("phases the allowance out and carries the rest forward", () => {
    const r = form8582.compute({ filing_status: "single", line6: 140000, rental_activities: [...ws1, { name: "C", form_schedule: "Sch E", net_loss: 4000, prior_unallowed: 1000 }] }, { year: 2024, rounding: "whole" });
    expect(r.values["line3"]).toBe(-20000);
    expect(r.values["line8"]).toBe(5000);
    expect(r.values["line9"]).toBe(5000);
    const p6 = r.values["part6"] as Array<Record<string, unknown>>;
    expect(p6.map((x) => x["special_allowance"])).toEqual([4000, 1000]); // 20,000 and 5,000 overall losses, 4:1
    const p7 = r.values["part7"] as Array<Record<string, unknown>>;
    expect(p7.reduce((a, x) => a + Number(x["unallowed"]), 0)).toBe(15000);
    const p8 = r.values["part8"] as Array<Record<string, unknown>>;
    const b = p8.find((x) => x["name"] === "B")!;
    expect(b["loss"]).toBe(20000);
    expect(Number(b["allowed"]) + Number(b["unallowed"])).toBe(20000);
    expect(r.values["part8_allowed"]).toBe(10000); // 5,000 allowance + 5,000 absorbed by A's income
    const none = form8582.compute({ filing_status: "mfs", line6: 50000, rental_activities: ws1 }, { year: 2025, rounding: "whole" });
    expect(none.values["line9"]).toBe(0);
    expect(none.values["part8_allowed"]).toBe(5000);
  });
  it("maps every worksheet row and allocation row in both years", () => {
    for (const year of [2024, 2025] as const) {
      const rows = [1, 2, 3, 4, 5].map((i) => ({ name: `R${i}`, form_schedule: "Sch E", net_income: i === 1 ? 1000 : 0, net_loss: i === 1 ? 0 : 1000 * i, prior_unallowed: 100 }));
      const p = prepareFormValues("f8582", year, { name: "A", ssn: "111223333", filing_status: "single", line6: 140000, rental_activities: rows, other_activities: rows.map((r) => ({ ...r, name: `O${r.name}` })) }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      const keys = Object.keys(p.pdfFields);
      expect(keys.filter((k) => /Row[1-5]\[0\]\.f1_\d+\[0\]$/.test(k)).length).toBeGreaterThanOrEqual(20);
      expect(keys.filter((k) => /Page2\[0\]/.test(k)).length).toBeGreaterThanOrEqual(40);
    }
  });
  it("limits a Schedule E rental loss inside a return", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 140000 }, scheduleE: { properties: [{ address: "1 Main", type: "1", line3: 10000, line12: 30000 }] } },
      { renderBase: "https://clicktax.org" },
    );
    const sE = r.forms.find((x) => x.form === "f1040se")!;
    const f = r.forms.find((x) => x.form === "f8582")!;
    expect(f.values["line6"]).toBe(140000);
    expect(f.values["line9"]).toBe(5000);
    const props = sE.values["properties"] as Array<Record<string, unknown>>;
    expect(props[0]!["line21"]).toBe(-20000);
    expect(props[0]!["line22"]).toBe(-5000);
    expect(sE.values["line26"]).toBe(-5000);
    expect(r.forms.find((x) => x.form === "f1040")!.values["line11"]).toBe(135000);
    expect(r.warnings.some((w) => w.includes("carry forward"))).toBe(false); // form-level warning lives on the form
    expect(f.warnings.some((w) => w.includes("carry forward"))).toBe(true);
  });
});
