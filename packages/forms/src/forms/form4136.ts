import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";
import { FUEL_ROWS, type FuelRow, type FuelRowYear } from "./form4136.rows.ts";

const YEARS: TaxYear[] = [2024, 2025];
const pick = (row: FuelRow, k: keyof FuelRowYear): Partial<Record<TaxYear, string>> => {
  const o: Partial<Record<TaxYear, string>> = {};
  for (const y of row.years) {
    const v = row.byYear[y]?.[k];
    if (typeof v === "string") o[y] = v;
  }
  return o;
};
const yearsOf = (o: Partial<Record<TaxYear, string>>): TaxYear[] => YEARS.filter((y) => o[y] !== undefined);
const both = (y25: string, y24: string): Partial<Record<TaxYear, string>> => ({ 2025: y25, 2024: y24 });

const rowFields: FieldDef[] = [];
for (const row of FUEL_ROWS) {
  const use = pick(row, "use");
  const gallons = pick(row, "gallons");
  const amtD = pick(row, "amtD");
  const rateBox = pick(row, "rateBox");
  const costD = pick(row, "costD");
  const crn = pick(row, "crn");
  const years = yearsOf(gallons);
  const partial = years.length < 2 ? { years } : {};
  if (Object.keys(use).length) rowFields.push({ id: `line${row.key}_use`, line: row.key, label: `${row.title}, line ${row.key}: (a) type of use (the number from the Type of Use table in the instructions)`, type: "text", maxLen: 2, locate: { names: use }, years: yearsOf(use) });
  rowFields.push({ id: `line${row.key}_gallons`, line: row.key, label: `${row.title}, line ${row.key}: ${row.label} (gallons)`, type: "integer", locate: { names: gallons }, ...partial });
  if (Object.keys(rateBox).length) rowFields.push({ id: `line${row.key}_rate`, line: row.key, label: `${row.title}, line ${row.key}: credit rate per gallon (defaults to $1.25)`, type: "text", maxLen: 6, locate: { names: rateBox }, years: yearsOf(rateBox) });
  if (Object.keys(costD).length) rowFields.push({ id: `line${row.key}_cost`, line: row.key, label: `${row.title}, line ${row.key} group: (d) actual fuel cost from your records`, type: "money", locate: { names: costD }, years: yearsOf(costD) });
  if (Object.keys(amtD).length) {
    rowFields.push({ id: `line${row.key}_amount`, line: row.key, label: `${row.title}, line ${row.key} group: amount of credit (dollars)`, type: "text", computed: true, locate: { names: amtD }, ...partial });
    rowFields.push({ id: `line${row.key}_amount_cents`, line: row.key, label: `${row.title}, line ${row.key} group: amount of credit (cents)`, type: "text", computed: true, locate: { names: pick(row, "amtC") }, ...partial });
  }
  if (Object.keys(crn).length) rowFields.push({ id: `line${row.key}_crn`, line: row.key, label: `${row.title}, line ${row.key}: credit reference number (CRN) for the type of use`, type: "text", maxLen: 3, locate: { names: crn }, years: yearsOf(crn) });
}

const fields: FieldDef[] = [
  { id: "name", label: "Name (as shown on your income tax return)", type: "text", locate: { name: "Page1[0].f1_1[0]" } },
  { id: "ssn", label: "Taxpayer identification number", type: "text", maxLen: 11, locate: { name: "Page1[0].f1_2[0]" } },
  { id: "lineA", line: "A", label: "Do you have a qualifying business or business activity with qualifying usage of qualifying fuels eligible for the fuel tax credit?", type: "yesno", years: [2025], locate: { yes: { name: "Page1[0].c1_1[0]" }, no: { name: "Page1[0].c1_1[1]" } } },
  { id: "lineB", line: "B", label: "How many different business activities qualify for this credit?", type: "integer", years: [2025], locate: { name: "Page1[0].f1_3[0]" } },
  { id: "business_name", line: "C", label: "Business name (if applicable)", type: "text", years: [2025], locate: { name: "Page1[0].f1_4[0]" } },
  { id: "ein", line: "D", label: "EIN (if applicable)", type: "text", maxLen: 10, years: [2025], locate: { name: "Page1[0].f1_5[0]" } },
  { id: "activity_code", line: "E", label: "Principal business activity code", type: "text", maxLen: 6, years: [2025], locate: { name: "Page1[0].f1_6[0]" } },
  { id: "equipment_make", line: "F", label: "Make of the equipment that used most of the fuel", type: "text", years: [2025], locate: { name: "Page1[0].f1_7[0]" } },
  { id: "equipment_model", line: "F", label: "Model of that equipment", type: "text", years: [2025], locate: { name: "Page1[0].f1_8[0]" } },
  { id: "equipment_type", line: "F", label: "Type of equipment", type: "text", years: [2025], locate: { name: "Page1[0].f1_9[0]" } },
  { id: "line3_dye", line: "3", label: "Line 3 certification: the diesel fuel did not contain visible evidence of dye (check the exception box if it did)", type: "checkbox", locate: { names: both("Page1[0].c1_2[0]", "Page1[0].c1_1[0]") } },
  { id: "line4_dye", line: "4", label: "Line 4 certification exception box: the kerosene did contain visible evidence of dye", type: "checkbox", locate: { names: both("Page2[0].c2_1[0]", "Page1[0].c1_2[0]") } },
  { id: "line6_dye", line: "6", label: "Line 6 certification exception box: the diesel fuel did contain visible evidence of dye", type: "checkbox", locate: { names: both("Page2[0].c2_2[0]", "Page2[0].c2_1[0]") } },
  { id: "line7_dye", line: "7", label: "Line 7 certification exception box: the kerosene did contain visible evidence of dye", type: "checkbox", locate: { names: both("Page2[0].c2_3[0]", "Page2[0].c2_2[0]") } },
  { id: "line6_registration", line: "6", label: "Line 6 registration number (registered ultimate vendor, UV)", type: "text", locate: { names: both("Page2[0].f2_84[0]", "Page2[0].f2_31[0]") } },
  { id: "line7_registration", line: "7", label: "Line 7 registration number (UV or UP)", type: "text", locate: { names: both("Page2[0].f2_99[0]", "Page2[0].f2_42[0]") } },
  { id: "line8_registration", line: "8", label: "Line 8 registration number (UA)", type: "text", locate: { names: both("Page3[0].f3_1[0]", "Page2[0].f2_55[0]") } },
  { id: "line10_registration", line: "10", label: "Line 10 registration number (M)", type: "text", years: [2024], locate: { names: { 2024: "Page3[0].f3_12[0]" } } },
  { id: "line12_registration", line: "12", label: "Line 12 registration number (AL or AM)", type: "text", years: [2024], locate: { names: { 2024: "Page4[0].f4_1[0]" } } },
  { id: "line13_registration", line: "13", label: "Line 13 registration number (CC)", type: "text", locate: { names: both("Page4[0].f4_64[0]", "Page4[0].f4_47[0]") } },
  { id: "line15_registration", line: "15", label: "Line 15 registration number (M)", type: "text", locate: { names: both("Page4[0].f4_102[0]", "Page4[0].f4_75[0]") } },
  ...rowFields,
  { id: "line17_dollars", line: "17", label: "Total income tax credit claimed (dollars)", type: "text", computed: true, locate: { names: both("Page4[0].f4_124[0]", "Page4[0].f4_91[0]") } },
  { id: "line17_cents", line: "17", label: "Total income tax credit claimed (cents)", type: "text", computed: true, locate: { names: both("Page4[0].f4_125[0]", "Page4[0].f4_92[0]") } },
  { id: "line17", line: "17", label: "Total income tax credit claimed (rounded; to Schedule 3 line 12)", type: "money", computed: true, alwaysShow: true, noPdf: true },
];

const split = (amount: number): [string, string] => {
  const cents = Math.round(amount * 100);
  return [String(Math.floor(cents / 100)), String(cents % 100).padStart(2, "0")];
};

export const form4136: FormDef = {
  id: "f4136",
  title: "Form 4136, Credit for Federal Tax Paid on Fuels",
  shortTitle: "Form 4136",
  description: "The income tax credit for federal excise tax paid on fuels used for nontaxable purposes (off-highway business use, farming, aviation, buses, trains, exports, alternative fuels) and the registered vendor, credit card issuer, and blender credits: gallons times the preprinted rate for each line, totaled on line 17 for Schedule 3 line 12.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i4136.pdf",
  notes: `**Who files.** Anyone who paid federal excise tax on gasoline, diesel, kerosene, or alternative fuel later used in a nontaxable way (type of use codes from the instructions table, for example 1 farming, 2 off-highway business use, 3 export, 5 boats in commercial fishing, 9 foreign trade), and registered ultimate vendors, credit card issuers, and diesel-water blenders. Enter the gallons on each line; where a line has a type of use box, also enter the type of use number.

**What the engine computes.** The amount of credit for each brace group (gallons times the rate printed on the form, with the same-rate rows of a line added together and shown on the group's last row), and line 17, which is placed on Schedule 3 line 12 in a full return. For 2025 the form also asks for the actual fuel cost of each group (line_cost fields) and Part I business information.

**What to verify.** Claims already made on Form 8849 or Form 720 Schedule C cannot be repeated here. For 2024 only, lines 10 (biodiesel, renewable diesel, and sustainable aviation fuel mixtures) and 12 (alternative fuel credit) apply and need the registration number; those credits expired for 2025. Keep the seller's name, address, and purchase dates for each fuel claim.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const year = ctx.year;
    let total = 0;
    let group: Array<{ key: string; gallons: number; rate: number; amount: number }> = [];
    let missingUse: string[] = [];
    for (const row of FUEL_ROWS) {
      const y = row.byYear[year];
      if (!y) continue;
      const gallons = Number(values[`line${row.key}_gallons`]) || 0;
      let rate = y.rate ?? 0;
      if (y.rateBox) {
        const r = Number(values[`line${row.key}_rate`]) || 0;
        rate = r > 0 ? r : 1.25;
        if (gallons > 0 && !(r > 0)) c.setScalar(`line${row.key}_rate`, "1.25", "Credit rate", "default sustainable aviation fuel rate", row.key);
      }
      if (gallons > 0) {
        const amount = Math.round(gallons * rate * 100) / 100;
        group.push({ key: row.key, gallons, rate, amount });
        if (y.use && !String(values[`line${row.key}_use`] ?? "").trim()) missingUse.push(row.key);
      }
      if (y.amtD) {
        const sum = group.reduce((a, g) => a + g.amount, 0);
        if (sum > 0) {
          const [d, cents] = split(sum);
          c.setScalar(`line${row.key}_amount`, d, `${row.title}: credit for the line ${row.key} group`, group.map((g) => `${g.key}: ${g.gallons.toLocaleString()} gal x $${g.rate}`).join(" + "), row.key);
          c.setScalar(`line${row.key}_amount_cents`, cents, "Cents", `${f(sum)}`, row.key);
          c.computations.push({ id: `line${row.key}_amount`, line: row.key, label: `${row.title}: credit for the line ${row.key} group`, value: sum, formula: group.map((g) => `${g.key}: ${g.gallons.toLocaleString()} gal x $${g.rate} = ${f(g.amount)}`).join(" + ") });
          total += sum;
        }
        group = [];
      }
    }
    const [d17, c17] = split(total);
    c.setScalar("line17_dollars", d17, "Total credit (dollars)", `${f(total)}`, "17");
    c.setScalar("line17_cents", c17, "Total credit (cents)", `${f(total)}`, "17");
    c.set("line17", Math.round(total), "Total income tax credit claimed (to Schedule 3 line 12)", `sum of the line amounts = ${f(total)}`, "17");
    if (missingUse.length) c.warn(`Enter the type of use number for line${missingUse.length > 1 ? "s" : ""} ${missingUse.join(", ")} (line_use fields); the CRN depends on it.`);
    if (year === 2025 && total > 0 && !c.has("lineA")) c.warn("Answer Part I line A (qualifying business activity) and enter the business information in lines B through F; the IRS requires it for 2025.");
    const regs: Array<[string, string]> = [["6", "line6_registration"], ["7", "line7_registration"], ["8", "line8_registration"], ["13", "line13_registration"], ["15", "line15_registration"], ...(year === 2024 ? [["10", "line10_registration"], ["12", "line12_registration"]] as Array<[string, string]> : [])];
    for (const [line, id] of regs) {
      const any = FUEL_ROWS.some((r) => r.line === line && r.byYear[year] && (Number(values[`line${r.key}_gallons`]) || 0) > 0);
      if (any && !c.str(id)) c.warn(`Line ${line} requires your registration number (${id}).`);
    }
    return c.result();
  },
};
