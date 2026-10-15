import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const amt = (id: string, line: string, label: string, page: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, page: number, notes: string): FieldDef => amt(id, line, label, page, { computed: true, notes });

const OTHER_INCOME: Array<[string, string]> = [
  ["8b", "Gambling"],
  ["8c", "Cancellation of debt"],
  ["8e", "Income from Form 8853"],
  ["8f", "Income from Form 8889"],
  ["8g", "Alaska Permanent Fund dividends"],
  ["8h", "Jury duty pay"],
  ["8i", "Prizes and awards"],
  ["8j", "Activity not engaged in for profit income"],
  ["8k", "Stock options"],
  ["8l", "Income from the rental of personal property if you engaged in the rental for profit but were not in the business of renting such property"],
  ["8m", "Olympic and Paralympic medals and USOC prize money"],
  ["8n", "Section 951(a) inclusion"],
  ["8o", "Section 951A(a) inclusion"],
  ["8p", "Section 461(l) excess business loss adjustment"],
  ["8q", "Taxable distributions from an ABLE account"],
  ["8r", "Scholarship and fellowship grants not reported on Form W-2"],
  ["8t", "Pension or annuity from a nonqualified deferred compensation plan or a nongovernmental section 457 plan"],
  ["8u", "Wages earned while incarcerated"],
];

const ADJUSTMENTS: Array<[string, string]> = [
  ["11", "Educator expenses"],
  ["12", "Certain business expenses of reservists, performing artists, and fee-basis government officials (Form 2106)"],
  ["13", "Health savings account deduction (Form 8889)"],
  ["14", "Moving expenses for members of the Armed Forces (Form 3903)"],
  ["16", "Self-employed SEP, SIMPLE, and qualified plans"],
  ["17", "Self-employed health insurance deduction"],
  ["18", "Penalty on early withdrawal of savings"],
  ["19a", "Alimony paid"],
  ["20", "IRA deduction"],
  ["21", "Student loan interest deduction"],
  ["23", "Archer MSA deduction"],
];
const OTHER_ADJ: Array<[string, string]> = [
  ["24a", "Jury duty pay given to employer"],
  ["24b", "Deductible expenses related to income reported on line 8l from the rental of personal property"],
  ["24c", "Nontaxable amount of the value of Olympic and Paralympic medals and USOC prize money reported on line 8m"],
  ["24d", "Reforestation amortization and expenses"],
  ["24e", "Repayment of supplemental unemployment benefits under the Trade Act of 1974"],
  ["24f", "Contributions to section 501(c)(18)(D) pension plans"],
  ["24g", "Contributions by certain chaplains to section 403(b) plans"],
  ["24h", "Attorney fees and court costs for actions involving certain unlawful discrimination claims"],
  ["24i", "Attorney fees and court costs you paid in connection with an award from the IRS for information you provided"],
  ["24j", "Housing deduction from Form 2555"],
  ["24k", "Excess deductions of section 67(e) expenses from Schedule K-1 (Form 1041)"],
];

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on Form 1040", type: "text", locate: N("Page1[0].f1_01[0]") },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 11, locate: N("Page1[0].f1_02[0]") },
  amt("line1", "1", "Taxable refunds, credits, or offsets of state and local income taxes", 1),
  amt("line2a", "2a", "Alimony received", 1),
  { id: "line2b", line: "2b", label: "Date of original divorce or separation agreement", type: "text", locate: N("Page1[0].f1_06[0]") },
  amt("line3", "3", "Business income or (loss) from Schedule C line 31", 1, { notes: "Filled automatically from Schedule C when preparing a full return." }),
  amt("line4", "4", "Other gains or (losses) from Form 4797", 1),
  amt("line5", "5", "Rental real estate, royalties, partnerships, S corporations, trusts, etc. (Schedule E)", 1),
  amt("line6", "6", "Farm income or (loss) (Schedule F)", 1),
  amt("line7", "7", "Unemployment compensation", 1),
  amt("line8a", "8a", "Net operating loss (enter as a positive amount; it is subtracted)", 1, { locate: { names: { 2024: "Page1[0].Line8a_ReadOrder[0].f1_12[0]", 2025: "Page1[0].Line8a_ReadOrder[0].f1_13[0]" } } }),
  ...OTHER_INCOME.map(([line, label]) => amt(`line${line}`, line, label, 1)),
  amt("line8d", "8d", "Foreign earned income exclusion from Form 2555 (enter as a positive amount; it is subtracted)", 1, { locate: { names: { 2024: "Page1[0].f1_15[0]", 2025: "Page1[0].f1_16[0]" } } }),
  amt("line8s", "8s", "Nontaxable amount of Medicaid waiver payments included on Form 1040 line 1a or 1d (enter as a positive amount; it is subtracted)", 1, { locate: { names: { 2024: "Page1[0].f1_30[0]", 2025: "Page1[0].f1_31[0]" } } }),
  amt("line8v", "8v", "Digital assets received as ordinary income not reported elsewhere", 1, { years: [2025] }),
  { id: "line8z_description", line: "8z", label: "Other income: type", type: "text", locate: { names: { 2024: "Page1[0].Line8z_ReadOrder[0].f1_34[0]", 2025: "Page1[0].Line8z_ReadOrder[0].f1_35[0]" } } },
  amt("line8z", "8z", "Other income: amount", 1),
  comp("line9", "9", "Total other income", 1, "sum of lines 8a through 8z (8a, 8d, and 8s subtract)"),
  comp("line10", "10", "Combine lines 1 through 7 and 9; carried to Form 1040 line 8", 1, "line 1 + 2a + 3 + 4 + 5 + 6 + 7 + 9"),
  ...ADJUSTMENTS.map(([line, label]) => amt(`line${line}`, line, label, 2)),
  amt("line15", "15", "Deductible part of self-employment tax (Schedule SE line 13)", 2, { notes: "Filled automatically from Schedule SE when preparing a full return." }),
  { id: "line19b", line: "19b", label: "Recipient's SSN (alimony paid)", type: "ssn", maxLen: 9, locate: N("Page2[0].Line19b_CombField[0].f2_10[0]") },
  { id: "line19c", line: "19c", label: "Date of original divorce or separation agreement (alimony paid)", type: "text", locate: N("Page2[0].f2_11[0]") },
  ...OTHER_ADJ.map(([line, label]) => amt(`line${line}`, line, label, 2)),
  { id: "line24z_description", line: "24z", label: "Other adjustments: type", type: "text", locate: N("Page2[0].Line24z_ReadOrder[0].f2_27[0]") },
  amt("line24z", "24z", "Other adjustments: amount", 2),
  comp("line25", "25", "Total other adjustments", 2, "sum of lines 24a through 24z"),
  comp("line26", "26", "Total adjustments to income; carried to Form 1040 line 10", 2, "lines 11 through 23 plus line 25"),
];

export const schedule1: FormDef = {
  id: "f1040s1",
  title: "Schedule 1 (Form 1040), Additional Income and Adjustments to Income",
  shortTitle: "Schedule 1",
  description: "Part I reports income not listed on Form 1040 itself (business income, rentals, unemployment, other income). Part II reports adjustments such as the deductible half of self-employment tax, SE health insurance, and retirement plan contributions.",
  years: [2024, 2025],
  fields,
  notes: `**What this form is for.** Schedule C profit lands on line 3; the deductible half of self-employment tax lands on line 15. Line 10 carries to Form 1040 line 8 and line 26 carries to Form 1040 line 10.

**What the engine computes.** Lines 9, 10, 25, and 26. When preparing a full return, lines 3 and 15 are filled from Schedule C and Schedule SE.

**Things to verify before filing.**
- Self-employed health insurance (line 17) is limited to the net profit of the business minus the SE tax deduction and retirement contributions.
- Lines 8a, 8d, and 8s are shown in parentheses on the form; supply them as positive amounts and the engine subtracts them.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const subtract = ["line8a", "line8d", "line8s"];
    const add = [...OTHER_INCOME.map(([l]) => `line${l}`), "line8v", "line8z"];
    const parts: Array<[string, number]> = [];
    let l9 = 0;
    for (const id of add) {
      const v = c.n(id);
      if (v !== 0) parts.push([id.replace("line", ""), v]);
      l9 += v;
    }
    for (const id of subtract) {
      const v = Math.abs(c.n(id));
      if (v !== 0) parts.push([id.replace("line", ""), -v]);
      l9 -= v;
    }
    c.set("line9", l9, "Total other income", parts.length ? c.show(parts) : "no other income", "9");
    const inc = ["line1", "line2a", "line3", "line4", "line5", "line6", "line7"];
    const incParts: Array<[string, number]> = inc.map((id) => [id.replace("line", ""), c.n(id)]).filter(([, v]) => v !== 0) as Array<[string, number]>;
    if (l9 !== 0) incParts.push(["9", l9]);
    c.set("line10", c.sum(inc) + l9, "Additional income", incParts.length ? c.show(incParts) : "none", "10");

    const otherAdj = [...OTHER_ADJ.map(([l]) => `line${l}`), "line24z"];
    const adjParts: Array<[string, number]> = otherAdj.map((id) => [id.replace("line", ""), c.n(id)]).filter(([, v]) => v !== 0) as Array<[string, number]>;
    const l25 = c.set("line25", c.sum(otherAdj), "Total other adjustments", adjParts.length ? c.show(adjParts) : "none", "25");
    const adj = [...ADJUSTMENTS.map(([l]) => `line${l}`), "line15"];
    const totalParts: Array<[string, number]> = adj.map((id) => [id.replace("line", ""), c.n(id)]).filter(([, v]) => v !== 0) as Array<[string, number]>;
    if (l25 !== 0) totalParts.push(["25", l25]);
    c.set("line26", c.sum(adj) + l25, "Total adjustments to income", totalParts.length ? c.show(totalParts) : "none", "26");
    if (c.n("line17") > 0 && c.n("line3") > 0 && c.n("line17") > c.n("line3")) c.warn("Line 17 (self-employed health insurance) exceeds business income on line 3; the deduction is limited to net profit less lines 15 and 16.");
    return c.result();
  },
};
