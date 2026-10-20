import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

/** The 2024 PDF zero-pads single-digit widget numbers (f1_01, f2_01); the 2025 PDF does not. */
const nm = (page: 1 | 2, n: number) => ({ names: { 2024: `Page${page}[0].f${page}_${String(n).padStart(2, "0")}[0]`, 2025: `Page${page}[0].f${page}_${n}[0]` } });
const money = (id: string, line: string, label: string, page: 1 | 2, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: nm(page, n), ...extra });
const comp = (id: string, line: string, label: string, page: 1 | 2, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, page, n, { computed: true, notes, ...extra });

const PER_DIEM: Record<TaxYear, number> = { 2024: 410, 2025: 420 };

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: nm(1, 1) },
  { id: "ssn", label: "Social security number of Archer MSA account holder (if both spouses have MSAs, see the instructions)", type: "ssn", maxLen: 9, locate: nm(1, 2) },
  money("line1", "1", "Total employer contributions to your Archer MSA(s) for the year", 1, 3),
  money("line2", "2", "Archer MSA contributions you made for the year, including those made by the unextended due date (not rollovers)", 1, 4),
  money("line3", "3", "Limitation from the Line 3 Limitation Chart and Worksheet (65% of the high-deductible plan deductible for self-only coverage, 75% for family, prorated by month)", 1, 5),
  money("line4", "4", "Compensation from the employer maintaining the high-deductible health plan (self-employed: net earnings from self-employment)", 1, 6),
  comp("line5", "5", "Archer MSA deduction: the smallest of line 2, 3, or 4; to Schedule 1 line 23", 1, 7, "min(2, 3, 4)", { alwaysShow: true }),
  money("line6a", "6a", "Total distributions you and your spouse received from all Archer MSAs", 1, 8),
  money("line6b", "6b", "Distributions included on line 6a that were rolled over or that were excess contributions withdrawn by the due date", 1, 9),
  comp("line6c", "6c", "Subtract line 6b from line 6a", 1, 10, "6a - 6b"),
  money("line7", "7", "Unreimbursed qualified medical expenses paid from the Archer MSA", 1, 11),
  comp("line8", "8", "Taxable Archer MSA distributions. Subtract line 7 from line 6c; not less than zero (Schedule 1 line 8e)", 1, 12, "max(0, 6c - 7)", { alwaysShow: true }),
  { id: "line9a", line: "9a", label: "An exception to the additional 20% tax applies to all of line 8 (death, disability, or age 65)", type: "checkbox", locate: { name: "Page1[0].Line9a_ReadOrder[0].c1_1[0]" } },
  comp("line9b", "9b", "Additional 20% tax on line 8 (Schedule 2 line 17e)", 1, 13, "8 x 20% unless excepted"),
  money("line10", "10", "Total distributions you received from all Medicare Advantage MSAs", 1, 14),
  money("line11", "11", "Unreimbursed qualified medical expenses paid from the Medicare Advantage MSA", 1, 15),
  comp("line12", "12", "Taxable Medicare Advantage MSA distributions. Subtract line 11 from line 10; not less than zero (Schedule 1 line 8e)", 1, 16, "max(0, 10 - 11)"),
  { id: "line13a", line: "13a", label: "An exception to the additional 50% tax applies to all of line 12", type: "checkbox", locate: { name: "Page1[0].Line13a_ReadOrder[0].c1_2[0]" } },
  comp("line13b", "13b", "Additional 50% tax on line 12 (Schedule 2 line 17f)", 1, 17, "12 x 50% unless excepted"),
  { id: "policyholder_name", line: "Section C", label: "Name of policyholder (long-term care insurance contracts)", type: "text", locate: nm(2, 1) },
  { id: "policyholder_ssn", line: "Section C", label: "Social security number of policyholder", type: "ssn", maxLen: 9, locate: nm(2, 2) },
  { id: "multiple_section_c", label: "More than one Section C is attached", type: "checkbox", locate: { name: "Page2[0].c2_1[0]" } },
  { id: "line14a", line: "14a", label: "Name of insured", type: "text", locate: nm(2, 3) },
  { id: "line14b", line: "14b", label: "Social security number of insured", type: "ssn", maxLen: 9, locate: nm(2, 4) },
  { id: "line15", line: "15", label: "Did anyone other than you receive payments on a per diem or other periodic basis under a qualified LTC contract covering the insured?", type: "yesno", locate: { yes: { name: "Page2[0].c2_2[0]" }, no: { name: "Page2[0].c2_2[1]" } } },
  { id: "line16", line: "16", label: "Was the insured a terminally ill individual?", type: "yesno", locate: { yes: { name: "Page2[0].c2_3[0]" }, no: { name: "Page2[0].c2_3[1]" } } },
  money("line17", "17", "Gross LTC payments received on a per diem or other periodic basis (Form 1099-LTC box 1 with the per diem box checked)", 2, 5),
  money("line18", "18", "Part of line 17 from qualified LTC insurance contracts", 2, 6),
  money("line19", "19", "Accelerated death benefits received on a per diem basis because the insured was chronically ill", 2, 7),
  comp("line20", "20", "Add lines 18 and 19", 2, 8, "18 + 19"),
  { id: "ltc_days", label: "Number of days in the LTC period (days the insured was chronically ill and payments were received)", type: "integer", noPdf: true },
  comp("line21", "21", "Per diem limit: $420 (2025; $410 for 2024) times the number of days in the LTC period", 2, 9, "per diem x days"),
  money("line22", "22", "Costs incurred for qualified LTC services provided for the insured during the LTC period", 2, 10),
  comp("line23", "23", "The larger of line 21 or line 22", 2, 11, "max(21, 22)"),
  money("line24", "24", "Reimbursements for qualified LTC services provided for the insured during the LTC period", 2, 12),
  comp("line25", "25", "Per diem limitation. Subtract line 24 from line 23", 2, 13, "23 - 24"),
  comp("line26", "26", "Taxable payments. Subtract line 25 from line 20; not less than zero (Schedule 1 line 8e, \"LTC\")", 2, 14, "max(0, 20 - 25)", { alwaysShow: true }),
];

export const form8853: FormDef = {
  id: "f8853",
  title: "Form 8853, Archer MSAs and Long-Term Care Insurance Contracts",
  shortTitle: "Form 8853",
  description: "Archer medical savings account contributions and distributions, Medicare Advantage MSA distributions, and the taxable part of per diem long-term care insurance payments and accelerated death benefits.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8853.pdf",
  notes: `**Who files.** Anyone (or whose employer) contributed to an Archer MSA, who received Archer MSA or Medicare Advantage MSA distributions, or who received per diem payments under a long-term care insurance contract or accelerated death benefits (Form 1099-LTC).

**What the engine computes.** The Archer MSA deduction (line 5, the smallest of contributions, the limitation, and compensation), taxable distributions (lines 6c, 8, 12) and the 20% and 50% additional taxes (lines 9b, 13b, unless an exception is checked), and the LTC per diem limitation (lines 20, 21, 23, 25, 26) at $420 a day for 2025 ($410 for 2024). In a full return line 5 goes to Schedule 1 line 23, lines 8, 12, and 26 to Schedule 1 line 8e, and the additional taxes to Schedule 2 line 17.

**What to verify.** Archer MSAs are only available to self-employed people and employees of small employers who were covered before 2008; most taxpayers have HSAs (Form 8889) instead. The per diem limit applies per insured, combined across all payees (line 15). Reimbursement-basis LTC payments are not reported here.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l5 = c.set("line5", c.has("line2") ? Math.min(c.n("line2"), c.has("line3") ? c.n("line3") : Infinity, c.has("line4") ? c.n("line4") : Infinity) : 0, "Archer MSA deduction", `min(${f(c.n("line2"))}, ${c.has("line3") ? f(c.n("line3")) : "no limit"}, ${c.has("line4") ? f(c.n("line4")) : "no compensation limit"})`, "5");
    if (c.has("line2") && (!c.has("line3") || !c.has("line4"))) c.warn("Supply line 3 (the annual limitation) and line 4 (compensation) so the deduction can be limited correctly.");
    if (c.n("line1") > 0 && c.n("line2") > 0) c.warn("Both employer and employee contributions were made: contributions to an Archer MSA in a year are allowed from only one of them.");
    const l6c = c.set("line6c", c.n("line6a") - c.n("line6b"), "Distributions after rollovers and returned excess", `${f(c.n("line6a"))} - ${f(c.n("line6b"))}`, "6c");
    const l8 = c.set("line8", Math.max(0, l6c - c.n("line7")), "Taxable Archer MSA distributions", `max(0, ${f(l6c)} - ${f(c.n("line7"))})`, "8");
    c.set("line9b", c.bool("line9a") ? 0 : l8 * 0.2, "Additional 20% tax", c.bool("line9a") ? "exception applies" : `${f(l8)} x 20%`, "9b");
    const l12 = c.set("line12", Math.max(0, c.n("line10") - c.n("line11")), "Taxable Medicare Advantage MSA distributions", `max(0, ${f(c.n("line10"))} - ${f(c.n("line11"))})`, "12");
    c.set("line13b", c.bool("line13a") ? 0 : l12 * 0.5, "Additional 50% tax", c.bool("line13a") ? "exception applies" : `${f(l12)} x 50%`, "13b");
    const ltc = ["line17", "line18", "line19", "line22", "ltc_days"].some((k) => c.has(k));
    if (ltc) {
      const l20 = c.set("line20", c.n("line18") + c.n("line19"), "Per diem LTC payments and accelerated death benefits", `${f(c.n("line18"))} + ${f(c.n("line19"))}`, "20");
      const days = c.n("ltc_days");
      if (!c.has("ltc_days") && l20 > 0) c.warn("Supply ltc_days (the number of days in the LTC period) for the line 21 per diem limit.");
      const l21 = c.set("line21", PER_DIEM[ctx.year] * days, "Per diem limit", `${f(PER_DIEM[ctx.year])} x ${days} days`, "21");
      const l23 = c.set("line23", Math.max(l21, c.n("line22")), "Larger of the per diem limit or actual costs", `max(${f(l21)}, ${f(c.n("line22"))})`, "23");
      const l25 = c.set("line25", Math.max(0, l23 - c.n("line24")), "Per diem limitation", `${f(l23)} - ${f(c.n("line24"))}`, "25");
      c.set("line26", Math.max(0, l20 - l25), "Taxable LTC payments", `max(0, ${f(l20)} - ${f(l25)})`, "26");
      if (c.n("line18") > c.n("line17")) c.warn("Line 18 cannot exceed line 17.");
      if (c.bool("line16") && c.n("line19") > 0) c.warn("The insured was terminally ill: accelerated death benefits paid for a terminally ill insured are excluded in full and do not go on line 19.");
    } else {
      c.set("line26", 0, "Taxable LTC payments", "no Section C entries", "26");
    }
    if (l5 > 0) c.warn("Enter line 5 on Schedule 1 line 23 (Archer MSA deduction); a full return does this automatically.");
    return c.result();
  },
};
