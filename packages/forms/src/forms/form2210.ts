import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import { incomeTax } from "../tax.ts";
import type { FieldDef, FilingStatus, FormDef, ListRow, TaxYear } from "../types.ts";

/** Widget names are identical on the 2024 and 2025 forms. */
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const COLS = ["a", "b", "c", "d"] as const;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });
/** Installment due dates (month, day) and the quarterly underpayment rates in effect from each date through April 15 of the next year. */
const DUE: Array<[number, number]> = [[4, 15], [6, 15], [9, 15], [1, 15]];
/** Annual underpayment interest rates by calendar quarter start: [year, month, rate]. */
const RATES: Array<[number, number, number]> = [[2024, 1, 0.08], [2024, 4, 0.08], [2024, 7, 0.08], [2024, 10, 0.08], [2025, 1, 0.07], [2025, 4, 0.07], [2025, 7, 0.07], [2025, 10, 0.07], [2026, 1, 0.07], [2026, 4, 0.07]];
const SS_BASE: Record<TaxYear, number> = { 2024: 168600, 2025: 176100 };
const AI_PERIODS = [0.25, 5 / 12, 8 / 12, 1];
const ANNUALIZE = [4, 2.4, 1.5, 1];
const AI_PCT = [0.225, 0.45, 0.675, 0.9];
const SE_SS = [0.496, 0.2976, 0.186, 0.124];
const SE_MED = [0.116, 0.0696, 0.0435, 0.029];

function rateOn(date: Date): number {
  let r = RATES[0]![2];
  for (const [y, m, rate] of RATES) if (date >= new Date(Date.UTC(y, m - 1, 1))) r = rate;
  return r;
}
/** Simple interest at the quarterly rates between two dates (actual days / 365). */
export function penaltyBetween(amount: number, from: Date, to: Date): number {
  let total = 0;
  let cur = from;
  while (cur < to) {
    const nextQ = new Date(Date.UTC(cur.getUTCFullYear(), Math.floor(cur.getUTCMonth() / 3) * 3 + 3, 1));
    const end = nextQ < to ? nextQ : to;
    const days = Math.round((end.getTime() - cur.getTime()) / 86400000);
    total += (amount * rateOn(cur) * days) / 365;
    cur = end;
  }
  return total;
}

const sectionA = (line: number, i: number) => `Page2[0].SectionATable[0].Line${line}[0].f2_${1 + 4 * (line - 10) + i}[0]`;
const aiLine = (line: number, first: number, i: number) => `Page3[0].${line >= 28 ? "PartIITable" : "Part1Table"}[0].Line${line}[0].f3_${first + i}[0]`;
const AI_WIDGETS: Record<number, number> = { 1: 1, 3: 9, 4: 13, 6: 21, 7: 25, 8: 29, 9: 33, 10: 37, 11: 41, 12: 45, 13: 49, 14: 53, 15: 57, 16: 61, 17: 65, 18: 69, 19: 73, 21: 81, 22: 85, 23: 89, 24: 93, 25: 97, 26: 101, 27: 105, 28: 109, 30: 117, 31: 121, 33: 129, 35: 137, 36: 141 };
const AI_ITEMS: NonNullable<FieldDef["items"]> = [
  { id: "line1", label: "1 Adjusted gross income for the period (Jan 1 to Mar 31, May 31, Aug 31, Dec 31)", type: "money" },
  { id: "line3", label: "3 Annualized income", type: "money", computed: true },
  { id: "line4", label: "4 Itemized deductions for the period (0 if taking the standard deduction)", type: "money" },
  { id: "line6", label: "6 Annualized itemized deductions", type: "money", computed: true },
  { id: "line7", label: "7 Standard deduction", type: "money", computed: true },
  { id: "line8", label: "8 Larger of line 6 or line 7", type: "money", computed: true },
  { id: "line9", label: "9 Other deductions for the period (QBI, Schedule 1-A), annualized", type: "money" },
  { id: "line10", label: "10 Add lines 8 and 9", type: "money", computed: true },
  { id: "line11", label: "11 Subtract line 10 from line 3", type: "money", computed: true },
  { id: "line12", label: "12 Exemption (estates and trusts only)", type: "money" },
  { id: "line13", label: "13 Subtract line 12 from line 11", type: "money", computed: true },
  { id: "line14", label: "14 Tax on line 13", type: "money", computed: true },
  { id: "line15", label: "15 Self-employment tax from line 36", type: "money", computed: true },
  { id: "line16", label: "16 Other taxes for the period, annualized (Additional Medicare Tax, NIIT...)", type: "money" },
  { id: "line17", label: "17 Total tax", type: "money", computed: true },
  { id: "line18", label: "18 Credits for the period (nonrefundable and refundable, not withholding)", type: "money" },
  { id: "line19", label: "19 Subtract line 18 from line 17", type: "money", computed: true },
  { id: "line21", label: "21 Multiply line 19 by the applicable percentage (22.5%, 45%, 67.5%, 90%)", type: "money", computed: true },
  { id: "line22", label: "22 Total of the previous columns of line 27", type: "money", computed: true },
  { id: "line23", label: "23 Subtract line 22 from line 21", type: "money", computed: true },
  { id: "line24", label: "24 25% of line 9 (page 1)", type: "money", computed: true },
  { id: "line25", label: "25 Previous column's line 26 minus its line 27", type: "money", computed: true },
  { id: "line26", label: "26 Add lines 24 and 25", type: "money", computed: true },
  { id: "line27", label: "27 Smaller of line 23 or line 26: the required installment (to Part III line 10)", type: "money", computed: true },
  { id: "line28", label: "28 Net earnings from self-employment for the period", type: "money" },
  { id: "line30", label: "30 Social security wages and tips for the period", type: "money" },
  { id: "line31", label: "31 Prorated social security limit minus line 30", type: "money", computed: true },
  { id: "line33", label: "33 Line 32 x the smaller of line 28 or 31", type: "money", computed: true },
  { id: "line35", label: "35 Line 28 x line 34", type: "money", computed: true },
  { id: "line36", label: "36 Add lines 33 and 35 (to line 15)", type: "money", computed: true },
];
const aiLocate = Object.fromEntries(AI_ITEMS.map((it) => { const line = Number(it.id.replace("line", "")); return [it.id, COLS.map((_, i) => aiLine(line, AI_WIDGETS[line]!, i))]; }));

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on tax return", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", locate: { name: P1(2) } },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  money("line1", "1", "Tax after credits (Form 1040 line 22)", P1(3)),
  money("line2", "2", "Other taxes, including self-employment tax and the net investment income tax (Form 1040 line 23, less items the instructions exclude)", P1(4)),
  money("line3", "3", "Refundable credits (EIC, additional child tax credit, American opportunity credit, net premium tax credit), as a negative", P1(5)),
  comp("line4", "4", "Current year tax (1 + 2 + 3); under $1,000 means no penalty", P1(6), "1 + 2 + 3"),
  comp("line5", "5", "Multiply line 4 by 90%", P1(7), "4 x 0.90"),
  money("line6", "6", "Withholding taxes (Form 1040 line 25d)", P1(8)),
  comp("line7", "7", "Subtract line 6 from line 4; under $1,000 means no penalty", P1(9), "4 - 6"),
  { id: "prior_year_tax", label: "Prior year's tax (last year's Form 2210 line 4 equivalent); 0 if last year's tax was zero for a full 12-month year", type: "money" },
  { id: "prior_year_agi", label: "Prior year's adjusted gross income (110% applies above $150,000; $75,000 married filing separately)", type: "money" },
  comp("line8", "8", "Maximum required annual payment based on the prior year's tax (100%, or 110% when prior AGI exceeded $150,000)", P1(10), "prior tax x 100% or 110%"),
  comp("line9", "9", "Required annual payment: smaller of line 5 or line 8", P1(11), "min(5, 8)", { alwaysShow: true }),
  { id: "owe_penalty", label: "Is line 9 more than line 6? (no: you do not owe a penalty)", type: "yesno", computed: true, locate: { no: { name: "Page1[0].c1_1[0]" }, yes: { name: "Page1[0].c1_1[1]" } } },
  { id: "box_a_waiver", line: "A", label: "You request a waiver of your entire penalty (attach an explanation)", type: "checkbox", locate: { name: "Page1[0].c1_2[0]" } },
  { id: "box_b_partial_waiver", line: "B", label: "You request a waiver of part of your penalty", type: "checkbox", locate: { name: "Page1[0].c1_3[0]" } },
  { id: "box_c_annualized", line: "C", label: "Your income varied during the year and the penalty is reduced using the annualized income installment method (Schedule AI)", type: "checkbox", locate: { name: "Page1[0].c1_4[0]" } },
  { id: "box_d_withholding_dates", line: "D", label: "Your penalty is lower when withholding is treated as paid on the dates it was withheld", type: "checkbox", locate: { name: "Page1[0].c1_5[0]" } },
  { id: "box_e_joint_change", line: "E", label: "You filed or are filing a joint return for this year or last year, but not both", type: "checkbox", locate: { name: "Page1[0].c1_6[0]" } },
  { id: "estimated_payments", label: "Estimated tax payments made for the year (date MM/DD/YYYY and amount), including last year's overpayment applied (date it 04/15)", type: "list", noPdf: true, items: [{ id: "date", label: "Date paid", type: "text" }, { id: "amount", label: "Amount", type: "money" }] },
  { id: "withholding_by_period", label: "Box D only: withholding actually withheld in each period (4 amounts, comma separated)", type: "text" },
  ...([10, 11, 12, 13, 14, 15, 16, 17, 18] as const).flatMap((line) => COLS.map((col, i): FieldDef => ({ id: `line${line}_${col}`, line: String(line), label: `Line ${line}, column (${col}): ${["Required installment", "Estimated tax paid and tax withheld for the period", "Overpayment from the previous column (line 18)", "Add lines 11 and 12", "Lines 16 and 17 of the previous column", "Line 13 minus line 14 (payments available)", "Shortfall carried (line 14 minus line 13 when line 15 is zero)", "Underpayment", "Overpayment"][line - 10]}`, type: "money", computed: true, locate: { name: sectionA(line, i) } }))),
  comp("line19", "19", "Penalty; carried to Form 1040 line 38", "Page2[0].f2_37[0]", "sum over periods of underpayment x rate x days / 365", { alwaysShow: true }),
  { id: "ai_periods", line: "Schedule AI", label: "Annualized income installment method: one row per period (Jan 1-Mar 31, Jan 1-May 31, Jan 1-Aug 31, Jan 1-Dec 31)", type: "list", rows: 4, items: AI_ITEMS, listLocate: { 2024: aiLocate, 2025: aiLocate } },
];

export const form2210: FormDef = {
  id: "f2210",
  title: "Form 2210, Underpayment of Estimated Tax by Individuals, Estates, and Trusts",
  shortTitle: "Form 2210",
  description: "Figures whether you owe a penalty for paying too little tax during the year through withholding and estimated payments, the required installments (regular or annualized income method), and the penalty itself from the quarterly interest rates. Line 19 goes to Form 1040 line 38.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i2210.pdf",
  notes: `**When it matters.** No penalty when the balance due is under $1,000, when payments reached 90% of this year's tax or 100% of last year's (110% when last year's AGI exceeded $150,000), or when last year's tax was zero. The IRS will figure the penalty for you otherwise; file this form when you check a Part II box (waiver, annualized method, withholding dates, joint-return change).

**What the engine computes.** Lines 4, 5, 7, 8, 9; the Part III regular-method table from your dated estimated payments with withholding spread evenly (or by period with box D); the penalty on line 19 at the quarterly underpayment rates (8% through 2024, 7% from 2025) from each due date until the underpayment was paid or April 15; and Schedule AI (annualized income, standard or itemized deductions, tax by the regular rates, self-employment tax, the 22.5/45/67.5/90% installments) when box C is checked and the period rows are supplied.

**What to verify.** Line 2 should exclude household employment taxes when no withholding applies and certain other items listed in the instructions; Schedule AI line 14 uses the ordinary tax rates (capital gains at preferential rates are not refigured); farmers and fishermen use a 66 2/3% threshold and one installment, which is not implemented.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = (c.str("filing_status") || "single") as FilingStatus;
    const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
    const l4 = c.set("line4", c.n("line1") + c.n("line2") + c.n("line3"), "Current year tax", `${f(c.n("line1"))} + ${f(c.n("line2"))} + ${f(c.n("line3"))}`, "4");
    const l5 = c.set("line5", Math.round(l4 * 0.9), "90% of current year tax", `${f(l4)} x 0.90`, "5");
    const l6 = c.n("line6");
    const l7 = c.set("line7", l4 - l6, "Tax not covered by withholding", `${f(l4)} - ${f(l6)}`, "7");
    const priorAgi = c.n("prior_year_agi");
    const pct = priorAgi > (status === "mfs" ? 75000 : 150000) ? 1.1 : 1;
    const l8 = c.has("prior_year_tax") ? c.set("line8", Math.round(c.n("prior_year_tax") * pct), "Prior-year safe harbor", `${f(c.n("prior_year_tax"))} x ${pct * 100}%`, "8") : c.set("line8", l5, "Prior-year safe harbor", "prior_year_tax not supplied: using 90% of this year", "8");
    if (!c.has("prior_year_tax")) c.warn("prior_year_tax (and prior_year_agi) were not supplied; the prior-year safe harbor cannot be applied.");
    const l9 = c.set("line9", Math.min(l5, l8), "Required annual payment", `min(${f(l5)}, ${f(l8)})`, "9");
    const noPenalty = l4 < 1000 || l7 < 1000 || l9 <= l6 || (c.has("prior_year_tax") && c.n("prior_year_tax") === 0);
    c.setScalar("owe_penalty", !noPenalty, "Is line 9 more than line 6?", noPenalty ? "no: no penalty" : "yes: figure the penalty", "9");
    const yr = ctx.year;
    const due = DUE.map(([m, d], i) => new Date(Date.UTC(i === 3 ? yr + 1 : yr, m - 1, d)));
    const april15 = new Date(Date.UTC(yr + 1, 3, 15));
    if (noPenalty) {
      c.set("line19", 0, "Penalty", "none", "19");
      return c.result();
    }
    // Required installments: 25% of line 9, or Schedule AI line 27.
    const required: number[] = COLS.map(() => Math.round(l9 / 4));
    const ai = c.list("ai_periods");
    if (c.bool("box_c_annualized") && ai.length) {
      const p = params(yr);
      const out: ListRow[] = [];
      let prev27 = 0, prev26 = 0, prev27cum = 0;
      for (let i = 0; i < 4; i++) {
        const r = ai[i] ?? {};
        const l3 = Math.round(num(r, "line1") * ANNUALIZE[i]!);
        const l6 = Math.round(num(r, "line4") * ANNUALIZE[i]!);
        const l7 = p.standardDeduction[status];
        const l8v = Math.max(l6, l7);
        const l10 = l8v + num(r, "line9");
        const l11 = l3 - l10;
        const l13 = Math.max(0, l11 - num(r, "line12"));
        const l14 = Math.round(incomeTax(l13, status, yr));
        const l28 = num(r, "line28");
        const l31 = Math.max(0, Math.round(SS_BASE[yr] * AI_PERIODS[i]!) - num(r, "line30"));
        const l33 = Math.round(SE_SS[i]! * Math.min(l28, l31));
        const l35 = Math.round(l28 * SE_MED[i]!);
        const l36 = l33 + l35;
        const l17 = l14 + l36 + num(r, "line16");
        const l19 = Math.max(0, l17 - num(r, "line18"));
        const l21 = Math.round(l19 * AI_PCT[i]!);
        const l22 = prev27cum;
        const l23 = Math.max(0, l21 - l22);
        const l24 = Math.round(l9 * 0.25);
        const l25 = i === 0 ? 0 : prev26 - prev27;
        const l26 = l24 + l25;
        const l27 = Math.min(l23, l26);
        out.push({ ...r, line3: l3, line6: l6, line7: l7, line8: l8v, line10: l10, line11: l11, line13: l13, line14: l14, line15: l36, line17: l17, line19: l19, line21: l21, line22: l22, line23: l23, line24: l24, line25: l25, line26: l26, line27: l27, line31: l31, line33: l33, line35: l35, line36: l36 });
        prev27 = l27; prev26 = l26; prev27cum += l27;
        required[i] = l27;
      }
      c.out["ai_periods"] = out;
    } else if (c.bool("box_c_annualized")) c.warn("Box C is checked but no ai_periods rows were supplied; the regular method is used.");
    // Payments by period: withholding spread evenly (or by period with box D) plus estimated payments by date.
    let withholding = COLS.map(() => Math.round(l6 / 4));
    if (c.bool("box_d_withholding_dates") && c.str("withholding_by_period")) {
      const parts = c.str("withholding_by_period").split(",").map((x) => Number(x.replace(/[^\d.-]/g, "")) || 0);
      if (parts.length === 4) withholding = parts.map((x) => Math.round(x));
      else c.warn("withholding_by_period needs four comma-separated amounts; withholding was spread evenly.");
    }
    const estimated = COLS.map(() => 0);
    for (const row of c.list("estimated_payments")) {
      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(row["date"] ?? "").trim());
      const amt = num(row, "amount");
      if (!m) { c.warn(`estimated_payments: date "${String(row["date"] ?? "")}" is not MM/DD/YYYY; the payment was treated as paid in the last period.`); estimated[3] = (estimated[3] ?? 0) + amt; continue; }
      const d = new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])));
      const idx = due.findIndex((dd) => d <= dd);
      const slot = idx === -1 ? 3 : idx;
      estimated[slot] = (estimated[slot] ?? 0) + amt;
      if (idx === -1) c.warn(`A payment dated ${String(row["date"])} came after the final installment date; it does not reduce the penalty.`);
    }
    // Section A mechanics.
    const rows: Record<string, number> = {};
    const under = COLS.map(() => 0), over = COLS.map(() => 0);
    for (let i = 0; i < 4; i++) {
      const col = COLS[i]!;
      const l10 = required[i]!;
      const l11 = withholding[i]! + estimated[i]!;
      const l12 = i === 0 ? 0 : (over[i - 1] ?? 0);
      const l13 = l11 + l12;
      const l14 = i === 0 ? 0 : (rows[`line16_${COLS[i - 1]!}`] ?? 0) + (under[i - 1] ?? 0);
      const l15 = i === 0 ? l11 : Math.max(0, l13 - l14);
      const l16 = i === 0 ? 0 : l15 === 0 ? l14 - l13 : 0;
      const l17 = l10 >= l15 ? l10 - l15 : 0;
      const l18 = l15 > l10 ? l15 - l10 : 0;
      under[i] = l17; over[i] = l18;
      Object.assign(rows, { [`line10_${col}`]: l10, [`line11_${col}`]: l11, [`line12_${col}`]: l12, [`line13_${col}`]: l13, [`line14_${col}`]: l14, [`line15_${col}`]: l15, [`line16_${col}`]: l16, [`line17_${col}`]: l17, [`line18_${col}`]: l18 });
    }
    for (const [k, v] of Object.entries(rows)) c.out[k] = v;
    // Penalty: each underpayment accrues from its due date until a later period shows an overpayment, else until April 15.
    let penalty = 0;
    for (let i = 0; i < 4; i++) {
      if (under[i]! <= 0) continue;
      let paidAt = april15;
      for (let j = i + 1; j < 4; j++) if (over[j]! > 0) { paidAt = due[j]!; break; }
      penalty += penaltyBetween(under[i]!, due[i]!, paidAt);
    }
    c.set("line19", Math.round(penalty), "Estimated tax penalty", "underpayments x quarterly rates x days / 365", "19");
    if (c.bool("box_a_waiver")) c.warn("Box A (full waiver) is checked: attach an explanation; the penalty is still shown on line 19 for the IRS to consider.");
    return c.result();
  },
};
