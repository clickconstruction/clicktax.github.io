import type { Rounding, Scalar, Values } from "./types.ts";

/** IRS rounding: 50 cents or more rounds up (away from zero); applied symmetrically to losses. */
export function roundWhole(n: number): number {
  const sign = n < 0 ? -1 : 1;
  return sign * Math.floor(Math.abs(n) + 0.5);
}

export function roundCents(n: number): number {
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100)) / 100;
}

export function roundTo(n: number, rounding: Rounding): number {
  return rounding === "whole" ? roundWhole(n) : roundCents(n);
}

/** Parse a money-ish input: numbers, "12,345.67", "$1,000", "(500)" for negatives. */
export function parseMoney(v: Scalar | undefined): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean") return undefined;
  let s = v.trim();
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,\s]/g, "");
  if (s.startsWith("-")) {
    neg = !neg;
    s = s.slice(1);
  }
  if (!/^\d*(\.\d+)?$/.test(s) || s === "" || s === ".") return undefined;
  const n = Number(s);
  return neg ? -n : n;
}

/** Read a money field as a number, rounded per ctx; missing → 0. */
export function num(values: Values, id: string, rounding: Rounding): number {
  const raw = values[id];
  if (Array.isArray(raw)) return 0;
  const n = parseMoney(raw as Scalar | undefined);
  return n === undefined ? 0 : roundTo(n, rounding);
}

export function has(values: Values, id: string): boolean {
  const raw = values[id];
  if (Array.isArray(raw)) return raw.length > 0;
  return raw !== undefined && raw !== null && raw !== "";
}

/** Format a number for a PDF money box: "12,345" (whole) or "12,345.67" (cents); losses in parentheses. */
export function fmtMoney(n: number, rounding: Rounding): string {
  const abs = Math.abs(n);
  const s =
    rounding === "whole"
      ? Math.round(abs).toLocaleString("en-US")
      : abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${s})` : s;
}

export function fmtPlain(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
