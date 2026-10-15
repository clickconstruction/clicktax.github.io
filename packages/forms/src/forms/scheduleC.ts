import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const amt = (id: string, line: string, label: string, page: number, extra: Partial<FieldDef> = {}): FieldDef => ({
  id,
  line,
  label,
  type: "money",
  locate: { tok: line, page, kind: "text" },
  ...extra,
});
const comp = (id: string, line: string, label: string, page: number, notes: string): FieldDef =>
  amt(id, line, label, page, { computed: true, notes });

const PART_V_ROWS = {
  description: Array.from({ length: 9 }, (_, i) => `Page2[0].PartVTable[0].Item${i + 1}[0].f2_${15 + 2 * i}[0]`),
  amount: Array.from({ length: 9 }, (_, i) => `Page2[0].PartVTable[0].Item${i + 1}[0].f2_${16 + 2 * i}[0]`),
};

const fields: FieldDef[] = [
  { id: "name", label: "Name of proprietor", type: "text", locate: N("Page1[0].f1_1[0]") },
  { id: "ssn", label: "Social security number", type: "ssn", locate: N("Page1[0].f1_2[0]"), maxLen: 11 },
  { id: "principal_business", line: "A", label: "Principal business or profession, including product or service", type: "text", locate: N("Page1[0].f1_3[0]") },
  { id: "business_code", line: "B", label: "Principal business code (6 digits, from the Schedule C instructions)", type: "text", maxLen: 6, locate: N("Page1[0].BComb[0].f1_4[0]"), notes: "Six-digit NAICS-style code from the instructions, e.g. 238220 for plumbing/HVAC contractors." },
  { id: "business_name", line: "C", label: "Business name (leave blank if none)", type: "text", locate: N("Page1[0].f1_5[0]") },
  { id: "ein", line: "D", label: "Employer ID number (EIN)", type: "ein", maxLen: 9, locate: N("Page1[0].DComb[0].f1_6[0]"), notes: "Leave blank if the business has no EIN; do not enter the owner's SSN here." },
  { id: "address", line: "E", label: "Business address (including suite or room no.)", type: "text", locate: N("Page1[0].f1_7[0]") },
  { id: "city_state_zip", line: "E", label: "City, town or post office, state, and ZIP code", type: "text", locate: N("Page1[0].f1_8[0]") },
  { id: "accounting_method", line: "F", label: "Accounting method", type: "choice", choices: ["cash", "accrual", "other"], locate: { cash: N("Page1[0].c1_1[0]"), accrual: N("Page1[0].c1_1[1]"), other: N("Page1[0].c1_1[2]") } },
  { id: "accounting_method_other", line: "F", label: "Other accounting method (specify)", type: "text", locate: N("Page1[0].f1_9[0]") },
  { id: "material_participation", line: "G", label: "Did you materially participate in the operation of this business?", type: "yesno", locate: { yes: N("Page1[0].c1_2[0]"), no: N("Page1[0].c1_2[1]") }, notes: "Answer No only if the owner did not materially participate; losses may then be limited." },
  { id: "started_or_acquired", line: "H", label: "Started or acquired this business during the year", type: "checkbox", locate: N("Page1[0].c1_3[0]") },
  { id: "payments_require_1099", line: "I", label: "Did you make any payments that would require you to file Form(s) 1099?", type: "yesno", locate: { yes: N("Page1[0].c1_4[0]"), no: N("Page1[0].c1_4[1]") } },
  { id: "filed_required_1099", line: "J", label: "If Yes, did you or will you file required Form(s) 1099?", type: "yesno", locate: { yes: N("Page1[0].c1_5[0]"), no: N("Page1[0].c1_5[1]") } },
  { id: "statutory_employee", line: "1", label: "Statutory employee box on Form W-2 was checked", type: "checkbox", locate: { names: { 2024: "Page1[0].c1_6[0]", 2025: "Page1[0].Line1_ReadOrder[0].c1_6[0]" } } },
  amt("line1", "1", "Gross receipts or sales", 1),
  amt("line2", "2", "Returns and allowances", 1),
  comp("line3", "3", "Subtract line 2 from line 1", 1, "line 1 - line 2"),
  amt("line4", "4", "Cost of goods sold (from line 42)", 1, { notes: "Computed from Part III when lines 35-41 are supplied; otherwise enter directly." }),
  comp("line5", "5", "Gross profit", 1, "line 3 - line 4"),
  amt("line6", "6", "Other income, including federal and state gasoline or fuel tax credit or refund", 1),
  comp("line7", "7", "Gross income", 1, "line 5 + line 6"),
  amt("line8", "8", "Advertising", 1),
  amt("line9", "9", "Car and truck expenses", 1, { notes: "Standard mileage or actual expenses; complete Part IV (lines 43-47) unless Form 4562 is filed." }),
  amt("line10", "10", "Commissions and fees", 1),
  amt("line11", "11", "Contract labor", 1, { notes: "Payments to independent contractors; $600 or more to one payee generally requires Form 1099-NEC." }),
  amt("line12", "12", "Depletion", 1),
  amt("line13", "13", "Depreciation and section 179 expense deduction (not included in Part III)", 1, { notes: "Usually comes from Form 4562." }),
  amt("line14", "14", "Employee benefit programs (other than on line 19)", 1),
  amt("line15", "15", "Insurance (other than health)", 1),
  amt("line16a", "16a", "Interest: mortgage (paid to banks, etc.)", 1),
  amt("line16b", "16b", "Interest: other", 1),
  amt("line17", "17", "Legal and professional services", 1),
  amt("line18", "18", "Office expense", 1),
  amt("line19", "19", "Pension and profit-sharing plans", 1),
  amt("line20a", "20a", "Rent or lease: vehicles, machinery, and equipment", 1),
  amt("line20b", "20b", "Rent or lease: other business property", 1),
  amt("line21", "21", "Repairs and maintenance", 1),
  amt("line22", "22", "Supplies (not included in Part III)", 1),
  amt("line23", "23", "Taxes and licenses", 1),
  amt("line24a", "24a", "Travel", 1),
  amt("line24b", "24b", "Deductible meals", 1, { notes: "Enter the deductible amount (generally 50% of business meals)." }),
  amt("line25", "25", "Utilities", 1),
  amt("line26", "26", "Wages (less employment credits)", 1),
  amt("line27a", "27a", "Energy efficient commercial buildings deduction (attach Form 7205)", 1),
  amt("line27b", "27b", "Other expenses (from line 48)", 1, { notes: "Computed from Part V when other_expenses rows are supplied." }),
  comp("line28", "28", "Total expenses before expenses for business use of home", 1, "sum of lines 8 through 27b"),
  comp("line29", "29", "Tentative profit or (loss)", 1, "line 7 - line 28"),
  { id: "line30_home_sqft", line: "30", label: "Simplified method: total square footage of your home", type: "integer", locate: N("Page1[0].Line30_ReadOrder[0].f1_43[0]") },
  { id: "line30_business_sqft", line: "30", label: "Simplified method: square footage used for business", type: "integer", locate: N("Page1[0].Line30_ReadOrder[0].f1_44[0]") },
  amt("line30", "30", "Expenses for business use of your home", 1, { notes: "Form 8829 amount, or the simplified method ($5 per square foot, up to 300 square feet)." }),
  comp("line31", "31", "Net profit or (loss)", 1, "line 29 - line 30"),
  { id: "investment_at_risk", line: "32", label: "If line 31 is a loss: all investment is at risk (32a) or some investment is not at risk (32b)", type: "choice", choices: ["all", "some"], locate: { all: N("Page1[0].c1_7[0]"), some: N("Page1[0].c1_7[1]") } },
  { id: "line33_inventory_method", line: "33", label: "Method used to value closing inventory", type: "choice", choices: ["cost", "lower_of_cost_or_market", "other"], locate: { cost: N("Page2[0].c2_1[0]"), lower_of_cost_or_market: N("Page2[0].c2_2[0]"), other: N("Page2[0].c2_3[0]") } },
  { id: "line34_inventory_change", line: "34", label: "Was there any change in determining quantities, costs, or valuations between opening and closing inventory?", type: "yesno", locate: { yes: N("Page2[0].c2_4[0]"), no: N("Page2[0].c2_4[1]") } },
  amt("line35", "35", "Inventory at beginning of year", 2),
  amt("line36", "36", "Purchases less cost of items withdrawn for personal use", 2),
  amt("line37", "37", "Cost of labor (do not include amounts paid to yourself)", 2),
  amt("line38", "38", "Materials and supplies", 2),
  amt("line39", "39", "Other costs", 2),
  comp("line40", "40", "Add lines 35 through 39", 2, "line 35 + 36 + 37 + 38 + 39"),
  amt("line41", "41", "Inventory at end of year", 2),
  comp("line42", "42", "Cost of goods sold", 2, "line 40 - line 41; carried to line 4"),
  { id: "line43_vehicle_date", line: "43", label: "Date vehicle placed in service for business (MM/DD/YYYY)", type: "date_mdy", locate: { month: N("Page2[0].f2_9[0]"), day: N("Page2[0].f2_10[0]"), year: N("Page2[0].f2_11[0]") } },
  { id: "line44a_business_miles", line: "44a", label: "Business miles", type: "integer", locate: N("Page2[0].f2_12[0]") },
  { id: "line44b_commuting_miles", line: "44b", label: "Commuting miles", type: "integer", locate: N("Page2[0].f2_13[0]") },
  { id: "line44c_other_miles", line: "44c", label: "Other miles", type: "integer", locate: N("Page2[0].f2_14[0]") },
  { id: "line45_personal_use", line: "45", label: "Was your vehicle available for personal use during off-duty hours?", type: "yesno", locate: { yes: N("Page2[0].c2_5[0]"), no: N("Page2[0].c2_5[1]") } },
  { id: "line46_another_vehicle", line: "46", label: "Do you (or your spouse) have another vehicle available for personal use?", type: "yesno", locate: { yes: N("Page2[0].c2_6[0]"), no: N("Page2[0].c2_6[1]") } },
  { id: "line47a_evidence", line: "47a", label: "Do you have evidence to support your deduction?", type: "yesno", locate: { yes: N("Page2[0].c2_7[0]"), no: N("Page2[0].c2_7[1]") } },
  { id: "line47b_written_evidence", line: "47b", label: "If Yes, is the evidence written?", type: "yesno", locate: { yes: N("Page2[0].c2_8[0]"), no: N("Page2[0].c2_8[1]") } },
  {
    id: "other_expenses",
    line: "Part V",
    label: "Other expenses not included on lines 8-27a or line 30 (up to 9 rows)",
    type: "list",
    rows: 9,
    items: [
      { id: "description", label: "Description", type: "text" },
      { id: "amount", label: "Amount", type: "money" },
    ],
    listLocate: { 2024: PART_V_ROWS, 2025: PART_V_ROWS },
  },
  comp("line48", "48", "Total other expenses", 2, "sum of Part V amounts; carried to line 27b"),
];

const EXPENSE_LINES = ["line8", "line9", "line10", "line11", "line12", "line13", "line14", "line15", "line16a", "line16b", "line17", "line18", "line19", "line20a", "line20b", "line21", "line22", "line23", "line24a", "line24b", "line25", "line26", "line27a"];

export const scheduleC: FormDef = {
  id: "f1040sc",
  title: "Schedule C (Form 1040), Profit or Loss From Business (Sole Proprietorship)",
  shortTitle: "Schedule C",
  description: "Reports income and expenses of a business you operated as a sole proprietor (or single-member LLC). Net profit flows to Schedule 1 line 3 and Schedule SE line 2.",
  years: [2024, 2025],
  fields,
  notes: `**What this form is for.** One Schedule C per business. Report gross receipts, subtract returns and cost of goods sold, then list ordinary and necessary expenses by category. Line 31 (net profit or loss) carries to Schedule 1 line 3 and, for self-employment tax, to Schedule SE line 2.

**What the engine computes.** Lines 3, 5, 7, 28, 29, 31, 40, 42 and 48. Line 4 is taken from Part III when lines 35-41 are supplied; line 27b is taken from Part V when other_expenses rows are supplied.

**Things to verify before filing.**
- Car and truck expenses (line 9) need Part IV (lines 43-47) unless you file Form 4562.
- Depreciation (line 13) usually requires Form 4562.
- Meals (line 24b) are generally limited to 50%; enter the deductible amount.
- A loss on line 31 requires checking box 32a or 32b. If 32b, Form 6198 may be required.
- Contract labor of $600 or more to one person generally requires Form 1099-NEC, and lines I and J ask about it.
- The simplified home-office method is $5 per square foot up to 300 square feet ($1,500 maximum).`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l1 = c.n("line1");
    const l2 = c.n("line2");
    const l3 = c.set("line3", l1 - l2, "Subtract line 2 from line 1", `line 1 ${f(l1)} - line 2 ${f(l2)}`, "3");

    const partIII = ["line35", "line36", "line37", "line38", "line39", "line41"].some((id) => c.has(id));
    let l4 = c.n("line4");
    if (partIII) {
      const l40 = c.set("line40", c.sum(["line35", "line36", "line37", "line38", "line39"]), "Add lines 35 through 39", c.show([["35", c.n("line35")], ["36", c.n("line36")], ["37", c.n("line37")], ["38", c.n("line38")], ["39", c.n("line39")]]), "40");
      const l41 = c.n("line41");
      const l42 = c.set("line42", l40 - l41, "Cost of goods sold", `line 40 ${f(l40)} - line 41 ${f(l41)}`, "42");
      if (c.has("line4") && c.n("line4") !== l42) c.warn(`line4 was supplied as ${f(c.n("line4"))} but Part III computes ${f(l42)}; using the Part III amount.`);
      l4 = c.set("line4", l42, "Cost of goods sold (from line 42)", `line 42 ${f(l42)}`, "4");
    }
    const l5 = c.set("line5", l3 - l4, "Gross profit", `line 3 ${f(l3)} - line 4 ${f(l4)}`, "5");
    const l6 = c.n("line6");
    const l7 = c.set("line7", l5 + l6, "Gross income", `line 5 ${f(l5)} + line 6 ${f(l6)}`, "7");

    const rows = c.list("other_expenses");
    let l27b = c.n("line27b");
    if (rows.length > 0) {
      if (rows.length > 9) c.warn(`other_expenses has ${rows.length} rows; only 9 fit on Part V. Combine the smallest rows.`);
      const total = rows.reduce((acc, r) => acc + (c.ctx.rounding === "whole" ? Math.round(Number(parseAmount(r.amount))) : Number(parseAmount(r.amount))), 0);
      const l48 = c.set("line48", total, "Total other expenses", rows.map((r) => `${String(r.description ?? "")} ${f(Number(parseAmount(r.amount)))}`).join(" + "), "48");
      if (c.has("line27b") && c.n("line27b") !== l48) c.warn(`line27b was supplied as ${f(c.n("line27b"))} but Part V totals ${f(l48)}; using the Part V total.`);
      l27b = c.set("line27b", l48, "Other expenses (from line 48)", `line 48 ${f(l48)}`, "27b");
    } else if (l27b !== 0) {
      c.warn("line27b was supplied without Part V rows; Part V (line 48) should itemize other expenses.");
    }

    const expenseParts: Array<[string, number]> = EXPENSE_LINES.map((id) => [id.replace("line", ""), c.n(id)]);
    expenseParts.push(["27b", l27b]);
    const l28 = c.set("line28", expenseParts.reduce((a, [, v]) => a + v, 0), "Total expenses before expenses for business use of home", c.show(expenseParts.filter(([, v]) => v !== 0)) || "no expenses", "28");
    const l29 = c.set("line29", l7 - l28, "Tentative profit or (loss)", `line 7 ${f(l7)} - line 28 ${f(l28)}`, "29");

    const sqft = c.n("line30_business_sqft");
    let l30 = c.n("line30");
    if (sqft > 0 && !c.has("line30")) {
      const allowed = Math.min(sqft, 300) * 5;
      l30 = c.set("line30", Math.min(allowed, Math.max(0, l29)), "Business use of home (simplified method)", `min(${f(Math.min(sqft, 300))} sq ft x $5, line 29)`, "30");
      if (sqft > 300) c.warn("Simplified method is limited to 300 square feet.");
    } else if (l30 > Math.max(0, l29)) {
      c.warn("Line 30 cannot exceed line 29 (the business-use-of-home deduction is limited to tentative profit; carry over the excess on Form 8829).");
    }
    const l31 = c.set("line31", l29 - l30, "Net profit or (loss)", `line 29 ${f(l29)} - line 30 ${f(l30)}`, "31");

    if (l31 < 0 && !c.has("investment_at_risk")) c.warn("Line 31 is a loss: set investment_at_risk to 'all' (box 32a) or 'some' (box 32b).");
    if (c.n("line9") > 0 && !c.has("line44a_business_miles") && !c.has("line43_vehicle_date")) c.warn("Line 9 (car and truck) is claimed but Part IV vehicle information (lines 43-47) is empty; required unless Form 4562 is filed.");
    if (c.n("line13") > 0) c.warn("Line 13 depreciation generally requires Form 4562 to be attached.");
    if (c.n("line11") >= 600 && !c.has("payments_require_1099")) c.warn("Contract labor of $600 or more: answer lines I and J about Form 1099 filing.");
    if (!c.has("accounting_method")) c.warn("accounting_method (line F) is not set; most sole proprietors use 'cash'.");
    if (!c.has("material_participation")) c.warn("material_participation (line G) is not answered.");
    return c.result();
  },
};

function parseAmount(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.replace(/[$,\s]/g, "");
    const neg = /^\(.*\)$/.test(v.trim());
    const n = Number(neg ? s.slice(1, -1) : s);
    return Number.isFinite(n) ? (neg ? -n : n) : 0;
  }
  return 0;
}
