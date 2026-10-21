import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const P = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const col = (offset: number) => [0, 1, 2].map((r) => `Page1[0].Table_Line3[0].Row${r + 1}[0].f1_${10 + r * 5 + offset}[0]`);

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your taxpayer identification number", type: "ssn", maxLen: 11, locate: { name: P(2) } },
  { id: "aggregation_number", label: "Aggregation number (1 for the first aggregation, then 2, 3, ...)", type: "text", maxLen: 3, locate: { name: P(3) } },
  { id: "description1", line: "1", label: "Description of the aggregated trade or business and the factors met under Regulations section 1.199A-4 (line 1 of 3)", type: "text", locate: { name: P(4) } },
  { id: "description2", line: "1", label: "Description, continued (line 2 of 3)", type: "text", locate: { name: P(5) } },
  { id: "description3", line: "1", label: "Description, continued (line 3 of 3)", type: "text", locate: { name: P(6) } },
  { id: "changed", line: "2", label: "Has this aggregation changed from the prior year (businesses formed, acquired, disposed of, or ceased)?", type: "yesno" },
  { id: "change1", line: "2", label: "Explanation of the change (line 1 of 3)", type: "text", locate: { name: P(7) } },
  { id: "change2", line: "2", label: "Explanation, continued (line 2 of 3)", type: "text", locate: { name: P(8) } },
  { id: "change3", line: "2", label: "Explanation, continued (line 3 of 3)", type: "text", locate: { name: P(9) } },
  {
    id: "businesses", line: "3", label: "Trades or businesses in the aggregation (up to 3 per schedule)", type: "list", rows: 3,
    items: [
      { id: "name", label: "(a) Name of trade or business", type: "text" },
      { id: "tin", label: "(b) Taxpayer identification number", type: "text", maxLen: 11 },
      { id: "qbi", label: "(c) Qualified business income or (loss)", type: "money" },
      { id: "w2_wages", label: "(d) W-2 wages", type: "money" },
      { id: "ubia", label: "(e) Unadjusted basis immediately after acquisition of qualified property", type: "money" },
    ],
    listLocate: both({ name: col(0), tin: col(1), qbi: col(2), w2_wages: col(3), ubia: col(4) }),
  },
  { id: "line4_qbi", line: "4", label: "Total qualified business income of the aggregation (to Form 8995-A line 2 or Schedule C)", type: "money", computed: true, locate: { name: P(25) }, alwaysShow: true },
  { id: "line4_wages", line: "4", label: "Total W-2 wages of the aggregation (to Form 8995-A line 4)", type: "money", computed: true, locate: { name: P(26) } },
  { id: "line4_ubia", line: "4", label: "Total UBIA of the aggregation (to Form 8995-A line 7)", type: "money", computed: true, locate: { name: P(27) } },
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

export const form8995ab: FormDef = {
  id: "f8995ab",
  title: "Schedule B (Form 8995-A), Aggregation of Business Operations",
  shortTitle: "Schedule B (8995-A)",
  description: "Describes a group of trades or businesses treated as one for the qualified business income deduction and totals their QBI, W-2 wages, and UBIA for Form 8995-A.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8995a.pdf",
  notes: `**Who files.** Taxpayers who aggregate businesses under Regulations section 1.199A-4 (same owners holding 50% or more, same tax year, none a specified service business, and two of: shared products or services, shared facilities, or operated in coordination). One schedule per aggregation; aggregation is irrevocable once chosen.

**What the engine computes.** The line 4 totals of columns (c), (d), and (e), which become one row of Form 8995-A Part I (check the aggregation box there).

**What to verify.** Attach the description every year, note any change in the group, and include a copy of any pass-through entity's own aggregation.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const rows = c.list("businesses");
    if (rows.length > 3) c.warn("More than 3 businesses: only the first 3 print; attach additional Schedules B.");
    for (const [k, id] of [["qbi", "line4_qbi"], ["w2_wages", "line4_wages"], ["ubia", "line4_ubia"]] as Array<[string, string]>) {
      c.set(id, rows.reduce((a, r) => a + num(r, k), 0), `Aggregation total ${k.replace("_", " ")}`, rows.length ? rows.map((r) => f(num(r, k))).join(" + ") : "none", "4");
    }
    if (c.has("changed") && c.bool("changed") && !c.str("change1")) c.warn("Line 2 is yes: explain the change in the aggregation (change1 through change3).");
    if (!c.str("description1")) c.warn("Line 1 requires a description of the aggregated business and the factors that allow the aggregation.");
    return c.result();
  },
};
