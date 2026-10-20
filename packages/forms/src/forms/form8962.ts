import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

/** Widget names are identical on the 2024 and 2025 forms. */
const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Federal poverty guidelines used for the coverage year (the prior year's HHS figures): first person, each additional person. */
export const FPL: Record<TaxYear, Record<"other" | "alaska" | "hawaii", [number, number]>> = {
  2024: { other: [14580, 5140], alaska: [18210, 6430], hawaii: [16770, 5910] },
  2025: { other: [15060, 5380], alaska: [18810, 6730], hawaii: [17310, 6190] },
};
/** Repayment limitation for excess advance payments: [single, other statuses] by household income band. */
const REPAY_CAP: Record<TaxYear, Array<[number, number, number]>> = {
  2024: [[200, 350, 700], [300, 900, 1800], [400, 1500, 3000]],
  2025: [[200, 375, 750], [300, 950, 1900], [400, 1600, 3200]],
};
/** Applicable figure under the 2021-2025 enhanced schedule: the share of household income expected toward the benchmark plan. */
export function applicableFigure(pct: number): number {
  const p = Math.max(0, pct);
  let fig: number;
  if (p < 150) fig = 0;
  else if (p < 200) fig = 0.02 * ((p - 150) / 50);
  else if (p < 250) fig = 0.02 + 0.02 * ((p - 200) / 50);
  else if (p < 300) fig = 0.04 + 0.02 * ((p - 250) / 50);
  else if (p < 400) fig = 0.06 + 0.025 * ((p - 300) / 100);
  else fig = 0.085;
  return Math.round(fig * 10000) / 10000;
}

const monthItems: NonNullable<FieldDef["items"]> = [
  { id: "premium", label: "(a) Monthly enrollment premiums (Form 1095-A column A)", type: "money" },
  { id: "slcsp", label: "(b) Monthly applicable SLCSP premium (Form 1095-A column B)", type: "money" },
  { id: "contribution", label: "(c) Monthly contribution amount (line 8b)", type: "money", computed: true },
  { id: "max_assistance", label: "(d) Monthly maximum premium assistance: (b) - (c)", type: "money", computed: true },
  { id: "ptc", label: "(e) Monthly premium tax credit allowed: smaller of (a) or (d)", type: "money", computed: true },
  { id: "aptc", label: "(f) Monthly advance payment of PTC (Form 1095-A column C)", type: "money" },
];
const monthLocate = Object.fromEntries(["premium", "slcsp", "contribution", "max_assistance", "ptc", "aptc"].map((k, c) => [k, MONTHS.map((_, m) => `Page1[0].Part2Table2[0].BodyRow${m + 1}[0].f1_${19 + 6 * m + c}[0]`)]));

const fields: FieldDef[] = [
  { id: "name", label: "Name shown on your return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: { name: P(2) } },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  { id: "mfs_relief", label: "Married filing separately and you qualify for the domestic abuse or abandonment exception", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "line1", line: "1", label: "Tax family size (you, your spouse if filing jointly, and your dependents)", type: "integer", locate: { name: P(3) } },
  money("line2a", "2a", "Your modified AGI (AGI plus tax-exempt interest, nontaxable social security, and excluded foreign income)", P(4)),
  money("line2b", "2b", "Dependents' modified AGI (only dependents required to file)", P(5)),
  comp("line3", "3", "Household income (2a + 2b)", P(6), "2a + 2b"),
  { id: "state_group", line: "4", label: "Where you lived: other (48 states and DC), alaska, or hawaii", type: "choice", choices: ["other", "alaska", "hawaii"], locate: { alaska: { name: "Page1[0].c1_2[0]" }, hawaii: { name: "Page1[0].c1_2[1]" }, other: { name: "Page1[0].c1_2[2]" } } },
  comp("line4", "4", "Federal poverty line for your family size and state", P(7), "HHS guidelines for the prior year"),
  { id: "line5", line: "5", label: "Household income as a percentage of the federal poverty line (whole number; 401 means over 400%)", type: "integer", computed: true, locate: { name: P(8) } },
  { id: "line7", line: "7", label: "Applicable figure (four decimals)", type: "text", computed: true, locate: { name: P(9) } },
  comp("line8a", "8a", "Annual contribution amount (line 3 x line 7)", P(10), "3 x 7"),
  comp("line8b", "8b", "Monthly contribution amount (line 8a / 12)", P(11), "8a / 12"),
  { id: "line9", line: "9", label: "Are you allocating policy amounts with another taxpayer or using the alternative calculation for year of marriage?", type: "yesno", locate: { yes: { name: "Page1[0].c1_4[0]" }, no: { name: "Page1[0].c1_4[1]" } } },
  { id: "line10", line: "10", label: "Were the premiums, SLCSP, and advance payments the same for every month you were enrolled? (yes: use line 11 annual totals; no: lines 12-23)", type: "yesno", computed: true, locate: { yes: { name: "Page1[0].c1_5[0]" }, no: { name: "Page1[0].c1_5[1]" } } },
  money("line11a", "11", "Annual enrollment premiums (Form 1095-A line 33 column A)", "Page1[0].Part2Table1[0].BodyRow1[0].f1_13[0]"),
  money("line11b", "11", "Annual applicable SLCSP premium (Form 1095-A line 33 column B)", "Page1[0].Part2Table1[0].BodyRow1[0].f1_14[0]"),
  comp("line11c", "11", "Annual contribution amount (line 8a)", "Page1[0].Part2Table1[0].BodyRow1[0].f1_15[0]", "line 8a"),
  comp("line11d", "11", "Annual maximum premium assistance (11b - 11c)", "Page1[0].Part2Table1[0].BodyRow1[0].f1_16[0]", "max(0, 11b - 11c)"),
  comp("line11e", "11", "Annual premium tax credit allowed (smaller of 11a or 11d)", "Page1[0].Part2Table1[0].BodyRow1[0].f1_17[0]", "min(11a, 11d)"),
  money("line11f", "11", "Annual advance payment of PTC (Form 1095-A line 33 column C)", "Page1[0].Part2Table1[0].BodyRow1[0].f1_18[0]"),
  { id: "months", line: "12-23", label: "Monthly amounts when they changed during the year (12 rows, January to December; leave a month empty when not enrolled)", type: "list", rows: 12, items: monthItems, listLocate: { 2024: monthLocate, 2025: monthLocate } },
  comp("line24", "24", "Total premium tax credit (line 11e or the sum of lines 12e-23e)", P(91), "11e or sum of (e)", { alwaysShow: true }),
  comp("line25", "25", "Advance payment of PTC (line 11f or the sum of lines 12f-23f)", P(92), "11f or sum of (f)"),
  comp("line26", "26", "Net premium tax credit (line 24 minus line 25, if positive); carried to Schedule 3 line 9", P(93), "max(0, 24 - 25)", { alwaysShow: true }),
  comp("line27", "27", "Excess advance payment (line 25 minus line 24, if positive)", P(94), "max(0, 25 - 24)"),
  comp("line28", "28", "Repayment limitation by household income band (none at 400% or more)", P(95), "by filing status and line 5"),
  comp("line29", "29", "Excess advance premium tax credit repayment; carried to Schedule 2 line 1a", P(96), "smaller of 27 or 28", { alwaysShow: true }),
  {
    id: "allocations", line: "30-33", label: "Part IV: shared policy allocations (up to 4): policy number, other taxpayer's SSN, start and stop months, and the percentages allocated to you", type: "list", rows: 4,
    items: [
      { id: "policy_number", label: "(a) Policy number (Form 1095-A line 2)", type: "text" },
      { id: "other_ssn", label: "(b) SSN of the taxpayer you share the policy with", type: "ssn" },
      { id: "start_month", label: "(c) Allocation start month (1-12)", type: "integer" },
      { id: "stop_month", label: "(d) Allocation stop month (1-12)", type: "integer" },
      { id: "premium_pct", label: "(e) Premium percentage", type: "percent" },
      { id: "slcsp_pct", label: "(f) SLCSP percentage", type: "percent" },
      { id: "aptc_pct", label: "(g) Advance payment percentage", type: "percent" },
    ],
    listLocate: { 2024: Object.fromEntries([["policy_number", [1, 8, 15, 22]], ["other_ssn", [2, 9, 16, 23]], ["start_month", [3, 10, 17, 24]], ["stop_month", [4, 11, 18, 25]]].map(([k, ns]) => [k as string, (ns as number[]).map((n) => `Page2[0].f2_${n}[0]`)]).concat([["premium_pct", [5, 12, 19, 26]], ["slcsp_pct", [6, 13, 20, 27]], ["aptc_pct", [7, 14, 21, 28]]].map(([k, ns]) => [k as string, (ns as number[]).map((n, i) => `Page2[0].Lines3${i}e-g[0].f2_${n}[0]`)]))), 2025: Object.fromEntries([["policy_number", [1, 8, 15, 22]], ["other_ssn", [2, 9, 16, 23]], ["start_month", [3, 10, 17, 24]], ["stop_month", [4, 11, 18, 25]]].map(([k, ns]) => [k as string, (ns as number[]).map((n) => `Page2[0].f2_${n}[0]`)]).concat([["premium_pct", [5, 12, 19, 26]], ["slcsp_pct", [6, 13, 20, 27]], ["aptc_pct", [7, 14, 21, 28]]].map(([k, ns]) => [k as string, (ns as number[]).map((n, i) => `Page2[0].Lines3${i}e-g[0].f2_${n}[0]`)]))) },
  },
  { id: "line34", line: "34", label: "Have you completed all policy amount allocations?", type: "yesno", locate: { yes: { name: "Page2[0].c2_1[0]" }, no: { name: "Page2[0].c2_1[1]" } } },
  { id: "line35a", line: "35a", label: "Alternative calculation for year of marriage: your alternative family size", type: "integer", locate: { name: "Page2[0].f2_29[0]" } },
  money("line35b", "35b", "Your alternative monthly contribution amount", "Page2[0].f2_30[0]"),
  { id: "line35c", line: "35c", label: "Your alternative start month", type: "integer", locate: { name: "Page2[0].f2_31[0]" } },
  { id: "line35d", line: "35d", label: "Your alternative stop month", type: "integer", locate: { name: "Page2[0].f2_32[0]" } },
  { id: "line36a", line: "36a", label: "Spouse's alternative family size", type: "integer", locate: { name: "Page2[0].f2_33[0]" } },
  money("line36b", "36b", "Spouse's alternative monthly contribution amount", "Page2[0].f2_34[0]"),
  { id: "line36c", line: "36c", label: "Spouse's alternative start month", type: "integer", locate: { name: "Page2[0].f2_35[0]" } },
  { id: "line36d", line: "36d", label: "Spouse's alternative stop month", type: "integer", locate: { name: "Page2[0].f2_36[0]" } },
];

export const form8962: FormDef = {
  id: "f8962",
  title: "Form 8962, Premium Tax Credit (PTC)",
  shortTitle: "Form 8962",
  description: "Reconciles the advance premium tax credit paid to your Marketplace health plan (Form 1095-A) with the credit you were entitled to from household income as a percentage of the poverty line: a net credit goes to Schedule 3 line 9, an excess repayment (limited by income band) to Schedule 2 line 1a.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8962.pdf",
  notes: `**Who files it.** Anyone with a Form 1095-A, whether or not advance payments were made; skipping it holds up the return. Married filing separately cannot claim the credit unless the domestic abuse or abandonment exception applies, and must still repay advance payments.

**What the engine computes.** Lines 3, 4 (the prior year's HHS poverty guideline for your family size and state), 5, 7 (the 2021-2025 enhanced applicable figure: 0% up to 150% of the poverty line rising to 8.5% at 400% and above), 8a, 8b, the line 11 annual columns or the monthly columns (c) through (e), lines 24 through 29 with the repayment limitation ($350/$700, $900/$1,800, $1,500/$3,000 for 2024; $375/$750, $950/$1,900, $1,600/$3,200 for 2025, none at 400% or more). In a full return, modified AGI comes from Form 1040, the net credit goes to Schedule 3 line 9, and the repayment to Schedule 2 line 1a.

**What to verify.** Copy columns A, B, and C of Form 1095-A exactly (the SLCSP in column B is sometimes blank and must be looked up); dependents' income counts only when they must file; the self-employed health insurance deduction and the credit interact (the instructions' iterative worksheet is not applied).`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") || "single";
    const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
    const size = Math.max(1, Math.round(c.n("line1") || 1));
    const l3 = c.set("line3", c.n("line2a") + c.n("line2b"), "Household income", `${f(c.n("line2a"))} + ${f(c.n("line2b"))}`, "3");
    const group = (["alaska", "hawaii"].includes(c.str("state_group")) ? c.str("state_group") : "other") as "other" | "alaska" | "hawaii";
    if (!c.has("state_group")) c.out["state_group"] = "other";
    const [base, per] = FPL[ctx.year][group];
    const l4 = c.set("line4", base + per * (size - 1), "Federal poverty line", `${f(base)} + ${size - 1} x ${f(per)} (${group})`, "4");
    const rawPct = l4 > 0 ? (l3 / l4) * 100 : 0;
    const l5 = rawPct >= 401 ? 401 : Math.floor(rawPct);
    c.setScalar("line5", l5, "Household income as % of the poverty line", `${f(l3)} / ${f(l4)}`, "5");
    const fig = applicableFigure(l5 >= 401 ? 401 : l5);
    c.setScalar("line7", fig.toFixed(4), "Applicable figure", `from line 5 (${l5}%)`, "7");
    const l8a = c.set("line8a", Math.round(l3 * fig), "Annual contribution amount", `${f(l3)} x ${fig.toFixed(4)}`, "8a");
    const l8b = c.set("line8b", Math.round(l8a / 12), "Monthly contribution amount", `${f(l8a)} / 12`, "8b");
    if (status === "mfs" && !c.bool("mfs_relief")) c.warn("Married filing separately: no premium tax credit is allowed (unless the relief exception applies); advance payments must be repaid.");
    if (l5 < 100) c.warn("Household income is under 100% of the poverty line: the credit is allowed only if the Marketplace estimated at least 100% when you enrolled (see instructions).");
    const months = c.list("months");
    const useMonthly = months.some((r) => num(r, "premium") > 0 || num(r, "slcsp") > 0 || num(r, "aptc") > 0);
    c.setScalar("line10", !useMonthly, "Same amounts every month?", useMonthly ? "no: lines 12-23" : "yes: line 11", "10");
    let l24: number, l25: number;
    if (useMonthly) {
      const out = months.map((r) => {
        const enrolled = num(r, "premium") > 0 || num(r, "slcsp") > 0 || num(r, "aptc") > 0;
        if (!enrolled) return { ...r };
        const d = Math.max(0, num(r, "slcsp") - l8b);
        return { ...r, contribution: l8b, max_assistance: d, ptc: Math.min(num(r, "premium"), d) };
      });
      c.out["months"] = out;
      l24 = c.set("line24", out.reduce((a, r) => a + num(r, "ptc"), 0), "Total premium tax credit", "sum of (e)", "24");
      l25 = c.set("line25", out.reduce((a, r) => a + num(r, "aptc"), 0), "Advance payments", "sum of (f)", "25");
    } else {
      c.set("line11c", l8a, "Annual contribution", "line 8a", "11c");
      const d = c.set("line11d", Math.max(0, c.n("line11b") - l8a), "Annual maximum assistance", `max(0, ${f(c.n("line11b"))} - ${f(l8a)})`, "11d");
      const e = c.set("line11e", Math.min(c.n("line11a"), d), "Annual PTC", `min(${f(c.n("line11a"))}, ${f(d)})`, "11e");
      l24 = c.set("line24", e, "Total premium tax credit", "line 11e", "24");
      l25 = c.set("line25", c.n("line11f"), "Advance payments", "line 11f", "25");
      if (!c.has("line11a") && !c.has("line11b")) c.warn("Supply the Form 1095-A annual totals (line11a, line11b, line11f) or the monthly rows.");
    }
    if (status === "mfs" && !c.bool("mfs_relief")) { l24 = 0; c.out["line24"] = 0; }
    c.set("line26", Math.max(0, l24 - l25), "Net premium tax credit", `max(0, ${f(l24)} - ${f(l25)})`, "26");
    const l27 = c.set("line27", Math.max(0, l25 - l24), "Excess advance payment", `max(0, ${f(l25)} - ${f(l24)})`, "27");
    const band = REPAY_CAP[ctx.year].find(([top]) => l5 < top);
    const cap = band ? (status === "single" ? band[1] : band[2]) : Infinity;
    c.set("line28", band ? cap : l27, "Repayment limitation", band ? `income under ${band[0]}% of the poverty line` : "no limit at 400% or more", "28");
    c.set("line29", Math.min(l27, cap), "Excess APTC repayment", `min(${f(l27)}, ${band ? f(cap) : "no limit"})`, "29");
    return c.result();
  },
};
