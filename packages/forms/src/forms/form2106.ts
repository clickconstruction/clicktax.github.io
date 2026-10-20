import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

/** The 2025 PDF zero-pads single-digit widget numbers (f1_06, f2_01); the 2024 PDF does not. */
const w = (year: TaxYear, page: 1 | 2, n: number) => `f${page}_${year === 2025 && n < 10 ? `0${n}` : n}`;
const nm = (page: 1 | 2, n: number, path = "") => ({ names: { 2024: `Page${page}[0].${path}${w(2024, page, n)}[0]`, 2025: `Page${page}[0].${path}${w(2025, page, n)}[0]` } });
const step = (table: string, line: string, n: number) => nm(1, n, `${table}[0].${line}[0].`);
const money = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });
/** Per-vehicle items print in column A (vehicle 1) and column B (vehicle 2). */
const cols = (path: (col: "ColA" | "ColB") => string, nA: number, nB: number) => {
  const out: Partial<Record<TaxYear, string[]>> = {};
  for (const year of [2024, 2025] as const) out[year] = [`Page2[0].${path("ColA")}${w(year, 2, nA)}[0]`, `Page2[0].${path("ColB")}${w(year, 2, nB)}[0]`];
  return out;
};
const secA = (line: string, nA: number, nB: number) => cols(() => `Table_SectionA[0].${line}[0].`, nA, nB);
const secAcol = (line: string, nA: number, nB: number) => cols((col) => `Table_SectionA[0].${line}[0].${col}[0].`, nA, nB);
const secC = (line: string, nA: number, nB: number) => cols((col) => `Table_SectionC[0].${line}[0].${col}[0].`, nA, nB);
const secD = (line: string, nA: number, nB: number) => cols((col) => `Table_SectionD[0].${line}[0].${col}[0].`, nA, nB);
const merge = (...parts: Array<[string, Partial<Record<TaxYear, string[]>>]>) => {
  const out: Partial<Record<TaxYear, Record<string, string[]>>> = { 2024: {}, 2025: {} };
  for (const [item, loc] of parts) for (const year of [2024, 2025] as const) out[year]![item] = loc[year]!;
  return out;
};

const MILEAGE: Record<TaxYear, number> = { 2024: 0.67, 2025: 0.7 };

const fields: FieldDef[] = [
  { id: "name", label: "Your name", type: "text", locate: nm(1, 1) },
  { id: "occupation", label: "Occupation in which you incurred expenses", type: "text", locate: nm(1, 2) },
  { id: "ssn", label: "Social security number", type: "ssn", maxLen: 9, locate: { p1: nm(1, 3), p2: nm(1, 4), p3: nm(1, 5) } },
  { id: "filer_type", label: "Who you are: \"reservist\" (Armed Forces reserves), \"performing_artist\", \"fee_basis_official\", or \"impairment\" (impairment-related work expenses, deducted on Schedule A instead of Schedule 1)", type: "choice", choices: ["reservist", "performing_artist", "fee_basis_official", "impairment"], notes: "Only these four groups may deduct employee business expenses for 2018 through 2025." },
  { id: "dot_hours_of_service", label: "Meals are subject to the Department of Transportation hours-of-service limits (80% instead of 50%)", type: "checkbox" },
  { id: "method", label: "Vehicle expense method: \"standard\" mileage (default) or \"actual\" expenses", type: "choice", choices: ["standard", "actual"] },
  money("line1_a", "1(A)", "Vehicle expense from line 22 or line 29 (column A: other than meals)", step("Table_Step1", "Line1", 6), { notes: "Computed from the vehicle rows when not supplied." }),
  money("line2_a", "2(A)", "Parking fees, tolls, and transportation (including train, bus, etc.) that did not involve overnight travel or commuting", step("Table_Step1", "Line2", 8)),
  money("line3_a", "3(A)", "Travel expense while away from home overnight: lodging, airplane, car rental, etc. (not meals)", step("Table_Step1", "Line3", 10)),
  money("line4_a", "4(A)", "Business expenses not included on lines 1 through 3 (not meals)", step("Table_Step1", "Line4", 12)),
  money("line5_b", "5(B)", "Meals expenses (column B)", step("Table_Step1", "Line5", 16)),
  comp("line6_a", "6(A)", "Total expenses other than meals: add lines 1 through 4", step("Table_Step1", "Line6", 17), "1 + 2 + 3 + 4"),
  comp("line6_b", "6(B)", "Meals: line 5", step("Table_Step1", "Line6", 18), "= line 5"),
  money("line7_a", "7(A)", "Reimbursements received from your employer not reported in W-2 box 1 (other than meals)", step("Table_Step2", "Line7", 19)),
  money("line7_b", "7(B)", "Reimbursements for meals not reported in W-2 box 1", step("Table_Step2", "Line7", 20)),
  comp("line8_a", "8(A)", "Subtract line 7 from line 6 (column A); if less than zero, report the excess as income", step("Table_Step3", "Line8", 21), "6(A) - 7(A)"),
  comp("line8_b", "8(B)", "Subtract line 7 from line 6 (column B)", step("Table_Step3", "Line8", 22), "6(B) - 7(B)"),
  comp("line9_a", "9(A)", "Column A: the amount from line 8", step("Table_Step3", "Line9", 23), "= 8(A)"),
  comp("line9_b", "9(B)", "Column B: 50% of line 8 (80% for DOT hours-of-service meals)", step("Table_Step3", "Line9", 24), "8(B) x 50% (or 80%)"),
  comp("line10", "10", "Add lines 9(A) and 9(B); to Schedule 1 line 12 (reservists, performing artists, fee-basis officials) or Schedule A line 16 (impairment-related)", nm(1, 25), "9(A) + 9(B)", { alwaysShow: true }),
  {
    id: "vehicles",
    line: "11-38",
    label: "Part II vehicle information, one row per vehicle (up to 2): dates, mileage, and (for the actual-expense method) Section C costs and Section D depreciation",
    type: "list",
    rows: 2,
    items: [
      { id: "placed_month", label: "Line 11: month placed in service (MM)", type: "text", maxLen: 2 },
      { id: "placed_day", label: "Line 11: day (DD)", type: "text", maxLen: 2 },
      { id: "placed_year", label: "Line 11: year (YYYY)", type: "text", maxLen: 4 },
      { id: "total_miles", label: "Line 12: total miles the vehicle was driven during the year", type: "integer" },
      { id: "business_miles", label: "Line 13: business miles included on line 12", type: "integer" },
      { id: "business_pct", label: "Line 14: percent of business use (line 13 / line 12)", type: "text", computed: true },
      { id: "avg_commute", label: "Line 15: average daily roundtrip commuting distance", type: "integer" },
      { id: "commuting_miles", label: "Line 16: commuting miles included on line 12", type: "integer" },
      { id: "other_miles", label: "Line 17: other miles (12 - 13 - 16)", type: "integer", computed: true },
      { id: "line23", label: "Line 23: gasoline, oil, repairs, vehicle insurance, etc.", type: "money" },
      { id: "line24a", label: "Line 24a: vehicle rentals", type: "money" },
      { id: "line24b", label: "Line 24b: inclusion amount", type: "money" },
      { id: "line24c", label: "Line 24c: 24a minus 24b", type: "money", computed: true },
      { id: "line25", label: "Line 25: value of employer-provided vehicle (applies only if 100% of annual lease value was included on Form W-2)", type: "money" },
      { id: "line26", label: "Line 26: add lines 23, 24c, and 25", type: "money", computed: true },
      { id: "line27", label: "Line 27: line 26 times the business percentage", type: "money", computed: true },
      { id: "line28", label: "Line 28: depreciation (from Section D line 38, or supplied)", type: "money" },
      { id: "line29", label: "Line 29: add lines 27 and 28 (to line 1)", type: "money", computed: true },
      { id: "line30", label: "Line 30: cost or other basis", type: "money" },
      { id: "line31", label: "Line 31: section 179 deduction and special depreciation allowance", type: "money" },
      { id: "line32", label: "Line 32: line 30 times the business percentage", type: "money", computed: true },
      { id: "line33", label: "Line 33: depreciation method and percentage (for example \"200DB 20%\")", type: "text" },
      { id: "depreciation_rate", label: "Line 33 as a decimal (0.20) so that line 34 can be computed", type: "percent" },
      { id: "line34", label: "Line 34: line 32 times the line 33 percentage", type: "money" },
      { id: "line35", label: "Line 35: add lines 31 and 34", type: "money", computed: true },
      { id: "line36", label: "Line 36: the applicable depreciation limit (passenger automobile caps)", type: "money" },
      { id: "line37", label: "Line 37: line 36 times the business percentage", type: "money", computed: true },
      { id: "line38", label: "Line 38: the smaller of line 35 or line 37 (line 35 if no limit); also line 28", type: "money", computed: true },
    ],
    listLocate: merge(
      ["placed_month", secAcol("Line11", 1, 4)], ["placed_day", secAcol("Line11", 2, 5)], ["placed_year", secAcol("Line11", 3, 6)],
      ["total_miles", secA("Line12", 7, 8)], ["business_miles", secA("Line13", 9, 10)], ["business_pct", secA("Line14", 11, 12)],
      ["avg_commute", secA("Line15", 13, 14)], ["commuting_miles", secA("Line16", 15, 16)], ["other_miles", secA("Line17", 17, 18)],
      ["line23", secC("Row23", 20, 21)], ["line24a", secC("Line24a", 22, 23)], ["line24b", secC("Line24b", 24, 25)], ["line24c", secC("Line24c", 26, 27)],
      ["line25", secC("Line25", 28, 29)], ["line26", secC("Line26", 30, 31)], ["line27", secC("Line27", 32, 33)], ["line28", secC("Line28", 34, 35)], ["line29", secC("Line29", 36, 37)],
      ["line30", secD("Line30", 38, 39)], ["line31", secD("Line31", 40, 41)], ["line32", secD("Line32", 42, 43)], ["line33", secD("Line33", 44, 45)], ["line34", secD("Line34", 46, 47)],
      ["line35", secD("Line35", 48, 49)], ["line36", secD("Line36", 50, 51)], ["line37", secD("Line37", 52, 53)], ["line38", secD("Line38", 54, 55)],
    ),
  },
  { id: "line18", line: "18", label: "Was your vehicle available for personal use during off-duty hours?", type: "yesno", locate: { yes: { name: "Page2[0].c2_1[0]" }, no: { name: "Page2[0].c2_1[1]" } } },
  { id: "line19", line: "19", label: "Do you (or your spouse) have another vehicle available for personal use?", type: "yesno", locate: { yes: { name: "Page2[0].c2_2[0]" }, no: { name: "Page2[0].c2_2[1]" } } },
  { id: "line20", line: "20", label: "Do you have evidence to support your deduction?", type: "yesno", locate: { yes: { name: "Page2[0].c2_3[0]" }, no: { name: "Page2[0].c2_3[1]" } } },
  { id: "line21", line: "21", label: "If yes, is the evidence written?", type: "yesno", locate: { yes: { name: "Page2[0].c2_4[0]" }, no: { name: "Page2[0].c2_4[1]" } } },
  comp("line22", "22", "Standard mileage: business miles (line 13, both vehicles) times the rate (70 cents for 2025, 67 cents for 2024); to line 1", nm(2, 19), "line 13 x rate"),
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

export const form2106: FormDef = {
  id: "f2106",
  title: "Form 2106, Employee Business Expenses",
  shortTitle: "Form 2106",
  description: "Unreimbursed employee business expenses for Armed Forces reservists, qualified performing artists, fee-basis state or local government officials, and employees with impairment-related work expenses, including vehicle expenses by the standard mileage or actual method.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i2106.pdf",
  notes: `**Who files.** For 2018 through 2025 only four groups can deduct employee business expenses: Armed Forces reservists (travel more than 100 miles from home), qualified performing artists, fee-basis state or local government officials, and employees with impairment-related work expenses. Everyone else's unreimbursed employee expenses are not deductible.

**What the engine computes.** Lines 6, 8, 9 (meals at 50%, or 80% under the DOT hours-of-service rules), and 10; the standard mileage amount on line 22 (or the actual-expense Section C and depreciation Section D columns per vehicle), the business-use percentage and other miles; and line 1 from the chosen method. In a full return line 10 goes to Schedule 1 line 12 (or, for impairment-related expenses, is left for Schedule A line 16).

**What to verify.** Reimbursements under an accountable plan are not in W-2 box 1 and go on line 7; a reimbursement that exceeds expenses is income. Depreciation limits for passenger automobiles (line 36) come from the instructions table; the standard mileage rate includes depreciation. Commuting is never deductible.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const vehicles = c.list("vehicles");
    if (vehicles.length > 2) c.warn("More than 2 vehicles: only two columns print; attach a statement for the rest.");
    const method = c.str("method") || (vehicles.some((r) => r["line23"] !== undefined || r["line30"] !== undefined) ? "actual" : "standard");
    if (!c.has("method") && vehicles.length) c.out["method"] = method;
    const rate = MILEAGE[ctx.year];
    const outRows: ListRow[] = vehicles.map((r) => {
      const total = num(r, "total_miles");
      const bus = num(r, "business_miles");
      const pct = total > 0 ? bus / total : 0;
      const row: ListRow = { ...r, business_pct: total > 0 ? (Math.round(pct * 1000) / 10).toFixed(1) : undefined, other_miles: total > 0 ? Math.max(0, total - bus - num(r, "commuting_miles")) : undefined };
      if (method === "actual") {
        const l24c = Math.max(0, num(r, "line24a") - num(r, "line24b"));
        const l26 = num(r, "line23") + l24c + num(r, "line25");
        const l27 = Math.round(l26 * pct);
        let l28 = r["line28"] !== undefined ? num(r, "line28") : undefined;
        if (r["line30"] !== undefined) {
          const l32 = Math.round(num(r, "line30") * pct);
          let drate = r["depreciation_rate"] !== undefined ? num(r, "depreciation_rate") : undefined;
          if (drate !== undefined && drate > 1) drate = drate / 100;
          const l34 = r["line34"] !== undefined ? num(r, "line34") : drate !== undefined ? Math.round(l32 * drate) : 0;
          const l35 = num(r, "line31") + l34;
          const l37 = r["line36"] !== undefined ? Math.round(num(r, "line36") * pct) : undefined;
          const l38 = l37 !== undefined ? Math.min(l35, l37) : l35;
          Object.assign(row, { line32: l32, line34: l34, line35: l35, ...(l37 !== undefined ? { line37: l37 } : {}), line38: l38 });
          if (l28 === undefined) l28 = l38;
        }
        Object.assign(row, { line24c: l24c, line26: l26, line27: l27, line28: l28 ?? 0, line29: l27 + (l28 ?? 0) });
      }
      return row;
    });
    c.out["vehicles"] = outRows;
    const busMiles = outRows.reduce((a, r) => a + num(r, "business_miles"), 0);
    const l22 = c.set("line22", method === "standard" ? busMiles * rate : 0, "Standard mileage", method === "standard" ? `${busMiles} miles x ${rate}` : "actual method used", "22");
    const l1Default = method === "standard" ? l22 : outRows.reduce((a, r) => a + num(r, "line29"), 0);
    if (!c.has("line1_a") && vehicles.length) c.set("line1_a", l1Default, "Vehicle expense", method === "standard" ? "line 22" : "sum of line 29", "1(A)");
    const l6a = c.set("line6_a", c.sum(["line1_a", "line2_a", "line3_a", "line4_a"]), "Expenses other than meals", "1 + 2 + 3 + 4", "6(A)");
    const l6b = c.set("line6_b", c.n("line5_b"), "Meals", "= line 5", "6(B)");
    const l8a = c.set("line8_a", l6a - c.n("line7_a"), "Unreimbursed expenses other than meals", `${f(l6a)} - ${f(c.n("line7_a"))}`, "8(A)");
    const l8b = c.set("line8_b", l6b - c.n("line7_b"), "Unreimbursed meals", `${f(l6b)} - ${f(c.n("line7_b"))}`, "8(B)");
    if (l8a < 0 || l8b < 0) c.warn("Reimbursements exceed expenses (line 8 is negative): report the excess as income on Form 1040 line 1h (other earned income).");
    const l9a = c.set("line9_a", Math.max(0, l8a), "Deductible expenses other than meals", "= 8(A)", "9(A)");
    const mealsPct = c.bool("dot_hours_of_service") ? 0.8 : 0.5;
    const l9b = c.set("line9_b", Math.max(0, l8b) * mealsPct, "Deductible meals", `${f(Math.max(0, l8b))} x ${mealsPct * 100}%`, "9(B)");
    c.set("line10", l9a + l9b, "Total employee business expenses", `${f(l9a)} + ${f(l9b)}`, "10");
    if (!c.str("filer_type")) c.warn("Supply filer_type: only reservists, qualified performing artists, fee-basis officials, and employees with impairment-related work expenses may deduct these expenses for 2018 through 2025.");
    if (c.str("filer_type") === "impairment") c.warn("Impairment-related work expenses go on Schedule A line 16, not Schedule 1 line 12.");
    if (vehicles.length && (!c.has("line20") || !c.has("line21"))) c.warn("Answer lines 18 through 21 (vehicle questions) when claiming vehicle expenses.");
    return c.result();
  },
};
