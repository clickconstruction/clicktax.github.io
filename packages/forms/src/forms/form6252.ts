import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });
const yn = (n: number) => ({ yes: { name: `Page1[0].c1_${n}[0]` }, no: { name: `Page1[0].c1_${n}[1]` } });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "line1", line: "1", label: "Description of property", type: "text", locate: { name: P(3) } },
  { id: "line2a", line: "2a", label: "Date acquired (mm/dd/yyyy)", type: "text", maxLen: 10, locate: { name: P(4) } },
  { id: "line2b", line: "2b", label: "Date sold (mm/dd/yyyy)", type: "text", maxLen: 10, locate: { name: P(5) } },
  { id: "line3", line: "3", label: "Was the property sold to a related party after May 14, 1980? (If no, skip line 4 and Part III)", type: "yesno", locate: yn(1) },
  { id: "line4", line: "4", label: "Was the property you sold to a related party a marketable security? (Yes: complete Part III every year; no: complete Part III for the year of sale and the 2 years after)", type: "yesno", locate: yn(2) },
  { id: "year_of_sale", label: "This is the year of sale (line 20 then starts with line 17)", type: "checkbox", noPdf: true },
  { id: "long_term", label: "Property held more than one year (the gain goes to Schedule D line 11; otherwise line 4)", type: "checkbox", noPdf: true, notes: "Defaults to true." },
  { id: "business_property", label: "Business or rental property (the gain is reported on Form 4797 rather than Schedule D)", type: "checkbox", noPdf: true },
  money("line5", "5", "Selling price including mortgages and other debts (not interest)", 6),
  money("line6", "6", "Mortgages, debts, and other liabilities the buyer assumed or took the property subject to", 7),
  comp("line7", "7", "Subtract line 6 from line 5", 8, "5 - 6"),
  money("line8", "8", "Cost or other basis of property sold", 9),
  money("line9", "9", "Depreciation allowed or allowable", 10),
  comp("line10", "10", "Adjusted basis. Subtract line 9 from line 8", 11, "8 - 9"),
  money("line11", "11", "Commissions and other expenses of sale", 12),
  money("line12", "12", "Income recapture from Form 4797 Part III", 13),
  comp("line13", "13", "Add lines 10, 11, and 12", 14, "10 + 11 + 12"),
  comp("line14", "14", "Subtract line 13 from line 5. If zero or less, do not complete the rest of the form", 15, "5 - 13"),
  money("line15", "15", "Excluded gain on the sale of your main home (section 121); otherwise zero", 16),
  comp("line16", "16", "Gross profit. Subtract line 15 from line 14", 17, "14 - 15"),
  comp("line17", "17", "Subtract line 13 from line 6; not less than zero", 18, "max(0, 6 - 13)"),
  comp("line18", "18", "Contract price. Add line 7 and line 17", 19, "7 + 17"),
  { id: "line19", line: "19", label: "Gross profit percentage: line 16 divided by line 18, as a decimal rounded to at least 4 places (for years after the year of sale, use the year-of-sale percentage)", type: "text", computed: true, locate: { name: P(20) }, notes: "Supply gross_profit_percentage to override (for example 0.4286 from the year of sale)." },
  { id: "gross_profit_percentage", label: "Gross profit percentage from the year of sale (decimal), for later years", type: "percent", noPdf: true },
  money("line20", "20", "If this is the year of sale, the amount from line 17; otherwise zero", 21, { notes: "Computed from year_of_sale when not supplied." }),
  money("line21", "21", "Payments received during the year (not interest)", 22),
  comp("line22", "22", "Add lines 20 and 21", 23, "20 + 21"),
  money("line23", "23", "Payments received in prior years (not interest)", 24),
  comp("line24", "24", "Installment sale income. Multiply line 22 by line 19", 25, "22 x 19", { alwaysShow: true }),
  money("line25", "25", "Part of line 24 that is ordinary income under the recapture rules", 26),
  comp("line26", "26", "Subtract line 25 from line 24; to Schedule D or Form 4797", 27, "24 - 25", { alwaysShow: true }),
  { id: "line27", line: "27", label: "Name, address, and taxpayer identifying number of the related party", type: "text", locate: { name: P(28) } },
  { id: "line27_more", line: "27", label: "Related party, continued", type: "text", locate: { name: P(29) } },
  { id: "line28", line: "28", label: "Did the related party resell or dispose of the property (second disposition) during this tax year?", type: "yesno", locate: yn(3) },
  { id: "line29", line: "29", label: "Exception to the second-disposition rule: \"a\" more than 2 years after the first sale (enter line29_date), \"b\" the first disposition was a sale or exchange of stock to the issuing corporation, \"c\" the second disposition was an involuntary conversion with the threat occurring after the first disposition, \"d\" the second disposition occurred after the death of the original seller or buyer, \"e\" it can be established that tax avoidance was not a principal purpose", type: "choice", choices: ["a", "b", "c", "d", "e"], locate: { a: { name: "Page1[0].c1_4[0]" }, b: { name: "Page1[0].c1_4[1]" }, c: { name: "Page1[0].c1_4[2]" }, d: { name: "Page1[0].c1_4[3]" }, e: { name: "Page1[0].c1_4[4]" } } },
  { id: "line29_date", line: "29a", label: "Date of the second disposition (mm/dd/yyyy), when exception a is checked", type: "text", maxLen: 10, locate: { name: P(30) } },
  money("line30", "30", "Selling price of property sold by related party", 31),
  money("line31", "31", "Contract price from line 18 for the year of first sale", 32),
  comp("line32", "32", "The smaller of line 30 or line 31", 33, "min(30, 31)"),
  money("line33", "33", "Total payments received by the end of this tax year", 34),
  comp("line34", "34", "Subtract line 33 from line 32; not less than zero", 35, "max(0, 32 - 33)"),
  comp("line35", "35", "Multiply line 34 by the gross profit percentage on line 19", 36, "34 x 19"),
  money("line36", "36", "Part of line 35 that is ordinary income under the recapture rules", 37),
  comp("line37", "37", "Subtract line 36 from line 35; to Schedule D or Form 4797", 38, "35 - 36"),
];

export const form6252: FormDef = {
  id: "f6252",
  title: "Form 6252, Installment Sale Income",
  shortTitle: "Form 6252",
  description: "Reports gain from a sale where at least one payment is received after the year of sale: gross profit, contract price, gross profit percentage, and the gain on this year's payments, plus the related-party resale rules.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i6252.pdf",
  notes: `**Who files.** Sellers using the installment method file every year they receive a payment (Part I only in the year of sale; Part II each year payments come in; Part III for related-party sales). Dealer sales, inventory, and sales at a loss cannot use the installment method.

**What the engine computes.** Lines 7, 10, 13, 14, 16, 17, 18, the gross profit percentage (line 19, or the supplied year-of-sale percentage in later years), lines 20 (from year_of_sale), 22, 24, 26, and Part III lines 32, 34, 35, 37. In a full return line 26 (and line 37) goes to Schedule D line 11 (long-term) or line 4 (short-term); set business_property to keep it for Form 4797 instead.

**What to verify.** Depreciation recapture (line 12, from Form 4797 Part III) is taxed in full in the year of sale regardless of payments. Interest on the installment note is ordinary income reported separately (Schedule B), not here. After the year of sale, keep using the original gross profit percentage.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.has("long_term")) c.out["long_term"] = true;
    const l7 = c.set("line7", c.n("line5") - c.n("line6"), "Selling price less debts assumed", `${f(c.n("line5"))} - ${f(c.n("line6"))}`, "7");
    const l10 = c.set("line10", c.n("line8") - c.n("line9"), "Adjusted basis", `${f(c.n("line8"))} - ${f(c.n("line9"))}`, "10");
    const l13 = c.set("line13", l10 + c.n("line11") + c.n("line12"), "Basis, expenses, and recapture", `${f(l10)} + ${f(c.n("line11"))} + ${f(c.n("line12"))}`, "13");
    const l14 = c.set("line14", c.n("line5") - l13, "Gain", `${f(c.n("line5"))} - ${f(l13)}`, "14");
    if (c.has("line5") && l14 <= 0) c.warn("Line 14 is zero or less: there is no gain to report on the installment method (losses are not deferred); do not complete the rest of the form.");
    const l16 = c.set("line16", Math.max(0, l14 - c.n("line15")), "Gross profit", `${f(l14)} - ${f(c.n("line15"))}`, "16");
    const l17 = c.set("line17", Math.max(0, c.n("line6") - l13), "Debts assumed in excess of basis", `max(0, ${f(c.n("line6"))} - ${f(l13)})`, "17");
    const l18 = c.set("line18", l7 + l17, "Contract price", `${f(l7)} + ${f(l17)}`, "18");
    // Read the supplied percentage raw: Calc.n would round a decimal like 0.45 to a whole dollar.
    let pct = c.has("gross_profit_percentage") ? Number(values["gross_profit_percentage"]) || 0 : l18 > 0 ? l16 / l18 : 0;
    if (pct > 1) pct = pct / 100;
    pct = Math.round(pct * 10000) / 10000;
    c.setScalar("line19", pct.toFixed(4), "Gross profit percentage", c.has("gross_profit_percentage") ? "supplied (year-of-sale percentage)" : `${f(l16)} / ${f(l18)}`, "19");
    let l20 = c.n("line20");
    if (!c.has("line20")) l20 = c.set("line20", c.bool("year_of_sale") ? l17 : 0, "Year-of-sale amount from line 17", c.bool("year_of_sale") ? "= line 17" : "not the year of sale", "20");
    const l22 = c.set("line22", l20 + c.n("line21"), "Payments treated as received", `${f(l20)} + ${f(c.n("line21"))}`, "22");
    const l24 = c.set("line24", l22 * pct, "Installment sale income", `${f(l22)} x ${pct.toFixed(4)}`, "24");
    if (c.n("line25") > l24) c.warn("Line 25 (ordinary recapture income) exceeds line 24.");
    c.set("line26", l24 - c.n("line25"), "Capital gain portion", `${f(l24)} - ${f(c.n("line25"))}`, "26");
    if (c.bool("line3") && !c.has("line4")) c.warn("Line 3 is yes: answer line 4 and complete Part III (related party).");
    if (c.has("line30") || c.has("line33")) {
      const l32 = c.set("line32", Math.min(c.n("line30"), c.n("line31")), "Smaller of lines 30 and 31", `min(${f(c.n("line30"))}, ${f(c.n("line31"))})`, "32");
      const l34 = c.set("line34", Math.max(0, l32 - c.n("line33")), "Deemed payment from the second disposition", `max(0, ${f(l32)} - ${f(c.n("line33"))})`, "34");
      const l35 = c.set("line35", l34 * pct, "Gain from the second disposition", `${f(l34)} x ${pct.toFixed(4)}`, "35");
      c.set("line37", l35 - c.n("line36"), "Capital gain portion (related party)", `${f(l35)} - ${f(c.n("line36"))}`, "37");
      if (!c.has("line31")) c.warn("Line 31 (contract price from the year of first sale) was not supplied; line 32 uses zero.");
    }
    if (c.bool("line28") && !c.str("line29") && !c.has("line30")) c.warn("Line 28 is yes (second disposition): complete lines 30 through 37 unless an exception on line 29 applies.");
    if (c.n("line12") > 0) c.warn("Line 12 recapture income is reported in full in the year of sale on Form 4797 Part III, not spread over the payments.");
    return c.result();
  },
};
