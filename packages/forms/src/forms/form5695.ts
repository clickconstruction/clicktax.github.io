import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

/**
 * The 2025 form (4 pages) itemizes each product with a qualified manufacturer PIN and separate "most expensive item" lines;
 * the 2024 form (3 pages) takes one cost per category. Inputs are shared; placements and the per-year computed lines differ.
 */
type Y<T> = Partial<Record<TaxYear, T>>;
const N = (y24: string | undefined, y25: string | undefined): { names: Y<string> } => ({ names: { ...(y24 ? { 2024: y24 } : {}), ...(y25 ? { 2025: y25 } : {}) } });
const pg = (page: number, n: number, year: TaxYear) => `Page${page}[0].f${page}_${year === 2025 ? String(n).padStart(2, "0") : String(n)}[0]`;
const both = (page: number, n24: number, n25: number) => N(pg(page, n24, 2024), pg(page, n25, 2025));
const money = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });
const yn = (id: string, line: string, label: string, y24: string, y25: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "yesno", locate: { yes: N(`${y24}[0]`, `${y25}[0]`), no: N(`${y24}[1]`, `${y25}[1]`) }, ...extra });
const pin = (id: string, label: string, group: string, a: string, b: string): FieldDef[] => [
  { id: `${id}_pin1`, label: `${label}: qualified manufacturer code (first 4 characters of the PIN)`, type: "text", maxLen: 4, years: [2025], locate: { names: { 2025: `${group}[0].Box1-4[0].f${a}[0]` } } },
  { id: `${id}_pin2`, label: `${label}: remaining PIN characters`, type: "text", maxLen: 13, years: [2025], locate: { names: { 2025: `${group}[0].Box5-17[0].f${b}[0]` } } },
];
const ADDR_MAX: Record<string, number> = { apt: 5, state: 2, zip: 10 };
const addr = (prefix: string, label: string, y24: number[], y25: number[], page24: number, page25: number): FieldDef[] => ["street", "apt", "city", "state", "zip"].map((k, i) => ({ id: `${prefix}_${k}`, label: `${label}: ${k}`, type: "text" as const, ...(ADDR_MAX[k] ? { maxLen: ADDR_MAX[k] } : {}), locate: N(pg(page24, y24[i]!, 2024), pg(page25, y25[i]!, 2025)) }));

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: both(1, 1, 1) },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: both(1, 2, 2) },
  ...addr("home", "Home address (Part I)", [3, 4, 5, 6, 7], [3, 4, 5, 6, 7], 1, 1),
  money("line1", "1", "Qualified solar electric property costs", both(1, 8, 8)),
  money("line2", "2", "Qualified solar water heating property costs", both(1, 9, 9)),
  money("line3", "3", "Qualified small wind energy property costs", both(1, 10, 10)),
  money("line4", "4", "Qualified geothermal heat pump property costs", both(1, 11, 11)),
  yn("line5a", "5a", "Did you install qualified battery storage technology (capacity of at least 3 kilowatt hours)?", "Page1[0].c1_1", "Page1[0].c1_1"),
  money("line5b", "5b", "Qualified battery storage technology costs", both(1, 12, 12)),
  comp("line6a", "6a", "Add lines 1 through 5b", both(1, 13, 13), "1 + 2 + 3 + 4 + 5b"),
  comp("line6b", "6b", "Multiply line 6a by 30%", both(1, 14, 14), "6a x 0.30"),
  yn("line7a", "7a", "Was qualified fuel cell property installed on or in connection with your main home in the United States?", "Page1[0].c1_2", "Page1[0].c1_2"),
  ...addr("fuel_cell_home", "7b: address of the fuel cell home", [15, 16, 17, 18, 19], [15, 16, 17, 18, 19], 1, 1),
  { id: "line7c", line: "7c", label: "Check if the special rule for joint occupants applies (fuel cell)", type: "checkbox", locate: { name: "Page1[0].c1_3[0]" } },
  money("line8", "8", "Qualified fuel cell property costs", both(1, 20, 20)),
  comp("line9", "9", "Multiply line 8 by 30%", both(1, 21, 21), "8 x 0.30"),
  { id: "line10_kw", line: "10", label: "Kilowatt capacity of the fuel cell property", type: "text", locate: both(1, 22, 22), maxLen: 2 },
  { id: "line10_kw_decimal", line: "10", label: "Kilowatt capacity, decimal part", type: "text", maxLen: 2, locate: both(1, 23, 23) },
  comp("line10", "10", "Kilowatt capacity x $1,000", both(1, 24, 24), "kW x 1,000"),
  comp("line11", "11", "Smaller of line 9 or line 10", both(1, 25, 25), "min(9, 10)"),
  money("line12", "12", "Credit carryforward from the prior year's Form 5695 line 16", both(1, 26, 26)),
  comp("line13", "13", "Add lines 6b, 11, and 12", both(1, 27, 27), "6b + 11 + 12"),
  money("line14", "14", "Limitation based on tax liability (Residential Clean Energy Credit Limit Worksheet)", both(1, 28, 28)),
  comp("line15", "15", "Residential clean energy credit; carried to Schedule 3 line 5a", both(1, 29, 29), "min(13, 14)", { alwaysShow: true }),
  comp("line16", "16", "Credit carryforward to next year", both(1, 30, 30), "13 - 15"),
  { id: "name_page2", label: "Name (page 2, 2025 form)", type: "text", computed: true, years: [2025], locate: { names: { 2025: "Page2[0].f2_01[0]" } } },
  { id: "ssn_page2", label: "SSN (page 2, 2025 form)", type: "ssn", computed: true, years: [2025], locate: { names: { 2025: "Page2[0].f2_02[0]" } } },
  yn("line17a", "17a", "Were the qualified energy efficiency improvements or residential energy property costs for your main home in the United States?", "Page2[0].c2_1", "Page2[0].c2_1"),
  yn("line17b", "17b", "Are you the original user of the improvements or property?", "Page2[0].c2_2", "Page2[0].c2_2"),
  yn("line17c", "17c", "Are the components reasonably expected to remain in use for at least 5 years?", "Page2[0].c2_3", "Page2[0].c2_3"),
  ...addr("improvement_home", "17d: address of the improved home", [1, 2, 3, 4, 5], [3, 4, 5, 6, 7], 2, 2),
  yn("line17e", "17e", "Were any of these improvements related to the construction of this main home?", "Page2[0].c2_4", "Page2[0].c2_4"),
  money("line18a", "18a", "Insulation and air sealing material or system costs (IECC criteria)", both(2, 6, 8)),
  comp("line18b", "18b", "30% of line 18a, not more than $1,200", both(2, 7, 9), "min(18a x 0.30, 1,200)"),
  money("door1_cost", "19a", "Cost of the most expensive exterior door", both(2, 8, 10)),
  ...pin("door1", "Most expensive door", "Page2[0].Ln19b", "2_11", "2_12"),
  comp("line19b_2024", "19b", "30% of the most expensive door, not more than $250 (2024 form)", N(pg(2, 9, 2024), undefined), "min(19a x 0.30, 250)", { years: [2024] }),
  comp("line19c_2025", "19c", "30% of the most expensive door, not more than $250 (2025 form)", N(undefined, pg(2, 13, 2025)), "min(19a x 0.30, 250)", { years: [2025] }),
  money("door2_cost", "19d", "Cost of the second most expensive door", N(undefined, undefined)),
  money("door3_cost", "19d", "Cost of the third most expensive door", N(undefined, undefined)),
  comp("line19d_2025", "19d", "Cost of the next two most expensive doors (2025 form)", N(undefined, pg(2, 14, 2025)), "door2 + door3", { years: [2025] }),
  ...pin("door2", "Second door", "Page2[0].Ln19i", "2_15", "2_16"),
  { id: "door2_cost_box", label: "Second door cost (2025 itemized box)", type: "money", computed: true, years: [2025], locate: { names: { 2025: "Page2[0].f2_17[0]" } } },
  ...pin("door3", "Third door", "Page2[0].Ln19ii", "2_18", "2_19"),
  { id: "door3_cost_box", label: "Third door cost (2025 itemized box)", type: "money", computed: true, years: [2025], locate: { names: { 2025: "Page2[0].f2_20[0]" } } },
  money("doors_other_cost", "19e", "Cost of all other qualifying exterior doors", both(2, 10, 21)),
  comp("line19d_2024", "19d", "30% of the other doors (2024 form)", N(pg(2, 11, 2024), undefined), "19c x 0.30", { years: [2024] }),
  comp("line19f_2025", "19f", "Add lines 19d and 19e (2025 form)", N(undefined, pg(2, 22, 2025)), "19d + 19e", { years: [2025] }),
  comp("line19g_2025", "19g", "30% of line 19f (2025 form)", N(undefined, pg(2, 23, 2025)), "19f x 0.30", { years: [2025] }),
  comp("line19h", "19h", "Exterior doors credit, not more than $500 (line 19e on the 2024 form)", both(2, 12, 24), "min(sum, 500)"),
  money("windows_top4_cost", "20a", "Cost of exterior windows and skylights (2025: the four most expensive)", both(2, 13, 25)),
  ...pin("window1", "Window 1", "Page2[0].Ln20i", "2_26", "2_27"),
  { id: "window1_cost", label: "Window 1 cost (2025 itemized box)", type: "money", years: [2025], locate: { names: { 2025: "Page2[0].f2_28[0]" } } },
  ...pin("window2", "Window 2", "Page2[0].Ln20ii", "2_29", "2_30"),
  { id: "window2_cost", label: "Window 2 cost (2025 itemized box)", type: "money", years: [2025], locate: { names: { 2025: "Page2[0].f2_31[0]" } } },
  ...pin("window3", "Window 3", "Page2[0].Ln20iii", "2_32", "2_33"),
  { id: "window3_cost", label: "Window 3 cost (2025 itemized box)", type: "money", years: [2025], locate: { names: { 2025: "Page2[0].f2_34[0]" } } },
  ...pin("window4", "Window 4", "Page2[0].Ln20iv", "2_35", "2_36"),
  { id: "window4_cost", label: "Window 4 cost (2025 itemized box)", type: "money", years: [2025], locate: { names: { 2025: "Page2[0].f2_37[0]" } } },
  money("windows_other_cost", "20b", "Cost of all other qualifying windows and skylights (2025 form)", N(undefined, pg(2, 38, 2025)), { years: [2025] }),
  comp("line20c_2025", "20c", "Add lines 20a and 20b (2025 form)", N(undefined, pg(2, 39, 2025)), "20a + 20b", { years: [2025] }),
  comp("line20d", "20d", "Windows credit, 30%, not more than $600 (line 20b on the 2024 form)", both(2, 14, 40), "min(sum x 0.30, 600)"),
  yn("line21a", "21a", "Were the residential energy property costs for a home in the United States you use as a residence?", "Page2[0].c2_5", "Page3[0].c3_1"),
  yn("line21b", "21b", "Was the qualified energy property originally placed in service by you?", "Page2[0].c2_6", "Page3[0].c3_2"),
  { id: "energy_property_homes", line: "21c", label: "Addresses of the homes where energy property was installed (up to 4)", type: "list", rows: 4, items: [{ id: "street", label: "Street", type: "text" }, { id: "apt", label: "Apt.", type: "text", maxLen: 5 }, { id: "city", label: "City", type: "text" }, { id: "state", label: "State", type: "text", maxLen: 2 }, { id: "zip", label: "ZIP", type: "text", maxLen: 10 }], listLocate: { 2024: Object.fromEntries(["street", "apt", "city", "state", "zip"].map((k, c) => [k, [1, 2, 3, 4].map((r) => `Page2[0].Table_Line21c[0].Row${r}[0].f2_${15 + 5 * (r - 1) + c}[0]`)])), 2025: Object.fromEntries(["street", "apt", "city", "state", "zip"].map((k, c) => [k, [1, 2, 3, 4].map((r) => `Page3[0].Table_Line21c[0].Row${r}[0].f3_${String(1 + 5 * (r - 1) + c).padStart(2, "0")}[0]`)])) } },
  money("ac1_cost", "22a", "Cost of central air conditioners (2025: the most expensive one)", { names: { 2024: pg(2, 35, 2024), 2025: pg(3, 21, 2025) } }),
  ...pin("ac1", "Central air conditioner", "Page3[0].Ln_22a", "3_22", "3_23"),
  money("ac_other_cost", "22b", "Cost of all other central air conditioners (2025 form)", N(undefined, pg(3, 24, 2025)), { years: [2025] }),
  comp("line22c_2025", "22c", "Add lines 22a and 22b (2025 form)", N(undefined, pg(3, 25, 2025)), "22a + 22b", { years: [2025] }),
  comp("line22d", "22d", "Central air conditioner credit, 30%, not more than $600 (line 22b on the 2024 form)", { names: { 2024: pg(2, 36, 2024), 2025: pg(3, 26, 2025) } }, "min(sum x 0.30, 600)"),
  money("wh1_cost", "23a", "Cost of natural gas, propane, or oil water heaters (2025: the two most expensive)", { names: { 2024: pg(2, 37, 2024), 2025: pg(3, 27, 2025) } }),
  ...pin("wh1", "Water heater 1", "Page3[0].Ln23ai", "3_28", "3_29"),
  { id: "wh1_cost_box", label: "Water heater 1 cost (2025 itemized box)", type: "money", years: [2025], locate: { names: { 2025: "Page3[0].f3_30[0]" } } },
  ...pin("wh2", "Water heater 2", "Page3[0].Ln23aii", "3_30", "3_31"),
  { id: "wh2_cost_box", label: "Water heater 2 cost (2025 itemized box)", type: "money", years: [2025], locate: { names: { 2025: "Page3[0].f3_32[0]" } } },
  money("wh_other_cost", "23b", "Cost of all other qualifying water heaters (2025 form)", N(undefined, pg(3, 33, 2025)), { years: [2025] }),
  comp("line23c_2025", "23c", "Add lines 23a and 23b (2025 form)", N(undefined, pg(3, 34, 2025)), "23a + 23b", { years: [2025] }),
  comp("line23d", "23d", "Water heater credit, 30%, not more than $600 (line 23b on the 2024 form)", { names: { 2024: pg(2, 38, 2024), 2025: pg(3, 35, 2025) } }, "min(sum x 0.30, 600)"),
  money("furnace1_cost", "24a", "Cost of natural gas, propane, or oil furnaces or hot water boilers (2025: the most expensive)", { names: { 2024: pg(2, 39, 2024), 2025: pg(3, 36, 2025) } }),
  ...pin("furnace1", "Furnace or boiler", "Page3[0].Ln_24a", "3_37", "3_38"),
  money("furnace_other_cost", "24b", "Cost of all other qualifying furnaces and boilers (2025 form)", N(undefined, pg(3, 39, 2025)), { years: [2025] }),
  comp("line24c_2025", "24c", "Add lines 24a and 24b (2025 form)", N(undefined, pg(3, 40, 2025)), "24a + 24b", { years: [2025] }),
  comp("line24d", "24d", "Furnace and boiler credit, 30%, not more than $600 (line 24b on the 2024 form)", { names: { 2024: pg(2, 40, 2024), 2025: pg(3, 41, 2025) } }, "min(sum x 0.30, 600)"),
  { id: "line25a", line: "25a", label: "Was the panelboard, sub-panelboard, branch circuit, or feeder installed with other qualifying property (2025 form)?", type: "yesno", years: [2025], locate: { yes: { names: { 2025: "Page3[0].c3_4[0]" } }, no: { names: { 2025: "Page3[0].c3_4[1]" } } } },
  { id: "line25b_codes", line: "25b", label: "Codes of the enabled property (2025 form; up to 7 single-letter codes)", type: "text", years: [2025] },
  money("panel_cost", "25c", "Cost of improvements to or replacement of panelboards, sub-panelboards, branch circuits, or feeders (line 25a on the 2024 form)", { names: { 2024: pg(3, 1, 2024), 2025: pg(3, 49, 2025) } }),
  comp("line25e", "25e", "Panelboard credit, 30%, not more than $600 (line 25b on the 2024 form)", { names: { 2024: pg(3, 2, 2024), 2025: pg(3, 52, 2025) } }, "min(25c x 0.30, 600)"),
  yn("line26a", "26a", "Was the home energy audit on your main home in the United States with a written report by a certified auditor?", "Page3[0].c3_1", "Page4[0].c4_1"),
  money("line26b", "26b", "Cost of the home energy audit", { names: { 2024: pg(3, 3, 2024), 2025: pg(4, 1, 2025) } }),
  comp("line26c", "26c", "Home energy audit credit, 30%, not more than $150", { names: { 2024: pg(3, 4, 2024), 2025: pg(4, 2, 2025) } }, "min(26b x 0.30, 150)"),
  comp("line27", "27", "Add lines 18b, 19h, 20d, 22d, 23d, 24d, 25e, and 26c", { names: { 2024: pg(3, 6, 2024), 2025: pg(4, 3, 2025) } }, "sum"),
  comp("line28", "28", "Smaller of line 27 or $1,200", { names: { 2024: pg(3, 7, 2024), 2025: pg(4, 4, 2025) } }, "min(27, 1,200)"),
  money("heatpump1_cost", "29a", "Cost of electric or natural gas heat pumps (2025: the most expensive)", { names: { 2024: pg(3, 8, 2024), 2025: pg(4, 5, 2025) } }),
  ...pin("heatpump1", "Heat pump", "Page4[0].Ln_29a", "4_06", "4_07"),
  money("heatpump_other_cost", "29b", "Cost of all other heat pumps (2025 form)", N(undefined, pg(4, 8, 2025)), { years: [2025] }),
  money("hpwh1_cost", "29c", "Cost of electric or natural gas heat pump water heaters (2025: the most expensive; line 29b on the 2024 form)", { names: { 2024: pg(3, 9, 2024), 2025: pg(4, 9, 2025) } }),
  ...pin("hpwh1", "Heat pump water heater", "Page4[0].Ln_29c", "4_10", "4_11"),
  money("hpwh_other_cost", "29d", "Cost of all other heat pump water heaters (2025 form)", N(undefined, pg(4, 12, 2025)), { years: [2025] }),
  money("biomass1_cost", "29e", "Cost of biomass stoves and boilers (2025: the most expensive; line 29c on the 2024 form)", { names: { 2024: pg(3, 10, 2024), 2025: pg(4, 13, 2025) } }),
  ...pin("biomass1", "Biomass stove or boiler", "Page4[0].Ln_29e", "4_14", "4_15"),
  money("biomass_other_cost", "29f", "Cost of all other biomass stoves and boilers (2025 form)", N(undefined, pg(4, 16, 2025)), { years: [2025] }),
  comp("line29g", "29g", "Add the heat pump, heat pump water heater, and biomass costs (line 29d on the 2024 form)", { names: { 2024: pg(3, 11, 2024), 2025: pg(4, 17, 2025) } }, "sum"),
  comp("line29h", "29h", "Heat pump and biomass credit, 30%, not more than $2,000 (line 29e on the 2024 form)", { names: { 2024: pg(3, 12, 2024), 2025: pg(4, 18, 2025) } }, "min(29g x 0.30, 2,000)"),
  comp("line30", "30", "Add lines 28 and 29h", { names: { 2024: pg(3, 13, 2024), 2025: pg(4, 19, 2025) } }, "28 + 29h"),
  money("line31", "31", "Limitation based on tax liability (Energy Efficient Home Improvement Credit Limit Worksheet)", { names: { 2024: pg(3, 14, 2024), 2025: pg(4, 20, 2025) } }),
  comp("line32", "32", "Energy efficient home improvement credit; carried to Schedule 3 line 5b", { names: { 2024: pg(3, 15, 2024), 2025: pg(4, 21, 2025) } }, "min(30, 31)", { alwaysShow: true }),
  { id: "line32_joint", label: "Check if the special rule for joint occupants applies (Part II)", type: "checkbox", locate: { names: { 2024: "Page3[0].c3_2[0]", 2025: "Page4[0].c4_2[0]" } } },
];

export const form5695: FormDef = {
  id: "f5695",
  title: "Form 5695, Residential Energy Credits",
  shortTitle: "Form 5695",
  description: "The 30% residential clean energy credit (solar, wind, geothermal, battery storage, fuel cells, with carryforward) and the energy efficient home improvement credit (insulation, doors, windows, air conditioners, water heaters, furnaces, panelboards, audits, heat pumps and biomass) with its per-item and $1,200/$2,000 annual caps. Lines 15 and 32 go to Schedule 3 lines 5a and 5b.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i5695.pdf",
  notes: `**Two credits, two parts.** Part I (clean energy property) is 30% of cost with no annual cap and an unlimited carryforward; it ends for property placed in service after 2025. Part II (efficiency improvements) is 30% with caps: $1,200 a year overall, $600 for windows, $250 per door and $500 for doors, $600 each for central air conditioners, water heaters, furnaces, and panelboards, $150 for an energy audit, plus a separate $2,000 for heat pumps, heat pump water heaters, and biomass stoves; no carryforward. The 2025 form requires each product's qualified manufacturer PIN.

**What the engine computes.** Lines 6a, 6b, 9, 10, 11, 13, 15, 16, 18b, the door and window lines, 22d, 23d, 24d, 25e, 26c, 27, 28, 29g, 29h, 30, and 32. In a full return, lines 14 and 31 come from the tax liability worksheets and the credits land on Schedule 3 lines 5a and 5b.

**What to verify.** Costs include labor for Part I but only materials for insulation, doors, and windows in Part II; the property must be new and meet the Energy Star or CEE efficiency tiers; a home energy audit needs a written report by a certified auditor.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    c.out["name_page2"] = values["name"] ?? "";
    c.out["ssn_page2"] = values["ssn"] ?? "";
    const l6a = c.set("line6a", c.sum(["line1", "line2", "line3", "line4", "line5b"]), "Clean energy property costs", "1 + 2 + 3 + 4 + 5b", "6a");
    const l6b = c.set("line6b", Math.round(l6a * 0.3), "30% of costs", `${f(l6a)} x 0.30`, "6b");
    const l9 = c.set("line9", Math.round(c.n("line8") * 0.3), "30% of fuel cell costs", `${f(c.n("line8"))} x 0.30`, "9");
    const kw = Number(c.str("line10_kw") || 0) + Number(`0.${c.str("line10_kw_decimal") || "0"}`);
    const l10 = c.set("line10", Math.round(kw * 1000), "Fuel cell limit", `${kw} kW x 1,000`, "10");
    const l11 = c.set("line11", Math.min(l9, l10), "Fuel cell credit", `min(${f(l9)}, ${f(l10)})`, "11");
    const l13 = c.set("line13", l6b + l11 + c.n("line12"), "Clean energy credit before the limit", `${f(l6b)} + ${f(l11)} + ${f(c.n("line12"))}`, "13");
    const l15 = c.set("line15", c.has("line14") ? Math.min(l13, c.n("line14")) : l13, "Residential clean energy credit", c.has("line14") ? `min(${f(l13)}, ${f(c.n("line14"))})` : "unlimited (supply line14)", "15");
    c.set("line16", l13 - l15, "Carryforward", `${f(l13)} - ${f(l15)}`, "16");
    if (l13 > 0 && !c.has("line14")) c.warn("line14 (tax liability limit) was not supplied; the clean energy credit is shown unlimited.");
    if (c.n("line8") > 0 && !c.bool("line7a")) c.warn("Fuel cell property qualifies only for your main home in the United States (line 7a).");
    // Part II
    const l18b = c.set("line18b", Math.min(1200, Math.round(c.n("line18a") * 0.3)), "Insulation credit", `min(${f(c.n("line18a"))} x 0.30, 1,200)`, "18b");
    const d1 = c.n("door1_cost"), d2 = c.n("door2_cost"), d3 = c.n("door3_cost"), dOther = c.n("doors_other_cost");
    const door1Credit = Math.min(250, Math.round(d1 * 0.3));
    c.set("line19b_2024", door1Credit, "Most expensive door credit", `min(${f(d1)} x 0.30, 250)`, "19b");
    c.set("line19c_2025", door1Credit, "Most expensive door credit", `min(${f(d1)} x 0.30, 250)`, "19c");
    c.set("line19d_2025", d2 + d3, "Next two doors", `${f(d2)} + ${f(d3)}`, "19d");
    c.out["door2_cost_box"] = d2; c.out["door3_cost_box"] = d3;
    const otherDoors2024 = d2 + d3 + dOther;
    c.set("line19d_2024", Math.round(otherDoors2024 * 0.3), "Other doors credit", `${f(otherDoors2024)} x 0.30`, "19d");
    const l19f = c.set("line19f_2025", d2 + d3 + dOther, "Other doors cost", `${f(d2 + d3)} + ${f(dOther)}`, "19f");
    const l19g = c.set("line19g_2025", Math.round(l19f * 0.3), "30% of other doors", `${f(l19f)} x 0.30`, "19g");
    const l19h = c.set("line19h", Math.min(500, door1Credit + l19g), "Exterior doors credit", `min(${f(door1Credit)} + ${f(l19g)}, 500)`, "19h");
    const windows = c.n("windows_top4_cost") + c.n("windows_other_cost");
    c.set("line20c_2025", windows, "Window costs", "20a + 20b", "20c");
    const l20d = c.set("line20d", Math.min(600, Math.round(windows * 0.3)), "Windows credit", `min(${f(windows)} x 0.30, 600)`, "20d");
    const ac = c.n("ac1_cost") + c.n("ac_other_cost");
    c.set("line22c_2025", ac, "Air conditioner costs", "22a + 22b", "22c");
    const l22d = c.set("line22d", Math.min(600, Math.round(ac * 0.3)), "Air conditioner credit", `min(${f(ac)} x 0.30, 600)`, "22d");
    const wh = c.n("wh1_cost") + c.n("wh_other_cost");
    c.set("line23c_2025", wh, "Water heater costs", "23a + 23b", "23c");
    const l23d = c.set("line23d", Math.min(600, Math.round(wh * 0.3)), "Water heater credit", `min(${f(wh)} x 0.30, 600)`, "23d");
    const furnace = c.n("furnace1_cost") + c.n("furnace_other_cost");
    c.set("line24c_2025", furnace, "Furnace costs", "24a + 24b", "24c");
    const l24d = c.set("line24d", Math.min(600, Math.round(furnace * 0.3)), "Furnace credit", `min(${f(furnace)} x 0.30, 600)`, "24d");
    const l25e = c.set("line25e", Math.min(600, Math.round(c.n("panel_cost") * 0.3)), "Panelboard credit", `min(${f(c.n("panel_cost"))} x 0.30, 600)`, "25e");
    const l26c = c.set("line26c", Math.min(150, Math.round(c.n("line26b") * 0.3)), "Energy audit credit", `min(${f(c.n("line26b"))} x 0.30, 150)`, "26c");
    const l27 = c.set("line27", l18b + l19h + l20d + l22d + l23d + l24d + l25e + l26c, "Improvement credits before the cap", "18b + 19h + 20d + 22d + 23d + 24d + 25e + 26c", "27");
    const l28 = c.set("line28", Math.min(1200, l27), "Capped at $1,200", `min(${f(l27)}, 1,200)`, "28");
    const l29g = c.set("line29g", c.sum(["heatpump1_cost", "heatpump_other_cost", "hpwh1_cost", "hpwh_other_cost", "biomass1_cost", "biomass_other_cost"]), "Heat pump and biomass costs", "29a + 29b + 29c + 29d + 29e + 29f", "29g");
    const l29h = c.set("line29h", Math.min(2000, Math.round(l29g * 0.3)), "Heat pump and biomass credit", `min(${f(l29g)} x 0.30, 2,000)`, "29h");
    const l30 = c.set("line30", l28 + l29h, "Improvement credit before the limit", `${f(l28)} + ${f(l29h)}`, "30");
    c.set("line32", c.has("line31") ? Math.min(l30, c.n("line31")) : l30, "Energy efficient home improvement credit", c.has("line31") ? `min(${f(l30)}, ${f(c.n("line31"))})` : "unlimited (supply line31)", "32");
    if (l30 > 0 && !c.has("line31")) c.warn("line31 (tax liability limit) was not supplied; the improvement credit is shown unlimited.");
    if (ctx.year === 2025 && l27 + l29h > 0 && !["door1_pin1", "window1_pin1", "ac1_pin1", "wh1_pin1", "furnace1_pin1", "heatpump1_pin1", "hpwh1_pin1", "biomass1_pin1"].some((k) => c.str(k))) c.warn("2025 requires each product's qualified manufacturer PIN (door1_pin1/door1_pin2 and the like); none were supplied.");
    if (l27 > 1200) c.warn(`Improvement credits of ${f(l27)} are capped at $1,200 (heat pumps and biomass have their own $2,000 cap).`);
    return c.result();
  },
};
