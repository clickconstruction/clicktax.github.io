import { describe, expect, it } from "vitest";
import { bracketTax, incomeTax, taxTableRow, taxTableTax } from "../src/tax.ts";

describe("tax table rows", () => {
  it("uses the IRS row widths", () => {
    expect(taxTableRow(0)).toEqual([0, 5]);
    expect(taxTableRow(12)).toEqual([5, 15]);
    expect(taxTableRow(37)).toEqual([25, 50]);
    expect(taxTableRow(2999)).toEqual([2975, 3000]);
    expect(taxTableRow(3000)).toEqual([3000, 3050]);
    expect(taxTableRow(50049)).toEqual([50000, 50050]);
  });
});

describe("2024 tax table (values from IRS i1040tt 2024)", () => {
  it("matches published rows", () => {
    expect(taxTableTax(0, "single", 2024)).toBe(0);
    expect(taxTableTax(30, "single", 2024)).toBe(4);
    expect(taxTableTax(3010, "single", 2024)).toBe(303);
    expect(taxTableTax(50000, "single", 2024)).toBe(6059);
    expect(taxTableTax(50000, "mfj", 2024)).toBe(5539);
    expect(taxTableTax(50000, "mfs", 2024)).toBe(6059);
    expect(taxTableTax(50000, "hoh", 2024)).toBe(5672);
    expect(taxTableTax(53000, "single", 2024)).toBe(6719);
    expect(taxTableTax(56000, "hoh", 2024)).toBe(6392);
  });
});

describe("2025 tax table (values from IRS i1040tt 2025)", () => {
  it("matches published rows", () => {
    expect(taxTableTax(50000, "single", 2025)).toBe(5920);
    expect(taxTableTax(50000, "mfj", 2025)).toBe(5526);
    expect(taxTableTax(50000, "hoh", 2025)).toBe(5663);
    expect(taxTableTax(56000, "single", 2025)).toBe(7240);
    expect(taxTableTax(1010, "single", 2025)).toBe(101);
  });
});

describe("tax computation worksheet (>= $100,000)", () => {
  it("uses the exact bracket formula, rounded", () => {
    // 2024 single: 150,000 x 24% - 6,957.50 = 29,042.50 -> 29,043
    expect(incomeTax(150000, "single", 2024)).toBe(29043);
    expect(bracketTax(150000, "single", 2024)).toBeCloseTo(29042.5, 2);
    // 2025 mfj: 2,385 + 8,772 + 24,145 + 0.24 x 43,300 = 45,694 (= 250,000 x 24% - 14,306)
    expect(incomeTax(250000, "mfj", 2025)).toBe(45694);
    // IRS worksheet constants: 100,000 x 22% - 4,947 (2024 single), - 9,894 (2024 mfj), - 5,086 (2025 single), - 10,172 (2025 mfj)
    expect(incomeTax(100000, "single", 2024)).toBe(17053);
    expect(incomeTax(100000, "mfj", 2024)).toBe(12106);
    expect(incomeTax(100000, "single", 2025)).toBe(16914);
    expect(incomeTax(100000, "mfj", 2025)).toBe(11828);
  });
  it("switches from table to worksheet at 100,000", () => {
    expect(incomeTax(99999, "single", 2024)).toBe(taxTableTax(99999, "single", 2024));
    expect(incomeTax(100000, "single", 2024)).toBe(Math.floor(bracketTax(100000, "single", 2024) + 0.5));
  });
});
