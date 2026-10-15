import { Calc, f } from "../engine/helpers.ts";
import { incomeTax } from "../tax.ts";
import { FILING_STATUSES, type FieldDef, type FilingStatus, type FormDef, type TaxYear } from "../types.ts";

/**
 * Year semantics: the form keyed to tax year Y holds the vouchers and worksheet for year Y+1
 * (a 2025 return produces 2026 estimated-tax vouchers). The 2025 folder holds the 2026 form, the 2024
 * folder the 2025 form.
 */
const WS_PAGE: Record<TaxYear, number> = { 2024: 8, 2025: 12 };
const ws = (line: string) => ({ tok: line, page: WS_PAGE, kind: "text" as const });
const amt = (id: string, line: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: ws(line), ...extra });
const comp = (id: string, line: string, label: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, { computed: true, notes, ...extra });

/** Voucher blocks in order 1, 2, 3, 4: [page prefix, first field number, has-gap]. */
function voucher(year: TaxYear, slot: number): string[] {
  // Returns the 14 short names of one voucher block in the order:
  // amount, first, last, ssn, spouse first, spouse last, spouse ssn, address, city, state, zip, foreign country, province, postal.
  if (year === 2025) {
    const base = { 1: ["Page15", 29], 2: ["Page15", 15], 3: ["Page15", 1], 4: ["Page14", 1] }[slot] as [string, number];
    return Array.from({ length: 14 }, (_, i) => `${base[0]}[0].f${base[0].slice(4)}_${base[1] + i}[0]`);
  }
  // 2025 form: voucher 4 on page 10 (contiguous); page 11 holds vouchers 3, 2, 1; only voucher 3 skips a number after its amount box.
  if (slot === 4) return Array.from({ length: 14 }, (_, i) => `Page10[0].f10_${1 + i}[0]`);
  if (slot === 3) return [`Page11[0].f11_1[0]`, ...Array.from({ length: 13 }, (_, i) => `Page11[0].f11_${3 + i}[0]`)];
  const start = slot === 2 ? 16 : 30;
  return Array.from({ length: 14 }, (_, i) => `Page11[0].f11_${start + i}[0]`);
}
const V = (idx: number) => ({ names: { 2024: [1, 2, 3, 4].map((s) => voucher(2024, s)[idx]!), 2025: [1, 2, 3, 4].map((s) => voucher(2025, s)[idx]!) } });

const fields: FieldDef[] = [
  { id: "first_name", label: "Your first name and middle initial", type: "text", locate: V(1) },
  { id: "last_name", label: "Your last name", type: "text", locate: V(2) },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 11, locate: V(3) },
  { id: "spouse_first_name", label: "Spouse's first name and middle initial (joint payment)", type: "text", locate: V(4) },
  { id: "spouse_last_name", label: "Spouse's last name", type: "text", locate: V(5) },
  { id: "spouse_ssn", label: "Spouse's social security number", type: "ssn", maxLen: 11, locate: V(6) },
  { id: "address", label: "Address (number, street, and apt. no.)", type: "text", locate: V(7) },
  { id: "city", label: "City, town, or post office", type: "text", locate: V(8) },
  { id: "state", label: "State", type: "text", maxLen: 2, locate: V(9) },
  { id: "zip", label: "ZIP code", type: "text", maxLen: 10, locate: V(10) },
  { id: "foreign_country", label: "Foreign country name", type: "text", locate: V(11) },
  { id: "foreign_province", label: "Foreign province/county", type: "text", locate: V(12) },
  { id: "foreign_postal_code", label: "Foreign postal code", type: "text", locate: V(13) },
  {
    id: "vouchers",
    label: "Payment vouchers 1-4 (April 15, June 15, September 15, January 15): amount on each",
    type: "list",
    rows: 4,
    items: [{ id: "amount", label: "Amount of estimated tax you are paying by check or money order", type: "money" }],
    listLocate: { 2024: { amount: [1, 2, 3, 4].map((s) => voucher(2024, s)[0]!) }, 2025: { amount: [1, 2, 3, 4].map((s) => voucher(2025, s)[0]!) } },
    notes: "Computed as line 15 on each voucher unless supplied.",
  },
  amt("line1", "1", "Adjusted gross income you expect next year", { notes: "Defaults to this year's AGI when preparing a full return." }),
  amt("line2a", "2a", "Deductions (standard or itemized) you expect", { notes: "Defaults to this year's deduction." }),
  amt("line2b", "2b", "Qualified business income deduction you expect", { notes: "Defaults to this year's Form 8995 line 15." }),
  amt("line2c_additional", "2c", "Additional deductions from Schedule 1-A you expect", { years: [2025], notes: "Defaults to this year's Schedule 1-A line 38." }),
  comp("line2_total", "2d", "Total deductions", "2a + 2b (+ 2c)", { locate: { tok: { 2024: "2c", 2025: "2d" }, page: WS_PAGE, kind: "text" } }),
  comp("line3", "3", "Line 1 minus total deductions", "expected taxable income"),
  comp("line4", "4", "Tax on line 3", "this engine applies the current year's rate schedule as a proxy for next year's"),
  amt("line5", "5", "Alternative minimum tax you expect (Form 6251)"),
  { id: "other_income_taxes", line: "6", label: "Other taxes you expect to include in Form 1040 line 16 (Forms 8814, 4972, 8962 repayment...)", type: "money", notes: "Added on line 6." },
  comp("line6", "6", "Add lines 4 and 5 plus other income taxes", "4 + 5 + other"),
  amt("line7", "7", "Credits you expect (not withholding)", { notes: "Defaults to this year's nonrefundable credits (Form 1040 line 21)." }),
  comp("line8", "8", "Line 6 minus line 7", "not less than zero"),
  amt("line9", "9", "Self-employment tax you expect", { notes: "Defaults to this year's Schedule SE tax." }),
  amt("line10", "10", "Other taxes you expect (Additional Medicare Tax, NIIT, household employment...)", { notes: "Defaults to this year's Schedule 2 line 21 less self-employment tax." }),
  comp("line11a", "11a", "Add lines 8 through 10", "8 + 9 + 10"),
  amt("line11b", "11b", "Refundable credits you expect (earned income credit, additional child tax credit, American opportunity credit, net premium tax credit...)", { notes: "Defaults to this year's Form 1040 line 32." }),
  comp("line11c", "11c", "Total expected tax", "11a - 11b, not less than zero", { alwaysShow: true }),
  comp("line12a", "12a", "90% of line 11c", "line 11c x 0.90"),
  { id: "prior_year_tax", line: "12b", label: "This year's total tax (the 'prior year' for next year's estimates)", type: "money", notes: "Form 1040 line 24; filled when preparing a full return." },
  { id: "prior_year_agi", line: "12b", label: "This year's adjusted gross income", type: "money", notes: "Decides whether the safe harbor is 100% or 110% of this year's tax." },
  comp("line12b", "12b", "Required annual payment based on prior year's tax", "100% of prior year tax, or 110% when prior AGI exceeds $150,000 ($75,000 married filing separately)"),
  comp("line12c", "12c", "Required annual payment to avoid a penalty", "smaller of line 12a or 12b", { alwaysShow: true }),
  amt("line13", "13", "Income tax withheld and estimated to be withheld next year", { notes: "Defaults to this year's withholding (Form 1040 line 25d)." }),
  comp("line14a", "14a", "Line 12c minus line 13", "not less than zero"),
  { id: "line14a_zero", line: "14a", label: "Is the result zero or less?", type: "yesno", computed: true, locate: { yes: { names: { 2024: "Page8[0].c8_1[0]", 2025: "Page12[0].c12_1[0]" } }, no: { names: { 2024: "Page8[0].c8_1[1]", 2025: "Page12[0].c12_1[1]" } } } },
  comp("line14b", "14b", "Line 11c minus line 13", "expected tax after withholding"),
  { id: "line14b_under", line: "14b", label: "Is the result less than $1,000?", type: "yesno", computed: true, locate: { yes: { names: { 2024: "Page8[0].c8_2[0]", 2025: "Page12[0].c12_2[0]" } }, no: { names: { 2024: "Page8[0].c8_2[1]", 2025: "Page12[0].c12_2[1]" } } } },
  { id: "overpayment_applied", line: "15", label: "Overpayment from this year's return applied to next year's estimated tax (Form 1040 line 36)", type: "money", notes: "Subtracted before dividing into four payments." },
  comp("line15", "15", "Each quarterly payment", "(line 14a - overpayment applied) / 4, rounded up", { alwaysShow: true }),
];

export const form1040ES: FormDef = {
  id: "f1040es",
  title: "Form 1040-ES, Estimated Tax for Individuals (vouchers for the year after the return year)",
  shortTitle: "Form 1040-ES",
  description: "Quarterly estimated tax: the worksheet figures the required annual payment (90% of next year's expected tax or 100%/110% of this year's tax, less withholding) and the four payment vouchers carry a quarter each. Tax year 2025 produces the 2026 vouchers; 2024 produces the 2025 vouchers.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f1040es.pdf",
  notes: `**What this form is for.** Self-employed people and others without enough withholding pay tax in four installments (April 15, June 15, September 15, January 15). The safe harbor is paying 100% of this year's total tax (110% if this year's AGI was over $150,000, or $75,000 married filing separately), or 90% of next year's actual tax.

**What the engine computes.** Every worksheet total, the safe-harbor amount on line 12b, the required payment on line 12c, and the quarterly amount on line 15, then writes that amount on all four vouchers. When preparing a full return, next year's figures default to this year's.

**Things to verify before filing.**
- Line 4 is figured with the current year's rate schedule; next year's inflation-adjusted brackets are slightly higher, which only makes the estimate conservative.
- If your income is uneven, you may pay unequal amounts using the annualized method (Form 2210 Schedule AI).
- Pay electronically at IRS Direct Pay or EFTPS and skip the paper vouchers entirely.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") as FilingStatus;
    const l1 = c.n("line1");
    const l2 = c.set("line2_total", c.n("line2a") + c.n("line2b") + (ctx.year === 2025 ? c.n("line2c_additional") : 0), "Total deductions", `2a ${f(c.n("line2a"))} + 2b ${f(c.n("line2b"))}${ctx.year === 2025 ? ` + 2c ${f(c.n("line2c_additional"))}` : ""}`, ctx.year === 2025 ? "2d" : "2c");
    const l3 = c.set("line3", Math.max(0, l1 - l2), "Expected taxable income", `max(0, ${f(l1)} - ${f(l2)})`, "3");
    const l4 = c.set("line4", FILING_STATUSES.includes(status) ? incomeTax(l3, status, ctx.year) : 0, "Expected tax", FILING_STATUSES.includes(status) ? `${ctx.year} rate schedule for ${status} on ${f(l3)}` : "filing_status missing", "4");
    if (!FILING_STATUSES.includes(status)) c.warn("filing_status is required to figure line 4.");
    const l6 = c.set("line6", l4 + c.n("line5") + c.n("other_income_taxes"), "Add lines 4 and 5", `${f(l4)} + ${f(c.n("line5"))} + other ${f(c.n("other_income_taxes"))}`, "6");
    const l8 = c.set("line8", Math.max(0, l6 - c.n("line7")), "Line 6 minus credits", `max(0, ${f(l6)} - ${f(c.n("line7"))})`, "8");
    const l11a = c.set("line11a", l8 + c.n("line9") + c.n("line10"), "Add lines 8 through 10", `${f(l8)} + ${f(c.n("line9"))} + ${f(c.n("line10"))}`, "11a");
    const l11c = c.set("line11c", Math.max(0, l11a - c.n("line11b")), "Total expected tax", `max(0, ${f(l11a)} - ${f(c.n("line11b"))})`, "11c");
    const l12a = c.set("line12a", l11c * 0.9, "90% of expected tax", `${f(l11c)} x 90%`, "12a");
    const priorTax = c.n("prior_year_tax");
    const priorAgi = c.n("prior_year_agi");
    const high = priorAgi > (status === "mfs" ? 75000 : 150000);
    const l12b = c.set("line12b", priorTax * (high ? 1.1 : 1), "Safe harbor based on this year's tax", `${f(priorTax)} x ${high ? "110%" : "100%"}`, "12b");
    const l12c = c.set("line12c", Math.min(l12a, l12b), "Required annual payment", `min(${f(l12a)}, ${f(l12b)})`, "12c");
    const l13 = c.n("line13");
    const l14a = c.set("line14a", Math.max(0, l12c - l13), "Required payment after withholding", `max(0, ${f(l12c)} - ${f(l13)})`, "14a");
    const zero = l14a <= 0;
    c.setScalar("line14a_zero", zero, "Is line 14a zero or less?", zero ? "yes: no estimated payments required" : "no", "14a");
    const l14b = c.set("line14b", Math.max(0, l11c - l13), "Expected tax after withholding", `max(0, ${f(l11c)} - ${f(l13)})`, "14b");
    const under = l14b < 1000;
    c.setScalar("line14b_under", under, "Is line 14b less than $1,000?", under ? "yes: no estimated payments required" : "no", "14b");
    const required = !zero && !under;
    const applied = c.n("overpayment_applied");
    const quarterly = required ? Math.ceil(Math.max(0, l14a - applied) / 4) : 0;
    c.set("line15", quarterly, "Quarterly payment", required ? `ceil((${f(l14a)} - ${f(applied)}) / 4)` : "not required", "15");
    const rows = c.list("vouchers");
    if (rows.length === 0 && quarterly > 0) {
      c.out["vouchers"] = [1, 2, 3, 4].map(() => ({ amount: quarterly }));
      c.computations.push({ id: "vouchers", label: "Vouchers 1-4", value: quarterly, formula: "line 15 on each voucher" });
    }
    if (!required) c.warn("No estimated payments are required under the worksheet; vouchers are left blank.");
    return c.result();
  },
};
