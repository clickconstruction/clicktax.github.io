import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow } from "../types.ts";

/** Rev. December 2025 PDF (root Form8283[0]) serves both years; widget names are identical. */
const rows4 = (fn: (r: number) => string) => [1, 2, 3, 4].map(fn);
const rows3 = (fn: (r: number) => string) => [1, 2, 3].map(fn);
const A = ["A", "B", "C", "D"];
const sectionALocate = {
  donee: rows4((r) => `Page1[0].Table_Line1_ColsA-C[0].Row1${A[r - 1]}[0].f1_${5 + 3 * (r - 1)}[0]`),
  vehicle: rows4((r) => `Page1[0].Table_Line1_ColsA-C[0].Row1${A[r - 1]}[0].ColB[0].c1_${1 + r}[0]`),
  vin: rows4((r) => `Page1[0].Table_Line1_ColsA-C[0].Row1${A[r - 1]}[0].ColB[0].f1_${6 + 3 * (r - 1)}[0]`),
  description: rows4((r) => `Page1[0].Table_Line1_ColsA-C[0].Row1${A[r - 1]}[0].f1_${7 + 3 * (r - 1)}[0]`),
  date_contributed: rows4((r) => `Page1[0].Table_Line1_ColsD-I[0].Row1${A[r - 1]}[0].f1_${17 + 6 * (r - 1)}[0]`),
  date_acquired: rows4((r) => `Page1[0].Table_Line1_ColsD-I[0].Row1${A[r - 1]}[0].f1_${18 + 6 * (r - 1)}[0]`),
  how_acquired: rows4((r) => `Page1[0].Table_Line1_ColsD-I[0].Row1${A[r - 1]}[0].f1_${19 + 6 * (r - 1)}[0]`),
  cost: rows4((r) => `Page1[0].Table_Line1_ColsD-I[0].Row1${A[r - 1]}[0].f1_${20 + 6 * (r - 1)}[0]`),
  fmv: rows4((r) => `Page1[0].Table_Line1_ColsD-I[0].Row1${A[r - 1]}[0].f1_${21 + 6 * (r - 1)}[0]`),
  method: rows4((r) => `Page1[0].Table_Line1_ColsD-I[0].Row1${A[r - 1]}[0].f1_${22 + 6 * (r - 1)}[0]`),
};
const rowB = (r: number) => (r === 1 ? "Row3A" : r === 2 ? "Line3B" : "Line3C");
const sectionBLocate = {
  description: rows3((r) => `Page1[0].Table_Line3_ColsA-C[0].${rowB(r)}[0].f1_${42 + 3 * (r - 1)}[0]`),
  condition: rows3((r) => `Page1[0].Table_Line3_ColsA-C[0].${rowB(r)}[0].f1_${43 + 3 * (r - 1)}[0]`),
  appraised_fmv: rows3((r) => `Page1[0].Table_Line3_ColsA-C[0].${rowB(r)}[0].f1_${44 + 3 * (r - 1)}[0]`),
  date_acquired: rows3((r) => `Page1[0].Table_Line3_ColsD-I[0].Row3${A[r - 1]}[0].f1_${51 + 6 * (r - 1)}[0]`),
  how_acquired: rows3((r) => `Page1[0].Table_Line3_ColsD-I[0].Row3${A[r - 1]}[0].f1_${52 + 6 * (r - 1)}[0]`),
  cost: rows3((r) => `Page1[0].Table_Line3_ColsD-I[0].Row3${A[r - 1]}[0].f1_${53 + 6 * (r - 1)}[0]`),
  bargain_sale_amount: rows3((r) => `Page1[0].Table_Line3_ColsD-I[0].Row3${A[r - 1]}[0].f1_${54 + 6 * (r - 1)}[0]`),
  amount_claimed: rows3((r) => `Page1[0].Table_Line3_ColsD-I[0].Row3${A[r - 1]}[0].f1_${55 + 6 * (r - 1)}[0]`),
  date_contributed: rows3((r) => `Page1[0].Table_Line3_ColsD-I[0].Row3${A[r - 1]}[0].f1_${56 + 6 * (r - 1)}[0]`),
};
const TYPE: Record<string, string> = { art_over_20k: "Page1[0].Lines2a-c[0].c1_6[0]", conservation: "Page1[0].Lines2a-c[0].c1_6[1]", historic_structure: "Page1[0].Lines2a-c[0].c1_7[0]", art_under_20k: "Page1[0].Lines2a-c[0].c1_6[2]", other_real_estate: "Page1[0].Lines2d-h[0].c1_6[0]", equipment: "Page1[0].Lines2d-h[0].c1_6[1]", securities: "Page1[0].Lines2d-h[0].c1_6[2]", collectibles: "Page1[0].Lines2d-h[0].c1_6[3]", intellectual_property: "Page1[0].Lines2d-h[0].c1_6[4]", vehicles: "Page1[0].Lines2i-l[0].c1_6[0]", clothing_household: "Page1[0].Lines2i-l[0].c1_6[1]", digital_assets: "Page1[0].Lines2i-l[0].c1_6[2]", other: "Page1[0].Lines2i-l[0].c1_6[3]" };
const text = (id: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, label, type: "text", locate: { name }, ...extra });

const fields: FieldDef[] = [
  text("name", "Name(s) shown on your income tax return", "Page1[0].f1_1[0]"),
  { id: "ssn", label: "Identifying number", type: "ssn", locate: { name: "Page1[0].f1_2[0]" } },
  text("partnership_name", "Name of partnership or S corporation (if the deduction passes through from one)", "Page1[0].f1_3[0]"),
  text("partnership_ein", "Partnership or S corporation identifying number", "Page1[0].f1_4[0]", { maxLen: 11 }),
  { id: "family_pass_through", label: "Check if a family pass-through entity made the contribution", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  {
    id: "section_a", line: "Section A, 1", label: "Items (or groups of similar items) valued at $5,000 or less, and publicly traded securities (up to 4 rows)", type: "list", rows: 4,
    items: [
      { id: "donee", label: "(a) Name and address of the donee organization", type: "text" },
      { id: "vehicle", label: "(b) Check if a vehicle, boat, or airplane (attach Form 1098-C)", type: "checkbox" },
      { id: "vin", label: "(b) Vehicle identification number", type: "text", maxLen: 17 },
      { id: "description", label: "(c) Description and condition of the property (for securities, company name and number of shares)", type: "text" },
      { id: "date_contributed", label: "(d) Date of the contribution", type: "text" },
      { id: "date_acquired", label: "(e) Date acquired by donor (month, year)", type: "text" },
      { id: "how_acquired", label: "(f) How acquired (purchase, gift, inheritance...)", type: "text" },
      { id: "cost", label: "(g) Donor's cost or adjusted basis", type: "money" },
      { id: "fmv", label: "(h) Fair market value", type: "money" },
      { id: "method", label: "(i) Method used to determine the fair market value (comparable sales, thrift shop value, appraisal...)", type: "text" },
    ],
    listLocate: { 2024: sectionALocate, 2025: sectionALocate },
  },
  { id: "property_type", line: "Section B, 2", label: "Type of property over $5,000 (Section B)", type: "choice", choices: Object.keys(TYPE), locate: Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [k, { name: v }])) },
  text("nps_number", "National Park Service number for a certified historic structure", "Page1[0].Lines2a-c[0].f1_41[0]"),
  {
    id: "section_b", line: "Section B, 3", label: "Items valued over $5,000 that need a qualified appraisal (up to 3 rows)", type: "list", rows: 3,
    items: [
      { id: "description", label: "(a) Description of donated property (for real estate, the address)", type: "text" },
      { id: "condition", label: "(b) Physical condition at the time of the gift (tangible property)", type: "text" },
      { id: "appraised_fmv", label: "(c) Appraised fair market value", type: "money" },
      { id: "date_acquired", label: "(d) Date acquired (month, year)", type: "text" },
      { id: "how_acquired", label: "(e) How acquired", type: "text" },
      { id: "cost", label: "(f) Donor's cost or adjusted basis", type: "money" },
      { id: "bargain_sale_amount", label: "(g) For bargain sales, amount received", type: "money" },
      { id: "amount_claimed", label: "(h) Amount claimed as a deduction", type: "money" },
      { id: "date_contributed", label: "(i) Date of the contribution", type: "text" },
    ],
    listLocate: { 2024: sectionBLocate, 2025: sectionBLocate },
  },
  text("name_page2", "Name(s) shown on return (page 2)", "Page2[0].f2_1[0]", { computed: true }),
  { id: "ssn_page2", label: "Identifying number (page 2)", type: "ssn", computed: true, locate: { name: "Page2[0].f2_2[0]" } },
  text("partial_interest_item", "Part II, 4a: the letter from Section B Part I identifying the property with a partial interest", "Page2[0].f2_3[0]", { line: "4a", maxLen: 1 }),
  { id: "partial_interest_this_year", line: "4b(1)", label: "Total amount claimed as a deduction for this property this year", type: "money", locate: { name: "Page2[0].f2_4[0]" } },
  { id: "partial_interest_prior_years", line: "4b(2)", label: "Total amount claimed as a deduction for this property in prior years", type: "money", locate: { name: "Page2[0].f2_5[0]" } },
  text("prior_donee", "4c: name and address of any organization that received a prior contribution of the property", "Page2[0].f2_6[0]", { line: "4c" }),
  text("prior_donee_city", "4c: city, state, ZIP of that organization", "Page2[0].f2_7[0]", { line: "4c" }),
  text("prior_donee_year", "4c: tax year of the prior contribution", "Page2[0].f2_8[0]", { line: "4c" }),
  text("tangible_location", "4d: where tangible property is located or kept", "Page2[0].f2_9[0]", { line: "4d" }),
  text("possessor_name", "4e: name of any person other than the donee with actual possession", "Page2[0].f2_10[0]", { line: "4e" }),
  text("possessor_address", "4e: that person's address", "Page2[0].f2_11[0]", { line: "4e" }),
  { id: "restriction_use", line: "5a", label: "Is there a restriction, temporary or permanent, on the donee's right to use or dispose of the property?", type: "yesno", locate: { yes: { name: "Page2[0].c2_1[0]" }, no: { name: "Page2[0].c2_1[1]" } } },
  { id: "restriction_income", line: "5b", label: "Did you give anyone other than the donee the right to income from the property or to possess it?", type: "yesno", locate: { yes: { name: "Page2[0].c2_2[0]" }, no: { name: "Page2[0].c2_2[1]" } } },
  { id: "restriction_purpose", line: "5c", label: "Is there a restriction limiting the property to a particular use?", type: "yesno", locate: { yes: { name: "Page2[0].c2_3[0]" }, no: { name: "Page2[0].c2_3[1]" } } },
  text("appraiser_statement", "Part III: appraiser declaration details (if more space is needed)", "Page2[0].f2_12[0]"),
  text("appraiser_name", "Part III: appraiser's name", "Page2[0].f2_13[0]"),
  text("appraiser_title", "Part III: appraiser's title", "Page2[0].f2_14[0]"),
  text("appraiser_address", "Part III: appraiser's business address", "Page2[0].f2_15[0]"),
  text("appraiser_id", "Part III: appraiser's identifying number", "Page2[0].f2_16[0]", { maxLen: 11 }),
  text("appraiser_city", "Part III: appraiser's city, state, ZIP", "Page2[0].f2_17[0]"),
  text("appraisal_date", "Part III: date of the appraisal signature", "Page2[0].f2_18[0]"),
  { id: "donee_unrelated_use", line: "Part IV", label: "Does the organization intend to use the property for an unrelated use?", type: "yesno", locate: { yes: { name: "Page2[0].c2_4[0]" }, no: { name: "Page2[0].c2_4[1]" } } },
  text("donee_name", "Part IV: name of the charitable organization (donee)", "Page2[0].f2_19[0]"),
  text("donee_ein", "Part IV: donee employer identification number", "Page2[0].f2_20[0]", { maxLen: 10 }),
  text("donee_address", "Part IV: donee address", "Page2[0].f2_21[0]"),
  text("donee_city", "Part IV: donee city, state, ZIP", "Page2[0].f2_22[0]"),
  text("donee_signature_date", "Part IV: date signed by the donee", "Page2[0].f2_23[0]"),
  { id: "section_a_total", label: "Total fair market value of Section A items", type: "money", computed: true, alwaysShow: true },
  { id: "section_b_total", label: "Total amount claimed for Section B items", type: "money", computed: true, alwaysShow: true },
];

export const form8283: FormDef = {
  id: "f8283",
  title: "Form 8283, Noncash Charitable Contributions",
  shortTitle: "Form 8283",
  description: "Required when noncash gifts to charity exceed $500: Section A lists items up to $5,000 and publicly traded securities; Section B covers items over $5,000 with the appraiser's declaration and the donee's acknowledgment. Supports Schedule A line 12.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8283.pdf",
  notes: `**When it is required.** Total noncash contributions over $500 for the year. Items (or groups of similar items) over $5,000 need a qualified appraisal and Section B signed by the appraiser and the donee; over $500,000 the appraisal itself is attached. Vehicles need Form 1098-C.

**What the engine does.** Places the item rows (4 in Section A, 3 in Section B), the property-type box, and the Part II-IV answers; totals the Section A fair market values and the Section B amounts claimed for your Schedule A line 12 check. It does not value anything.

**What to verify.** Clothing and household items must be in good used condition or better; the deduction for property held one year or less is limited to basis; Section B requires signatures that cannot be produced here, so print and sign.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const n = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
    const a = c.list("section_a"), b = c.list("section_b");
    c.out["name_page2"] = values["name"] ?? "";
    c.out["ssn_page2"] = values["ssn"] ?? "";
    const at = c.set("section_a_total", a.reduce((s, r) => s + n(r, "fmv"), 0), "Section A fair market value", "sum of (h)", "Section A");
    const bt = c.set("section_b_total", b.reduce((s, r) => s + n(r, "amount_claimed"), 0), "Section B amount claimed", "sum of (h)", "Section B");
    for (const [i, r] of a.entries()) if (n(r, "fmv") > 5000 && !/securit|stock|shares|fund/i.test(String(r["description"] ?? ""))) c.warn(`section_a[${i}] is valued over $5,000: it belongs in Section B with a qualified appraisal unless it is publicly traded securities.`);
    for (const [i, r] of a.entries()) if (r["vehicle"] === true && !String(r["vin"] ?? "").trim()) c.warn(`section_a[${i}] is a vehicle: enter the VIN and attach Form 1098-C.`);
    if (b.length && !c.str("appraiser_name")) c.warn("Section B items need Part III completed and signed by a qualified appraiser.");
    if (b.length && !c.str("donee_name")) c.warn("Section B items need Part IV completed and signed by the donee organization.");
    if (at + bt > 0 && at + bt <= 500) c.warn(`Noncash gifts total ${f(at + bt)}: Form 8283 is required only when they exceed $500.`);
    return c.result();
  },
};
