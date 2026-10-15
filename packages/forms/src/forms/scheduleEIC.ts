import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

type Y<T> = Partial<Record<TaxYear, T>>;
const kids = [1, 2, 3] as const;
const pad = (n: number, year: TaxYear) => (year === 2025 ? String(n).padStart(2, "0") : String(n));
const P = (n: number, year: TaxYear) => `Page1[0].f1_${pad(n, year)}[0]`;
const perYear = (fn: (year: TaxYear) => string[]): Y<string[]> => ({ 2024: fn(2024), 2025: fn(2025) });
const yobNames = (year: TaxYear, digit: number) => [`Page1[0].Year1_ReadOrder[0].f1_${pad(9 + digit, year)}[0]`, `Page1[0].Year2_ReadOrder[0].f1_${pad(13 + digit, year)}[0]`, P(17 + digit, year)];
/** Line 4a/4b checkboxes: the "Yes" box sits under a Yes_ReadOrder subform, the "No" box is the bare one; 2024 numbers run one higher. */
const q = (year: TaxYear, line: "4a" | "4b", child: 1 | 2 | 3, yes: boolean) => {
  const base = (line === "4a" ? 1 : 4) + (child - 1) + (year === 2024 ? 1 : 0);
  if (child === 3) return yes ? `Page1[0].Line${line}_Child3_Yes_ReadOrder[0].c1_${base}[0]` : `Page1[0].c1_${base}[0]`;
  return yes ? `Page1[0].Line${line}_Child${child}_ReadOrder[0].Yes_ReadOrder[0].c1_${base}[0]` : `Page1[0].Line${line}_Child${child}_ReadOrder[0].c1_${base}[0]`;
};
const monthsNames = (year: TaxYear) => [`Page1[0].Line6_Child1_ReadOrder[0].f1_${pad(24, year)}[0]`, `Page1[0].Line6_Child2_ReadOrder[0].f1_${pad(25, year)}[0]`, P(26, year)];

/** EIC parameters (Rev. Proc. 2023-34 for 2024, 2024-40 for 2025), indexed by number of qualifying children 0-3. */
export const EIC: Record<TaxYear, { earnedIncomeAmount: number[]; maxCredit: number[]; creditRate: number[]; phaseoutRate: number[]; threshold: number[]; thresholdMfj: number[]; investmentLimit: number }> = {
  2024: { earnedIncomeAmount: [8260, 12390, 17400, 17400], maxCredit: [632, 4213, 6960, 7830], creditRate: [0.0765, 0.34, 0.4, 0.45], phaseoutRate: [0.0765, 0.1598, 0.2106, 0.2106], threshold: [10330, 22720, 22720, 22720], thresholdMfj: [17250, 29640, 29640, 29640], investmentLimit: 11600 },
  2025: { earnedIncomeAmount: [8490, 12730, 17880, 17880], maxCredit: [649, 4328, 7152, 8046], creditRate: [0.0765, 0.34, 0.4, 0.45], phaseoutRate: [0.0765, 0.1598, 0.2106, 0.2106], threshold: [10620, 23350, 23350, 23350], thresholdMfj: [17730, 30470, 30470, 30470], investmentLimit: 11950 },
};

/** The EIC Table value for an income: the formula applied at the midpoint of the $50 bracket, as the IRS builds the table. */
export function eicTable(year: TaxYear, income: number, children: number, mfj: boolean): number {
  const p = EIC[year];
  const k = Math.min(3, Math.max(0, children));
  if (income <= 0) return 0;
  const mid = income < 1 ? 0 : Math.floor(income / 50) * 50 + 25;
  const base = Math.min(p.maxCredit[k]!, p.creditRate[k]! * mid);
  const threshold = mfj ? p.thresholdMfj[k]! : p.threshold[k]!;
  const credit = mid > threshold ? Math.min(base, p.maxCredit[k]! - p.phaseoutRate[k]! * (mid - threshold)) : base;
  return Math.max(0, Math.round(credit));
}
export function completedPhaseout(year: TaxYear, children: number, mfj: boolean): number {
  const p = EIC[year];
  const k = Math.min(3, Math.max(0, children));
  return Math.round((mfj ? p.thresholdMfj[k]! : p.threshold[k]!) + p.maxCredit[k]! / p.phaseoutRate[k]!);
}

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { names: { 2024: P(1, 2024), 2025: P(1, 2025) } } },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: { names: { 2024: P(2, 2024), 2025: P(2, 2025) } } },
  { id: "separated_spouse_mfs", label: "Married filing separately and you meet the separated-spouse requirements to claim the EIC (2024 form checkbox)", type: "checkbox", years: [2024], locate: { names: { 2024: "Page1[0].c1_1[0]" } } },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  { id: "earned_income", label: "Earned income for the EIC (wages, salaries, tips, net self-employment earnings; not pensions or unemployment)", type: "money" },
  { id: "agi", label: "Adjusted gross income (Form 1040 line 11)", type: "money" },
  { id: "investment_income", label: "Investment income (taxable and tax-exempt interest, dividends, capital gain net income, passive rents/royalties)", type: "money" },
  { id: "age_25_to_64", label: "With no qualifying children: were you (or your spouse) at least 25 and under 65 at year end?", type: "checkbox" },
  { id: "no_qualifying_children", label: "Claim the EIC without a qualifying child (Schedule EIC itself is not attached)", type: "checkbox" },
  {
    id: "children", line: "1-6", label: "Qualifying children (up to 3): name, SSN, year of birth, student under 24?, permanently and totally disabled?, relationship, months lived with you", type: "list", rows: 3,
    items: [
      { id: "name", label: "1 Child's first and last name", type: "text" },
      { id: "ssn", label: "2 Child's SSN (must be valid for employment, issued before the return due date)", type: "ssn" },
      { id: "year_of_birth", label: "3 Year of birth (YYYY)", type: "text", maxLen: 4 },
      ...[1, 2, 3, 4].map((d) => ({ id: `yob${d}`, label: `Year of birth digit ${d}`, type: "text" as const, maxLen: 1, computed: true })),
      { id: "under_24_student", label: "4a Was the child under age 24 at year end, a student, and younger than you (or your spouse)? (answer only when the child was born before the year's age-19 cutoff)", type: "yesno" },
      { id: "permanently_disabled", label: "4b Was the child permanently and totally disabled during any part of the year? (answer only when 4a is No)", type: "yesno" },
      { id: "relationship", label: "5 Relationship (son, daughter, grandchild, niece, nephew, eligible foster child, etc.)", type: "text" },
      { id: "months_lived", label: "6 Number of months the child lived with you in the United States (12 if born or died during the year)", type: "integer", maxLen: 2 },
    ],
    listLocate: {
      2024: { name: kids.map((k) => P(2 + k, 2024)), ssn: kids.map((k) => P(5 + k, 2024)), yob1: yobNames(2024, 0), yob2: yobNames(2024, 1), yob3: yobNames(2024, 2), yob4: yobNames(2024, 3), "under_24_student.yes": kids.map((k) => q(2024, "4a", k, true)), "under_24_student.no": kids.map((k) => q(2024, "4a", k, false)), "permanently_disabled.yes": kids.map((k) => q(2024, "4b", k, true)), "permanently_disabled.no": kids.map((k) => q(2024, "4b", k, false)), relationship: kids.map((k) => P(20 + k, 2024)), months_lived: monthsNames(2024) },
      2025: { name: kids.map((k) => P(2 + k, 2025)), ssn: kids.map((k) => P(5 + k, 2025)), yob1: yobNames(2025, 0), yob2: yobNames(2025, 1), yob3: yobNames(2025, 2), yob4: yobNames(2025, 3), "under_24_student.yes": kids.map((k) => q(2025, "4a", k, true)), "under_24_student.no": kids.map((k) => q(2025, "4a", k, false)), "permanently_disabled.yes": kids.map((k) => q(2025, "4b", k, true)), "permanently_disabled.no": kids.map((k) => q(2025, "4b", k, false)), relationship: kids.map((k) => P(20 + k, 2025)), months_lived: monthsNames(2025) },
    },
  },
  { id: "qualifying_children", label: "Number of qualifying children counted for the credit", type: "integer", computed: true },
  { id: "eic_credit", label: "Earned income credit; carried to Form 1040 line 27", type: "money", computed: true, alwaysShow: true, notes: "EIC Table value for earned income, reduced to the table value for AGI when AGI is higher" },
];

export const scheduleEIC: FormDef = {
  id: "f1040sei",
  title: "Schedule EIC (Form 1040), Earned Income Credit",
  shortTitle: "Schedule EIC",
  description: "Identifies up to three qualifying children for the earned income credit and computes the credit itself from earned income and AGI with the year's EIC table parameters, for Form 1040 line 27.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040gi.pdf",
  notes: `**What this form is for.** Schedule EIC lists the qualifying children (name, SSN, year of birth, relationship, months in your home). The credit amount is figured in the Form 1040 instructions (EIC Worksheet and EIC Table) and goes on Form 1040 line 27; this engine computes it here so the whole return can be assembled.

**What the engine computes.** The year-of-birth digit boxes, the number of qualifying children (children listed with at least 7 months, or born/died during the year), and the credit: the EIC Table amount for earned income, limited to the table amount for AGI when AGI exceeds the phaseout threshold. Parameters: 2024 maximum $632 / $4,213 / $6,960 / $7,830 and 2025 maximum $649 / $4,328 / $7,152 / $8,046 for 0 / 1 / 2 / 3+ children; investment income limit $11,600 (2024) and $11,950 (2025).

**What to verify.** Everyone needs a valid SSN; married filing separately qualifies only under the separated-spouse rule; without children you must be 25-64 and not a dependent; investment income over the limit disqualifies you; a child claimed by two people needs the tiebreaker rules. Compare the credit with the EIC Table in the Form 1040 instructions.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const p = EIC[ctx.year];
    const status = c.str("filing_status") || "single";
    const mfj = status === "mfj";
    const rows = c.list("children");
    if (rows.length > 3) c.warn("Only three children fit on Schedule EIC; list the three that give the largest credit (the credit tops out at three).");
    const out: ListRow[] = rows.map((r, i) => {
      const yob = String(r["year_of_birth"] ?? "").replace(/\D/g, "");
      const digits: Record<string, string> = {};
      if (yob.length === 4) yob.split("").forEach((d, k) => (digits[`yob${k + 1}`] = d));
      else c.warn(`children[${i}].year_of_birth should be a four-digit year.`);
      const months = Number(r["months_lived"] ?? 0) || 0;
      if (months > 0 && months < 7) c.warn(`children[${i}] lived with you ${months} months; a qualifying child must live with you more than half the year (12 if born or died during the year).`);
      if (!String(r["ssn"] ?? "").replace(/\D/g, "")) c.warn(`children[${i}] has no SSN; a child without a valid SSN cannot be a qualifying child for the EIC.`);
      const age = Number(yob) ? ctx.year - Number(yob) : undefined;
      if (age !== undefined && age >= 19 && r["under_24_student"] === undefined && r["permanently_disabled"] === undefined) c.warn(`children[${i}] was ${age} at year end: answer under_24_student (line 4a) or permanently_disabled (line 4b).`);
      if (age !== undefined && age >= 24 && r["under_24_student"] === true) c.warn(`children[${i}] was ${age} at year end, so line 4a cannot be yes; only a permanently and totally disabled child qualifies.`);
      return { ...r, ...digits };
    });
    if (out.length) c.out["children"] = out;
    const qualifying = out.filter((r) => (Number(r["months_lived"] ?? 0) || 0) >= 7 || r["months_lived"] === undefined).length;
    const kidsCount = Math.min(3, qualifying);
    c.setScalar("qualifying_children", kidsCount, "Qualifying children", `${qualifying} listed`, "");
    const earned = c.n("earned_income");
    const agi = c.has("agi") ? c.n("agi") : earned;
    if (!c.has("earned_income")) c.warn("earned_income was not supplied; the credit cannot be figured.");
    let credit = Math.min(eicTable(ctx.year, earned, kidsCount, mfj), eicTable(ctx.year, agi, kidsCount, mfj));
    let why = `EIC Table for earned income ${f(earned)} and AGI ${f(agi)} with ${kidsCount} child(ren), ${mfj ? "married filing jointly" : "other statuses"}`;
    if (kidsCount === 0 && !c.bool("no_qualifying_children")) { credit = 0; why = "no qualifying children listed and no_qualifying_children is not set"; }
    if (kidsCount === 0 && c.bool("no_qualifying_children") && !c.bool("age_25_to_64")) { c.warn("Without a qualifying child you (or your spouse) must be at least 25 and under 65: set age_25_to_64 to confirm."); credit = 0; why = "age not confirmed"; }
    if (c.n("investment_income") > p.investmentLimit) { c.warn(`Investment income ${f(c.n("investment_income"))} exceeds the ${f(p.investmentLimit)} limit: no EIC.`); credit = 0; why = "investment income over the limit"; }
    if (status === "mfs" && !c.bool("separated_spouse_mfs")) { c.warn("Married filing separately: the EIC is allowed only under the separated-spouse rule (set separated_spouse_mfs)."); credit = 0; why = "married filing separately"; }
    const limit = completedPhaseout(ctx.year, kidsCount, mfj);
    if (credit === 0 && Math.max(earned, agi) >= limit && earned > 0) why = `income ${f(Math.max(earned, agi))} is at or above the ${f(limit)} limit`;
    c.set("eic_credit", credit, "Earned income credit", why, "1040 line 27");
    return c.result();
  },
};
