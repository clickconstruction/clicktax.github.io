import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

/** 2025 nests the paid/accrued boxes one level deeper; every other widget name matches 2024 (page 1 zero-padded f1_01.., page 2 f2_01..). */
const P1 = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const P2 = (n: number) => `Page2[0].f2_${String(n).padStart(2, "0")}[0]`;
const T1 = (line: string, n: number) => `Page1[0].Table_Part1_Lines2-6[0].Line${line}[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });
const CATEGORIES = ["section_951a", "foreign_branch", "passive", "general", "section_901j", "treaty", "lump_sum"] as const;
const CAT_BOX: Record<(typeof CATEGORIES)[number], string> = { section_951a: "Page1[0].LineA-B_ReadOrder[0].c1_1[0]", foreign_branch: "Page1[0].LineA-B_ReadOrder[0].c1_1[1]", passive: "Page1[0].LineC-D_ReadOrder[0].c1_1[0]", general: "Page1[0].LineC-D_ReadOrder[0].c1_1[1]", section_901j: "Page1[0].LineE-F_ReadOrder[0].c1_1[0]", treaty: "Page1[0].LineE-F_ReadOrder[0].c1_1[1]", lump_sum: "Page1[0].c1_1[0]" };
const CAT_LINE: Record<(typeof CATEGORIES)[number], number> = { section_951a: 25, foreign_branch: 26, passive: 27, general: 28, section_901j: 29, treaty: 30, lump_sum: 31 };
/** Part I rows with three country columns: [line, first widget number]. */
const PART1: Array<[string, number, string, boolean]> = [["2", 14, "Expenses definitely related to the income on line 1a", false], ["3a", 17, "Certain itemized deductions or the standard deduction", false], ["3b", 20, "Other deductions (attach statement)", false], ["3c", 23, "Add lines 3a and 3b", true], ["3d", 26, "Gross foreign source income", false], ["3e", 29, "Gross income from all sources", false], ["3f", 32, "Divide line 3d by line 3e (four decimals)", true], ["3g", 35, "Multiply line 3c by line 3f", true], ["4a", 38, "Home mortgage interest (Worksheet for Home Mortgage Interest)", false], ["4b", 41, "Other interest expense", false], ["5", 44, "Losses from foreign sources", false], ["6", 47, "Add lines 2, 3g, 4a, 4b, and 5", true]];
const COLS = ["a", "b", "c"] as const;
const countryItems: NonNullable<FieldDef["items"]> = [
  { id: "country", label: "(i) Foreign country or U.S. territory", type: "text" },
  { id: "line1a", label: "1a Gross income from sources within the country (before deductions)", type: "money" },
  ...PART1.map(([line, , label, computed]) => ({ id: `line${line}`, label: `${line} ${label}`, type: (line === "3f" ? "text" : "money") as "text" | "money", ...(computed ? { computed: true } : {}) })),
];
const countryLocate = {
  country: COLS.map((_, i) => `Page1[0].Table_Part1_LinesI-1a[0].Rowi[0].f1_${String(4 + i).padStart(2, "0")}[0]`),
  line1a: COLS.map((col) => `Page1[0].Table_Part1_LinesI-1a[0].Line1a[0].Col${col.toUpperCase()}[0].f1_${10 + COLS.indexOf(col)}[0]`),
  ...Object.fromEntries(PART1.map(([line, n]) => [`line${line}`, COLS.map((_, i) => T1(line, n + i))])),
};
const taxItems: NonNullable<FieldDef["items"]> = [
  { id: "date", label: "(l) Date paid or accrued", type: "text" },
  { id: "fc_dividends", label: "(m) Taxes withheld on dividends, in foreign currency", type: "money" },
  { id: "fc_rents", label: "(n) Taxes withheld on rents and royalties, in foreign currency", type: "money" },
  { id: "fc_interest", label: "(o) Taxes withheld on interest, in foreign currency", type: "money" },
  { id: "fc_other", label: "(p) Other foreign taxes paid or accrued, in foreign currency", type: "money" },
  { id: "us_dividends", label: "(q) Taxes withheld on dividends, in U.S. dollars", type: "money" },
  { id: "us_rents", label: "(r) Taxes withheld on rents and royalties, in U.S. dollars", type: "money" },
  { id: "us_interest", label: "(s) Taxes withheld on interest, in U.S. dollars", type: "money" },
  { id: "us_other", label: "(t) Other foreign taxes paid or accrued, in U.S. dollars", type: "money" },
  { id: "total", label: "(u) Total foreign taxes paid or accrued (q + r + s + t)", type: "money", computed: true },
];
const taxLocate = Object.fromEntries(taxItems.map((it, c) => [it.id, ["A", "B", "C"].map((r, i) => `Page1[0].Table_Part2[0].Row${r}[0].f1_${52 + 10 * i + c}[0]`)]));

const fields: FieldDef[] = [
  { id: "name", label: "Name", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", locate: { name: P1(2) } },
  { id: "category", label: "Category of income (one form per category): passive (interest, dividends, rents), general (wages, business), section_951a, foreign_branch, section_901j, treaty, lump_sum", type: "choice", choices: [...CATEGORIES], locate: Object.fromEntries(CATEGORIES.map((k) => [k, { name: CAT_BOX[k] }])) },
  { id: "resident_of", line: "h", label: "Resident of (name of country)", type: "text", locate: { name: P1(3) } },
  { id: "line1a_description", line: "1a", label: "Description of the gross income on line 1a (e.g. dividends, wages)", type: "text", locate: { name: "Page1[0].Table_Part1_LinesI-1a[0].Line1a[0].Line1a_Text[0].f1_07[0]" } },
  { id: "countries", line: "i-6", label: "Foreign countries (columns A, B, C): income and deductions per country", type: "list", rows: 3, items: countryItems, listLocate: { 2024: countryLocate, 2025: countryLocate } },
  comp("line1a_total", "1a", "Total gross foreign source income (columns A + B + C)", P1(13), "sum"),
  { id: "line1b", line: "1b", label: "Check if line 1a is compensation for personal services as an employee over $250,000 sourced by an alternative basis", type: "checkbox", locate: { name: "Page1[0].Line1b_ReadOrder[0].c1_2[0]" } },
  comp("line6_total", "6", "Total deductions and losses (columns A + B + C)", P1(50), "sum"),
  comp("line7", "7", "Subtract line 6 from line 1a: net foreign source taxable income", P1(51), "1a total - 6 total"),
  { id: "paid_or_accrued", line: "j/k", label: "Foreign taxes: paid or accrued", type: "choice", choices: ["paid", "accrued"], locate: { paid: { names: { 2024: "Page1[0].ActiveHeaderElements[0].c1_3[0]", 2025: "Page1[0].Part2[0].ActiveHeaderElements[0].c1_3[0]" } }, accrued: { names: { 2024: "Page1[0].ActiveHeaderElements[0].c1_3[1]", 2025: "Page1[0].Part2[0].ActiveHeaderElements[0].c1_3[1]" } } } },
  { id: "taxes", line: "Part II", label: "Foreign taxes paid or accrued per country (rows A, B, C)", type: "list", rows: 3, items: taxItems, listLocate: { 2024: taxLocate, 2025: taxLocate } },
  comp("line8", "8", "Total foreign taxes paid or accrued (sum of column (u))", P1(82), "sum of (u)"),
  comp("line9", "9", "Foreign taxes for this category (line 8)", "Page2[0].Line9_ReadOrder[0].f2_01[0]", "line 8"),
  money("line10", "10", "Carryback or carryover of foreign taxes (attach Schedule B)", P2(2)),
  { id: "schedule_b_attached", line: "10", label: "Check if Schedule B (Form 1116) is attached", type: "checkbox", locate: { name: "Page2[0].Line10_ReadOrder[0].c2_1[0]" } },
  comp("line11", "11", "Add lines 9 and 10", P2(3), "9 + 10"),
  money("line12", "12", "Reduction in foreign taxes (entered as a negative)", P2(4)),
  money("line13", "13", "Taxes reclassified under high tax kickout", P2(5)),
  comp("line14", "14", "Total foreign taxes available for credit (11 + 12 + 13)", P2(6), "11 + 12 + 13"),
  comp("line15", "15", "Net foreign source taxable income (line 7)", "Page2[0].Line15_ReadOrder[0].f2_07[0]", "line 7"),
  money("line16", "16", "Adjustments to line 15 (capital gain rate differential, etc.)", P2(8)),
  comp("line17", "17", "Combine lines 15 and 16; if zero or less, no credit this year", P2(9), "15 + 16"),
  money("line18", "18", "Taxable income from Form 1040 line 15 (without the exemption deduction)", P2(10)),
  { id: "line19", line: "19", label: "Divide line 17 by line 18 (four decimals; not more than 1)", type: "text", computed: true, locate: { name: P2(11) } },
  money("line20", "20", "Tax: Form 1040 line 16 plus Schedule 2 line 1z (minus certain taxes)", P2(12)),
  comp("line21", "21", "Multiply line 20 by line 19", P2(13), "20 x 19"),
  money("line22", "22", "Increase in limitation (section 960(c))", P2(14)),
  comp("line23", "23", "Add lines 21 and 22", P2(15), "21 + 22"),
  comp("line24", "24", "Smaller of line 14 or line 23 (the credit for this category)", P2(16), "min(14, 23)", { alwaysShow: true }),
  ...CATEGORIES.map((k) => money(`line${CAT_LINE[k]}`, String(CAT_LINE[k]), `Credit for taxes on ${k.replace(/_/g, " ")} income (this form's line 24 when it is this category; otherwise from another Form 1116)`, P2(CAT_LINE[k] - 8), { computed: true })),
  comp("line32", "32", "Add lines 25 through 31", P2(24), "sum"),
  comp("line33", "33", "Smaller of line 20 or line 32", P2(25), "min(20, 32)"),
  money("line34", "34", "Reduction of credit for international boycott operations", P2(26)),
  comp("line35", "35", "Foreign tax credit; carried to Schedule 3 line 1", P2(27), "33 - 34", { alwaysShow: true }),
  { id: "other_category_credits", label: "Credits from other Forms 1116 as {category: amount} (e.g. { general: 500 }) for lines 25-31", type: "text" },
];

export const form1116: FormDef = {
  id: "f1116",
  title: "Form 1116, Foreign Tax Credit (Individual, Estate, or Trust)",
  shortTitle: "Form 1116",
  description: "Credits foreign income taxes against U.S. tax, limited to the U.S. tax on the foreign source share of taxable income, one form per income category (passive for dividends and interest, general for wages and business income). Line 35 goes to Schedule 3 line 1.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1116.pdf",
  notes: `**When you can skip it.** Foreign taxes of $300 or less ($600 married filing jointly), all from passive income reported on Forms 1099 or K-1, can go straight on Schedule 3 line 1 without this form (and without the limitation).

**What the engine computes.** Per country: lines 3c, 3f, 3g, and 6; the totals on lines 1a, 6, 7, 8; Part III lines 9, 11, 14, 15, 17, 19 (four decimals, capped at 1), 21, 23, 24; Part IV with this form's category on its line and any other categories you supply; lines 32, 33, 35. In a full return, line 18 is taxable income, line 20 is the tax, and line 35 lands on Schedule 3 line 1.

**What to verify.** Line 3a should be the standard deduction or the itemized deductions not definitely related to any income; foreign-currency amounts need the exchange rate on the date paid; carryovers (line 10) need Schedule B (Form 1116) and a ten-year record; qualified dividends and capital gains may need the line 16 adjustment.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
    const countries = c.list("countries").map((r) => {
      const l3c = num(r, "line3a") + num(r, "line3b");
      const ratio = num(r, "line3e") > 0 ? Math.min(1, Math.round((num(r, "line3d") / num(r, "line3e")) * 10000) / 10000) : 0;
      const l3g = Math.round(l3c * ratio);
      return { ...r, line3c: l3c, line3f: ratio.toFixed(4), line3g: l3g, line6: num(r, "line2") + l3g + num(r, "line4a") + num(r, "line4b") + num(r, "line5") };
    });
    if (countries.length) c.out["countries"] = countries;
    const l1 = c.set("line1a_total", countries.reduce((a, r) => a + num(r, "line1a"), 0), "Gross foreign income", "sum of 1a", "1a");
    const l6 = c.set("line6_total", countries.reduce((a, r) => a + num(r, "line6"), 0), "Deductions and losses", "sum of 6", "6");
    const l7 = c.set("line7", l1 - l6, "Net foreign source taxable income", `${f(l1)} - ${f(l6)}`, "7");
    const taxes = c.list("taxes").map((r) => ({ ...r, total: num(r, "us_dividends") + num(r, "us_rents") + num(r, "us_interest") + num(r, "us_other") }));
    if (taxes.length) c.out["taxes"] = taxes;
    const l8 = c.set("line8", taxes.reduce((a, r) => a + num(r, "total"), 0), "Total foreign taxes", "sum of (u)", "8");
    const l9 = c.set("line9", l8, "Taxes for this category", "line 8", "9");
    const l11 = c.set("line11", l9 + c.n("line10"), "Including carryovers", `${f(l9)} + ${f(c.n("line10"))}`, "11");
    const l14 = c.set("line14", l11 + c.n("line12") + c.n("line13"), "Taxes available", `${f(l11)} + ${f(c.n("line12"))} + ${f(c.n("line13"))}`, "14");
    const l15 = c.set("line15", l7, "From line 7", "line 7", "15");
    const l17 = c.set("line17", l15 + c.n("line16"), "Net foreign source taxable income", `${f(l15)} + ${f(c.n("line16"))}`, "17");
    const l18 = c.n("line18");
    if (!c.has("line18") || !c.has("line20")) c.warn("Supply line18 (taxable income) and line20 (tax) so the limitation can be figured; shown without the limit.");
    const ratio = l18 > 0 && l17 > 0 ? Math.min(1, Math.round((l17 / l18) * 10000) / 10000) : 0;
    c.setScalar("line19", ratio.toFixed(4), "Foreign share of taxable income", `${f(l17)} / ${f(l18)}`, "19");
    const l21 = c.set("line21", Math.round(c.n("line20") * ratio), "U.S. tax on foreign income", `${f(c.n("line20"))} x ${ratio.toFixed(4)}`, "21");
    const l23 = c.set("line23", l21 + c.n("line22"), "Limitation", `${f(l21)} + ${f(c.n("line22"))}`, "23");
    const limited = c.has("line18") && c.has("line20");
    const l24 = c.set("line24", limited ? Math.min(l14, l23) : l14, "Credit for this category", limited ? `min(${f(l14)}, ${f(l23)})` : `line 14 ${f(l14)} (unlimited)`, "24");
    if (limited && l14 > l23) c.warn(`${f(l14 - l23)} of foreign taxes exceed this year's limitation and carry back one year or forward ten (Schedule B, Form 1116).`);
    const cat = (CATEGORIES.includes(c.str("category") as never) ? c.str("category") : "passive") as (typeof CATEGORIES)[number];
    if (!c.has("category")) c.warn("category was not supplied; passive assumed.");
    let others: Record<string, number> = {};
    try { const raw = values["other_category_credits"]; others = typeof raw === "string" ? (JSON.parse(raw) as Record<string, number>) : ((raw as unknown as Record<string, number> | undefined) ?? {}); } catch { c.warn("other_category_credits must be JSON like {\"general\": 500}."); }
    let l32 = 0;
    for (const k of CATEGORIES) {
      const v = k === cat ? l24 : Math.max(0, Number(others[k] ?? 0) || 0);
      c.out[`line${CAT_LINE[k]}`] = v;
      l32 += v;
    }
    c.set("line32", l32, "Credits from all categories", "25 + ... + 31", "32");
    const l33 = c.set("line33", limited ? Math.min(c.n("line20"), l32) : l32, "Limited to the tax", limited ? `min(${f(c.n("line20"))}, ${f(l32)})` : "unlimited", "33");
    c.set("line35", Math.max(0, l33 - c.n("line34")), "Foreign tax credit", `${f(l33)} - ${f(c.n("line34"))}`, "35");
    if (cat === "passive" && l8 <= (c.str("filing_status") === "mfj" ? 600 : 300) && l8 > 0) c.warn("Passive foreign taxes at or below $300 ($600 joint) from 1099s can be claimed on Schedule 3 line 1 without Form 1116 and without the limitation.");
    return c.result();
  },
};
