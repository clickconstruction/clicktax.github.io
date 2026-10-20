import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import { incomeTax, qdcgWorksheet } from "../tax.ts";
import { FILING_STATUSES, type FieldDef, type FilingStatus, type FormDef, type TaxYear } from "../types.ts";

type Y = Partial<Record<TaxYear, string>>;
const names = (y24: string, y25: string): { names: Y } => ({ names: { 2024: y24, 2025: y25 } });
const tok = (line: string | Y, page: number | Partial<Record<TaxYear, number>>) => ({ tok: line, page, kind: "text" as const });
const amt = (id: string, line: string, label: string, page: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: tok(line, page), ...extra });
const comp = (id: string, line: string, label: string, page: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, page, { computed: true, notes, ...extra });

const DEP = (i: number) => ({
  // 2024: one table row per dependent (name, SSN, relationship, CTC box, ODC box)
  name24: `Page1[0].Table_Dependents[0].Row${i}[0].f1_${20 + 3 * (i - 1)}[0]`,
  ssn24: `Page1[0].Table_Dependents[0].Row${i}[0].f1_${21 + 3 * (i - 1)}[0]`,
  rel24: `Page1[0].Table_Dependents[0].Row${i}[0].f1_${22 + 3 * (i - 1)}[0]`,
  ctc24: `Page1[0].Table_Dependents[0].Row${i}[0].c1_${14 + 2 * (i - 1)}[0]`,
  odc24: `Page1[0].Table_Dependents[0].Row${i}[0].c1_${15 + 2 * (i - 1)}[0]`,
  // 2025: one table column per dependent
  first25: `Page1[0].Table_Dependents[0].Row1[0].f1_${30 + i}[0]`,
  last25: `Page1[0].Table_Dependents[0].Row2[0].f1_${34 + i}[0]`,
  ssn25: `Page1[0].Table_Dependents[0].Row3[0].f1_${38 + i}[0]`,
  rel25: `Page1[0].Table_Dependents[0].Row4[0].f1_${42 + i}[0]`,
  lived25: `Page1[0].Table_Dependents[0].Row5[0].Dependent${i}[0].c1_${12 + 2 * (i - 1)}[0]`,
  inUs25: `Page1[0].Table_Dependents[0].Row5[0].Dependent${i}[0].c1_${13 + 2 * (i - 1)}[0]`,
  student25: `Page1[0].Table_Dependents[0].Row6[0].Dependent${i}[0].c1_${20 + 2 * (i - 1)}[0]`,
  disabled25: `Page1[0].Table_Dependents[0].Row6[0].Dependent${i}[0].c1_${21 + 2 * (i - 1)}[0]`,
  ctc25: `Page1[0].Table_Dependents[0].Row7[0].Dependent${i}[0].c1_${27 + i}[0]`,
  odc25: `Page1[0].Table_Dependents[0].Row7[0].Dependent${i}[0].c1_${27 + i}[1]`,
});
const deps = [1, 2, 3, 4].map(DEP);
const col = (k: keyof ReturnType<typeof DEP>) => deps.map((d) => d[k]);

const fields: FieldDef[] = [
  { id: "first_name", label: "Your first name and middle initial", type: "text", locate: names("Page1[0].f1_04[0]", "Page1[0].f1_14[0]") },
  { id: "last_name", label: "Last name", type: "text", locate: names("Page1[0].f1_05[0]", "Page1[0].f1_15[0]") },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: names("Page1[0].f1_06[0]", "Page1[0].f1_16[0]") },
  { id: "spouse_first_name", label: "If joint return, spouse's first name and middle initial", type: "text", locate: names("Page1[0].f1_07[0]", "Page1[0].f1_17[0]") },
  { id: "spouse_last_name", label: "Spouse's last name", type: "text", locate: names("Page1[0].f1_08[0]", "Page1[0].f1_18[0]") },
  { id: "spouse_ssn", label: "Spouse's social security number", type: "ssn", maxLen: 9, locate: names("Page1[0].f1_09[0]", "Page1[0].f1_19[0]") },
  { id: "address", label: "Home address (number and street)", type: "text", locate: names("Page1[0].Address_ReadOrder[0].f1_10[0]", "Page1[0].Address_ReadOrder[0].f1_20[0]") },
  { id: "apt", label: "Apt. no.", type: "text", locate: names("Page1[0].Address_ReadOrder[0].f1_11[0]", "Page1[0].Address_ReadOrder[0].f1_21[0]") },
  { id: "city", label: "City, town, or post office", type: "text", locate: names("Page1[0].Address_ReadOrder[0].f1_12[0]", "Page1[0].Address_ReadOrder[0].f1_22[0]") },
  { id: "state", label: "State", type: "text", maxLen: 2, locate: names("Page1[0].Address_ReadOrder[0].f1_13[0]", "Page1[0].Address_ReadOrder[0].f1_23[0]") },
  { id: "zip", label: "ZIP code", type: "text", locate: names("Page1[0].Address_ReadOrder[0].f1_14[0]", "Page1[0].Address_ReadOrder[0].f1_24[0]") },
  { id: "foreign_country", label: "Foreign country name", type: "text", locate: names("Page1[0].Address_ReadOrder[0].f1_15[0]", "Page1[0].Address_ReadOrder[0].f1_25[0]") },
  { id: "foreign_province", label: "Foreign province/state/county", type: "text", locate: names("Page1[0].Address_ReadOrder[0].f1_16[0]", "Page1[0].Address_ReadOrder[0].f1_26[0]") },
  { id: "foreign_postal_code", label: "Foreign postal code", type: "text", locate: names("Page1[0].Address_ReadOrder[0].f1_17[0]", "Page1[0].Address_ReadOrder[0].f1_27[0]") },
  { id: "presidential_campaign_you", label: "Presidential Election Campaign: you want $3 to go to the fund", type: "checkbox", locate: names("Page1[0].c1_1[0]", "Page1[0].c1_6[0]") },
  { id: "presidential_campaign_spouse", label: "Presidential Election Campaign: spouse wants $3 to go to the fund", type: "checkbox", locate: names("Page1[0].c1_2[0]", "Page1[0].c1_7[0]") },
  {
    id: "filing_status",
    label: "Filing status",
    type: "choice",
    choices: FILING_STATUSES,
    notes: "single, mfj (married filing jointly), mfs (married filing separately), hoh (head of household), qss (qualifying surviving spouse).",
    locate: {
      single: names("Page1[0].FilingStatus_ReadOrder[0].c1_3[0]", "Page1[0].Checkbox_ReadOrder[0].c1_8[0]"),
      mfj: names("Page1[0].FilingStatus_ReadOrder[0].c1_3[1]", "Page1[0].Checkbox_ReadOrder[0].c1_8[1]"),
      mfs: names("Page1[0].FilingStatus_ReadOrder[0].c1_3[2]", "Page1[0].Checkbox_ReadOrder[0].c1_8[2]"),
      hoh: names("Page1[0].c1_3[0]", "Page1[0].c1_8[0]"),
      qss: names("Page1[0].c1_3[1]", "Page1[0].c1_8[1]"),
    },
  },
  { id: "mfs_spouse_name", label: "If married filing separately: spouse's name", type: "text", locate: names("Page1[0].f1_18[0]", "Page1[0].Checkbox_ReadOrder[0].f1_28[0]") },
  { id: "qualifying_child_name", label: "If head of household or qualifying surviving spouse: child's name if the qualifying person is a child but not your dependent", type: "text", locate: names("Page1[0].f1_18[0]", "Page1[0].f1_29[0]") },
  { id: "nra_spouse_election", label: "Treating a nonresident alien or dual-status alien spouse as a U.S. resident for the entire tax year", type: "checkbox", locate: names("Page1[0].c1_4[0]", "Page1[0].c1_9[0]") },
  { id: "nra_spouse_name", label: "Nonresident alien spouse's name", type: "text", locate: names("Page1[0].f1_19[0]", "Page1[0].f1_30[0]") },
  { id: "digital_assets", label: "At any time during the year, did you receive, sell, exchange, or otherwise dispose of a digital asset?", type: "yesno", notes: "Must be answered Yes or No.", locate: { yes: names("Page1[0].c1_5[0]", "Page1[0].c1_10[0]"), no: names("Page1[0].c1_5[1]", "Page1[0].c1_10[1]") } },
  { id: "claimed_as_dependent_you", label: "Someone can claim you as a dependent", type: "checkbox", locate: names("Page1[0].c1_6[0]", "Page2[0].c2_1[0]") },
  { id: "claimed_as_dependent_spouse", label: "Someone can claim your spouse as a dependent", type: "checkbox", locate: names("Page1[0].c1_7[0]", "Page2[0].c2_2[0]") },
  { id: "spouse_itemizes", label: "Spouse itemizes on a separate return or you were a dual-status alien", type: "checkbox", locate: names("Page1[0].c1_8[0]", "Page2[0].c2_3[0]") },
  { id: "dual_status_alien", label: "You were a dual-status alien", type: "checkbox", years: [2025], locate: { names: { 2025: "Page2[0].c2_4[0]" } } },
  { id: "you_65_or_older", label: "You were born before January 2 of the year after the tax year minus 65 (age 65 or older)", type: "checkbox", locate: names("Page1[0].c1_9[0]", "Page2[0].c2_5[0]") },
  { id: "you_blind", label: "You are blind", type: "checkbox", locate: names("Page1[0].c1_10[0]", "Page2[0].c2_6[0]") },
  { id: "spouse_65_or_older", label: "Spouse is age 65 or older", type: "checkbox", locate: names("Page1[0].c1_11[0]", "Page2[0].c2_7[0]") },
  { id: "spouse_blind", label: "Spouse is blind", type: "checkbox", locate: names("Page1[0].c1_12[0]", "Page2[0].c2_8[0]") },
  { id: "more_than_four_dependents", label: "More than four dependents (see instructions and attach a statement)", type: "checkbox", locate: names("Page1[0].Dependents_ReadOrder[0].c1_13[0]", "Page1[0].Dependents_ReadOrder[0].c1_11[0]") },
  {
    id: "dependents",
    label: "Dependents (up to 4)",
    type: "list",
    rows: 4,
    items: [
      { id: "first_name", label: "First name", type: "text" },
      { id: "last_name", label: "Last name", type: "text" },
      { id: "name", label: "First and last name together (the 2024 layout has one box)", type: "text", computed: true, years: [2024] },
      { id: "ssn", label: "Social security number", type: "ssn", maxLen: 9 },
      { id: "relationship", label: "Relationship to you", type: "text" },
      { id: "child_tax_credit", label: "Qualifies for child tax credit", type: "checkbox" },
      { id: "other_dependents_credit", label: "Qualifies for credit for other dependents", type: "checkbox" },
      { id: "lived_with_you", label: "Lived with you more than half the year", type: "checkbox", years: [2025] },
      { id: "lived_in_us", label: "Lived in the U.S. more than half the year", type: "checkbox", years: [2025] },
      { id: "full_time_student", label: "Full-time student", type: "checkbox", years: [2025] },
      { id: "permanently_disabled", label: "Permanently and totally disabled", type: "checkbox", years: [2025] },
    ],
    listLocate: {
      2024: { name: col("name24"), ssn: col("ssn24"), relationship: col("rel24"), child_tax_credit: col("ctc24"), other_dependents_credit: col("odc24") },
      2025: { first_name: col("first25"), last_name: col("last25"), ssn: col("ssn25"), relationship: col("rel25"), child_tax_credit: col("ctc25"), other_dependents_credit: col("odc25"), lived_with_you: col("lived25"), lived_in_us: col("inUs25"), full_time_student: col("student25"), permanently_disabled: col("disabled25") },
    },
    notes: "For 2024 the PDF has a single name box per dependent; first and last names are joined.",
  },
  amt("line1a", "1a", "Total amount from Form(s) W-2, box 1", 1),
  amt("line1b", "1b", "Household employee wages not reported on Form(s) W-2", 1),
  amt("line1c", "1c", "Tip income not reported on line 1a", 1),
  amt("line1d", "1d", "Medicaid waiver payments not reported on Form(s) W-2", 1),
  amt("line1e", "1e", "Taxable dependent care benefits from Form 2441, line 26", 1),
  amt("line1f", "1f", "Employer-provided adoption benefits from Form 8839, line 29", 1),
  amt("line1g", "1g", "Wages from Form 8919, line 6", 1),
  { id: "use_1040sr", label: "Render on Form 1040-SR (the large-print return for filers 65 and over) instead of Form 1040", type: "checkbox" },
  { id: "line1h_type", line: "1h", label: "Other earned income: type", type: "text", years: [2025], locate: { names: { 2025: "Page1[0].f1_54[0]" } } },
  amt("line1h", "1h", "Other earned income", 1),
  amt("line1i", "1i", "Nontaxable combat pay election", 1),
  comp("line1z", "1z", "Add lines 1a through 1h", 1, "sum of 1a-1h"),
  amt("line2a", "2a", "Tax-exempt interest", 1),
  amt("line2b", "2b", "Taxable interest", 1),
  amt("line3a", "3a", "Qualified dividends", 1),
  amt("line3b", "3b", "Ordinary dividends", 1),
  amt("line4a", "4a", "IRA distributions", 1),
  amt("line4b", "4b", "IRA distributions: taxable amount", 1),
  amt("line5a", "5a", "Pensions and annuities", 1),
  amt("line5b", "5b", "Pensions and annuities: taxable amount", 1),
  amt("line6a", "6a", "Social security benefits", 1),
  amt("line6b", "6b", "Social security benefits: taxable amount", 1),
  { id: "lump_sum_election", line: "6c", label: "Lump-sum election method for social security benefits", type: "checkbox", locate: names("Page1[0].Line4a-11_ReadOrder[0].c1_22[0]", "Page1[0].c1_41[0]") },
  amt("line7", "7", "Capital gain or (loss) (Schedule D)", 1, { locate: tok({ 2024: "7", 2025: "7a" }, 1) }),
  { id: "schedule_d_not_required", line: "7", label: "Schedule D not required", type: "checkbox", locate: names("Page1[0].Line4a-11_ReadOrder[0].c1_23[0]", "Page1[0].c1_44[0]") },
  amt("line8", "8", "Additional income from Schedule 1, line 10", 1, { notes: "Filled from Schedule 1 when preparing a full return." }),
  comp("line9", "9", "Total income", 1, "1z + 2b + 3b + 4b + 5b + 6b + 7 + 8", { alwaysShow: true }),
  amt("line10", "10", "Adjustments to income from Schedule 1, line 26", 1, { notes: "Filled from Schedule 1 when preparing a full return." }),
  comp("line11", "11", "Adjusted gross income", 1, "line 9 - line 10", { locate: tok({ 2024: "11", 2025: "11a" }, 1), alwaysShow: true }),
  comp("line11b", "11b", "Amount from line 11a (adjusted gross income), carried to page 2", 2, "same as line 11a", { years: [2025], alwaysShow: true }),
  { id: "itemized_deductions", label: "Itemized deductions from Schedule A (supply only if itemizing; otherwise the standard deduction is computed)", type: "money" },
  comp("line12", "12", "Standard deduction or itemized deductions", 2, "standard deduction for filing status, plus additional amounts for age/blindness; or itemized_deductions if supplied", { locate: tok({ 2024: "12", 2025: "12e" }, { 2024: 1, 2025: 2 }), alwaysShow: true }),
  amt("line13", "13", "Qualified business income deduction from Form 8995 or Form 8995-A", 2, { locate: tok({ 2024: "13", 2025: "13a" }, { 2024: 1, 2025: 2 }), notes: "Filled from Form 8995 line 15 when preparing a full return." }),
  amt("line13b", "13b", "Additional deductions from Schedule 1-A, line 38 (tips, overtime, car loan interest, seniors)", 2, { years: [2025] }),
  comp("line14", "14", "Add lines 12 and 13 (and 13b for 2025)", 2, "line 12 + line 13 (+ 13b)", { locate: tok("14", { 2024: 1, 2025: 2 }) }),
  comp("line15", "15", "Taxable income", 2, "line 11 - line 14, not less than zero", { locate: tok("15", { 2024: 1, 2025: 2 }), alwaysShow: true }),
  { id: "line16_override", label: "Tax override (supply only when Schedule D's tax worksheet, Form 8615, or another method applies)", type: "money" },
  { id: "line16_additions", label: "Amounts added to the line 16 tax after the computation (Form 8814 line 15 tax on a child's income)", type: "money", noPdf: true },
  { id: "schedule_d_gain", label: "If Schedule D is filed: the smaller of Schedule D line 15 or line 16 (used by the capital gain tax worksheet instead of line 7)", type: "money" },
  { id: "feie_excluded", label: "Foreign earned income and housing amounts excluded on Form 2555 (lines 45 and 50); the tax is then figured with the Foreign Earned Income Tax Worksheet", type: "money", noPdf: true },
  comp("line16", "16", "Tax", 2, "Tax Table (under $100,000) or Tax Computation Worksheet on line 15; when qualified dividends or capital gains are present, the Qualified Dividends and Capital Gain Tax Worksheet", { alwaysShow: true }),
  amt("line17", "17", "Amount from Schedule 2, line 3", 2, { notes: "Filled from Schedule 2 when preparing a full return." }),
  comp("line18", "18", "Add lines 16 and 17", 2, "line 16 + line 17"),
  amt("line19", "19", "Child tax credit or credit for other dependents from Schedule 8812", 2, { notes: "Not computed; Schedule 8812 figures it." }),
  amt("line20", "20", "Amount from Schedule 3, line 8 (nonrefundable credits)", 2),
  comp("line21", "21", "Add lines 19 and 20", 2, "line 19 + line 20"),
  comp("line22", "22", "Subtract line 21 from line 18; if zero or less, enter 0", 2, "max(0, line 18 - line 21)"),
  amt("line23", "23", "Other taxes, including self-employment tax, from Schedule 2, line 21", 2, { notes: "Filled from Schedule 2 when preparing a full return." }),
  comp("line24", "24", "Total tax", 2, "line 22 + line 23", { alwaysShow: true }),
  amt("line25a", "25a", "Federal income tax withheld from Form(s) W-2", 2),
  amt("line25b", "25b", "Federal income tax withheld from Form(s) 1099", 2),
  amt("line25c", "25c", "Federal income tax withheld from other forms", 2),
  comp("line25d", "25d", "Add lines 25a through 25c", 2, "25a + 25b + 25c"),
  amt("line26", "26", "Estimated tax payments and amount applied from prior year return", 2),
  amt("line27", "27", "Earned income credit (EIC)", 2, { locate: tok({ 2024: "27", 2025: "27a" }, 2) }),
  amt("line28", "28", "Additional child tax credit from Schedule 8812", 2),
  amt("line29", "29", "American opportunity credit from Form 8863, line 8", 2),
  amt("line30", "30", "Refundable adoption credit from Form 8839", 2, { years: [2025] }),
  amt("line31", "31", "Amount from Schedule 3, line 15 (other payments and refundable credits)", 2),
  comp("line32", "32", "Total other payments and refundable credits", 2, "27 + 28 + 29 (+ 30) + 31"),
  comp("line33", "33", "Total payments", 2, "25d + 26 + 32", { alwaysShow: true }),
  comp("line34", "34", "Amount overpaid", 2, "line 33 - line 24 when line 33 is larger"),
  comp("line35a", "35a", "Amount of line 34 you want refunded to you", 2, "line 34 - line 36"),
  { id: "routing_number", line: "35b", label: "Routing number (direct deposit)", type: "text", maxLen: 9, locate: names("Page2[0].RoutingNo[0].f2_25[0]", "Page2[0].RoutingNo[0].f2_32[0]") },
  { id: "account_type", line: "35c", label: "Account type", type: "choice", choices: ["checking", "savings"], locate: { checking: names("Page2[0].c2_5[0]", "Page2[0].c2_16[0]"), savings: names("Page2[0].c2_5[1]", "Page2[0].c2_16[1]") } },
  { id: "account_number", line: "35d", label: "Account number (direct deposit)", type: "text", maxLen: 17, locate: names("Page2[0].AccountNo[0].f2_26[0]", "Page2[0].AccountNo[0].f2_33[0]") },
  amt("line36", "36", "Amount of line 34 you want applied to next year's estimated tax", 2),
  comp("line37", "37", "Amount you owe", 2, "line 24 - line 33 when line 24 is larger"),
  amt("line38", "38", "Estimated tax penalty", 2),
  { id: "third_party_designee", label: "Do you want to allow another person to discuss this return with the IRS?", type: "yesno", locate: { yes: names("Page2[0].c2_6[0]", "Page2[0].c2_17[0]"), no: names("Page2[0].c2_6[1]", "Page2[0].c2_17[1]") } },
  { id: "designee_name", label: "Designee's name", type: "text", locate: names("Page2[0].f2_30[0]", "Page2[0].f2_37[0]") },
  { id: "designee_phone", label: "Designee's phone number", type: "text", locate: names("Page2[0].f2_31[0]", "Page2[0].f2_38[0]") },
  { id: "designee_pin", label: "Designee's personal identification number (PIN)", type: "text", maxLen: 5, locate: names("Page2[0].f2_32[0]", "Page2[0].f2_39[0]") },
  { id: "occupation", label: "Your occupation", type: "text", locate: names("Page2[0].f2_33[0]", "Page2[0].f2_40[0]") },
  { id: "identity_protection_pin", label: "Identity Protection PIN (if the IRS sent you one)", type: "text", maxLen: 6, locate: names("Page2[0].f2_34[0]", "Page2[0].f2_41[0]") },
  { id: "spouse_occupation", label: "Spouse's occupation", type: "text", locate: names("Page2[0].f2_35[0]", "Page2[0].f2_42[0]") },
  { id: "spouse_identity_protection_pin", label: "Spouse's Identity Protection PIN", type: "text", maxLen: 6, locate: names("Page2[0].f2_36[0]", "Page2[0].f2_43[0]") },
  { id: "phone", label: "Phone number", type: "text", locate: names("Page2[0].f2_37[0]", "Page2[0].f2_44[0]") },
  { id: "email", label: "Email address", type: "text", locate: names("Page2[0].f2_38[0]", "Page2[0].f2_45[0]") },
];

function standardDeduction(c: Calc, status: FilingStatus): number {
  const p = params(c.ctx.year);
  const married = status === "mfj" || status === "mfs" || status === "qss";
  const extraCount = ["you_65_or_older", "you_blind"].filter((id) => c.bool(id)).length + (status === "single" || status === "hoh" ? 0 : ["spouse_65_or_older", "spouse_blind"].filter((id) => c.bool(id)).length);
  const extra = extraCount * (married ? p.additionalStandard.married : p.additionalStandard.unmarried);
  let base = p.standardDeduction[status];
  if (c.bool("claimed_as_dependent_you")) {
    const earned = c.has("earned_income") ? c.n("earned_income") : c.n("line1z");
    base = Math.min(base, Math.max(p.dependentStandard.floor, earned + p.dependentStandard.earnedPlus));
    c.warn(`You can be claimed as a dependent: standard deduction limited to the greater of $${f(p.dependentStandard.floor)} or earned income + $${p.dependentStandard.earnedPlus} (using earned income ${f(earned)}).`);
  }
  if (status === "mfs" && c.bool("spouse_itemizes")) {
    c.warn("Married filing separately and spouse itemizes: your standard deduction is 0; supply itemized_deductions.");
    return extra;
  }
  return base + extra;
}

export const form1040: FormDef = {
  id: "f1040",
  title: "Form 1040, U.S. Individual Income Tax Return",
  shortTitle: "Form 1040",
  description: "The main individual return. Income lines, adjusted gross income, standard deduction, tax, credits, payments, and the refund or amount owed.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040gi.pdf",
  notes: `**What this form is for.** The summary return. Schedules feed specific lines: Schedule 1 line 10 to line 8, Schedule 1 line 26 to line 10, Schedule 2 line 3 to line 17, Schedule 2 line 21 to line 23.

**What the engine computes.** Lines 1z, 9, 11, 12 (standard deduction unless itemized_deductions is supplied), 14, 15, 16 (tax table or computation worksheet), 18, 21, 22, 24, 25d, 32, 33, 34, 35a and 37.

**What the engine does not compute.** Credits other than the child tax credit (line 19 and line 28 come from Schedule 8812 when preparing a full return), the qualified business income deduction (line 13), and itemized deductions. Line 16 uses the Qualified Dividends and Capital Gain Tax Worksheet automatically when line 3a or line 7 is positive; Schedule D's 28% and section 1250 worksheets are not implemented (supply line16_override).

**2025 changes.** Line 7 became 7a, line 11 became 11a/11b, line 12 became 12e, line 13 became 13a with a new 13b for Schedule 1-A (tips, overtime, car loan interest, and senior deductions), line 27 became 27a, and line 30 is the refundable adoption credit.

**Things to verify before filing.** The digital assets question must be answered. Sign and date the paper return; this tool does not e-file.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") as FilingStatus;
    if (!FILING_STATUSES.includes(status)) c.warn("filing_status is missing or invalid; the standard deduction and tax cannot be computed.");
    const l1z = c.set("line1z", c.sum(["line1a", "line1b", "line1c", "line1d", "line1e", "line1f", "line1g", "line1h"]), "Total wages and other earned income", "1a + 1b + 1c + 1d + 1e + 1f + 1g + 1h", "1z");
    const incomeIds = ["line2b", "line3b", "line4b", "line5b", "line6b", "line7", "line8"];
    const parts: Array<[string, number]> = ([["1z", l1z] as [string, number], ...incomeIds.map((id): [string, number] => [id.replace("line", ""), c.n(id)])]).filter(([, v]) => v !== 0);
    const l9 = c.set("line9", l1z + c.sum(incomeIds), "Total income", parts.length ? c.show(parts) : "none", "9");
    const l10 = c.n("line10");
    const l11 = c.set("line11", l9 - l10, "Adjusted gross income", `line 9 ${f(l9)} - line 10 ${f(l10)}`, ctx.year === 2025 ? "11a" : "11");
    if (ctx.year === 2025) c.set("line11b", l11, "Adjusted gross income (carried to page 2)", `line 11a ${f(l11)}`, "11b");
    let l12 = 0;
    if (c.has("itemized_deductions")) {
      l12 = c.set("line12", c.n("itemized_deductions"), "Itemized deductions (Schedule A)", `itemized_deductions ${f(c.n("itemized_deductions"))}`, ctx.year === 2025 ? "12e" : "12");
      if (FILING_STATUSES.includes(status)) {
        const std = standardDeduction(c, status);
        if (std > l12) c.warn(`Itemized deductions (${f(l12)}) are less than the standard deduction (${f(std)}); the standard deduction is usually better.`);
      }
    } else if (FILING_STATUSES.includes(status)) {
      const std = standardDeduction(c, status);
      l12 = c.set("line12", std, "Standard deduction", `standard deduction for ${status} ${f(params(ctx.year).standardDeduction[status])}${std !== params(ctx.year).standardDeduction[status] ? ` adjusted for age/blindness/dependent status to ${f(std)}` : ""}`, ctx.year === 2025 ? "12e" : "12");
    }
    const l13 = c.n("line13") + (ctx.year === 2025 ? c.n("line13b") : 0);
    const l14 = c.set("line14", l12 + l13, "Add lines 12 and 13", `line 12 ${f(l12)} + line 13 ${f(l13)}`, "14");
    const l15 = c.set("line15", Math.max(0, l11 - l14), "Taxable income", `max(0, line 11 ${f(l11)} - line 14 ${f(l14)})`, "15");
    let l16 = 0;
    if (c.has("line16_override")) {
      l16 = c.set("line16", c.n("line16_override"), "Tax (supplied override)", `line16_override ${f(c.n("line16_override"))}`, "16");
    } else if (FILING_STATUSES.includes(status)) {
      const qd = c.n("line3a");
      const gain = c.has("schedule_d_gain") ? Math.max(0, c.n("schedule_d_gain")) : Math.max(0, c.n("line7"));
      const excluded = Math.max(0, c.n("feie_excluded"));
      if (excluded > 0) {
        // Foreign Earned Income Tax Worksheet: tax on taxable income plus the excluded amount, less the tax on the excluded amount alone.
        const taxOn = (ti: number) => (qd > 0 || gain > 0 ? qdcgWorksheet({ taxableIncome: ti, qualifiedDividends: qd, capitalGain: gain, status, year: ctx.year }).tax : incomeTax(ti, status, ctx.year));
        const t4 = taxOn(l15 + excluded);
        const t5 = incomeTax(excluded, status, ctx.year);
        l16 = c.set("line16", Math.max(0, t4 - t5), "Tax (Foreign Earned Income Tax Worksheet)", `tax on ${f(l15 + excluded)} = ${f(t4)}, less tax on the excluded ${f(excluded)} = ${f(t5)}`, "16");
      } else if (qd > 0 || gain > 0) {
        const w = qdcgWorksheet({ taxableIncome: l15, qualifiedDividends: qd, capitalGain: gain, status, year: ctx.year });
        l16 = c.set("line16", w.tax, "Tax (Qualified Dividends and Capital Gain Tax Worksheet)", `0% on ${f(w.lines[9]!)}, 15% on ${f(w.lines[17]!)}, 20% on ${f(w.lines[20]!)}, ordinary tax ${f(w.lines[22]!)} on ${f(w.lines[5]!)}; worksheet ${f(w.lines[23]!)} vs ordinary ${f(w.lines[24]!)}`, "16");
        if (qd > c.n("line3b")) c.warn("Line 3a (qualified dividends) exceeds line 3b (ordinary dividends); qualified dividends are a subset of ordinary dividends.");
        if (c.n("line7") > 0 && !c.has("schedule_d_gain")) c.warn("Line 7 is positive: if Schedule D is required (sales of assets), supply schedule_d_gain (the smaller of Schedule D lines 15 and 16); if Schedule D shows 28% gain or unrecaptured section 1250 gain, use the Schedule D Tax Worksheet and supply line16_override.");
      } else {
        l16 = c.set("line16", incomeTax(l15, status, ctx.year), "Tax", `${l15 < params(ctx.year).taxTableMax ? "Tax Table" : "Tax Computation Worksheet"} for ${status} on line 15 ${f(l15)}`, "16");
      }
    }
    if (c.n("line16_additions") > 0) l16 = c.set("line16", l16 + c.n("line16_additions"), "Tax including Form 8814 tax on a child's income", `${f(l16)} + ${f(c.n("line16_additions"))}`, "16");
    const l17 = c.n("line17");
    const l18 = c.set("line18", l16 + l17, "Add lines 16 and 17", `line 16 ${f(l16)} + line 17 ${f(l17)}`, "18");
    const l21 = c.set("line21", c.n("line19") + c.n("line20"), "Add lines 19 and 20", `line 19 ${f(c.n("line19"))} + line 20 ${f(c.n("line20"))}`, "21");
    const l22 = c.set("line22", Math.max(0, l18 - l21), "Subtract line 21 from line 18", `max(0, line 18 ${f(l18)} - line 21 ${f(l21)})`, "22");
    const l23 = c.n("line23");
    const l24 = c.set("line24", l22 + l23, "Total tax", `line 22 ${f(l22)} + line 23 ${f(l23)}`, "24");
    const l25d = c.set("line25d", c.sum(["line25a", "line25b", "line25c"]), "Total federal income tax withheld", c.show([["25a", c.n("line25a")], ["25b", c.n("line25b")], ["25c", c.n("line25c")]]), "25d");
    const refundable = ["line27", "line28", "line29", ...(ctx.year === 2025 ? ["line30"] : []), "line31"];
    const l32 = c.set("line32", c.sum(refundable), "Total other payments and refundable credits", c.show(refundable.map((id) => [id.replace("line", ""), c.n(id)] as [string, number]).filter(([, v]) => v !== 0)) || "none", "32");
    const l26 = c.n("line26");
    const l33 = c.set("line33", l25d + l26 + l32, "Total payments", `line 25d ${f(l25d)} + line 26 ${f(l26)} + line 32 ${f(l32)}`, "33");
    if (l33 > l24) {
      const l34 = c.set("line34", l33 - l24, "Amount overpaid", `line 33 ${f(l33)} - line 24 ${f(l24)}`, "34");
      const l36 = c.n("line36");
      if (l36 > l34) c.warn("Line 36 (applied to next year) exceeds the overpayment on line 34.");
      c.set("line35a", Math.max(0, l34 - l36), "Refund", `line 34 ${f(l34)} - line 36 ${f(l36)}`, "35a");
      c.out["line37"] = 0;
    } else {
      c.out["line34"] = 0;
      c.out["line35a"] = 0;
      c.set("line37", l24 - l33, "Amount you owe", `line 24 ${f(l24)} - line 33 ${f(l33)}`, "37");
    }
    if (!c.has("digital_assets")) c.warn("digital_assets (the digital asset question) must be answered yes or no.");
    if (status === "mfj" && !c.has("spouse_first_name")) c.warn("Married filing jointly but spouse_first_name is missing.");
    const deps = c.list("dependents");
    if (deps.length) c.out["dependents"] = deps.map((d) => ({ ...d, name: [d["first_name"], d["last_name"]].filter(Boolean).map(String).join(" ") || d["name"] || "" }));
    if (deps.length > 4) c.warn("More than four dependents: only four fit on the form; check more_than_four_dependents and attach a statement.");
    if (deps.length > 0 && !c.has("line19")) c.warn("Dependents are listed but line 19 (child tax credit / credit for other dependents from Schedule 8812) is empty.");
    return c.result();
  },
};
