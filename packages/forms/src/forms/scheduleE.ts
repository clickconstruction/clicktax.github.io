import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow } from "../types.ts";

/** Widget names are identical on the 2024 and 2025 PDFs. */
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const P2 = (n: number) => `Page2[0].f2_${n}[0]`;
const ABC = ["A", "B", "C"] as const;
const ABCD = ["A", "B", "C", "D"] as const;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });

/** Part I: one column per property (A, B, C). Expense lines 5-19 sit in Table_Expenses.Line{n} with widgets f1_{22 + 3*(n-5) + col}. */
const EXPENSES: Array<[string, string]> = [["line5", "Advertising"], ["line6", "Auto and travel"], ["line7", "Cleaning and maintenance"], ["line8", "Commissions"], ["line9", "Insurance"], ["line10", "Legal and other professional fees"], ["line11", "Management fees"], ["line12", "Mortgage interest paid to banks, etc."], ["line13", "Other interest"], ["line14", "Repairs"], ["line15", "Supplies"], ["line16", "Taxes"], ["line17", "Utilities"], ["line18", "Depreciation expense or depletion"], ["line19", "Other expenses (describe in line19_description)"]];
const propLocate: Record<string, string[]> = {
  address: ABC.map((r, i) => `Page1[0].Table_Line1a[0].Row${r}[0].f1_${3 + i}[0]`),
  type: ABC.map((r, i) => `Page1[0].Table_Line1b[0].Row${r}[0].f1_${6 + i}[0]`),
  fair_rental_days: ABC.map((r, i) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${9 + 2 * i}[0]`),
  personal_use_days: ABC.map((r, i) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${10 + 2 * i}[0]`),
  qjv: ABC.map((r, i) => `Page1[0].Table_Line2[0].Row${r}[0].c1_${3 + i}[0]`),
  line3: ABC.map((_, i) => `Page1[0].Table_Income[0].Line3[0].f1_${16 + i}[0]`),
  line4: ABC.map((_, i) => `Page1[0].Table_Income[0].Line4[0].f1_${19 + i}[0]`),
  // Line 19 carries a description widget (f1_64) ahead of its three amount boxes.
  ...Object.fromEntries(EXPENSES.map(([id], n) => [id, ABC.map((_, i) => `Page1[0].Table_Expenses[0].Line${n + 5}[0].f1_${22 + 3 * n + i + (n === 14 ? 1 : 0)}[0]`)])),
  line20: ABC.map((_, i) => `Page1[0].Table_Expenses[0].Line20[0].f1_${68 + i}[0]`),
  line21: ABC.map((_, i) => `Page1[0].Table_Expenses[0].Line21[0].f1_${71 + i}[0]`),
  line22: ABC.map((_, i) => `Page1[0].Table_Expenses[0].Line22[0].f1_${74 + i}[0]`),
};
const propItems: NonNullable<FieldDef["items"]> = [
  { id: "address", label: "1a Physical address (street, city, state, ZIP)", type: "text" },
  { id: "type", label: "1b Type of property code: 1 single family, 2 multi-family, 3 vacation/short-term, 4 commercial, 5 land, 6 royalties, 7 self-rental, 8 other", type: "text", maxLen: 1 },
  { id: "fair_rental_days", label: "2 Fair rental days", type: "integer" },
  { id: "personal_use_days", label: "2 Personal use days", type: "integer" },
  { id: "qjv", label: "2 QJV: qualified joint venture", type: "checkbox" },
  { id: "line3", label: "3 Rents received", type: "money" },
  { id: "line4", label: "4 Royalties received", type: "money" },
  ...EXPENSES.map(([id, label], n) => ({ id, label: `${n + 5} ${label}`, type: "money" as const })),
  { id: "line20", label: "20 Total expenses (5 through 19)", type: "money", computed: true },
  { id: "line21", label: "21 Income or (loss): 3 + 4 - 20", type: "money", computed: true },
  { id: "line22", label: "22 Deductible rental real estate loss after the Form 8582 limitation (defaults to the full line 21 loss)", type: "money" },
  { id: "prior_unallowed_loss", label: "Prior years' unallowed passive loss for this property (Form 8582 column (c))", type: "money" },
  { id: "active_participation", label: "You actively participated (default yes; set false to lose the $25,000 special allowance)", type: "checkbox" },
];
const partnerLocate: Record<string, string[]> = {
  name: ABCD.map((r, i) => `Page2[0].Table_Line28a-f[0].Row${r}[0].f2_${3 + 3 * i}[0]`),
  type: ABCD.map((r, i) => `Page2[0].Table_Line28a-f[0].Row${r}[0].f2_${4 + 3 * i}[0]`),
  foreign: ABCD.map((r, i) => `Page2[0].Table_Line28a-f[0].Row${r}[0].c2_${2 + 3 * i}[0]`),
  ein: ABCD.map((r, i) => `Page2[0].Table_Line28a-f[0].Row${r}[0].f2_${5 + 3 * i}[0]`),
  basis_computation: ABCD.map((r, i) => `Page2[0].Table_Line28a-f[0].Row${r}[0].c2_${3 + 3 * i}[0]`),
  not_at_risk: ABCD.map((r, i) => `Page2[0].Table_Line28a-f[0].Row${r}[0].c2_${4 + 3 * i}[0]`),
  passive_loss: ABCD.map((r, i) => `Page2[0].Table_Line28g-k[0].Row${r}[0].f2_${15 + 5 * i}[0]`),
  passive_income: ABCD.map((r, i) => `Page2[0].Table_Line28g-k[0].Row${r}[0].f2_${16 + 5 * i}[0]`),
  nonpassive_loss: ABCD.map((r, i) => `Page2[0].Table_Line28g-k[0].Row${r}[0].f2_${17 + 5 * i}[0]`),
  section179: ABCD.map((r, i) => `Page2[0].Table_Line28g-k[0].Row${r}[0].f2_${18 + 5 * i}[0]`),
  nonpassive_income: ABCD.map((r, i) => `Page2[0].Table_Line28g-k[0].Row${r}[0].f2_${19 + 5 * i}[0]`),
};
const estateLocate: Record<string, string[]> = {
  name: ["A", "B"].map((r, i) => `Page2[0].Table_Line33a-b[0].Row${r}[0].f2_${48 + 2 * i}[0]`),
  ein: ["A", "B"].map((r, i) => `Page2[0].Table_Line33a-b[0].Row${r}[0].f2_${49 + 2 * i}[0]`),
  passive_loss: ["A", "B"].map((r, i) => `Page2[0].Table_Line33c-f[0].Row${r}[0].f2_${52 + 4 * i}[0]`),
  passive_income: ["A", "B"].map((r, i) => `Page2[0].Table_Line33c-f[0].Row${r}[0].f2_${53 + 4 * i}[0]`),
  other_loss: ["A", "B"].map((r, i) => `Page2[0].Table_Line33c-f[0].Row${r}[0].f2_${54 + 4 * i}[0]`),
  other_income: ["A", "B"].map((r, i) => `Page2[0].Table_Line33c-f[0].Row${r}[0].f2_${55 + 4 * i}[0]`),
};
const both = <T,>(v: T) => ({ 2024: v, 2025: v });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: [P1(1), P2(1)] } },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: { name: [P1(2), P2(2)] } },
  { id: "lineA", line: "A", label: "Did you make any payments this year that would require you to file Form(s) 1099?", type: "yesno", locate: { yes: { name: "Page1[0].c1_1[0]" }, no: { name: "Page1[0].c1_1[1]" } } },
  { id: "lineB", line: "B", label: "If yes, did you or will you file required Form(s) 1099?", type: "yesno", locate: { yes: { name: "Page1[0].c1_2[0]" }, no: { name: "Page1[0].c1_2[1]" } } },
  { id: "properties", line: "1-22", label: "Rental real estate and royalty properties (up to 3: columns A, B, C)", type: "list", rows: 3, items: propItems, listLocate: both(propLocate) },
  { id: "line19_description", line: "19", label: "Other expenses: description", type: "text", locate: { name: "Page1[0].Table_Expenses[0].Line19[0].f1_64[0]" } },
  { id: "type8_description", line: "1b", label: "Type 8 (other): describe", type: "text", locate: { name: P1(15) } },
  comp("line23a", "23a", "Total of all amounts reported on line 3 for all rental properties", P1(77), "sum of line 3"),
  comp("line23b", "23b", "Total of all amounts reported on line 4 for all royalty properties", P1(78), "sum of line 4"),
  comp("line23c", "23c", "Total of all amounts reported on line 12 for all properties", P1(79), "sum of line 12"),
  comp("line23d", "23d", "Total of all amounts reported on line 18 for all properties", P1(80), "sum of line 18"),
  comp("line23e", "23e", "Total of all amounts reported on line 20 for all properties", P1(81), "sum of line 20"),
  comp("line24", "24", "Income: add positive amounts on line 21", P1(82), "sum of positive line 21"),
  comp("line25", "25", "Losses: royalty losses from line 21 and rental losses from line 22", P1(83), "sum of negative amounts (entered as a negative)"),
  comp("line26", "26", "Total rental real estate and royalty income or (loss); to Schedule 1 line 5 unless Parts II-IV apply (then line 41)", P1(84), "24 + 25", { alwaysShow: true }),
  { id: "line27", line: "27", label: "Are you reporting any loss not allowed in a prior year due to the at-risk, excess farm loss, or basis limitations, a prior year unallowed loss from a passive activity, or unreimbursed partnership expenses?", type: "yesno", locate: { yes: { name: "Page2[0].c2_1[0]" }, no: { name: "Page2[0].c2_1[1]" } } },
  {
    id: "partnerships", line: "28", label: "Partnerships and S corporations (up to 4): name, P or S, foreign?, EIN, basis computation required?, any amount not at risk?, passive loss (Form 8582), passive income (K-1), nonpassive loss (K-1), section 179 deduction, nonpassive income (K-1)", type: "list", rows: 4,
    items: [
      { id: "name", label: "(a) Name", type: "text" },
      { id: "type", label: "(b) P for partnership, S for S corporation", type: "text", maxLen: 1 },
      { id: "foreign", label: "(c) Check if foreign partnership", type: "checkbox" },
      { id: "ein", label: "(d) Employer identification number", type: "text", maxLen: 10 },
      { id: "basis_computation", label: "(e) Check if basis computation is required", type: "checkbox" },
      { id: "not_at_risk", label: "(f) Check if any amount is not at risk", type: "checkbox" },
      { id: "passive_loss", label: "(g) Passive loss allowed (Form 8582), as a positive number", type: "money" },
      { id: "passive_income", label: "(h) Passive income from Schedule K-1", type: "money" },
      { id: "nonpassive_loss", label: "(i) Nonpassive loss allowed, as a positive number", type: "money" },
      { id: "section179", label: "(j) Section 179 expense deduction from Form 4562", type: "money" },
      { id: "nonpassive_income", label: "(k) Nonpassive income from Schedule K-1", type: "money" },
    ],
    listLocate: both(partnerLocate),
  },
  comp("line29a_h", "29a", "Totals: passive income (h)", P2(36), "sum of column (h)"),
  comp("line29a_k", "29a", "Totals: nonpassive income (k)", P2(39), "sum of column (k)"),
  comp("line29b_g", "29b", "Totals: passive loss (g)", P2(40), "sum of column (g)"),
  comp("line29b_i", "29b", "Totals: nonpassive loss (i)", P2(42), "sum of column (i)"),
  comp("line29b_j", "29b", "Totals: section 179 (j)", P2(43), "sum of column (j)"),
  comp("line30", "30", "Add columns (h) and (k) of line 29a", P2(45), "29a h + k"),
  comp("line31", "31", "Add columns (g), (i), and (j) of line 29b (as a negative)", P2(46), "-(29b g + i + j)"),
  comp("line32", "32", "Total partnership and S corporation income or (loss)", P2(47), "30 + 31"),
  {
    id: "estates", line: "33", label: "Estates and trusts (up to 2): name, EIN, passive deduction or loss (Form 8582), passive income (K-1), deduction or loss (K-1), other income (K-1)", type: "list", rows: 2,
    items: [
      { id: "name", label: "(a) Name", type: "text" },
      { id: "ein", label: "(b) Employer identification number", type: "text", maxLen: 10 },
      { id: "passive_loss", label: "(c) Passive deduction or loss allowed, as a positive number", type: "money" },
      { id: "passive_income", label: "(d) Passive income from Schedule K-1", type: "money" },
      { id: "other_loss", label: "(e) Deduction or loss from Schedule K-1, as a positive number", type: "money" },
      { id: "other_income", label: "(f) Other income from Schedule K-1", type: "money" },
    ],
    listLocate: both(estateLocate),
  },
  comp("line34a_d", "34a", "Totals: passive income (d)", P2(61), "sum of column (d)"),
  comp("line34a_f", "34a", "Totals: other income (f)", P2(63), "sum of column (f)"),
  comp("line34b_c", "34b", "Totals: passive deduction or loss (c)", P2(64), "sum of column (c)"),
  comp("line34b_e", "34b", "Totals: deduction or loss (e)", P2(66), "sum of column (e)"),
  comp("line35", "35", "Add columns (d) and (f) of line 34a", P2(68), "34a d + f"),
  comp("line36", "36", "Add columns (c) and (e) of line 34b (as a negative)", P2(69), "-(34b c + e)"),
  comp("line37", "37", "Total estate and trust income or (loss)", P2(70), "35 + 36"),
  { id: "remic_name", line: "38", label: "REMIC: name", type: "text", locate: { name: "Page2[0].Table_Line38[0].Row1[0].f2_71[0]" } },
  { id: "remic_ein", line: "38", label: "REMIC: employer identification number", type: "text", maxLen: 10, locate: { name: "Page2[0].Table_Line38[0].Row1[0].f2_72[0]" } },
  money("remic_excess_inclusion", "38", "REMIC: (c) excess inclusion from Schedules Q line 2c", "Page2[0].Table_Line38[0].Row1[0].f2_73[0]"),
  money("remic_taxable_income", "38", "REMIC: (d) taxable income (net loss) from Schedules Q line 1b", "Page2[0].Table_Line38[0].Row1[0].f2_74[0]"),
  money("remic_income", "38", "REMIC: (e) income from Schedules Q line 3b", "Page2[0].Table_Line38[0].Row1[0].f2_75[0]"),
  comp("line39", "39", "Combine columns (d) and (e)", P2(76), "38 d + e"),
  money("line40", "40", "Net farm rental income or (loss) from Form 4835", P2(77)),
  comp("line41", "41", "Total income or (loss); to Schedule 1 line 5", P2(78), "26 + 32 + 37 + 39 + 40", { alwaysShow: true }),
  money("line42", "42", "Reconciliation of farming and fishing income (gross farming/fishing income from K-1s and Form 4835)", "Page2[0].Line42_ReadOrder[0].f2_79[0]"),
  money("line43", "43", "Reconciliation for real estate professionals: net income or (loss) from all rental real estate activities with material participation", P2(80)),
];

export const scheduleE: FormDef = {
  id: "f1040se",
  title: "Schedule E (Form 1040), Supplemental Income and Loss",
  shortTitle: "Schedule E",
  description: "Rental real estate and royalty income and expenses for up to three properties, plus pass-through income from partnerships, S corporations, estates, trusts, and REMICs. Line 41 (or 26) goes to Schedule 1 line 5.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040se.pdf",
  notes: `**What this form is for.** Rentals (long-term, short-term, land, commercial), royalties, and the K-1 lines from partnerships, S corporations, estates, and trusts. More than three properties need an additional Schedule E for the extra columns, with the totals on one schedule.

**What the engine computes.** Per property: line 20 (total expenses), line 21 (income or loss), and line 22 (defaults to the whole line 21 loss). Lines 23a-23e, 24, 25, 26, the Part II-IV totals (29a/29b, 30-32, 34a/34b, 35-37, 39), and line 41. Losses in Parts II and III are entered as positive numbers in their loss columns, as the form expects, and subtracted.

**What the engine does not do.** The passive activity loss limits (Form 8582, including the $25,000 special allowance with its $100,000-$150,000 AGI phaseout), the at-risk rules (Form 6198), vacation-home personal-use allocations, and depreciation for the property (Form 4562 line 18 is supplied). Review line 22 when any rental shows a loss.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const n = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
    const props = c.list("properties");
    if (props.length > 3) c.warn("More than three properties: attach another Schedule E for the additional columns.");
    let l24 = 0, l25 = 0;
    const totals = { line3: 0, line4: 0, line12: 0, line18: 0, line20: 0 };
    const outProps = props.map((r, i) => {
      const l20 = EXPENSES.reduce((a, [id]) => a + n(r, id), 0);
      const l21 = n(r, "line3") + n(r, "line4") - l20;
      const royalty = String(r["type"] ?? "") === "6" || (n(r, "line4") > 0 && n(r, "line3") === 0);
      let l22: number | undefined;
      if (l21 < 0 && !royalty) {
        l22 = r["line22"] !== undefined && r["line22"] !== "" ? -Math.abs(n(r, "line22")) : l21;
        if (r["line22"] === undefined || r["line22"] === "") c.warn(`Property ${ABC[i] ?? i + 1} shows a rental loss of ${f(l21)}; the full loss is used on line 22. Apply the Form 8582 passive loss limits if they apply and supply line22.`);
        l25 += l22;
      } else if (l21 < 0) l25 += l21;
      else l24 += l21;
      if (n(r, "personal_use_days") > 14 && n(r, "fair_rental_days") > 0) c.warn(`Property ${ABC[i] ?? i + 1} has more than 14 personal-use days: expenses may have to be allocated between rental and personal use (see instructions).`);
      if (n(r, "line19") > 0 && !c.str("line19_description")) c.warn("Line 19 other expenses need a description (line19_description).");
      totals.line3 += n(r, "line3"); totals.line4 += n(r, "line4"); totals.line12 += n(r, "line12"); totals.line18 += n(r, "line18"); totals.line20 += l20;
      return { ...r, line20: l20, line21: l21, ...(l22 !== undefined ? { line22: l22 } : {}) };
    });
    if (props.length) c.out["properties"] = outProps;
    c.set("line23a", totals.line3, "Total rents", "sum of line 3", "23a");
    c.set("line23b", totals.line4, "Total royalties", "sum of line 4", "23b");
    c.set("line23c", totals.line12, "Total mortgage interest", "sum of line 12", "23c");
    c.set("line23d", totals.line18, "Total depreciation", "sum of line 18", "23d");
    c.set("line23e", totals.line20, "Total expenses", "sum of line 20", "23e");
    c.set("line24", l24, "Income", "positive line 21 amounts", "24");
    c.set("line25", l25, "Losses", "royalty losses (21) + rental losses (22)", "25");
    const l26 = c.set("line26", l24 + l25, "Total rental and royalty income or (loss)", `${f(l24)} + ${f(l25)}`, "26");
    const partners = c.list("partnerships");
    if (partners.length > 4) c.warn("More than four partnerships/S corporations: attach another Schedule E.");
    const psum = (k: string) => partners.reduce((a, r) => a + Math.abs(n(r, k)), 0);
    const h = c.set("line29a_h", psum("passive_income"), "Passive income", "sum (h)", "29a");
    const k = c.set("line29a_k", psum("nonpassive_income"), "Nonpassive income", "sum (k)", "29a");
    const g = c.set("line29b_g", psum("passive_loss"), "Passive loss", "sum (g)", "29b");
    const i = c.set("line29b_i", psum("nonpassive_loss"), "Nonpassive loss", "sum (i)", "29b");
    const j = c.set("line29b_j", psum("section179"), "Section 179", "sum (j)", "29b");
    const l30 = c.set("line30", h + k, "Pass-through income", `${f(h)} + ${f(k)}`, "30");
    const l31 = c.set("line31", -(g + i + j), "Pass-through losses", `-(${f(g)} + ${f(i)} + ${f(j)})`, "31");
    const l32 = c.set("line32", l30 + l31, "Total partnership and S corporation income or (loss)", `${f(l30)} + ${f(l31)}`, "32");
    const estates = c.list("estates");
    const esum = (kk: string) => estates.reduce((a, r) => a + Math.abs(n(r, kk)), 0);
    const d = c.set("line34a_d", esum("passive_income"), "Passive income", "sum (d)", "34a");
    const ff = c.set("line34a_f", esum("other_income"), "Other income", "sum (f)", "34a");
    const cc = c.set("line34b_c", esum("passive_loss"), "Passive deduction or loss", "sum (c)", "34b");
    const e = c.set("line34b_e", esum("other_loss"), "Deduction or loss", "sum (e)", "34b");
    const l35 = c.set("line35", d + ff, "Estate and trust income", `${f(d)} + ${f(ff)}`, "35");
    const l36 = c.set("line36", -(cc + e), "Estate and trust losses", `-(${f(cc)} + ${f(e)})`, "36");
    const l37 = c.set("line37", l35 + l36, "Total estate and trust income or (loss)", `${f(l35)} + ${f(l36)}`, "37");
    const l39 = c.set("line39", c.n("remic_taxable_income") + c.n("remic_income"), "REMIC income", `${f(c.n("remic_taxable_income"))} + ${f(c.n("remic_income"))}`, "39");
    c.set("line41", l26 + l32 + l37 + l39 + c.n("line40"), "Total supplemental income or (loss)", `${f(l26)} + ${f(l32)} + ${f(l37)} + ${f(l39)} + ${f(c.n("line40"))}`, "41");
    if (partners.some((r) => r["not_at_risk"] === true)) c.warn("An amount not at risk is checked: Form 6198 may be required.");
    if (c.bool("lineA") && !c.has("lineB")) c.warn("Line A is yes: answer lineB (did you or will you file the required Forms 1099?).");
    return c.result();
  },
};
