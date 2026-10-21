import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const P = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const row = (name: string, base: number) => [0, 1, 2].map((i) => `Page1[0].Table_SchD[0].${name}[0].f1_${String(base + i).padStart(2, "0")}[0]`);

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your taxpayer identification number", type: "ssn", maxLen: 11, locate: { name: P(2) } },
  {
    id: "businesses", line: "1", label: "Trades, businesses, or aggregations receiving qualified payments from a cooperative (up to 3 per schedule)", type: "list", rows: 3,
    items: [
      { id: "name", label: "1a Trade, business, or aggregation name", type: "text" },
      { id: "tin", label: "1b Taxpayer identification number", type: "text", maxLen: 11 },
      { id: "line2", label: "2 Qualified business income allocable to the qualified payments from the cooperative", type: "money" },
      { id: "line3", label: "3 Line 2 times 9%", type: "money", computed: true },
      { id: "line4", label: "4 W-2 wages allocable to the qualified payments", type: "money" },
      { id: "line5", label: "5 Line 4 times 50%", type: "money", computed: true },
      { id: "line6", label: "6 Patron reduction: smaller of line 3 or line 5 (to Form 8995-A line 14)", type: "money", computed: true },
    ],
    listLocate: both({ name: row("Row1a", 3), tin: row("Row1b", 6), line2: row("Row2", 9), line3: row("Row3", 12), line4: row("Row4", 15), line5: row("Row5", 18), line6: row("Row6", 21) }),
  },
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

export const form8995ad: FormDef = {
  id: "f8995ad",
  title: "Schedule D (Form 8995-A), Special Rules for Patrons of Agricultural or Horticultural Cooperatives",
  shortTitle: "Schedule D (8995-A)",
  description: "Figures the patron reduction (the lesser of 9% of the QBI allocable to qualified cooperative payments or 50% of the related W-2 wages) that reduces the Form 8995-A deduction of a cooperative patron.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8995a.pdf",
  notes: `**Who files.** Farmers and other patrons who received qualified payments (per-unit retain allocations or patronage dividends) from a specified agricultural or horticultural cooperative, reported on Form 1099-PATR.

**What the engine computes.** Lines 3, 5, and 6 for each business; line 6 is the patron reduction placed on Form 8995-A line 14 for that business (the engine applies the same rule inside Form 8995-A when a row is marked patron).

**What to verify.** Only the QBI and wages allocable to the qualified payments count. Any DPAD passed through from the cooperative (Form 1099-PATR box 6) goes on Form 8995-A line 38.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const rows = c.list("businesses");
    if (rows.length > 3) c.warn("More than 3 businesses: only the first 3 print; attach additional Schedules D.");
    const out: ListRow[] = rows.map((r) => {
      const l3 = Math.round(num(r, "line2") * 0.09), l5 = Math.round(num(r, "line4") * 0.5);
      return { ...r, line3: l3, line5: l5, line6: Math.min(l3, l5) };
    });
    c.out["businesses"] = out;
    for (const [i, r] of out.entries()) c.computations.push({ id: `businesses[${i}].line6`, line: "6", label: `${String(r["name"] ?? `Business ${i + 1}`)}: patron reduction`, value: num(r, "line6"), formula: `min(9% of ${f(num(r, "line2"))}, 50% of ${f(num(r, "line4"))})` });
    return c.result();
  },
};
