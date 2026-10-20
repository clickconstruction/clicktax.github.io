import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

const P = (page: 1 | 2 | 3 | 4, n: number) => `Page${page}[0].f${page}_${n}[0]`;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });

type Status = "single" | "mfj" | "mfs" | "hoh" | "qss";
/** The prior year's AMT figures (the form for tax year Y refigures the AMT of year Y-1). */
const PRIOR: Record<TaxYear, { exemption: Record<Status, number>; phaseout: Record<Status, number>; breakpoint: Record<Status, number>; zeroTop: Record<Status, number>; fifteenTop: Record<Status, number> }> = {
  2025: {
    exemption: { single: 85700, hoh: 85700, mfj: 133300, qss: 133300, mfs: 66650 },
    phaseout: { single: 609350, hoh: 609350, mfs: 609350, mfj: 1218700, qss: 1218700 },
    breakpoint: { single: 232600, hoh: 232600, mfj: 232600, qss: 232600, mfs: 116300 },
    zeroTop: { single: 47025, mfs: 47025, mfj: 94050, qss: 94050, hoh: 63000 },
    fifteenTop: { single: 518900, mfs: 291850, mfj: 583750, qss: 583750, hoh: 551350 },
  },
  2024: {
    exemption: { single: 81300, hoh: 81300, mfj: 126500, qss: 126500, mfs: 63250 },
    phaseout: { single: 578150, hoh: 578150, mfs: 578150, mfj: 1156300, qss: 1156300 },
    breakpoint: { single: 220700, hoh: 220700, mfj: 220700, qss: 220700, mfs: 110350 },
    zeroTop: { single: 44625, mfs: 44625, mfj: 89250, qss: 89250, hoh: 59750 },
    fifteenTop: { single: 492300, mfs: 276900, mfj: 553850, qss: 553850, hoh: 523050 },
  },
};

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1, 1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: P(1, 2) } },
  { id: "prior_filing_status", label: "Filing status for the prior year (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"], notes: "Defaults to the current filing status." },
  { id: "filing_status", label: "Filing status for this year", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  money("line1", "1", "Prior-year Form 6251 lines 1 and 2e combined (alternative minimum taxable income before adjustments, plus the AMT NOL deduction added back)", P(1, 3)),
  money("line2", "2", "Adjustments and preferences treated as exclusion items (standard deduction, taxes, depletion, tax-exempt interest, small business stock, and so on; see the instructions)", P(1, 4)),
  money("line3", "3", "Minimum tax credit net operating loss deduction (enter as a positive amount; it is subtracted)", P(1, 5)),
  comp("line4", "4", "Combine lines 1, 2, and 3; if zero or less, enter zero on line 15", P(1, 6), "1 + 2 - 3"),
  comp("line5", "5", "Prior-year AMT exemption amount for the prior-year filing status", P(1, 7), "exemption for the prior year"),
  comp("line6", "6", "Prior-year exemption phaseout threshold", P(1, 8), "phaseout threshold"),
  comp("line7", "7", "Subtract line 6 from line 4; not less than zero", P(1, 9), "max(0, 4 - 6)"),
  comp("line8", "8", "Multiply line 7 by 25%", P(1, 10), "7 x 25%"),
  comp("line9", "9", "Subtract line 8 from line 5; not less than zero", P(1, 11), "max(0, 5 - 8)"),
  comp("line10", "10", "Subtract line 9 from line 4; not less than zero", P(1, 12), "max(0, 4 - 9)"),
  comp("line11", "11", "Tentative tax on exclusion items: 26% of line 10, or 28% less the breakpoint adjustment; from Part III when capital gains apply", P(1, 13), "26%/28% of line 10, or line 55"),
  money("line12", "12", "Minimum tax foreign tax credit on exclusion items", P(1, 14)),
  comp("line13", "13", "Tentative minimum tax on exclusion items. Subtract line 12 from line 11", P(1, 15), "11 - 12"),
  money("line14", "14", "Prior-year Form 6251 line 10 (regular tax before credits, adjusted)", P(1, 16)),
  comp("line15", "15", "Net minimum tax on exclusion items. Subtract line 14 from line 13; not less than zero", P(1, 17), "max(0, 13 - 14)", { alwaysShow: true }),
  money("line16", "16", "Prior-year Form 6251 line 11 (the AMT paid)", P(2, 1)),
  comp("line17", "17", "The amount from line 15", P(2, 2), "= line 15"),
  comp("line18", "18", "Subtract line 17 from line 16 (may be negative)", P(2, 3), "16 - 17"),
  money("line19", "19", "Prior-year credit carryforward (prior-year Form 8801 line 26)", P(2, 4)),
  money("line20", "20", "Prior-year unallowed qualified electric vehicle credit", P(2, 5)),
  comp("line21", "21", "Combine lines 18 through 20; if zero or less, stop", P(2, 6), "18 + 19 + 20", { alwaysShow: true }),
  money("line22", "22", "Current-year regular income tax liability minus allowable credits", P(2, 7), { notes: "In a full return: Form 1040 line 16 plus Schedule 2 line 1z, less the Schedule 3 credits other than this one." }),
  money("line23", "23", "Current-year Form 6251 line 9 (tentative minimum tax)", P(2, 8), { notes: "Filled from the AMT computation when preparing a full return." }),
  comp("line24", "24", "Subtract line 23 from line 22; not less than zero", P(2, 9), "max(0, 22 - 23)"),
  comp("line25", "25", "Minimum tax credit: the smaller of line 21 or line 24; to Schedule 3 line 6b", P(2, 10), "min(21, 24)", { alwaysShow: true }),
  comp("line26", "26", "Credit carryforward to next year. Subtract line 25 from line 21", P(2, 11), "21 - 25", { alwaysShow: true }),
  { id: "use_part3", label: "Complete Part III (the prior-year return used the Qualified Dividends and Capital Gain Tax Worksheet or the Schedule D Tax Worksheet)", type: "checkbox", noPdf: true, notes: "Set automatically when line 28 is supplied." },
  money("line27", "27", "Part III: the amount from line 10 (or line 3 of the Foreign Earned Income Tax Worksheet)", P(3, 1), { notes: "Defaults to line 10." }),
  money("line28", "28", "Prior-year Qualified Dividends and Capital Gain Tax Worksheet line 4 (or Schedule D Tax Worksheet line 13)", P(3, 2)),
  money("line29", "29", "Prior-year Schedule D line 19 (unrecaptured section 1250 gain), when the Schedule D Tax Worksheet was used", P(3, 3)),
  money("line30", "30", "Add lines 28 and 29, limited to the prior-year Schedule D Tax Worksheet line 10", P(3, 4), { notes: "Computed as 28 + 29 when not supplied." }),
  comp("line31", "31", "The smaller of line 27 or line 30", P(3, 5), "min(27, 30)"),
  comp("line32", "32", "Subtract line 31 from line 27", P(3, 6), "27 - 31"),
  comp("line33", "33", "26% of line 32, or 28% less the breakpoint adjustment", P(3, 7), "26%/28% of line 32"),
  comp("line34", "34", "Top of the prior-year 0% capital gain bracket for the prior-year filing status", P(3, 8), "0% bracket top"),
  money("line35", "35", "Prior-year Qualified Dividends and Capital Gain Tax Worksheet line 5 (or Schedule D Tax Worksheet line 14)", P(3, 9)),
  comp("line36", "36", "Subtract line 35 from line 34; not less than zero", P(3, 10), "max(0, 34 - 35)"),
  comp("line37", "37", "The smaller of line 27 or line 28", P(3, 11), "min(27, 28)"),
  comp("line38", "38", "The smaller of line 36 or line 37", P(3, 12), "min(36, 37)"),
  comp("line39", "39", "Subtract line 38 from line 37", P(3, 13), "37 - 38"),
  comp("line40", "40", "Top of the prior-year 15% capital gain bracket for the prior-year filing status", P(3, 14), "15% bracket top"),
  comp("line41", "41", "The amount from line 36", P(3, 15), "= line 36"),
  money("line42", "42", "Prior-year Qualified Dividends and Capital Gain Tax Worksheet line 5 (or Schedule D Tax Worksheet line 21)", P(3, 16), { notes: "Defaults to line 35." }),
  comp("line43", "43", "Add lines 41 and 42", P(4, 1), "41 + 42"),
  comp("line44", "44", "Subtract line 43 from line 40; not less than zero", P(4, 2), "max(0, 40 - 43)"),
  comp("line45", "45", "The smaller of line 39 or line 44", P(4, 3), "min(39, 44)"),
  comp("line46", "46", "Multiply line 45 by 15%", P(4, 4), "45 x 15%"),
  comp("line47", "47", "Add lines 38 and 45", P(4, 5), "38 + 45"),
  comp("line48", "48", "Subtract line 47 from line 37", P(4, 6), "37 - 47"),
  comp("line49", "49", "Multiply line 48 by 20%", P(4, 7), "48 x 20%"),
  comp("line50", "50", "Add lines 32, 47, and 48", P(4, 8), "32 + 47 + 48"),
  comp("line51", "51", "Subtract line 50 from line 27", P(4, 9), "27 - 50"),
  comp("line52", "52", "Multiply line 51 by 25%", P(4, 10), "51 x 25%"),
  comp("line53", "53", "Add lines 33, 46, 49, and 52", P(4, 11), "33 + 46 + 49 + 52"),
  comp("line54", "54", "26% of line 27, or 28% less the breakpoint adjustment", P(4, 12), "26%/28% of line 27"),
  comp("line55", "55", "The smaller of line 53 or line 54; to line 11", P(4, 13), "min(53, 54)"),
];

export const form8801: FormDef = {
  id: "f8801",
  title: "Form 8801, Credit for Prior Year Minimum Tax—Individuals, Estates, and Trusts",
  shortTitle: "Form 8801",
  description: "Refigures last year's alternative minimum tax on exclusion items (the permanent adjustments) to find the part of the AMT that was due to timing items, then allows that amount as a credit against this year's regular tax (Schedule 3 line 6b) and carries the rest forward.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8801.pdf",
  notes: `**Who files.** Anyone who paid the AMT last year because of deferral items (incentive stock options, depreciation, passive losses), has a minimum tax credit carryforward from an earlier Form 8801, or had an unallowed qualified electric vehicle credit.

**What the engine computes.** Part I (lines 4 through 11, 13, and 15, with last year's exemption, phaseout, and 26%/28% breakpoint), Part II (lines 17, 18, 21, 24, 25, and the line 26 carryforward), and Part III (lines 31 through 55) when line 28 is supplied, using last year's 0% and 15% capital gain brackets. In a full return line 22 comes from the Form 1040 tax less the other credits, line 23 from the current-year tentative minimum tax, and line 25 goes to Schedule 3 line 6b.

**What to verify.** Lines 1, 2, 14, 16, 19, and 20 come from last year's Form 6251 and Form 8801. Exclusion items (line 2) are the adjustments that never reverse: the standard deduction, state and local taxes, tax-exempt private activity bond interest, depletion, and the section 1202 exclusion; timing items such as ISO spreads and depreciation differences are not entered here. Keep line 26 for next year's form.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const P5 = PRIOR[ctx.year];
    const status = ((c.str("prior_filing_status") || c.str("filing_status") || "single") as Status);
    const key: Status = (["single", "mfj", "mfs", "hoh", "qss"] as Status[]).includes(status) ? status : "single";
    const rate = (amount: number) => (amount <= P5.breakpoint[key] ? amount * 0.26 : amount * 0.28 - 0.02 * P5.breakpoint[key]);
    const l4 = c.set("line4", Math.max(0, c.n("line1") + c.n("line2") - Math.abs(c.n("line3"))), "Alternative minimum taxable income on exclusion items", `${f(c.n("line1"))} + ${f(c.n("line2"))} - ${f(Math.abs(c.n("line3")))}`, "4");
    const l5 = c.set("line5", P5.exemption[key], "Prior-year exemption", `${ctx.year - 1} exemption for ${key}`, "5");
    const l6 = c.set("line6", P5.phaseout[key], "Phaseout threshold", `${ctx.year - 1} threshold for ${key}`, "6");
    const l7 = c.set("line7", Math.max(0, l4 - l6), "Excess over the threshold", `max(0, ${f(l4)} - ${f(l6)})`, "7");
    const l8 = c.set("line8", l7 * 0.25, "Exemption reduction", `${f(l7)} x 25%`, "8");
    const l9 = c.set("line9", Math.max(0, l5 - l8), "Exemption after phaseout", `max(0, ${f(l5)} - ${f(l8)})`, "9");
    const l10 = c.set("line10", Math.max(0, l4 - l9), "Taxable excess on exclusion items", `max(0, ${f(l4)} - ${f(l9)})`, "10");
    const part3 = c.bool("use_part3") || c.has("line28");
    if (!c.has("use_part3")) c.out["use_part3"] = part3;
    let l11: number;
    if (part3) {
      const l27 = c.has("line27") ? c.n("line27") : l10;
      if (!c.has("line27")) c.out["line27"] = l27;
      const l30 = c.has("line30") ? c.n("line30") : c.set("line30", c.n("line28") + c.n("line29"), "Capital gain and 1250 gain", `${f(c.n("line28"))} + ${f(c.n("line29"))}`, "30");
      const l31 = c.set("line31", Math.min(l27, l30), "Gain taxed at capital rates", `min(${f(l27)}, ${f(l30)})`, "31");
      const l32 = c.set("line32", l27 - l31, "Ordinary portion", `${f(l27)} - ${f(l31)}`, "32");
      const l33 = c.set("line33", rate(l32), "Tax on the ordinary portion", `26%/28% of ${f(l32)}`, "33");
      const l34 = c.set("line34", P5.zeroTop[key], "0% bracket top", `${ctx.year - 1} for ${key}`, "34");
      const l36 = c.set("line36", Math.max(0, l34 - c.n("line35")), "Room in the 0% bracket", `max(0, ${f(l34)} - ${f(c.n("line35"))})`, "36");
      const l37 = c.set("line37", Math.min(l27, c.n("line28")), "Gain other than 1250 gain", `min(${f(l27)}, ${f(c.n("line28"))})`, "37");
      const l38 = c.set("line38", Math.min(l36, l37), "Gain taxed at 0%", `min(${f(l36)}, ${f(l37)})`, "38");
      const l39 = c.set("line39", l37 - l38, "Gain above the 0% bracket", `${f(l37)} - ${f(l38)}`, "39");
      const l40 = c.set("line40", P5.fifteenTop[key], "15% bracket top", `${ctx.year - 1} for ${key}`, "40");
      const l41 = c.set("line41", l36, "Line 36", "= line 36", "41");
      const l42 = c.has("line42") ? c.n("line42") : c.n("line35");
      if (!c.has("line42")) c.out["line42"] = l42;
      const l43 = c.set("line43", l41 + l42, "Lines 41 and 42", `${f(l41)} + ${f(l42)}`, "43");
      const l44 = c.set("line44", Math.max(0, l40 - l43), "Room in the 15% bracket", `max(0, ${f(l40)} - ${f(l43)})`, "44");
      const l45 = c.set("line45", Math.min(l39, l44), "Gain taxed at 15%", `min(${f(l39)}, ${f(l44)})`, "45");
      const l46 = c.set("line46", l45 * 0.15, "15% tax", `${f(l45)} x 15%`, "46");
      const l47 = c.set("line47", l38 + l45, "Gain taxed at 0% and 15%", `${f(l38)} + ${f(l45)}`, "47");
      const l48 = c.set("line48", Math.max(0, l37 - l47), "Gain taxed at 20%", `${f(l37)} - ${f(l47)}`, "48");
      const l49 = c.set("line49", l48 * 0.2, "20% tax", `${f(l48)} x 20%`, "49");
      const l50 = c.set("line50", l32 + l47 + l48, "Income accounted for", `${f(l32)} + ${f(l47)} + ${f(l48)}`, "50");
      const l51 = c.set("line51", Math.max(0, l27 - l50), "Unrecaptured section 1250 gain taxed at 25%", `${f(l27)} - ${f(l50)}`, "51");
      const l52 = c.set("line52", l51 * 0.25, "25% tax", `${f(l51)} x 25%`, "52");
      const l53 = c.set("line53", l33 + l46 + l49 + l52, "Tax using capital gain rates", `${f(l33)} + ${f(l46)} + ${f(l49)} + ${f(l52)}`, "53");
      const l54 = c.set("line54", rate(l27), "Tax at the AMT rates only", `26%/28% of ${f(l27)}`, "54");
      l11 = c.set("line55", Math.min(l53, l54), "Part III result", `min(${f(l53)}, ${f(l54)})`, "55");
      c.set("line11", l11, "Tentative tax on exclusion items", "Part III line 55", "11");
    } else {
      l11 = c.set("line11", rate(l10), "Tentative tax on exclusion items", l10 <= P5.breakpoint[key] ? `${f(l10)} x 26%` : `${f(l10)} x 28% - ${f(0.02 * P5.breakpoint[key])}`, "11");
    }
    const l13 = c.set("line13", Math.max(0, l11 - c.n("line12")), "Tentative minimum tax on exclusion items", `${f(l11)} - ${f(c.n("line12"))}`, "13");
    const l15 = c.set("line15", Math.max(0, l13 - c.n("line14")), "Net minimum tax on exclusion items", `max(0, ${f(l13)} - ${f(c.n("line14"))})`, "15");
    const l17 = c.set("line17", l15, "Line 15", "= line 15", "17");
    const l18 = c.set("line18", c.n("line16") - l17, "Prior-year AMT from deferral items", `${f(c.n("line16"))} - ${f(l17)}`, "18");
    const l21 = c.set("line21", l18 + c.n("line19") + c.n("line20"), "Minimum tax credit available", `${f(l18)} + ${f(c.n("line19"))} + ${f(c.n("line20"))}`, "21");
    if (l21 <= 0) c.warn("Line 21 is zero or less: no minimum tax credit is available this year.");
    const l24 = c.set("line24", Math.max(0, c.n("line22") - c.n("line23")), "Regular tax over tentative minimum tax", `max(0, ${f(c.n("line22"))} - ${f(c.n("line23"))})`, "24");
    if (l21 > 0 && !c.has("line22")) c.warn("Line 22 (this year's regular tax minus credits) was not supplied; the credit is shown as zero.");
    const l25 = c.set("line25", Math.max(0, Math.min(l21, l24)), "Minimum tax credit (Schedule 3 line 6b)", `min(${f(l21)}, ${f(l24)})`, "25");
    c.set("line26", Math.max(0, l21 - l25), "Carryforward to next year", `${f(l21)} - ${f(l25)}`, "26");
    if (!c.has("prior_filing_status") && !c.has("filing_status")) c.warn("No filing status supplied; the prior-year exemption and brackets use single.");
    return c.result();
  },
};
