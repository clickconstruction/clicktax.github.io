import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const amt = (id: string, line: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page: 1, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, { computed: true, notes, ...extra });

const ROWS = ["i", "ii", "iii", "iv", "v"];
const R24 = ["Ln1A_Row1", "Ln1B_Row2", "Ln1C_Row3", "Ln1D_Row4", "Ln1E_Row5"];
const pad = (n: number) => String(n).padStart(2, "0");

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { names: { 2024: "Page1[0].f1_1[0]", 2025: "Page1[0].f1_01[0]" } } },
  { id: "ssn", label: "Your taxpayer identification number", type: "ssn", maxLen: 11, locate: { names: { 2024: "Page1[0].f1_2[0]", 2025: "Page1[0].f1_02[0]" } } },
  {
    id: "businesses",
    line: "1",
    label: "Qualified trades or businesses (up to 5): name, taxpayer identification number, and qualified business income or (loss)",
    type: "list",
    rows: 5,
    items: [
      { id: "name", label: "Trade, business, or aggregation name", type: "text" },
      { id: "tin", label: "Taxpayer identification number", type: "text", maxLen: 11 },
      { id: "qbi", label: "Qualified business income or (loss)", type: "money" },
    ],
    listLocate: {
      2024: { name: ROWS.map((_, i) => `Page1[0].Table[0].${R24[i]}[0].f1_${3 + 3 * i}[0]`), tin: ROWS.map((_, i) => `Page1[0].Table[0].${R24[i]}[0].f1_${4 + 3 * i}[0]`), qbi: ROWS.map((_, i) => `Page1[0].Table[0].${R24[i]}[0].f1_${5 + 3 * i}[0]`) },
      2025: { name: ROWS.map((r, i) => `Page1[0].Table[0].Row1${r}[0].f1_${pad(3 + 3 * i)}[0]`), tin: ROWS.map((r, i) => `Page1[0].Table[0].Row1${r}[0].f1_${pad(4 + 3 * i)}[0]`), qbi: ROWS.map((r, i) => `Page1[0].Table[0].Row1${r}[0].f1_${pad(5 + 3 * i)}[0]`) },
    },
    notes: "Filled from each Schedule C when preparing a full return: net profit less the allocable share of the SE tax deduction, SE health insurance, and retirement plan contributions.",
  },
  comp("line2", "2", "Total qualified business income or (loss)", "sum of line 1 column (c)"),
  amt("line3", "3", "Qualified business net (loss) carryforward from the prior year (enter as a positive amount; it is subtracted)", { locate: N("Page1[0].f1_19[0]") }),
  comp("line4", "4", "Total qualified business income", "line 2 - line 3, not less than zero"),
  comp("line5", "5", "Qualified business income component", "line 4 x 20%"),
  amt("line6", "6", "Qualified REIT dividends and publicly traded partnership (PTP) income or (loss)"),
  amt("line7", "7", "Qualified REIT dividends and qualified PTP (loss) carryforward from the prior year (positive amount; subtracted)", { locate: N("Page1[0].f1_23[0]") }),
  comp("line8", "8", "Total qualified REIT dividends and PTP income", "line 6 - line 7, not less than zero"),
  comp("line9", "9", "REIT and PTP component", "line 8 x 20%"),
  comp("line10", "10", "Qualified business income deduction before the income limitation", "line 5 + line 9"),
  amt("line11", "11", "Taxable income before qualified business income deduction", { notes: "Form 1040 line 11 minus line 12 (and minus Schedule 1-A for 2025). Filled when preparing a full return." }),
  amt("line12", "12", "Net capital gain increased by qualified dividends", { notes: "Form 1040 line 3a plus net capital gain (line 7 if not less than zero). Filled when preparing a full return." }),
  comp("line13", "13", "Line 11 minus line 12", "not less than zero"),
  comp("line14", "14", "Income limitation", "line 13 x 20%"),
  comp("line15", "15", "Qualified business income deduction; carried to Form 1040 line 13", "smaller of line 10 or line 14", { alwaysShow: true }),
  comp("line16", "16", "Total qualified business (loss) carryforward", "line 2 - line 3 if negative, else 0", { locate: N("Page1[0].f1_32[0]") }),
  comp("line17", "17", "Total qualified REIT dividends and PTP (loss) carryforward", "line 6 - line 7 if negative, else 0", { locate: N("Page1[0].f1_33[0]") }),
];

export const form8995: FormDef = {
  id: "f8995",
  title: "Form 8995, Qualified Business Income Deduction Simplified Computation",
  shortTitle: "Form 8995",
  description: "The 20% deduction for qualified business income from sole proprietorships, partnerships, S corporations, REIT dividends, and PTPs, for taxpayers below the income threshold. Line 15 goes to Form 1040 line 13.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8995.pdf",
  notes: `**What this form is for.** Most sole proprietors can deduct 20% of qualified business income (QBI), limited to 20% of taxable income net of capital gains. The simplified form applies only when taxable income before the deduction is at or below $191,950 ($383,900 married filing jointly) for 2024 or $197,300 ($394,600) for 2025; above that, Form 8995-A applies and this engine warns.

**What the engine computes.** Lines 2, 4, 5, 8, 9, 10, 13, 14, 15, 16, and 17. When preparing a full return, each Schedule C supplies a row on line 1 (net profit less the allocable SE tax deduction, SE health insurance, and retirement contributions), line 11 comes from Form 1040, and line 12 from lines 3a and 7.

**Things to verify before filing.**
- QBI excludes wages, capital gains, interest, and income from a specified service trade or business above the threshold.
- Loss carryforwards on lines 3 and 7 come from last year's Form 8995 lines 16 and 17.
- If any business is reported on a Schedule K-1, use the QBI figure from the K-1 statement, not the ordinary income.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const rows = c.list("businesses");
    const parts: Array<[string, number]> = [];
    let total = 0;
    for (const r of rows) {
      const q = Number(r["qbi"] ?? 0) || 0;
      total += q;
      parts.push([String(r["name"] ?? "business"), q]);
    }
    const l2 = c.set("line2", total, "Total qualified business income or (loss)", parts.length ? c.show(parts) : "no businesses listed", "2");
    const l3 = Math.abs(c.n("line3"));
    const net = l2 - l3;
    const l4 = c.set("line4", Math.max(0, net), "Total qualified business income", `line 2 ${f(l2)} - line 3 ${f(l3)}${net < 0 ? " (not less than zero)" : ""}`, "4");
    const l5 = c.set("line5", l4 * 0.2, "QBI component", `line 4 ${f(l4)} x 20%`, "5");
    const l6 = c.n("line6");
    const l7 = Math.abs(c.n("line7"));
    const reit = l6 - l7;
    const l8 = c.set("line8", Math.max(0, reit), "Total REIT dividends and PTP income", `line 6 ${f(l6)} - line 7 ${f(l7)}`, "8");
    const l9 = c.set("line9", l8 * 0.2, "REIT and PTP component", `line 8 ${f(l8)} x 20%`, "9");
    const l10 = c.set("line10", l5 + l9, "QBI deduction before the income limitation", `line 5 ${f(l5)} + line 9 ${f(l9)}`, "10");
    const l11 = c.n("line11");
    const l12 = c.n("line12");
    const l13 = c.set("line13", Math.max(0, l11 - l12), "Line 11 minus line 12", `max(0, ${f(l11)} - ${f(l12)})`, "13");
    const l14 = c.set("line14", l13 * 0.2, "Income limitation", `line 13 ${f(l13)} x 20%`, "14");
    c.set("line15", Math.min(l10, l14), "Qualified business income deduction", `min(line 10 ${f(l10)}, line 14 ${f(l14)})`, "15");
    c.set("line16", net < 0 ? net : 0, "QBI loss carryforward", net < 0 ? `line 2 ${f(l2)} - line 3 ${f(l3)}` : "none", "16");
    c.set("line17", reit < 0 ? reit : 0, "REIT/PTP loss carryforward", reit < 0 ? `line 6 ${f(l6)} - line 7 ${f(l7)}` : "none", "17");
    const status = c.str("filing_status");
    const thr = status === "mfj" ? params(ctx.year).qbiThreshold.mfj : params(ctx.year).qbiThreshold.other;
    if (l11 > thr) c.warn(`Taxable income before the QBI deduction (${f(l11)}) exceeds the simplified-form threshold (${f(thr)}); Form 8995-A applies instead and the deduction may be limited by W-2 wages and property. Treat line 15 as an upper bound.`);
    if (rows.length > 5) c.warn("More than five businesses: attach additional Forms 8995 for the rest.");
    if (!c.has("line11")) c.warn("line11 (taxable income before the deduction) was not supplied, so the income limitation is 0.");
    return c.result();
  },
};
