import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const H1 = (col: "B" | "C", n: number) => `Page1[0].Table_1-8[0].Header[0].${col}\\.Allocated[0].SSN-${col}[0].f1_${n}[0]`;
const H2 = (col: "B" | "C", n: number) => `Page2[0].Table_9-12[0].Header[0].${col}\\.Allocated[0].SSN-${col}[0].f2_${n}[0]`;

/** Form lines and how many print rows each has (page 1 rows 1-22 for lines 1-8, page 2 rows 1-24 for lines 9-12). */
const LINES: Array<{ line: string; label: string; rows: number }> = [
  { line: "1", label: "Wages (each employer)", rows: 5 },
  { line: "2", label: "Interest income (each payer)", rows: 3 },
  { line: "3", label: "Dividends (each payer)", rows: 3 },
  { line: "4", label: "State income tax refund", rows: 1 },
  { line: "5", label: "Self-employment income", rows: 3 },
  { line: "6", label: "Capital gains and losses", rows: 2 },
  { line: "7", label: "Pension income", rows: 2 },
  { line: "8", label: "Rents, royalties, partnerships, estates, trusts", rows: 3 },
  { line: "9", label: "Deductible part of self-employment tax", rows: 4 },
  { line: "10", label: "Self-employment tax", rows: 4 },
  { line: "11", label: "Taxes withheld", rows: 4 },
  { line: "12", label: "Other items such as social security benefits, unemployment compensation, deductions, credits, etc.", rows: 12 },
];
const PAGE1_ROWS = 22;
const TOTAL_ROWS = 46;
const rowNames = (col: number) => Array.from({ length: TOTAL_ROWS }, (_, r) => (r < PAGE1_ROWS ? `Page1[0].Table_1-8[0].BodyRow${r + 1}[0].f1_${13 + r * 4 + col}[0]` : `Page2[0].Table_9-12[0].BodyRow${r - PAGE1_ROWS + 1}[0].f2_${7 + (r - PAGE1_ROWS) * 4 + col}[0]`));

const fields: FieldDef[] = [
  { id: "first_name", label: "Your first name and initial", type: "text", locate: { name: "Page1[0].f1_1[0]" } },
  { id: "last_name", label: "Your last name", type: "text", locate: { name: "Page1[0].f1_2[0]" } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: "Page1[0].SSNCombField[0].f1_3[0]" } },
  { id: "spouse_first_name", label: "Spouse's or partner's first name and initial", type: "text", locate: { name: "Page1[0].f1_4[0]" } },
  { id: "spouse_last_name", label: "Spouse's or partner's last name", type: "text", locate: { name: "Page1[0].f1_5[0]" } },
  { id: "spouse_ssn", label: "Spouse's or partner's social security number", type: "ssn", maxLen: 9, locate: { name: "Page1[0].SpouseSSNCombField[0].f1_6[0]" } },
  { id: "ssn_col_b", label: "Column B heading: your SSN (page 1)", type: "ssn", computed: true, locate: { p1: { name: H1("B", 7) }, p2: { name: H1("B", 8) }, p3: { name: H1("B", 9) } } },
  { id: "ssn_col_c", label: "Column C heading: spouse's SSN (page 1)", type: "ssn", computed: true, locate: { p1: { name: H1("C", 10) }, p2: { name: H1("C", 11) }, p3: { name: H1("C", 12) } } },
  { id: "ssn_col_b_page2", label: "Column B heading: your SSN (page 2)", type: "ssn", computed: true, locate: { p1: { name: H2("B", 1) }, p2: { name: H2("B", 2) }, p3: { name: H2("B", 3) } } },
  { id: "ssn_col_c_page2", label: "Column C heading: spouse's SSN (page 2)", type: "ssn", computed: true, locate: { p1: { name: H2("C", 4) }, p2: { name: H2("C", 5) }, p3: { name: H2("C", 6) } } },
  {
    id: "items",
    line: "1-12",
    label: "Each income, deduction, or tax item to allocate: the form line (1 wages, 2 interest, 3 dividends, 4 state refund, 5 self-employment income, 6 capital gains, 7 pensions, 8 rents/royalties/pass-throughs, 9 deductible part of SE tax, 10 SE tax, 11 taxes withheld, 12 other), a description (employer or payer), the total, and the amounts allocated to you and to your spouse",
    type: "list",
    noPdf: true,
    items: [
      { id: "line", label: "Form line (1-12)", type: "text" },
      { id: "description", label: "Description (employer, payer, or item)", type: "text" },
      { id: "total", label: "Total amount", type: "money" },
      { id: "spouse_a", label: "Allocated to you (column B)", type: "money" },
      { id: "spouse_b", label: "Allocated to your spouse or partner (column C)", type: "money" },
    ],
  },
  {
    id: "rows",
    line: "1-12",
    label: "The allocation table as printed (filled from the items rows)",
    type: "list",
    rows: TOTAL_ROWS,
    computed: true,
    items: [
      { id: "description", label: "Item", type: "text", computed: true },
      { id: "total", label: "Total amount", type: "money", computed: true },
      { id: "spouse_a", label: "Allocated to you", type: "money", computed: true },
      { id: "spouse_b", label: "Allocated to spouse", type: "money", computed: true },
    ],
    listLocate: both({ description: rowNames(0), total: rowNames(1), spouse_a: rowNames(2), spouse_b: rowNames(3) }),
  },
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

export const form8958: FormDef = {
  id: "f8958",
  title: "Form 8958, Allocation of Tax Amounts Between Certain Individuals in Community Property States",
  shortTitle: "Form 8958",
  description: "Shows how community income, deductions, and withholding are split between spouses (or registered domestic partners) who file separate returns in a community property state.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f8958.pdf",
  notes: `**Who files.** Married people filing separately, and registered domestic partners, who live in Arizona, California, Idaho, Louisiana, Nevada, New Mexico, Texas, Washington, or Wisconsin. Each spouse attaches a Form 8958 showing the total of each item and the half (or other allocation) reported on each return.

**What the engine computes.** Places each item on its form line (overflow rows are reported in a warning for a statement), fills the SSN column headings from the two SSNs, and completes the allocation: when neither spouse's share is supplied the item is split equally; when one share is supplied the other is the remainder.

**What to verify.** Community income is generally split 50/50 regardless of who earned it, but separate property income (and income earned while living apart all year, under section 66) stays with the owner. Withholding on community wages is split the same way as the wages. Self-employment tax itself is not split: it stays with the spouse who carried on the business (line 10 shows the allocation of the tax only for reference).`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (c.has("ssn")) {
      c.out["ssn_col_b"] = c.str("ssn");
      c.out["ssn_col_b_page2"] = c.str("ssn");
    }
    if (c.has("spouse_ssn")) {
      c.out["ssn_col_c"] = c.str("spouse_ssn");
      c.out["ssn_col_c_page2"] = c.str("spouse_ssn");
    }
    const items = c.list("items");
    const rows: ListRow[] = Array.from({ length: TOTAL_ROWS }, () => ({}));
    let offset = 0;
    const totals = { total: 0, a: 0, b: 0 };
    for (const spec of LINES) {
      const mine = items.filter((r) => String(r["line"] ?? "").replace(/^line\s*/i, "").trim() === spec.line);
      mine.forEach((r, i) => {
        const total = num(r, "total");
        let a = r["spouse_a"] !== undefined ? num(r, "spouse_a") : undefined;
        let b = r["spouse_b"] !== undefined ? num(r, "spouse_b") : undefined;
        if (a === undefined && b === undefined) {
          a = Math.round(total / 2);
          b = total - a;
        } else if (a === undefined) a = total - (b ?? 0);
        else if (b === undefined) b = total - a;
        if (Math.abs(a + (b ?? 0) - total) >= 1) c.warn(`Line ${spec.line} "${String(r["description"] ?? "")}": the allocated amounts (${f(a)} + ${f(b ?? 0)}) do not add up to the total ${f(total)}.`);
        totals.total += total;
        totals.a += a;
        totals.b += b ?? 0;
        if (i < spec.rows) rows[offset + i] = { description: String(r["description"] ?? spec.label), total, spouse_a: a, spouse_b: b };
      });
      if (mine.length > spec.rows) c.warn(`Line ${spec.line} (${spec.label}) has ${mine.length} items but ${spec.rows} print row(s); attach a statement for the rest.`);
      offset += spec.rows;
    }
    const unknown = items.filter((r) => !LINES.some((s) => s.line === String(r["line"] ?? "").replace(/^line\s*/i, "").trim()));
    for (const r of unknown) c.warn(`Item "${String(r["description"] ?? "")}" has line "${String(r["line"] ?? "")}", which is not a Form 8958 line (1-12); it was ignored.`);
    c.out["rows"] = rows;
    if (items.length) c.setScalar("allocated_to_you", totals.a, "Total allocated to you", `${f(totals.a)} of ${f(totals.total)}`);
    if (items.length) c.setScalar("allocated_to_spouse", totals.b, "Total allocated to spouse or partner", `${f(totals.b)} of ${f(totals.total)}`);
    if (!items.length) c.warn("No items were supplied; the allocation table is empty.");
    return c.result();
  },
};
