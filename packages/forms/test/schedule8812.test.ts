import { describe, expect, it } from "vitest";
import { schedule8812 } from "../src/forms/schedule8812.ts";

const whole = (year: 2024 | 2025) => ({ year, rounding: "whole" as const });

describe("Schedule 8812", () => {
  it("limits the credit to tax and yields no refundable part when fully used (2025 mfj)", () => {
    const r = schedule8812.compute({ filing_status: "mfj", line1: 157563, line4: 1, line13: 17562, line18a: 100000 }, whole(2025));
    expect(r.values["line5"]).toBe(2200);
    expect(r.values["line12"]).toBe(2200);
    expect(r.values["line14"]).toBe(2200);
    expect(r.values["line16a"]).toBe(0);
    expect(r.values["line27"]).toBe(0);
  });
  it("computes the additional child tax credit from earned income (2024 single)", () => {
    const r = schedule8812.compute({ filing_status: "single", line1: 30000, line4: 1, line13: 500, line18a: 20000 }, whole(2024));
    expect(r.values["line14"]).toBe(500);
    expect(r.values["line16a"]).toBe(1500);
    expect(r.values["line16b"]).toBe(1700);
    expect(r.values["line17"]).toBe(1500);
    expect(r.values["line19"]).toBe(17500);
    expect(r.values["line20"]).toBe(2625);
    expect(r.values["line27"]).toBe(1500);
  });
  it("phases out $50 per $1,000 over the threshold (2024 mfj)", () => {
    const r = schedule8812.compute({ filing_status: "mfj", line1: 412345, line4: 2, line13: 50000 }, whole(2024));
    expect(r.values["line10"]).toBe(13000);
    expect(r.values["line11"]).toBe(650);
    expect(r.values["line12"]).toBe(3350);
    expect(r.values["line14"]).toBe(3350);
  });
  it("uses Part II-B for three or more children (2025)", () => {
    const r = schedule8812.compute({ filing_status: "mfj", line1: 60000, line4: 3, line13: 1000, line18a: 10000, line21: 2000, line22: 500, line24: 0 }, whole(2025));
    expect(r.values["line8"]).toBe(6600);
    expect(r.values["line14"]).toBe(1000);
    expect(r.values["line16a"]).toBe(5600);
    expect(r.values["line16b"]).toBe(5100);
    expect(r.values["line17"]).toBe(5100);
    expect(r.values["line20"]).toBe(1125);
    expect(r.values["line20_three_or_more"]).toBe(true);
    expect(r.values["line25"]).toBe(2500);
    expect(r.values["line26"]).toBe(2500);
    expect(r.values["line27"]).toBe(2500);
  });
  it("respects the 2024 box to decline the additional credit", () => {
    const r = schedule8812.compute({ filing_status: "single", line1: 30000, line4: 1, line13: 500, line18a: 20000, decline_actc: true }, whole(2024));
    expect(r.values["line27"]).toBe(0);
  });
});
