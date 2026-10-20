import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const pad = (n: number) => String(n).padStart(2, "0");
const P1 = (n: number) => `Page1[0].f1_${pad(n)}[0]`;
const P2 = (n: number) => `Page2[0].f2_${pad(n)}[0]`;
const ROWS = 15;
// The IRS named row 11 column (d) "f3_444" in both years.
const G1 = (col: number) => Array.from({ length: ROWS }, (_, r) => `Page3[0].Table_PartI[0].Row${r + 1}[0].f3_${r === 10 && col === 3 ? "444" : pad(1 + r * 4 + col)}[0]`);
const G2 = (col: number) => Array.from({ length: ROWS }, (_, r) => `Page3[0].Table_PartII[0].Row${r + 1}[0].f3_${pad(61 + r * 2 + col)}[0]`);
const G3 = (col: number) => Array.from({ length: ROWS }, (_, r) => `Page4[0].Table_PartIII[0].Row${r + 1}[0].f4_${pad(1 + r * 4 + col)}[0]`);
const G4 = (col: number) => Array.from({ length: ROWS }, (_, r) => `Page4[0].Table_PartIV[0].Row${r + 1}[0].f4_${pad(69 + r * 3 + col)}[0]`);
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });
const yn = (page: 1 | 2, n: number) => ({ yes: { name: `Page${page}[0].c${page}_${n}[0]` }, no: { name: `Page${page}[0].c${page}_${n}[1]` } });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Identifying number", type: "text", maxLen: 11, locate: { name: P1(2) } },
  { id: "lineA", line: "A", label: "Are you electing the reduced credit under section 280C?", type: "yesno", locate: yn(1, 1) },
  { id: "lineB", line: "B", label: "Are you a member of a controlled group or business under common control?", type: "yesno", locate: yn(1, 2) },
  { id: "method", label: "\"regular\" (Section A) or \"asc\" (Section B, alternative simplified credit); defaults to asc unless a fixed-base percentage (line 6) or gross receipts (line 7) are supplied", type: "choice", choices: ["regular", "asc"], noPdf: true },
  money("line1", "1", "Certain amounts paid or incurred to energy consortia", P1(3)),
  money("line2", "2", "Basic research payments to qualified organizations", P1(4)),
  money("line3", "3", "Qualified organization base period amount", P1(5)),
  comp("line4", "4", "Line 2 minus line 3 (not less than zero)", P1(6), "2 - 3"),
  comp("line5", "5", "Total qualified research expenses (QREs) from line 48", P1(7), "line 48"),
  { id: "line6", line: "6", label: "Fixed-base percentage, not more than 16% (enter as a percent, for example 3 for 3%; 3% for start-up companies)", type: "percent", locate: { name: P1(8) } },
  money("line7", "7", "Average annual gross receipts for the 4 prior tax years", P1(9)),
  comp("line8", "8", "Line 7 times the line 6 percentage", P1(10), "7 x 6"),
  comp("line9", "9", "Line 5 minus line 8 (not less than zero)", P1(11), "5 - 8"),
  comp("line10", "10", "Line 5 times 50%", P1(12), "5 x 50%"),
  comp("line11", "11", "Smaller of line 9 or line 10", P1(13), "min(9, 10)"),
  comp("line12", "12", "Add lines 1, 4, and 11", P1(14), "1 + 4 + 11"),
  comp("line13", "13", "Regular credit: line 12 times 15.8% with the section 280C election, otherwise 20%", P1(15), "12 x 15.8% or 20%"),
  money("line14", "14", "ASC: certain amounts paid or incurred to energy consortia", P1(16)),
  money("line15", "15", "ASC: basic research payments to qualified organizations", P1(17)),
  money("line16", "16", "ASC: qualified organization base period amount", P1(18)),
  comp("line17", "17", "Line 15 minus line 16 (not less than zero)", P1(19), "15 - 16"),
  comp("line18", "18", "Add lines 14 and 17", P1(20), "14 + 17"),
  comp("line19", "19", "Line 18 times 20%", P1(21), "18 x 20%"),
  comp("line20", "20", "Total QREs from line 48", P1(22), "line 48"),
  money("line21", "21", "Total QREs for the prior 3 tax years (leave blank if you had no QREs in any one of those years)", P1(23)),
  comp("line22", "22", "Line 21 divided by 6", P1(24), "21 / 6"),
  comp("line23", "23", "Line 20 minus line 22 (not less than zero)", P1(25), "20 - 22"),
  comp("line24", "24", "Line 23 times 14%, or line 20 times 6% when line 21 is blank", P1(26), "23 x 14% (or 20 x 6%)"),
  comp("line25", "25", "Add lines 19 and 24", P1(27), "19 + 24"),
  comp("line26", "26", "Alternative simplified credit: line 25 times 79% with the section 280C election, otherwise line 25", P1(28), "25 x 79% or 25"),
  money("line27", "27", "Portion of the Form 8932 credit attributable to wages also used for this credit", P2(1)),
  comp("line28", "28", "Line 13 or 26 minus line 27 (not less than zero)", P2(2), "13 or 26 - 27", { alwaysShow: true }),
  money("line29", "29", "Credit for increasing research activities from partnerships, S corporations, estates, and trusts", P2(3)),
  comp("line30", "30", "Add lines 28 and 29: current-year credit (to Form 3800 Part III line 1c, or 4i for eligible small businesses)", P2(4), "28 + 29", { alwaysShow: true }),
  money("line31", "31", "Estates and trusts: amount allocated to beneficiaries", P2(5)),
  comp("line32", "32", "Estates and trusts: line 30 minus line 31", P2(6), "30 - 31"),
  { id: "eligible_small_business", label: "You are an eligible small business (average annual gross receipts of $50 million or less for the 3 prior years): the credit goes to Form 3800 Part III line 4i instead of line 1c", type: "checkbox", noPdf: true },
  { id: "estate_or_trust", label: "Filed by an estate or trust (line 32 is reported instead of line 30)", type: "checkbox", noPdf: true },
  { id: "line33a", line: "33a", label: "Qualified small business electing the payroll tax credit", type: "checkbox", locate: { name: "Page2[0].c2_1[0]" } },
  { id: "line33b", line: "33b", label: "Payroll tax is reported on a different EIN", type: "checkbox", locate: { name: "Page2[0].c2_2[0]" } },
  money("line34", "34", "Portion of line 28 elected as a payroll tax credit (not more than $500,000)", P2(7)),
  money("line35", "35", "General business credit carryforward from the current year (Form 3800)", P2(8)),
  comp("line36", "36", "Payroll tax credit: smallest of line 28, line 34, and line 35 (to Form 8974)", P2(9), "min(28, 34, 35)"),
  { id: "line37", line: "37", label: "Number of business components generating the QREs on line 5 or line 20", type: "integer", locate: { name: P2(10) } },
  money("line38", "38", "Officers' wages included on line 42", P2(11)),
  { id: "line39", line: "39", label: "Did you acquire or dispose of any major portion of a trade or business in the tax year?", type: "yesno", locate: yn(2, 3) },
  { id: "line40", line: "40", label: "Did you include any new categories of expenses as current year QREs?", type: "yesno", locate: yn(2, 4) },
  { id: "line41", line: "41", label: "Did you determine any of the QREs following the ASC 730 Directive?", type: "yesno", locate: yn(2, 5) },
  money("line41_amount", "41", "If yes, the amount from Appendix C line 19", P2(12)),
  { id: "section_g_required", line: "F-A", label: "Are you required to complete Section G (business component information)?", type: "yesno", locate: yn(2, 6) },
  money("line42", "42", "Total wages for qualified services for all business components (defaults to the Section G line 53 total)", P2(13)),
  money("line43", "43", "Total costs of supplies for all business components (defaults to the Section G line 54 total)", P2(14)),
  money("line44", "44", "Total rental or lease cost of computers for all business components (defaults to the Section G line 55 total)", P2(15)),
  money("line45", "45", "Total applicable amount of contract research for all business components (defaults to the Section G line 56 total)", P2(16)),
  money("line46", "46", "Applicable amount of all basic research payments", P2(17)),
  comp("line47", "47", "Add lines 45 and 46", P2(18), "45 + 46"),
  comp("line48", "48", "Add lines 42, 43, 44, and 47: total QREs (to line 5 or line 20)", P2(19), "42 + 43 + 44 + 47", { alwaysShow: true }),
  {
    id: "business_components",
    line: "49",
    label: "Section G: business components (up to 15 rows)",
    type: "list",
    items: [
      { id: "ein", label: "49(a) EIN of the controlled group member conducting the research", type: "text", maxLen: 10 },
      { id: "activity_code", label: "49(b) Controlled group member's principal business activity code", type: "text", maxLen: 6 },
      { id: "name", label: "49(c) Business component's name or unique identifier", type: "text" },
      { id: "type", label: "49(d) Business component type (product, process, computer software, technique, formula, or invention)", type: "text" },
      { id: "software", label: "49(e) Software type, if applicable (internal use, dual function, or held for sale)", type: "text" },
      { id: "description", label: "49(f) Information sought to be discovered", type: "text" },
      { id: "line50", label: "50 Direct research wages for qualified services", type: "money" },
      { id: "line51", label: "51 Direct supervision wages for qualified services", type: "money" },
      { id: "line52", label: "52 Direct support wages for qualified services", type: "money" },
      { id: "line53", label: "53 Total qualified wages (lines 50 through 52)", type: "money", computed: true },
      { id: "line54", label: "54 Cost of supplies", type: "money" },
      { id: "line55", label: "55 Rental or lease cost of computers", type: "money" },
      { id: "line56", label: "56 Applicable amount of contract research expenses", type: "money" },
    ],
    listLocate: both({
      ein: G1(0), activity_code: G1(1), name: G1(2), type: G1(3), software: G2(0), description: G2(1),
      line50: G3(0), line51: G3(1), line52: G3(2), line53: G3(3), line54: G4(0), line55: G4(1), line56: G4(2),
    }),
  },
  money("attach_line50", "50", "Section G totals from attachments: line 50", "Page4[0].Table_PartIII[0].RowTotalFromAttachments[0].f4_61[0]"),
  money("attach_line51", "51", "Section G totals from attachments: line 51", "Page4[0].Table_PartIII[0].RowTotalFromAttachments[0].f4_62[0]"),
  money("attach_line52", "52", "Section G totals from attachments: line 52", "Page4[0].Table_PartIII[0].RowTotalFromAttachments[0].f4_63[0]"),
  comp("attach_line53", "53", "Section G totals from attachments: line 53", "Page4[0].Table_PartIII[0].RowTotalFromAttachments[0].f4_64[0]", "attachments 50 + 51 + 52"),
  comp("total_line50", "50", "Section G total: direct research wages", "Page4[0].Table_PartIII[0].RowTotal[0].f4_65[0]", "sum of line 50"),
  comp("total_line51", "51", "Section G total: direct supervision wages", "Page4[0].Table_PartIII[0].RowTotal[0].f4_66[0]", "sum of line 51"),
  comp("total_line52", "52", "Section G total: direct support wages", "Page4[0].Table_PartIII[0].RowTotal[0].f4_67[0]", "sum of line 52"),
  comp("total_line53", "53", "Section G total: qualified wages", "Page4[0].Table_PartIII[0].RowTotal[0].f4_68[0]", "sum of line 53"),
  money("attach_line54", "54", "Section G totals from attachments: line 54", "Page4[0].Table_PartIV[0].Row16[0].f4_114[0]"),
  money("attach_line55", "55", "Section G totals from attachments: line 55", "Page4[0].Table_PartIV[0].Row16[0].f4_115[0]"),
  money("attach_line56", "56", "Section G totals from attachments: line 56", "Page4[0].Table_PartIV[0].Row16[0].f4_116[0]"),
  comp("total_line54", "54", "Section G total: cost of supplies", "Page4[0].Table_PartIV[0].Row17[0].f4_117[0]", "sum of line 54"),
  comp("total_line55", "55", "Section G total: computer rental or lease", "Page4[0].Table_PartIV[0].Row17[0].f4_118[0]", "sum of line 55"),
  comp("total_line56", "56", "Section G total: contract research", "Page4[0].Table_PartIV[0].Row17[0].f4_119[0]", "sum of line 56"),
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

export const form6765: FormDef = {
  id: "f6765",
  title: "Form 6765, Credit for Increasing Research Activities",
  shortTitle: "Form 6765",
  description: "The research credit by the regular method (20% of QREs over a fixed-base amount) or the alternative simplified credit (14% of QREs over half the 3-year average), the section 280C reduced-credit election, the qualified small business payroll tax election, and the Section F and G expense detail; reported on Form 3800.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i6765.pdf",
  notes: `**Who files.** Businesses (including sole proprietors) with qualified research expenses: wages for qualified services, supplies, computer rental, and 65% (generally) of contract research, plus pass-through shareholders and partners with a Schedule K-1 credit.

**What the engine computes.** Section A or B (chosen by method, or inferred: regular when a fixed-base percentage and gross receipts are supplied), including the 280C reduction when line A is Yes; Section C lines 28, 30, and 32; Section D line 36; Section F lines 42 through 45 from the Section G components when not supplied, and lines 47 and 48; Section G line 53 per component and the column totals. In a full return the credit goes to Form 3800 Part III line 1c (or 4i when eligible_small_business is set).

**What to verify.** Section G is required unless you are a qualified small business claiming the payroll tax credit or your total QREs are $1.5 million or less and gross receipts $50 million or less (and you answer No on Section F line A). Without the 280C election you must reduce the deduction for research expenses by the credit (attach the statement). The payroll tax election (Section D) requires gross receipts under $5 million and no gross receipts before the 5-year period.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const comps = c.list("business_components");
    if (comps.length > ROWS) c.warn(`More than ${ROWS} business components: only the first ${ROWS} print; attach the rest and enter their totals in attach_line50 through attach_line56.`);
    const rows: ListRow[] = comps.map((r) => ({ ...r, line53: num(r, "line50") + num(r, "line51") + num(r, "line52") }));
    c.out["business_components"] = rows;
    const colSum = (k: string) => rows.reduce((a, r) => a + num(r, k), 0);
    const a53 = c.set("attach_line53", c.n("attach_line50") + c.n("attach_line51") + c.n("attach_line52"), "Attachments total qualified wages", "attachments 50 + 51 + 52", "53");
    const totals: Record<string, number> = {};
    for (const k of ["line50", "line51", "line52", "line53", "line54", "line55", "line56"]) {
      const attach = k === "line53" ? a53 : c.n(`attach_${k}`);
      totals[k] = c.set(`total_${k}`, colSum(k) + attach, `Section G total ${k.replace("line", "line ")}`, `${f(colSum(k))} + attachments ${f(attach)}`, k.replace("line", ""));
    }
    if (rows.length || a53 || (totals["line54"] ?? 0) || (totals["line55"] ?? 0) || (totals["line56"] ?? 0)) {
      if (!c.has("line42")) c.set("line42", totals["line53"] ?? 0, "Total wages for qualified services", "Section G line 53 total", "42");
      if (!c.has("line43")) c.set("line43", totals["line54"] ?? 0, "Total costs of supplies", "Section G line 54 total", "43");
      if (!c.has("line44")) c.set("line44", totals["line55"] ?? 0, "Total computer rental or lease", "Section G line 55 total", "44");
      if (!c.has("line45")) c.set("line45", totals["line56"] ?? 0, "Total contract research", "Section G line 56 total", "45");
    }
    const l47 = c.set("line47", c.n("line45") + c.n("line46"), "Contract research and basic research payments", `${f(c.n("line45"))} + ${f(c.n("line46"))}`, "47");
    const l48 = c.set("line48", c.n("line42") + c.n("line43") + c.n("line44") + l47, "Total qualified research expenses", `${f(c.n("line42"))} + ${f(c.n("line43"))} + ${f(c.n("line44"))} + ${f(l47)}`, "48");
    const reduced = c.bool("lineA");
    const method = c.str("method") || (c.has("line6") || c.has("line7") ? "regular" : "asc");
    let credit: number;
    if (method === "regular") {
      const l4 = c.set("line4", Math.max(0, c.n("line2") - c.n("line3")), "Basic research payments over the base", `${f(c.n("line2"))} - ${f(c.n("line3"))}`, "4");
      const l5 = c.set("line5", l48, "Total QREs", "line 48", "5");
      let pct = Number(values["line6"]) || 0;
      if (pct > 0 && pct <= 0.16) pct = pct * 100;
      if (pct > 16) { c.warn("The fixed-base percentage cannot exceed 16%; 16% is used."); pct = 16; }
      if (c.has("line6")) c.setScalar("line6", pct, "Fixed-base percentage", `${pct}%`, "6");
      const l8 = c.set("line8", c.n("line7") * pct / 100, "Base amount", `${f(c.n("line7"))} x ${pct}%`, "8");
      const l9 = c.set("line9", Math.max(0, l5 - l8), "QREs over the base amount", `${f(l5)} - ${f(l8)}`, "9");
      const l10 = c.set("line10", l5 * 0.5, "Half of the QREs", `${f(l5)} x 50%`, "10");
      const l11 = c.set("line11", Math.min(l9, l10), "Incremental QREs", `min(${f(l9)}, ${f(l10)})`, "11");
      const l12 = c.set("line12", c.n("line1") + l4 + l11, "Credit base", `${f(c.n("line1"))} + ${f(l4)} + ${f(l11)}`, "12");
      credit = c.set("line13", l12 * (reduced ? 0.158 : 0.2), "Regular research credit", `${f(l12)} x ${reduced ? "15.8%" : "20%"}`, "13");
      if (!c.has("line6") || !c.has("line7")) c.warn("The regular credit needs the fixed-base percentage (line 6) and average annual gross receipts (line 7).");
    } else {
      const l17 = c.set("line17", Math.max(0, c.n("line15") - c.n("line16")), "Basic research payments over the base", `${f(c.n("line15"))} - ${f(c.n("line16"))}`, "17");
      const l18 = c.set("line18", c.n("line14") + l17, "Energy consortia and basic research", `${f(c.n("line14"))} + ${f(l17)}`, "18");
      const l19 = c.set("line19", l18 * 0.2, "20% of line 18", `${f(l18)} x 20%`, "19");
      const l20 = c.set("line20", l48, "Total QREs", "line 48", "20");
      let l24: number;
      if (c.has("line21") && c.n("line21") > 0) {
        const l22 = c.set("line22", c.n("line21") / 6, "Half the 3-year average QREs", `${f(c.n("line21"))} / 6`, "22");
        const l23 = c.set("line23", Math.max(0, l20 - l22), "QREs over half the average", `${f(l20)} - ${f(l22)}`, "23");
        l24 = c.set("line24", l23 * 0.14, "Alternative simplified credit base", `${f(l23)} x 14%`, "24");
      } else {
        l24 = c.set("line24", l20 * 0.06, "Alternative simplified credit base (no QREs in one of the prior 3 years)", `${f(l20)} x 6%`, "24");
        if (l20 > 0) c.warn("Line 21 (prior 3-year QREs) was not supplied: the 6% rate applies, as for a taxpayer with no QREs in one of the 3 prior years.");
      }
      const l25 = c.set("line25", l19 + l24, "Alternative simplified credit before 280C", `${f(l19)} + ${f(l24)}`, "25");
      credit = c.set("line26", reduced ? l25 * 0.79 : l25, "Alternative simplified credit", reduced ? `${f(l25)} x 79%` : `${f(l25)}`, "26");
    }
    const l28 = c.set("line28", Math.max(0, credit - c.n("line27")), "Credit after the Form 8932 overlap", `${f(credit)} - ${f(c.n("line27"))}`, "28");
    const l30 = c.set("line30", l28 + c.n("line29"), `Current-year research credit (Form 3800 line ${c.bool("eligible_small_business") ? "4i" : "1c"})`, `${f(l28)} + ${f(c.n("line29"))}`, "30");
    c.set("line32", Math.max(0, l30 - c.n("line31")), "Credit after allocation to beneficiaries", `${f(l30)} - ${f(c.n("line31"))}`, "32");
    if (c.bool("line33a")) {
      let l34 = c.n("line34");
      if (l34 > 500000) { c.warn("Line 34 cannot exceed $500,000; it is limited."); l34 = 500000; c.setScalar("line34", l34, "Payroll tax credit election", "limited to $500,000", "34"); }
      const parts = [l28, l34, ...(c.has("line35") ? [c.n("line35")] : [])];
      c.set("line36", Math.max(0, Math.min(...parts)), "Payroll tax credit (to Form 8974)", `min(${parts.map(f).join(", ")})`, "36");
      if (!c.has("line35")) c.warn("Line 35 (general business credit carryforward from Form 3800) was not supplied; line 36 ignores it.");
    } else if (c.has("line34")) c.warn("Line 34 was supplied without checking line 33a (payroll tax election); Section D is skipped.");
    if (credit > 0 && !reduced) c.warn(`Without the section 280C election, reduce the deduction for research expenses by the ${f(credit)} credit and attach the required statement.`);
    if (!c.has("section_g_required") && l48 > 0) c.warn("Answer Section F line A (whether Section G is required: generally yes unless QREs are $1.5 million or less and gross receipts $50 million or less, or you are a qualified small business claiming the payroll tax credit).");
    if (c.has("line41") && c.bool("line41") && !c.has("line41_amount")) c.warn("Line 41 is Yes: enter the Appendix C line 19 amount (line41_amount).");
    return c.result();
  },
};
