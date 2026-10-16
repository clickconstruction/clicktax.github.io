/**
 * MACRS depreciation for a single asset over its life, reproducing the IRS percentage tables
 * (Pub. 946 Appendix A) by the declining-balance-switching-to-straight-line method with the
 * half-year, mid-quarter, or mid-month convention, plus the section 280F passenger automobile caps.
 */
import type { TaxYear } from "../types.ts";

export type Method = "200DB" | "150DB" | "SL";
export type Convention = "HY" | "MQ" | "MM";

export interface AssetInput {
  description?: string;
  /** "MM/DD/YYYY", "MM/YYYY", or "YYYY-MM-DD". */
  date_placed?: string;
  cost?: number;
  /** Business/investment use percentage (default 100). */
  business_pct?: number;
  /** Recovery period in years: 3, 5, 7, 10, 15, 20, 25, 27.5, 39, 40... */
  life?: number;
  method?: Method;
  convention?: Convention;
  /** Section 179 expense elected for this asset in the year placed in service. */
  section179?: number;
  /** Special depreciation allowance: true for the statutory rate in the year placed in service, a number for a specific amount, false/absent for none. */
  bonus?: boolean | number;
  /** Accumulated MACRS depreciation through the prior year (computed when absent). */
  prior_depreciation?: number;
  listed?: boolean;
  /** Passenger automobile subject to the section 280F caps. */
  passenger_auto?: boolean;
  /** Alternative depreciation system (straight line over the ADS life). */
  ads?: boolean;
  /** Real property (mid-month convention, straight line) when the life alone does not say so. */
  real?: boolean;
}

export interface AssetResult {
  description: string;
  month: number;
  year_placed: number;
  cost: number;
  business_pct: number;
  life: number;
  method: Method;
  convention: Convention;
  section179: number;
  bonus: number;
  /** Depreciable basis after section 179 and the special allowance. */
  basis: number;
  /** 1 for the year placed in service, 2 the next year... */
  recovery_year: number;
  prior_depreciation: number;
  current: number;
  accumulated: number;
  listed: boolean;
  ads: boolean;
  real: boolean;
  /** Full-life schedule of deductions (before caps) for the report. */
  schedule: number[];
  warnings: string[];
}

export function parsePlaced(s: unknown): { month: number; year: number } | undefined {
  const t = String(s ?? "").trim();
  let m = /^(\d{1,2})\/(?:\d{1,2}\/)?(\d{4})$/.exec(t);
  if (m) return { month: Number(m[1]), year: Number(m[2]) };
  m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(t);
  if (m) return { month: Number(m[2]), year: Number(m[1]) };
  return undefined;
}

/** Statutory special depreciation allowance rate by date placed in service. */
export function bonusRate(month: number, year: number): number {
  if (year <= 2017) return 0.5;
  if (year <= 2022) return 1;
  if (year === 2023) return 0.8;
  if (year === 2024) return 0.6;
  if (year === 2025) return month <= 1 ? 0.4 : 1; // 40% through January 19, 2025; 100% for property acquired after
  return 1;
}

/** Section 280F passenger automobile limits by year placed in service: [year 1, year 1 with bonus, year 2, year 3, later]. */
const AUTO_CAPS: Record<number, [number, number, number, number, number]> = {
  2021: [10200, 18200, 16400, 9800, 5860],
  2022: [11200, 19200, 18000, 10800, 6460],
  2023: [12200, 20200, 19500, 11700, 6960],
  2024: [12400, 20400, 19800, 11900, 7160],
  2025: [12200, 20200, 19600, 11800, 7060],
};
export function autoCap(yearPlaced: number, recoveryYear: number, withBonus: boolean): number | undefined {
  const caps = AUTO_CAPS[yearPlaced] ?? AUTO_CAPS[Math.max(2021, Math.min(2025, yearPlaced))];
  if (!caps) return undefined;
  if (recoveryYear === 1) return withBonus ? caps[1] : caps[0];
  if (recoveryYear === 2) return caps[2];
  if (recoveryYear === 3) return caps[3];
  return caps[4];
}

function firstYearFraction(convention: Convention, month: number): number {
  if (convention === "MM") return (12 - month + 0.5) / 12;
  if (convention === "MQ") return (4 - Math.ceil(month / 3) + 0.5) / 4;
  return 0.5;
}

/** Deductions for every recovery year (unrounded percentages applied to the basis), until the basis is used up. */
export function macrsSchedule(basis: number, life: number, method: Method, convention: Convention, month: number): number[] {
  const out: number[] = [];
  if (basis <= 0 || life <= 0) return out;
  const rate = method === "200DB" ? 2 / life : method === "150DB" ? 1.5 / life : 0;
  let remaining = basis;
  let elapsed = 0;
  for (let y = 1; y <= Math.ceil(life) + 1 && remaining > 0.005; y++) {
    const fraction = y === 1 ? firstYearFraction(convention, month) : 1;
    const remainingLife = life - elapsed;
    const sl = remainingLife > 0 ? (remaining / remainingLife) * Math.min(fraction, remainingLife) : remaining;
    const db = remaining * rate * fraction;
    let dep = method === "SL" ? sl : Math.max(db, sl);
    if (dep > remaining || remainingLife <= fraction) dep = remaining;
    out.push(dep);
    remaining -= dep;
    elapsed += fraction;
  }
  return out;
}

const REAL_LIVES = new Set([27.5, 31.5, 39, 40]);

export function computeAsset(a: AssetInput, taxYear: TaxYear): AssetResult {
  const warnings: string[] = [];
  const placed = parsePlaced(a.date_placed);
  const month = placed?.month ?? 1;
  const yearPlaced = placed?.year ?? taxYear;
  if (!placed) warnings.push(`${a.description ?? "Asset"}: date_placed is missing or not MM/DD/YYYY; assumed January ${taxYear}.`);
  const cost = Number(a.cost ?? 0) || 0;
  const pct = a.business_pct === undefined ? 100 : Math.max(0, Math.min(100, Number(a.business_pct) || 0));
  const real = a.real === true || (a.life !== undefined && REAL_LIVES.has(Number(a.life)));
  const ads = a.ads === true;
  const life = Number(a.life ?? (real ? 27.5 : 7)) || 7;
  if (a.life === undefined) warnings.push(`${a.description ?? "Asset"}: life not supplied; ${life}-year property assumed.`);
  const method: Method = a.method ?? (ads || real || life >= 25 ? "SL" : life >= 15 ? "150DB" : "200DB");
  const convention: Convention = a.convention ?? (real ? "MM" : "HY");
  const businessCost = Math.round((cost * pct) / 100);
  let s179 = Math.min(businessCost, Math.max(0, Number(a.section179 ?? 0) || 0));
  let bonus = 0;
  if (a.bonus === true) bonus = Math.round((businessCost - s179) * bonusRate(month, yearPlaced));
  else if (typeof a.bonus === "number") bonus = Math.min(businessCost - s179, Math.max(0, a.bonus));
  if ((a.bonus === true || typeof a.bonus === "number") && (real || ads)) { warnings.push(`${a.description ?? "Asset"}: the special allowance does not apply to real property or ADS property; ignored.`); bonus = 0; }
  const withBonus = bonus > 0;
  const capFor = (y: number) => { const cap = autoCap(yearPlaced, y, withBonus); return cap === undefined ? undefined : Math.round((cap * pct) / 100); };
  if (a.passenger_auto) {
    // Section 280F: the first-year cap covers section 179, the special allowance, and depreciation together.
    const cap1 = capFor(1);
    if (cap1 !== undefined) {
      if (s179 > cap1) s179 = cap1;
      if (s179 + bonus > cap1) bonus = cap1 - s179;
    }
  }
  const basis = Math.max(0, businessCost - s179 - bonus);
  const recoveryYear = taxYear - yearPlaced + 1;
  const schedule = macrsSchedule(basis, life, method, convention, month);
  let current = 0;
  let prior = 0;
  if (recoveryYear >= 1 && a.passenger_auto) {
    // Walk every year, limiting each to its cap; basis left after the recovery period comes out at the later-year cap.
    let recovered = 0;
    for (let y = 1; y <= recoveryYear; y++) {
      const capY = capFor(y);
      const remainingBasis = basis - recovered;
      const scheduled = Math.round(schedule[y - 1] ?? 0);
      const limit = capY === undefined ? Infinity : y === 1 ? Math.max(0, capY - s179 - bonus) : capY;
      let dep = y <= schedule.length ? Math.min(scheduled, limit) : Math.min(remainingBasis, limit);
      dep = Math.max(0, Math.min(dep, remainingBasis));
      if (y === recoveryYear) { current = dep; if (scheduled > dep && y <= schedule.length) warnings.push(`${a.description ?? "Vehicle"}: the passenger automobile limit caps this year's depreciation at ${dep.toLocaleString("en-US")} (MACRS would allow ${scheduled.toLocaleString("en-US")}).`); }
      else prior += dep;
      recovered += dep;
    }
  } else if (recoveryYear >= 1) {
    current = Math.round(schedule[recoveryYear - 1] ?? 0);
    prior = Math.round(schedule.slice(0, recoveryYear - 1).reduce((x, y) => x + y, 0));
  }
  if (a.prior_depreciation !== undefined && recoveryYear > 1) prior = Number(a.prior_depreciation) || 0;
  if (recoveryYear < 1) { warnings.push(`${a.description ?? "Asset"}: placed in service after ${taxYear}; no depreciation this year.`); current = 0; prior = 0; }
  if (prior + current > basis) current = Math.max(0, basis - prior);
  return {
    description: String(a.description ?? "Asset"), month, year_placed: yearPlaced, cost, business_pct: pct, life, method, convention, section179: s179, bonus, basis,
    recovery_year: recoveryYear, prior_depreciation: prior, current, accumulated: prior + current, listed: a.listed === true || a.passenger_auto === true, ads, real, schedule: schedule.map((x) => Math.round(x)), warnings,
  };
}

/** The mid-quarter test: more than 40% of the basis of non-real property placed in service this year in the last quarter. */
export function midQuarterApplies(assets: Array<{ real: boolean; month: number; basis: number; year_placed: number }>, taxYear: TaxYear): boolean {
  const thisYear = assets.filter((a) => a.year_placed === taxYear && !a.real);
  const total = thisYear.reduce((s, a) => s + a.basis, 0);
  if (total <= 0) return false;
  const q4 = thisYear.filter((a) => a.month >= 10).reduce((s, a) => s + a.basis, 0);
  return q4 / total > 0.4;
}
