import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FormDef, ListItemDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const pad = (n: number) => String(n).padStart(2, "0");
const COLS = ["A", "B", "C"];
const partI = (base: number) => COLS.map((col, i) => `Page1[0].Table_PartI[0].Row${col}[0].f1_${pad(base + i * 2)}[0]`);
const partIBox = (base: number) => COLS.map((col, i) => `Page1[0].Table_PartI[0].Row${col}[0].c1_${base + i * 3}[0]`);
const partII = (row: number) => COLS.map((_, i) => `Page1[0].Table_PartII[0].Row${row}[0].f1_${pad(9 + (row - 2) * 3 + i)}[0]`);
const partIII = (row: number) => COLS.map((_, i) => `Page2[0].Table_PartIII[0].Row${row}[0].f2_${pad({ 17: 1, 18: 4, 19: 7, 25: 30, 26: 33 }[row]! + i)}[0]`);
const P2 = (n: number) => `Page2[0].f2_${pad(n)}[0]`;
const money = (id: string, label: string, extra: Partial<ListItemDef> = {}): ListItemDef => ({ id, label, type: "money", ...extra });
const comp = (id: string, label: string): ListItemDef => money(id, label, { computed: true });
const scalar = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const scomp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => scalar(id, line, label, name, { computed: true, notes, ...extra });

export const PHASE_IN_RANGE = { mfj: 100000, other: 50000 };

const items: ListItemDef[] = [
  { id: "name", label: "(a) Trade, business, or aggregation name", type: "text" },
  { id: "sstb", label: "(b) Specified service trade or business (the engine applies the Schedule A applicable percentage)", type: "checkbox" },
  { id: "aggregation", label: "(c) Aggregation (Schedule B)", type: "checkbox" },
  { id: "tin", label: "(d) Taxpayer identification number", type: "text", maxLen: 11 },
  { id: "patron", label: "(e) Patron of an agricultural or horticultural cooperative (Schedule D)", type: "checkbox" },
  money("qbi", "Qualified business income or (loss) before loss netting and the SSTB percentage"),
  money("w2_wages", "Allocable share of W-2 wages (before the SSTB percentage)"),
  money("ubia", "Allocable share of the unadjusted basis immediately after acquisition (UBIA) of qualified property (before the SSTB percentage)"),
  money("patron_qbi", "Patrons: qualified business income allocable to qualified payments from the cooperative (Schedule D line 2)"),
  money("patron_wages", "Patrons: W-2 wages allocable to the qualified payments (Schedule D line 4)"),
  comp("line2", "2 Qualified business income after loss netting and the SSTB percentage"),
  comp("line3", "3 Line 2 times 20%"),
  comp("line4", "4 Allocable share of W-2 wages"),
  comp("line5", "5 Line 4 times 50%"),
  comp("line6", "6 Line 4 times 25%"),
  comp("line7", "7 Allocable share of UBIA of qualified property"),
  comp("line8", "8 Line 7 times 2.5%"),
  comp("line9", "9 Add lines 6 and 8"),
  comp("line10", "10 Greater of line 5 or line 9"),
  comp("line11", "11 W-2 wage and UBIA limitation: smaller of line 3 or line 10"),
  comp("line12", "12 Phased-in reduction from line 26"),
  comp("line13", "13 QBI deduction before the patron reduction"),
  comp("line14", "14 Patron reduction (Schedule D line 6)"),
  comp("line15", "15 Qualified business income component"),
  comp("line17", "17 Amount from line 3"),
  comp("line18", "18 Amount from line 10"),
  comp("line19", "19 Line 17 minus line 18"),
  comp("line25", "25 Total phase-in reduction: line 19 times line 24"),
  comp("line26", "26 QBI after the phase-in reduction: line 17 minus line 25"),
];
const listLocate: Record<string, string[]> = {
  name: partI(3), tin: partI(4), sstb: partIBox(1), aggregation: partIBox(2), patron: partIBox(3),
  line2: partII(2), line3: partII(3), line4: partII(4), line5: partII(5), line6: partII(6), line7: partII(7), line8: partII(8), line9: partII(9), line10: partII(10), line11: partII(11), line12: partII(12), line13: partII(13), line14: partII(14), line15: partII(15),
  line17: partIII(17), line18: partIII(18), line19: partIII(19), line25: partIII(25), line26: partIII(26),
};

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: "Page1[0].f1_01[0]" } },
  { id: "ssn", label: "Your taxpayer identification number", type: "ssn", maxLen: 11, locate: { name: "Page1[0].f1_02[0]" } },
  { id: "businesses", line: "1", label: "Trades, businesses, or aggregations (up to 3 per form): name, SSTB and aggregation and patron flags, TIN, qualified business income, W-2 wages, and UBIA", type: "list", rows: 3, items, listLocate: both(listLocate) },
  { id: "qbi_loss_carryforward", label: "Qualified business net (loss) carryforward from the prior year (Schedule C (Form 8995-A) line 2; enter as a positive amount)", type: "money", noPdf: true },
  { id: "qbi_loss_carryforward_next", label: "Qualified business net (loss) carryforward to next year (Schedule C line 6, as a positive amount)", type: "money", computed: true, noPdf: true },
  scomp("line16", "16", "Total qualified business income component (all line 15 amounts)", partII(16)[2]!, "sum of line 15", { alwaysShow: true }),
  scomp("line20", "20", "Taxable income before the qualified business income deduction", "Page2[0].Table_PartIII[0].Row20[0].Ln20[0].f2_10[0]", "line 33"),
  scomp("line21", "21", "Threshold ($197,300, or $394,600 if married filing jointly, for 2025)", "Page2[0].Table_PartIII[0].Row21[0].Ln21[0].f2_14[0]", "threshold for the filing status"),
  scomp("line22", "22", "Line 20 minus line 21", "Page2[0].Table_PartIII[0].Row22[0].Ln22[0].f2_18[0]", "20 - 21"),
  scomp("line23", "23", "Phase-in range ($50,000, or $100,000 if married filing jointly)", "Page2[0].Table_PartIII[0].Row23[0].Ln23[0].f2_22[0]", "phase-in range"),
  { id: "line24", line: "24", label: "Phase-in percentage: line 22 divided by line 23", type: "text", computed: true, locate: { name: "Page2[0].Table_PartIII[0].Row24[0].Ln24[0].f2_26[0]" } },
  scomp("line27", "27", "Total qualified business income component (line 16)", P2(36), "line 16"),
  scalar("line28", "28", "Qualified REIT dividends and publicly traded partnership (PTP) income or (loss)", P2(37)),
  scalar("line29", "29", "Qualified REIT dividends and PTP (loss) carryforward from prior years (enter as a positive amount; it is subtracted)", P2(38)),
  scomp("line30", "30", "Total qualified REIT dividends and PTP income (not less than zero)", P2(39), "28 - 29"),
  scomp("line31", "31", "REIT and PTP component: line 30 times 20%", P2(40), "30 x 20%"),
  scomp("line32", "32", "QBI deduction before the income limitation: add lines 27 and 31", P2(41), "27 + 31"),
  scalar("line33", "33", "Taxable income before the qualified business income deduction (Form 1040 line 11 minus line 12, and minus Schedule 1-A for 2025)", P2(42)),
  scalar("line34", "34", "Net capital gain increased by qualified dividends", P2(43)),
  scomp("line35", "35", "Line 33 minus line 34 (not less than zero)", P2(44), "33 - 34"),
  scomp("line36", "36", "Income limitation: line 35 times 20%", P2(45), "35 x 20%"),
  scomp("line37", "37", "QBI deduction before the DPAD: smaller of line 32 or line 36", P2(46), "min(32, 36)"),
  scalar("line38", "38", "Domestic production activities deduction (DPAD) under section 199A(g) allocated from an agricultural or horticultural cooperative", P2(47)),
  scomp("line39", "39", "Total qualified business income deduction: add lines 37 and 38; to Form 1040 line 13", P2(48), "37 + 38", { alwaysShow: true }),
  scomp("line40", "40", "Total qualified REIT dividends and PTP (loss) carryforward (shown as a loss)", P2(49), "28 - 29 when negative"),
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
const r0 = (x: number) => Math.round(x);

/** Nets business losses against the businesses with income (Schedule C (Form 8995-A)): returns the adjusted QBI per row and the loss carried forward. */
export function netLosses(qbis: number[], priorCarryforward: number): { adjusted: number[]; reductions: number[]; totalLoss: number; totalIncome: number; netted: number; carryforward: number } {
  const totalLoss = qbis.filter((q) => q < 0).reduce((a, q) => a + q, 0) - Math.abs(priorCarryforward);
  const totalIncome = qbis.filter((q) => q > 0).reduce((a, q) => a + q, 0);
  const netted = Math.min(Math.abs(totalLoss), totalIncome);
  const reductions = qbis.map((q) => (q > 0 && totalIncome > 0 ? r0((netted * q) / totalIncome) : 0));
  const adjusted = qbis.map((q, i) => (q > 0 ? q - reductions[i]! : 0));
  return { adjusted, reductions, totalLoss, totalIncome, netted, carryforward: Math.max(0, Math.abs(totalLoss) - netted) };
}

export const form8995a: FormDef = {
  id: "f8995a",
  title: "Form 8995-A, Qualified Business Income Deduction",
  shortTitle: "Form 8995-A",
  description: "The full qualified business income deduction computation for taxpayers above the income threshold or with cooperative patronage: the 20% of QBI limited by W-2 wages and the basis of qualified property, the phased-in reduction, specified service business limits, loss netting, the REIT and PTP component, and the 20%-of-taxable-income cap; line 39 goes to Form 1040 line 13.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8995a.pdf",
  notes: `**Who files.** Anyone claiming the qualified business income deduction whose taxable income before the deduction is above $197,300 ($394,600 married filing jointly) for 2025 ($191,950 and $383,900 for 2024), and patrons of agricultural or horticultural cooperatives. Below the threshold Form 8995 applies instead. Up to three businesses fit on one form; attach more for additional businesses.

**What the engine computes.** Loss netting across businesses and the prior-year carryforward (Schedule C), the specified service applicable percentage inside the phase-in range (Schedule A), the patron reduction from the patron fields (Schedule D), and every Part II, III, and IV line: 20% of each business's QBI limited to the greater of 50% of its W-2 wages or 25% of wages plus 2.5% of UBIA, the phase-in reduction when taxable income is within $50,000 ($100,000 joint) of the threshold, the REIT and PTP component, and the 20%-of-taxable-income limit. In a full return the Schedule C and F businesses supply the rows, W-2 wages default from Schedule C line 26 or Schedule F line 22, UBIA from the Form 4562 assets still in their depreciable period, and line 39 goes to Form 1040 line 13.

**What to verify.** W-2 wages must be the wages properly allocable to QBI (reported on Forms W-2 filed with the SSA), and UBIA covers depreciable tangible property held at year end whose depreciable period (the later of 10 years or the recovery period) has not ended. A specified service business (health, law, accounting, consulting, athletics, financial services, and businesses relying on the reputation or skill of owners) gets no deduction once taxable income exceeds the threshold plus the phase-in range. Guaranteed payments, reasonable compensation, and capital gains are not QBI.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const p = params(ctx.year);
    const status = c.str("filing_status");
    const joint = status === "mfj";
    const thr = joint ? p.qbiThreshold.mfj : p.qbiThreshold.other;
    const range = joint ? PHASE_IN_RANGE.mfj : PHASE_IN_RANGE.other;
    if (!status) c.warn("filing_status is missing; the single threshold is used.");
    const ti = c.n("line33");
    if (!c.has("line33")) c.warn("line33 (taxable income before the deduction) was not supplied: the threshold tests and the income limitation treat it as zero.");
    const over = Math.max(0, ti - thr);
    const phasePct = over > 0 ? Math.min(1, over / range) : 0;
    const inRange = over > 0 && over < range;
    const rows = c.list("businesses");
    if (rows.length > 3) c.warn("More than 3 businesses: only the first 3 print; attach additional Forms 8995-A for the rest.");
    // Schedule A: specified service businesses.
    const applicable = 1 - phasePct;
    const base = rows.map((r) => {
      const sstb = r["sstb"] === true;
      let qbi = num(r, "qbi"), wages = num(r, "w2_wages"), ubia = num(r, "ubia");
      if (sstb && over > 0) {
        if (!inRange) { c.warn(`${String(r["name"] ?? "A specified service business")}: taxable income exceeds the threshold plus the phase-in range, so the specified service business gets no deduction.`); qbi = 0; wages = 0; ubia = 0; }
        else { qbi = r0(qbi * applicable); wages = r0(wages * applicable); ubia = r0(ubia * applicable); }
      }
      return { qbi, wages, ubia };
    });
    // Schedule C: loss netting.
    const net = netLosses(base.map((b) => b.qbi), c.n("qbi_loss_carryforward"));
    c.set("qbi_loss_carryforward_next", net.carryforward, "QBI loss carryforward to next year", net.carryforward ? `losses ${f(Math.abs(net.totalLoss))} - netted ${f(net.netted)}` : "none", "Sch C 6");
    if (net.netted > 0) c.warn(`Business losses of ${f(net.netted)} were netted against the businesses with income (Schedule C (Form 8995-A)).`);
    let usedPartIII = false;
    let l16 = 0;
    const out = rows.map((r, i) => {
      const b = base[i]!;
      const l2 = net.adjusted[i]!;
      const l3 = r0(l2 * 0.2);
      const o: ListRow = { ...r, line2: l2, line3: l3 };
      let l13: number;
      if (over <= 0) {
        l13 = l3;
      } else {
        const l4 = b.wages, l5 = r0(l4 * 0.5), l6 = r0(l4 * 0.25), l7 = b.ubia, l8 = r0(l7 * 0.025), l9 = l6 + l8, l10 = Math.max(l5, l9), l11 = Math.min(l3, l10);
        Object.assign(o, { line4: l4, line5: l5, line6: l6, line7: l7, line8: l8, line9: l9, line10: l10, line11: l11 });
        let l12 = 0;
        if (inRange && l10 < l3) {
          usedPartIII = true;
          const l19 = l3 - l10;
          const l25 = r0(l19 * phasePct);
          const l26 = l3 - l25;
          Object.assign(o, { line17: l3, line18: l10, line19: l19, line25: l25, line26: l26 });
          l12 = l26;
        }
        o["line12"] = l12;
        l13 = Math.max(l11, l12);
      }
      o["line13"] = l13;
      const l14 = r["patron"] === true ? Math.min(r0(num(r, "patron_qbi") * 0.09), r0(num(r, "patron_wages") * 0.5)) : 0;
      o["line14"] = l14;
      const l15 = Math.max(0, l13 - l14);
      o["line15"] = l15;
      l16 += l15;
      c.computations.push({ id: `businesses[${i}].line15`, line: "15", label: `${String(r["name"] ?? `Business ${COLS[i]}`)}: QBI component`, value: l15, formula: over <= 0 ? `20% of ${f(l2)}` : `min(20% of ${f(l2)} = ${f(l3)}, wage/UBIA limit ${f(num(o, "line10"))})${num(o, "line12") ? ` phased in to ${f(num(o, "line12"))}` : ""}${l14 ? ` - patron reduction ${f(l14)}` : ""}` });
      return o;
    });
    c.out["businesses"] = out;
    c.set("line16", l16, "Total QBI component", out.length ? out.map((o) => f(num(o, "line15"))).join(" + ") : "none", "16");
    if (usedPartIII) {
      c.set("line20", ti, "Taxable income before the deduction", "line 33", "20");
      c.set("line21", thr, "Threshold", joint ? "married filing jointly" : "other filing statuses", "21");
      c.set("line22", over, "Excess over the threshold", `${f(ti)} - ${f(thr)}`, "22");
      c.set("line23", range, "Phase-in range", joint ? "$100,000" : "$50,000", "23");
      c.setScalar("line24", String(Math.round(phasePct * 10000) / 100), "Phase-in percentage", `${f(over)} / ${f(range)}`, "24");
    }
    const l27 = c.set("line27", l16, "Total QBI component", "line 16", "27");
    const l28 = c.n("line28"), l29 = Math.abs(c.n("line29"));
    const reit = l28 - l29;
    const l30 = c.set("line30", Math.max(0, reit), "Total REIT dividends and PTP income", `${f(l28)} - ${f(l29)}`, "30");
    const l31 = c.set("line31", r0(l30 * 0.2), "REIT and PTP component", `${f(l30)} x 20%`, "31");
    const l32 = c.set("line32", l27 + l31, "QBI deduction before the income limitation", `${f(l27)} + ${f(l31)}`, "32");
    const l35 = c.set("line35", Math.max(0, ti - c.n("line34")), "Taxable income less net capital gain", `${f(ti)} - ${f(c.n("line34"))}`, "35");
    const l36 = c.set("line36", r0(l35 * 0.2), "Income limitation", `${f(l35)} x 20%`, "36");
    const l37 = c.set("line37", Math.min(l32, l36), "QBI deduction before the DPAD", `min(${f(l32)}, ${f(l36)})`, "37");
    let l38 = c.n("line38");
    if (l38 > ti - l37) { c.warn(`Line 38 (DPAD) is limited to line 33 minus line 37 (${f(Math.max(0, ti - l37))}).`); l38 = Math.max(0, ti - l37); c.setScalar("line38", l38, "DPAD", "limited", "38"); }
    c.set("line39", l37 + l38, "Total qualified business income deduction (Form 1040 line 13)", `${f(l37)} + ${f(l38)}`, "39");
    c.set("line40", reit < 0 ? reit : 0, "REIT and PTP loss carryforward", reit < 0 ? `${f(l28)} - ${f(l29)}` : "none", "40");
    if (over <= 0 && !rows.some((r) => r["patron"] === true)) c.warn(`Taxable income (${f(ti)}) is not above the ${f(thr)} threshold and no business is a cooperative patron: Form 8995 (the simplified computation) is the form to file.`);
    if (over > 0 && rows.some((r, i) => base[i]!.qbi > 0 && base[i]!.wages === 0 && base[i]!.ubia === 0)) c.warn("A business above the threshold has no W-2 wages or UBIA, so its deduction is zero; supply w2_wages and ubia if the business has them.");
    return c.result();
  },
};
