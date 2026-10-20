import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const P2 = (n: number) => `Page2[0].f2_${n}[0]`;
const T = (row: number, n: number) => `Page2[0].Table_Line17[0].BodyRow${row}[0].f2_${n}[0]`;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });

/** Cash-wage threshold for social security and Medicare tax per employee; FUTA applies at $1,000 in any quarter. */
const THRESHOLD: Record<TaxYear, number> = { 2024: 2700, 2025: 2800 };
const FUTA_WAGE_BASE = 7000;
const ROWS = 2;

const fields: FieldDef[] = [
  { id: "name", label: "Name of employer", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Social security number", type: "ssn", maxLen: 9, locate: { name: P1(2) } },
  { id: "ein", label: "Employer identification number (EIN)", type: "ein", maxLen: 9, locate: { name: "Page1[0].CombField[0].f1_3[0]" } },
  { id: "lineA", line: "A", label: "Did you pay any one household employee cash wages of $2,800 or more in 2025 ($2,700 in 2024)?", type: "yesno", locate: { yes: { name: "Page1[0].c1_1[0]" }, no: { name: "Page1[0].c1_1[1]" } }, notes: "Defaults from line 1." },
  { id: "lineB", line: "B", label: "Did you withhold federal income tax for any household employee?", type: "yesno", locate: { yes: { name: "Page1[0].c1_2[0]" }, no: { name: "Page1[0].c1_2[1]" } }, notes: "Defaults from line 7 when line A is no." },
  { id: "lineC", line: "C", label: "Did you pay total cash wages of $1,000 or more in any calendar quarter of this year or last year to all household employees?", type: "yesno", locate: { no: { name: "Page1[0].c1_3[0]" }, yes: { name: "Page1[0].c1_3[1]" } }, notes: "Answered only when lines A and B are both no." },
  money("line1", "1", "Total cash wages subject to social security tax", P1(4)),
  comp("line2", "2", "Social security tax: 12.4% of line 1", P1(5), "1 x 12.4%"),
  money("line3", "3", "Total cash wages subject to Medicare tax", P1(6), { notes: "Defaults to line 1." }),
  comp("line4", "4", "Medicare tax: 2.9% of line 3", P1(7), "3 x 2.9%"),
  money("line5", "5", "Total cash wages subject to Additional Medicare Tax withholding (wages over $200,000 paid to one employee)", P1(8)),
  comp("line6", "6", "Additional Medicare Tax withholding: 0.9% of line 5", P1(9), "5 x 0.9%"),
  money("line7", "7", "Federal income tax withheld, if any", P1(10)),
  comp("line8", "8", "Total social security, Medicare, and federal income taxes. Add lines 2, 4, 6, and 7", P1(11), "2 + 4 + 6 + 7", { alwaysShow: true }),
  { id: "line9", line: "9", label: "Did you pay total cash wages of $1,000 or more in any calendar quarter of this year or last year to all household employees?", type: "yesno", locate: { yes: { name: "Page1[0].c1_4[0]" }, no: { name: "Page1[0].c1_4[1]" } }, notes: "Defaults from the FUTA wages supplied." },
  { id: "line10", line: "10", label: "Did you pay unemployment contributions to only one state?", type: "yesno", locate: { yes: { name: "Page2[0].Line10[0].c2_1[0]" }, no: { name: "Page2[0].Line10[0].c2_1[1]" } } },
  { id: "line11", line: "11", label: "Did you pay all state unemployment contributions by the return due date?", type: "yesno", locate: { yes: { name: "Page2[0].c2_2[0]" }, no: { name: "Page2[0].c2_2[1]" } } },
  { id: "line12", line: "12", label: "Were all wages that are taxable for FUTA tax also taxable for your state's unemployment tax?", type: "yesno", locate: { yes: { name: "Page2[0].c2_3[0]" }, no: { name: "Page2[0].c2_3[1]" } } },
  { id: "line13", line: "13", label: "Section A: name of the state where you paid unemployment contributions", type: "text", maxLen: 2, locate: { name: P2(1) } },
  money("line14", "14", "Contributions paid to your state unemployment fund", P2(2)),
  money("line15", "15", "Total cash wages subject to FUTA tax (the first $7,000 paid to each employee)", P2(3)),
  comp("line16", "16", "FUTA tax: 0.6% of line 15 (Section A)", P2(4), "15 x 0.6%"),
  {
    id: "states",
    line: "17",
    label: "Section B (more than one state, late contributions, or state wage base differences): one row per state",
    type: "list",
    rows: ROWS,
    items: [
      { id: "state", label: "(a) Name of state", type: "text", maxLen: 2 },
      { id: "taxable_wages", label: "(b) Taxable wages as defined by state law", type: "money" },
      { id: "period_from", label: "(c) State experience rate period: from", type: "text" },
      { id: "period_to", label: "(c) State experience rate period: to", type: "text" },
      { id: "experience_rate", label: "(d) State experience rate (decimal, for example 0.027)", type: "percent" },
      { id: "col_e", label: "(e) Column (b) times 0.054", type: "money", computed: true },
      { id: "col_f", label: "(f) Column (b) times column (d)", type: "money", computed: true },
      { id: "col_g", label: "(g) Column (e) minus column (f), not less than zero", type: "money", computed: true },
      { id: "contributions", label: "(h) Contributions paid to the state unemployment fund", type: "money" },
    ],
    listLocate: both({
      state: [T(1, 5), T(2, 14)], taxable_wages: [T(1, 6), T(2, 15)], period_from: [T(1, 7), T(2, 16)], period_to: [T(1, 8), T(2, 17)], experience_rate: [T(1, 9), T(2, 18)],
      col_e: [T(1, 10), T(2, 19)], col_f: [T(1, 11), T(2, 20)], col_g: [T(1, 12), T(2, 21)], contributions: [T(1, 13), T(2, 22)],
    }),
  },
  comp("line18_g", "18(g)", "Totals: column (g)", P2(23), "sum of column (g)"),
  comp("line18_h", "18(h)", "Totals: column (h)", P2(24), "sum of column (h)"),
  comp("line19", "19", "Add columns (g) and (h) of line 18", P2(25), "18(g) + 18(h)"),
  money("line20", "20", "Total cash wages subject to FUTA tax (Section B)", P2(26)),
  comp("line21", "21", "Multiply line 20 by 6.0%", P2(27), "20 x 6%"),
  comp("line22", "22", "Multiply line 20 by 5.4%", P2(28), "20 x 5.4%"),
  { id: "credit_reduction", line: "23", label: "Credit reduction applies (contributions to a credit reduction state; see the instructions worksheet)", type: "checkbox", locate: { name: "Page2[0].c2_4[0]" } },
  comp("line23", "23", "The smaller of line 19 or line 22", P2(29), "min(19, 22)"),
  comp("line24", "24", "FUTA tax (Section B). Subtract line 23 from line 21", P2(30), "21 - 23"),
  comp("line25", "25", "The amount from line 8 (zero if line C is yes)", P2(31), "= line 8"),
  comp("line26", "26", "Total household employment taxes. Add line 16 (or 24) and line 25; to Schedule 2 line 9", P2(32), "16 (or 24) + 25", { alwaysShow: true }),
  { id: "line27", line: "27", label: "Are you required to file Form 1040? (Yes: the total goes on Schedule 2 line 9; no: complete Part IV)", type: "yesno", locate: { yes: { name: "Page2[0].c2_5[0]" }, no: { name: "Page2[0].c2_5[1]" } }, notes: "Defaults to yes." },
  { id: "address", line: "Part IV", label: "Address (number and street), only when not filing Form 1040", type: "text", locate: { name: P2(33) } },
  { id: "apt", line: "Part IV", label: "Apt., room, or suite number", type: "text", locate: { name: P2(34) } },
  { id: "city", line: "Part IV", label: "City, town or post office", type: "text", locate: { name: P2(35) } },
  { id: "state", line: "Part IV", label: "State", type: "text", maxLen: 2, locate: { name: P2(36) } },
  { id: "zip", line: "Part IV", label: "ZIP code", type: "text", maxLen: 10, locate: { name: P2(37) } },
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

export const scheduleH: FormDef = {
  id: "f1040sh",
  title: "Schedule H (Form 1040), Household Employment Taxes",
  shortTitle: "Schedule H",
  description: "Social security, Medicare, withheld income, and federal unemployment (FUTA) taxes on wages paid to household employees (nannies, housekeepers, caregivers); the total goes to Schedule 2 line 9.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040sh.pdf",
  notes: `**Who files.** Anyone who paid a household employee $2,800 or more in cash wages during 2025 ($2,700 in 2024), withheld federal income tax for a household employee, or paid $1,000 or more in any calendar quarter of this or last year to all household employees (FUTA). Wages to a spouse, a child under 21, a parent (usually), or an employee under 18 who is a student are exempt from social security and Medicare tax.

**What the engine computes.** Lines 2, 4, 6, 8, 16 (Section A, 0.6% when all state contributions were paid on time to one state), Section B columns (e) through (g) and lines 18 through 24 otherwise, and lines 25 and 26. Lines A, B, C, and 9 default from the wages supplied.

**What to verify.** You must also give each employee a Form W-2 and file Form W-3 (or W-2s electronically) by January 31. State unemployment contributions and the credit reduction states change yearly. FUTA wages are the first $7,000 paid to each employee.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const thr = THRESHOLD[ctx.year];
    const l1 = c.n("line1");
    if (!c.has("line3") && c.has("line1")) {
      c.out["line3"] = l1;
      c.computations.push({ id: "line3", line: "3", label: "Medicare wages (defaulted to line 1)", value: l1, formula: "= line 1" });
    }
    const l2 = c.set("line2", l1 * 0.124, "Social security tax", `${f(l1)} x 12.4%`, "2");
    const l4 = c.set("line4", c.n("line3") * 0.029, "Medicare tax", `${f(c.n("line3"))} x 2.9%`, "4");
    const l6 = c.set("line6", c.n("line5") * 0.009, "Additional Medicare Tax withholding", `${f(c.n("line5"))} x 0.9%`, "6");
    const l8 = c.set("line8", l2 + l4 + l6 + c.n("line7"), "Total employment taxes before FUTA", `${f(l2)} + ${f(l4)} + ${f(l6)} + ${f(c.n("line7"))}`, "8");
    const states = c.list("states");
    const futaWages = c.has("line20") ? c.n("line20") : c.n("line15");
    if (!c.has("lineA")) c.out["lineA"] = l1 >= thr;
    const aYes = c.has("lineA") ? c.bool("lineA") : l1 >= thr;
    if (!aYes && !c.has("lineB")) c.out["lineB"] = c.n("line7") > 0;
    const bYes = c.has("lineB") ? c.bool("lineB") : c.n("line7") > 0;
    const futa = futaWages > 0 || states.length > 0;
    if (!aYes && !bYes && !c.has("lineC")) c.out["lineC"] = futa;
    const cYes = !aYes && !bYes && (c.has("lineC") ? c.bool("lineC") : futa);
    if (!c.has("line9") && (aYes || bYes)) c.out["line9"] = futa;
    if (l1 > 0 && l1 < thr && !c.has("lineA")) c.warn(`Cash wages of ${f(l1)} are under the $${thr.toLocaleString()} threshold: no social security or Medicare tax is due unless one employee was paid at least that much; check your figures.`);
    if (states.length > ROWS) c.warn(`More than ${ROWS} states: only the first ${ROWS} print; attach a statement with the rest.`);
    const sectionB = states.length > 0 || (c.has("line10") && !c.bool("line10")) || (c.has("line11") && !c.bool("line11")) || (c.has("line12") && !c.bool("line12"));
    const outStates: ListRow[] = states.map((r) => {
      const wages = num(r, "taxable_wages");
      let rate = Number(r["experience_rate"] ?? 0) || 0;
      if (rate > 1) rate = rate / 100;
      const e = Math.round(wages * 0.054 * 100) / 100;
      const fv = Math.round(wages * rate * 100) / 100;
      return { ...r, col_e: e, col_f: fv, col_g: Math.max(0, e - fv) };
    });
    c.out["states"] = outStates;
    let futaTax = 0;
    if (sectionB) {
      const g = c.set("line18_g", outStates.reduce((a, r) => a + num(r, "col_g"), 0), "Total column (g)", "sum", "18(g)");
      const h = c.set("line18_h", outStates.reduce((a, r) => a + num(r, "contributions"), 0), "Total column (h)", "sum", "18(h)");
      const l19 = c.set("line19", g + h, "Credit for state contributions", `${f(g)} + ${f(h)}`, "19");
      const l20 = c.has("line20") ? c.n("line20") : c.n("line15");
      if (!c.has("line20")) c.out["line20"] = l20;
      const l21 = c.set("line21", l20 * 0.06, "Gross FUTA tax", `${f(l20)} x 6%`, "21");
      const l22 = c.set("line22", l20 * 0.054, "Maximum credit", `${f(l20)} x 5.4%`, "22");
      const l23 = c.set("line23", Math.min(l19, l22), "Allowed credit", `min(${f(l19)}, ${f(l22)})`, "23");
      if (c.bool("credit_reduction")) c.warn("Credit reduction state: reduce line 23 by the credit reduction worksheet amount from the instructions (not figured here).");
      futaTax = c.set("line24", Math.max(0, l21 - l23), "FUTA tax (Section B)", `${f(l21)} - ${f(l23)}`, "24");
    } else if (futaWages > 0 || c.has("line14")) {
      futaTax = c.set("line16", c.n("line15") * 0.006, "FUTA tax (Section A)", `${f(c.n("line15"))} x 0.6%`, "16");
      if (!c.str("line13")) c.warn("Section A: supply line13 (the state where you paid unemployment contributions).");
      for (const k of ["line10", "line11", "line12"]) if (!c.has(k)) c.out[k] = true;
    }
    if (futaWages > FUTA_WAGE_BASE * 10) c.warn(`FUTA wages are the first $${FUTA_WAGE_BASE.toLocaleString()} paid to each employee; ${f(futaWages)} looks high.`);
    const l25 = c.set("line25", cYes ? 0 : l8, "Employment taxes from line 8", cYes ? "line C yes: 0" : "= line 8", "25");
    c.set("line26", futaTax + l25, "Total household employment taxes", `${f(futaTax)} + ${f(l25)}`, "26");
    if (!c.has("line27")) c.out["line27"] = true;
    if (c.has("line27") && !c.bool("line27") && !c.str("address")) c.warn("Line 27 is no: complete Part IV (address) and sign the schedule; it is filed by itself.");
    return c.result();
  },
};
