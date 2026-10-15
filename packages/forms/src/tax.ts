import { params } from "./params.ts";
import { roundWhole } from "./money.ts";
import type { FilingStatus, TaxYear } from "./types.ts";

/** Exact bracket tax (dollars and cents) on taxable income. */
export function bracketTax(taxableIncome: number, status: FilingStatus, year: TaxYear): number {
  const brackets = params(year).brackets[status];
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of brackets) {
    if (taxableIncome <= lower) break;
    const slice = Math.min(taxableIncome, upper) - lower;
    tax += slice * rate;
    lower = upper;
  }
  return tax;
}

/**
 * The IRS Tax Table row containing `ti`: [0,5), [5,15), [15,25), then $25 steps to $3,000,
 * then $50 steps to $100,000. The table value is the bracket tax at the row midpoint, rounded half up.
 */
export function taxTableRow(ti: number): [number, number] {
  if (ti < 5) return [0, 5];
  if (ti < 15) return [5, 15];
  if (ti < 25) return [15, 25];
  if (ti < 3000) {
    const lo = 25 + Math.floor((ti - 25) / 25) * 25;
    return [lo, lo + 25];
  }
  const lo = Math.floor(ti / 50) * 50;
  return [lo, lo + 50];
}

export function taxTableTax(ti: number, status: FilingStatus, year: TaxYear): number {
  const [lo, hi] = taxTableRow(ti);
  return roundWhole(bracketTax((lo + hi) / 2, status, year));
}

/**
 * Form 1040 line 16 for ordinary income: Tax Table below $100,000, Tax Computation Worksheet
 * (exact bracket formula, rounded to whole dollars) at or above. Does not apply the Qualified
 * Dividends and Capital Gain Tax Worksheet; callers must warn when lines 3a or 7 are non-zero.
 */
export function incomeTax(taxableIncome: number, status: FilingStatus, year: TaxYear): number {
  const ti = Math.max(0, taxableIncome);
  if (ti < params(year).taxTableMax) return taxTableTax(ti, status, year);
  return roundWhole(bracketTax(ti, status, year));
}
