import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";
import { netLosses } from "./form8995a.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const P = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const col = (offset: number) => [0, 1, 2].map((r) => `Page1[0].Table_Line1[0].Row${r + 1}[0].f1_${String(3 + r * 4 + offset).padStart(2, "0")}[0]`);

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your taxpayer identification number", type: "ssn", maxLen: 11, locate: { name: P(2) } },
  {
    id: "businesses", line: "1", label: "Trades, businesses, or aggregations (up to 3 per schedule) with their qualified business income or (loss)", type: "list", rows: 3,
    items: [
      { id: "name", label: "Trade, business, or aggregation name", type: "text" },
      { id: "qbi", label: "(a) Qualified business income or (loss)", type: "money" },
      { id: "reduction", label: "(b) Reduction for loss netting (shown in parentheses)", type: "money", computed: true },
      { id: "adjusted", label: "(c) Adjusted qualified business income (to Form 8995-A line 2; zero when negative)", type: "money", computed: true },
    ],
    listLocate: both({ name: col(0), qbi: col(1), reduction: col(2), adjusted: col(3) }),
  },
  { id: "line2", line: "2", label: "Qualified business net (loss) carryforward from prior years (enter as a positive amount)", type: "money", locate: { name: P(15) } },
  { id: "line3", line: "3", label: "Total losses: the negative amounts on line 1 column (a) plus line 2 (shown as a positive amount in parentheses)", type: "money", computed: true, locate: { name: P(16) } },
  { id: "line4", line: "4", label: "Total income: the positive amounts on line 1 column (a)", type: "money", computed: true, locate: { name: P(17) } },
  { id: "line5", line: "5", label: "Losses netted with income of other businesses: smaller of line 3 or line 4, allocated to column (b)", type: "money", computed: true, locate: { name: P(18) } },
  { id: "line6", line: "6", label: "Qualified business net (loss) carryforward to next year: line 3 minus line 5 (zero when no loss remains)", type: "money", computed: true, locate: { name: P(19) }, alwaysShow: true },
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

export const form8995ac: FormDef = {
  id: "f8995ac",
  title: "Schedule C (Form 8995-A), Loss Netting and Carryforward",
  shortTitle: "Schedule C (8995-A)",
  description: "Nets qualified business losses (and the prior-year loss carryforward) against the businesses with qualified business income in proportion to their income, and carries any remaining loss to next year.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8995a.pdf",
  notes: `**Who files.** Form 8995-A filers with a qualified business loss in any business, or a qualified business net loss carried forward from the prior year.

**What the engine computes.** Column (b) for each business with income (its share of the netted losses, in proportion to its income), column (c), and lines 3 through 6. The column (c) amounts are what Form 8995-A Part II line 2 uses; the engine does the same netting inside Form 8995-A.

**What to verify.** Losses suspended by the passive activity, at-risk, or basis rules are not QBI losses until allowed. The line 6 carryforward reduces next year's QBI even if the business that generated it has closed.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const rows = c.list("businesses");
    if (rows.length > 3) c.warn("More than 3 businesses: only the first 3 print; attach additional Schedules C.");
    const net = netLosses(rows.map((r) => num(r, "qbi")), c.n("line2"));
    c.out["businesses"] = rows.map((r, i) => ({ ...r, reduction: net.reductions[i]!, adjusted: net.adjusted[i]! }));
    c.set("line3", Math.abs(net.totalLoss), "Total losses", `business losses + carryforward ${f(c.n("line2"))}`, "3");
    c.set("line4", net.totalIncome, "Total income", rows.filter((r) => num(r, "qbi") > 0).map((r) => f(num(r, "qbi"))).join(" + ") || "none", "4");
    c.set("line5", net.netted, "Losses netted with income", `min(${f(Math.abs(net.totalLoss))}, ${f(net.totalIncome)})`, "5");
    c.set("line6", net.carryforward, "Loss carryforward to next year", `${f(Math.abs(net.totalLoss))} - ${f(net.netted)}`, "6");
    return c.result();
  },
};
