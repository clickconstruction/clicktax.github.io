import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

/** Page 1 is the same on the February 2024 and December 2025 revisions; page 2's dependents table and signature boxes moved. */
type Y<T> = Partial<Record<TaxYear, T>>;
const N = (y24: string, y25: string): { names: Y<string> } => ({ names: { 2024: y24, 2025: y25 } });
const P1 = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const P2 = (n: number) => `Page2[0].f2_${String(n).padStart(2, "0")}[0]`;
const COLS = ["a", "b", "c"] as const;
const COL_LABEL = { a: "(A) Original amount or as previously adjusted", b: "(B) Net change", c: "(C) Correct amount" };
const INC: Array<[string, string, number, boolean]> = [["1", "Adjusted gross income", 18, false], ["2", "Itemized deductions or standard deduction", 21, false], ["3", "Subtract line 2 from line 1", 24, true], ["4a", "Qualified business income deduction", 27, false], ["4b", "Additional deductions from Schedule 1-A (2025)", 30, false], ["5", "Taxable income (line 3 minus lines 4a and 4b; not less than zero in column C)", 33, true]];
const TAX: Array<[string, string, number, boolean]> = [["6", "Tax", 37, false], ["7", "Nonrefundable credits", 40, false], ["8", "Subtract line 7 from line 6 (not less than zero)", 43, true], ["9", "Reserved for future use", 46, false], ["10", "Other taxes", 49, false], ["11", "Total tax (lines 8 and 10)", 52, true]];
const PAY: Array<[string, string, number, boolean]> = [["12", "Federal income tax withheld and excess social security tax withheld", 55, false], ["13", "Estimated tax payments, including amount applied from the prior year's return", 58, false], ["14", "Earned income credit (EIC)", 61, false], ["15", "Refundable credits (Schedule 8812, Forms 2439, 4136, 8863, 8885, 8962, or other)", 65, false]];
const table = (group: string, rows: Array<[string, string, number, boolean]>): FieldDef[] => rows.flatMap(([line, label, first, computed]) => COLS.map((col, i): FieldDef => ({ id: `line${line}_${col}`, line, label: `${label}: ${COL_LABEL[col]}`, type: "money", locate: { name: `Page1[0].${group}[0].Line${line}[0].f1_${first + i}[0]` }, ...(computed || col === "b" ? { computed: true } : {}) })));
const depItems: NonNullable<FieldDef["items"]> = [
  { id: "first_name", label: "First name", type: "text" },
  { id: "last_name", label: "Last name", type: "text" },
  { id: "name", label: "First and last name together (2024 layout)", type: "text", computed: true, years: [2024] },
  { id: "ssn", label: "Social security number", type: "ssn", maxLen: 9 },
  { id: "relationship", label: "Relationship to you", type: "text" },
  { id: "child_tax_credit", label: "Qualifies for child tax credit", type: "checkbox" },
  { id: "other_dependents_credit", label: "Qualifies for credit for other dependents", type: "checkbox" },
  { id: "lived_with_you", label: "Lived with you more than half the year (2025 layout)", type: "checkbox", years: [2025] },
  { id: "lived_in_us", label: "Lived in the U.S. more than half the year (2025 layout)", type: "checkbox", years: [2025] },
  { id: "full_time_student", label: "Full-time student (2025 layout)", type: "checkbox", years: [2025] },
  { id: "permanently_disabled", label: "Permanently and totally disabled (2025 layout)", type: "checkbox", years: [2025] },
];
const dep24 = (n: number) => [1, 2, 3, 4].map((r) => `Page2[0].Table_Dependents[0].Row${r}[0].f2_${n + 3 * (r - 1)}[0]`);
const depc24 = (idx: 0 | 1) => [1, 2, 3, 4].map((r) => `Page2[0].Table_Dependents[0].Row${r}[0].c2_${1 + r}[${idx}]`);
const dep25 = (row: number, n: number) => [0, 1, 2, 3].map((i) => `Page2[0].Table_Dependents[0].Row${row}[0].f2_${n + i}[0]`);
const depc25 = (row: number, n: number, step: number, idx = 0) => [0, 1, 2, 3].map((i) => `Page2[0].Table_Dependents[0].Row${row}[0].Dependent${i + 1}[0].c2_${n + step * i}[${idx}]`);

const fields: FieldDef[] = [
  { id: "tax_year", label: "This return is for calendar year (enter the year being amended)", type: "text", maxLen: 4, locate: { name: P1(1) } },
  { id: "fiscal_year", label: "Or fiscal year (enter month and year ended)", type: "text", locate: { name: P1(2) } },
  { id: "first_name", label: "Your first name and middle initial", type: "text", locate: { name: P1(3) } },
  { id: "last_name", label: "Last name", type: "text", locate: { name: P1(4) } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: P1(5) } },
  { id: "spouse_first_name", label: "If joint return, spouse's first name and middle initial", type: "text", locate: { name: P1(6) } },
  { id: "spouse_last_name", label: "Spouse's last name", type: "text", locate: { name: P1(7) } },
  { id: "spouse_ssn", label: "Spouse's social security number", type: "ssn", maxLen: 9, locate: { name: P1(8) } },
  { id: "address", label: "Current home address (number and street)", type: "text", locate: { name: "Page1[0].Address_ReadOrder[0].f1_09[0]" } },
  { id: "apt", label: "Apt. no.", type: "text", locate: { name: "Page1[0].Address_ReadOrder[0].f1_10[0]" } },
  { id: "city", label: "City, town, or post office", type: "text", locate: { name: "Page1[0].Address_ReadOrder[0].f1_11[0]" } },
  { id: "state", label: "State", type: "text", maxLen: 2, locate: { name: "Page1[0].Address_ReadOrder[0].f1_12[0]" } },
  { id: "zip", label: "ZIP code", type: "text", locate: { name: "Page1[0].Address_ReadOrder[0].f1_13[0]" } },
  { id: "foreign_country", label: "Foreign country name", type: "text", locate: { name: "Page1[0].Address_ReadOrder[0].f1_14[0]" } },
  { id: "foreign_province", label: "Foreign province/state/county", type: "text", locate: { name: "Page1[0].Address_ReadOrder[0].f1_15[0]" } },
  { id: "foreign_postal_code", label: "Foreign postal code", type: "text", locate: { name: "Page1[0].Address_ReadOrder[0].f1_16[0]" } },
  { id: "presidential_campaign_you", label: "Presidential Election Campaign: you now want $3 to go to the fund", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "presidential_campaign_spouse", label: "Presidential Election Campaign: spouse now wants $3 to go to the fund", type: "checkbox", locate: { name: "Page1[0].c1_2[0]" } },
  { id: "filing_status", label: "Amended return filing status", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"], locate: { single: { name: "Page1[0].c1_3[0]" }, mfj: { name: "Page1[0].c1_3[1]" }, mfs: { name: "Page1[0].c1_3[2]" }, hoh: { name: "Page1[0].c1_3[3]" }, qss: { name: "Page1[0].c1_3[4]" } } },
  { id: "qualifying_person_name", label: "If married filing separately, the spouse's name; if head of household or qualifying surviving spouse, the child's name when the qualifying person is a child but not your dependent", type: "text", locate: { name: P1(17) } },
  { id: "line1_nol_carryback", line: "1", label: "Check if a net operating loss carryback is included in line 1", type: "checkbox", locate: { name: "Page1[0].Table_IncomeDeductions[0].Line1[0].Adjusted[0].c1_4[0]" } },
  ...table("Table_IncomeDeductions", INC),
  { id: "line6_method", line: "6", label: "Tax method: Tax Table, Tax Computation Worksheet, Schedule D, Form 8615, etc.", type: "text", locate: { name: "Page1[0].Table_TaxLiability[0].Line6[0].Tax[0].f1_36[0]" } },
  ...table("Table_TaxLiability", TAX),
  { id: "line7_gbc_carryback", line: "7", label: "Check if a general business credit carryback is included in line 7", type: "checkbox", locate: { name: "Page1[0].Table_TaxLiability[0].Line7[0].Credits[0].c1_5[0]" } },
  ...table("Table_Payments", PAY),
  { id: "line15_forms", line: "15", label: "Refundable credits come from (any of): schedule_8812, form_2439, form_4136, form_8863, form_8885, form_8962, other", type: "choice", choices: ["schedule_8812", "form_2439", "form_4136", "form_8863", "form_8885", "form_8962", "other"], locate: { schedule_8812: { name: "Page1[0].Table_Payments[0].Line15[0].Refundable[0].c1_6[0]" }, form_2439: { name: "Page1[0].Table_Payments[0].Line15[0].Refundable[0].c1_7[0]" }, form_4136: { name: "Page1[0].Table_Payments[0].Line15[0].Refundable[0].c1_8[0]" }, form_8863: { name: "Page1[0].Table_Payments[0].Line15[0].Refundable[0].c1_9[0]" }, form_8885: { name: "Page1[0].Table_Payments[0].Line15[0].Refundable[0].c1_10[0]" }, form_8962: { name: "Page1[0].Table_Payments[0].Line15[0].Refundable[0].c1_11[0]" }, other: { name: "Page1[0].Table_Payments[0].Line15[0].Refundable[0].c1_12[0]" } } },
  { id: "line15_other", line: "15", label: "Other refundable credit form (specify)", type: "text", locate: { name: "Page1[0].Table_Payments[0].Line15[0].Refundable[0].f1_64[0]" } },
  { id: "line16", line: "16", label: "Total amount paid with the request for extension, with the original return, and after it was filed", type: "money", locate: { name: P1(68) } },
  { id: "line17", line: "17", label: "Total payments: lines 12 through 15 column C plus line 16", type: "money", computed: true, locate: { name: P1(69) } },
  { id: "line18", line: "18", label: "Overpayment, if any, shown on the original return or as previously adjusted by the IRS", type: "money", locate: { name: P1(70) } },
  { id: "line19", line: "19", label: "Subtract line 18 from line 17", type: "money", computed: true, locate: { name: P1(71) } },
  { id: "line20", line: "20", label: "Amount you owe (line 11 column C minus line 19, when positive)", type: "money", computed: true, alwaysShow: true, locate: { name: P1(72) } },
  { id: "line21", line: "21", label: "Overpayment (line 19 minus line 11 column C, when positive)", type: "money", computed: true, alwaysShow: true, locate: { name: P1(73) } },
  { id: "line22", line: "22", label: "Amount of line 21 you want refunded to you", type: "money", computed: true, locate: { name: P1(74) } },
  { id: "line23_year", line: "23", label: "Year to apply the credit to", type: "text", maxLen: 4, locate: { name: P1(75) } },
  { id: "line23", line: "23", label: "Amount of line 21 you want applied to next year's estimated tax", type: "money", locate: { name: P1(76) } },
  ...([["24", "Reserved for future use", 1], ["25", "Your dependent children who lived with you more than half of the year", 4], ["26", "Reserved for future use", 7], ["27", "Other dependents", 10], ["28", "Reserved for future use", 13], ["29", "Reserved for future use", 16]] as Array<[string, string, number]>).flatMap(([line, label, first]) => COLS.map((col, i): FieldDef => ({ id: `line${line}_${col}`, line, label: `${label}: ${col === "a" ? "original number" : col === "b" ? "net change" : "correct number"}`, type: "integer", ...(col === "b" ? { computed: true } : {}), locate: { name: `Page2[0].Table_Lines24-29[0].Line${line}[0].f2_${String(first + i).padStart(2, "0")}[0]` } }))),
  { id: "more_than_four_dependents", label: "More than four dependents (attach a statement)", type: "checkbox", locate: { name: "Page2[0].Dependents_ReadOrder[0].c2_1[0]" } },
  { id: "dependents", label: "Dependents as corrected (up to 4)", type: "list", rows: 4, items: depItems, listLocate: { 2024: { name: dep24(19), ssn: dep24(20), relationship: dep24(21), child_tax_credit: depc24(0), other_dependents_credit: depc24(1) }, 2025: { first_name: dep25(1, 19), last_name: dep25(2, 23), ssn: dep25(3, 27), relationship: dep25(4, 31), lived_with_you: depc25(5, 2, 2), lived_in_us: depc25(5, 3, 2), full_time_student: depc25(6, 10, 2), permanently_disabled: depc25(6, 11, 2), child_tax_credit: depc25(7, 18, 1, 0), other_dependents_credit: depc25(7, 18, 1, 1) } } },
  { id: "explanation", line: "Part III", label: "Explanation of changes: which lines changed, why, and the supporting forms attached", type: "text", locate: N(P2(31), P2(35)) },
  { id: "occupation", label: "Your occupation", type: "text", locate: N(P2(32), P2(36)) },
  { id: "identity_protection_pin", label: "Identity Protection PIN", type: "text", maxLen: 6, locate: N(P2(33), P2(37)) },
  { id: "spouse_occupation", label: "Spouse's occupation", type: "text", locate: N(P2(34), P2(38)) },
  { id: "spouse_identity_protection_pin", label: "Spouse's Identity Protection PIN", type: "text", maxLen: 6, locate: N(P2(35), P2(39)) },
  { id: "phone", label: "Phone number", type: "text", locate: N(P2(36), P2(40)) },
  { id: "email", label: "Email address", type: "text", locate: N(P2(37), P2(41)) },
];

export const form1040X: FormDef = {
  id: "f1040x",
  title: "Form 1040-X, Amended U.S. Individual Income Tax Return",
  shortTitle: "Form 1040-X",
  description: "Corrects a filed return: the original amounts in column A, the correct amounts in column C, the net change in column B, the recomputed payments, and the balance due or refund. Attach every schedule or form that changed.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040x.pdf",
  notes: `**How to use it.** Enter the figures from the return as filed (or as the IRS adjusted it) in the column A fields and the corrected figures in the column C fields; the engine fills column B and lines 3, 5, 8, 11, 17, 19 through 22, and the dependent counts. Explain the changes in Part III and attach the corrected schedules. Generally file within 3 years of the original due date to claim a refund.

**What to verify.** Line 16 includes tax paid with the original return and any later payments; line 18 is the refund you already received or applied; interest and penalties on a balance due are billed by the IRS. The 2024 revision has no Schedule 1-A deduction on line 4b.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const col = (line: string, k: "a" | "c") => c.n(`line${line}_${k}`);
    const setB = (line: string, a: number, cc: number) => c.set(`line${line}_b`, cc - a, `Line ${line} net change`, `${f(cc)} - ${f(a)}`, line);
    for (const k of ["a", "c"] as const) {
      const l3 = c.set(`line3_${k}`, col("1", k) - col("2", k), `Line 3 (${k.toUpperCase()})`, `${f(col("1", k))} - ${f(col("2", k))}`, "3");
      const l5 = l3 - col("4a", k) - col("4b", k);
      c.set(`line5_${k}`, k === "c" ? Math.max(0, l5) : l5, `Line 5 (${k.toUpperCase()})`, `${f(l3)} - ${f(col("4a", k))} - ${f(col("4b", k))}`, "5");
      const l8 = c.set(`line8_${k}`, Math.max(0, col("6", k) - col("7", k)), `Line 8 (${k.toUpperCase()})`, `${f(col("6", k))} - ${f(col("7", k))}`, "8");
      c.set(`line11_${k}`, l8 + col("10", k), `Line 11 (${k.toUpperCase()})`, `${f(l8)} + ${f(col("10", k))}`, "11");
    }
    for (const line of ["1", "2", "3", "4a", "4b", "5", "6", "7", "8", "10", "11", "12", "13", "14", "15", "25", "27"]) if (["3", "5", "8", "11"].includes(line) || c.has(`line${line}_a`) || c.has(`line${line}_c`)) setB(line, col(line, "a"), col(line, "c"));
    const l17 = c.set("line17", col("12", "c") + col("13", "c") + col("14", "c") + col("15", "c") + c.n("line16"), "Total payments", `12 + 13 + 14 + 15 (column C) + ${f(c.n("line16"))}`, "17");
    const l19 = c.set("line19", l17 - c.n("line18"), "Payments less the prior overpayment", `${f(l17)} - ${f(c.n("line18"))}`, "19");
    const tax = c.n("line11_c");
    c.set("line20", Math.max(0, tax - l19), "Amount you owe", `max(0, ${f(tax)} - ${f(l19)})`, "20");
    const l21 = c.set("line21", Math.max(0, l19 - tax), "Overpayment", `max(0, ${f(l19)} - ${f(tax)})`, "21");
    c.set("line22", Math.max(0, l21 - c.n("line23")), "Refunded to you", `${f(l21)} - ${f(c.n("line23"))}`, "22");
    const deps = c.list("dependents");
    if (deps.length) c.out["dependents"] = deps.map((d: ListRow) => ({ ...d, name: [d["first_name"], d["last_name"]].filter(Boolean).map(String).join(" ") || d["name"] || "" }));
    if (!c.str("explanation")) c.warn("Part III explanation is required: describe each change and the reason.");
    if (!c.str("tax_year")) c.warn("Enter tax_year (the year being amended).");
    return c.result();
  },
};
