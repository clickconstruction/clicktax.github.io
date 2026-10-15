import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
/** Line 1 has 14 payer rows (name f1_03.. odd, amount f1_04.. even); line 5 has 15 rows (f1_34.. / f1_35..). */
const INTEREST_ROWS = 14;
const DIVIDEND_ROWS = 15;
const interestNames = Array.from({ length: INTEREST_ROWS }, (_, i) => (i === 0 ? "Page1[0].Line1_ReadOrder[0].f1_03[0]" : P(3 + 2 * i)));
const interestAmounts = Array.from({ length: INTEREST_ROWS }, (_, i) => P(4 + 2 * i));
const dividendNames = Array.from({ length: DIVIDEND_ROWS }, (_, i) => (i === 0 ? "Page1[0].ReadOrderControl[0].f1_34[0]" : P(34 + 2 * i)));
const dividendAmounts = Array.from({ length: DIVIDEND_ROWS }, (_, i) => P(35 + 2 * i));
const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: { name: P(2) } },
  {
    id: "interest",
    line: "1",
    label: "Interest: payer name and amount (up to 14 rows; list seller-financed mortgage interest first with the buyer's SSN and address)",
    type: "list",
    rows: INTEREST_ROWS,
    items: [
      { id: "payer", label: "Name of payer", type: "text" },
      { id: "amount", label: "Amount", type: "money" },
    ],
    listLocate: both({ payer: interestNames, amount: interestAmounts }),
  },
  { id: "line2", line: "2", label: "Add the amounts on line 1", type: "money", computed: true, locate: { name: P(31) } },
  { id: "line3", line: "3", label: "Excludable interest on series EE and I U.S. savings bonds issued after 1989 (Form 8815)", type: "money", locate: { name: P(32) } },
  { id: "line4", line: "4", label: "Subtract line 3 from line 2; carried to Form 1040 line 2b", type: "money", computed: true, alwaysShow: true, locate: { name: P(33) } },
  {
    id: "dividends",
    line: "5",
    label: "Ordinary dividends: payer name and amount (up to 15 rows)",
    type: "list",
    rows: DIVIDEND_ROWS,
    items: [
      { id: "payer", label: "Name of payer", type: "text" },
      { id: "amount", label: "Amount", type: "money" },
    ],
    listLocate: both({ payer: dividendNames, amount: dividendAmounts }),
  },
  { id: "line6", line: "6", label: "Add the amounts on line 5; carried to Form 1040 line 3b", type: "money", computed: true, alwaysShow: true, locate: { name: P(64) } },
  { id: "line7a_foreign_account", line: "7a", label: "At any time during the year, did you have a financial interest in or signature authority over a financial account (bank, securities, brokerage...) located in a foreign country?", type: "yesno", locate: { yes: { names: { 2024: "Page1[0].c1_1[0]", 2025: "Page1[0].TagcorrectingSubform[0].c1_1[0]" } }, no: { names: { 2024: "Page1[0].c1_1[1]", 2025: "Page1[0].TagcorrectingSubform[0].c1_1[1]" } } } },
  { id: "line7a_fincen_required", line: "7a", label: "If yes, are you required to file FinCEN Form 114 (FBAR) to report that financial interest or signature authority?", type: "yesno", locate: { yes: { name: "Page1[0].c1_2[0]" }, no: { name: "Page1[0].c1_2[1]" } } },
  { id: "line7b_country", line: "7b", label: "If you are required to file FinCEN Form 114, the name of the foreign country where the financial account(s) is (are) located", type: "text", locate: { name: P(65) } },
  { id: "line7b_country_2", line: "7b", label: "Additional countries (second line)", type: "text", locate: { name: P(66) } },
  { id: "line8_foreign_trust", line: "8", label: "During the year, did you receive a distribution from, or were you the grantor of, or transferor to, a foreign trust?", type: "yesno", locate: { yes: { name: "Page1[0].c1_3[0]" }, no: { name: "Page1[0].c1_3[1]" } } },
];

export const scheduleB: FormDef = {
  id: "f1040sb",
  title: "Schedule B (Form 1040), Interest and Ordinary Dividends",
  shortTitle: "Schedule B",
  description: "Lists each payer of taxable interest and ordinary dividends when either exceeds $1,500 (or when you had a foreign account or trust), totals them for Form 1040 lines 2b and 3b, and answers the foreign accounts and trusts questions.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040sb.pdf",
  notes: `**When it is required.** Taxable interest over $1,500, ordinary dividends over $1,500, seller-financed mortgage interest, Form 8815 bond-interest exclusion, accrued interest or OID adjustments, or any "Yes" in Part III.

**What the engine computes.** Line 2 (sum of line 1), line 4 (line 2 minus line 3), line 6 (sum of line 5). In a full return, line 4 feeds Form 1040 line 2b and line 6 feeds line 3b. Qualified dividends still go on Form 1040 line 3a directly.

**What to verify.** Each 1099-INT/1099-DIV payer is listed once; nominee or accrued-interest adjustments appear as negative rows labeled accordingly; Part III answers match your FBAR position (FinCEN Form 114 is filed separately with FinCEN, not with the return).`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const sum = (rows: ListRow[]) => rows.reduce((a, r) => a + (Number(r["amount"] ?? 0) || 0), 0);
    const interest = c.list("interest");
    const dividends = c.list("dividends");
    if (interest.length > INTEREST_ROWS) c.warn(`More than ${INTEREST_ROWS} interest payers: only the first ${INTEREST_ROWS} print; attach a statement for the rest.`);
    if (dividends.length > DIVIDEND_ROWS) c.warn(`More than ${DIVIDEND_ROWS} dividend payers: only the first ${DIVIDEND_ROWS} print; attach a statement for the rest.`);
    const l2 = c.set("line2", sum(interest), "Total interest", `sum of ${interest.length} line 1 amounts`, "2");
    const l3 = c.n("line3");
    c.set("line4", l2 - l3, "Taxable interest", `${f(l2)} - ${f(l3)}`, "4");
    c.set("line6", sum(dividends), "Total ordinary dividends", `sum of ${dividends.length} line 5 amounts`, "6");
    if (c.bool("line7a_foreign_account") && !c.has("line7a_fincen_required")) c.warn("line7a_foreign_account is yes: also answer line7a_fincen_required (FBAR) and, if required, line7b_country.");
    if (c.bool("line7a_fincen_required") && !c.str("line7b_country")) c.warn("FinCEN Form 114 is required: list the country on line7b_country.");
    return c.result();
  },
};
