import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

type Y<T> = Partial<Record<TaxYear, T>>;
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const P2 = (n: number) => `Page2[0].f2_${n}[0]`;
const nm = (y24: string, y25: string): { names: Y<string> } => ({ names: { 2024: y24, 2025: y25 } });
const line1 = (y24: number, y25: number) => nm(P1(y24), P1(y25));
const money = (id: string, line: string, label: string, locate: FieldDef["locate"] | undefined, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", ...(locate ? { locate } : {}), ...extra });
const comp = (id: string, line: string, label: string, locate: FieldDef["locate"] | undefined, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });
const rows3 = (fn: (r: number) => string) => [1, 2, 3].map(fn);

/** Line 8 decimal: 35% at AGI up to $15,000, down 1 point per $2,000, floor 20% above $43,000. */
function decimal(agi: number): number {
  if (agi <= 15000) return 35;
  return Math.max(20, 35 - Math.ceil((agi - 15000) / 2000));
}

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: { name: P1(2) } },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  { id: "mfs_exception", line: "A", label: "Married filing separately and you meet the requirements to claim the credit (see Married Persons Filing Separately)", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "deemed_income_student_disabled", line: "B", label: "You or your spouse was a student or disabled and you are entering deemed income of $250 or $500 a month", type: "checkbox", locate: { name: "Page1[0].c1_2[0]" } },
  { id: "more_than_three_providers", line: "1", label: "More than three care providers (attach a statement)", type: "checkbox", locate: { name: "Page1[0].PartI[0].c1_3[0]" } },
  {
    id: "providers",
    line: "1",
    label: "Care providers (up to 3): name, address, SSN or EIN, household employee?, amount paid",
    type: "list",
    rows: 3,
    items: [
      { id: "name", label: "Care provider's name", type: "text" },
      { id: "address", label: "Address (number, street, apt. no., city, state, ZIP)", type: "text" },
      { id: "id_number", label: "Identifying number (SSN or EIN)", type: "text", maxLen: 11 },
      { id: "household_employee", label: "Was the care provider your household employee?", type: "yesno" },
      { id: "amount_paid", label: "Amount paid", type: "money" },
    ],
    listLocate: {
      2024: { name: rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].f1_${3 + 5 * (r - 1)}[0]`), address: rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].ColB[0].f1_${4 + 5 * (r - 1)}[0]`), id_number: rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].f1_${6 + 5 * (r - 1)}[0]`), "household_employee.yes": rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].ColD[0].c1_${3 + r}[0]`), "household_employee.no": rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].ColD[0].c1_${3 + r}[1]`), amount_paid: rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].f1_${7 + 5 * (r - 1)}[0]`) },
      2025: { name: rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].f1_${3 + 4 * (r - 1)}[0]`), address: rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].ColB[0].f1_${4 + 4 * (r - 1)}[0]`), id_number: rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].f1_${5 + 4 * (r - 1)}[0]`), "household_employee.yes": rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].ColD[0].c1_${3 + r}[0]`), "household_employee.no": rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].ColD[0].c1_${3 + r}[1]`), amount_paid: rows3((r) => `Page1[0].PartITable[0].BodyRow${r}[0].f1_${6 + 4 * (r - 1)}[0]`) },
    },
  },
  { id: "more_than_three_persons", line: "2", label: "More than three qualifying persons (attach a statement)", type: "checkbox", locate: { name: "Page1[0].c1_7[0]" } },
  {
    id: "persons",
    line: "2",
    label: "Qualifying persons (up to 3): first name, last name, SSN, over age 12 and disabled?, qualified expenses paid this year",
    type: "list",
    rows: 3,
    items: [
      { id: "first_name", label: "First name", type: "text" },
      { id: "last_name", label: "Last name", type: "text" },
      { id: "ssn", label: "Qualifying person's SSN", type: "ssn" },
      { id: "over_12_disabled", label: "Check if the qualifying person was over age 12 and was disabled", type: "checkbox" },
      { id: "expenses", label: "Qualified expenses incurred and paid this year (exclude benefits on line 28)", type: "money" },
    ],
    listLocate: {
      2024: { first_name: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${18 + 4 * (r - 1)}[0]`), last_name: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${19 + 4 * (r - 1)}[0]`), ssn: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${20 + 4 * (r - 1)}[0]`), over_12_disabled: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].c1_${7 + r}[0]`), expenses: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${21 + 4 * (r - 1)}[0]`) },
      2025: { first_name: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${15 + 4 * (r - 1)}[0]`), last_name: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${16 + 4 * (r - 1)}[0]`), ssn: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${17 + 4 * (r - 1)}[0]`), over_12_disabled: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].c1_${7 + r}[0]`), expenses: rows3((r) => `Page1[0].Table_Line2[0].Row${r}[0].f1_${18 + 4 * (r - 1)}[0]`) },
    },
  },
  comp("line3", "3", "Qualified expenses limited to $3,000 (one person) or $6,000 (two or more), or line 31 when Part III applies", line1(30, 27), "min(sum of line 2 column (e), 3,000 or 6,000); line 31 if dependent care benefits"),
  money("line4", "4", "Your earned income", line1(31, 28)),
  money("line5", "5", "Spouse's earned income if married filing jointly (student or disabled: see instructions); all others enter line 4", line1(32, 29), { notes: "Defaults to line 4 when not married filing jointly." }),
  comp("line6", "6", "Smallest of line 3, 4, or 5", line1(33, 30), "min(3, 4, 5)"),
  money("line7", "7", "Amount from Form 1040 line 11 (AGI)", line1(34, 31)),
  { id: "line8", line: "8", label: "Decimal amount from the table (as two digits, e.g. 35 for .35)", type: "text", computed: true, maxLen: 2, locate: line1(35, 32) },
  comp("line9a", "9a", "Multiply line 6 by the decimal on line 8", line1(36, 33), "6 x 8"),
  money("line9b", "9b", "Credit for prior-year expenses paid this year (from the worksheet in the instructions)", line1(37, 34)),
  comp("line9c", "9c", "Add lines 9a and 9b", line1(38, 35), "9a + 9b"),
  money("line10", "10", "Tax liability limit (Credit Limit Worksheet: Form 1040 line 18 minus Schedule 3 line 1)", line1(39, 36)),
  comp("line11", "11", "Credit for child and dependent care expenses; carried to Schedule 3 line 2", line1(40, 37), "smaller of line 9c or line 10", { alwaysShow: true }),
  money("line12", "12", "Dependent care benefits received this year (W-2 box 10; sole proprietors/partners see instructions)", { name: P2(1) }),
  money("line13", "13", "Amount carried over from the prior year and used this year during the grace period", { name: P2(2) }),
  money("line14", "14", "Amount forfeited or carried forward to next year (entered as a positive number)", { name: P2(3) }),
  comp("line15", "15", "Combine lines 12 through 14", { name: P2(4) }, "12 + 13 - 14"),
  money("line16", "16", "Qualified expenses incurred this year for the care of the qualifying person(s)", { name: "Page2[0].Line16_ReadOrder[0].f2_5[0]" }),
  comp("line17", "17", "Smaller of line 15 or 16", { name: P2(6) }, "min(15, 16)"),
  money("line18", "18", "Your earned income (Part III)", { name: P2(7) }, { notes: "Defaults to line 4." }),
  money("line19", "19", "Spouse's earned income if married filing jointly; all others enter line 18", { name: P2(8) }, { notes: "Defaults to line 5 / line 18." }),
  comp("line20", "20", "Smallest of line 17, 18, or 19", { name: P2(9) }, "min(17, 18, 19)"),
  money("line21", "21", "$5,000 ($2,500 if married filing separately and required to enter spouse's earned income)", { name: P2(10) }, { notes: "Defaults to 5,000 (2,500 MFS)." }),
  { id: "line22_sole_proprietorship", line: "22", label: "Is any amount on line 12 from your sole proprietorship or partnership?", type: "yesno", locate: { yes: { name: "Page2[0].c2_1[0]" }, no: { name: "Page2[0].c2_1[1]" } } },
  money("line22", "22", "Amount on line 12 from your sole proprietorship or partnership", { name: P2(11) }),
  comp("line23", "23", "Subtract line 22 from line 15", { name: P2(12) }, "15 - 22"),
  comp("line24", "24", "Deductible benefits (smallest of line 20, 21, or 22); also include on the appropriate line of your return", { name: P2(13) }, "min(20, 21, 22)"),
  comp("line25", "25", "Excluded benefits", { name: P2(14) }, "min(20, 21) if line 22 is zero; otherwise min(20, 21) - 24, not less than zero"),
  comp("line26", "26", "Taxable benefits; carried to Form 1040 line 1e", { name: P2(15) }, "23 - 25, not less than zero", { alwaysShow: true }),
  comp("line27", "27", "$3,000 ($6,000 if two or more qualifying persons)", { name: P2(16) }, "3,000 or 6,000"),
  comp("line28", "28", "Add lines 24 and 25", { name: P2(17) }, "24 + 25"),
  comp("line29", "29", "Subtract line 28 from line 27; if zero or less, stop", { name: P2(18) }, "27 - 28"),
  comp("line30", "30", "Total of line 2 column (e)", { name: P2(19) }, "sum of qualified expenses"),
  comp("line31", "31", "Smaller of line 29 or 30; carried to line 3", { name: P2(20) }, "min(29, 30)"),
];

export const form2441: FormDef = {
  id: "f2441",
  title: "Form 2441, Child and Dependent Care Expenses",
  shortTitle: "Form 2441",
  description: "The child and dependent care credit (20% to 35% of up to $3,000/$6,000 of expenses, limited by earned income and tax) and the exclusion of employer dependent care benefits. Line 11 goes to Schedule 3 line 2; taxable benefits go to Form 1040 line 1e.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i2441.pdf",
  notes: `**Who qualifies.** Expenses so you (and your spouse) could work or look for work, for a child under 13 or a disabled spouse/dependent. Both spouses need earned income on a joint return (deemed $250/$500 a month for a student or disabled spouse). Married filing separately generally cannot claim it (check line A if you meet the exception). Every provider needs a name, address, and SSN/EIN (Form W-10).

**What the engine computes.** Lines 3, 5 (defaults to line 4), 6, 8 (the AGI decimal), 9a, 9c, 11, and Part III lines 15, 17, 20, 23 through 31 when dependent care benefits are reported. In a full return: earned income comes from wages plus net self-employment income, line 7 is AGI, line 10 is tax after the foreign tax credit, line 11 flows to Schedule 3 line 2, and line 26 to Form 1040 line 1e.

**What to verify.** Expenses on line 2 exclude the excluded benefits on line 28; prior-year expenses paid this year use the line 9b worksheet; a spouse who was a student or disabled uses the deemed income on line 5 and line 19.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status");
    const rowMoney = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
    const persons = c.list("persons");
    const count = c.bool("more_than_three_persons") ? Math.max(2, persons.length) : persons.length;
    const cap = count >= 2 ? 6000 : 3000;
    const expenses = persons.reduce((a, r) => a + rowMoney(r, "expenses"), 0);
    if (persons.length === 0) c.warn("No qualifying persons were listed on line 2.");
    const providers = c.list("providers");
    for (const [i, p] of providers.entries()) if (!String(p["id_number"] ?? "").trim()) c.warn(`providers[${i}] has no SSN/EIN; the IRS requires it (or due-diligence documentation).`);
    const l4 = c.n("line4");
    const l5 = c.has("line5") ? c.n("line5") : l4;
    if (!c.has("line5") && status === "mfj") c.warn("Married filing jointly: line5 (spouse's earned income) was not supplied; line 4 was used. Supply it, or the deemed amount for a student/disabled spouse.");
    c.out["line5"] = l5;

    // Part III: dependent care benefits.
    let l31: number | undefined;
    if (c.has("line12") || c.has("line13")) {
      const l15 = c.set("line15", c.n("line12") + c.n("line13") - c.n("line14"), "Net benefits", `${f(c.n("line12"))} + ${f(c.n("line13"))} - ${f(c.n("line14"))}`, "15");
      const l17 = c.set("line17", Math.min(l15, c.n("line16")), "Smaller of 15 or 16", `min(${f(l15)}, ${f(c.n("line16"))})`, "17");
      const l18 = c.has("line18") ? c.n("line18") : l4;
      const l19 = c.has("line19") ? c.n("line19") : status === "mfj" ? l5 : l18;
      c.out["line18"] = l18;
      c.out["line19"] = l19;
      const l20 = c.set("line20", Math.min(l17, l18, l19), "Smallest of 17, 18, 19", `min(${f(l17)}, ${f(l18)}, ${f(l19)})`, "20");
      const l21 = c.has("line21") ? c.n("line21") : status === "mfs" ? 2500 : 5000;
      c.out["line21"] = l21;
      const soleProp = c.bool("line22_sole_proprietorship");
      const l22 = soleProp ? c.n("line22") : 0;
      c.out["line22"] = l22;
      const l23 = c.set("line23", l15 - l22, "Line 15 minus line 22", `${f(l15)} - ${f(l22)}`, "23");
      const l24 = c.set("line24", l22 > 0 ? Math.min(l20, l21, l22) : 0, "Deductible benefits", l22 > 0 ? `min(${f(l20)}, ${f(l21)}, ${f(l22)})` : "no sole proprietorship benefits", "24");
      const l25 = c.set("line25", l22 > 0 ? Math.max(0, Math.min(l20, l21) - l24) : Math.min(l20, l21), "Excluded benefits", l22 > 0 ? `min(${f(l20)}, ${f(l21)}) - ${f(l24)}` : `min(${f(l20)}, ${f(l21)})`, "25");
      c.set("line26", Math.max(0, l23 - l25), "Taxable benefits", `max(0, ${f(l23)} - ${f(l25)})`, "26");
      const l27 = c.set("line27", cap, "Expense limit", `${count} qualifying person(s)`, "27");
      const l28 = c.set("line28", l24 + l25, "Benefits used", `${f(l24)} + ${f(l25)}`, "28");
      const l29 = c.set("line29", Math.max(0, l27 - l28), "Remaining limit", `max(0, ${f(l27)} - ${f(l28)})`, "29");
      const l30 = c.set("line30", expenses, "Qualified expenses (line 2 column (e))", "sum", "30");
      l31 = c.set("line31", Math.min(l29, l30), "Expenses eligible for the credit", `min(${f(l29)}, ${f(l30)})`, "31");
      if (l24 > 0) c.warn(`Line 24 deductible benefits (${f(l24)}) must also be entered on the appropriate line of your return (Schedule C or Schedule 1); the engine does not place them.`);
    }

    // Part II credit.
    const l3 = c.set("line3", l31 !== undefined ? l31 : Math.min(expenses, cap), "Qualified expenses", l31 !== undefined ? `line 31 ${f(l31)}` : `min(${f(expenses)}, ${f(cap)})`, "3");
    const l6 = c.set("line6", Math.min(l3, l4, l5), "Smallest of 3, 4, 5", `min(${f(l3)}, ${f(l4)}, ${f(l5)})`, "6");
    const agi = c.n("line7");
    const dec = decimal(agi);
    c.setScalar("line8", String(dec), "Decimal amount", `AGI ${f(agi)}: .${dec}`, "8");
    const l9a = c.set("line9a", Math.round((l6 * dec) / 100), "Tentative credit", `${f(l6)} x .${dec}`, "9a");
    const l9c = c.set("line9c", l9a + c.n("line9b"), "Add 9a and 9b", `${f(l9a)} + ${f(c.n("line9b"))}`, "9c");
    let l11 = c.has("line10") ? Math.min(l9c, c.n("line10")) : l9c;
    if (!c.has("line10") && l9c > 0) c.warn("line10 (tax liability limit) was not supplied; the credit is shown without the limit.");
    if (status === "mfs" && !c.bool("mfs_exception") && l11 > 0) {
      c.warn("Married filing separately: the credit is not allowed unless you meet the exception (check mfs_exception). Credit set to zero.");
      l11 = 0;
    }
    if (l4 <= 0 && l9c > 0) c.warn("No earned income on line 4: the credit is zero unless deemed income applies.");
    c.set("line11", l11, "Child and dependent care credit", c.has("line10") ? `min(${f(l9c)}, ${f(c.n("line10"))})` : `line 9c ${f(l9c)}`, "11");
    return c.result();
  },
};
