import { fmtPlain, has as hasValue, num as numValue, parseMoney } from "../money.ts";
import type { Computation, ComputeContext, ListRow, Scalar, Values } from "../types.ts";

/** Small builder used by every form's compute(): reads inputs, records computations, collects warnings. */
export class Calc {
  readonly out: Values;
  readonly computations: Computation[] = [];
  readonly warnings: string[] = [];
  constructor(readonly input: Values, readonly ctx: ComputeContext) {
    this.out = { ...input };
  }
  /** Money input, rounded per context; missing → 0. */
  n(id: string): number {
    return numValue(this.input, id, this.ctx.rounding);
  }
  has(id: string): boolean {
    return hasValue(this.input, id);
  }
  bool(id: string): boolean {
    const v = this.input[id];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return /^(true|yes|y|1|x)$/i.test(v.trim());
    if (typeof v === "number") return v !== 0;
    return false;
  }
  str(id: string): string {
    const v = this.input[id];
    if (v === undefined || v === null || Array.isArray(v)) return "";
    return String(v);
  }
  list(id: string): ListRow[] {
    const v = this.input[id];
    return Array.isArray(v) ? v : [];
  }
  /** Sum of money inputs by id. */
  sum(ids: string[]): number {
    return ids.reduce((acc, id) => acc + this.n(id), 0);
  }
  /** Record a computed money line. */
  set(id: string, value: number, label: string, formula: string, line?: string): number {
    const v = this.ctx.rounding === "whole" ? Math.sign(value) * Math.floor(Math.abs(value) + 0.5) : Math.round(value * 100) / 100;
    this.out[id] = v;
    this.computations.push({ id, label, value: v, formula, ...(line ? { line } : {}) });
    return v;
  }
  setScalar(id: string, value: Scalar, label: string, formula: string, line?: string): void {
    this.out[id] = value;
    this.computations.push({ id, label, value, formula, ...(line ? { line } : {}) });
  }
  warn(message: string): void {
    this.warnings.push(message);
  }
  /** Formats a list of (label, amount) pairs for a formula string. */
  show(parts: Array<[string, number]>, op = " + "): string {
    return parts.map(([l, v]) => `${l} ${fmtPlain(v)}`).join(op);
  }
  result() {
    return { values: this.out, computations: this.computations, warnings: this.warnings };
  }
}

export function money(v: Scalar | undefined): number {
  const n = parseMoney(v);
  return n === undefined ? 0 : n;
}

export function f(n: number): string {
  return fmtPlain(n);
}
