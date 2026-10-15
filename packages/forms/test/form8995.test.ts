import { describe, expect, it } from "vitest";
import { form8995 } from "../src/forms/form8995.ts";
import { prepareReturn } from "../src/engine/return.ts";
import { sampleReturn } from "../src/samples.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };

describe("Form 8995", () => {
  it("takes 20% of QBI when taxable income is ample", () => {
    const r = form8995.compute({ filing_status: "single", businesses: [{ name: "A", qbi: 60000 }], line11: 80000, line12: 0 }, ctx);
    expect(r.values["line2"]).toBe(60000);
    expect(r.values["line5"]).toBe(12000);
    expect(r.values["line14"]).toBe(16000);
    expect(r.values["line15"]).toBe(12000);
    expect(r.values["line16"]).toBe(0);
  });
  it("is limited by 20% of taxable income net of capital gains", () => {
    const r = form8995.compute({ filing_status: "single", businesses: [{ qbi: 60000 }], line11: 40000, line12: 5000 }, ctx);
    expect(r.values["line13"]).toBe(35000);
    expect(r.values["line14"]).toBe(7000);
    expect(r.values["line15"]).toBe(7000);
  });
  it("applies loss carryforwards and reports the new carryforward", () => {
    const r = form8995.compute({ filing_status: "single", businesses: [{ qbi: 60000 }], line3: 70000, line11: 80000 }, ctx);
    expect(r.values["line4"]).toBe(0);
    expect(r.values["line15"]).toBe(0);
    expect(r.values["line16"]).toBe(-10000);
  });
  it("warns above the simplified-form threshold", () => {
    const r = form8995.compute({ filing_status: "mfj", businesses: [{ qbi: 100000 }], line11: 400000 }, ctx);
    expect(r.warnings.some((w) => w.includes("8995-A"))).toBe(true);
  });
  it("is assembled into the sample return and feeds 1040 line 13", async () => {
    const r = await prepareReturn(sampleReturn(2025), { renderBase: "https://clicktax.org" });
    const q = r.forms.find((f) => f.form === "f8995")!;
    const f1040 = r.forms.find((f) => f.form === "f1040")!;
    const rows = q.values["businesses"] as Array<Record<string, unknown>>;
    expect(rows[0]!["qbi"]).toBe(18960 - 1340 - 7200);
    expect(q.values["line11"]).toBe(54490 - 31500);
    expect(q.values["line12"]).toBe(150);
    expect(q.values["line15"]).toBe(2084);
    expect(f1040.values["line13"]).toBe(2084);
    expect(f1040.values["line15"]).toBe(22990 - 2084);
    expect(r.totals.qbi_deduction).toBe(2084);
    expect(r.forms.map((f) => f.form)).toEqual(["f1040", "f1040s1", "f1040s2", "f1040s8", "f8995", "f1040sc", "f1040sse"]);
  });
});
