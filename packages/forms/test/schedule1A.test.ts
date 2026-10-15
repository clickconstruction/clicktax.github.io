import { describe, expect, it } from "vitest";
import { schedule1A } from "../src/forms/schedule1A.ts";
import { prepareReturn } from "../src/engine/return.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };

describe("Schedule 1-A (2025)", () => {
  it("caps and phases out tips ($100 per $1,000 over $150,000, rounded down)", () => {
    const r = schedule1A.compute({ filing_status: "single", line1: 160000, line4a: 30000 }, ctx);
    expect(r.values["line7"]).toBe(25000);
    expect(r.values["line10"]).toBe(10000);
    expect(r.values["line11"]).toBe(10);
    expect(r.values["line12"]).toBe(1000);
    expect(r.values["line13"]).toBe(24000);
  });
  it("caps overtime at $25,000 joint and rounds the phaseout down", () => {
    const r = schedule1A.compute({ filing_status: "mfj", line1: 300500, line14a: 30000 }, ctx);
    expect(r.values["line15"]).toBe(25000);
    expect(r.values["line18"]).toBe(500);
    expect(r.values["line19"]).toBe(0);
    expect(r.values["line21"]).toBe(25000);
  });
  it("caps car loan interest at $10,000 and phases out $200 per $1,000, rounded up", () => {
    const r = schedule1A.compute({ filing_status: "single", line1: 101500, vehicles: [{ vin: "1HGCM82633A004352", interest: 12000 }] }, ctx);
    expect(r.values["line24"]).toBe(10000);
    expect(r.values["line27"]).toBe(1500);
    expect(r.values["line28"]).toBe(2);
    expect(r.values["line29"]).toBe(400);
    expect(r.values["line30"]).toBe(9600);
  });
  it("gives each qualifying spouse the senior deduction with a 6% phaseout", () => {
    const r = schedule1A.compute({ filing_status: "mfj", line1: 170000, you_65_or_older: true, spouse_65_or_older: true }, ctx);
    expect(r.values["line33"]).toBe(20000);
    expect(r.values["line34"]).toBe(1200);
    expect(r.values["line35"]).toBe(4800);
    expect(r.values["line36a"]).toBe(4800);
    expect(r.values["line36b"]).toBe(4800);
    expect(r.values["line37"]).toBe(9600);
    expect(r.values["line38"]).toBe(9600);
    const mfs = schedule1A.compute({ filing_status: "mfs", line1: 50000, you_65_or_older: true }, ctx);
    expect(mfs.values["line37"]).toBe(0);
    expect(mfs.warnings.some((w) => w.includes("jointly"))).toBe(true);
  });
  it("feeds 1040 line 13b and reduces the QBI income limitation", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, you_65_or_older: true, line1a: 40000 }, scheduleC: [{ line1: 30000 }] },
      { renderBase: "https://clicktax.org" },
    );
    const s1a = r.forms.find((x) => x.form === "f1040s1a")!;
    const f = r.forms.find((x) => x.form === "f1040")!;
    const q = r.forms.find((x) => x.form === "f8995")!;
    expect(s1a.values["line38"]).toBe(6000);
    expect(f.values["line13b"]).toBe(6000);
    expect(f.values["line14"]).toBe(Number(f.values["line12"]) + Number(f.values["line13"]) + 6000);
    expect(q.values["line11"]).toBe(Number(f.values["line11"]) - Number(f.values["line12"]) - 6000);
  });
});
