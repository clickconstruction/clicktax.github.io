import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

/** 2024 keeps lines 15a-15c on page 1 (f1_24-26) and numbers page 2 from line 16; 2025 zero-pads and moves 15a-c to page 2. */
const N = (y24: string, y25: string): { names: Partial<Record<TaxYear, string>> } => ({ names: { 2024: `Page${y24.startsWith("f2") ? 2 : 1}[0].${y24}[0]`, 2025: `Page${y25.startsWith("f2") ? 2 : 1}[0].${y25}[0]` } });
const money = (id: string, line: string, label: string, y24: string, y25: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: N(y24, y25), ...extra });
const comp = (id: string, line: string, label: string, y24: string, y25: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, y24, y25, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name (if married, file a separate form for each spouse)", type: "text", locate: N("f1_1", "f1_01") },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: N("f1_2", "f1_02") },
  { id: "address", label: "Home address (only if filing this form by itself)", type: "text", locate: N("f1_3", "f1_03") },
  { id: "apt", label: "Apt. no.", type: "text", locate: N("f1_4", "f1_04") },
  { id: "city_state_zip", label: "City, town or post office, state, and ZIP code", type: "text", locate: N("f1_5", "f1_05") },
  { id: "foreign_country", label: "Foreign country name", type: "text", locate: N("f1_6", "f1_06") },
  { id: "foreign_province", label: "Foreign province/state/county", type: "text", locate: N("f1_7", "f1_07") },
  { id: "foreign_postal_code", label: "Foreign postal code", type: "text", locate: N("f1_8", "f1_08") },
  money("line1", "1", "Nondeductible contributions to traditional IRAs for the year, including those made from January 1 through the due date", "f1_9", "f1_09"),
  money("line2", "2", "Total basis in traditional IRAs from prior years (last year's line 14)", "f1_10", "f1_10"),
  comp("line3", "3", "Add lines 1 and 2", "f1_11", "f1_11", "1 + 2"),
  money("line4", "4", "Contributions on line 1 made from January 1 through the due date of next year", "f1_12", "f1_12"),
  comp("line5", "5", "Subtract line 4 from line 3", "f1_13", "f1_13", "3 - 4"),
  money("line6", "6", "Value of all traditional, SEP, and SIMPLE IRAs on December 31 plus outstanding rollovers", "f1_14", "f1_14"),
  money("line7", "7", "Distributions from traditional, SEP, and SIMPLE IRAs during the year (not rollovers, conversions, recharacterizations, or returned contributions)", "f1_15", "f1_15"),
  money("line8", "8", "Net amount converted from traditional, SEP, and SIMPLE IRAs to Roth IRAs during the year", "f1_16", "f1_16"),
  comp("line9", "9", "Add lines 6, 7, and 8", "f1_17", "f1_17", "6 + 7 + 8"),
  { id: "line10_whole", line: "10", label: "Line 10 ratio, whole number (1 or 0)", type: "text", computed: true, maxLen: 1, locate: N("f1_18", "f1_18") },
  { id: "line10_decimals", line: "10", label: "Line 10 ratio, three decimals (line 5 / line 9)", type: "text", computed: true, maxLen: 3, locate: N("f1_19", "f1_19") },
  comp("line11", "11", "Nontaxable portion of conversions (line 8 x line 10)", "f1_20", "f1_20", "8 x 10"),
  comp("line12", "12", "Nontaxable portion of distributions (line 7 x line 10)", "f1_21", "f1_21", "7 x 10"),
  comp("line13", "13", "Nontaxable portion of all distributions (11 + 12)", "f1_22", "f1_22", "11 + 12"),
  comp("line14", "14", "Total basis in traditional IRAs for this year and earlier (line 3 - line 13); carried to next year's line 2", "f1_23", "f1_23", "3 - 13", { alwaysShow: true }),
  comp("line15a", "15a", "Subtract line 12 from line 7", "f1_24", "f2_01", "7 - 12"),
  money("line15b", "15b", "Amount on line 15a attributable to qualified disaster distributions (Form 8915-F)", "f1_25", "f2_02"),
  comp("line15c", "15c", "Taxable amount of traditional IRA distributions; included on Form 1040 line 4b", "f1_26", "f2_03", "15a - 15b", { alwaysShow: true }),
  comp("line16", "16", "Amount converted to Roth IRAs (line 8, or the conversion when Part I is not completed)", "f2_1", "f2_04", "line 8"),
  comp("line17", "17", "Basis in the amount converted (line 11, or the basis when Part I is not completed)", "f2_2", "f2_05", "line 11"),
  comp("line18", "18", "Taxable amount of conversions; included on Form 1040 line 4b", "f2_3", "f2_06", "16 - 17", { alwaysShow: true }),
  money("line19", "19", "Nonqualified Roth IRA distributions during the year (not rollovers, recharacterizations, or returned contributions)", "f2_4", "f2_07"),
  money("line20", "20", "Qualified first-time homebuyer expenses (up to $10,000 lifetime)", "f2_5", "f2_08"),
  comp("line21", "21", "Subtract line 20 from line 19", "f2_6", "f2_09", "19 - 20"),
  money("line22", "22", "Basis in Roth IRA contributions (regular contributions, less prior nonqualified distributions)", "f2_7", "f2_10"),
  comp("line23", "23", "Subtract line 22 from line 21; may be subject to the 10% additional tax", "f2_8", "f2_11", "21 - 22"),
  money("line24", "24", "Basis in conversions to Roth IRAs and rollovers from qualified plans", "f2_9", "f2_12"),
  comp("line25a", "25a", "Subtract line 24 from line 23", "f2_10", "f2_13", "23 - 24"),
  money("line25b", "25b", "Amount on line 25a attributable to qualified disaster distributions", "f2_11", "f2_14"),
  comp("line25c", "25c", "Taxable amount of Roth IRA distributions; included on Form 1040 line 4b", "f2_12", "f2_15", "25a - 25b", { alwaysShow: true }),
];

export const form8606: FormDef = {
  id: "f8606",
  title: "Form 8606, Nondeductible IRAs",
  shortTitle: "Form 8606",
  description: "Tracks basis in traditional IRAs from nondeductible contributions, figures the taxable part of distributions and Roth conversions pro rata, and the taxable part of nonqualified Roth distributions. One form per spouse.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8606.pdf",
  notes: `**When it is required.** Any year you make a nondeductible traditional IRA contribution, take a distribution while you have basis, convert to a Roth IRA, or take a nonqualified Roth distribution (including backdoor Roth contributions).

**What the engine computes.** Lines 3, 5, 9, the line 10 ratio to three decimals, 11 through 14, 15a and 15c, 16 through 18 (from Part I when there were conversions), 21, 23, 25a, and 25c. In a full return, the taxable amounts (15c + 18 + 25c) go to Form 1040 line 4b and the gross amounts (7 + 8 + 19) to line 4a.

**What to verify.** Line 6 is the December 31 value of every traditional, SEP, and SIMPLE IRA you own (Form 5498 box 5) plus any outstanding rollover; the pro-rata rule applies across all of them. Lines 22 and 24 come from your own records of Roth contributions and conversions.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l3 = c.set("line3", c.n("line1") + c.n("line2"), "Basis before distributions", `${f(c.n("line1"))} + ${f(c.n("line2"))}`, "3");
    const l5 = c.set("line5", l3 - c.n("line4"), "Basis for the ratio", `${f(l3)} - ${f(c.n("line4"))}`, "5");
    const l7 = c.n("line7"), l8 = c.n("line8");
    const l9 = c.set("line9", c.n("line6") + l7 + l8, "Total value plus distributions", `${f(c.n("line6"))} + ${f(l7)} + ${f(l8)}`, "9");
    let ratio = 0;
    if (l7 > 0 || l8 > 0) {
      ratio = l9 > 0 ? Math.min(1, Math.round((l5 / l9) * 1000) / 1000) : 0;
      c.setScalar("line10_whole", ratio >= 1 ? "1" : "0", "Ratio whole", `${f(l5)} / ${f(l9)}`, "10");
      c.setScalar("line10_decimals", ratio >= 1 ? "000" : String(Math.round(ratio * 1000)).padStart(3, "0"), "Ratio decimals", `${f(l5)} / ${f(l9)} = ${ratio.toFixed(3)}`, "10");
      if (!c.has("line6") && l9 > 0) c.warn("line6 (year-end value of all your traditional IRAs) was not supplied; the pro-rata ratio treats the distributions as the only balance.");
    }
    const l11 = c.set("line11", Math.round(l8 * ratio), "Nontaxable conversion", `${f(l8)} x ${ratio.toFixed(3)}`, "11");
    const l12 = c.set("line12", Math.round(l7 * ratio), "Nontaxable distribution", `${f(l7)} x ${ratio.toFixed(3)}`, "12");
    const l13 = c.set("line13", l11 + l12, "Nontaxable total", `${f(l11)} + ${f(l12)}`, "13");
    c.set("line14", l3 - l13, "Basis carried forward", `${f(l3)} - ${f(l13)}`, "14");
    const l15a = c.set("line15a", l7 - l12, "Taxable before disaster amounts", `${f(l7)} - ${f(l12)}`, "15a");
    c.set("line15c", Math.max(0, l15a - c.n("line15b")), "Taxable traditional IRA distributions", `${f(l15a)} - ${f(c.n("line15b"))}`, "15c");
    const l16 = c.set("line16", l8 > 0 ? l8 : c.n("line16"), "Converted to Roth", l8 > 0 ? "line 8" : "supplied", "16");
    const l17 = c.set("line17", l8 > 0 ? l11 : c.n("line17"), "Basis in the conversion", l8 > 0 ? "line 11" : "supplied", "17");
    c.set("line18", Math.max(0, l16 - l17), "Taxable conversion", `${f(l16)} - ${f(l17)}`, "18");
    const l21 = c.set("line21", Math.max(0, c.n("line19") - c.n("line20")), "Nonqualified Roth distributions after homebuyer expenses", `${f(c.n("line19"))} - ${f(c.n("line20"))}`, "21");
    const l23 = c.set("line23", Math.max(0, l21 - c.n("line22")), "Roth distributions beyond contribution basis", `${f(l21)} - ${f(c.n("line22"))}`, "23");
    const l25a = c.set("line25a", Math.max(0, l23 - c.n("line24")), "Beyond conversion basis", `${f(l23)} - ${f(c.n("line24"))}`, "25a");
    c.set("line25c", Math.max(0, l25a - c.n("line25b")), "Taxable Roth distributions", `${f(l25a)} - ${f(c.n("line25b"))}`, "25c");
    if (l23 > 0) c.warn("Line 23 is positive: the earnings portion of a nonqualified Roth distribution may be subject to the 10% additional tax (Form 5329).");
    return c.result();
  },
};
