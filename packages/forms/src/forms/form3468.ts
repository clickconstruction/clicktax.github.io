import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";
import { NAMES_2024 } from "./form3468.names.ts";

/** Page 1 was relaid out for 2025; these widgets changed names (the rest of page 1 kept its names). */
const PAGE1_2024: Record<string, string> = {
  "Page1[0].f1_1[0]": "Page1[0].f1_01[0]", "Page1[0].f1_2[0]": "Page1[0].f1_02[0]", "Page1[0].f1_3[0]": "Page1[0].f1_03[0]", "Page1[0].f1_4[0]": "Page1[0].f1_04[0]", "Page1[0].f1_5[0]": "Page1[0].f1_05[0]",
  "Page1[0].f1_7[0]": "Page1[0].f1_06[0]", "Page1[0].f1_8[0]": "Page1[0].f1_07[0]", "Page1[0].f1_9[0]": "Page1[0].f1_08[0]", "Page1[0].f1_10[0]": "Page1[0].f1_09[0]",
};
const ONLY_2025 = new Set(["Page1[0].c1_1[1]", "Page1[0].f1_6[0]"]);
type Names = Partial<Record<TaxYear, string>>;
const N = (name: string): { names: Names } => (ONLY_2025.has(name) ? { names: { 2025: name } } : { names: { 2025: name, 2024: PAGE1_2024[name] ?? NAMES_2024[name] ?? name } });
const yn = (name: string) => ({ yes: N(`${name}[0]`), no: N(`${name}[1]`) });
const choice = (letters: string[], name: string) => Object.fromEntries(letters.map((l, i) => [l, N(`${name}[${i}]`)]));

const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: N(name), ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });
const pct = (id: string, line: string, label: string, name: string): FieldDef => ({ id, line, label: `${label} (enter as a percent, for example 30 or 6)`, type: "percent", locate: N(name) });
const text = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "text", locate: N(name), ...extra });
const check = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "checkbox", locate: N(name), ...extra });

/** A property block: basis, applicable percentage, product, domestic content bonus, energy community bonus, and the block total. */
interface Simple { p: string; title: string; lines: [string, string, string, string, string, string, string]; total: string; names: [string, string, string, string, string, string, string, string] }
const SIMPLE: Simple[] = [
  { p: "p5", title: "Part V, clean electricity facility (line 3)", lines: ["3a", "3b", "3c", "3d", "3e", "3f", "3g"], total: "4", names: ["Page4[0].Line3a_ReadOrder[0].f4_1[0]", "Page4[0].f4_2[0]", "Page4[0].f4_3[0]", "Page4[0].Line3d_ReadOrder[0].f4_4[0]", "Page4[0].f4_5[0]", "Page4[0].Line3f_ReadOrder[0].f4_6[0]", "Page4[0].f4_7[0]", "Page4[0].f4_15[0]"] },
  { p: "p6", title: "Part VI, geothermal energy property (line 1)", lines: ["1a", "1b", "1c", "1d", "1e", "1f", "1g"], total: "2", names: ["Page5[0].Line1a_ReadOrder[0].f5_1[0]", "Page5[0].f5_2[0]", "Page5[0].f5_3[0]", "Page5[0].Line1d_ReadOrder[0].f5_4[0]", "Page5[0].f5_5[0]", "Page5[0].Line1f_ReadOrder[0].f5_6[0]", "Page5[0].f5_7[0]", "Page5[0].f5_8[0]"] },
  { p: "p6", title: "Part VI, waste energy recovery property (line 13)", lines: ["13a", "13b", "13c", "13d", "13e", "13f", "13g"], total: "14", names: ["Page8[0].Line13a_ReadOrder[0].f8_1[0]", "Page8[0].f8_2[0]", "Page8[0].f8_3[0]", "Page8[0].Line13d_ReadOrder[0].f8_4[0]", "Page8[0].f8_5[0]", "Page8[0].Line13f_ReadOrder[0].f8_6[0]", "Page8[0].f8_7[0]", "Page8[0].f8_8[0]"] },
  { p: "p6", title: "Part VI, geothermal heat pump systems (line 15)", lines: ["15a", "15b", "15c", "15d", "15e", "15f", "15g"], total: "16", names: ["Page8[0].Line15a_ReadOrder[0].f8_9[0]", "Page8[0].f8_10[0]", "Page8[0].f8_11[0]", "Page8[0].Line15d_ReadOrder[0].f8_12[0]", "Page8[0].f8_13[0]", "Page8[0].Line15f_ReadOrder[0].f8_14[0]", "Page8[0].f8_15[0]", "Page8[0].f8_16[0]"] },
  { p: "p6", title: "Part VI, qualified biogas property (line 19)", lines: ["19a", "19b", "19c", "19d", "19e", "19f", "19g"], total: "20", names: ["Page9[0].Line19a_ReadOrder[0].f9_16[0]", "Page9[0].f9_17[0]", "Page9[0].f9_18[0]", "Page9[0].Line19d_ReadOrder[0].f9_19[0]", "Page9[0].f9_20[0]", "Page9[0].Line19f_ReadOrder[0].f9_21[0]", "Page9[0].f9_22[0]", "Page9[0].f9_23[0]"] },
  { p: "p6", title: "Part VI, microgrid controllers (line 21)", lines: ["21a", "21b", "21c", "21d", "21e", "21f", "21g"], total: "22", names: ["Page10[0].Line21a_ReadOrder[0].f10_1[0]", "Page10[0].f10_2[0]", "Page10[0].f10_3[0]", "Page10[0].Line21d_ReadOrder[0].f10_4[0]", "Page10[0].f10_5[0]", "Page10[0].Line21f_ReadOrder[0].f10_6[0]", "Page10[0].f10_7[0]", "Page10[0].f10_8[0]"] },
];
/** A block with the low-income communities bonus: basis, %, product, bonus %, capacity allocated, j (full bonus), k (ratio), l, m, n, then domestic content and energy community, and the total. */
interface LowIncome { p: string; title: string; lines: string[]; total: string; names: string[]; order: "li-first" | "li-last" }
const LOW_INCOME: LowIncome[] = [
  { p: "p5", title: "Part V, clean electricity property (line 1)", lines: ["1a", "1b", "1c", "1d", "1e", "1f", "1g", "1h", "1i", "1j", "1k", "1l", "1m", "1n"], total: "2", order: "li-last", names: ["Page3[0].Line1a_Part5_ReadOrder[0].f3_12[0]", "Page3[0].f3_13[0]", "Page3[0].f3_14[0]", "Page3[0].Line1d_ReadOrder[0].f3_15[0]", "Page3[0].f3_16[0]", "Page3[0].Line1f_ReadOnly[0].f3_17[0]", "Page3[0].f3_18[0]", "Page3[0].Line1h_ReadOnly[0].f3_19[0]", "Page3[0].f3_20[0]", "Page3[0].f3_21[0]", "Page3[0].f3_22[0]", "Page3[0].f3_23[0]", "Page3[0].f3_24[0]", "Page3[0].f3_25[0]", "Page3[0].f3_26[0]"] },
  { p: "p6", title: "Part VI, solar energy property (line 3)", lines: ["3a", "3b", "3c", "3d", "3e", "3f", "3g", "3h", "3i", "3j", "3k", "3l", "3m", "3n"], total: "4", order: "li-first", names: ["Page5[0].Line3a_ReadOrder[0].f5_9[0]", "Page5[0].f5_10[0]", "Page5[0].f5_11[0]", "Page5[0].f5_12[0]", "Page5[0].f5_13[0]", "Page5[0].f5_14[0]", "Page5[0].f5_15[0]", "Page5[0].f5_16[0]", "Page5[0].f5_17[0]", "Page5[0].f5_18[0]", "Page5[0].Line3k_ReadOrder[0].f5_19[0]", "Page5[0].f5_20[0]", "Page5[0].Line3m_ReadOrder[0].f5_21[0]", "Page5[0].f5_22[0]", "Page5[0].f5_23[0]"] },
  { p: "p6", title: "Part VI, qualified small wind energy property (line 11)", lines: ["11d", "11e", "11f", "11g", "11h", "11i", "11j", "11k", "11l", "11m", "11n", "11o", "11p", "11q"], total: "12", order: "li-first", names: ["Page7[0].Line11d_ReadOrder[0].f7_15[0]", "Page7[0].f7_16[0]", "Page7[0].f7_17[0]", "Page7[0].Line11g_ReadOrder[0].f7_18[0]", "Page7[0].f7_19[0]", "Page7[0].f7_20[0]", "Page7[0].f7_21[0]", "Page7[0].f7_22[0]", "Page7[0].f7_23[0]", "Page7[0].f7_24[0]", "Page7[0].Line11n_ReadOrder[0].f7_25[0]", "Page7[0].f7_26[0]", "Page7[0].Line11p_ReadOrder[0].f7_27[0]", "Page7[0].f7_28[0]", "Page7[0].f7_29[0]"] },
  { p: "p6", title: "Part VI, energy storage technology (line 17)", lines: ["17a", "17b", "17c", "17d", "17e", "17f", "17g", "17h", "17i", "17j", "17k", "17l", "17m", "17n"], total: "18", order: "li-first", names: ["Page9[0].Line17a_ReadOrder[0].f9_1[0]", "Page9[0].f9_2[0]", "Page9[0].f9_3[0]", "Page9[0].f9_4[0]", "Page9[0].f9_5[0]", "Page9[0].f9_6[0]", "Page9[0].f9_7[0]", "Page9[0].f9_8[0]", "Page9[0].f9_9[0]", "Page9[0].f9_10[0]", "Page9[0].Line17k_ReadOrder[0].f9_11[0]", "Page9[0].f9_12[0]", "Page9[0].Line17m_ReadOrder[0].f9_13[0]", "Page9[0].f9_14[0]", "Page9[0].f9_15[0]"] },
  { p: "p6", title: "Part VI, investment credit facility property (line 23)", lines: ["23a", "23b", "23c", "23d", "23e", "23f", "23g", "23h", "23i", "23j", "23k", "23l", "23m", "23n"], total: "24", order: "li-first", names: ["Page10[0].Line23a_ReadOrder[0].f10_9[0]", "Page10[0].f10_10[0]", "Page10[0].f10_11[0]", "Page10[0].f10_12[0]", "Page10[0].f10_13[0]", "Page10[0].f10_14[0]", "Page10[0].f10_15[0]", "Page10[0].f10_16[0]", "Page10[0].f10_17[0]", "Page10[0].f10_18[0]", "Page10[0].Line23k_ReadOrder[0].f10_19[0]", "Page10[0].f10_20[0]", "Page10[0].Line23m_ReadOrder[0].f10_21[0]", "Page10[0].f10_22[0]", "Page10[0].f10_23[0]"] },
];
const id = (p: string, line: string) => `${p}_line${line}`;
const simpleFields = (b: Simple): FieldDef[] => {
  const [a, bb, c, d, e, g, h] = b.lines; const n = b.names;
  return [
    money(id(b.p, a), a, `${b.title}: basis of the property placed in service during the tax year`, n[0]),
    pct(id(b.p, bb), bb, `${b.title}: applicable percentage (30% with prevailing wage and apprenticeship or under 1 MW, otherwise 6%)`, n[1]),
    comp(id(b.p, c), c, `${b.title}: line ${a} times line ${bb}`, n[2], `${a} x ${bb}`),
    pct(id(b.p, d), d, `${b.title}: domestic content bonus percentage (10% or 2%)`, n[3]),
    comp(id(b.p, e), e, `${b.title}: line ${a} times line ${d}`, n[4], `${a} x ${d}`),
    pct(id(b.p, g), g, `${b.title}: energy community bonus percentage (10% or 2%)`, n[5]),
    comp(id(b.p, h), h, `${b.title}: line ${a} times line ${g}`, n[6], `${a} x ${g}`),
    comp(id(b.p, b.total), b.total, `${b.title}: add lines ${c}, ${e}, and ${h}`, n[7], `${c} + ${e} + ${h}`),
  ];
};
const lowIncomeFields = (b: LowIncome): FieldDef[] => {
  const L = b.lines; const n = b.names;
  const li = b.order === "li-last" ? [7, 8, 9, 10, 11, 12, 13] : [3, 4, 5, 6, 7, 8, 9];
  const dc = b.order === "li-last" ? [3, 4] : [10, 11];
  const ec = b.order === "li-last" ? [5, 6] : [12, 13];
  const F = (i: number, make: (line: string, name: string) => FieldDef) => make(L[i]!, n[i]!);
  return [
    F(0, (l, nm) => money(id(b.p, l), l, `${b.title}: basis of the property placed in service during the tax year`, nm)),
    F(1, (l, nm) => pct(id(b.p, l), l, `${b.title}: applicable percentage (30% with prevailing wage and apprenticeship or under 1 MW, otherwise 6%)`, nm)),
    F(2, (l, nm) => comp(id(b.p, l), l, `${b.title}: line ${L[0]} times line ${L[1]}`, nm, `${L[0]} x ${L[1]}`)),
    F(li[0]!, (l, nm) => pct(id(b.p, l), l, `${b.title}: low-income communities bonus percentage (10% or 20%); leave blank if not allocated`, nm)),
    F(li[1]!, (l, nm) => ({ id: id(b.p, l), line: l, label: `${b.title}: capacity limitation allocated in the allocation letter (kW)`, type: "text", maxLen: 12, locate: N(nm) })),
    F(li[2]!, (l, nm) => comp(id(b.p, l), l, `${b.title}: line ${L[0]} times line ${L[li[0]!]} when the allocation covers the whole nameplate capacity`, nm, `${L[0]} x ${L[li[0]!]} when ${L[li[1]!]} covers the nameplate capacity`)),
    F(li[3]!, (l, nm) => ({ id: id(b.p, l), line: l, label: `${b.title}: allocated capacity divided by nameplate capacity`, type: "text", computed: true, locate: N(nm) })),
    F(li[4]!, (l, nm) => ({ id: id(b.p, l), line: l, label: `${b.title}: line ${L[li[0]!]} times line ${L[li[3]!]} (percent)`, type: "text", computed: true, locate: N(nm) })),
    F(li[5]!, (l, nm) => comp(id(b.p, l), l, `${b.title}: line ${L[0]} times line ${L[li[4]!]}`, nm, `${L[0]} x ${L[li[4]!]}`)),
    F(li[6]!, (l, nm) => comp(id(b.p, l), l, `${b.title}: low-income bonus credit (line ${L[0]} times line ${L[li[2]!]}, or line ${L[li[5]!]})`, nm, "bonus credit")),
    F(dc[0]!, (l, nm) => pct(id(b.p, l), l, `${b.title}: domestic content bonus percentage (10% or 2%)`, nm)),
    F(dc[1]!, (l, nm) => comp(id(b.p, l), l, `${b.title}: line ${L[0]} times line ${L[dc[0]!]}`, nm, `${L[0]} x ${L[dc[0]!]}`)),
    F(ec[0]!, (l, nm) => pct(id(b.p, l), l, `${b.title}: energy community bonus percentage (10% or 2%)`, nm)),
    F(ec[1]!, (l, nm) => comp(id(b.p, l), l, `${b.title}: line ${L[0]} times line ${L[ec[0]!]}`, nm, `${L[0]} x ${L[ec[0]!]}`)),
    comp(id(b.p, b.total), b.total, `${b.title}: add lines ${L[2]}, ${L[li[6]!]}, ${L[dc[1]!]}, and ${L[ec[1]!]}`, n[14]!, "block total"),
  ];
};

const fields: FieldDef[] = [
  text("name", "", "Name(s) shown on return", "Page1[0].f1_1[0]"),
  text("ssn", "", "Identifying number", "Page1[0].f1_2[0]", { maxLen: 11 }),
  text("line1", "1", "IRS-issued registration number for the facility (elective payment or transfer election)", "Page1[0].f1_3[0]"),
  text("line2a_i", "2a(i)", "Facility's emissions value or rate (kg of CO2e per kg of qualified clean hydrogen)", "Page1[0].f1_4[0]"),
  text("line2a_ii", "2a(ii)", "Department of Energy (DOE) control number, if applicable", "Page1[0].f1_5[0]"),
  check("line2b_doe", "2b(i)", "Provisional emissions rate: an emissions value was received from the DOE (2024: petitioned for a provisional emissions rate)", "Page1[0].c1_1[0]"),
  check("line2b_lca", "2b(ii)", "Provisional emissions rate: a designated lifecycle analysis model was used", "Page1[0].c1_1[1]", { years: [2025] }),
  text("line2b_iii", "2b(iii)", "DOE control number for the provisional emissions rate, if applicable", "Page1[0].f1_6[0]", { years: [2025] }),
  text("line3a", "3a", "Type of property (solar, clean hydrogen, rehabilitation, etc.)", "Page1[0].f1_7[0]"),
  text("line3b_name", "3b(i)", "Owner's name, if different from the filer", "Page1[0].f1_8[0]"),
  text("line3b_tin", "3b(ii)", "Owner's TIN", "Page1[0].f1_9[0]", { maxLen: 11 }),
  text("line3c", "3c", "Address of the facility (if applicable)", "Page1[0].f1_10[0]"),
  { id: "line3c_2", line: "3c", label: "Address of the facility, second line", type: "text", years: [2024], locate: { names: { 2024: "Page1[0].f1_10[0]" } } },
  text("latitude_sign", "3d(i)", "Latitude sign (+ or -)", "Page1[0].Latitude_CombFields[0].f1_11[0]", { maxLen: 1 }),
  text("latitude_degrees", "3d(i)", "Latitude degrees (whole number)", "Page1[0].Latitude_CombFields[0].f1_12[0]", { maxLen: 2 }),
  text("latitude_decimals", "3d(i)", "Latitude decimals (up to 6 digits)", "Page1[0].Latitude_CombFields[0].f1_13[0]", { maxLen: 6 }),
  text("longitude_sign", "3d(ii)", "Longitude sign (+ or -)", "Page1[0].Longitude_CombFields[0].f1_14[0]", { maxLen: 1 }),
  text("longitude_degrees", "3d(ii)", "Longitude degrees (whole number)", "Page1[0].Longitude_CombFields[0].f1_15[0]", { maxLen: 3 }),
  text("longitude_decimals", "3d(ii)", "Longitude decimals (up to 6 digits)", "Page1[0].Longitude_CombFields[0].f1_16[0]", { maxLen: 6 }),
  check("line3e", "3e", "The property includes qualified interconnection property", "Page1[0].c1_2[0]"),
  text("line4", "4", "Date construction began (MM/DD/YYYY)", "Page1[0].f1_17[0]", { maxLen: 10 }),
  text("line5", "5", "Date placed in service (MM/DD/YYYY)", "Page1[0].f1_18[0]", { maxLen: 10 }),
  { id: "line6", line: "6", label: "Is the facility an expansion of an existing facility?", type: "yesno", locate: yn("Page1[0].c1_3") },
  { id: "line7", line: "7", label: "Net output under 1 MW ac or equivalent thermal energy: \"a\" yes, \"b\" no, \"c\" not applicable (does not produce electricity)", type: "choice", choices: ["a", "b", "c"], locate: choice(["a", "b", "c"], "Page1[0].c1_4") },
  { id: "line8", line: "8", label: "Prevailing wage and apprenticeship requirements: \"a\" yes under sections 48C(e)(5) and (6), \"b\" yes under the beginning-of-construction or other exception, \"c\" no, \"d\" not applicable", type: "choice", choices: ["a", "b", "c", "d"], locate: choice(["a", "b", "c", "d"], "Page1[0].c1_5") },
  { id: "line9", line: "9", label: "Domestic content bonus: \"a\" yes with the wage requirement satisfied (10%), \"b\" yes without it (2%), \"c\" no", type: "choice", choices: ["a", "b", "c"], locate: choice(["a", "b", "c"], "Page1[0].c1_6") },
  { id: "line10", line: "10", label: "Energy community bonus: \"a\" yes with the wage requirement satisfied (10%), \"b\" yes without it (2%), \"c\" no", type: "choice", choices: ["a", "b", "c"], locate: choice(["a", "b", "c"], "Page1[0].c1_7") },
  { id: "line11", line: "11", label: "Low-income communities bonus: \"a\" low-income community (10%), \"b\" Indian land (10%), \"c\" low-income residential building project (20%), \"d\" low-income economic benefit project (20%), \"g\" no", type: "choice", choices: ["a", "b", "c", "d", "g"], locate: choice(["a", "b", "c", "d", "g"], "Page1[0].c1_8") },
  text("line11e", "11e", "Control number from the low-income communities allocation letter", "Page1[0].f1_19[0]"),
  text("line11f", "11f", "Originating pass-through entity's EIN (if applicable)", "Page1[0].f1_20[0]", { maxLen: 10 }),
  check("line12a", "12a", "Nameplate capacity: solar", "Page2[0].c2_1[0]"),
  text("line12a_i", "12a(i)", "Solar nameplate capacity (kW dc)", "Page2[0].f2_1[0]"),
  text("line12a_ii", "12a(ii)", "Solar nameplate capacity (kW ac)", "Page2[0].f2_2[0]"),
  check("line12a_storage", "12a", "The solar property includes energy storage", "Page2[0].c2_2[0]"),
  check("line12b", "12b", "Nameplate capacity: wind", "Page2[0].c2_3[0]"),
  text("line12b_capacity", "12b", "Wind nameplate capacity (kW ac)", "Page2[0].f2_3[0]"),
  check("line12c", "12c", "Nameplate capacity: other", "Page2[0].c2_4[0]"),
  text("line12c_type", "12c(i)", "Other property type", "Page2[0].f2_4[0]"),
  text("line12c_capacity", "12c(ii)", "Other nameplate capacity (kW)", "Page2[0].f2_5[0]"),
  { id: "line12c_kw", line: "12c(iii)", label: "Kilowatt type for the other property: \"dc\" or \"ac\"", type: "choice", choices: ["dc", "ac"], locate: choice(["dc", "ac"], "Page2[0].c2_5") },
  check("line12d", "12d", "Energy storage", "Page2[0].c2_6[0]"),
  text("line12d_power", "12d(i)", "Energy storage power capacity rating (kW)", "Page2[0].f2_6[0]"),
  text("line12d_energy", "12d(ii)", "Energy storage capacity (kWh)", "Page2[0].f2_7[0]"),
  { id: "line12d_connected", line: "12d(iii)", label: "Is the energy storage installed in connection with the solar or wind property?", type: "yesno", locate: yn("Page2[0].c2_7") },
  check("line12e", "12e", "Nameplate capacity: not applicable", "Page2[0].c2_8[0]"),
  { id: "line13", line: "13", label: "Are you claiming the credit as a lessee under a section 48(d) election?", type: "yesno", locate: yn("Page2[0].c2_9") },
  text("line13a", "13a", "Name of lessor", "Page2[0].f2_8[0]"),
  text("line13b", "13b", "Address of lessor", "Page2[0].f2_9[0]"),
  text("line13c", "13c", "Description of the leased property", "Page2[0].f2_10[0]"),
  money("line13d", "13d", "Amount for which you were treated as having acquired the property", "Page2[0].f2_11[0]"),
  money("line13e", "13e", "Income inclusion amount reported for the tax year under Regulations section 1.50-1", "Page2[0].f2_12[0]"),
  // Part II: qualifying advanced coal and gasification projects.
  money("p2_line1a", "1a", "Part II: qualified investment in integrated gasification combined cycle property (section 48A(d)(3)(B)(i))", "Page2[0].Line1a_ReadOrder[0].f2_13[0]"),
  comp("p2_line1b", "1b", "Part II: line 1a times 20%", "Page2[0].f2_14[0]", "1a x 20%"),
  money("p2_line2a", "2a", "Part II: qualified investment in advanced coal-based generation technology property (section 48A(d)(3)(B)(ii))", "Page2[0].Line2a_ReadOrder[0].f2_15[0]"),
  comp("p2_line2b", "2b", "Part II: line 2a times 15%", "Page2[0].f2_16[0]", "2a x 15%"),
  money("p2_line3a", "3a", "Part II: qualified investment in advanced coal-based generation technology property (section 48A(d)(3)(B)(iii))", "Page2[0].Line3a_ReadOrder[0].f2_17[0]"),
  comp("p2_line3b", "3b", "Part II: line 3a times 30%", "Page2[0].f2_18[0]", "3a x 30%"),
  money("p2_line4a", "4a", "Part II: qualified investment in qualified gasification property with carbon capture (section 48B)", "Page2[0].Line4a_ReadOrder[0].f2_19[0]"),
  comp("p2_line4b", "4b", "Part II: line 4a times 30%", "Page2[0].f2_20[0]", "4a x 30%"),
  money("p2_line5a", "5a", "Part II: qualified investment in other qualified gasification property", "Page2[0].Line5a_ReadOrder[0].f2_21[0]"),
  comp("p2_line5b", "5b", "Part II: line 5a times 20%", "Page2[0].f2_22[0]", "5a x 20%"),
  money("p2_line6", "6", "Part II: applicable unused investment credit from cooperatives", "Page2[0].f2_23[0]"),
  comp("p2_line7", "7", "Part II total: to Form 3800 Part III line 1a", "Page2[0].f2_24[0]", "1b + 2b + 3b + 4b + 5b + 6"),
  // Part III: qualifying advanced energy project (48C).
  money("p3_line1a", "1a", "Part III: qualified investment in advanced energy project property placed in service during the tax year", "Page3[0].Line1a_Part3_ReadOrder[0].f3_1[0]"),
  pct("p3_line1b", "1b", "Part III: applicable percentage (30%, or 6% when Part I line 8c is checked)", "Page3[0].f3_2[0]"),
  comp("p3_line1c", "1c", "Part III: line 1a times line 1b", "Page3[0].f3_3[0]", "1a x 1b"),
  text("p3_line1d", "1d", "Part III: section 48C allocation control number", "Page3[0].f3_4[0]"),
  { id: "p3_line1e", line: "1e", label: "Part III: is the facility in a section 48C energy community census tract?", type: "yesno", locate: yn("Page3[0].c3_1") },
  text("p3_line1f", "1f", "Part III: originating pass-through entity's EIN (if applicable)", "Page3[0].f3_5[0]", { maxLen: 10 }),
  money("p3_line2", "2", "Part III: applicable unused investment credit from cooperatives", "Page3[0].f3_6[0]"),
  comp("p3_line3", "3", "Part III total: to Form 3800 Part III line 1d", "Page3[0].f3_7[0]", "1c + 2"),
  // Part IV: advanced manufacturing investment credit (48D).
  { id: "p4_line1a", line: "1a", label: "Part IV: the box that applies to the advanced manufacturing facility: \"i\" or \"ii\" (see the form)", type: "choice", choices: ["i", "ii"], locate: choice(["i", "ii"], "Page3[0].Line1a_Part4_ReadOrder[0].c3_2") },
  money("p4_line1b", "1b", "Part IV: qualified investment in advanced manufacturing facility property placed in service during the tax year", "Page3[0].f3_8[0]"),
  { id: "p4_rate", label: "Part IV: credit rate (25%, or 35% for property placed in service after 2025); defaults to 25", type: "percent", noPdf: true },
  comp("p4_line1c", "1c", "Part IV: line 1b times the credit rate", "Page3[0].f3_9[0]", "1b x 25% (or 35%)"),
  money("p4_line2", "2", "Part IV: applicable unused investment credit from cooperatives", "Page3[0].f3_10[0]"),
  comp("p4_line3", "3", "Part IV total: to Form 3800 Part III line 1o", "Page3[0].f3_11[0]", "1c + 2"),
  // Part V: clean electricity investment credit (48E).
  ...lowIncomeFields(LOW_INCOME[0]!),
  ...simpleFields(SIMPLE[0]!),
  comp("p5_line5", "5", "Part V: add lines 2 and 4", "Page4[0].f4_16[0]", "2 + 4"),
  { id: "p5_line6a", line: "6a", label: "Part V: ratio of subsidized energy financing or private activity bond proceeds to the aggregate basis (decimal, for example 0.25)", type: "text", maxLen: 8, locate: N("Page4[0].f4_17[0]") },
  comp("p5_line6b", "6b", "Part V: line 5 times line 6a", "Page4[0].f4_18[0]", "5 x 6a"),
  comp("p5_line6c", "6c", "Part V: line 5 times 15%", "Page4[0].f4_19[0]", "5 x 15%"),
  comp("p5_line6d", "6d", "Part V: smaller of line 6b or 6c", "Page4[0].f4_20[0]", "min(6b, 6c)"),
  comp("p5_line6e", "6e", "Part V: line 5 minus line 6d", "Page4[0].f4_21[0]", "5 - 6d"),
  comp("p5_line7", "7", "Part V: line 6e when line 6a applies, otherwise line 5", "Page4[0].f4_22[0]", "6e or 5"),
  { id: "p5_line8_pct", label: "Part V line 8: percentage kept under the elective payment domestic content phaseout (100, 90, 85, or 0); defaults to 100", type: "percent", noPdf: true },
  comp("p5_line8", "8", "Part V: line 7 times the line 8 percentage", "Page4[0].f4_23[0]", "7 x percentage"),
  money("p5_line10", "10", "Part V: applicable unused investment credit from cooperatives", "Page4[0].f4_25[0]"),
  comp("p5_line11", "11", "Part V total: to Form 3800 Part III line 1v", "Page4[0].f4_26[0]", "8 + 10"),
  // Part VI: energy credit (48).
  ...simpleFields(SIMPLE[1]!),
  ...lowIncomeFields(LOW_INCOME[1]!),
  money("p6_line5a", "5a", "Part VI, fuel cell property: basis of property placed in service during the tax year that was acquired after October 3, 2008 and before 2023 (reduced by any pre-October 4, 2008 basis)", "Page6[0].Line5a_ReadOrder[0].f6_1[0]"),
  comp("p6_line5b", "5b", "Part VI, fuel cell: line 5a times 30%", "Page6[0].f6_2[0]", "5a x 30%"),
  { id: "p6_line5c", line: "5c", label: "Part VI, fuel cell: kilowatt capacity of the line 5a property", type: "integer", locate: N("Page6[0].f6_3[0]") },
  comp("p6_line5d", "5d", "Part VI, fuel cell: line 5c times $1,000", "Page6[0].f6_4[0]", "5c x 1,000"),
  comp("p6_line5e", "5e", "Part VI, fuel cell: smaller of line 5b or 5d", "Page6[0].f6_5[0]", "min(5b, 5d)"),
  money("p6_line5f", "5f", "Part VI, fuel cell: basis of property placed in service during the tax year attributable to construction after 2022", "Page6[0].Line5f_ReadOrder[0].f6_6[0]"),
  pct("p6_line5g", "5g", "Part VI, fuel cell: applicable percentage (30% or 6%)", "Page6[0].f6_7[0]"),
  comp("p6_line5h", "5h", "Part VI, fuel cell: line 5f times line 5g", "Page6[0].f6_8[0]", "5f x 5g"),
  pct("p6_line5i", "5i", "Part VI, fuel cell: domestic content bonus percentage (10% or 2%)", "Page6[0].f6_9[0]"),
  comp("p6_line5j", "5j", "Part VI, fuel cell: line 5f times line 5i", "Page6[0].f6_10[0]", "5f x 5i"),
  pct("p6_line5l", "5l", "Part VI, fuel cell: energy community bonus percentage (10% or 2%)", "Page6[0].Line5l_ReadOrder[0].f6_12[0]"),
  comp("p6_line5m", "5m", "Part VI, fuel cell: line 5f times line 5l", "Page6[0].f6_13[0]", "5f x 5l"),
  comp("p6_line5n", "5n", "Part VI, fuel cell: add lines 5h, 5j, and 5m", "Page6[0].f6_14[0]", "5h + 5j + 5m"),
  { id: "p6_line5o", line: "5o", label: "Part VI, fuel cell: kilowatt capacity of the line 5f property", type: "integer", locate: N("Page6[0].f6_15[0]") },
  comp("p6_line5p", "5p", "Part VI, fuel cell: line 5o times $3,000", "Page6[0].f6_16[0]", "5o x 3,000"),
  comp("p6_line5q", "5q", "Part VI, fuel cell: smaller of line 5n or 5p", "Page6[0].f6_17[0]", "min(5n, 5p)"),
  comp("p6_line6", "6", "Part VI, fuel cell: add lines 5e and 5q", "Page6[0].f6_18[0]", "5e + 5q"),
  money("p6_line7a", "7a", "Part VI, microturbine property: basis of property placed in service during the tax year", "Page6[0].Line7a_ReadOrder[0].f6_19[0]"),
  pct("p6_line7b", "7b", "Part VI, microturbine: applicable percentage (10% or 2%)", "Page6[0].f6_20[0]"),
  comp("p6_line7c", "7c", "Part VI, microturbine: line 7a times line 7b", "Page6[0].f6_21[0]", "7a x 7b"),
  pct("p6_line7d", "7d", "Part VI, microturbine: domestic content bonus percentage (10% or 2%)", "Page6[0].f6_22[0]"),
  comp("p6_line7e", "7e", "Part VI, microturbine: line 7a times line 7d", "Page6[0].f6_23[0]", "7a x 7d"),
  pct("p6_line7g", "7g", "Part VI, microturbine: energy community bonus percentage (10% or 2%)", "Page6[0].Line7g_ReadOrder[0].f6_25[0]"),
  comp("p6_line7h", "7h", "Part VI, microturbine: line 7a times line 7g", "Page6[0].f6_26[0]", "7a x 7g"),
  comp("p6_line7i", "7i", "Part VI, microturbine: add lines 7c, 7e, and 7h", "Page6[0].f6_27[0]", "7c + 7e + 7h"),
  { id: "p6_line7j", line: "7j", label: "Part VI, microturbine: kilowatt capacity of the line 7a property", type: "integer", locate: N("Page6[0].Line7j_ReadOrder[0].f6_28[0]") },
  comp("p6_line7l", "7l", "Part VI, microturbine: line 7j times $200", "Page6[0].f6_30[0]", "7j x 200"),
  comp("p6_line8", "8", "Part VI, microturbine: smaller of line 7i or 7l", "Page6[0].f6_31[0]", "min(7i, 7l)"),
  money("p6_line9a", "9a", "Part VI, combined heat and power system property: basis of property placed in service during the tax year", "Page7[0].Line9a_ReadOrder[0].f7_1[0]"),
  { id: "p6_line9b", line: "9b", label: "Part VI, CHP: capacity fraction (1.0 if the capacity is 20,000 horsepower or 15 MW or less; otherwise the applicable fraction)", type: "text", maxLen: 8, locate: N("Page7[0].f7_2[0]") },
  { id: "p6_line9b_decimals", line: "9b", label: "Part VI, CHP: decimal part of the capacity fraction", type: "text", computed: true, locate: N("Page7[0].f7_3[0]") },
  comp("p6_line9c", "9c", "Part VI, CHP: line 9a times line 9b", "Page7[0].f7_4[0]", "9a x 9b"),
  pct("p6_line9d", "9d", "Part VI, CHP: applicable percentage (30% or 6%)", "Page7[0].f7_5[0]"),
  comp("p6_line9e", "9e", "Part VI, CHP: line 9c times line 9d", "Page7[0].f7_6[0]", "9c x 9d"),
  pct("p6_line9f", "9f", "Part VI, CHP: domestic content bonus percentage (10% or 2%)", "Page7[0].Line9f_ReadOrder[0].f7_7[0]"),
  comp("p6_line9g", "9g", "Part VI, CHP: line 9c times line 9f", "Page7[0].f7_8[0]", "9c x 9f"),
  pct("p6_line9h", "9h", "Part VI, CHP: energy community bonus percentage (10% or 2%)", "Page7[0].Line9h_ReadOrder[0].f7_9[0]"),
  comp("p6_line9i", "9i", "Part VI, CHP: line 9c times line 9h", "Page7[0].f7_10[0]", "9c x 9h"),
  comp("p6_line10", "10", "Part VI, CHP: add lines 9e, 9g, and 9i", "Page7[0].f7_11[0]", "9e + 9g + 9i"),
  ...lowIncomeFields(LOW_INCOME[2]!),
  ...simpleFields(SIMPLE[2]!),
  ...simpleFields(SIMPLE[3]!),
  ...lowIncomeFields(LOW_INCOME[3]!),
  ...simpleFields(SIMPLE[4]!),
  ...simpleFields(SIMPLE[5]!),
  ...lowIncomeFields(LOW_INCOME[4]!),
  money("p6_line25a", "25a", "Part VI, clean hydrogen: basis of property with a lifecycle greenhouse gas emissions rate in the section 45V(b)(2)(A) range", "Page11[0].Line25a_ReadOrder[0].f11_1[0]"),
  pct("p6_line25b", "25b", "Part VI, clean hydrogen: applicable percentage (6%, or 1.2% when Part I line 8c is checked)", "Page11[0].f11_2[0]"),
  comp("p6_line25c", "25c", "Part VI, clean hydrogen: line 25a times line 25b", "Page11[0].f11_3[0]", "25a x 25b"),
  money("p6_line25d", "25d", "Part VI, clean hydrogen: basis of property in the section 45V(b)(2)(B) range", "Page11[0].Line25d_ReadOrder[0].f11_4[0]"),
  pct("p6_line25e", "25e", "Part VI, clean hydrogen: applicable percentage (7.5% or 1.5%)", "Page11[0].f11_5[0]"),
  comp("p6_line25f", "25f", "Part VI, clean hydrogen: line 25d times line 25e", "Page11[0].f11_6[0]", "25d x 25e"),
  money("p6_line25g", "25g", "Part VI, clean hydrogen: basis of property in the section 45V(b)(2)(C) range", "Page11[0].Line25g_ReadOrder[0].f11_7[0]"),
  pct("p6_line25h", "25h", "Part VI, clean hydrogen: applicable percentage (10% or 2%)", "Page11[0].f11_8[0]"),
  comp("p6_line25i", "25i", "Part VI, clean hydrogen: line 25g times line 25h", "Page11[0].f11_9[0]", "25g x 25h"),
  money("p6_line25j", "25j", "Part VI, clean hydrogen: basis of property in the section 45V(b)(2)(D) range", "Page11[0].Line25j_ReadOrder[0].f11_10[0]"),
  pct("p6_line25k", "25k", "Part VI, clean hydrogen: applicable percentage (30% or 6%)", "Page11[0].f11_11[0]"),
  comp("p6_line25l", "25l", "Part VI, clean hydrogen: line 25j times line 25k", "Page11[0].f11_12[0]", "25j x 25k"),
  comp("p6_line26", "26", "Part VI, clean hydrogen: add lines 25c, 25f, 25i, and 25l", "Page11[0].f11_13[0]", "25c + 25f + 25i + 25l"),
  comp("p6_line27", "27", "Part VI: add lines 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, and 26", "Page11[0].Line27_ReadOrder[0].f11_14[0]", "sum of the Part VI block totals"),
  { id: "p6_line28a", line: "28a", label: "Part VI: ratio of tax-exempt bond proceeds to the aggregate basis (decimal, for example 0.25)", type: "text", maxLen: 8, locate: N("Page11[0].f11_17[0]") },
  comp("p6_line28b", "28b", "Part VI: line 27 times line 28a", "Page11[0].f11_18[0]", "27 x 28a"),
  comp("p6_line28c", "28c", "Part VI: line 27 times 15%", "Page11[0].f11_19[0]", "27 x 15%"),
  comp("p6_line28d", "28d", "Part VI: smaller of line 28b or 28c", "Page11[0].f11_20[0]", "min(28b, 28c)"),
  comp("p6_line28e", "28e", "Part VI: line 27 minus line 28d", "Page11[0].f11_21[0]", "27 - 28d"),
  comp("p6_line29", "29", "Part VI: line 28e when line 28a applies, otherwise line 27", "Page11[0].f11_22[0]", "28e or 27"),
  { id: "p6_line30_pct", label: "Part VI line 30: percentage kept under the elective payment domestic content phaseout (100 or 90); defaults to 100", type: "percent", noPdf: true },
  comp("p6_line30", "30", "Part VI: line 29 times the line 30 percentage", "Page11[0].f11_23[0]", "29 x percentage"),
  money("p6_line31", "31", "Part VI: applicable unused investment credit from cooperatives", "Page11[0].f11_24[0]"),
  comp("p6_line32", "32", "Part VI total: to Form 3800 Part III line 4a", "Page11[0].f11_25[0]", "30 + 31"),
  // Part VII: rehabilitation credit (47).
  { id: "p7_line1a", line: "1a", label: "Part VII: was there a prior section 170(h) deduction on this property?", type: "yesno", locate: yn("Page12[0].c12_1") },
  text("p7_line1b", "1b", "Part VII: prior NPS number (if line 1a is yes)", "Page12[0].f12_1[0]"),
  check("p7_line1c", "1c", "Part VII: electing under section 47(d)(5) to take the qualified rehabilitation expenditures into account when paid", "Page12[0].c12_2[0]"),
  text("p7_line1d_begin", "1d", "Part VII: measuring period beginning date (MM/DD/YYYY)", "Page12[0].f12_2[0]", { maxLen: 10 }),
  text("p7_line1d_end", "1d", "Part VII: measuring period end date (MM/DD/YYYY)", "Page12[0].f12_3[0]", { maxLen: 10 }),
  money("p7_line1e", "1e", "Part VII: adjusted basis of the building as of the beginning date", "Page12[0].f12_4[0]"),
  money("p7_line1f", "1f", "Part VII: qualified rehabilitation expenditures incurred during the measuring period", "Page12[0].f12_5[0]"),
  money("p7_line1g", "1g", "Part VII: qualified rehabilitation expenditures for the credit", "Page12[0].f12_6[0]"),
  { id: "p7_transition_pre1936", label: "Part VII (2024 only): pre-1936 building under the transition rule (line 1h is 10% of line 1g)", type: "checkbox", noPdf: true, years: [2024] },
  { id: "p7_transition_historic", label: "Part VII (2024 only): certified historic structure under the transition rule (line 1i is 20% of line 1g)", type: "checkbox", noPdf: true, years: [2024] },
  comp("p7_line1h", "1h", "Part VII (2024): pre-1936 buildings under the transition rule, line 1g times 10%", "Page12[0].f12_7[0]", "1g x 10%", { years: [2024] }),
  comp("p7_line1i", "1i", "Part VII (2024): certified historic structures under the transition rule, line 1g times 20%", "Page12[0].f12_8[0]", "1g x 20%", { years: [2024] }),
  comp("p7_line1j", "1j", "Part VII: certified historic structures, line 1g times 4% (one fifth of the 20% credit each year of the 5-year period)", "Page12[0].f12_9[0]", "1g x 4%"),
  text("p7_line1k_i", "1k(i)", "Part VII: assigned NPS project number", "Page12[0].f12_10[0]"),
  text("p7_line1k_ii", "1k(ii)", "Part VII: originating pass-through entity's EIN (if applicable)", "Page12[0].f12_11[0]", { maxLen: 10 }),
  text("p7_line1k_iii", "1k(iii)", "Part VII: date the NPS approved the Request for Certification of Completed Work (MM/DD/YYYY)", "Page12[0].f12_12[0]", { maxLen: 10 }),
  text("p7_line1m", "1m", "Part VII: date 30 months after the original credit claim, when no approved certification of completed work was received (MM/DD/YYYY)", "Page12[0].f12_13[0]", { maxLen: 10 }),
  money("p7_line2", "2", "Part VII: applicable unused investment credit from cooperatives", "Page12[0].f12_14[0]"),
  comp("p7_line3", "3", "Part VII total: to Form 3800 Part III line 4k", "Page12[0].f12_15[0]", "1j (and 1h, 1i for 2024) + 2"),
];

const pctOf = (values: Record<string, unknown>, key: string): number => {
  const v = Number(values[key]) || 0;
  return v > 0 && v < 1 ? v * 100 : v;
};
const numText = (v: unknown): number => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;

export const form3468: FormDef = {
  id: "f3468",
  title: "Form 3468, Investment Credit",
  shortTitle: "Form 3468",
  description: "The investment credit: facility information (Part I), the advanced coal and gasification (II), advanced energy project (III), advanced manufacturing (IV), clean electricity (V), energy (VI), and rehabilitation (VII) credits, each with its applicable percentage and the domestic content, energy community, and low-income bonus amounts; the Part totals go to Form 3800 Part III.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i3468.pdf",
  notes: `**Who files.** Owners (or lessees under a section 48(d) election) of energy property, clean electricity facilities, advanced energy or manufacturing projects, or certified historic rehabilitations placed in service during the year, and partners or shareholders who receive the credit on a Schedule K-1 (they report it directly on Form 3800). One Form 3468 is filed for each facility or property.

**What the engine computes.** Every multiplication and sum on Parts II through VII: the basis times the applicable percentage you enter (30% or 6%; 10% or 2% for the bonuses), the low-income communities bonus lines (including the capacity ratio when the allocation covers part of the nameplate capacity on Part I line 12), the fuel cell and microturbine capacity limits ($1,000, $3,000, and $200 per kilowatt), the tax-exempt bond and subsidized financing reductions, and the Part totals. In a full return the Part II, III, IV, V, VI, and VII totals are placed on Form 3800 Part III lines 1a, 1d, 1o, 1v, 4a, and 4k.

**What to verify.** Enter the percentages the instructions give for your property, because they depend on the prevailing wage and apprenticeship answers in Part I lines 7 and 8, the construction start date, and whether the credit is for a section 48 or 48E facility. The basis must be reduced for any section 1603 grant or tax-exempt financing. Credits with elective payment or transfer elections need the IRS-issued registration number on line 1. For 2024, Part VII lines 1h and 1i apply only to transition-rule rehabilitations.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const nameplate = numText(values["line12a_i"]) || numText(values["line12b_capacity"]) || numText(values["line12c_capacity"]);
    const mul = (outId: string, line: string, label: string, base: number, p: number, formula: string) => c.set(outId, base * p / 100, label, formula, line);
    // Part II.
    const l1b = mul("p2_line1b", "1b", "Part II line 1b", c.n("p2_line1a"), 20, `${f(c.n("p2_line1a"))} x 20%`);
    const l2b = mul("p2_line2b", "2b", "Part II line 2b", c.n("p2_line2a"), 15, `${f(c.n("p2_line2a"))} x 15%`);
    const l3b = mul("p2_line3b", "3b", "Part II line 3b", c.n("p2_line3a"), 30, `${f(c.n("p2_line3a"))} x 30%`);
    const l4b = mul("p2_line4b", "4b", "Part II line 4b", c.n("p2_line4a"), 30, `${f(c.n("p2_line4a"))} x 30%`);
    const l5b = mul("p2_line5b", "5b", "Part II line 5b", c.n("p2_line5a"), 20, `${f(c.n("p2_line5a"))} x 20%`);
    c.set("p2_line7", l1b + l2b + l3b + l4b + l5b + c.n("p2_line6"), "Part II total (Form 3800 line 1a)", `${f(l1b)} + ${f(l2b)} + ${f(l3b)} + ${f(l4b)} + ${f(l5b)} + ${f(c.n("p2_line6"))}`, "7");
    // Part III.
    const p3c = mul("p3_line1c", "1c", "Part III line 1c", c.n("p3_line1a"), pctOf(values, "p3_line1b"), `${f(c.n("p3_line1a"))} x ${pctOf(values, "p3_line1b")}%`);
    c.set("p3_line3", p3c + c.n("p3_line2"), "Part III total (Form 3800 line 1d)", `${f(p3c)} + ${f(c.n("p3_line2"))}`, "3");
    if (c.n("p3_line1a") > 0 && !c.has("p3_line1b")) c.warn("Part III line 1b (applicable percentage) was not supplied; line 1c is zero.");
    // Part IV.
    const p4rate = pctOf(values, "p4_rate") || 25;
    const p4c = mul("p4_line1c", "1c", "Part IV line 1c", c.n("p4_line1b"), p4rate, `${f(c.n("p4_line1b"))} x ${p4rate}%`);
    c.set("p4_line3", p4c + c.n("p4_line2"), "Part IV total (Form 3800 line 1o)", `${f(p4c)} + ${f(c.n("p4_line2"))}`, "3");
    // Blocks.
    const simple = (b: Simple): number => {
      const [a, bb, cc, d, e, g, h] = b.lines;
      const basis = c.n(id(b.p, a));
      const prod = mul(id(b.p, cc), cc, `${b.title}: line ${cc}`, basis, pctOf(values, id(b.p, bb)), `${f(basis)} x ${pctOf(values, id(b.p, bb))}%`);
      const dcP = mul(id(b.p, e), e, `${b.title}: line ${e}`, basis, pctOf(values, id(b.p, d)), `${f(basis)} x ${pctOf(values, id(b.p, d))}%`);
      const ecP = mul(id(b.p, h), h, `${b.title}: line ${h}`, basis, pctOf(values, id(b.p, g)), `${f(basis)} x ${pctOf(values, id(b.p, g))}%`);
      if (basis > 0 && !c.has(id(b.p, bb))) c.warn(`${b.title}: line ${bb} (applicable percentage) was not supplied; line ${cc} is zero.`);
      return c.set(id(b.p, b.total), prod + dcP + ecP, `${b.title}: line ${b.total}`, `${f(prod)} + ${f(dcP)} + ${f(ecP)}`, b.total);
    };
    const lowIncome = (b: LowIncome): number => {
      const L = b.lines;
      const li = b.order === "li-last" ? [7, 8, 9, 10, 11, 12, 13] : [3, 4, 5, 6, 7, 8, 9];
      const dc = b.order === "li-last" ? [3, 4] : [10, 11];
      const ec = b.order === "li-last" ? [5, 6] : [12, 13];
      const I = (i: number) => id(b.p, L[i]!);
      const basis = c.n(I(0));
      const prod = mul(I(2), L[2]!, `${b.title}: line ${L[2]}`, basis, pctOf(values, I(1)), `${f(basis)} x ${pctOf(values, I(1))}%`);
      if (basis > 0 && !c.has(I(1))) c.warn(`${b.title}: line ${L[1]} (applicable percentage) was not supplied; line ${L[2]} is zero.`);
      const bonus = pctOf(values, I(li[0]!));
      const allocated = numText(values[I(li[1]!)]);
      let n = 0;
      if (bonus > 0) {
        const covers = allocated > 0 && (nameplate === 0 || allocated >= nameplate);
        if (nameplate === 0 && allocated > 0) c.warn(`${b.title}: Part I line 12 nameplate capacity is missing; the full low-income bonus is applied.`);
        if (covers) {
          const full = c.set(I(li[2]!), basis * bonus / 100, `${b.title}: line ${L[li[2]!]}`, `${f(basis)} x ${bonus}% (allocation covers the nameplate capacity)`, L[li[2]!]);
          n = c.set(I(li[6]!), full, `${b.title}: line ${L[li[6]!]}`, `line ${L[li[2]!]}`, L[li[6]!]);
        } else if (allocated > 0) {
          const ratio = Math.min(1, allocated / nameplate);
          const k = Math.round(ratio * 10000) / 10000;
          c.setScalar(I(li[3]!), String(k), `${b.title}: line ${L[li[3]!]}`, `${allocated} / ${nameplate}`, L[li[3]!]);
          const l = Math.round(bonus * k * 100) / 100;
          c.setScalar(I(li[4]!), String(l), `${b.title}: line ${L[li[4]!]}`, `${bonus}% x ${k}`, L[li[4]!]);
          const m = c.set(I(li[5]!), basis * l / 100, `${b.title}: line ${L[li[5]!]}`, `${f(basis)} x ${l}%`, L[li[5]!]);
          n = c.set(I(li[6]!), m, `${b.title}: line ${L[li[6]!]}`, `line ${L[li[5]!]}`, L[li[6]!]);
        } else c.warn(`${b.title}: a low-income bonus percentage was entered without the allocated capacity (line ${L[li[1]!]}); no bonus is figured.`);
      }
      const dcP = mul(I(dc[1]!), L[dc[1]!]!, `${b.title}: line ${L[dc[1]!]}`, basis, pctOf(values, I(dc[0]!)), `${f(basis)} x ${pctOf(values, I(dc[0]!))}%`);
      const ecP = mul(I(ec[1]!), L[ec[1]!]!, `${b.title}: line ${L[ec[1]!]}`, basis, pctOf(values, I(ec[0]!)), `${f(basis)} x ${pctOf(values, I(ec[0]!))}%`);
      return c.set(id(b.p, b.total), prod + n + dcP + ecP, `${b.title}: line ${b.total}`, `${f(prod)} + ${f(n)} + ${f(dcP)} + ${f(ecP)}`, b.total);
    };
    // Part V.
    const p5l2 = lowIncome(LOW_INCOME[0]!);
    const p5l4 = simple(SIMPLE[0]!);
    const p5l5 = c.set("p5_line5", p5l2 + p5l4, "Part V line 5", `${f(p5l2)} + ${f(p5l4)}`, "5");
    let p5l7 = p5l5;
    const r6 = Number(values["p5_line6a"]) || 0;
    if (r6 > 0) {
      const b6 = c.set("p5_line6b", p5l5 * Math.min(1, r6), "Part V line 6b", `${f(p5l5)} x ${r6}`, "6b");
      const c6 = c.set("p5_line6c", p5l5 * 0.15, "Part V line 6c", `${f(p5l5)} x 15%`, "6c");
      const d6 = c.set("p5_line6d", Math.min(b6, c6), "Part V line 6d", `min(${f(b6)}, ${f(c6)})`, "6d");
      p5l7 = c.set("p5_line6e", p5l5 - d6, "Part V line 6e", `${f(p5l5)} - ${f(d6)}`, "6e");
    }
    c.set("p5_line7", p5l7, "Part V line 7", r6 > 0 ? "line 6e" : "line 5", "7");
    const p8pct = c.has("p5_line8_pct") ? pctOf(values, "p5_line8_pct") : 100;
    const p5l8 = c.set("p5_line8", p5l7 * p8pct / 100, "Part V line 8", `${f(p5l7)} x ${p8pct}%`, "8");
    c.set("p5_line11", p5l8 + c.n("p5_line10"), "Part V total (Form 3800 line 1v)", `${f(p5l8)} + ${f(c.n("p5_line10"))}`, "11");
    // Part VI.
    const totals: number[] = [];
    totals.push(simple(SIMPLE[1]!));
    totals.push(lowIncome(LOW_INCOME[1]!));
    const l5b2 = mul("p6_line5b", "5b", "Fuel cell line 5b", c.n("p6_line5a"), 30, `${f(c.n("p6_line5a"))} x 30%`);
    const l5d = c.set("p6_line5d", c.n("p6_line5c") * 1000, "Fuel cell line 5d", `${c.n("p6_line5c")} kW x $1,000`, "5d");
    const l5e = c.set("p6_line5e", Math.min(l5b2, l5d), "Fuel cell line 5e", `min(${f(l5b2)}, ${f(l5d)})`, "5e");
    const l5f = c.n("p6_line5f");
    const l5h = mul("p6_line5h", "5h", "Fuel cell line 5h", l5f, pctOf(values, "p6_line5g"), `${f(l5f)} x ${pctOf(values, "p6_line5g")}%`);
    const l5j = mul("p6_line5j", "5j", "Fuel cell line 5j", l5f, pctOf(values, "p6_line5i"), `${f(l5f)} x ${pctOf(values, "p6_line5i")}%`);
    const l5m = mul("p6_line5m", "5m", "Fuel cell line 5m", l5f, pctOf(values, "p6_line5l"), `${f(l5f)} x ${pctOf(values, "p6_line5l")}%`);
    const l5n = c.set("p6_line5n", l5h + l5j + l5m, "Fuel cell line 5n", `${f(l5h)} + ${f(l5j)} + ${f(l5m)}`, "5n");
    const l5p = c.set("p6_line5p", c.n("p6_line5o") * 3000, "Fuel cell line 5p", `${c.n("p6_line5o")} kW x $3,000`, "5p");
    const l5q = c.set("p6_line5q", Math.min(l5n, l5p), "Fuel cell line 5q", `min(${f(l5n)}, ${f(l5p)})`, "5q");
    totals.push(c.set("p6_line6", l5e + l5q, "Part VI line 6 (fuel cell)", `${f(l5e)} + ${f(l5q)}`, "6"));
    const l7a = c.n("p6_line7a");
    const l7c = mul("p6_line7c", "7c", "Microturbine line 7c", l7a, pctOf(values, "p6_line7b"), `${f(l7a)} x ${pctOf(values, "p6_line7b")}%`);
    const l7e = mul("p6_line7e", "7e", "Microturbine line 7e", l7a, pctOf(values, "p6_line7d"), `${f(l7a)} x ${pctOf(values, "p6_line7d")}%`);
    const l7h = mul("p6_line7h", "7h", "Microturbine line 7h", l7a, pctOf(values, "p6_line7g"), `${f(l7a)} x ${pctOf(values, "p6_line7g")}%`);
    const l7i = c.set("p6_line7i", l7c + l7e + l7h, "Microturbine line 7i", `${f(l7c)} + ${f(l7e)} + ${f(l7h)}`, "7i");
    const l7l = c.set("p6_line7l", c.n("p6_line7j") * 200, "Microturbine line 7l", `${c.n("p6_line7j")} kW x $200`, "7l");
    totals.push(c.set("p6_line8", l7a > 0 ? Math.min(l7i, l7l) : 0, "Part VI line 8 (microturbine)", `min(${f(l7i)}, ${f(l7l)})`, "8"));
    const l9a = c.n("p6_line9a");
    let frac = Number(values["p6_line9b"]) || (l9a > 0 ? 1 : 0);
    if (frac > 1) frac = 1;
    if (l9a > 0) {
      const whole = Math.floor(frac);
      c.setScalar("p6_line9b", String(whole), "CHP capacity fraction (whole)", `${frac}`, "9b");
      c.setScalar("p6_line9b_decimals", String(Math.round((frac - whole) * 10000)).padStart(4, "0"), "CHP capacity fraction (decimals)", `${frac}`, "9b");
    }
    const l9c = c.set("p6_line9c", l9a * frac, "CHP line 9c", `${f(l9a)} x ${frac}`, "9c");
    const l9e = mul("p6_line9e", "9e", "CHP line 9e", l9c, pctOf(values, "p6_line9d"), `${f(l9c)} x ${pctOf(values, "p6_line9d")}%`);
    const l9g = mul("p6_line9g", "9g", "CHP line 9g", l9c, pctOf(values, "p6_line9f"), `${f(l9c)} x ${pctOf(values, "p6_line9f")}%`);
    const l9i = mul("p6_line9i", "9i", "CHP line 9i", l9c, pctOf(values, "p6_line9h"), `${f(l9c)} x ${pctOf(values, "p6_line9h")}%`);
    totals.push(c.set("p6_line10", l9e + l9g + l9i, "Part VI line 10 (combined heat and power)", `${f(l9e)} + ${f(l9g)} + ${f(l9i)}`, "10"));
    totals.push(lowIncome(LOW_INCOME[2]!));
    totals.push(simple(SIMPLE[2]!));
    totals.push(simple(SIMPLE[3]!));
    totals.push(lowIncome(LOW_INCOME[3]!));
    totals.push(simple(SIMPLE[4]!));
    totals.push(simple(SIMPLE[5]!));
    totals.push(lowIncome(LOW_INCOME[4]!));
    const h = [["25a", "25b", "25c"], ["25d", "25e", "25f"], ["25g", "25h", "25i"], ["25j", "25k", "25l"]].map(([a, p, o]) => mul(`p6_line${o}`, o!, `Clean hydrogen line ${o}`, c.n(`p6_line${a}`), pctOf(values, `p6_line${p}`), `${f(c.n(`p6_line${a}`))} x ${pctOf(values, `p6_line${p}`)}%`));
    totals.push(c.set("p6_line26", h.reduce((a, b) => a + b, 0), "Part VI line 26 (clean hydrogen)", h.map(f).join(" + "), "26"));
    const l27 = c.set("p6_line27", totals.reduce((a, b) => a + b, 0), "Part VI line 27", totals.filter((t) => t > 0).map(f).join(" + ") || "0", "27");
    let l29 = l27;
    const r28 = Number(values["p6_line28a"]) || 0;
    if (r28 > 0) {
      const b28 = c.set("p6_line28b", l27 * Math.min(1, r28), "Part VI line 28b", `${f(l27)} x ${r28}`, "28b");
      const c28 = c.set("p6_line28c", l27 * 0.15, "Part VI line 28c", `${f(l27)} x 15%`, "28c");
      const d28 = c.set("p6_line28d", Math.min(b28, c28), "Part VI line 28d", `min(${f(b28)}, ${f(c28)})`, "28d");
      l29 = c.set("p6_line28e", l27 - d28, "Part VI line 28e", `${f(l27)} - ${f(d28)}`, "28e");
    }
    c.set("p6_line29", l29, "Part VI line 29", r28 > 0 ? "line 28e" : "line 27", "29");
    const p30pct = c.has("p6_line30_pct") ? pctOf(values, "p6_line30_pct") : 100;
    const l30 = c.set("p6_line30", l29 * p30pct / 100, "Part VI line 30", `${f(l29)} x ${p30pct}%`, "30");
    c.set("p6_line32", l30 + c.n("p6_line31"), "Part VI total (Form 3800 line 4a)", `${f(l30)} + ${f(c.n("p6_line31"))}`, "32");
    // Part VII.
    const g = c.n("p7_line1g");
    let p7 = 0;
    if (ctx.year === 2024 && c.bool("p7_transition_pre1936")) p7 += c.set("p7_line1h", g * 0.1, "Part VII line 1h (pre-1936 transition rule)", `${f(g)} x 10%`, "1h");
    else if (ctx.year === 2024 && c.bool("p7_transition_historic")) p7 += c.set("p7_line1i", g * 0.2, "Part VII line 1i (historic structure transition rule)", `${f(g)} x 20%`, "1i");
    else p7 += c.set("p7_line1j", g * 0.04, "Part VII line 1j", `${f(g)} x 4%`, "1j");
    c.set("p7_line3", p7 + c.n("p7_line2"), "Part VII total (Form 3800 line 4k)", `${f(p7)} + ${f(c.n("p7_line2"))}`, "3");
    if (g > 0 && !c.str("p7_line1k_i")) c.warn("Part VII line 1k(i): enter the assigned NPS project number for the rehabilitation credit.");
    if (c.str("line1") === "" && (c.has("p5_line8_pct") || c.has("p6_line30_pct"))) c.warn("An elective payment percentage was entered without the IRS-issued registration number on Part I line 1.");
    return c.result();
  },
};
