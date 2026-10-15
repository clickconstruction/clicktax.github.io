import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

type Y = Partial<Record<TaxYear, string>>;
const names = (y24: string, y25: string): { names: Y } => ({ names: { 2024: y24, 2025: y25 } });
const amt = (id: string, line: string, label: string, page: number | Partial<Record<TaxYear, number>>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, page: number | Partial<Record<TaxYear, number>>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, page, { computed: true, notes, ...extra });

/** First-year MACRS percentages (IRS Pub. 946 Tables A-1 to A-5), half-year and mid-quarter conventions. */
const HY: Record<number, number> = { 3: 33.33, 5: 20, 7: 14.29, 10: 10, 15: 5, 20: 3.75, 25: 2 };
const MQ: Record<number, [number, number, number, number]> = {
  3: [58.33, 41.67, 25, 8.33],
  5: [35, 25, 15, 5],
  7: [25, 17.85, 10.71, 3.57],
  10: [17.5, 12.5, 7.5, 2.5],
  15: [8.75, 6.25, 3.75, 1.25],
  20: [6.563, 4.688, 2.813, 0.938],
  25: [3.5, 2.5, 1.5, 0.5],
};
const METHOD: Record<number, string> = { 3: "200DB", 5: "200DB", 7: "200DB", 10: "200DB", 15: "150DB", 20: "150DB", 25: "S/L" };

function monthOf(date: unknown): number | undefined {
  const s = String(date ?? "").trim();
  const m = /^(\d{1,2})[\/-]/.exec(s) ?? /^\d{4}-(\d{2})/.exec(s);
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 12 ? n : undefined;
}

/** First-year depreciation percentage for property placed in service this year. */
function firstYearPct(recovery: number, convention: string, month: number | undefined, realProperty: boolean): number {
  if (realProperty) {
    const m = month ?? 1;
    return ((12.5 - m) / 12 / recovery) * 100;
  }
  if (convention === "MQ") {
    const q = month ? Math.ceil(month / 3) : 1;
    const row = MQ[recovery];
    if (row) return row[q - 1]!;
    return (((12.5 - 3 * (q - 1) - 1.5) / 12) / recovery) * 100;
  }
  const hy = HY[recovery];
  return hy ?? (100 / recovery / 2);
}

// ---------- Section B (GDS) rows ----------
interface RowSpec { id: string; label: string; recovery: number; real: boolean; y24: Partial<Record<"b" | "c" | "d" | "e" | "f" | "g", string>>; y25: Partial<Record<"b" | "c" | "d" | "e" | "f" | "g", string>>; years?: TaxYear[] }
const SB = (row: string, b: string, c: string, d?: string, e?: string, f?: string, g?: string) => ({ b: `Page1[0].SectionBTable[0].${row}[0].${b}`, c: `Page1[0].SectionBTable[0].${row}[0].${c}`, ...(d ? { d: `Page1[0].SectionBTable[0].${row}[0].${d}` } : {}), ...(e ? { e: `Page1[0].SectionBTable[0].${row}[0].${e}` } : {}), ...(f ? { f: `Page1[0].SectionBTable[0].${row}[0].${f}` } : {}), ...(g ? { g: `Page1[0].SectionBTable[0].${row}[0].${g}` } : {}) });
const SC = (row: string, b: string, c: string, d?: string, e?: string, g?: string) => ({ b: `Page1[0].SectionCTable[0].${row}[0].${b}`, c: `Page1[0].SectionCTable[0].${row}[0].${c}`, ...(d ? { d: `Page1[0].SectionCTable[0].${row}[0].${d}` } : {}), ...(e ? { e: `Page1[0].SectionCTable[0].${row}[0].${e}` } : {}), ...(g ? { g: `Page1[0].SectionCTable[0].${row}[0].${g}` } : {}) });
const F = (n: number) => `f1_${n}[0]`;
const GDS_ROWS: RowSpec[] = [
  { id: "macrs_3yr", label: "19a 3-year property", recovery: 3, real: false, y24: SB("Line19a", "R4[0]", F(26), F(27), F(28), F(29), F(30)), y25: SB("Line19a", F(26), F(27), F(28), F(29), F(30), F(31)) },
  { id: "macrs_5yr", label: "19b 5-year property", recovery: 5, real: false, y24: SB("Line19b", "R5[0]", F(31), F(32), F(33), F(34), F(35)), y25: SB("Line19b", F(32), F(33), F(34), F(35), F(36), F(37)) },
  { id: "macrs_7yr", label: "19c 7-year property", recovery: 7, real: false, y24: SB("Line19c", "R6[0]", F(36), F(37), F(38), F(39), F(40)), y25: SB("Line19c", F(38), F(39), F(40), F(41), F(42), F(43)) },
  { id: "macrs_10yr", label: "19d 10-year property", recovery: 10, real: false, y24: SB("Line19d", "R7[0]", F(41), F(42), F(43), F(44), F(45)), y25: SB("Line19d", F(44), F(45), F(46), F(47), F(48), F(49)) },
  { id: "macrs_15yr", label: "19e 15-year property", recovery: 15, real: false, y24: SB("Line19e", "R8[0]", F(46), F(47), F(48), F(49), F(50)), y25: SB("Line19e", F(50), F(51), F(52), F(53), F(54), F(55)) },
  { id: "macrs_20yr", label: "19f 20-year property", recovery: 20, real: false, y24: SB("Line19f", "R9[0]", F(51), F(52), F(53), F(54), F(55)), y25: SB("Line19f", F(56), F(57), F(58), F(59), F(60), F(61)) },
  { id: "macrs_25yr", label: "19g 25-year property", recovery: 25, real: false, y24: SB("Line19g", "R10[0]", F(56), undefined, F(58), undefined, F(60)), y25: SB("Line19g", F(62), F(63), undefined, F(65), undefined, F(67)) },
  { id: "macrs_50yr", label: "19h 50-year property", recovery: 50, real: true, years: [2025], y24: {}, y25: SB("Line19h", F(68), F(69), undefined, undefined, undefined, F(73)) },
  { id: "residential_rental_1", label: "Residential rental property (first entry)", recovery: 27.5, real: true, y24: SB("Line19h_1", F(61), F(62), undefined, undefined, undefined, F(66)), y25: SB("Line19i_1", F(74), F(75), undefined, undefined, undefined, F(79)) },
  { id: "residential_rental_2", label: "Residential rental property (second entry)", recovery: 27.5, real: true, y24: SB("Line19h_2", F(67), F(68), undefined, undefined, undefined, F(72)), y25: SB("Line19i_2", F(80), F(81), undefined, undefined, undefined, F(85)) },
  { id: "nonresidential_real_1", label: "Nonresidential real property (first entry)", recovery: 39, real: true, y24: SB("Line19i_1", F(73), F(74), undefined, undefined, undefined, F(78)), y25: SB("Line19j_1", F(86), F(87), undefined, undefined, undefined, F(91)) },
  { id: "nonresidential_real_2", label: "Nonresidential real property (second entry)", recovery: 39, real: true, y24: SB("Line19i_2", F(79), F(80), F(81), undefined, undefined, F(84)), y25: SB("Line19j_2", F(92), F(93), F(94), undefined, undefined, F(97)) },
];
const ADS_ROWS: RowSpec[] = [
  { id: "ads_class_life", label: "20a Class life", recovery: 0, real: false, y24: SC("Line20a", "R11[0]", F(85), F(86), F(87), F(89)), y25: SC("Line20a", F(98), F(99), F(100), F(101), F(103)) },
  { id: "ads_12yr", label: "20b 12-year", recovery: 12, real: false, y24: SC("Line20b", "R12[0]", F(90), undefined, F(92), F(94)), y25: SC("Line20b", F(104), F(105), undefined, F(107), F(109)) },
  { id: "ads_30yr", label: "20c 30-year", recovery: 30, real: true, y24: SC("Line20c", F(95), F(96), undefined, undefined, F(100)), y25: SC("Line20c", F(110), F(111), undefined, undefined, F(115)) },
  { id: "ads_40yr", label: "20d 40-year", recovery: 40, real: true, y24: SC("Line20d", F(101), F(102), undefined, undefined, F(106)), y25: SC("Line20d", F(116), F(117), undefined, undefined, F(121)) },
  { id: "ads_50yr", label: "20e 50-year", recovery: 50, real: true, years: [2025], y24: {}, y25: SC("Line20e", F(122), F(123), undefined, undefined, F(127)) },
];
const COL_LABEL: Record<string, string> = { b: "Month and year placed in service", c: "Basis for depreciation (business use only)", d: "Recovery period", e: "Convention", f: "Method", g: "Depreciation deduction" };
function rowFields(spec: RowSpec): FieldDef[] {
  const out: FieldDef[] = [];
  for (const col of ["b", "c", "d", "e", "f", "g"] as const) {
    const has24 = spec.y24[col];
    const has25 = spec.y25[col];
    if (!has24 && !has25) continue;
    const loc: { names: Y } = { names: { ...(has24 ? { 2024: has24 } : {}), ...(has25 ? { 2025: has25 } : {}) } };
    const base: FieldDef = { id: `${spec.id}_${col}`, label: `${spec.label}: ${COL_LABEL[col]}`, type: col === "c" || col === "g" ? "money" : "text", locate: loc, ...(spec.years ? { years: spec.years } : {}) };
    if (col === "g" || col === "d" || col === "e" || col === "f") base.computed = true;
    if (col === "b") base.notes = "MM/YYYY";
    out.push(base);
  }
  return out;
}

// ---------- Part V listed property rows ----------
const V26 = (year: TaxYear, row: number, i: number) => (year === 2025 ? `Page2[0].Table_Ln26[0].BodyRow${row}[0].f2_${6 + 9 * (row - 1) + i}[0]` : `Page2[0].Table_Ln26[0].BodyRow${row}[0].f2_${2 + 9 * (row - 1) + i}[0]`);
const V27 = (year: TaxYear, row: number, i: number) => (year === 2025 ? `Page2[0].Table_Ln27[0].BodyRow${row}[0].f2_${33 + 8 * (row - 1) + i}[0]` : `Page2[0].Table_Ln27[0].BodyRow${row}[0].f2_${29 + 8 * (row - 1) + i}[0]`);
const rows3 = (fn: (row: number) => string) => [1, 2, 3].map(fn);
const VEH = (year: TaxYear, line: 30 | 31 | 32 | 33, v: number) => {
  const start25 = { 30: 59, 31: 65, 32: 71, 33: 77 }[line];
  const start24 = { 30: 55, 31: 61, 32: 67, 33: 73 }[line];
  return `Page2[0].Table_Ln30-33[0].Line${line}[0].f2_${(year === 2025 ? start25 : start24) + v}[0]`;
};
const VEHQ = (year: TaxYear, line: 34 | 35 | 36, v: number, yes: boolean) => {
  const start25 = { 34: 4, 35: 10, 36: 16 }[line];
  const start24 = { 34: 3, 35: 9, 36: 15 }[line];
  return `Page2[0].SectionBTable2[0].Line${line}[0].c2_${(year === 2025 ? start25 : start24) + v}[${yes ? 0 : 1}]`;
};
const vehicles6 = (fn: (v: number) => string) => [0, 1, 2, 3, 4, 5].map(fn);

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: "Page1[0].f1_1[0]" } },
  { id: "business_activity", label: "Business or activity to which this form relates", type: "text", locate: { name: "Page1[0].f1_2[0]" } },
  { id: "identifying_number", label: "Identifying number", type: "text", maxLen: 11, locate: { name: "Page1[0].f1_3[0]" } },
  comp("line1", "1", "Maximum section 179 amount", 1, "$1,220,000 (2024) or $2,500,000 (2025)"),
  amt("line2", "2", "Total cost of section 179 property placed in service", 1, { notes: "Defaults to the cost of the line 6 and line 26 property." }),
  comp("line3", "3", "Threshold cost of section 179 property before reduction", 1, "$3,050,000 (2024) or $4,000,000 (2025)"),
  comp("line4", "4", "Reduction in limitation", 1, "line 2 - line 3, not less than zero"),
  comp("line5", "5", "Dollar limitation for the tax year", 1, "line 1 - line 4, not less than zero"),
  {
    id: "section179_property",
    line: "6",
    label: "Section 179 property (up to 2 rows): description, cost (business use only), elected cost",
    type: "list",
    rows: 2,
    items: [
      { id: "description", label: "Description of property", type: "text" },
      { id: "cost", label: "Cost (business use only)", type: "money" },
      { id: "elected", label: "Elected cost", type: "money" },
    ],
    listLocate: {
      2024: { description: ["Page1[0].Table_Ln6[0].BodyRow1[0].f1_9[0]", "Page1[0].Table_Ln6[0].BodyRow2[0].f1_12[0]"], cost: ["Page1[0].Table_Ln6[0].BodyRow1[0].f1_10[0]", "Page1[0].Table_Ln6[0].BodyRow2[0].f1_13[0]"], elected: ["Page1[0].Table_Ln6[0].BodyRow1[0].f1_11[0]", "Page1[0].Table_Ln6[0].BodyRow2[0].f1_14[0]"] },
      2025: { description: ["Page1[0].Table_Ln6[0].BodyRow1[0].f1_9[0]", "Page1[0].Table_Ln6[0].BodyRow2[0].f1_12[0]"], cost: ["Page1[0].Table_Ln6[0].BodyRow1[0].f1_10[0]", "Page1[0].Table_Ln6[0].BodyRow2[0].f1_13[0]"], elected: ["Page1[0].Table_Ln6[0].BodyRow1[0].f1_11[0]", "Page1[0].Table_Ln6[0].BodyRow2[0].f1_14[0]"] },
    },
  },
  comp("line7", "7", "Listed property elected cost (from line 29)", 1, "line 29"),
  comp("line8", "8", "Total elected cost of section 179 property", 1, "line 6 column (c) + line 7"),
  comp("line9", "9", "Tentative deduction", 1, "smaller of line 5 or line 8"),
  amt("line10", "10", "Carryover of disallowed deduction from last year's Form 4562 line 13", 1),
  amt("line11", "11", "Business income limitation (taxable income from active trades or businesses, including wages)", 1, { notes: "Defaults to Schedule C profit before depreciation plus wages when preparing a full return." }),
  comp("line12", "12", "Section 179 expense deduction", 1, "lines 9 + 10, not more than line 11", { alwaysShow: true }),
  comp("line13", "13", "Carryover of disallowed deduction to next year", 1, "lines 9 + 10 - line 12"),
  amt("line14", "14", "Special depreciation allowance for qualified property (other than listed property) placed in service this year", 1),
  amt("line15", "15", "Property subject to section 168(f)(1) election", 1),
  amt("line16", "16", "Other depreciation (including ACRS)", 1),
  amt("line17", "17", "MACRS deductions for assets placed in service in tax years before this year", 1),
  { id: "line18", line: "18", label: "Electing to group assets placed in service this year into general asset accounts", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  ...GDS_ROWS.flatMap(rowFields),
  ...ADS_ROWS.flatMap(rowFields),
  comp("line21", "21", "Listed property (from line 28)", { 2024: 1, 2025: 2 }, "line 28"),
  comp("line22", "22", "Total depreciation; carried to Schedule C line 13 (or the appropriate line of your return)", { 2024: 1, 2025: 2 }, "12 + 14 + 15 + 16 + 17 + all of line 19 and 20 column (g) + 21", { alwaysShow: true }),
  amt("line23", "23", "Portion of the basis attributable to section 263A costs (assets placed in service this year)", { 2024: 1, 2025: 2 }, { locate: names("Page1[0].f1_109[0]", "Page2[0].f2_3[0]") }),
  { id: "line24a_evidence", line: "24a", label: "Do you have evidence to support the business/investment use claimed?", type: "yesno", locate: { yes: names("Page2[0].c2_1[0]", "Page2[0].c2_1[0]"), no: names("Page2[0].c2_1[1]", "Page2[0].c2_1[1]") } },
  { id: "line24b_written", line: "24b", label: "If yes, is the evidence written?", type: "yesno", locate: { yes: names("Page2[0].c2_2[0]", "Page2[0].c2_2[0]"), no: names("Page2[0].c2_2[1]", "Page2[0].c2_2[1]") } },
  { id: "vehicle_owned_or_leased", line: "24c", label: "Vehicle owned or leased", type: "choice", choices: ["own", "lease"], years: [2025], locate: { own: { names: { 2025: "Page2[0].c2_3[1]" } }, lease: { names: { 2025: "Page2[0].c2_3[2]" } } } },
  amt("line25", "25", "Special depreciation allowance for qualified listed property placed in service this year and used more than 50% in a qualified business use", 2),
  {
    id: "listed_property",
    line: "26",
    label: "Listed property (vehicles, etc.) used more than 50% for business (up to 3 rows)",
    type: "list",
    rows: 3,
    items: [
      { id: "type", label: "Type of property (list vehicles first)", type: "text" },
      { id: "date", label: "Date placed in service", type: "text" },
      { id: "business_pct", label: "Business/investment use percentage", type: "percent" },
      { id: "cost", label: "Cost or other basis", type: "money" },
      { id: "basis", label: "Basis for depreciation (business use only)", type: "money", computed: true },
      { id: "recovery", label: "Recovery period (years)", type: "text" },
      { id: "method", label: "Method/convention", type: "text", computed: true },
      { id: "depreciation", label: "Depreciation deduction", type: "money", computed: true },
      { id: "section179", label: "Elected section 179 cost", type: "money" },
    ],
    listLocate: {
      2024: Object.fromEntries(["type", "date", "business_pct", "cost", "basis", "recovery", "method", "depreciation", "section179"].map((k, i) => [k, rows3((r) => V26(2024, r, i))])),
      2025: Object.fromEntries(["type", "date", "business_pct", "cost", "basis", "recovery", "method", "depreciation", "section179"].map((k, i) => [k, rows3((r) => V26(2025, r, i))])),
    },
    notes: "Depreciation is figured with the half-year (or MQ) first-year percentage for the recovery period (default 5 years for vehicles). Luxury-auto caps are not applied; check the instructions' limits.",
  },
  {
    id: "listed_property_50_or_less",
    line: "27",
    label: "Listed property used 50% or less for business (up to 3 rows; straight line)",
    type: "list",
    rows: 3,
    items: [
      { id: "type", label: "Type of property", type: "text" },
      { id: "date", label: "Date placed in service", type: "text" },
      { id: "business_pct", label: "Business/investment use percentage", type: "percent" },
      { id: "cost", label: "Cost or other basis", type: "money" },
      { id: "basis", label: "Basis for depreciation (business use only)", type: "money", computed: true },
      { id: "recovery", label: "Recovery period (years)", type: "text" },
      { id: "method", label: "Method/convention (S/L)", type: "text", computed: true },
      { id: "depreciation", label: "Depreciation deduction", type: "money", computed: true },
    ],
    listLocate: {
      2024: Object.fromEntries(["type", "date", "business_pct", "cost", "basis", "recovery", "method", "depreciation"].map((k, i) => [k, rows3((r) => V27(2024, r, i))])),
      2025: Object.fromEntries(["type", "date", "business_pct", "cost", "basis", "recovery", "method", "depreciation"].map((k, i) => [k, rows3((r) => V27(2025, r, i))])),
    },
  },
  comp("line28", "28", "Add amounts in column (h), lines 26 and 27; carried to line 21", 2, "listed property depreciation"),
  comp("line29", "29", "Add amounts in column (i), line 26; carried to line 7", 2, "listed property section 179"),
  {
    id: "vehicles",
    line: "30-36",
    label: "Vehicle usage (up to 6 vehicles): miles and the yes/no questions",
    type: "list",
    rows: 6,
    items: [
      { id: "business_miles", label: "30 Total business/investment miles driven during the year", type: "integer" },
      { id: "commuting_miles", label: "31 Total commuting miles", type: "integer" },
      { id: "other_miles", label: "32 Total other personal (noncommuting) miles", type: "integer" },
      { id: "total_miles", label: "33 Total miles driven", type: "integer", computed: true },
      { id: "available_off_duty", label: "34 Was the vehicle available for personal use during off-duty hours?", type: "yesno" },
      { id: "used_by_owner", label: "35 Was the vehicle used primarily by a more than 5% owner or related person?", type: "yesno" },
      { id: "another_vehicle", label: "36 Is another vehicle available for personal use?", type: "yesno" },
    ],
    listLocate: {
      2024: { business_miles: vehicles6((v) => VEH(2024, 30, v)), commuting_miles: vehicles6((v) => VEH(2024, 31, v)), other_miles: vehicles6((v) => VEH(2024, 32, v)), total_miles: vehicles6((v) => VEH(2024, 33, v)), "available_off_duty.yes": vehicles6((v) => VEHQ(2024, 34, v, true)), "available_off_duty.no": vehicles6((v) => VEHQ(2024, 34, v, false)), "used_by_owner.yes": vehicles6((v) => VEHQ(2024, 35, v, true)), "used_by_owner.no": vehicles6((v) => VEHQ(2024, 35, v, false)), "another_vehicle.yes": vehicles6((v) => VEHQ(2024, 36, v, true)), "another_vehicle.no": vehicles6((v) => VEHQ(2024, 36, v, false)) },
      2025: { business_miles: vehicles6((v) => VEH(2025, 30, v)), commuting_miles: vehicles6((v) => VEH(2025, 31, v)), other_miles: vehicles6((v) => VEH(2025, 32, v)), total_miles: vehicles6((v) => VEH(2025, 33, v)), "available_off_duty.yes": vehicles6((v) => VEHQ(2025, 34, v, true)), "available_off_duty.no": vehicles6((v) => VEHQ(2025, 34, v, false)), "used_by_owner.yes": vehicles6((v) => VEHQ(2025, 35, v, true)), "used_by_owner.no": vehicles6((v) => VEHQ(2025, 35, v, false)), "another_vehicle.yes": vehicles6((v) => VEHQ(2025, 36, v, true)), "another_vehicle.no": vehicles6((v) => VEHQ(2025, 36, v, false)) },
    },
  },
  ...([37, 38, 39, 40, 41] as const).map((n, i): FieldDef => ({
    id: `line${n}`,
    line: String(n),
    label: ["Do you maintain a written policy prohibiting all personal use of vehicles, including commuting, by your employees?", "Do you maintain a written policy prohibiting personal use of vehicles, except commuting, by your employees?", "Do you treat all use of vehicles by employees as personal use?", "Do you provide more than five vehicles to your employees and retain the information?", "Do you meet the requirements concerning qualified automobile demonstration use?"][i]!,
    type: "yesno",
    locate: { yes: names(`Page2[0].c2_${21 + i}[0]`, `Page3[0].c3_${1 + i}[0]`), no: names(`Page2[0].c2_${21 + i}[1]`, `Page3[0].c3_${1 + i}[1]`) },
  })),
  {
    id: "amortization",
    line: "42",
    label: "Amortization of costs that begin this year (up to 2 rows)",
    type: "list",
    rows: 2,
    items: [
      { id: "description", label: "Description of costs", type: "text" },
      { id: "date", label: "Date amortization begins", type: "text" },
      { id: "amount", label: "Amortizable amount", type: "money" },
      { id: "code", label: "Code section", type: "text" },
      { id: "period", label: "Amortization period or percentage", type: "text" },
      { id: "amortization", label: "Amortization for this year", type: "money" },
    ],
    listLocate: {
      2024: Object.fromEntries(["description", "date", "amount", "code", "period", "amortization"].map((k, i) => [k, [`Page2[0].PartVITable[0].BodyRow1[0].f2_${79 + i}[0]`, `Page2[0].PartVITable[0].BodyRow2[0].f2_${85 + i}[0]`]])),
      2025: Object.fromEntries(["description", "date", "amount", "code", "period", "amortization"].map((k, i) => [k, [`Page3[0].PartVITable[0].BodyRow1[0].f3_${1 + i}[0]`, `Page3[0].PartVITable[0].BodyRow2[0].f3_${7 + i}[0]`]])),
    },
    notes: "Supply the amortization for the year, or a period in years and the engine divides the amount by it for a full year.",
  },
  amt("line43", "43", "Amortization of costs that began before this year", { 2024: 2, 2025: 3 }),
  comp("line44", "44", "Total amortization; report where directed by the instructions (Schedule C line 27a for a business)", { 2024: 2, 2025: 3 }, "line 42 + line 43"),
];

export const form4562: FormDef = {
  id: "f4562",
  title: "Form 4562, Depreciation and Amortization (Including Information on Listed Property)",
  shortTitle: "Form 4562",
  description: "Section 179 expensing, special (bonus) depreciation, MACRS depreciation for assets placed in service this year, listed property such as vehicles with their usage questions, and amortization. Line 22 goes to Schedule C line 13.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i4562.pdf",
  notes: `**What this form is for.** Required when you claim depreciation on assets placed in service this year, a section 179 deduction, depreciation on listed property (vehicles), or amortization. Trucks, equipment, and tools bought this year go here.

**What the engine computes.** The section 179 limits and limitation (lines 1-13), first-year MACRS deductions for the Section B rows (200% or 150% declining balance with the half-year convention, mid-quarter when convention is "MQ", mid-month straight line for real property) from the basis and month placed in service, listed property depreciation and totals (lines 26-29), vehicle total miles, Part IV totals, and Part VI totals.

**What it does not do.** Prior-year assets (line 17) are supplied; the engine does not keep a depreciation schedule. Luxury automobile limits, the mid-quarter test (40% of basis in the last quarter), bonus depreciation elections, and section 179 recapture are not applied automatically; supply line 14 and check the limits in the instructions.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const p = params(ctx.year).section179;
    const s179Rows = c.list("section179_property");
    const listed = c.list("listed_property");
    const listed50 = c.list("listed_property_50_or_less");
    const rowMoney = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

    // Part V first (lines 26-29 feed lines 7 and 21).
    const outListed = listed.map((r) => {
      const pct = rowMoney(r, "business_pct") || 100;
      const cost = rowMoney(r, "cost");
      const basis = r["basis"] !== undefined && r["basis"] !== "" ? rowMoney(r, "basis") : Math.round((cost * pct) / 100);
      const recovery = Number(r["recovery"] ?? 5) || 5;
      const conv = String(r["convention"] ?? "HY").toUpperCase() === "MQ" ? "MQ" : "HY";
      const pctFirst = firstYearPct(recovery, conv, monthOf(r["date"]), false);
      const dep = r["depreciation"] !== undefined && r["depreciation"] !== "" ? rowMoney(r, "depreciation") : Math.round(Math.max(0, basis - rowMoney(r, "section179")) * pctFirst / 100);
      return { ...r, basis, recovery: String(recovery), method: `${METHOD[recovery] ?? "200DB"}/${conv}`, depreciation: dep };
    });
    const outListed50 = listed50.map((r) => {
      const pct = rowMoney(r, "business_pct") || 50;
      const cost = rowMoney(r, "cost");
      const basis = r["basis"] !== undefined && r["basis"] !== "" ? rowMoney(r, "basis") : Math.round((cost * pct) / 100);
      const recovery = Number(r["recovery"] ?? 5) || 5;
      const dep = r["depreciation"] !== undefined && r["depreciation"] !== "" ? rowMoney(r, "depreciation") : Math.round(basis / recovery / 2);
      return { ...r, basis, recovery: String(recovery), method: "S/L", depreciation: dep };
    });
    c.out["listed_property"] = outListed;
    c.out["listed_property_50_or_less"] = outListed50;
    const l28 = c.set("line28", outListed.reduce((a, r) => a + rowMoney(r, "depreciation"), 0) + outListed50.reduce((a, r) => a + rowMoney(r, "depreciation"), 0), "Listed property depreciation", "sum of column (h), lines 26 and 27", "28");
    const l29 = c.set("line29", outListed.reduce((a, r) => a + rowMoney(r, "section179"), 0), "Listed property section 179", "sum of column (i), line 26", "29");

    // Part I
    c.set("line1", p.max, "Maximum section 179 amount", `${ctx.year} limit`, "1");
    const costs = s179Rows.reduce((a, r) => a + rowMoney(r, "cost"), 0) + outListed.reduce((a, r) => a + (rowMoney(r, "section179") > 0 ? rowMoney(r, "cost") : 0), 0);
    const l2 = c.has("line2") ? c.n("line2") : costs;
    c.out["line2"] = l2;
    c.set("line3", p.threshold, "Threshold cost", `${ctx.year} threshold`, "3");
    const l4 = c.set("line4", Math.max(0, l2 - p.threshold), "Reduction in limitation", `max(0, ${f(l2)} - ${f(p.threshold)})`, "4");
    const l5 = c.set("line5", Math.max(0, p.max - l4), "Dollar limitation", `max(0, ${f(p.max)} - ${f(l4)})`, "5");
    const l7 = c.set("line7", l29, "Listed property elected cost", `line 29 ${f(l29)}`, "7");
    const elected = s179Rows.reduce((a, r) => a + rowMoney(r, "elected"), 0);
    const l8 = c.set("line8", elected + l7, "Total elected cost", `line 6 ${f(elected)} + line 7 ${f(l7)}`, "8");
    const l9 = c.set("line9", Math.min(l5, l8), "Tentative deduction", `min(${f(l5)}, ${f(l8)})`, "9");
    const l10 = c.n("line10");
    const l11 = c.has("line11") ? c.n("line11") : l5;
    if (!c.has("line11") && l9 + l10 > 0) c.warn("line11 (business income limitation) was not supplied; the section 179 deduction is not limited by business income here.");
    c.out["line11"] = l11;
    const l12 = c.set("line12", Math.min(l9 + l10, Math.max(0, l11)), "Section 179 expense deduction", `min(${f(l9)} + ${f(l10)}, ${f(l11)})`, "12");
    c.set("line13", l9 + l10 - l12, "Carryover of disallowed deduction", `${f(l9)} + ${f(l10)} - ${f(l12)}`, "13");

    // Part III Section B/C rows
    let gds = 0;
    for (const spec of [...GDS_ROWS, ...ADS_ROWS]) {
      if (spec.years && !spec.years.includes(ctx.year)) continue;
      const basis = c.n(`${spec.id}_c`);
      if (basis <= 0) continue;
      const month = monthOf(c.str(`${spec.id}_b`));
      const recovery = spec.recovery || Number(c.str(`${spec.id}_d`)) || 0;
      const conv = c.str(`${spec.id}_e`).toUpperCase() === "MQ" ? "MQ" : spec.real ? "MM" : "HY";
      const ads = spec.id.startsWith("ads_");
      let pct: number;
      if (ads) pct = recovery > 0 ? (spec.real ? ((12.5 - (month ?? 1)) / 12 / recovery) * 100 : (100 / recovery) / 2) : 0;
      else pct = recovery > 0 ? firstYearPct(recovery, conv, month, spec.real) : 0;
      const dep = Math.round((basis * pct) / 100);
      c.out[`${spec.id}_d`] = recovery ? (spec.real && recovery !== 50 ? `${recovery} yrs.` : `${recovery} yrs.`) : "";
      c.out[`${spec.id}_e`] = conv;
      c.out[`${spec.id}_f`] = ads || spec.real || recovery === 25 ? "S/L" : (METHOD[recovery] ?? "200DB");
      c.set(`${spec.id}_g`, dep, `${spec.label} depreciation`, `${f(basis)} x ${pct.toFixed(3)}% (${conv}${month ? `, month ${month}` : ""})`, spec.label.split(" ")[0]);
      gds += dep;
    }

    // Part IV
    const l21 = c.set("line21", l28, "Listed property", `line 28 ${f(l28)}`, "21");
    const l22 = c.set("line22", l12 + c.n("line14") + c.n("line15") + c.n("line16") + c.n("line17") + gds + l21, "Total depreciation", `12 ${f(l12)} + 14 ${f(c.n("line14"))} + 15 ${f(c.n("line15"))} + 16 ${f(c.n("line16"))} + 17 ${f(c.n("line17"))} + lines 19/20 ${f(gds)} + 21 ${f(l21)}`, "22");
    void l22;

    // Vehicles
    const veh = c.list("vehicles").map((r) => ({ ...r, total_miles: rowMoney(r, "business_miles") + rowMoney(r, "commuting_miles") + rowMoney(r, "other_miles") }));
    if (veh.length) c.out["vehicles"] = veh;
    if (veh.length > 6) c.warn("More than six vehicles: attach additional Forms 4562.");
    if (listed.some((r) => /vehicle|truck|car|van|suv|auto/i.test(String(r["type"] ?? ""))) && !c.has("line24a_evidence")) c.warn("Listed vehicles are reported: answer line24a_evidence and line24b_written.");

    // Part VI
    const am = c.list("amortization").map((r) => {
      const amount = rowMoney(r, "amount");
      const period = Number(String(r["period"] ?? "").replace(/[^\d.]/g, "")) || 0;
      const a = r["amortization"] !== undefined && r["amortization"] !== "" ? rowMoney(r, "amortization") : period > 0 ? Math.round(amount / period) : 0;
      return { ...r, amortization: a };
    });
    if (am.length) c.out["amortization"] = am;
    c.set("line44", am.reduce((a, r) => a + rowMoney(r, "amortization"), 0) + c.n("line43"), "Total amortization", `line 42 + line 43 ${f(c.n("line43"))}`, "44");
    return c.result();
  },
};
