import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, Locate } from "../types.ts";

/** The 2025 PDF zero-pads single-digit widget numbers (f1_01) and wraps line 4a in a read-order subform; the 2024 PDF does neither. */
const nm = (n: number, wrap2025 = ""): Locate => {
  const w = wrap2025 ? `${wrap2025}[0].` : "";
  return n < 10 || wrap2025
    ? { names: { 2024: `Page1[0].f1_${n}[0]`, 2025: `Page1[0].${w}f1_${n < 10 ? `0${n}` : n}[0]` } }
    : { name: `Page1[0].f1_${n}[0]` };
};
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: nm(n), ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: nm(1) },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: nm(2) },
  money("line1", "1", "Investment interest expense paid or accrued in the tax year (margin interest, interest on loans used to buy taxable investments)", 3),
  money("line2", "2", "Disallowed investment interest expense from the prior year's Form 4952, line 7", 4),
  comp("line3", "3", "Total investment interest expense. Add lines 1 and 2", 5, "1 + 2"),
  { id: "line4a", line: "4a", label: "Gross income from property held for investment (taxable interest, ordinary dividends, annuities, royalties; excluding net gain from dispositions)", type: "money", locate: nm(6, "Line4a_ReadOrder"), notes: "In a full return this defaults to Form 1040 lines 2b and 3b." },
  money("line4b", "4b", "Qualified dividends included on line 4a", 7, { notes: "Defaults to Form 1040 line 3a in a full return." }),
  comp("line4c", "4c", "Subtract line 4b from line 4a", 8, "4a - 4b"),
  money("line4d", "4d", "Net gain from the disposition of property held for investment", 9),
  money("line4e", "4e", "Net capital gain from the disposition of property held for investment (the smaller of line 4d or the net capital gain)", 10),
  comp("line4f", "4f", "Subtract line 4e from line 4d", 11, "4d - 4e"),
  money("line4g", "4g", "Amount from lines 4b and 4e that you elect to include in investment income (taxed at ordinary rates instead of capital gain rates)", 12),
  comp("line4h", "4h", "Investment income. Add lines 4c, 4f, and 4g", 13, "4c + 4f + 4g"),
  money("line5", "5", "Investment expenses (deductible expenses directly connected with producing investment income, other than interest)", 14),
  comp("line6", "6", "Net investment income. Subtract line 5 from line 4h; not less than zero", 15, "max(0, 4h - 5)"),
  comp("line7", "7", "Disallowed investment interest expense to be carried forward to the next year. Subtract line 6 from line 3; not less than zero", 16, "max(0, 3 - 6)", { alwaysShow: true }),
  comp("line8", "8", "Investment interest expense deduction. The smaller of line 3 or line 6; to Schedule A line 9", 17, "min(3, 6)", { alwaysShow: true }),
];

export const form4952: FormDef = {
  id: "f4952",
  title: "Form 4952, Investment Interest Expense Deduction",
  shortTitle: "Form 4952",
  description: "Limits the deduction for interest paid on money borrowed to buy taxable investments to net investment income; the allowed amount goes to Schedule A line 9 and the rest carries forward.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f4952.pdf",
  notes: `**Who files.** Anyone deducting investment interest expense on Schedule A (for example margin interest), unless the only investment income is interest and dividends, there is no carryforward, and the expense does not exceed that income.

**What the engine computes.** Lines 3, 4c, 4f, 4h, 6, 7 (the carryforward), and 8 (the deduction). In a full return line 4a defaults to taxable interest plus ordinary dividends and line 4b to qualified dividends; line 8 is placed on Schedule A line 9.

**What to verify.** Line 4g is an election: including qualified dividends or net capital gain in investment income lets more interest be deducted now, but that income then loses its lower capital-gain rate on the Qualified Dividends and Capital Gain Tax Worksheet. Interest on loans used to buy tax-exempt bonds is never deductible and does not belong on line 1.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l3 = c.set("line3", c.n("line1") + c.n("line2"), "Total investment interest expense", `${f(c.n("line1"))} + ${f(c.n("line2"))}`, "3");
    const l4c = c.set("line4c", c.n("line4a") - c.n("line4b"), "Investment income other than qualified dividends", `${f(c.n("line4a"))} - ${f(c.n("line4b"))}`, "4c");
    const l4f = c.set("line4f", c.n("line4d") - c.n("line4e"), "Investment gain other than net capital gain", `${f(c.n("line4d"))} - ${f(c.n("line4e"))}`, "4f");
    if (c.n("line4g") > c.n("line4b") + c.n("line4e")) c.warn("Line 4g cannot exceed the total of lines 4b and 4e.");
    if (c.n("line4e") > c.n("line4d")) c.warn("Line 4e (net capital gain) cannot exceed line 4d (net gain from dispositions).");
    const l4h = c.set("line4h", l4c + l4f + c.n("line4g"), "Investment income", `${f(l4c)} + ${f(l4f)} + ${f(c.n("line4g"))}`, "4h");
    const l6 = c.set("line6", Math.max(0, l4h - c.n("line5")), "Net investment income", `max(0, ${f(l4h)} - ${f(c.n("line5"))})`, "6");
    c.set("line7", Math.max(0, l3 - l6), "Disallowed interest carried forward", `max(0, ${f(l3)} - ${f(l6)})`, "7");
    const l8 = c.set("line8", Math.min(l3, l6), "Investment interest expense deduction", `min(${f(l3)}, ${f(l6)})`, "8");
    if (l8 > 0) c.warn("Enter line 8 on Schedule A line 9 (itemizers only); it is placed there automatically in a full return with Schedule A.");
    return c.result();
  },
};
