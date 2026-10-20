import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FilingStatus, FormDef, TaxYear } from "../types.ts";

/** 2025 inserted line 1b, so every page-1 widget from line 2a on is one number higher than in 2024; page 2 is unchanged. */
const P1 = (n24: number): { names: Partial<Record<TaxYear, string>> } => ({ names: { 2024: `Page1[0].f1_${n24}[0]`, 2025: `Page1[0].f1_${n24 + 1}[0]` } });
const P2 = (n: number) => `Page2[0].f2_${n}[0]`;
const money = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });
const ADJ: Array<[string, string]> = [["2c", "Investment interest expense (difference between regular tax and AMT)"], ["2d", "Depletion (difference)"], ["2e", "Net operating loss deduction from Schedule 1 line 8a (positive)"], ["2f", "Alternative tax net operating loss deduction (negative)"], ["2g", "Interest from specified private activity bonds exempt from the regular tax"], ["2h", "Qualified small business stock exclusion (7%)"], ["2i", "Exercise of incentive stock options (excess of AMT income over regular tax income)"], ["2j", "Estates and trusts (Schedule K-1 (Form 1041) box 12 code A)"], ["2k", "Disposition of property (difference)"], ["2l", "Depreciation on assets placed in service after 1986 (difference)"], ["2m", "Passive activities (difference)"], ["2n", "Loss limitations (difference)"], ["2o", "Circulation costs (difference)"], ["2p", "Long-term contracts (difference)"], ["2q", "Mining costs (difference)"], ["2r", "Research and experimental costs (difference)"], ["2s", "Income from certain installment sales before 1987 (negative)"], ["2t", "Intangible drilling costs preference"]];

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on Form 1040", type: "text", locate: { name: "Page1[0].f1_1[0]" } },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: { name: "Page1[0].f1_2[0]" } },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  money("line1", "1", "Taxable income from Form 1040 line 15 (if zero, the loss from line 11 minus line 14 as a negative)", { names: { 2024: "Page1[0].f1_3[0]" } }, { years: [2024] }),
  money("line1a", "1a", "Form 1040 line 14 total deductions minus the Schedule 1-A line 37 senior deduction", { names: { 2025: "Page1[0].f1_3[0]" } }, { years: [2025] }),
  comp("line1b", "1b", "Form 1040 line 11 (AGI) minus line 1a (negative if a loss)", { names: { 2025: "Page1[0].f1_4[0]" } }, "AGI - 1a", { years: [2025] }),
  { id: "agi", label: "Adjusted gross income (Form 1040 line 11), used for line 1b on the 2025 form", type: "money", years: [2025] },
  money("line2a", "2a", "Taxes from Schedule A line 7 if itemizing; otherwise the standard deduction from Form 1040 line 12", P1(4)),
  money("line2b", "2b", "Tax refund from Schedule 1 line 1 or 8z (entered as a negative)", P1(5)),
  ...ADJ.map(([line, label], i) => money(`line${line}`, line, label, P1(6 + i))),
  money("line3", "3", "Other adjustments, including income-based related adjustments", P1(24)),
  comp("line4", "4", "Alternative minimum taxable income (AMTI)", P1(25), "1 + 2a through 2t + 3", { alwaysShow: true }),
  comp("line5", "5", "Exemption (reduced by 25% of AMTI over the phaseout threshold)", P1(26), "by filing status and year"),
  comp("line6", "6", "Subtract line 5 from line 4; if zero or less, no AMT", P1(27), "4 - 5"),
  comp("line7", "7", "26% of line 6 up to the breakpoint, 28% above (or Part III when you have capital gains)", P1(28), "26%/28% or Part III line 40"),
  money("line8", "8", "Alternative minimum tax foreign tax credit", P1(29)),
  comp("line9", "9", "Tentative minimum tax (line 7 minus line 8)", P1(30), "7 - 8"),
  money("line10", "10", "Regular tax: Form 1040 line 16 (minus Form 4972) plus Schedule 2 line 1z", P1(31)),
  comp("line11", "11", "Alternative minimum tax; carried to Schedule 2 line 2", P1(32), "max(0, 9 - 10)", { alwaysShow: true }),
  comp("line12", "12", "Amount from line 6", { name: P2(1) }, "line 6"),
  money("line13", "13", "Qualified dividends plus net capital gain (QDCG worksheet line 4 or Schedule D worksheet line 13), refigured for AMT", { name: P2(2) }),
  money("line14", "14", "Unrecaptured section 1250 gain (Schedule D line 19), refigured for AMT", { name: P2(3) }),
  comp("line15", "15", "Add lines 13 and 14 (or Schedule D worksheet line 10)", { name: P2(4) }, "13 + 14"),
  comp("line16", "16", "Smaller of line 12 or line 15", { name: P2(5) }, "min(12, 15)"),
  comp("line17", "17", "Subtract line 16 from line 12", { name: P2(6) }, "12 - 16"),
  comp("line18", "18", "26%/28% of line 17", { name: P2(7) }, "rate(17)"),
  comp("line19", "19", "Top of the 0% capital gain bracket for your filing status", { name: P2(8) }, "by filing status"),
  money("line20", "20", "QDCG worksheet line 5 (taxable income minus qualified dividends and net capital gain), refigured for AMT", { name: P2(9) }),
  comp("line21", "21", "Subtract line 20 from line 19; if zero or less, enter 0", { name: P2(10) }, "19 - 20"),
  comp("line22", "22", "Smaller of line 12 or line 13", { name: P2(11) }, "min(12, 13)"),
  comp("line23", "23", "Smaller of line 21 or line 22 (taxed at 0%)", { name: P2(12) }, "min(21, 22)"),
  comp("line24", "24", "Subtract line 23 from line 22", { name: P2(13) }, "22 - 23"),
  comp("line25", "25", "Top of the 15% capital gain bracket for your filing status", { name: P2(14) }, "by filing status"),
  comp("line26", "26", "Amount from line 21", { name: P2(15) }, "line 21"),
  comp("line27", "27", "Amount from line 20 (QDCG worksheet line 5)", { name: P2(16) }, "line 20"),
  comp("line28", "28", "Add lines 26 and 27", { name: P2(17) }, "26 + 27"),
  comp("line29", "29", "Subtract line 28 from line 25; if zero or less, enter 0", { name: P2(18) }, "25 - 28"),
  comp("line30", "30", "Smaller of line 24 or line 29 (taxed at 15%)", { name: P2(19) }, "min(24, 29)"),
  comp("line31", "31", "Multiply line 30 by 15%", { name: P2(20) }, "30 x 0.15"),
  comp("line32", "32", "Add lines 23 and 30", { name: P2(21) }, "23 + 30"),
  comp("line33", "33", "Subtract line 32 from line 22 (taxed at 20%)", { name: P2(22) }, "22 - 32"),
  comp("line34", "34", "Multiply line 33 by 20%", { name: P2(23) }, "33 x 0.20"),
  comp("line35", "35", "Add lines 17, 32, and 33", { name: P2(24) }, "17 + 32 + 33"),
  comp("line36", "36", "Subtract line 35 from line 12 (unrecaptured section 1250 gain at 25%)", { name: P2(25) }, "12 - 35"),
  comp("line37", "37", "Multiply line 36 by 25%", { name: P2(26) }, "36 x 0.25"),
  comp("line38", "38", "Add lines 18, 31, 34, and 37", { name: P2(27) }, "18 + 31 + 34 + 37"),
  comp("line39", "39", "26%/28% of line 12", { name: P2(28) }, "rate(12)"),
  comp("line40", "40", "Smaller of line 38 or line 39; carried to line 7", { name: P2(29) }, "min(38, 39)"),
];

export const form6251: FormDef = {
  id: "f6251",
  title: "Form 6251, Alternative Minimum Tax, Individuals",
  shortTitle: "Form 6251",
  description: "Recomputes taxable income without the deductions the AMT disallows (state and local taxes, the standard deduction, private activity bond interest, incentive stock option spreads...), applies the exemption and the 26%/28% rates (with Part III for capital gains), and charges any excess over the regular tax. Line 11 goes to Schedule 2 line 2.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i6251.pdf",
  notes: `**Who is affected.** After the 2017 law raised the exemption and phaseout, the AMT mostly reaches filers with large incentive stock option exercises, private activity bond interest, or very large state tax deductions with high income. Tax software computes it for everyone; the form is attached when line 7 exceeds line 10 or certain items appear.

**What the engine computes.** Lines 1b (2025), 4 through 7, 9, 11, and all of Part III when line 13 (qualified dividends plus net capital gain) is supplied, using the year's exemption ($85,700 / $133,300 / $66,650 for 2024; $88,100 / $137,000 / $68,500 for 2025), phaseout ($609,350 / $1,218,700; $626,350 / $1,252,700), and 28% breakpoint ($232,600 / $116,300 MFS; $239,100 / $119,550). In a full return it is prepared automatically: line 2a is the standard deduction or Schedule A line 7, line 2b the taxable state refund, line 10 the regular tax, and lines 13, 14, and 20 come from the capital gain worksheet figures.

**What it does not do.** The AMT foreign tax credit (line 8) is taken as supplied, AMT depreciation and passive-loss recomputations (lines 2l, 2m) are inputs, Form 2555 filers need the instructions' worksheet, and the married-filing-separately add-back above $900,350 of AMTI is not applied.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const p = params(ctx.year);
    const status = (c.str("filing_status") || "single") as FilingStatus;
    const mfs = status === "mfs";
    const rate = (x: number) => { const bp = mfs ? p.amt.breakpointMfs : p.amt.breakpoint; return x <= bp ? Math.round(x * 0.26) : Math.round(x * 0.28 - bp * 0.02); };
    let base: number;
    if (ctx.year === 2025) {
      base = c.set("line1b", c.n("agi") - c.n("line1a"), "AGI minus deductions other than the senior deduction", `${f(c.n("agi"))} - ${f(c.n("line1a"))}`, "1b");
      if (!c.has("agi") && !c.has("line1a")) c.warn("Supply agi and line1a (Form 1040 line 14 minus Schedule 1-A line 37) for the 2025 form.");
    } else base = c.n("line1");
    const adj = ["line2a", "line2b", ...ADJ.map(([l]) => `line${l}`), "line3"].reduce((a, k) => a + c.n(k), 0);
    const l4 = c.set("line4", base + adj, "Alternative minimum taxable income", `${f(base)} + adjustments ${f(adj)}`, "4");
    const exemption = Math.max(0, p.amt.exemption[status] - Math.round(Math.max(0, l4 - p.amt.phaseoutStart[status]) * 0.25));
    const l5 = c.set("line5", exemption, "Exemption", `${f(p.amt.exemption[status])} less 25% of AMTI over ${f(p.amt.phaseoutStart[status])}`, "5");
    const l6 = c.set("line6", Math.max(0, l4 - l5), "AMTI after exemption", `max(0, ${f(l4)} - ${f(l5)})`, "6");
    let l7: number;
    if (c.has("line13") && l6 > 0) {
      const l12 = c.set("line12", l6, "From line 6", "line 6", "12");
      const l13 = c.n("line13"), l14 = c.n("line14");
      const l15 = c.set("line15", l13 + l14, "Gain eligible for lower rates", `${f(l13)} + ${f(l14)}`, "15");
      const l16 = c.set("line16", Math.min(l12, l15), "Smaller of 12 or 15", `min(${f(l12)}, ${f(l15)})`, "16");
      const l17 = c.set("line17", l12 - l16, "Ordinary AMTI", `${f(l12)} - ${f(l16)}`, "17");
      const l18 = c.set("line18", rate(l17), "AMT on ordinary portion", `26%/28% of ${f(l17)}`, "18");
      const l19 = c.set("line19", p.capitalGains.zeroRateMax[status], "0% bracket top", status, "19");
      const l20 = c.n("line20");
      const l21 = c.set("line21", Math.max(0, l19 - l20), "Room in the 0% bracket", `max(0, ${f(l19)} - ${f(l20)})`, "21");
      const l22 = c.set("line22", Math.min(l12, l13), "Gain within AMTI", `min(${f(l12)}, ${f(l13)})`, "22");
      const l23 = c.set("line23", Math.min(l21, l22), "Taxed at 0%", `min(${f(l21)}, ${f(l22)})`, "23");
      const l24 = c.set("line24", l22 - l23, "Remaining gain", `${f(l22)} - ${f(l23)}`, "24");
      const l25 = c.set("line25", p.capitalGains.fifteenRateMax[status], "15% bracket top", status, "25");
      const l26 = c.set("line26", l21, "From line 21", "line 21", "26");
      const l27 = c.set("line27", l20, "From line 20", "line 20", "27");
      const l28 = c.set("line28", l26 + l27, "Add 26 and 27", `${f(l26)} + ${f(l27)}`, "28");
      const l29 = c.set("line29", Math.max(0, l25 - l28), "Room in the 15% bracket", `max(0, ${f(l25)} - ${f(l28)})`, "29");
      const l30 = c.set("line30", Math.min(l24, l29), "Taxed at 15%", `min(${f(l24)}, ${f(l29)})`, "30");
      const l31 = c.set("line31", Math.round(l30 * 0.15), "15% tax", `${f(l30)} x 0.15`, "31");
      const l32 = c.set("line32", l23 + l30, "Add 23 and 30", `${f(l23)} + ${f(l30)}`, "32");
      const l33 = c.set("line33", l22 - l32, "Taxed at 20%", `${f(l22)} - ${f(l32)}`, "33");
      const l34 = c.set("line34", Math.round(l33 * 0.2), "20% tax", `${f(l33)} x 0.20`, "34");
      const l35 = c.set("line35", l17 + l32 + l33, "Add 17, 32, 33", `${f(l17)} + ${f(l32)} + ${f(l33)}`, "35");
      const l36 = c.set("line36", Math.max(0, l12 - l35), "Unrecaptured 1250 gain portion", `${f(l12)} - ${f(l35)}`, "36");
      const l37 = c.set("line37", Math.round(l36 * 0.25), "25% tax", `${f(l36)} x 0.25`, "37");
      const l38 = c.set("line38", l18 + l31 + l34 + l37, "Add 18, 31, 34, 37", `${f(l18)} + ${f(l31)} + ${f(l34)} + ${f(l37)}`, "38");
      const l39 = c.set("line39", rate(l12), "26%/28% of line 12", `rate(${f(l12)})`, "39");
      l7 = c.set("line40", Math.min(l38, l39), "Part III result", `min(${f(l38)}, ${f(l39)})`, "40");
      c.set("line7", l7, "Tentative minimum tax before the foreign tax credit", "Part III line 40", "7");
    } else l7 = c.set("line7", rate(l6), "Tentative minimum tax before the foreign tax credit", `26% up to ${f(mfs ? p.amt.breakpointMfs : p.amt.breakpoint)}, 28% above, of ${f(l6)}`, "7");
    const l9 = c.set("line9", Math.max(0, l7 - c.n("line8")), "Tentative minimum tax", `${f(l7)} - ${f(c.n("line8"))}`, "9");
    const l10 = c.n("line10");
    if (!c.has("line10") && l9 > 0) c.warn("line10 (regular tax: Form 1040 line 16 plus Schedule 2 line 1z) was not supplied; the AMT is shown against zero regular tax.");
    c.set("line11", Math.max(0, l9 - l10), "Alternative minimum tax", `max(0, ${f(l9)} - ${f(l10)})`, "11");
    if (mfs && l4 > 900350) c.warn("Married filing separately with AMTI over $900,350: the instructions add back part of the exemption; not applied here.");
    return c.result();
  },
};
