import { describe, expect, it } from "vitest";
import { autoCap, bonusRate, computeAsset, macrsSchedule, midQuarterApplies, parsePlaced } from "../src/engine/depreciation.ts";

const pct = (s: number[], basis: number) => s.map((x) => Math.round((x / basis) * 10000) / 100);
/** The IRS tables round each year to two decimals and nudge a year so the column sums to 100; allow a cent of drift per year. */
const close = (got: number[], want: number[]) => { expect(got.length).toBe(want.length); got.forEach((g, i) => expect(Math.abs(g - want[i]!)).toBeLessThanOrEqual(0.011)); };

describe("MACRS schedules match the IRS tables", () => {
  it("5-year and 7-year 200DB half-year (Table A-1)", () => {
    close(pct(macrsSchedule(100000, 5, "200DB", "HY", 6), 100000), [20, 32, 19.2, 11.52, 11.52, 5.76]);
    close(pct(macrsSchedule(100000, 7, "200DB", "HY", 6), 100000), [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46]);
  });
  it("15-year 150DB half-year and 5-year mid-quarter (Tables A-1, A-2 to A-5)", () => {
    expect(pct(macrsSchedule(100000, 15, "150DB", "HY", 3), 100000).slice(0, 4)).toEqual([5, 9.5, 8.55, 7.7]);
    expect(pct(macrsSchedule(100000, 5, "200DB", "MQ", 2), 100000).slice(0, 3)).toEqual([35, 26, 15.6]);
    expect(pct(macrsSchedule(100000, 5, "200DB", "MQ", 11), 100000).slice(0, 3)).toEqual([5, 38, 22.8]);
  });
  it("residential and nonresidential real property mid-month straight line (Tables A-6, A-7a)", () => {
    close(pct(macrsSchedule(100000, 27.5, "SL", "MM", 1), 100000).slice(0, 2), [3.485, 3.636]);
    close([pct(macrsSchedule(100000, 27.5, "SL", "MM", 12), 100000)[0]!], [0.152]);
    close(pct(macrsSchedule(100000, 39, "SL", "MM", 7), 100000).slice(0, 2), [1.177, 2.564]);
  });
  it("uses the basis up exactly", () => {
    for (const [life, method, conv] of [[5, "200DB", "HY"], [7, "200DB", "MQ"], [15, "150DB", "HY"], [27.5, "SL", "MM"], [39, "SL", "MM"]] as const) {
      const s = macrsSchedule(123456, life, method, conv, 5);
      expect(Math.round(s.reduce((a, b) => a + b, 0))).toBe(123456);
    }
  });
});

describe("asset computation", () => {
  it("figures first-year, later-year, and prior depreciation with section 179 and the special allowance", () => {
    const first = computeAsset({ description: "Truck", date_placed: "06/15/2025", cost: 50000, life: 5, section179: 10000, bonus: true }, 2025);
    expect(first.bonus).toBe(40000); // 100% after January 19, 2025
    expect(first.basis).toBe(0);
    expect(first.current).toBe(0);
    const later = computeAsset({ description: "Lathe", date_placed: "03/01/2023", cost: 20000, life: 7 }, 2025);
    expect(later.recovery_year).toBe(3);
    expect(Math.abs(later.prior_depreciation - Math.round(20000 * 0.1429 + 20000 * 0.2449))).toBeLessThanOrEqual(2);
    expect(Math.abs(later.current - 3498)).toBeLessThanOrEqual(2); // 17.49%
    expect(later.accumulated).toBe(later.prior_depreciation + later.current);
    const jan = computeAsset({ description: "Mower", date_placed: "01/10/2025", cost: 10000, life: 7, bonus: true }, 2025);
    expect(jan.bonus).toBe(4000); // 40% before January 20, 2025
    expect(jan.current).toBe(Math.round(6000 * 0.1429));
    const supplied = computeAsset({ description: "Old", date_placed: "01/01/2020", cost: 10000, life: 5, prior_depreciation: 9000 }, 2025);
    expect(supplied.current).toBe(576);
  });
  it("caps passenger automobiles under section 280F", () => {
    const car = computeAsset({ description: "Sedan", date_placed: "03/01/2025", cost: 60000, life: 5, passenger_auto: true, bonus: true }, 2025);
    expect(car.current + car.bonus).toBe(20200);
    const car2 = computeAsset({ description: "Sedan", date_placed: "03/01/2024", cost: 60000, life: 5, passenger_auto: true }, 2025);
    expect(car2.prior_depreciation).toBe(12000); // 60,000 x 20% is under the 12,400 first-year cap
    expect(car2.current).toBe(19200); // 60,000 x 32% = 19,200 is under the 19,800 second-year cap
    const car3 = computeAsset({ description: "Sedan", date_placed: "03/01/2024", cost: 90000, life: 5, passenger_auto: true, business_pct: 50 }, 2025);
    expect(car3.current).toBe(9900); // 45,000 x 32% = 14,400 capped at 50% of 19,800
  });
  it("parses dates, bonus rates, and the mid-quarter test", () => {
    expect(parsePlaced("3/2024")).toEqual({ month: 3, year: 2024 });
    expect(parsePlaced("2024-11-05")).toEqual({ month: 11, year: 2024 });
    expect(bonusRate(6, 2024)).toBe(0.6);
    expect(autoCap(2024, 4, false)).toBe(7160);
    expect(midQuarterApplies([{ real: false, month: 11, basis: 50000, year_placed: 2025 }, { real: false, month: 2, basis: 40000, year_placed: 2025 }, { real: true, month: 12, basis: 900000, year_placed: 2025 }], 2025)).toBe(true);
    expect(midQuarterApplies([{ real: false, month: 11, basis: 30000, year_placed: 2025 }, { real: false, month: 2, basis: 50000, year_placed: 2025 }], 2025)).toBe(false);
  });
});
