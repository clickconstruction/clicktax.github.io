import { describe, expect, it } from "vitest";
import { form8959 } from "../src/forms/form8959.ts";
import { prepareReturn } from "../src/engine/return.ts";

describe("Form 8959", () => {
  it("taxes wages over the threshold and reconciles withholding (single)", () => {
    const r = form8959.compute({ filing_status: "single", line1: 240000, line19: 3840 }, { year: 2025, rounding: "whole" });
    expect(r.values["line6"]).toBe(40000);
    expect(r.values["line7"]).toBe(360);
    expect(r.values["line18"]).toBe(360);
    expect(r.values["line21"]).toBe(3480);
    expect(r.values["line22"]).toBe(360);
    expect(r.values["line24"]).toBe(360);
  });
  it("applies the leftover threshold to self-employment income (joint)", () => {
    const r = form8959.compute({ filing_status: "mfj", line1: 230000, line8: 60000, line19: 3335 }, { year: 2025, rounding: "whole" });
    expect(r.values["line6"]).toBe(0);
    expect(r.values["line11"]).toBe(20000);
    expect(r.values["line12"]).toBe(40000);
    expect(r.values["line13"]).toBe(360);
    expect(r.values["line18"]).toBe(360);
    expect(r.values["line22"]).toBe(0);
  });
  it("is added automatically when wages plus SE income cross the threshold", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 190000 }, scheduleC: [{ line1: 40000 }] },
      { renderBase: "https://clicktax.org" },
    );
    const f = r.forms.find((x) => x.form === "f8959")!;
    const s2 = r.forms.find((x) => x.form === "f1040s2")!;
    expect(f.values["line8"]).toBe(Math.round(40000 * 0.9235));
    expect(Number(f.values["line18"])).toBeGreaterThan(0);
    expect(s2.values["line11"]).toBe(f.values["line18"]);
    expect(r.warnings.some((w) => w.includes("box 5"))).toBe(true);
    const low = await prepareReturn({ year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 50000 } }, { renderBase: "https://clicktax.org" });
    expect(low.forms.map((x) => x.form)).not.toContain("f8959");
  });
});
