import { Calc, f } from "../engine/helpers.ts";
import { incomeTax } from "../tax.ts";
import type { FieldDef, FilingStatus, FormDef, TaxYear } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

/** Line 2 standard amount (twice the kiddie-tax threshold) and the threshold itself. */
const LIMITS: Record<TaxYear, { line2: number; half: number }> = { 2024: { line2: 2600, half: 1300 }, 2025: { line2: 2700, half: 1350 } };
const STATUSES: readonly FilingStatus[] = ["single", "mfj", "mfs", "hoh", "qss"];

const fields: FieldDef[] = [
  { id: "name", label: "Child's name shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Child's social security number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "parent_name", line: "A", label: "Parent's name (first, initial, and last)", type: "text", locate: { name: P(3) } },
  { id: "parent_ssn", line: "B", label: "Parent's social security number", type: "ssn", maxLen: 9, locate: { name: P(4) } },
  { id: "parent_filing_status", line: "C", label: "Parent's filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: STATUSES, locate: { single: { name: "Page1[0].c1_1[0]" }, mfj: { name: "Page1[0].c1_1[1]" }, mfs: { name: "Page1[0].c1_1[2]" }, hoh: { name: "Page1[0].c1_1[3]" }, qss: { name: "Page1[0].c1_1[4]" } } },
  { id: "child_filing_status", label: "Child's filing status (defaults to single)", type: "choice", choices: STATUSES },
  money("line1", "1", "Child's unearned income (taxable interest, dividends, capital gains, taxable pensions, social security, unemployment...)", 5),
  money("line2", "2", "$2,700 for 2025 ($2,600 for 2024) if the child did not itemize; otherwise the larger of $1,350 ($1,300) plus the itemized deductions directly connected with producing the unearned income, or $2,700 ($2,600)", 6, { notes: "Computed from the year's amounts (and child_itemized_investment_deductions) when not supplied." }),
  { id: "child_itemized_investment_deductions", label: "Child's itemized deductions directly connected with the production of unearned income (when the child itemizes)", type: "money", noPdf: true },
  comp("line3", "3", "Subtract line 2 from line 1; if zero or less, stop (attach the form to the child's return)", 7, "max(0, 1 - 2)"),
  money("line4", "4", "Child's taxable income (Form 1040 line 15)", 8, { notes: "Filled from the child's return when preparing a full return." }),
  comp("line5", "5", "Net unearned income: the smaller of line 3 or line 4", 9, "min(3, 4)", { alwaysShow: true }),
  money("line6", "6", "Parent's taxable income (parent's Form 1040 line 15); zero if a loss", 10),
  money("line7", "7", "Total of line 5 from the Forms 8615 of all other children of this parent", 11),
  comp("line8", "8", "Add lines 5, 6, and 7", 12, "5 + 6 + 7"),
  { id: "line9_worksheet", line: "9", label: "The Qualified Dividends and Capital Gain Tax Worksheet or Schedule D Tax Worksheet was used for line 9", type: "checkbox", locate: { name: "Page1[0].Line9_ReadOrder[0].c1_2[0]" } },
  comp("line9", "9", "Tax on line 8 at the parent's filing status", 13, "tax table / computation worksheet on line 8", { notes: "Figured with the ordinary rates; when the parent or the children have qualified dividends or capital gains, the Qualified Dividends and Capital Gain Tax Worksheet applies instead; supply line9 to override." }),
  { id: "line10_worksheet", line: "10", label: "The parent's tax was figured with a capital gain worksheet", type: "checkbox", locate: { name: "Page1[0].Line10_ReadOrder[0].c1_3[0]" } },
  money("line10", "10", "Parent's tax (parent's Form 1040 line 16, minus any alternative minimum tax)", 14),
  comp("line11", "11", "Subtract line 10 from line 9", 15, "9 - 10"),
  comp("line12a", "12a", "Add lines 5 and 7", 16, "5 + 7"),
  { id: "line12b", line: "12b", label: "Divide line 5 by line 12a, as a decimal rounded to 3 places (digits after the printed decimal point)", type: "text", computed: true, maxLen: 3, locate: { name: P(17) } },
  comp("line13", "13", "Multiply line 11 by line 12b (line 11 when line 7 is blank)", 18, "11 x 12b"),
  comp("line14", "14", "Subtract line 5 from line 4", 19, "4 - 5"),
  { id: "line15_worksheet", line: "15", label: "A capital gain worksheet was used for line 15", type: "checkbox", locate: { name: "Page1[0].Line15_ReadOrder[0].c1_4[0]" } },
  comp("line15", "15", "Tax on line 14 at the child's filing status", 20, "tax on line 14"),
  comp("line16", "16", "Add lines 13 and 15", 21, "13 + 15"),
  { id: "line17_worksheet", line: "17", label: "A capital gain worksheet was used for line 17", type: "checkbox", locate: { name: "Page1[0].Line17_ReadOrder[0].c1_5[0]" } },
  comp("line17", "17", "Tax on line 4 at the child's filing status", 22, "tax on line 4"),
  comp("line18", "18", "The larger of line 16 or line 17; to the child's Form 1040 line 16", 23, "max(16, 17)", { alwaysShow: true }),
];

export const form8615: FormDef = {
  id: "f8615",
  title: "Form 8615, Tax for Certain Children Who Have Unearned Income",
  shortTitle: "Form 8615",
  description: "The kiddie tax: a child's unearned income over $2,700 (2025; $2,600 for 2024) is taxed at the parent's marginal rate by stacking it on the parent's taxable income.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8615.pdf",
  notes: `**Who files.** A child with more than $2,700 of unearned income (2025) who is required to file, has at least one living parent, does not file a joint return, and is under 18, or is 18 (or a full-time student 19 through 23) with earned income not more than half of their support.

**What the engine computes.** Lines 2 (the standard amount for the year), 3, 5, 8, 9, 11, 12a, 12b, 13, 14, 15, 16, 17, and 18 using the regular tax rates for the parent's and child's filing statuses. In a full return line 4 defaults to the child's taxable income and line 18 replaces Form 1040 line 16.

**What to verify.** When the parent or any child has qualified dividends or net capital gain, lines 9, 15, and 17 must be figured with the Qualified Dividends and Capital Gain Tax Worksheet (supply those lines to override and check the worksheet boxes). The parent's return figures must be from the parent's final return for the same year; if the parents file separately, use the parent with the greater taxable income. Alternatively the parent can elect Form 8814 to report the child's income instead.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const L = LIMITS[ctx.year];
    const parent = (STATUSES.includes(c.str("parent_filing_status") as FilingStatus) ? c.str("parent_filing_status") : "single") as FilingStatus;
    const child = (STATUSES.includes(c.str("child_filing_status") as FilingStatus) ? c.str("child_filing_status") : "single") as FilingStatus;
    if (!c.has("parent_filing_status")) c.warn("parent_filing_status was not supplied; the parent's tax is figured as single.");
    let l2 = c.n("line2");
    if (!c.has("line2")) {
      const itemized = c.has("child_itemized_investment_deductions") ? Math.max(L.line2, L.half + c.n("child_itemized_investment_deductions")) : L.line2;
      l2 = c.set("line2", itemized, "Standard amount", c.has("child_itemized_investment_deductions") ? `max(${f(L.line2)}, ${f(L.half)} + ${f(c.n("child_itemized_investment_deductions"))})` : `${ctx.year} amount`, "2");
    }
    const l3 = c.set("line3", Math.max(0, c.n("line1") - l2), "Unearned income over the standard amount", `max(0, ${f(c.n("line1"))} - ${f(l2)})`, "3");
    if (c.has("line1") && l3 === 0) c.warn("Line 3 is zero: no kiddie tax applies; attach the form to the child's return without completing the rest.");
    const l5 = c.set("line5", Math.min(l3, c.n("line4")), "Net unearned income", `min(${f(l3)}, ${f(c.n("line4"))})`, "5");
    const l8 = c.set("line8", l5 + c.n("line6") + c.n("line7"), "Combined taxable income at the parent's rate", `${f(l5)} + ${f(c.n("line6"))} + ${f(c.n("line7"))}`, "8");
    const l9 = c.has("line9") ? c.n("line9") : c.set("line9", incomeTax(l8, parent, ctx.year), "Tax on line 8 (parent's status)", `tax on ${f(l8)} for ${parent}`, "9");
    if (!c.has("line10") && l5 > 0) c.warn("Line 10 (the parent's tax) was not supplied; the parent's tax is treated as zero, which overstates the child's tax.");
    const l11 = c.set("line11", Math.max(0, l9 - c.n("line10")), "Tax attributable to the children's income", `${f(l9)} - ${f(c.n("line10"))}`, "11");
    const l12a = c.set("line12a", l5 + c.n("line7"), "All children's net unearned income", `${f(l5)} + ${f(c.n("line7"))}`, "12a");
    const ratio = l12a > 0 ? Math.min(1, l5 / l12a) : 1;
    const digits = ratio >= 1 ? "000" : String(Math.round(ratio * 1000)).padStart(3, "0");
    c.setScalar("line12b", c.has("line7") && c.n("line7") > 0 ? digits : "", "This child's share (decimals)", c.has("line7") && c.n("line7") > 0 ? `${f(l5)} / ${f(l12a)} = ${ratio.toFixed(3)}` : "line 7 blank: line 13 = line 11", "12b");
    if (ratio >= 1 && c.n("line7") > 0) c.out["line12b"] = "000";
    const share = c.n("line7") > 0 ? Math.round(ratio * 1000) / 1000 : 1;
    const l13 = c.set("line13", l11 * share, "This child's share of the tax", c.n("line7") > 0 ? `${f(l11)} x ${share.toFixed(3)}` : "= line 11", "13");
    const l14 = c.set("line14", Math.max(0, c.n("line4") - l5), "Child's income taxed at the child's rate", `${f(c.n("line4"))} - ${f(l5)}`, "14");
    const l15 = c.has("line15") ? c.n("line15") : c.set("line15", l14 > 0 ? incomeTax(l14, child, ctx.year) : 0, "Tax on line 14 (child's status)", `tax on ${f(l14)} for ${child}`, "15");
    const l16 = c.set("line16", l13 + l15, "Tax under the kiddie-tax computation", `${f(l13)} + ${f(l15)}`, "16");
    const l17 = c.has("line17") ? c.n("line17") : c.set("line17", incomeTax(c.n("line4"), child, ctx.year), "Tax on line 4 (child's status)", `tax on ${f(c.n("line4"))} for ${child}`, "17");
    c.set("line18", Math.max(l16, l17), "Child's tax (Form 1040 line 16)", `max(${f(l16)}, ${f(l17)})`, "18");
    if (c.n("line1") > 0 && c.n("line1") <= L.line2) c.warn(`Unearned income of ${f(c.n("line1"))} is not more than ${f(L.line2)}: Form 8615 is not required.`);
    return c.result();
  },
};
