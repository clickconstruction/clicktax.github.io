import type { FilingStatus, TaxYear } from "./types.ts";

/** [upper bound of bracket, rate] in ascending order; the last bound is Infinity. */
export type Bracket = readonly [number, number];

export interface YearParams {
  standardDeduction: Record<FilingStatus, number>;
  /** Additional standard deduction per age-65-or-blind item. */
  additionalStandard: { unmarried: number; married: number };
  /** Dependent-filer limit: greater of `floor` or earned income + `earnedPlus`, capped at the basic amount. */
  dependentStandard: { floor: number; earnedPlus: number };
  brackets: Record<FilingStatus, readonly Bracket[]>;
  /** Taxable income at and above which the Tax Computation Worksheet (exact formula) replaces the Tax Table. */
  taxTableMax: number;
  se: {
    wageBase: number;
    socialSecurityRate: number;
    medicareRate: number;
    netEarningsFactor: number;
    filingThreshold: number;
  };
  /** Qualified Dividends and Capital Gain Tax Worksheet breakpoints (taxable income at which 0% and 15% rates end). */
  capitalGains: { zeroRateMax: Record<FilingStatus, number>; fifteenRateMax: Record<FilingStatus, number> };
  /** Form 8889 HSA contribution limits. */
  hsa: { selfOnly: number; family: number; catchUp: number };
  /** Form 8959 Additional Medicare Tax thresholds. */
  additionalMedicare: { mfj: number; mfs: number; other: number; rate: number };
  /** Form 8995 simplified QBI: taxable income (before the deduction) at or below which the simplified form applies. */
  qbiThreshold: { mfj: number; other: number };
  /** Child tax credit (Schedule 8812). */
  ctc: { perChild: number; perOtherDependent: number; actcMax: number; phaseoutMfj: number; phaseoutOther: number; earnedIncomeFloor: number; threeChildrenAmount: number };
  /** Printed on Form 1040 for reference. */
  formRevision: string;
}

const B = (...rows: Array<[number, number]>): readonly Bracket[] => rows;

const single2024 = B([11600, 0.1], [47150, 0.12], [100525, 0.22], [191950, 0.24], [243725, 0.32], [609350, 0.35], [Infinity, 0.37]);
const mfj2024 = B([23200, 0.1], [94300, 0.12], [201050, 0.22], [383900, 0.24], [487450, 0.32], [731200, 0.35], [Infinity, 0.37]);
const mfs2024 = B([11600, 0.1], [47150, 0.12], [100525, 0.22], [191950, 0.24], [243725, 0.32], [365600, 0.35], [Infinity, 0.37]);
const hoh2024 = B([16550, 0.1], [63100, 0.12], [100500, 0.22], [191950, 0.24], [243700, 0.32], [609350, 0.35], [Infinity, 0.37]);

const single2025 = B([11925, 0.1], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]);
const mfj2025 = B([23850, 0.1], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]);
const mfs2025 = B([11925, 0.1], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [375800, 0.35], [Infinity, 0.37]);
const hoh2025 = B([17000, 0.1], [64850, 0.12], [103350, 0.22], [197300, 0.24], [250500, 0.32], [626350, 0.35], [Infinity, 0.37]);

export const PARAMS: Record<TaxYear, YearParams> = {
  2024: {
    standardDeduction: { single: 14600, mfj: 29200, mfs: 14600, hoh: 21900, qss: 29200 },
    additionalStandard: { unmarried: 1950, married: 1550 },
    dependentStandard: { floor: 1300, earnedPlus: 450 },
    brackets: { single: single2024, mfj: mfj2024, mfs: mfs2024, hoh: hoh2024, qss: mfj2024 },
    taxTableMax: 100000,
    se: { wageBase: 168600, socialSecurityRate: 0.124, medicareRate: 0.029, netEarningsFactor: 0.9235, filingThreshold: 400 },
    capitalGains: {
      zeroRateMax: { single: 47025, mfj: 94050, mfs: 47025, hoh: 63000, qss: 94050 },
      fifteenRateMax: { single: 518900, mfj: 583750, mfs: 291850, hoh: 551350, qss: 583750 },
    },
    hsa: { selfOnly: 4150, family: 8300, catchUp: 1000 },
    additionalMedicare: { mfj: 250000, mfs: 125000, other: 200000, rate: 0.009 },
    qbiThreshold: { mfj: 383900, other: 191950 },
    ctc: { perChild: 2000, perOtherDependent: 500, actcMax: 1700, phaseoutMfj: 400000, phaseoutOther: 200000, earnedIncomeFloor: 2500, threeChildrenAmount: 5100 },
    formRevision: "2024",
  },
  2025: {
    standardDeduction: { single: 15750, mfj: 31500, mfs: 15750, hoh: 23625, qss: 31500 },
    additionalStandard: { unmarried: 2000, married: 1600 },
    dependentStandard: { floor: 1350, earnedPlus: 450 },
    brackets: { single: single2025, mfj: mfj2025, mfs: mfs2025, hoh: hoh2025, qss: mfj2025 },
    taxTableMax: 100000,
    se: { wageBase: 176100, socialSecurityRate: 0.124, medicareRate: 0.029, netEarningsFactor: 0.9235, filingThreshold: 400 },
    capitalGains: {
      zeroRateMax: { single: 48350, mfj: 96700, mfs: 48350, hoh: 64750, qss: 96700 },
      fifteenRateMax: { single: 533400, mfj: 600050, mfs: 300000, hoh: 566700, qss: 600050 },
    },
    hsa: { selfOnly: 4300, family: 8550, catchUp: 1000 },
    additionalMedicare: { mfj: 250000, mfs: 125000, other: 200000, rate: 0.009 },
    qbiThreshold: { mfj: 394600, other: 197300 },
    ctc: { perChild: 2200, perOtherDependent: 500, actcMax: 1700, phaseoutMfj: 400000, phaseoutOther: 200000, earnedIncomeFloor: 2500, threeChildrenAmount: 5100 },
    formRevision: "2025",
  },
};

export function params(year: TaxYear): YearParams {
  const p = PARAMS[year];
  if (!p) throw new Error(`Unsupported tax year ${year}`);
  return p;
}
