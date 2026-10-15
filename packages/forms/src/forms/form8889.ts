import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const amt = (id: string, line: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page: 1, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on Form 1040", type: "text", locate: N("Page1[0].f1_1[0]") },
  { id: "ssn", label: "Social security number of the HSA beneficiary", type: "ssn", maxLen: 11, locate: N("Page1[0].f1_2[0]") },
  { id: "coverage", line: "1", label: "Coverage under a high-deductible health plan during the year", type: "choice", choices: ["self_only", "family"], locate: { self_only: N("Page1[0].c1_1[0]"), family: N("Page1[0].c1_1[1]") } },
  amt("line2", "2", "HSA contributions you made (or made on your behalf), excluding employer contributions, rollovers, and qualified funding distributions"),
  amt("line3", "3", "Annual contribution limit", { computed: true, notes: "Full-year limit for the coverage type ($4,150 self-only / $8,300 family for 2024; $4,300 / $8,550 for 2025). Supply line3 to override for part-year eligibility." }),
  amt("line4", "4", "Archer MSA contributions (Form 8853 line 1 and 2)"),
  comp("line5", "5", "Line 3 minus line 4", "not less than zero"),
  amt("line6", "6", "Amount from line 5 (or your share if you and your spouse split a family limit)", { computed: true, notes: "Equals line 5 unless supplied." }),
  comp("line7", "7", "Additional contribution for age 55 or older ($1,000)", "1,000 if age_55_or_older"),
  comp("line8", "8", "Add lines 6 and 7", "line 6 + line 7"),
  amt("line9", "9", "Employer contributions made to your HSAs (Form W-2 box 12 code W)"),
  amt("line10", "10", "Qualified HSA funding distributions"),
  comp("line11", "11", "Add lines 9 and 10", "line 9 + line 10"),
  comp("line12", "12", "Line 8 minus line 11", "not less than zero"),
  comp("line13", "13", "HSA deduction; carried to Schedule 1 line 13", "smaller of line 2 or line 12", { alwaysShow: true }),
  amt("line14a", "14a", "Total distributions you received from all HSAs (Form 1099-SA)"),
  amt("line14b", "14b", "Distributions rolled over or returned excess contributions"),
  comp("line14c", "14c", "Line 14a minus line 14b", "net distributions"),
  amt("line15", "15", "Qualified medical expenses paid using HSA distributions"),
  comp("line16", "16", "Taxable HSA distributions; included on Schedule 1 line 8f", "line 14c - line 15, not less than zero"),
  { id: "line17a_exception", line: "17a", label: "An exception to the additional 20% tax applies (death, disability, or age 65)", type: "checkbox", locate: N("Page1[0].c1_2[0]") },
  comp("line17b", "17b", "Additional 20% tax on taxable distributions; carried to Schedule 2 line 17c", "line 16 x 20% unless the exception applies"),
  amt("line18", "18", "Last-month rule income (you did not remain eligible)"),
  amt("line19", "19", "Qualified HSA funding distribution income (you did not remain eligible)"),
  comp("line20", "20", "Add lines 18 and 19; included on Schedule 1 line 8f", "line 18 + line 19"),
  comp("line21", "21", "Additional 10% tax; carried to Schedule 2 line 17d", "line 20 x 10%"),
];

export const form8889: FormDef = {
  id: "f8889",
  title: "Form 8889, Health Savings Accounts (HSAs)",
  shortTitle: "Form 8889",
  description: "Figures the HSA deduction (Schedule 1 line 13), taxable HSA distributions (Schedule 1 line 8f), and the additional taxes on non-medical distributions or lost eligibility (Schedule 2).",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8889.pdf",
  notes: `**What this form is for.** Your own HSA contributions are deductible up to the annual limit for your coverage type, less employer contributions; distributions are tax-free when spent on qualified medical expenses.

**What the engine computes.** Lines 3, 5, 6, 7, 8, 11, 12, 13, 14c, 16, 17b, 20, and 21. The limit on line 3 assumes eligibility all year; supply line3 for a part-year limit (the instructions' line 3 worksheet).

**Things to verify before filing.**
- Employer contributions (W-2 box 12 code W) are not deductible again; they reduce your room on line 12.
- Contributions above line 12 are excess contributions subject to Form 5329 unless withdrawn by the due date.
- The additional 20% tax on non-medical distributions does not apply after age 65 or on death or disability.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const p = params(ctx.year).hsa;
    const family = c.str("coverage") === "family";
    if (!c.has("coverage")) c.warn("coverage (line 1) is not set; the self-only limit is used.");
    const limit = c.has("line3") ? c.n("line3") : family ? p.family : p.selfOnly;
    const l3 = c.set("line3", limit, "Annual contribution limit", c.has("line3") ? "supplied" : `${family ? "family" : "self-only"} coverage for ${ctx.year}`, "3");
    const l5 = c.set("line5", Math.max(0, l3 - c.n("line4")), "Line 3 minus line 4", `max(0, ${f(l3)} - ${f(c.n("line4"))})`, "5");
    const l6 = c.set("line6", c.has("line6") ? c.n("line6") : l5, "Amount from line 5", c.has("line6") ? "supplied share" : `line 5 ${f(l5)}`, "6");
    const l7 = c.set("line7", c.bool("age_55_or_older") ? p.catchUp : 0, "Age 55 or older additional contribution", c.bool("age_55_or_older") ? `${f(p.catchUp)}` : "not 55 or older", "7");
    const l8 = c.set("line8", l6 + l7, "Add lines 6 and 7", `${f(l6)} + ${f(l7)}`, "8");
    const l11 = c.set("line11", c.n("line9") + c.n("line10"), "Employer contributions and funding distributions", `line 9 ${f(c.n("line9"))} + line 10 ${f(c.n("line10"))}`, "11");
    const l12 = c.set("line12", Math.max(0, l8 - l11), "Line 8 minus line 11", `max(0, ${f(l8)} - ${f(l11)})`, "12");
    const l2 = c.n("line2");
    c.set("line13", Math.min(l2, l12), "HSA deduction", `min(line 2 ${f(l2)}, line 12 ${f(l12)})`, "13");
    if (l2 > l12) c.warn(`Contributions on line 2 (${f(l2)}) exceed the allowable amount on line 12 (${f(l12)}); the excess is subject to Form 5329 unless withdrawn before the filing deadline.`);
    const l14c = c.set("line14c", c.n("line14a") - c.n("line14b"), "Net distributions", `14a ${f(c.n("line14a"))} - 14b ${f(c.n("line14b"))}`, "14c");
    const l16 = c.set("line16", Math.max(0, l14c - c.n("line15")), "Taxable HSA distributions", `max(0, ${f(l14c)} - line 15 ${f(c.n("line15"))})`, "16");
    const exc = c.bool("line17a_exception");
    c.set("line17b", exc ? 0 : l16 * 0.2, "Additional 20% tax", exc ? "exception applies" : `line 16 ${f(l16)} x 20%`, "17b");
    const l20 = c.set("line20", c.n("line18") + c.n("line19"), "Income from failing to remain eligible", `18 ${f(c.n("line18"))} + 19 ${f(c.n("line19"))}`, "20");
    c.set("line21", l20 * 0.1, "Additional 10% tax", `line 20 ${f(l20)} x 10%`, "21");
    return c.result();
  },
};
