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

export interface QdcgInput {
  taxableIncome: number;
  /** Form 1040 line 3a. */
  qualifiedDividends: number;
  /** Form 1040 line 7 when Schedule D is not required, else the smaller of Schedule D lines 15 and 16 (not less than zero). */
  capitalGain: number;
  status: FilingStatus;
  year: TaxYear;
}

export interface QdcgResult {
  tax: number;
  /** Worksheet lines 1-25 for the agent's notes. */
  lines: Record<string, number>;
}

/**
 * Qualified Dividends and Capital Gain Tax Worksheet (Form 1040 instructions, line 16).
 * Taxes the preferential income at 0% / 15% / 20% and the rest at ordinary rates; never more than ordinary tax.
 */
export function qdcgWorksheet(i: QdcgInput): QdcgResult {
  const cg = params(i.year).capitalGains;
  const L: Record<string, number> = {};
  L[1] = Math.max(0, i.taxableIncome);
  L[2] = Math.max(0, i.qualifiedDividends);
  L[3] = Math.max(0, i.capitalGain);
  L[4] = L[2]! + L[3]!;
  L[5] = Math.max(0, L[1]! - L[4]!);
  L[6] = cg.zeroRateMax[i.status];
  L[7] = Math.min(L[1]!, L[6]!);
  L[8] = Math.min(L[5]!, L[7]!);
  L[9] = L[7]! - L[8]!; // taxed at 0%
  L[10] = Math.min(L[1]!, L[4]!);
  L[11] = L[9]!;
  L[12] = L[10]! - L[11]!;
  L[13] = cg.fifteenRateMax[i.status];
  L[14] = Math.min(L[1]!, L[13]!);
  L[15] = L[5]! + L[9]!;
  L[16] = Math.max(0, L[14]! - L[15]!);
  L[17] = Math.min(L[12]!, L[16]!);
  L[18] = L[17]! * 0.15;
  L[19] = L[9]! + L[17]!;
  L[20] = L[10]! - L[19]!;
  L[21] = L[20]! * 0.2;
  L[22] = incomeTax(L[5]!, i.status, i.year);
  L[23] = roundWhole(L[18]! + L[21]! + L[22]!);
  L[24] = incomeTax(L[1]!, i.status, i.year);
  L[25] = Math.min(L[23]!, L[24]!);
  return { tax: L[25]!, lines: L };
}
