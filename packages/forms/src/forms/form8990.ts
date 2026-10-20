import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const P2 = (n: number) => `Page2[0].f2_${n}[0]`;
const P3 = (n: number) => `Page3[0].f3_${n}[0]`;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });
const yn = (n: number) => ({ yes: { name: `Page1[0].c1_${n}[0]` }, no: { name: `Page1[0].c1_${n}[1]` } });
const schedA = (col: number, rows = 6) => Array.from({ length: rows }, (_, r) => `Page3[0].Table_ScheduleA[0].Row${r + 1}[0].f3_${1 + r * 9 + col}[0]`);
const schedB = (col: number, rows = 5) => Array.from({ length: rows }, (_, r) => `Page3[0].Table_ScheduleB[0].Row${r + 1}[0].f3_${58 + r * 4 + col}[0]`);

const fields: FieldDef[] = [
  { id: "name", label: "Taxpayer name(s) shown on tax return", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Identification number", type: "text", maxLen: 11, locate: { name: P1(2) } },
  { id: "entity_type", label: "\"individual\" (default), \"partnership\", or \"s_corporation\" (Parts II and III apply only to pass-through entities)", type: "choice", choices: ["individual", "partnership", "s_corporation"] },
  { id: "foreign_entity_name", line: "A", label: "If the form relates to an information return for a foreign entity: name of the foreign entity", type: "text", locate: { name: P1(3) } },
  { id: "foreign_entity_ein", line: "A", label: "Foreign entity's employer identification number, if any", type: "text", maxLen: 10, locate: { name: P1(4) } },
  { id: "foreign_entity_reference", line: "A", label: "Foreign entity's reference ID number", type: "text", locate: { name: P1(5) } },
  { id: "lineB", line: "B", label: "Is the foreign entity a CFC group member?", type: "yesno", locate: yn(1) },
  { id: "lineC", line: "C", label: "Is this Form 8990 filed by the specified group parent for an entire CFC group?", type: "yesno", locate: yn(2) },
  { id: "lineD", line: "D", label: "Has a CFC or a CFC group made a safe harbor election?", type: "yesno", locate: yn(3) },
  money("line1", "1", "Current-year business interest expense (not including floor plan financing interest expense), before the section 163(j) limitation", P1(6)),
  money("line2", "2", "Disallowed business interest expense carryforwards from prior years", P1(7)),
  comp("line3", "3", "Partner's excess business interest expense treated as paid or accrued in the current year (Schedule A line 44, column (h))", P1(8), "Schedule A column (h) total"),
  money("line4", "4", "Floor plan financing interest expense", P1(9)),
  comp("line5", "5", "Total business interest expense. Add lines 1 through 4", P1(10), "1 + 2 + 3 + 4", { alwaysShow: true }),
  money("line6", "6", "Tentative taxable income (taxable income computed without regard to the section 163(j) limitation)", P1(11)),
  money("line7", "7", "Any item of loss or deduction not properly allocable to a trade or business", P1(12)),
  money("line8", "8", "Any business interest expense not from a pass-through entity", P1(13)),
  money("line9", "9", "Net operating loss deduction under section 172", P1(14)),
  money("line10", "10", "Qualified business income deduction allowed under section 199A", P1(15)),
  money("line11", "11", "Depreciation, amortization, or depletion attributable to a trade or business (tax years beginning after 2024 only, under section 163(j)(8)(A)(v))", P1(16)),
  money("line12", "12", "Loss or deduction items from a pass-through entity", P1(17)),
  money("line13", "13", "Other additions", P1(18)),
  comp("line14", "14", "Total current-year partner's excess taxable income (Schedule A line 44, column (f))", P1(19), "Schedule A column (f) total"),
  comp("line15", "15", "Total current-year S corporation shareholder's excess taxable income (Schedule B line 46, column (c))", P1(20), "Schedule B column (c) total"),
  comp("line16", "16", "Total. Add lines 7 through 15", P1(21), "7 + 8 + 9 + 10 + 11 + 12 + 13 + 14 + 15"),
  money("line17", "17", "Any item of income or gain not properly allocable to a trade or business (reduction)", P1(22)),
  money("line18", "18", "Any business interest income not from a pass-through entity (reduction)", P1(23)),
  money("line19", "19", "Income or gain items from a pass-through entity (reduction)", P1(24)),
  money("line20", "20", "Other reductions", P1(25)),
  comp("line21", "21", "Total reductions. Combine lines 17 through 20 (shown in parentheses)", P1(26), "17 + 18 + 19 + 20"),
  comp("line22", "22", "Adjusted taxable income. Combine lines 6, 16, and 21", P1(27), "6 + 16 - 21", { alwaysShow: true }),
  money("line23", "23", "Current-year business interest income", P2(1)),
  comp("line24", "24", "Excess business interest income from pass-through entities (Schedule A column (g) plus Schedule B column (d))", P2(2), "Schedule A (g) + Schedule B (d)"),
  comp("line25", "25", "Total business interest income. Add lines 23 and 24", P2(3), "23 + 24"),
  comp("line26", "26", "30% of the adjusted taxable income on line 22 (zero if line 22 is negative)", P2(4), "max(0, 22) x 30%"),
  comp("line27", "27", "Business interest income (line 25)", P2(5), "= line 25"),
  comp("line28", "28", "Floor plan financing interest expense (line 4)", P2(6), "= line 4"),
  comp("line29", "29", "Total. Add lines 26, 27, and 28", P2(7), "26 + 27 + 28"),
  comp("line30", "30", "Total current-year business interest expense deduction: the smaller of line 5 or line 29", P2(8), "min(5, 29)", { alwaysShow: true }),
  comp("line31", "31", "Disallowed business interest expense. Subtract line 29 from line 5; not less than zero (carried forward)", P2(9), "max(0, 5 - 29)", { alwaysShow: true }),
  comp("line32", "32", "Part II (partnerships): excess business interest expense (line 31)", P2(10), "= line 31"),
  comp("line33", "33", "Subtract the sum of lines 4 and 25 from line 5; not less than zero", P2(11), "max(0, 5 - 4 - 25)"),
  comp("line34", "34", "Subtract line 33 from line 26; not less than zero", P2(12), "max(0, 26 - 33)"),
  { id: "line35", line: "35", label: "Divide line 34 by line 26, as a decimal (whole-number part)", type: "text", computed: true, maxLen: 1, locate: { name: P2(13) } },
  { id: "line35_decimals", line: "35", label: "Line 35 decimal places", type: "text", computed: true, maxLen: 4, locate: { name: P2(14) } },
  comp("line36", "36", "Excess taxable income. Multiply line 35 by line 22", P2(15), "35 x 22"),
  comp("line37", "37", "Excess business interest income. Subtract the sum of lines 1, 2, and 3 from line 25; not less than zero", P2(16), "max(0, 25 - 1 - 2 - 3)"),
  comp("line38", "38", "Part III (S corporations): subtract the sum of lines 4 and 25 from line 5; not less than zero", P2(17), "max(0, 5 - 4 - 25)"),
  comp("line39", "39", "Subtract line 38 from line 26; not less than zero", P2(18), "max(0, 26 - 38)"),
  { id: "line40", line: "40", label: "Divide line 39 by line 26, as a decimal (whole-number part)", type: "text", computed: true, maxLen: 1, locate: { name: "Page2[0].f1_19[0]" } },
  { id: "line40_decimals", line: "40", label: "Line 40 decimal places", type: "text", computed: true, maxLen: 4, locate: { name: "Page2[0].f1_20[0]" } },
  comp("line41", "41", "Excess taxable income. Multiply line 40 by line 22", P2(21), "40 x 22"),
  comp("line42", "42", "Excess business interest income. Subtract the sum of lines 1, 2, and 3 from line 25; not less than zero", P2(22), "max(0, 25 - 1 - 2 - 3)"),
  {
    id: "partnerships",
    line: "43",
    label: "Schedule A: partnerships subject to section 163(j) in which you own an interest (up to 6 rows)",
    type: "list",
    rows: 6,
    items: [
      { id: "name", label: "(a) Name of partnership", type: "text" },
      { id: "ein", label: "(b) EIN", type: "text", maxLen: 10 },
      { id: "current_excess_expense", label: "(c) Current-year excess business interest expense", type: "money" },
      { id: "prior_excess_expense", label: "(d) Prior-year excess business interest expense carryforward", type: "money" },
      { id: "total_excess_expense", label: "(e) Total: (c) plus (d)", type: "money", computed: true },
      { id: "excess_taxable_income", label: "(f) Current-year excess taxable income", type: "money" },
      { id: "excess_interest_income", label: "(g) Current-year excess business interest income", type: "money" },
      { id: "treated_as_paid", label: "(h) Excess business interest expense treated as paid or accrued: the smaller of (e) or (f) plus (g)", type: "money", computed: true },
      { id: "carryforward", label: "(i) Excess business interest expense carryforward: (e) minus (h)", type: "money", computed: true },
    ],
    listLocate: both({
      name: schedA(0), ein: schedA(1), current_excess_expense: schedA(2), prior_excess_expense: schedA(3), total_excess_expense: schedA(4),
      excess_taxable_income: schedA(5), excess_interest_income: schedA(6), treated_as_paid: schedA(7), carryforward: schedA(8),
    }),
  },
  comp("line44_f", "44(f)", "Schedule A totals: column (f)", P3(55), "sum of column (f)"),
  comp("line44_g", "44(g)", "Schedule A totals: column (g)", P3(56), "sum of column (g)"),
  comp("line44_h", "44(h)", "Schedule A totals: column (h)", P3(57), "sum of column (h)"),
  {
    id: "s_corporations",
    line: "45",
    label: "Schedule B: S corporations subject to section 163(j) in which you are a shareholder (up to 5 rows)",
    type: "list",
    rows: 5,
    items: [
      { id: "name", label: "(a) Name of S corporation", type: "text" },
      { id: "ein", label: "(b) EIN", type: "text", maxLen: 10 },
      { id: "excess_taxable_income", label: "(c) Current-year excess taxable income", type: "money" },
      { id: "excess_interest_income", label: "(d) Current-year excess business interest income", type: "money" },
    ],
    listLocate: both({ name: schedB(0), ein: schedB(1), excess_taxable_income: schedB(2), excess_interest_income: schedB(3) }),
  },
  comp("line46_c", "46(c)", "Schedule B totals: column (c)", P3(78), "sum of column (c)"),
  comp("line46_d", "46(d)", "Schedule B totals: column (d)", P3(79), "sum of column (d)"),
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
const decimal = (x: number): [string, string] => {
  const v = Math.min(1, Math.max(0, x));
  const whole = Math.floor(v + 1e-9);
  return [String(whole), String(Math.round((v - whole) * 10000)).padStart(4, "0")];
};

export const form8990: FormDef = {
  id: "f8990",
  title: "Form 8990, Limitation on Business Interest Expense Under Section 163(j)",
  shortTitle: "Form 8990",
  description: "Limits the business interest expense deduction to business interest income plus 30% of adjusted taxable income plus floor plan financing interest, tracks the disallowed carryforward, and summarizes pass-through excess items on Schedules A and B.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8990.pdf",
  notes: `**Who files.** Taxpayers with business interest expense who are not exempt small businesses (average annual gross receipts over $31 million for 2025; $30 million for 2024), plus partners and S corporation shareholders who receive excess business interest expense or excess taxable income on Schedule K-1 from a partnership or S corporation subject to the limit.

**What the engine computes.** Part I: lines 3, 5, 14, 15, 16, 21, 22 (adjusted taxable income), 24, 25, 26 (30% of ATI), 27 through 31 (the allowed deduction and the disallowed carryforward); Schedule A columns (e), (h), (i) and the line 44 totals; Schedule B line 46 totals; and Parts II and III when entity_type is a partnership or S corporation.

**What to verify.** Tentative taxable income (line 6) is computed as if all business interest were deductible. For tax years beginning after 2024, depreciation, amortization, and depletion are added back on line 11 (restored EBITDA-based limit under Public Law 119-21). Real property and farming businesses may elect out of the limit; electing out requires ADS depreciation.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const entity = c.str("entity_type") || "individual";
    const partnerships = c.list("partnerships");
    const sCorps = c.list("s_corporations");
    if (partnerships.length > 6) c.warn("More than 6 partnerships: only the first 6 print; attach a statement.");
    if (sCorps.length > 5) c.warn("More than 5 S corporations: only the first 5 print; attach a statement.");
    const outA: ListRow[] = partnerships.map((r) => {
      const e = num(r, "current_excess_expense") + num(r, "prior_excess_expense");
      const h = Math.min(e, num(r, "excess_taxable_income") + num(r, "excess_interest_income"));
      return { ...r, total_excess_expense: e, treated_as_paid: h, carryforward: Math.max(0, e - h) };
    });
    c.out["partnerships"] = outA;
    const sum = (rows: ListRow[], k: string) => rows.reduce((a, r) => a + num(r, k), 0);
    const l44f = c.set("line44_f", sum(outA, "excess_taxable_income"), "Partners' excess taxable income", "Schedule A column (f)", "44(f)");
    const l44g = c.set("line44_g", sum(outA, "excess_interest_income"), "Partners' excess business interest income", "Schedule A column (g)", "44(g)");
    const l44h = c.set("line44_h", sum(outA, "treated_as_paid"), "Excess business interest expense treated as paid", "Schedule A column (h)", "44(h)");
    const l46c = c.set("line46_c", sum(sCorps, "excess_taxable_income"), "Shareholders' excess taxable income", "Schedule B column (c)", "46(c)");
    const l46d = c.set("line46_d", sum(sCorps, "excess_interest_income"), "Shareholders' excess business interest income", "Schedule B column (d)", "46(d)");
    const l3 = c.set("line3", l44h, "Partner's excess business interest expense treated as paid", "Schedule A line 44(h)", "3");
    const l5 = c.set("line5", c.n("line1") + c.n("line2") + l3 + c.n("line4"), "Total business interest expense", `${f(c.n("line1"))} + ${f(c.n("line2"))} + ${f(l3)} + ${f(c.n("line4"))}`, "5");
    const l14 = c.set("line14", l44f, "Partners' excess taxable income", "Schedule A line 44(f)", "14");
    const l15 = c.set("line15", l46c, "Shareholders' excess taxable income", "Schedule B line 46(c)", "15");
    const l16 = c.set("line16", c.sum(["line7", "line8", "line9", "line10", "line11", "line12", "line13"]) + l14 + l15, "Additions", "7 + 8 + 9 + 10 + 11 + 12 + 13 + 14 + 15", "16");
    const l21 = c.set("line21", Math.abs(c.sum(["line17", "line18", "line19", "line20"])), "Reductions", "17 + 18 + 19 + 20", "21");
    const l22 = c.set("line22", c.n("line6") + l16 - l21, "Adjusted taxable income", `${f(c.n("line6"))} + ${f(l16)} - ${f(l21)}`, "22");
    if (c.n("line11") > 0 && ctx.year === 2024) c.warn("Line 11 (depreciation, amortization, depletion add-back) applies only to tax years beginning after 2024.");
    const l24 = c.set("line24", l44g + l46d, "Excess business interest income from pass-throughs", `${f(l44g)} + ${f(l46d)}`, "24");
    const l25 = c.set("line25", c.n("line23") + l24, "Total business interest income", `${f(c.n("line23"))} + ${f(l24)}`, "25");
    const l26 = c.set("line26", Math.max(0, l22) * 0.3, "30% of adjusted taxable income", `max(0, ${f(l22)}) x 30%`, "26");
    const l27 = c.set("line27", l25, "Business interest income", "= line 25", "27");
    const l28 = c.set("line28", c.n("line4"), "Floor plan financing interest", "= line 4", "28");
    const l29 = c.set("line29", l26 + l27 + l28, "Section 163(j) limitation", `${f(l26)} + ${f(l27)} + ${f(l28)}`, "29");
    c.set("line30", Math.min(l5, l29), "Deductible business interest expense", `min(${f(l5)}, ${f(l29)})`, "30");
    const l31 = c.set("line31", Math.max(0, l5 - l29), "Disallowed business interest expense (carryforward)", `max(0, ${f(l5)} - ${f(l29)})`, "31");
    if (entity === "partnership") {
      c.set("line32", l31, "Excess business interest expense", "= line 31", "32");
      const l33 = c.set("line33", Math.max(0, l5 - c.n("line4") - l25), "Interest expense over interest income", `max(0, ${f(l5)} - ${f(c.n("line4"))} - ${f(l25)})`, "33");
      const l34 = c.set("line34", Math.max(0, l26 - l33), "Unused 30% capacity", `max(0, ${f(l26)} - ${f(l33)})`, "34");
      const ratio = l26 > 0 ? l34 / l26 : 0;
      const [w, d] = decimal(ratio);
      c.setScalar("line35", w, "Excess taxable income ratio (whole)", `${f(l34)} / ${f(l26)} = ${ratio.toFixed(4)}`, "35");
      c.setScalar("line35_decimals", d, "Excess taxable income ratio (decimals)", ratio.toFixed(4), "35");
      c.set("line36", Math.round(ratio * 10000) / 10000 * l22, "Excess taxable income", `${ratio.toFixed(4)} x ${f(l22)}`, "36");
      c.set("line37", Math.max(0, l25 - c.n("line1") - c.n("line2") - l3), "Excess business interest income", `max(0, ${f(l25)} - ${f(c.n("line1") + c.n("line2") + l3)})`, "37");
    } else if (entity === "s_corporation") {
      const l38 = c.set("line38", Math.max(0, l5 - c.n("line4") - l25), "Interest expense over interest income", `max(0, ${f(l5)} - ${f(c.n("line4"))} - ${f(l25)})`, "38");
      const l39 = c.set("line39", Math.max(0, l26 - l38), "Unused 30% capacity", `max(0, ${f(l26)} - ${f(l38)})`, "39");
      const ratio = l26 > 0 ? l39 / l26 : 0;
      const [w, d] = decimal(ratio);
      c.setScalar("line40", w, "Excess taxable income ratio (whole)", `${f(l39)} / ${f(l26)} = ${ratio.toFixed(4)}`, "40");
      c.setScalar("line40_decimals", d, "Excess taxable income ratio (decimals)", ratio.toFixed(4), "40");
      c.set("line41", Math.round(ratio * 10000) / 10000 * l22, "Excess taxable income", `${ratio.toFixed(4)} x ${f(l22)}`, "41");
      c.set("line42", Math.max(0, l25 - c.n("line1") - c.n("line2") - l3), "Excess business interest income", `max(0, ${f(l25)} - ${f(c.n("line1") + c.n("line2") + l3)})`, "42");
    }
    if (l31 > 0) c.warn(`${f(l31)} of business interest expense is disallowed this year and carries forward to next year's line 2; reduce the related Schedule C, E, or F interest deduction accordingly.`);
    return c.result();
  },
};
