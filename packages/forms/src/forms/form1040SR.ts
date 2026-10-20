import { form1040 } from "./form1040.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

/**
 * Form 1040-SR is the Form 1040 with larger type on four pages. Every line keeps its number, so the amount boxes are
 * found by the same line tokens without a page constraint; the header boxes, checkboxes, and the dependents table have
 * their own widget names, listed here for each year.
 */
type Y = Partial<Record<TaxYear, string>>;
const N = (y24: string, y25: string): Y => ({ 2024: y24, 2025: y25 });
const SR_NAMES: Record<string, Y> = {
  first_name: N("Page1[0].f1_04[0]", "Page1[0].f1_14[0]"), last_name: N("Page1[0].f1_05[0]", "Page1[0].f1_15[0]"), ssn: N("Page1[0].YourSocial[0].f1_06[0]", "Page1[0].YourSocial[0].f1_16[0]"),
  spouse_first_name: N("Page1[0].f1_07[0]", "Page1[0].f1_17[0]"), spouse_last_name: N("Page1[0].f1_08[0]", "Page1[0].f1_18[0]"), spouse_ssn: N("Page1[0].SpousesSocial[0].f1_09[0]", "Page1[0].f1_19[0]"),
  address: N("Page1[0].Address[0].f1_10[0]", "Page1[0].Address[0].f1_20[0]"), apt: N("Page1[0].Address[0].f1_11[0]", "Page1[0].Address[0].f1_21[0]"), city: N("Page1[0].Address[0].f1_12[0]", "Page1[0].Address[0].f1_22[0]"), state: N("Page1[0].Address[0].f1_13[0]", "Page1[0].Address[0].f1_23[0]"), zip: N("Page1[0].Address[0].f1_14[0]", "Page1[0].Address[0].f1_24[0]"),
  foreign_country: N("Page1[0].Address[0].f1_15[0]", "Page1[0].Address[0].f1_25[0]"), foreign_province: N("Page1[0].Address[0].f1_16[0]", "Page1[0].Address[0].f1_26[0]"), foreign_postal_code: N("Page1[0].Address[0].f1_17[0]", "Page1[0].Address[0].f1_27[0]"),
  presidential_campaign_you: N("Page1[0].c1_01[0]", "Page1[0].c1_6[0]"), presidential_campaign_spouse: N("Page1[0].c1_02[0]", "Page1[0].c1_7[0]"),
  mfs_spouse_name: N("Page1[0].f1_18[0]", "Page1[0].Single_ReadOrder[0].f1_28[0]"), qualifying_child_name: N("Page1[0].f1_18[0]", "Page1[0].f1_29[0]"),
  nra_spouse_election: N("Page1[0].c1_04[0]", "Page1[0].c1_9[0]"), nra_spouse_name: N("Page1[0].f1_19[0]", "Page1[0].f1_30[0]"),
  claimed_as_dependent_you: N("Page1[0].c1_06[0]", "Page2[0].c2_13[0]"), claimed_as_dependent_spouse: N("Page1[0].c1_07[0]", "Page2[0].c2_14[0]"), spouse_itemizes: N("Page1[0].c1_08[0]", "Page2[0].c2_15[0]"),
  you_65_or_older: N("Page1[0].c1_09[0]", "Page2[0].Line12d_ReadOrder[0].c2_17[0]"), you_blind: N("Page1[0].c1_10[0]", "Page2[0].Line12d_ReadOrder[0].c2_18[0]"), spouse_65_or_older: N("Page1[0].c1_11[0]", "Page2[0].Line12d_ReadOrder[0].c2_19[0]"), spouse_blind: N("Page1[0].c1_12[0]", "Page2[0].Line12d_ReadOrder[0].c2_20[0]"),
  more_than_four_dependents: N("Page1[0].Dependents[0].c1_13[0]", "Page1[0].Dependents_ReadOrder[0].c1_11[0]"),
  lump_sum_election: N("Page1[0].Line6c_ReadOrder[0].c1_22[0]", "Page2[0].Line6c_ReadOrder[0].c2_9[0]"), schedule_d_not_required: N("Page2[0].Line7_ReadOrder[0].c2_01[0]", "Page2[0].c2_11[0]"),
  routing_number: N("Page3[0].RoutingNo[0].f3_03[0]", "Page3[0].RoutingNo[0].f3_16[0]"), account_number: N("Page3[0].AccountNo[0].f3_04[0]", "Page3[0].AccountNo[0].f3_17[0]"),
  designee_name: N("Page3[0].f3_08[0]", "Page3[0].f3_21[0]"), designee_phone: N("Page3[0].f3_09[0]", "Page3[0].f3_22[0]"), designee_pin: N("Page3[0].f3_10[0]", "Page3[0].f3_23[0]"),
  occupation: N("Page3[0].SignHere[0].f3_11[0]", "Page3[0].f3_24[0]"), identity_protection_pin: N("Page3[0].SignHere[0].f3_12[0]", "Page3[0].f3_25[0]"), spouse_occupation: N("Page3[0].SignHere[0].f3_13[0]", "Page3[0].f3_26[0]"), spouse_identity_protection_pin: N("Page3[0].SignHere[0].f3_14[0]", "Page3[0].f3_27[0]"),
  phone: N("Page3[0].SignHere[0].f3_15[0]", "Page3[0].f3_28[0]"), email: N("Page3[0].SignHere[0].f3_16[0]", "Page3[0].f3_29[0]"),
};
const SR_ONLY_2025: Record<string, string> = { dual_status_alien: "Page2[0].c2_16[0]", line1h_type: "Page1[0].Line1h_ReadOrder[0].f1_54[0]" };
const SR_GROUPS: Record<string, Record<string, Y>> = {
  filing_status: { single: N("Page1[0].c1_03[0]", "Page1[0].Single_ReadOrder[0].c1_8[0]"), mfj: N("Page1[0].c1_03[1]", "Page1[0].c1_8[0]"), mfs: N("Page1[0].c1_03[2]", "Page1[0].c1_8[1]"), hoh: N("Page1[0].c1_03[3]", "Page1[0].Single_ReadOrder[0].c1_8[1]"), qss: N("Page1[0].c1_03[4]", "Page1[0].Single_ReadOrder[0].c1_8[2]") },
  digital_assets: { yes: N("Page1[0].c1_05[0]", "Page1[0].c1_10[0]"), no: N("Page1[0].c1_05[1]", "Page1[0].c1_10[1]") },
  account_type: { checking: N("Page3[0].c3_02[0]", "Page3[0].c3_5[0]"), savings: N("Page3[0].c3_02[1]", "Page3[0].c3_5[1]") },
  third_party_designee: { yes: N("Page3[0].c3_03[0]", "Page3[0].c3_6[0]"), no: N("Page3[0].c3_03[1]", "Page3[0].c3_6[1]") },
};
const dep24 = (n: number) => [1, 2, 3, 4].map((r) => `Page1[0].DependentsTable[0].Row${r}[0].f1_${n + 3 * (r - 1)}[0]`);
const depc24 = (n: number) => [1, 2, 3, 4].map((r) => `Page1[0].DependentsTable[0].Row${r}[0].c1_${n + 2 * (r - 1)}[0]`);
const dep25 = (row: number, n: number) => [0, 1, 2, 3].map((i) => `Page1[0].Table_Dependents[0].Row${row}[0].f1_${n + i}[0]`);
const depc25 = (row: number, n: number, step: number, idx = 0) => [0, 1, 2, 3].map((i) => `Page1[0].Table_Dependents[0].Row${row}[0].Dependent${i + 1}[0].c1_${n + step * i}[${idx}]`);
const SR_DEPENDENTS = {
  2024: { name: dep24(20), ssn: dep24(21), relationship: dep24(22), child_tax_credit: depc24(14), other_dependents_credit: depc24(15) },
  2025: { first_name: dep25(1, 31), last_name: dep25(2, 35), ssn: dep25(3, 39), relationship: dep25(4, 43), lived_with_you: depc25(5, 12, 2), lived_in_us: depc25(5, 13, 2), full_time_student: depc25(7, 20, 2), permanently_disabled: depc25(7, 21, 2), child_tax_credit: depc25(8, 28, 1, 0), other_dependents_credit: depc25(8, 28, 1, 1) },
};

function remap(field: FieldDef): FieldDef {
  const out: FieldDef = { ...field };
  const loc = field.locate as Record<string, unknown> | undefined;
  if (field.id === "dependents") { out.listLocate = SR_DEPENDENTS; return out; }
  if (field.id === "use_1040sr") { delete out.locate; return out; }
  const group = SR_GROUPS[field.id];
  if (group) { out.locate = Object.fromEntries(Object.entries(group).map(([k, v]) => [k, { names: v }])); return out; }
  const names = SR_NAMES[field.id];
  if (names) { out.locate = { names }; return out; }
  const only25 = SR_ONLY_2025[field.id];
  if (only25) { out.locate = { names: { 2025: only25 } }; return out; }
  if (loc && "tok" in loc) { const { page: _page, ...rest } = loc as { page?: unknown }; void _page; out.locate = rest as unknown as NonNullable<FieldDef["locate"]>; return out; }
  if (loc && ("names" in loc || "name" in loc)) { delete out.locate; return out; }
  return out;
}

const fields: FieldDef[] = [
  ...form1040.fields.map(remap),
  { id: "std_boxes_count", label: "Number of age/blindness boxes checked (Standard Deduction Chart on the last page)", type: "integer", computed: true, locate: { names: { 2024: "Page4[0].f4_01[0]", 2025: "Page4[0].f4_01[0]" } } },
];

export const form1040SR: FormDef = {
  ...form1040,
  id: "f1040sr",
  title: "Form 1040-SR, U.S. Tax Return for Seniors",
  shortTitle: "Form 1040-SR",
  description: "The same return as Form 1040 printed in larger type over four pages with a standard deduction chart, available to anyone born before January 2 of the year after the tax year minus 65. Identical lines and computations; same inputs as Form 1040.",
  fields,
  notes: `${form1040.notes}\n\n**Form 1040-SR.** Optional for filers age 65 or older (and their spouse on a joint return); it accepts every schedule and form the regular Form 1040 does. Supply the same inputs as for Form 1040, or set use_1040sr on a full return to render the main form on this layout.`,
  compute(values, ctx) {
    const r = form1040.compute(values, ctx);
    const boxes = ["you_65_or_older", "you_blind", "spouse_65_or_older", "spouse_blind"].filter((k) => values[k] === true).length;
    r.values["std_boxes_count"] = boxes;
    if (!values["you_65_or_older"] && !values["spouse_65_or_older"]) r.warnings.push("Form 1040-SR is for filers age 65 or older (or a spouse 65 or older on a joint return); check you_65_or_older or spouse_65_or_older, or use Form 1040.");
    return r;
  },
};
