import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

/** 2025 names are unpadded (f1_3) with table "Table_PartI"; 2024 names are zero-padded (f1_03) with table "Table_Part1". Page 2 lines are numbered two lower in 2024. */
const p1 = (n: number, year: TaxYear, prefix = "") => `Page1[0].${prefix}f1_${year === 2024 ? String(n).padStart(2, "0") : n}[0]`;
const p2 = (n: number, year: TaxYear, prefix = "") => `Page2[0].${prefix}f2_${year === 2024 ? String(n).padStart(2, "0") : n}[0]`;
const both = (n: number, page: 1 | 2 = 1, prefix = "") => ({ names: { 2024: page === 1 ? p1(n, 2024, prefix) : p2(n, 2024, prefix), 2025: page === 1 ? p1(n, 2025, prefix) : p2(n, 2025, prefix) } });
const cols = (first: number, page: 1 | 2 = 1, year: TaxYear, prefix = "") => [0, 1, 2].map((i) => (page === 1 ? p1(first + i, year, prefix) : p2(first + i, year, prefix)));
const childCols = (first: number, page: 1 | 2 = 1, year: TaxYear) => [0, 1, 2].map((i) => (page === 1 ? p1(first + i, year, `Child${i + 1}[0].`) : p2(first + i, year, `Child${i + 1}[0].`)));
const tableRow = (year: TaxYear, r: number) => `Page1[0].${year === 2024 ? "Table_Part1" : "Table_PartI"}[0].BodyRow_Child${r}[0].`;
const money = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });

const LIMITS: Record<TaxYear, { max: number; magiStart: number; refundable: number }> = { 2024: { max: 16810, magiStart: 252150, refundable: 0 }, 2025: { max: 17280, magiStart: 259190, refundable: 5000 } };
const RANGE = 40000;

const childLocate = (year: TaxYear): Record<string, string[]> => ({
  first_name: [1, 2, 3].map((r) => `${tableRow(year, r)}f1_${year === 2024 ? String(3 + (r - 1) * 4).padStart(2, "0") : 3 + (r - 1) * 4}[0]`),
  last_name: [1, 2, 3].map((r) => `${tableRow(year, r)}f1_${year === 2024 ? String(4 + (r - 1) * 4).padStart(2, "0") : 4 + (r - 1) * 4}[0]`),
  birth_year: [1, 2, 3].map((r) => `${tableRow(year, r)}f1_${year === 2024 ? String(5 + (r - 1) * 4).padStart(2, "0") : 5 + (r - 1) * 4}[0]`),
  disabled: [1, 2, 3].map((r) => `${tableRow(year, r)}c1_${1 + (r - 1) * 4}[0]`),
  special_needs: [1, 2, 3].map((r) => `${tableRow(year, r)}c1_${2 + (r - 1) * 4}[0]`),
  foreign: [1, 2, 3].map((r) => `${tableRow(year, r)}c1_${3 + (r - 1) * 4}[0]`),
  identifying_number: [1, 2, 3].map((r) => `${tableRow(year, r)}f1_${year === 2024 ? String(6 + (r - 1) * 4).padStart(2, "0") : 6 + (r - 1) * 4}[0]`),
  final: [1, 2, 3].map((r) => `${tableRow(year, r)}c1_${4 + (r - 1) * 4}[0]`),
  line2: childCols(15, 1, year),
  prior_credit: cols(18, 1, year),
  line4: cols(21, 1, year),
  line5: cols(24, 1, year),
  line6: cols(27, 1, year),
  line10: cols(34, 1, year),
  line11a: cols(37, 1, year),
  ...(year === 2025 ? { line11b: cols(40, 1, year) } : {}),
  line19: childCols(1, 2, year),
  prior_benefits: cols(4, 2, year),
  line21: cols(7, 2, year),
  benefits: cols(10, 2, year),
  line24: cols(14, 2, year),
  line28: cols(21, 2, year),
  line29: cols(24, 2, year),
});

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: both(1) },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: both(2) },
  {
    id: "children",
    line: "1",
    label: "Each eligible child (up to 3): identity, status boxes, and the per-child amounts for Parts II and III",
    type: "list",
    rows: 3,
    items: [
      { id: "first_name", label: "(a) First name", type: "text" },
      { id: "last_name", label: "(b) Last name", type: "text" },
      { id: "birth_year", label: "(c) Year of birth", type: "text", maxLen: 4 },
      { id: "disabled", label: "(d) Child was born before 2008 and was disabled", type: "checkbox" },
      { id: "special_needs", label: "(d) Child with special needs", type: "checkbox" },
      { id: "foreign", label: "(d) Foreign child", type: "checkbox" },
      { id: "identifying_number", label: "(e) Child's identifying number (SSN, ATIN, or ITIN)", type: "text", maxLen: 11 },
      { id: "final", label: "(f) Adoption became final in this year or earlier", type: "checkbox" },
      { id: "line2", label: "Line 2: maximum adoption credit per child", type: "money", computed: true },
      { id: "prior_credit", label: "Line 3: adoption credit claimed for this child in a prior year (the amount from the prior-year Form 8839)", type: "money" },
      { id: "line4", label: "Line 4: subtract line 3 from line 2", type: "money", computed: true },
      { id: "line5", label: "Line 5: qualified adoption expenses (for a special-needs adoption that became final this year, the full line 4 amount)", type: "money" },
      { id: "line6", label: "Line 6: the smaller of line 4 or line 5", type: "money", computed: true },
      { id: "line10", label: "Line 10: line 6 times the phaseout decimal", type: "money", computed: true },
      { id: "line11a", label: "Line 11a: line 6 minus line 10", type: "money", computed: true },
      { id: "line11b", label: "Line 11b (2025): refundable part, the smaller of line 11a or $5,000", type: "money", computed: true, years: [2025] },
      { id: "line19", label: "Line 19: maximum exclusion per child", type: "money", computed: true },
      { id: "prior_benefits", label: "Line 20: employer-provided adoption benefits excluded for this child in a prior year", type: "money" },
      { id: "line21", label: "Line 21: line 19 minus line 20", type: "money", computed: true },
      { id: "benefits", label: "Line 22: employer-provided adoption benefits received this year (W-2 box 12 code T)", type: "money" },
      { id: "line24", label: "Line 24: the smaller of line 21 or line 22 (line 21 for a special-needs adoption final this year)", type: "money", computed: true },
      { id: "line28", label: "Line 28: line 24 times the phaseout decimal", type: "money", computed: true },
      { id: "line29", label: "Line 29: excluded benefits, line 24 minus line 28", type: "money", computed: true },
    ],
    listLocate: { 2024: childLocate(2024), 2025: childLocate(2025) },
  },
  { id: "line3_prior", line: "3", label: "Did you file Form 8839 for a prior year for the same child?", type: "yesno", computed: true, locate: { yes: { name: "Page1[0].Line3_ReadOrder[0].Line3Checkboxes_ReadOrder[0].c1_13[0]" }, no: { name: "Page1[0].Line3_ReadOrder[0].Line3Checkboxes_ReadOrder[0].c1_13[1]" } } },
  money("line7", "7", "Modified adjusted gross income (AGI plus foreign earned income and housing exclusions and excluded Puerto Rico and American Samoa income)", both(30), { notes: "Filled from the return when preparing a full return." }),
  { id: "line8_over", line: "8", label: "Is line 7 more than $259,190 ($252,150 for 2024)?", type: "yesno", computed: true, locate: { yes: { name: "Page1[0].Line8_ReadOrder[0].c1_14[0]" }, no: { name: "Page1[0].Line8_ReadOrder[0].c1_14[1]" } } },
  comp("line8", "8", "Line 7 minus the phaseout start", both(31), "max(0, 7 - start)"),
  { id: "line9", line: "9", label: "Line 8 divided by $40,000 as a decimal (whole part)", type: "text", computed: true, maxLen: 1, locate: both(32) },
  { id: "line9_decimals", line: "9", label: "Line 9 decimal places", type: "text", computed: true, maxLen: 3, locate: both(33) },
  comp("line11c", "11c", "Refundable adoption credit: add the amounts on line 11b (2025)", both(43), "sum of line 11b", { years: [2025] }),
  comp("line12", "12", "Add the amounts on line 11a", { names: { 2024: p1(40, 2024), 2025: p1(44, 2025) } }, "sum of line 11a"),
  comp("line13", "13", "Refundable adoption credit (line 11c); to Form 1040 line 29 (2025)", both(45), "= line 11c", { years: [2025] }),
  comp("line14", "14", "Subtract line 13 from line 12 (2025)", both(46), "12 - 13", { years: [2025] }),
  money("line15", "15", "Credit carryforward from prior years (Adoption Credit Carryforward Worksheet)", { names: { 2024: p1(41, 2024), 2025: p1(47, 2025) } }),
  comp("line16", "16", "Nonrefundable credit before the tax limit (line 14 plus line 15; 2024: line 12 plus the carryforward)", { names: { 2024: p1(42, 2024), 2025: p1(48, 2025) } }, "14 + 15"),
  money("line17", "17", "Credit Limit Worksheet line 5 (tax less the credits ahead of this one)", { names: { 2024: p1(43, 2024), 2025: p1(49, 2025) } }, { notes: "Filled from the return when preparing a full return." }),
  comp("line18", "18", "Nonrefundable adoption credit: the smaller of line 16 or line 17; to Schedule 3 line 6c", { names: { 2024: p1(44, 2024), 2025: p1(50, 2025) } }, "min(16, 17)", { alwaysShow: true }),
  { id: "line20_prior", line: "20", label: "Did you receive employer-provided adoption benefits for the same child in a prior year?", type: "yesno", computed: true, locate: { yes: { names: { 2024: "Page2[0].Line18_ReadOrder[0].Line18Checkboxes_ReadOrder[0].c2_1[0]", 2025: "Page2[0].Line20_ReadOrder[0].Line20Checkboxes_ReadOrder[0].c2_1[0]" } }, no: { names: { 2024: "Page2[0].Line18_ReadOrder[0].Line18Checkboxes_ReadOrder[0].c2_1[1]", 2025: "Page2[0].Line20_ReadOrder[0].Line20Checkboxes_ReadOrder[0].c2_1[1]" } } } },
  comp("line23", "23", "Add the amounts on line 22 (total employer-provided benefits)", both(13, 2), "sum of line 22"),
  money("line25", "25", "Modified adjusted gross income for the exclusion (from the instructions worksheet)", { names: { 2024: "Page2[0].Line23_ReadOrder[0].f2_17[0]", 2025: "Page2[0].Line25_ReadOrder[0].f2_17[0]" } }, { notes: "Defaults to line 7." }),
  { id: "line26_over", line: "26", label: "Is line 25 more than the phaseout start?", type: "yesno", computed: true, locate: { yes: { names: { 2024: "Page2[0].Line24_ReadOrder[0].c2_2[0]", 2025: "Page2[0].Line26_ReadOrder[0].c2_2[0]" } }, no: { names: { 2024: "Page2[0].Line24_ReadOrder[0].c2_2[1]", 2025: "Page2[0].Line26_ReadOrder[0].c2_2[1]" } } } },
  comp("line26", "26", "Line 25 minus the phaseout start", both(18, 2), "max(0, 25 - start)"),
  { id: "line27", line: "27", label: "Line 26 divided by $40,000 as a decimal (whole part)", type: "text", computed: true, maxLen: 1, locate: both(19, 2) },
  { id: "line27_decimals", line: "27", label: "Line 27 decimal places", type: "text", computed: true, maxLen: 3, locate: both(20, 2) },
  comp("line30", "30", "Add the amounts on line 29 (excluded benefits)", both(27, 2), "sum of line 29"),
  { id: "line31_taxable", line: "31", label: "Is line 30 less than line 23? (Yes: the difference is taxable)", type: "yesno", computed: true, locate: { yes: { names: { 2024: "Page2[0].Line29_ReadOrder[0].Line29Checkboxes_ReadOrder[0].c2_3[0]", 2025: "Page2[0].Line31_ReadOrder[0].Line29Checkboxes_ReadOrder[0].c2_3[0]" } }, no: { names: { 2024: "Page2[0].Line29_ReadOrder[0].Line29Checkboxes_ReadOrder[0].c2_3[1]", 2025: "Page2[0].Line31_ReadOrder[0].Line29Checkboxes_ReadOrder[0].c2_3[1]" } } } },
  comp("line31", "31", "Taxable benefits. Subtract line 30 from line 23; not less than zero; to Form 1040 line 1f", both(28, 2), "max(0, 23 - 30)", { alwaysShow: true }),
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
const truthy = (v: unknown) => v === true || v === 1 || (typeof v === "string" && /^(true|yes|y|1|x)$/i.test(v));
const decimal = (x: number): [string, string] => {
  const v = Math.min(1, Math.max(0, x));
  const whole = Math.floor(v + 1e-9);
  return [String(whole), String(Math.round((v - whole) * 1000)).padStart(3, "0")];
};

export const form8839: FormDef = {
  id: "f8839",
  title: "Form 8839, Qualified Adoption Expenses",
  shortTitle: "Form 8839",
  description: "The adoption credit (up to $17,280 per child for 2025; $16,810 for 2024, with a refundable part up to $5,000 from 2025) and the exclusion of employer-provided adoption benefits, both phased out between $259,190 and $299,190 of modified AGI for 2025.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8839.pdf",
  notes: `**Who files.** Parents who paid qualified adoption expenses (adoption fees, court costs, attorney fees, travel) for an eligible child, adopted a child with special needs (full credit regardless of expenses in the year the adoption became final), or received employer-provided adoption benefits (W-2 box 12 code T).

**What the engine computes.** Per child: lines 2, 4, 6, 10, 11a, and for 2025 the refundable portion on line 11b; the phaseout decimal (lines 8 and 9) from modified AGI; lines 11c, 12, 13, 14, 16, and 18 (the nonrefundable credit, limited by line 17); and for employer benefits lines 19, 21, 23, 24, 26 through 31. In a full return line 7 defaults to modified AGI, line 17 to the Form 1040 tax less the credits ahead of this one, line 18 goes to Schedule 3 line 6c, line 13 to Form 1040 line 29 (2025), and line 31 to Form 1040 line 1f.

**What to verify.** Domestic adoptions: expenses paid in a year before the adoption is final are claimed the following year; foreign adoptions only when final. The same expenses cannot support both the credit and the exclusion. Unused nonrefundable credit carries forward five years (keep the worksheet for line 15). Supply prior_credit and prior_benefits for a child claimed in an earlier year.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const L = LIMITS[ctx.year];
    const children = c.list("children");
    if (children.length > 3) c.warn("More than 3 children: only the first 3 print; attach a statement for the rest.");
    const magi = c.n("line7");
    const l8 = c.set("line8", Math.max(0, magi - L.magiStart), "Modified AGI over the phaseout start", `max(0, ${f(magi)} - ${f(L.magiStart)})`, "8");
    c.out["line8_over"] = l8 > 0;
    const ratio = Math.min(1, l8 / RANGE);
    const [w9, d9] = decimal(ratio);
    c.setScalar("line9", w9, "Phaseout decimal (whole)", `${f(l8)} / ${f(RANGE)} = ${ratio.toFixed(3)}`, "9");
    c.setScalar("line9_decimals", d9, "Phaseout decimal (decimals)", ratio.toFixed(3), "9");
    const r9 = Math.round(ratio * 1000) / 1000;
    if (ratio >= 1 && children.length) c.warn(`Modified AGI of ${f(magi)} is at or above ${f(L.magiStart + RANGE)}: the adoption credit and exclusion are fully phased out.`);
    const magi25 = c.has("line25") ? c.n("line25") : magi;
    if (!c.has("line25") && children.some((r) => r["benefits"] !== undefined)) c.out["line25"] = magi25;
    const l26 = c.set("line26", Math.max(0, magi25 - L.magiStart), "Modified AGI over the phaseout start (exclusion)", `max(0, ${f(magi25)} - ${f(L.magiStart)})`, "26");
    c.out["line26_over"] = l26 > 0;
    const ratio27 = Math.min(1, l26 / RANGE);
    const [w27, d27] = decimal(ratio27);
    c.setScalar("line27", w27, "Exclusion phaseout decimal (whole)", `${f(l26)} / ${f(RANGE)} = ${ratio27.toFixed(3)}`, "27");
    c.setScalar("line27_decimals", d27, "Exclusion phaseout decimal (decimals)", ratio27.toFixed(3), "27");
    const r27 = Math.round(ratio27 * 1000) / 1000;
    const rows: ListRow[] = children.map((r) => {
      const specialFinal = truthy(r["special_needs"]) && truthy(r["final"]);
      const l4 = Math.max(0, L.max - num(r, "prior_credit"));
      const l5 = r["line5"] !== undefined ? num(r, "line5") : specialFinal ? l4 : 0;
      const l6 = Math.min(l4, l5);
      const l10 = Math.round(l6 * r9);
      const l11a = l6 - l10;
      const l21 = Math.max(0, L.max - num(r, "prior_benefits"));
      const l24 = specialFinal ? l21 : Math.min(l21, num(r, "benefits"));
      const l28 = Math.round(l24 * r27);
      return { ...r, line2: L.max, line4: l4, line5: l5, line6: l6, line10: l10, line11a: l11a, ...(ctx.year === 2025 ? { line11b: Math.min(l11a, L.refundable) } : {}), line19: L.max, line21: l21, line24: l24, line28: l28, line29: l24 - l28 };
    });
    c.out["children"] = rows;
    c.out["line3_prior"] = rows.some((r) => num(r, "prior_credit") > 0);
    c.out["line20_prior"] = rows.some((r) => num(r, "prior_benefits") > 0);
    const l12 = c.set("line12", rows.reduce((a, r) => a + num(r, "line11a"), 0), "Adoption credit before the limit", "sum of line 11a", "12");
    let nonrefundable = l12;
    if (ctx.year === 2025) {
      const l11c = c.set("line11c", rows.reduce((a, r) => a + num(r, "line11b"), 0), "Refundable adoption credit", "sum of line 11b", "11c");
      c.set("line13", l11c, "Refundable adoption credit (Form 1040 line 29)", "= line 11c", "13");
      nonrefundable = c.set("line14", Math.max(0, l12 - l11c), "Nonrefundable part", `${f(l12)} - ${f(l11c)}`, "14");
    }
    const l16 = c.set("line16", nonrefundable + c.n("line15"), "Nonrefundable credit before the tax limit", `${f(nonrefundable)} + ${f(c.n("line15"))}`, "16");
    const limited = c.has("line17");
    if (!limited && l16 > 0) c.warn("Line 17 (Credit Limit Worksheet) was not supplied; the nonrefundable credit is shown unlimited.");
    c.set("line18", limited ? Math.min(l16, c.n("line17")) : l16, "Nonrefundable adoption credit (Schedule 3 line 6c)", limited ? `min(${f(l16)}, ${f(c.n("line17"))})` : "= line 16", "18");
    const l23 = c.set("line23", rows.reduce((a, r) => a + num(r, "benefits"), 0), "Employer-provided adoption benefits", "sum of line 22", "23");
    const l30 = c.set("line30", rows.reduce((a, r) => a + num(r, "line29"), 0), "Excluded benefits", "sum of line 29", "30");
    c.out["line31_taxable"] = l30 < l23;
    c.set("line31", Math.max(0, l23 - l30), "Taxable employer-provided adoption benefits (Form 1040 line 1f)", `max(0, ${f(l23)} - ${f(l30)})`, "31");
    for (const [i, r] of rows.entries()) {
      if (truthy(r["foreign"]) && !truthy(r["final"]) && num(r, "line5") > 0) c.warn(`Child ${i + 1} is a foreign child whose adoption is not final: expenses are not allowed until the year the adoption becomes final.`);
      if (num(r, "line5") > 0 && num(r, "benefits") > 0) c.warn(`Child ${i + 1}: the same expenses cannot be used for both the credit (line 5) and the employer benefit exclusion.`);
    }
    return c.result();
  },
};
