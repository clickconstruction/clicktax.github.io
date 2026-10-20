import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

/** Base amount (twice the kiddie threshold), the amount not taxed, and the flat tax on the second half. */
const LIMITS: Record<TaxYear, { base: number; notTaxed: number; flat: number }> = { 2024: { base: 2600, notTaxed: 1300, flat: 130 }, 2025: { base: 2700, notTaxed: 1350, flat: 135 } };

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on your return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "child_name", line: "A", label: "Child's name (first, initial, and last)", type: "text", locate: { name: P(3) } },
  { id: "child_ssn", line: "B", label: "Child's social security number", type: "ssn", maxLen: 9, locate: { name: P(4) } },
  { id: "multiple_forms", line: "C", label: "More than one Form 8814 is attached", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  money("line1a", "1a", "Child's taxable interest", 5),
  money("line1b", "1b", "Child's tax-exempt interest (not included on line 1a)", 6),
  money("line2a", "2a", "Child's ordinary dividends, including Alaska Permanent Fund dividends", 7),
  money("line2b", "2b", "Child's qualified dividends included on line 2a", 8),
  money("line3", "3", "Child's capital gain distributions", 9),
  comp("line4", "4", "Add lines 1a, 2a, and 3; if $2,700 or less ($2,600 for 2024), skip to line 13", 10, "1a + 2a + 3", { alwaysShow: true }),
  comp("line6", "6", "Subtract the base amount (line 5) from line 4", 12, "4 - base amount"),
  { id: "line7", line: "7", label: "Line 2b divided by line 4, as a decimal (whole part)", type: "text", computed: true, maxLen: 1, locate: { name: P(13) } },
  { id: "line7_decimals", line: "7", label: "Line 7 decimal places", type: "text", computed: true, maxLen: 3, locate: { name: P(14) } },
  { id: "line8", line: "8", label: "Line 3 divided by line 4, as a decimal (whole part)", type: "text", computed: true, maxLen: 1, locate: { name: P(15) } },
  { id: "line8_decimals", line: "8", label: "Line 8 decimal places", type: "text", computed: true, maxLen: 3, locate: { name: P(16) } },
  comp("line9", "9", "Multiply line 6 by line 7: qualified dividends to include on your Form 1040 line 3a", 17, "6 x 7"),
  comp("line10", "10", "Multiply line 6 by line 8: capital gain distributions to include on your Schedule D line 13 (or Form 1040 line 7)", 18, "6 x 8"),
  comp("line11", "11", "Add lines 9 and 10", 19, "9 + 10"),
  comp("line12", "12", "Subtract line 11 from line 6: the rest of the child's income, to Schedule 1 line 8z (\"Form 8814\")", 20, "6 - 11", { alwaysShow: true }),
  comp("line14", "14", "Subtract the amount not taxed (line 13) from line 4; not less than zero", 22, "4 - amount not taxed"),
  { id: "line15_under", line: "15", label: "Is line 14 less than $1,350 ($1,300 for 2024)? (Yes: 10% of line 14; no: the flat $135 / $130)", type: "yesno", computed: true, locate: { yes: { name: "Page1[0].Line15_ReadOrder[0].c1_2[0]" }, no: { name: "Page1[0].Line15_ReadOrder[0].c1_2[1]" } } },
  comp("line15", "15", "Tax on the first $2,700 of the child's income: 10% of line 14, or $135 when line 14 is $1,350 or more; added to your Form 1040 line 16", 23, "10% of line 14 (max 135)", { alwaysShow: true }),
];

const decimal = (x: number): [string, string] => {
  const v = Math.min(1, Math.max(0, x));
  const whole = Math.floor(v + 1e-9);
  return [String(whole), String(Math.round((v - whole) * 1000)).padStart(3, "0")];
};

export const form8814: FormDef = {
  id: "f8814",
  title: "Form 8814, Parents' Election To Report Child's Interest and Dividends",
  shortTitle: "Form 8814",
  description: "Lets a parent report a child's interest, dividends, and capital gain distributions on the parent's return instead of filing a return for the child: the first $2,700 (2025) is taxed at the child's rates on this form and the rest is added to the parent's income.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f8814.pdf",
  notes: `**Who files.** A parent whose child was under 19 (or a full-time student under 24) at year end, had only interest, dividends, and capital gain distributions totaling less than $13,500 (2025; $13,000 for 2024), made no estimated payments, had no withholding, and is not filing a joint return. One Form 8814 per child.

**What the engine computes.** Line 4, line 6 (over the $2,700 base), the qualified dividend and capital gain distribution shares (lines 7 through 10, rounded to three decimals), line 11, line 12 (the part added to the parent's income on Schedule 1 line 8z), line 14, and the line 15 tax (10% of the amount between $1,350 and $2,700, at most $135). In a full return line 12 goes to Schedule 1 line 8z, line 9 to Form 1040 line 3a, line 10 to line 7 or Schedule D, and line 15 is added to Form 1040 line 16.

**What to verify.** Making the election usually costs more tax than a separate return for the child when the child would owe little or nothing, and it can raise the parent's AGI-based limits (IRA deductions, education credits, the net investment income tax). Tax-exempt interest (line 1b) is reported but not taxed.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const L = LIMITS[ctx.year];
    const l4 = c.set("line4", c.sum(["line1a", "line2a", "line3"]), "Child's interest, dividends, and capital gain distributions", `${f(c.n("line1a"))} + ${f(c.n("line2a"))} + ${f(c.n("line3"))}`, "4");
    const over = l4 > L.base;
    const l6 = c.set("line6", over ? l4 - L.base : 0, "Income over the base amount", over ? `${f(l4)} - ${f(L.base)}` : `line 4 is not more than ${f(L.base)}`, "6");
    const r7 = over && l4 > 0 ? c.n("line2b") / l4 : 0;
    const r8 = over && l4 > 0 ? c.n("line3") / l4 : 0;
    const [w7, d7] = decimal(r7);
    const [w8, d8] = decimal(r8);
    c.setScalar("line7", over ? w7 : "", "Qualified dividend share (whole)", `${f(c.n("line2b"))} / ${f(l4)} = ${r7.toFixed(3)}`, "7");
    c.setScalar("line7_decimals", over ? d7 : "", "Qualified dividend share (decimals)", r7.toFixed(3), "7");
    c.setScalar("line8", over ? w8 : "", "Capital gain share (whole)", `${f(c.n("line3"))} / ${f(l4)} = ${r8.toFixed(3)}`, "8");
    c.setScalar("line8_decimals", over ? d8 : "", "Capital gain share (decimals)", r8.toFixed(3), "8");
    const l9 = c.set("line9", l6 * (Math.round(r7 * 1000) / 1000), "Qualified dividends to the parent's line 3a", `${f(l6)} x ${r7.toFixed(3)}`, "9");
    const l10 = c.set("line10", l6 * (Math.round(r8 * 1000) / 1000), "Capital gain distributions to the parent's Schedule D", `${f(l6)} x ${r8.toFixed(3)}`, "10");
    const l11 = c.set("line11", l9 + l10, "Lines 9 and 10", `${f(l9)} + ${f(l10)}`, "11");
    c.set("line12", Math.max(0, l6 - l11), "Other income to Schedule 1 line 8z", `${f(l6)} - ${f(l11)}`, "12");
    const l14 = c.set("line14", Math.max(0, l4 - L.notTaxed), "Amount subject to the 10% tax", `max(0, ${f(l4)} - ${f(L.notTaxed)})`, "14");
    const under = l14 < L.notTaxed;
    c.out["line15_under"] = under;
    c.set("line15", under ? l14 * 0.1 : L.flat, "Tax on the child's income (added to Form 1040 line 16)", under ? `${f(l14)} x 10%` : `flat ${f(L.flat)}`, "15");
    if (l4 >= 13500 - (ctx.year === 2024 ? 500 : 0)) c.warn(`The child's income (${f(l4)}) is not under the ${ctx.year === 2024 ? "$13,000" : "$13,500"} limit for the election; the child must file their own return.`);
    if (c.n("line2b") > c.n("line2a")) c.warn("Line 2b (qualified dividends) cannot exceed line 2a (ordinary dividends).");
    return c.result();
  },
};
