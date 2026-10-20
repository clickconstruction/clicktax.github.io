import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const ROWS = 3;

const fields: FieldDef[] = [
  { id: "calendar_year", label: "Tax year: last two digits (\"25\" for 2025)", type: "text", maxLen: 2, locate: { names: { 2024: "Page1[0].Pg1Header[0].CalendarYear[0].f1_1[0]", 2025: "Page1[0].PgHeader[0].CalendarYear[0].f1_1[0]" } }, notes: "Defaults to the tax year." },
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: "Page1[0].f1_2[0]" } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: "Page1[0].f1_3[0]" } },
  {
    id: "accounts",
    line: "1-3",
    label: "Up to three accounts to receive the refund: amount, routing number, \"checking\" or \"savings\", and account number",
    type: "list",
    rows: ROWS,
    items: [
      { id: "amount", label: "(a) Amount to be deposited in this account", type: "money" },
      { id: "routing", label: "(b) Routing number (9 digits; the first two are 01 through 12 or 21 through 32)", type: "text", maxLen: 9 },
      { id: "type", label: "(c) \"checking\" or \"savings\"", type: "text" },
      { id: "checking", label: "(c) Checking", type: "checkbox", computed: true },
      { id: "savings", label: "(c) Savings", type: "checkbox", computed: true },
      { id: "account", label: "(d) Account number (up to 17 characters)", type: "text", maxLen: 17 },
    ],
    listLocate: both({
      amount: ["Page1[0].f1_4[0]", "Page1[0].f1_7[0]", "Page1[0].f1_10[0]"],
      routing: ["Page1[0].Line1bCombfield[0].f1_5[0]", "Page1[0].Line2bCombfield[0].f1_8[0]", "Page1[0].Line3bCombfield[0].f1_11[0]"],
      checking: ["Page1[0].c1_1[0]", "Page1[0].c1_2[0]", "Page1[0].c1_3[0]"],
      savings: ["Page1[0].c1_1[1]", "Page1[0].c1_2[1]", "Page1[0].c1_3[1]"],
      account: ["Page1[0].Line1dCombfield[0].f1_6[0]", "Page1[0].Line2dCombfield[0].f1_9[0]", "Page1[0].Line3dCombfield[0].f1_12[0]"],
    }),
  },
  { id: "line5", line: "5", label: "Add lines 1a, 2a, and 3a. The total must equal the refund on Form 1040 line 35a", type: "money", computed: true, alwaysShow: true, locate: { name: "Page1[0].f1_14[0]" } },
  { id: "refund", label: "The refund shown on Form 1040 line 35a (used to check line 5)", type: "money", noPdf: true },
];

export const form8888: FormDef = {
  id: "f8888",
  title: "Form 8888, Allocation of Refund (Including Savings Bond Purchases)",
  shortTitle: "Form 8888",
  description: "Splits a refund by direct deposit among up to three checking or savings accounts (bank, brokerage, IRA, HSA, or TreasuryDirect). Line 5 must equal the refund on Form 1040 line 35a.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f8888.pdf",
  notes: `**Who files.** Anyone who wants the refund deposited into more than one account. With a single account, use the direct deposit lines on Form 1040 instead. Savings bond purchases with a refund ended for returns filed after 2024 (line 4 is reserved).

**What the engine computes.** Line 5 (the total of the deposits) and the checking/savings boxes from each row's type. When the refund is supplied, the total is checked against it; a mismatch makes the IRS adjust the last account or mail a check.

**What to verify.** Routing numbers are 9 digits and must be the bank's ACH routing number (not a wire number); each account must be in your name (or jointly held on a joint return); IRA deposits count as contributions for the year you designate with the custodian.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.has("calendar_year")) c.out["calendar_year"] = String(ctx.year).slice(2);
    const rows = c.list("accounts");
    if (rows.length > ROWS) c.warn(`More than ${ROWS} accounts: only the first ${ROWS} print; Form 8888 allows at most three.`);
    const out: ListRow[] = rows.map((r, i) => {
      const type = String(r["type"] ?? "checking").toLowerCase();
      const routing = String(r["routing"] ?? "").replace(/\D/g, "");
      if (r["routing"] !== undefined && routing.length !== 9) c.warn(`Account ${i + 1}: the routing number must be 9 digits.`);
      else if (routing && !/^(0[1-9]|1[0-2]|2[1-9]|3[0-2])/.test(routing)) c.warn(`Account ${i + 1}: a routing number starts with 01-12 or 21-32.`);
      return { ...r, checking: type.startsWith("check"), savings: type.startsWith("sav") };
    });
    c.out["accounts"] = out;
    const total = out.reduce((a, r) => a + (Number(r["amount"] ?? 0) || 0), 0);
    c.set("line5", total, "Total deposits", `sum of ${out.length} account amount(s)`, "5");
    if (c.has("refund") && Math.abs(c.n("refund") - total) >= 1) c.warn(`Line 5 (${f(total)}) does not equal the refund on Form 1040 line 35a (${f(c.n("refund"))}); the amounts must match.`);
    if (out.length < 2) c.warn("Form 8888 is for splitting a refund among two or more accounts; with one account use Form 1040 lines 35b through 35d instead.");
    return c.result();
  },
};
