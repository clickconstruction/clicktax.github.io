import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FormDef, ListItemDef, ListRow, TaxYear } from "../types.ts";
import { PHASE_IN_RANGE } from "./form8995a.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const row = (name: string, base: number) => [0, 1, 2].map((i) => `Page1[0].Table_${name}[0].f1_${base + i}[0]`);
const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, label: string, extra: Partial<ListItemDef> = {}): ListItemDef => ({ id, label, type: "money", ...extra });
const scomp = (id: string, line: string, label: string, name: string, notes: string): FieldDef => ({ id, line, label, type: "money", computed: true, locate: { name }, notes });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your taxpayer identification number", type: "ssn", maxLen: 11, locate: { name: P(2) } },
  {
    id: "businesses", line: "1", label: "Part I: specified service trades or businesses other than PTPs (up to 3)", type: "list", rows: 3,
    items: [
      { id: "name", label: "1a Trade or business name", type: "text" },
      { id: "tin", label: "1b Taxpayer identification number", type: "text", maxLen: 11 },
      money("qbi", "2 Qualified business income or (loss)"),
      money("w2_wages", "3 Allocable share of W-2 wages"),
      money("ubia", "4 Allocable share of UBIA of qualified property"),
      money("line11", "11 Applicable percentage of QBI (to Form 8995-A line 2 or Schedule C)", { computed: true }),
      money("line12", "12 Applicable percentage of W-2 wages (to Form 8995-A line 4)", { computed: true }),
      money("line13", "13 Applicable percentage of UBIA (to Form 8995-A line 7)", { computed: true }),
    ],
    listLocate: both({ name: row("PartI[0].Row1a", 3), tin: row("PartI[0].Row1b", 6), qbi: row("PartI[0].Row2", 9), w2_wages: row("PartI[0].Row3", 12), ubia: row("PartI[0].Row4", 15), line11: row("PartI[0].Row11", 42), line12: row("PartI[0].Row12", 45), line13: row("PartI[0].Row13", 48) }),
  },
  { id: "line5", line: "5", label: "Taxable income before the qualified business income deduction", type: "money", locate: { name: "Page1[0].Table_PartI[0].Row5[0].Ln5[0].f1_18[0]" } },
  scomp("line6", "6", "Threshold ($197,300, or $394,600 if married filing jointly, for 2025)", "Page1[0].Table_PartI[0].Row6[0].Ln6[0].f1_22[0]", "threshold for the filing status"),
  scomp("line7", "7", "Line 5 minus line 6", "Page1[0].Table_PartI[0].Row7[0].Ln7[0].f1_26[0]", "5 - 6"),
  scomp("line8", "8", "Phase-in range ($50,000, or $100,000 if married filing jointly)", "Page1[0].Table_PartI[0].Row8[0].Ln8[0].f1_30[0]", "phase-in range"),
  { id: "line9", line: "9", label: "Line 7 divided by line 8 (decimal)", type: "text", computed: true, locate: { name: "Page1[0].Table_PartI[0].Row9[0].Ln9[0].f1_34[0]" } },
  { id: "line10", line: "10", label: "Applicable percentage: 100% minus line 9", type: "text", computed: true, locate: { name: "Page1[0].Table_PartI[0].Row10[0].Ln10[0].f1_38[0]" } },
  {
    id: "ptps", line: "14", label: "Part II: publicly traded partnerships that are specified service businesses (up to 3)", type: "list", rows: 3,
    items: [
      { id: "name", label: "14 Partnership name", type: "text" },
      { id: "tin", label: "15 Taxpayer identification number", type: "text", maxLen: 11 },
      money("income", "16 Qualified PTP income or (loss)"),
    ],
    listLocate: both({ name: row("PartII[0].Row14", 51), tin: row("PartII[0].Row15", 54), income: row("PartII[0].Row16", 57) }),
  },
  scomp("line17", "17", "Total PTP specified service income or (loss)", P(60), "sum of line 16"),
  scomp("line18", "18", "Taxable income before the qualified business income deduction", P(61), "line 5"),
  scomp("line19", "19", "Threshold", P(62), "threshold for the filing status"),
  scomp("line20", "20", "Line 18 minus line 19", P(63), "18 - 19"),
  scomp("line21", "21", "Phase-in range", P(64), "phase-in range"),
  { id: "line22", line: "22", label: "Line 20 divided by line 21 (decimal)", type: "text", computed: true, locate: { name: P(65) } },
  { id: "line23", line: "23", label: "Applicable percentage: 100% minus line 22", type: "text", computed: true, locate: { name: P(66) } },
  scomp("line24", "24", "Applicable percentage of PTP income: line 17 times line 23 (to Form 8995-A line 28)", P(67), "17 x 23"),
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

export const form8995aa: FormDef = {
  id: "f8995aa",
  title: "Schedule A (Form 8995-A), Specified Service Trades or Businesses",
  shortTitle: "Schedule A (8995-A)",
  description: "Reduces the qualified business income, W-2 wages, and UBIA of a specified service trade or business by the applicable percentage when taxable income is inside the phase-in range above the threshold; the reduced amounts feed Form 8995-A.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8995a.pdf",
  notes: `**Who files.** Owners of a specified service trade or business (health, law, accounting, actuarial science, performing arts, consulting, athletics, financial or brokerage services, investing, or a business whose principal asset is the reputation or skill of its owners) whose taxable income before the deduction is above the threshold but not above the threshold plus the phase-in range. Above that range the business gets no deduction; at or below the threshold no reduction applies.

**What the engine computes.** Lines 6 through 13 and 17 through 24: the applicable percentage (100% minus the share of the phase-in range used) and the reduced QBI, W-2 wages, UBIA, and PTP income. In a full return the engine applies the same percentage inside Form 8995-A and attaches this schedule for the SSTB rows.

**What to verify.** The taxable income on line 5 must be the same figure as Form 8995-A line 33. Rental activity to a related SSTB is itself an SSTB.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const p = params(ctx.year);
    const joint = c.str("filing_status") === "mfj";
    const thr = joint ? p.qbiThreshold.mfj : p.qbiThreshold.other;
    const range = joint ? PHASE_IN_RANGE.mfj : PHASE_IN_RANGE.other;
    const ti = c.n("line5");
    const over = Math.max(0, ti - thr);
    const share = Math.min(1, over / range);
    const applicable = 1 - share;
    c.set("line6", thr, "Threshold", joint ? "married filing jointly" : "other filing statuses", "6");
    c.set("line7", over, "Excess over the threshold", `${f(ti)} - ${f(thr)}`, "7");
    c.set("line8", range, "Phase-in range", joint ? "$100,000" : "$50,000", "8");
    c.setScalar("line9", String(Math.round(share * 10000) / 10000), "Share of the phase-in range used", `${f(over)} / ${f(range)}`, "9");
    c.setScalar("line10", String(Math.round(applicable * 10000) / 100), "Applicable percentage", `100% - ${Math.round(share * 10000) / 100}%`, "10");
    if (over <= 0) c.warn("Taxable income is not above the threshold: Schedule A is not needed (100% of the SSTB amounts count).");
    if (over >= range) c.warn("Taxable income exceeds the threshold plus the phase-in range: specified service businesses get no deduction (applicable percentage 0%).");
    const rows = c.list("businesses");
    if (rows.length > 3) c.warn("More than 3 businesses: only the first 3 print; attach additional Schedules A.");
    c.out["businesses"] = rows.map((r) => ({ ...r, line11: Math.round(num(r, "qbi") * applicable), line12: Math.round(num(r, "w2_wages") * applicable), line13: Math.round(num(r, "ubia") * applicable) }));
    const ptps = c.list("ptps");
    const l17 = c.set("line17", ptps.reduce((a, r) => a + num(r, "income"), 0), "Total PTP specified service income", ptps.length ? ptps.map((r) => f(num(r, "income"))).join(" + ") : "none", "17");
    c.set("line18", ti, "Taxable income before the deduction", "line 5", "18");
    c.set("line19", thr, "Threshold", "line 6", "19");
    c.set("line20", over, "Excess over the threshold", "18 - 19", "20");
    c.set("line21", range, "Phase-in range", "line 8", "21");
    c.setScalar("line22", String(Math.round(share * 10000) / 10000), "Share of the phase-in range used", "20 / 21", "22");
    c.setScalar("line23", String(Math.round(applicable * 10000) / 100), "Applicable percentage", "100% - line 22", "23");
    c.set("line24", Math.round(l17 * applicable), "Applicable percentage of PTP income (Form 8995-A line 28)", `${f(l17)} x ${Math.round(applicable * 10000) / 100}%`, "24");
    return c.result();
  },
};
