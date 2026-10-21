import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  money("line1a_wages", "1a", "Qualified first-year wages of employees who worked at least 120 but fewer than 400 hours (limited per employee: $6,000, $3,000 summer youth, up to $24,000 veterans)", 3),
  comp("line1a", "1a", "25% of the line 1a wages", 4, "wages x 25%"),
  money("line1b_wages", "1b", "Qualified first-year wages of employees who worked at least 400 hours", 5),
  comp("line1b", "1b", "40% of the line 1b wages", 6, "wages x 40%"),
  money("line1c_wages", "1c", "Qualified second-year wages of long-term family assistance recipients (limited to $10,000 per employee)", 7),
  comp("line1c", "1c", "50% of the line 1c wages", 8, "wages x 50%"),
  comp("line2", "2", "Add lines 1a, 1b, and 1c (reduce your wage deduction by this amount)", 9, "1a + 1b + 1c", { alwaysShow: true }),
  money("line3", "3", "Work opportunity credit from partnerships, S corporations, cooperatives, estates, and trusts (Schedule K-1)", 10),
  comp("line4", "4", "Add lines 2 and 3; to Form 3800 Part III line 4b", 11, "2 + 3", { alwaysShow: true }),
  money("line5", "5", "Amount allocated to patrons of the cooperative or beneficiaries of the estate or trust", 12),
  comp("line6", "6", "Cooperatives, estates, and trusts: subtract line 5 from line 4", 13, "4 - 5"),
  { id: "estate_or_trust", label: "Filed by a cooperative, estate, or trust (line 6 is reported instead of line 4)", type: "checkbox", noPdf: true },
];

export const form5884: FormDef = {
  id: "f5884",
  title: "Form 5884, Work Opportunity Credit",
  shortTitle: "Form 5884",
  description: "The credit for hiring members of targeted groups (veterans, long-term unemployment or family assistance recipients, ex-felons, SNAP recipients, summer youth): 25% or 40% of qualified first-year wages, 50% of second-year wages for long-term family assistance recipients; reported on Form 3800.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i5884.pdf",
  notes: `**Who files.** Employers (including sole proprietors) who hired certified members of a targeted group and received the state workforce agency certification (Form 8850 filed within 28 days of the start date). Partners and S corporation shareholders enter their Schedule K-1 share on line 3.

**What the engine computes.** Lines 1a, 1b, and 1c (25%, 40%, and 50% of the qualified wages you enter, already limited per employee), line 2, line 4 (to Form 3800 Part III line 4b, placed automatically in a full return), and line 6 for cooperatives, estates, and trusts.

**What to verify.** Enter wages already capped per employee ($6,000 of first-year wages generally; $3,000 for summer youth; $12,000, $14,000, or $24,000 for qualified veterans; $10,000 a year for long-term family assistance recipients). Reduce your deduction for salaries and wages by the line 2 credit. The credit applies to employees who began work before January 1, 2026.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const a = c.set("line1a", c.n("line1a_wages") * 0.25, "25% credit", `${f(c.n("line1a_wages"))} x 25%`, "1a");
    const b = c.set("line1b", c.n("line1b_wages") * 0.4, "40% credit", `${f(c.n("line1b_wages"))} x 40%`, "1b");
    const cc = c.set("line1c", c.n("line1c_wages") * 0.5, "50% credit", `${f(c.n("line1c_wages"))} x 50%`, "1c");
    const l2 = c.set("line2", a + b + cc, "Current-year work opportunity credit", `${f(a)} + ${f(b)} + ${f(cc)}`, "2");
    const l4 = c.set("line4", l2 + c.n("line3"), "Credit to Form 3800 line 4b", `${f(l2)} + ${f(c.n("line3"))}`, "4");
    c.set("line6", Math.max(0, l4 - c.n("line5")), "Credit after allocation to patrons or beneficiaries", `${f(l4)} - ${f(c.n("line5"))}`, "6");
    if (l2 > 0) c.warn(`Reduce the deduction for salaries and wages by the ${f(l2)} credit on line 2 (or elect out of the credit).`);
    return c.result();
  },
};
