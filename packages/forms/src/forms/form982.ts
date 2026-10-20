import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "line1a", line: "1a", label: "Discharge of indebtedness in a title 11 (bankruptcy) case", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "line1b", line: "1b", label: "Discharge of indebtedness to the extent insolvent (not in a title 11 case)", type: "checkbox", locate: { name: "Page1[0].c1_2[0]" } },
  { id: "line1c", line: "1c", label: "Discharge of qualified farm indebtedness", type: "checkbox", locate: { name: "Page1[0].c1_3[0]" } },
  { id: "line1d", line: "1d", label: "Discharge of qualified real property business indebtedness", type: "checkbox", locate: { name: "Page1[0].c1_4[0]" } },
  { id: "line1e", line: "1e", label: "Discharge of qualified principal residence indebtedness (discharged before 2026 under a binding written agreement)", type: "checkbox", locate: { name: "Page1[0].c1_5[0]" } },
  money("line2", "2", "Total amount of discharged indebtedness excluded from gross income", 3),
  { id: "line3", line: "3", label: "Do you elect to treat all real property held for sale to customers (inventory) as depreciable property for the basis reduction?", type: "yesno", locate: { yes: { name: "Page1[0].c1_7[0]" }, no: { name: "Page1[0].c1_7[1]" } } },
  money("line4", "4", "For qualified real property business indebtedness: applied to reduce the basis of depreciable real property", 4),
  money("line5", "5", "Amount you elect under section 108(b)(5) to apply first to reduce the basis of depreciable property", 5),
  money("line6", "6", "Applied to reduce any net operating loss of the year of the discharge or carried over to it", 6),
  money("line7", "7", "Applied to reduce any general business credit carryover to or from the year of the discharge", 7),
  money("line8", "8", "Applied to reduce any minimum tax credit as of the beginning of the year after the discharge", 8),
  money("line9", "9", "Applied to reduce any net capital loss of the year of the discharge or carried over to it", 9),
  money("line10a", "10a", "Applied to reduce the basis of nondepreciable and depreciable property if not reduced on line 5 (not for qualified farm indebtedness)", 10),
  money("line10b", "10b", "Applied to reduce the basis of your principal residence (only when line 1e is checked)", 11),
  money("line11a", "11a", "Qualified farm indebtedness: applied to reduce the basis of depreciable property used in a trade or business or for the production of income", 12),
  money("line11b", "11b", "Qualified farm indebtedness: land used or held for use in a farming business", 13),
  money("line11c", "11c", "Qualified farm indebtedness: other property used in a trade or business or for the production of income", 14),
  money("line12", "12", "Applied to reduce any passive activity loss and credit carryovers from the year of the discharge", 15),
  money("line13", "13", "Applied to reduce any foreign tax credit carryover to or from the year of the discharge", 16),
  { id: "total_reductions", label: "Total tax attribute reductions (lines 4 through 13)", type: "money", computed: true, noPdf: true },
  money("part3_amount", "Part III", "Corporate consent (section 1082(a)(2)): amount excluded under section 1081(b)", 17),
  { id: "part3_year_begin", line: "Part III", label: "Tax year beginning", type: "text", locate: { name: P(18) } },
  { id: "part3_year_end", line: "Part III", label: "Tax year ending", type: "text", locate: { name: P(19) } },
  { id: "part3_state", line: "Part III", label: "State of incorporation", type: "text", locate: { name: P(20) } },
];

export const form982: FormDef = {
  id: "f982",
  title: "Form 982, Reduction of Tax Attributes Due to Discharge of Indebtedness",
  shortTitle: "Form 982",
  description: "Excludes canceled debt from income (bankruptcy, insolvency, qualified farm or real property business debt, or qualified principal residence debt) and shows the tax attributes reduced in exchange.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f982.pdf",
  notes: `**Who files.** Anyone who received a Form 1099-C (or otherwise had debt canceled) and qualifies to exclude the canceled amount from income under one of the line 1 exclusions. Without an exclusion, canceled debt is income on Schedule 1 line 8c.

**What the engine does.** Fills the exclusion boxes, line 2, and the attribute reductions in Part II, totals the reductions, and checks that the total does not exceed the excluded amount, that a residence basis reduction (line 10b) goes with line 1e, and that an insolvency exclusion does not exceed the insolvency amount you supply.

**What to verify.** The insolvency exclusion (line 1b) is limited to the amount by which liabilities exceeded the fair market value of all assets immediately before the discharge; attach the insolvency worksheet. Attributes are reduced in the order of lines 6 through 13 unless the line 5 election is made. Qualified principal residence exclusion (line 1e) applies to debt discharged before 2026 (or under a written agreement entered before 2026) and reduces the home's basis, not below zero.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const boxes = ["line1a", "line1b", "line1c", "line1d", "line1e"].filter((k) => c.bool(k));
    if (!boxes.length && c.n("line2") > 0) c.warn("Check at least one line 1 exclusion box (line1a through line1e).");
    const total = c.set("total_reductions", c.sum(["line4", "line5", "line6", "line7", "line8", "line9", "line10a", "line10b", "line11a", "line11b", "line11c", "line12", "line13"]), "Total tax attribute reductions", "lines 4 through 13");
    if (total > c.n("line2")) c.warn(`The attribute reductions (${f(total)}) exceed the excluded amount on line 2 (${f(c.n("line2"))}).`);
    if (c.n("line10b") > 0 && !c.bool("line1e")) c.warn("Line 10b (residence basis reduction) applies only when line 1e is checked.");
    if (c.bool("line1e") && c.n("line2") > 0 && c.n("line10b") === 0) c.warn("Line 1e: reduce the basis of your principal residence on line 10b by the excluded amount (not below zero).");
    if (c.bool("line1d") && c.n("line4") === 0 && c.n("line2") > 0) c.warn("Line 1d: the excluded qualified real property business debt reduces the basis of depreciable real property on line 4.");
    if (c.bool("line1c") && c.n("line11a") + c.n("line11b") + c.n("line11c") + c.sum(["line6", "line7", "line8", "line9", "line12", "line13"]) === 0 && c.n("line2") > 0) c.warn("Line 1c: qualified farm debt reduces the tax attributes on lines 6 through 9 and 11 through 13.");
    if (c.n("line5") > 0 && !c.has("line3")) c.warn("Answer line 3 when making the section 108(b)(5) election on line 5.");
    if (c.n("line2") > 0 && total === 0 && !c.bool("line1e")) c.warn("No tax attributes were reduced: excluded debt must reduce attributes (NOL, credits, capital losses, basis) unless none exist; attach the required statement.");
    return c.result();
  },
};
