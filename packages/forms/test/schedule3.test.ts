import { describe, expect, it } from "vitest";
import { schedule3 } from "../src/forms/schedule3.ts";
import { prepareReturn } from "../src/engine/return.ts";

describe("Schedule 3", () => {
  it("totals nonrefundable credits and other payments", () => {
    const r = schedule3.compute({ line1: 120, line2: 600, line3: 1500, line4: 200, line5b: 300, line6f: 7500, line6z: 50, line10: 1000, line11: 300, line13z: 25 }, { year: 2025, rounding: "whole" });
    expect(r.values["line7"]).toBe(7550);
    expect(r.values["line8"]).toBe(120 + 600 + 1500 + 200 + 300 + 7550);
    expect(r.values["line14"]).toBe(25);
    expect(r.values["line15"]).toBe(1325);
  });
  it("feeds 1040 lines 20 and 31 and reduces the child credit limit", async () => {
    const base = {
      year: 2025 as const,
      form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 60000, dependents: [{ name: "Kid", ssn: "111223333", relationship: "Son", child_tax_credit: true }] },
    };
    const without = await prepareReturn(base, { renderBase: "https://clicktax.org" });
    const withS3 = await prepareReturn({ ...base, schedule3: { line3: 2000, line10: 500 } }, { renderBase: "https://clicktax.org" });
    const f = withS3.forms.find((x) => x.form === "f1040")!;
    const s3 = withS3.forms.find((x) => x.form === "f1040s3")!;
    const s8 = withS3.forms.find((x) => x.form === "f1040s8")!;
    expect(s3.values["line8"]).toBe(2000);
    expect(f.values["line20"]).toBe(2000);
    expect(f.values["line31"]).toBe(500);
    const s8Without = without.forms.find((x) => x.form === "f1040s8")!;
    expect(Number(s8.values["line13"])).toBe(Number(s8Without.values["line13"]) - 2000);
    expect(withS3.forms.map((x) => x.form)).toContain("f1040s3");
  });
});
