import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import { incomeTax, qdcgWorksheet } from "../tax.ts";
import type { FieldDef, FilingStatus, FormDef, ListItemDef, TaxYear } from "../types.ts";

type Names = Partial<Record<TaxYear, string>>;
const N = (y25: string, y24?: string): { names: Names } => ({ names: y24 ? { 2025: y25, 2024: y24 } : { 2025: y25 } });
const P1 = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const P2 = (n: number) => `Page2[0].f2_${String(n).padStart(2, "0")}[0]`;
const Q1 = (n: number) => `Page1[0].f1_${n}[0]`;
const Q2 = (n: number) => `Page2[0].f2_${n}[0]`;
const money = (id: string, line: string, label: string, y25: string, y24?: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: N(y25, y24), ...(y24 ? {} : { years: [2025] as TaxYear[] }), ...extra });
const comp = (id: string, line: string, label: string, y25: string, y24: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, y25, y24, { computed: true, notes, ...extra });
const text = (id: string, line: string, label: string, y25: string, y24?: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "text", locate: N(y25, y24), ...(y24 ? {} : { years: [2025] as TaxYear[] }), ...extra });
const check = (id: string, line: string, label: string, y25: string, y24?: string): FieldDef => ({ id, line, label, type: "checkbox", locate: N(y25, y24), ...(y24 ? {} : { years: [2025] as TaxYear[] }) });

const NR_STATUSES = ["single", "mfs", "qss", "estate", "trust"] as const;
const depItems: ListItemDef[] = [
  { id: "first_name", label: "First name", type: "text" },
  { id: "last_name", label: "Last name", type: "text" },
  { id: "name", label: "Full name (2024 PDF has one box)", type: "text", computed: true },
  { id: "ssn", label: "Identifying number", type: "text", maxLen: 11 },
  { id: "relationship", label: "Relationship to you", type: "text" },
  { id: "lived_with_you", label: "Lived with you for more than half the year", type: "checkbox", years: [2025] },
  { id: "child_tax_credit", label: "Qualifies for the child tax credit", type: "checkbox" },
  { id: "other_dependents_credit", label: "Qualifies for the credit for other dependents", type: "checkbox" },
];
const dep25 = (row: number, base: number) => [0, 1, 2, 3].map((i) => `Page1[0].Table_Dependents[0].Row${row}[0].f1_${base + i}[0]`);
const dep24 = (offset: number) => [0, 1, 2, 3].map((r) => `Page1[0].Table_Dependents[0].BodyRow${r + 1}[0].f1_${16 + r * 3 + offset}[0]`);

const fields: FieldDef[] = [
  text("fiscal_begin", "", "Fiscal year beginning (leave blank for a calendar year)", P1(1), Q1(1), { maxLen: 10 }),
  text("fiscal_end", "", "Fiscal year ending", P1(2), Q1(2), { maxLen: 10 }),
  text("fiscal_year", "", "Fiscal year ending year (two digits)", P1(3), Q1(3), { maxLen: 2 }),
  check("filed_9100_2", "", "Filed pursuant to section 301.9100-2", "Page1[0].c1_1[0]"),
  check("combat_zone", "", "Combat zone", "Page1[0].c1_2[0]"),
  text("combat_zone_text", "", "Combat zone or contingency operation name", P1(4)),
  check("deceased", "", "Taxpayer is deceased", "Page1[0].c1_3[0]"),
  text("deceased_month", "", "Date of death: month", P1(5), undefined, { maxLen: 2 }),
  text("deceased_day", "", "Date of death: day", P1(6), undefined, { maxLen: 2 }),
  text("deceased_year", "", "Date of death: year (two digits)", P1(7), undefined, { maxLen: 2 }),
  text("spouse_deceased_month", "", "Spouse's date of death: month", P1(8), undefined, { maxLen: 2 }),
  text("spouse_deceased_day", "", "Spouse's date of death: day", P1(9), undefined, { maxLen: 2 }),
  text("spouse_deceased_year", "", "Spouse's date of death: year (two digits)", P1(10), undefined, { maxLen: 2 }),
  check("other_status", "", "Other (see instructions)", "Page1[0].c1_4[0]"),
  text("other_text1", "", "Other: first entry", P1(11)),
  text("other_text2", "", "Other: second entry", P1(12)),
  text("other_text3", "", "Other: third entry", P1(13)),
  text("first_name", "", "Your first name and middle initial", P1(14), Q1(4)),
  text("last_name", "", "Last name", P1(15), Q1(5)),
  text("ssn", "", "Your identifying number (SSN or ITIN)", P1(16), Q1(6), { maxLen: 11 }),
  text("address", "", "Home address (number and street)", P1(17), Q1(7)),
  text("apt", "", "Apartment number", P1(18), Q1(8)),
  text("city", "", "City, town, or post office", P1(19), Q1(9)),
  text("state", "", "State", P1(20), Q1(10), { maxLen: 2 }),
  text("zip", "", "ZIP code", P1(21), Q1(11), { maxLen: 10 }),
  text("country", "", "Foreign country name", P1(22), Q1(12)),
  text("province", "", "Foreign province, state, or county", P1(23), Q1(13)),
  text("postal_code", "", "Foreign postal code", P1(24), Q1(14)),
  text("qss_child", "", "Qualifying surviving spouse: the child's name if the qualifying person is a child but not your dependent", P1(25), Q1(15)),
  {
    id: "filing_status", label: "Filing status: single, mfs (married filing separately), qss (qualifying surviving spouse), estate, or trust", type: "choice", choices: [...NR_STATUSES],
    locate: Object.fromEntries(NR_STATUSES.map((s, i) => [s, N(`Page1[0].c1_5[${i}]`, `Page1[0].c1_1[${i}]`)])),
  },
  { id: "digital_assets", label: "At any time during the year, did you receive, sell, exchange, or otherwise dispose of a digital asset?", type: "yesno", locate: { yes: N("Page1[0].c1_6[0]", "Page1[0].c1_3[0]"), no: N("Page1[0].c1_6[1]", "Page1[0].c1_3[1]") } },
  check("more_than_four_dependents", "", "More than four dependents (see instructions and check here)", "Page1[0].Dependents_ReadOrder[0].c1_7[0]", "Page1[0].Dependents[0].c1_4[0]"),
  {
    id: "dependents", label: "Dependents (up to 4)", type: "list", rows: 4, items: depItems,
    listLocate: {
      2025: { first_name: dep25(1, 26), last_name: dep25(2, 30), ssn: dep25(3, 34), relationship: dep25(4, 38), lived_with_you: [8, 9, 10, 11].map((n) => `Page1[0].Table_Dependents[0].Row5[0].c1_${n}[0]`), child_tax_credit: [1, 2, 3, 4].map((d) => `Page1[0].Table_Dependents[0].Row6[0].Dependent${d}[0].c1_${11 + d}[0]`), other_dependents_credit: [1, 2, 3, 4].map((d) => `Page1[0].Table_Dependents[0].Row6[0].Dependent${d}[0].c1_${11 + d}[1]`) },
      2024: { name: dep24(0), ssn: dep24(1), relationship: dep24(2), child_tax_credit: [0, 1, 2, 3].map((r) => `Page1[0].Table_Dependents[0].BodyRow${r + 1}[0].c1_${5 + r * 2}[0]`), other_dependents_credit: [0, 1, 2, 3].map((r) => `Page1[0].Table_Dependents[0].BodyRow${r + 1}[0].c1_${6 + r * 2}[0]`) },
    },
    notes: "For 2024 the PDF has a single name box per dependent; first and last names are joined.",
  },
  money("line1a", "1a", "Total amount from Form(s) W-2, box 1", P1(42), Q1(28)),
  money("line1b", "1b", "Household employee wages not reported on Form(s) W-2", P1(43), Q1(29)),
  money("line1c", "1c", "Tip income not reported on line 1a", P1(44), Q1(30)),
  money("line1d", "1d", "Medicaid waiver payments not reported on Form(s) W-2", P1(45), Q1(31)),
  money("line1e", "1e", "Taxable dependent care benefits from Form 2441, line 26", P1(46), Q1(32)),
  money("line1f", "1f", "Employer-provided adoption benefits from Form 8839, line 29", P1(47), Q1(33)),
  money("line1g", "1g", "Wages from Form 8919, line 6", P1(48), Q1(34)),
  text("line1h_type", "1h", "Other earned income: type", P1(49)),
  money("line1h", "1h", "Other earned income", P1(50), Q1(35)),
  money("line1k", "1k", "Total income exempt by a treaty from Schedule OI (Form 1040-NR), item L, line 1(e) (not added to line 1z)", "Page1[0].Line1k_ReadOrder[0].f1_53[0]", Q1(38)),
  comp("line1z", "1z", "Add lines 1a through 1h", P1(54), Q1(39), "1a + 1b + 1c + 1d + 1e + 1f + 1g + 1h"),
  money("line2a", "2a", "Tax-exempt interest", P1(55), Q1(40)),
  money("line2b", "2b", "Taxable interest", P1(56), Q1(41)),
  money("line3a", "3a", "Qualified dividends", P1(57), Q1(42)),
  money("line3b", "3b", "Ordinary dividends", P1(58), Q1(43)),
  check("line3c_1", "3c", "Line 3c box 1 (see instructions)", "Page1[0].c1_16[0]"),
  check("line3c_2", "3c", "Line 3c box 2 (see instructions)", "Page1[0].c1_17[0]"),
  money("line4a", "4a", "IRA distributions", P1(59), Q1(44)),
  money("line4b", "4b", "IRA distributions: taxable amount", P1(60), Q1(45)),
  check("line4c_rollover", "4c", "Line 4c box 1: rollover", "Page1[0].c1_18[0]"),
  check("line4c_box2", "4c", "Line 4c box 2 (see instructions)", "Page1[0].c1_19[0]"),
  check("line4c_box3", "4c", "Line 4c box 3 (see instructions)", "Page1[0].c1_20[0]"),
  text("line4c_text", "4c", "Line 4c box 3 entry", P1(61), undefined, { maxLen: 6 }),
  money("line5a", "5a", "Pensions and annuities", P1(62), Q1(46)),
  money("line5b", "5b", "Pensions and annuities: taxable amount", P1(63), Q1(47)),
  check("line5c_rollover", "5c", "Line 5c box 1: rollover", "Page1[0].c1_21[0]"),
  check("line5c_box2", "5c", "Line 5c box 2 (see instructions)", "Page1[0].c1_22[0]"),
  check("line5c_box3", "5c", "Line 5c box 3 (see instructions)", "Page1[0].c1_23[0]"),
  text("line5c_text", "5c", "Line 5c box 3 entry", P1(64), undefined, { maxLen: 6 }),
  money("line7a", "7a", "Capital gain or (loss) from Schedule D (or the capital gain distributions when Schedule D is not required)", P1(66), Q1(49)),
  check("schedule_d_not_required", "7b", "Schedule D not required", "Page1[0].c1_24[0]", "Page1[0].c1_13[0]"),
  check("line7b_child", "7b", "Includes a child's capital gain or (loss) from Form 8814", "Page1[0].c1_25[0]"),
  money("line7b_child_amount", "7b", "Child's capital gain or (loss) included on line 7a", P1(67)),
  money("line8", "8", "Additional income from Schedule 1 (Form 1040), line 10", P1(68), Q1(50)),
  comp("line9", "9", "Add lines 1z, 2b, 3b, 4b, 5b, 7a, and 8: total effectively connected income", P1(69), Q1(51), "1z + 2b + 3b + 4b + 5b + 7a + 8", { alwaysShow: true }),
  money("line10", "10", "Adjustments to income from Schedule 1 (Form 1040), line 26", P1(70), Q1(52)),
  comp("line11a", "11a", "Adjusted gross income: line 9 minus line 10", P1(71), Q1(53), "9 - 10", { alwaysShow: true }),
  comp("line11b", "11b", "Amount from line 11a", P2(1), "", "line 11a", { years: [2025] }),
  money("line12", "12", "Itemized deductions from Schedule A (Form 1040-NR), or the standard deduction for certain residents of India", P2(2), Q1(54)),
  money("line13a", "13a", "Qualified business income deduction from Form 8995 or 8995-A", P2(3), Q1(55)),
  money("line13b", "13b", "Exemptions for estates and trusts only", P2(4), Q1(56)),
  money("line13c", "13c", "Additional deductions from Schedule 1-A, line 38", P2(5)),
  comp("line13c_2024", "13c", "Add lines 13a and 13b (2024)", "", Q1(57), "13a + 13b", { years: [2024] }),
  comp("line14", "14", "Add lines 12 through 13c (2024: lines 12 and 13c)", P2(6), Q1(58), "12 + 13a + 13b + 13c"),
  comp("line15", "15", "Taxable income: line 11 minus line 14 (not less than zero)", P2(7), Q1(59), "11 - 14", { alwaysShow: true }),
  check("line16_form8814", "16", "Tax includes an amount from Form 8814", "Page2[0].c2_1[0]", "Page2[0].c2_1[0]"),
  check("line16_form4972", "16", "Tax includes an amount from Form 4972", "Page2[0].c2_2[0]", "Page2[0].c2_2[0]"),
  check("line16_other", "16", "Tax includes an amount from another form", "Page2[0].c2_3[0]", "Page2[0].c2_3[0]"),
  text("line16_other_form", "16", "The other form number", P2(8), Q2(1), { maxLen: 6 }),
  money("line16", "16", "Tax (figured from line 15 when not supplied: Tax Table, Tax Computation Worksheet, or the Qualified Dividends and Capital Gain Tax Worksheet)", P2(9), Q2(2), { alwaysShow: true, notes: "Computed when not supplied; estates and trusts must supply it." }),
  money("line17", "17", "Amount from Schedule 2 (Form 1040), line 3", P2(10), Q2(3)),
  comp("line18", "18", "Add lines 16 and 17", P2(11), Q2(4), "16 + 17"),
  money("line19", "19", "Child tax credit or credit for other dependents from Schedule 8812", P2(12), Q2(5)),
  money("line20", "20", "Amount from Schedule 3 (Form 1040), line 8", P2(13), Q2(6)),
  comp("line21", "21", "Add lines 19 and 20", P2(14), Q2(7), "19 + 20"),
  comp("line22", "22", "Line 18 minus line 21 (not less than zero)", P2(15), Q2(8), "18 - 21"),
  money("line23a", "23a", "Tax on income not effectively connected with a U.S. trade or business from Schedule NEC (Form 1040-NR), line 15", "Page2[0].Line23a_ReadOrder[0].f2_16[0]", "Page2[0].Line23a_ReadOrder[0].f2_9[0]"),
  money("line23b", "23b", "Other taxes, including self-employment tax, from Schedule 2 (Form 1040), line 21", P2(17), Q2(10)),
  money("line23c", "23c", "Transportation tax", P2(18), Q2(11)),
  comp("line23d", "23d", "Add lines 23a through 23c", P2(19), Q2(12), "23a + 23b + 23c"),
  comp("line24", "24", "Total tax: add lines 22 and 23d", P2(20), Q2(13), "22 + 23d", { alwaysShow: true }),
  money("line25a", "25a", "Federal income tax withheld from Form(s) W-2", "Page2[0].Line25_ReadOrder[0].f2_21[0]", "Page2[0].Line25_ReadOrder[0].f2_14[0]"),
  money("line25b", "25b", "Federal income tax withheld from Form(s) 1099", P2(22), Q2(15)),
  money("line25c", "25c", "Federal income tax withheld from other forms", P2(23), Q2(16)),
  comp("line25d", "25d", "Add lines 25a through 25c", P2(24), Q2(17), "25a + 25b + 25c"),
  money("line25e", "25e", "Tax withheld on Form(s) 8805", P2(25), Q2(18)),
  money("line25f", "25f", "Tax withheld on Form(s) 8288-A", P2(26), Q2(19)),
  money("line25g", "25g", "Tax withheld on Form(s) 1042-S", P2(27), Q2(20)),
  money("line26", "26", "Estimated tax payments and amount applied from the prior year's return", P2(28), Q2(21)),
  check("line28_box", "28", "Check if you want to claim the additional child tax credit (see instructions)", "Page2[0].Line28_ReadOrder[0].c2_4[0]"),
  money("line28", "28", "Additional child tax credit from Schedule 8812", P2(30), Q2(23)),
  money("line29", "29", "Credit for amount paid with Form 1040-C", P2(31), Q2(24)),
  money("line30", "30", "Refundable adoption credit from Form 8839, line 13", P2(32)),
  money("line31", "31", "Amount from Schedule 3 (Form 1040), line 15", P2(33), Q2(26)),
  comp("line32", "32", "Add lines 28, 29, 30, and 31: total other payments and refundable credits", P2(34), Q2(27), "28 + 29 + 30 + 31"),
  comp("line33", "33", "Add lines 25d, 25e, 25f, 25g, 26, and 32: total payments", P2(35), Q2(28), "25d + 25e + 25f + 25g + 26 + 32", { alwaysShow: true }),
  comp("line34", "34", "Overpaid: line 33 minus line 24 when line 33 is more", P2(36), Q2(29), "33 - 24"),
  check("line35a_8888", "35a", "Form 8888 is attached", "Page2[0].c2_5[0]", "Page2[0].c2_4[0]"),
  comp("line35a", "35a", "Amount of line 34 refunded to you (line 34 minus line 36)", P2(37), Q2(30), "34 - 36"),
  text("routing_number", "35b", "Routing number", "Page2[0].RoutingNo[0].f2_38[0]", "Page2[0].RoutingNo[0].f2_31[0]", { maxLen: 9 }),
  { id: "account_type", line: "35c", label: "Account type: checking or savings", type: "choice", choices: ["checking", "savings"], locate: { checking: N("Page2[0].c2_6[0]", "Page2[0].c2_5[0]"), savings: N("Page2[0].c2_6[1]", "Page2[0].c2_5[1]") } },
  text("account_number", "35d", "Account number", "Page2[0].AccountNo[0].f2_39[0]", "Page2[0].AccountNo[0].f2_32[0]", { maxLen: 17 }),
  text("line35e", "35e", "If you want your refund mailed to an address outside the United States not shown above, enter it here", P2(40), Q2(33)),
  money("line36", "36", "Amount of line 34 you want applied to next year's estimated tax", P2(41), Q2(34)),
  comp("line37", "37", "Amount you owe: line 24 minus line 33 when line 24 is more", P2(42), Q2(35), "24 - 33", { alwaysShow: true }),
  money("line38", "38", "Estimated tax penalty", P2(43), Q2(36)),
  { id: "third_party_designee", label: "Do you want to allow another person to discuss this return with the IRS?", type: "yesno", locate: { yes: N("Page2[0].c2_7[0]", "Page2[0].c2_6[0]"), no: N("Page2[0].c2_7[1]", "Page2[0].c2_6[1]") } },
  text("designee_name", "", "Designee's name", P2(44), Q2(37)),
  text("designee_phone", "", "Designee's phone number", P2(45), Q2(38)),
  text("designee_pin", "", "Designee's personal identification number", P2(46), Q2(39), { maxLen: 5 }),
  text("occupation", "", "Your occupation", P2(47), Q2(40)),
  text("ip_pin", "", "Identity Protection PIN", P2(48), Q2(41), { maxLen: 6 }),
  text("phone", "", "Phone number", P2(49), Q2(42)),
  text("email", "", "Email address", P2(50), Q2(43)),
];

export const form1040nr: FormDef = {
  id: "f1040nr",
  title: "Form 1040-NR, U.S. Nonresident Alien Income Tax Return",
  shortTitle: "Form 1040-NR",
  description: "The nonresident alien return: effectively connected income, deductions, tax (with Schedule NEC tax on other U.S. income), credits, payments, and the refund or amount owed; filed with Schedules OI, NEC, and A (Form 1040-NR) and the Form 1040 schedules.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040nr.pdf",
  notes: `**Who files.** Nonresident aliens engaged in a U.S. trade or business, or with U.S.-source income on which the tax withheld did not satisfy the liability, and representatives of deceased nonresidents or of estates and trusts that must file. Dual-status taxpayers attach a statement. Nonresidents cannot file jointly or as head of household.

**What the engine computes.** Lines 1z, 9, 11a (and 11b for 2025), 14, 15, 16 (the tax on line 15 for single, married filing separately, and qualifying surviving spouse filers, using the Qualified Dividends and Capital Gain Tax Worksheet when lines 3a or 7a have amounts), 18, 21, 22, 23d, 24, 25d, 32, 33, 34, 35a, and 37. Schedule amounts (Schedule 1 lines 10 and 26, Schedules 2 and 3, Schedule 8812, Schedule NEC line 15) are entered as supplied; in a full return the engine fills them from the schedules it prepared.

**What to verify.** Most nonresidents cannot take the standard deduction (line 12 is itemized deductions from Schedule A (Form 1040-NR), or the standard deduction only for students and business apprentices from India). Estates and trusts use their own rate schedule, so supply line 16. Income not effectively connected (dividends, certain interest, royalties) is taxed on Schedule NEC at 30% or the treaty rate and entered on line 23a; treaty-exempt income is reported on Schedule OI and line 1k. The return is due April 15 (June 15 when you had no wages subject to withholding).`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const deps = c.list("dependents");
    if (deps.length > 4) c.warn("More than 4 dependents: only the first 4 print; check more_than_four_dependents and attach a statement.");
    if (deps.length) c.out["dependents"] = deps.map((d) => ({ ...d, name: [d["first_name"], d["last_name"]].filter(Boolean).map(String).join(" ") || d["name"] }));
    const l1z = c.set("line1z", c.sum(["line1a", "line1b", "line1c", "line1d", "line1e", "line1f", "line1g", "line1h"]), "Total wages and other earned income", "1a + 1b + 1c + 1d + 1e + 1f + 1g + 1h", "1z");
    const l9 = c.set("line9", l1z + c.sum(["line2b", "line3b", "line4b", "line5b", "line7a", "line8"]), "Total effectively connected income", `${f(l1z)} + 2b + 3b + 4b + 5b + 7a + 8`, "9");
    const l11 = c.set("line11a", l9 - c.n("line10"), "Adjusted gross income", `${f(l9)} - ${f(c.n("line10"))}`, "11a");
    if (ctx.year === 2025) c.set("line11b", l11, "Amount from line 11a", "line 11a", "11b");
    const l13c24 = ctx.year === 2024 ? c.set("line13c_2024", c.n("line13a") + c.n("line13b"), "Add lines 13a and 13b", `${f(c.n("line13a"))} + ${f(c.n("line13b"))}`, "13c") : 0;
    const l14 = c.set("line14", c.n("line12") + (ctx.year === 2024 ? l13c24 : c.n("line13a") + c.n("line13b") + c.n("line13c")), "Total deductions", ctx.year === 2024 ? `${f(c.n("line12"))} + ${f(l13c24)}` : `${f(c.n("line12"))} + 13a + 13b + 13c`, "14");
    const l15 = c.set("line15", Math.max(0, l11 - l14), "Taxable income", `${f(l11)} - ${f(l14)}`, "15");
    const status = c.str("filing_status");
    let l16: number;
    if (c.has("line16")) {
      l16 = c.n("line16");
      c.computations.push({ id: "line16", line: "16", label: "Tax (supplied)", value: l16, formula: "supplied" });
    } else if (status === "single" || status === "mfs" || status === "qss") {
      const qd = c.n("line3a");
      const gain = Math.max(0, c.n("line7a"));
      if (qd > 0 || gain > 0) {
        const w = qdcgWorksheet({ taxableIncome: l15, qualifiedDividends: qd, capitalGain: gain, status: status as FilingStatus, year: ctx.year });
        l16 = c.set("line16", w.tax, "Tax", `Qualified Dividends and Capital Gain Tax Worksheet for ${status} on line 15 ${f(l15)}`, "16");
      } else {
        l16 = c.set("line16", incomeTax(l15, status as FilingStatus, ctx.year), "Tax", `${l15 < params(ctx.year).taxTableMax ? "Tax Table" : "Tax Computation Worksheet"} for ${status} on line 15 ${f(l15)}`, "16");
      }
    } else {
      l16 = c.set("line16", 0, "Tax", "not computed", "16");
      if (!status) c.warn("filing_status is missing (single, mfs, qss, estate, or trust); the tax on line 16 cannot be computed.");
      else c.warn("Estates and trusts use the rate schedule in the instructions; supply line16.");
    }
    const l18 = c.set("line18", l16 + c.n("line17"), "Tax plus Schedule 2 line 3", `${f(l16)} + ${f(c.n("line17"))}`, "18");
    const l21 = c.set("line21", c.n("line19") + c.n("line20"), "Nonrefundable credits", `${f(c.n("line19"))} + ${f(c.n("line20"))}`, "21");
    const l22 = c.set("line22", Math.max(0, l18 - l21), "Tax after credits", `${f(l18)} - ${f(l21)}`, "22");
    const l23d = c.set("line23d", c.sum(["line23a", "line23b", "line23c"]), "Other taxes", "23a + 23b + 23c", "23d");
    const l24 = c.set("line24", l22 + l23d, "Total tax", `${f(l22)} + ${f(l23d)}`, "24");
    const l25d = c.set("line25d", c.sum(["line25a", "line25b", "line25c"]), "Federal income tax withheld", "25a + 25b + 25c", "25d");
    const l32 = c.set("line32", c.sum(["line28", "line29", "line30", "line31"]), "Other payments and refundable credits", "28 + 29 + 30 + 31", "32");
    const l33 = c.set("line33", l25d + c.sum(["line25e", "line25f", "line25g", "line26"]) + l32, "Total payments", `${f(l25d)} + 25e + 25f + 25g + 26 + ${f(l32)}`, "33");
    const l34 = c.set("line34", Math.max(0, l33 - l24), "Overpaid", `${f(l33)} - ${f(l24)}`, "34");
    const l36 = Math.min(l34, c.n("line36"));
    c.set("line35a", Math.max(0, l34 - l36), "Refund", `${f(l34)} - ${f(l36)}`, "35a");
    c.set("line37", Math.max(0, l24 - l33), "Amount you owe", `${f(l24)} - ${f(l33)}`, "37");
    if (c.has("line12") && status !== "estate" && status !== "trust" && c.n("line12") === params(ctx.year).standardDeduction["single"]) c.warn("Line 12 equals the standard deduction: nonresident aliens may use it only as students or business apprentices from India; otherwise enter itemized deductions from Schedule A (Form 1040-NR).");
    if (c.n("line23a") === 0 && (c.n("line3b") > 0)) c.warn("Dividends not effectively connected with a U.S. trade or business belong on Schedule NEC (taxed at 30% or the treaty rate, line 23a), not on line 3b.");
    return c.result();
  },
};
