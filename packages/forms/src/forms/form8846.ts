import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

const WAGE_BASE: Record<TaxYear, number> = { 2024: 168600, 2025: 176100 };

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  money("line1", "1", "Tips received by employees for services on which you paid or incurred employer social security and Medicare taxes during the tax year", 3),
  money("line2", "2", "Tips not subject to the credit provisions (tips used to bring the employee's hourly pay up to the $5.15 federal minimum wage)", 4),
  comp("line3", "3", "Creditable tips. Subtract line 2 from line 1", 5, "1 - 2"),
  { id: "line4_over_base", line: "4", label: "Any tipped employee's wages (including tips) exceeded the social security wage base ($176,100 for 2025; $168,600 for 2024), so the 7.65% rate does not apply to all tips", type: "checkbox", locate: { name: "Page1[0].Line4_ReadOrder[0].c1_1[0]" } },
  money("line4", "4", "Multiply line 3 by 7.65% (or the reduced amount when an employee exceeded the wage base)", 6, { notes: "Figured as 7.65% of line 3 when not supplied; supply line4 directly when the wage-base box applies." }),
  money("line5", "5", "Credit for employer social security and Medicare taxes paid on certain employee tips from partnerships and S corporations", 7),
  comp("line6", "6", "Add lines 4 and 5; to Form 3800 Part III line 4f", 8, "4 + 5", { alwaysShow: true }),
];

export const form8846: FormDef = {
  id: "f8846",
  title: "Form 8846, Credit for Employer Social Security and Medicare Taxes Paid on Certain Employee Tips",
  shortTitle: "Form 8846",
  description: "The FICA tip credit for food and beverage employers: the employer's 7.65% social security and Medicare tax on tips above those needed to reach the $5.15 federal minimum wage; reported on Form 3800.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f8846.pdf",
  notes: `**Who files.** Food and beverage establishments (and, for tips received after 2024, beauty service businesses under Public Law 119-21) where tipping is customary and employees received tips on which the employer paid social security and Medicare taxes.

**What the engine computes.** Line 3 (creditable tips), line 4 (7.65% of line 3 unless you check the wage-base box and supply the reduced amount from the instructions worksheet), and line 6 (to Form 3800 Part III line 4f, placed automatically in a full return).

**What to verify.** Line 2 is the portion of tips that counts toward the federal minimum wage of $5.15 an hour (not the current state minimum); for employees paid at least $5.15 in wages, line 2 is zero. You cannot also deduct the employer taxes claimed as a credit.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l3 = c.set("line3", Math.max(0, c.n("line1") - c.n("line2")), "Creditable tips", `${f(c.n("line1"))} - ${f(c.n("line2"))}`, "3");
    let l4: number;
    if (c.has("line4")) {
      l4 = c.n("line4");
      c.computations.push({ id: "line4", line: "4", label: "Employer tax on creditable tips (supplied)", value: l4, formula: "supplied" });
      if (!c.bool("line4_over_base")) c.warn("line4 was supplied directly; check line4_over_base when an employee's wages exceeded the social security wage base, otherwise leave line4 to the engine.");
    } else {
      l4 = c.set("line4", l3 * 0.0765, "Employer tax on creditable tips", `${f(l3)} x 7.65%`, "4");
      if (c.bool("line4_over_base")) c.warn(`An employee exceeded the $${WAGE_BASE[ctx.year].toLocaleString()} wage base: tips above the base are credited at 1.45% only; supply line4 from the instructions worksheet.`);
    }
    c.set("line6", l4 + c.n("line5"), "Credit to Form 3800 line 4f", `${f(l4)} + ${f(c.n("line5"))}`, "6");
    return c.result();
  },
};
