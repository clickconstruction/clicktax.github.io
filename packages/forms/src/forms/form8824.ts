import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P1 = (n: number) => ({ name: `Page1[0].f1_${n}[0]` });
/** Page 2: lines 12 through 18 share names in both years; from line 19 on, the 2025 PDF numbers run two higher than 2024 (a text box was added at line 19). */
const P2 = (n2025: number) => (n2025 <= 13 ? { name: `Page2[0].f2_${n2025}[0]` } : { names: { 2024: `Page2[0].f2_${n2025 - 2}[0]`, 2025: `Page2[0].f2_${n2025}[0]` } });
const money = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on tax return", type: "text", locate: P1(1) },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: P1(2) },
  { id: "line1", line: "1", label: "Description of like-kind property given up", type: "text", locate: P1(3) },
  { id: "line1_more", line: "1", label: "Property given up, continued", type: "text", locate: P1(4) },
  { id: "line2", line: "2", label: "Description of like-kind property received", type: "text", locate: P1(5) },
  { id: "line2_more", line: "2", label: "Property received, continued", type: "text", locate: P1(6) },
  { id: "line3", line: "3", label: "Date the like-kind property given up was originally acquired (MM/DD/YYYY)", type: "text", maxLen: 10, locate: P1(7) },
  { id: "line4", line: "4", label: "Date you actually transferred your property to the other party", type: "text", maxLen: 10, locate: P1(8) },
  { id: "line5", line: "5", label: "Date the like-kind property you received was identified by written notice to another party (within 45 days)", type: "text", maxLen: 10, locate: P1(9) },
  { id: "line6", line: "6", label: "Date you actually received the like-kind property (within 180 days)", type: "text", maxLen: 10, locate: P1(10) },
  { id: "line7", line: "7", label: "Was the exchange made with a related party, directly or indirectly (such as through an intermediary)? (Yes: complete Part II)", type: "yesno", locate: { yes: { name: "Page1[0].c1_1[0]" }, no: { name: "Page1[0].c1_1[1]" } } },
  { id: "line8_name", line: "8", label: "Name of related party", type: "text", locate: P1(11) },
  { id: "line8_relationship", line: "8", label: "Relationship to you", type: "text", locate: P1(12) },
  { id: "line8_tin", line: "8", label: "Related party's identifying number", type: "text", maxLen: 11, locate: P1(13) },
  { id: "line8_address", line: "8", label: "Address (number, street, apt., city, state, ZIP)", type: "text", locate: P1(14) },
  { id: "line9", line: "9", label: "During this year (and within 2 years of the exchange), did the related party sell or dispose of any part of the like-kind property received from you?", type: "yesno", locate: { yes: { name: "Page1[0].c1_2[0]" }, no: { name: "Page1[0].c1_2[1]" } } },
  { id: "line10", line: "10", label: "During this year (and within 2 years of the exchange), did you sell or dispose of any part of the like-kind property you received?", type: "yesno", locate: { yes: { name: "Page1[0].c1_3[0]" }, no: { name: "Page1[0].c1_3[1]" } } },
  { id: "line11", line: "11", label: "Exception to the related-party rule: \"a\" the disposition was after the death of either party, \"b\" the disposition was an involuntary conversion with the threat occurring after the exchange, \"c\" you can establish that neither the exchange nor the disposition had tax avoidance as a principal purpose (attach explanation)", type: "choice", choices: ["a", "b", "c"], locate: { a: { name: "Page1[0].c1_4[0]" }, b: { name: "Page1[0].c1_4[1]" }, c: { name: "Page1[0].c1_4[2]" } } },
  { id: "name_page2", label: "Name(s) shown on tax return (page 2)", type: "text", computed: true, locate: { name: "Page2[0].f2_1[0]" } },
  { id: "ssn_page2", label: "Identifying number (page 2)", type: "ssn", computed: true, locate: { name: "Page2[0].f2_2[0]" } },
  money("line12", "12", "Fair market value of other (not like-kind) property given up", P2(3)),
  { id: "line12a", line: "12a", label: "Description of other property given up", type: "text", locate: P2(4) },
  { id: "line12a_more", line: "12a", label: "Other property given up, continued", type: "text", locate: P2(5) },
  money("line13", "13", "Adjusted basis of other property given up", P2(6)),
  comp("line14", "14", "Gain or (loss) recognized on other property given up (reported as if sold)", P2(7), "12 - 13"),
  money("line15", "15", "Cash received, FMV of other property received, plus net liabilities assumed by the other party, reduced (not below zero) by exchange expenses", P2(8)),
  { id: "line15a", line: "15a", label: "Description of other property received", type: "text", locate: P2(9) },
  { id: "line15a_more", line: "15a", label: "Other property received, continued", type: "text", locate: P2(10) },
  money("line16", "16", "FMV of like-kind property you received", P2(11)),
  comp("line17", "17", "Add lines 15 and 16", P2(12), "15 + 16"),
  money("line18", "18", "Adjusted basis of like-kind property you gave up, net amounts paid to the other party, plus any exchange expenses not used on line 15", P2(13)),
  comp("line19", "19", "Realized gain or (loss). Subtract line 18 from line 17", P2(16), "17 - 18"),
  comp("line20", "20", "The smaller of line 15 or line 19, not less than zero", P2(17), "max(0, min(15, 19))"),
  money("line21", "21", "Ordinary income under the recapture rules (Form 4797 line 16)", P2(18)),
  comp("line22", "22", "Subtract line 21 from line 20; the capital gain recognized, to Schedule D or Form 4797", P2(19), "max(0, 20 - 21)", { alwaysShow: true }),
  comp("line23", "23", "Recognized gain. Add lines 21 and 22", P2(20), "21 + 22"),
  comp("line24", "24", "Deferred gain or (loss). Subtract line 23 from line 19", P2(21), "19 - 23", { alwaysShow: true }),
  comp("line25", "25", "Basis of like-kind property received. Subtract line 15 from the sum of lines 18 and 23", P2(22), "18 + 23 - 15", { alwaysShow: true }),
  money("line25a", "25a", "Basis of like-kind section 1250 property received", P2(23)),
  money("line25b", "25b", "Basis of like-kind section 1245, 1252, 1254, or 1255 property received", P2(24)),
  money("line25c", "25c", "Basis of like-kind intangible property received", P2(25)),
  { id: "long_term", label: "The property given up was held more than one year (the line 22 gain goes to Schedule D line 11; otherwise line 4)", type: "checkbox", noPdf: true, notes: "Defaults to true." },
  { id: "business_property", label: "Business or rental property (the gain is reported on Form 4797 rather than Schedule D)", type: "checkbox", noPdf: true },
  { id: "line26", line: "26", label: "Part IV (section 1043 conflict-of-interest sales): certificate of divestiture number, first part", type: "text", locate: P2(26) },
  { id: "line26b", line: "26", label: "Certificate of divestiture number, second part", type: "text", locate: P2(27) },
  { id: "line27", line: "27", label: "Description of divested property", type: "text", locate: P2(28) },
  { id: "line27_more", line: "27", label: "Divested property, continued", type: "text", locate: P2(29) },
  { id: "line28", line: "28", label: "Description of replacement property", type: "text", locate: P2(30) },
  { id: "line28_more", line: "28", label: "Replacement property, continued", type: "text", locate: P2(31) },
  { id: "line29", line: "29", label: "Date divested property was sold (MM/DD/YYYY)", type: "text", maxLen: 10, locate: P2(32) },
  money("line30", "30", "Sales price of divested property", P2(33)),
  money("line31", "31", "Basis of divested property", P2(34)),
  comp("line32", "32", "Realized gain. Subtract line 31 from line 30", P2(35), "30 - 31"),
  money("line33", "33", "Cost of replacement property purchased within 60 days after the date of sale", P2(36)),
  comp("line34", "34", "Subtract line 33 from line 30; not less than zero", P2(37), "max(0, 30 - 33)"),
  money("line35", "35", "Ordinary income under the recapture rules (Form 4797 line 10)", P2(38)),
  comp("line36", "36", "Subtract line 35 from line 34; not less than zero (to Schedule D or Form 4797)", P2(39), "max(0, 34 - 35)"),
  comp("line37", "37", "Deferred gain. Subtract the sum of lines 35 and 36 from line 32", P2(40), "32 - 35 - 36"),
  comp("line38", "38", "Basis of replacement property. Subtract line 37 from line 33", P2(41), "33 - 37"),
];

export const form8824: FormDef = {
  id: "f8824",
  title: "Form 8824, Like-Kind Exchanges",
  shortTitle: "Form 8824",
  description: "Reports a section 1031 exchange of real property held for business or investment: the realized gain, the gain recognized because of cash or other property (boot) received, the deferred gain, and the basis of the property received; Part IV covers section 1043 conflict-of-interest sales.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8824.pdf",
  notes: `**Who files.** Anyone who exchanged real property held for productive use in a trade or business or for investment for like-kind real property (only real property qualifies after 2017). File for the year of the exchange and, for related-party exchanges, the two following years.

**What the engine computes.** Lines 14, 17, 19 (realized gain), 20, 22 (recognized capital gain), 23, 24 (deferred gain), and 25 (basis of the property received), plus Part IV lines 32, 34, 36, 37, and 38. In a full return line 22 (and line 36) goes to Schedule D line 11 (or line 4 when long_term is false); set business_property to report it on Form 4797 instead.

**What to verify.** The 45-day identification and 180-day receipt deadlines (lines 5 and 6) are strict. Net liabilities assumed by the other party count as boot on line 15, offset by liabilities you assumed and cash you paid. Depreciation recapture on line 21 comes from Form 4797 Part III. Related-party exchanges (Part II) lose deferral if either party disposes of the property within 2 years.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (c.has("name")) c.out["name_page2"] = c.str("name");
    if (c.has("ssn")) c.out["ssn_page2"] = c.str("ssn");
    if (!c.has("long_term")) c.out["long_term"] = true;
    c.set("line14", c.n("line12") - c.n("line13"), "Gain or (loss) on other property given up", `${f(c.n("line12"))} - ${f(c.n("line13"))}`, "14");
    const l17 = c.set("line17", c.n("line15") + c.n("line16"), "Total consideration received", `${f(c.n("line15"))} + ${f(c.n("line16"))}`, "17");
    const l19 = c.set("line19", l17 - c.n("line18"), "Realized gain or (loss)", `${f(l17)} - ${f(c.n("line18"))}`, "19");
    const l20 = c.set("line20", Math.max(0, Math.min(c.n("line15"), l19)), "Gain limited to boot received", `max(0, min(${f(c.n("line15"))}, ${f(l19)}))`, "20");
    if (c.n("line21") > l20) c.warn("Line 21 (recapture income) exceeds line 20.");
    const l22 = c.set("line22", Math.max(0, l20 - c.n("line21")), "Recognized capital gain", `max(0, ${f(l20)} - ${f(c.n("line21"))})`, "22");
    const l23 = c.set("line23", c.n("line21") + l22, "Recognized gain", `${f(c.n("line21"))} + ${f(l22)}`, "23");
    c.set("line24", l19 - l23, "Deferred gain or (loss)", `${f(l19)} - ${f(l23)}`, "24");
    const l25 = c.set("line25", c.n("line18") + l23 - c.n("line15"), "Basis of like-kind property received", `${f(c.n("line18"))} + ${f(l23)} - ${f(c.n("line15"))}`, "25");
    const split = c.sum(["line25a", "line25b", "line25c"]);
    if (split > 0 && Math.abs(split - l25) >= 1) c.warn(`Lines 25a through 25c (${f(split)}) should add up to line 25 (${f(l25)}).`);
    if (c.bool("line7") && (!c.has("line9") || !c.has("line10"))) c.warn("Line 7 is yes (related party): answer lines 9 and 10 and complete the line 8 details.");
    if ((c.bool("line9") || c.bool("line10")) && !c.str("line11")) c.warn("A related party disposed of the property within 2 years: the deferred gain is recognized this year unless a line 11 exception applies.");
    if (c.has("line30") || c.has("line33")) {
      const l32 = c.set("line32", c.n("line30") - c.n("line31"), "Realized gain on divested property", `${f(c.n("line30"))} - ${f(c.n("line31"))}`, "32");
      const l34 = c.set("line34", Math.max(0, c.n("line30") - c.n("line33")), "Sales proceeds not reinvested", `max(0, ${f(c.n("line30"))} - ${f(c.n("line33"))})`, "34");
      const l36 = c.set("line36", Math.max(0, l34 - c.n("line35")), "Recognized capital gain (section 1043)", `max(0, ${f(l34)} - ${f(c.n("line35"))})`, "36");
      const l37 = c.set("line37", Math.max(0, l32 - c.n("line35") - l36), "Deferred gain (section 1043)", `${f(l32)} - ${f(c.n("line35"))} - ${f(l36)}`, "37");
      c.set("line38", c.n("line33") - l37, "Basis of replacement property", `${f(c.n("line33"))} - ${f(l37)}`, "38");
    }
    if (l19 < 0) c.warn("A loss on a like-kind exchange is not recognized (line 24 carries it into the basis of the property received).");
    return c.result();
  },
};
