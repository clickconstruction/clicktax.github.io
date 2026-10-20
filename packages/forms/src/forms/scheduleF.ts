import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, Locate } from "../types.ts";

/** The 2024 PDF zero-pads single-digit widget numbers (f1_01); the 2025 PDF does not (f1_1). Numbers 10 and up match. */
const nm = (page: 1 | 2, n: number, wrap = ""): Locate => {
  const w = wrap ? `${wrap}[0].` : "";
  return n < 10
    ? { names: { 2024: `Page${page}[0].${w}f${page}_0${n}[0]`, 2025: `Page${page}[0].${w}f${page}_${n}[0]` } }
    : { name: `Page${page}[0].${w}f${page}_${n}[0]` };
};
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, locate: Locate, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: Locate, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });

/** Part II expense lines 10 through 22 sit in the left column (Lines10-22 subform); 23 through 31 in the right column. */
const EXPENSES: Array<[string, string, string]> = [
  ["line10", "10", "Car and truck expenses (attach Form 4562 if required)"],
  ["line11", "11", "Chemicals"],
  ["line12", "12", "Conservation expenses"],
  ["line13", "13", "Custom hire (machine work)"],
  ["line14", "14", "Depreciation and section 179 expense (Form 4562)"],
  ["line15", "15", "Employee benefit programs other than on line 23"],
  ["line16", "16", "Feed"],
  ["line17", "17", "Fertilizers and lime"],
  ["line18", "18", "Freight and trucking"],
  ["line19", "19", "Gasoline, fuel, and oil"],
  ["line20", "20", "Insurance (other than health)"],
  ["line21a", "21a", "Interest: mortgage (paid to banks, etc.)"],
  ["line21b", "21b", "Interest: other"],
  ["line22", "22", "Labor hired (less employment credits)"],
  ["line23", "23", "Pension and profit-sharing plans"],
  ["line24a", "24a", "Rent or lease: vehicles, machinery, equipment"],
  ["line24b", "24b", "Rent or lease: other (land, animals, etc.)"],
  ["line25", "25", "Repairs and maintenance"],
  ["line26", "26", "Seeds and plants"],
  ["line27", "27", "Storage and warehousing"],
  ["line28", "28", "Supplies"],
  ["line29", "29", "Taxes"],
  ["line30", "30", "Utilities"],
  ["line31", "31", "Veterinary, breeding, and medicine"],
];
const expenseFields: FieldDef[] = EXPENSES.map(([id, line, label], i) =>
  money(id, line, label, i < 14 ? { name: `Page1[0].Lines10-22[0].f1_${23 + i}[0]` } : { name: P1(37 + (i - 14)) }),
);
const OTHER_ROWS = 6;

const fields: FieldDef[] = [
  { id: "name", label: "Name of proprietor", type: "text", locate: nm(1, 1) },
  { id: "ssn", label: "Social security number", type: "ssn", maxLen: 9, locate: nm(1, 2) },
  { id: "principal_crop", line: "A", label: "Principal crop or activity", type: "text", locate: nm(1, 3) },
  { id: "activity_code", line: "B", label: "Principal agricultural activity code (6 digits, from the Schedule F instructions)", type: "text", maxLen: 6, locate: nm(1, 4, "CombField_LineB") },
  { id: "accounting_method", line: "C", label: "Accounting method", type: "choice", choices: ["cash", "accrual"], locate: { cash: { name: "Page1[0].LineC_ReadOrder[0].c1_1[0]" }, accrual: { name: "Page1[0].LineC_ReadOrder[0].c1_1[1]" } }, notes: "Cash-method farms complete Part I; accrual-method farms complete Part III and carry line 50 to line 9. Defaults to cash." },
  { id: "ein", line: "D", label: "Employer ID number (EIN), if any", type: "ein", maxLen: 9, locate: nm(1, 5, "CombField_LineD") },
  { id: "material_participation", line: "E", label: "Did you materially participate in the operation of this business during the year?", type: "yesno", locate: { yes: { name: "Page1[0].c1_2[0]" }, no: { name: "Page1[0].c1_2[1]" } } },
  { id: "payments_requiring_1099", line: "F", label: "Did you make any payments during the year that would require you to file Form(s) 1099?", type: "yesno", locate: { yes: { name: "Page1[0].c1_3[0]" }, no: { name: "Page1[0].c1_3[1]" } } },
  { id: "filed_1099", line: "G", label: "If yes, did you or will you file required Form(s) 1099?", type: "yesno", locate: { yes: { name: "Page1[0].c1_4[0]" }, no: { name: "Page1[0].c1_4[1]" } } },
  money("line1a", "1a", "Sales of purchased livestock and other resale items", nm(1, 6)),
  money("line1b", "1b", "Cost or other basis of purchased livestock or other items reported on line 1a", nm(1, 7)),
  comp("line1c", "1c", "Subtract line 1b from line 1a", nm(1, 8), "1a - 1b"),
  money("line2", "2", "Sales of livestock, produce, grains, and other products you raised", nm(1, 9)),
  money("line3a", "3a", "Cooperative distributions (Form(s) 1099-PATR)", nm(1, 10)),
  money("line3b", "3b", "Cooperative distributions: taxable amount", nm(1, 11), { notes: "Defaults to line 3a when not supplied." }),
  money("line4a", "4a", "Agricultural program payments", nm(1, 12)),
  money("line4b", "4b", "Agricultural program payments: taxable amount", nm(1, 13), { notes: "Defaults to line 4a when not supplied." }),
  money("line5a", "5a", "Commodity Credit Corporation (CCC) loans reported under election", nm(1, 14)),
  money("line5b", "5b", "CCC loans forfeited", nm(1, 15)),
  money("line5c", "5c", "CCC loans forfeited: taxable amount", nm(1, 16), { notes: "Defaults to line 5b when not supplied." }),
  money("line6a", "6a", "Crop insurance proceeds and federal crop disaster payments: amount received this year", nm(1, 17)),
  money("line6b", "6b", "Crop insurance proceeds: taxable amount", nm(1, 18), { notes: "Defaults to line 6a when not supplied, unless the deferral election box (line 6c) is checked." }),
  { id: "line6c", line: "6c", label: "Election to defer crop insurance proceeds to the next year is attached", type: "checkbox", locate: { name: "Page1[0].c1_5[0]" } },
  money("line6d", "6d", "Amount deferred from the prior year", nm(1, 19)),
  money("line7", "7", "Custom hire (machine work) income", nm(1, 20)),
  money("line8", "8", "Other income, including federal and state gasoline or fuel tax credit or refund", nm(1, 21)),
  comp("line9", "9", "Gross income (cash method: add lines 1c, 2, 3b, 4b, 5a, 5c, 6b, 6d, 7, and 8; accrual method: Part III line 50)", nm(1, 22), "cash: 1c + 2 + 3b + 4b + 5a + 5c + 6b + 6d + 7 + 8; accrual: line 50", { alwaysShow: true }),
  ...expenseFields,
  {
    id: "other_expenses",
    line: "32",
    label: "Other expenses: description and amount (up to 6 rows)",
    type: "list",
    rows: OTHER_ROWS,
    items: [
      { id: "description", label: "Description", type: "text" },
      { id: "amount", label: "Amount", type: "money" },
    ],
    listLocate: { 2024: { description: [47, 49, 51, 53, 55, 57].map(P1), amount: [48, 50, 52, 54, 56, 58].map(P1) }, 2025: { description: [47, 49, 51, 53, 55, 57].map(P1), amount: [48, 50, 52, 54, 56, 58].map(P1) } },
  },
  comp("line33", "33", "Total expenses. Add lines 10 through 32f", { name: P1(59) }, "sum of lines 10 through 32f", { alwaysShow: true }),
  comp("line34", "34", "Net farm profit or (loss). Subtract line 33 from line 9; to Schedule 1 line 6 and Schedule SE line 1a", { name: P1(60) }, "9 - 33", { alwaysShow: true }),
  { id: "at_risk", line: "36", label: "If you have a loss: is all your investment at risk (\"all\") or is some investment not at risk (\"some\", attach Form 6198)?", type: "choice", choices: ["all", "some"], locate: { all: { name: "Page1[0].c1_6[0]" }, some: { name: "Page1[0].c1_6[1]" } } },
  // Part III: farm income, accrual method.
  money("line37", "37", "Sales of livestock, produce, grains, and other products", nm(2, 1)),
  money("line38a", "38a", "Cooperative distributions (Form(s) 1099-PATR)", nm(2, 2, "Line38a_ReadOrder")),
  money("line38b", "38b", "Cooperative distributions: taxable amount", nm(2, 3), { notes: "Defaults to line 38a when not supplied." }),
  money("line39a", "39a", "Agricultural program payments", nm(2, 4, "Line39a_ReadOrder")),
  money("line39b", "39b", "Agricultural program payments: taxable amount", nm(2, 5), { notes: "Defaults to line 39a when not supplied." }),
  money("line40a", "40a", "CCC loans reported under election", nm(2, 6)),
  money("line40b", "40b", "CCC loans forfeited", nm(2, 7, "Line40b_ReadOrder")),
  money("line40c", "40c", "CCC loans forfeited: taxable amount", nm(2, 8), { notes: "Defaults to line 40b when not supplied." }),
  money("line41", "41", "Crop insurance proceeds", nm(2, 9)),
  money("line42", "42", "Custom hire (machine work) income", { name: "Page2[0].f2_10[0]" }),
  money("line43", "43", "Other income", { name: "Page2[0].f2_11[0]" }),
  comp("line44", "44", "Add amounts in the right column for lines 37 through 43", { name: "Page2[0].f2_12[0]" }, "37 + 38b + 39b + 40a + 40c + 41 + 42 + 43"),
  money("line45", "45", "Inventory of livestock, produce, grains, and other products at the beginning of the year", { name: "Page2[0].Line45_ReadOrder[0].f2_13[0]" }),
  money("line46", "46", "Cost of livestock, produce, grains, and other products purchased during the year", { name: "Page2[0].f2_14[0]" }),
  comp("line47", "47", "Add lines 45 and 46", { name: "Page2[0].f2_15[0]" }, "45 + 46"),
  money("line48", "48", "Inventory of livestock, produce, grains, and other products at the end of the year", { name: "Page2[0].f2_16[0]" }),
  comp("line49", "49", "Cost of livestock, produce, grains, and other products sold. Subtract line 48 from line 47", { name: "Page2[0].f2_17[0]" }, "47 - 48"),
  comp("line50", "50", "Gross income (accrual method). Subtract line 49 from line 44; to line 9", { name: "Page2[0].f2_18[0]" }, "44 - 49"),
  { id: "crp_payments", label: "Conservation Reserve Program payments included on line 4b that you received while receiving social security retirement or disability benefits (excluded from self-employment tax on Schedule SE line 1b)", type: "money", noPdf: true },
];

export const scheduleF: FormDef = {
  id: "f1040sf",
  title: "Schedule F (Form 1040), Profit or Loss From Farming",
  shortTitle: "Schedule F",
  description: "Farm income and expenses for a sole proprietor (or a spouse) under the cash or accrual method. Line 34 goes to Schedule 1 line 6 and Schedule SE line 1a.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040sf.pdf",
  notes: `**Who files.** Sole proprietors who cultivate, operate, or manage a farm for profit (crops, livestock, dairy, poultry, fish, fruit, nurseries). Farm rental income where you did not materially participate goes on Form 4835 instead; a farm run as a partnership or corporation files its own return.

**What the engine computes.** Line 1c, the taxable amounts on lines 3b, 4b, 5c, 6b, 38b, 39b, and 40c (equal to the gross amounts unless you supply a smaller taxable figure), line 9 gross income (Part I for the cash method, Part III line 50 for the accrual method), line 33 total expenses, line 34 net profit or loss, and Part III lines 44, 47, 49, and 50.

**What to verify.** Depreciation (line 14) comes from Form 4562 when you bought assets this year. Line 22 labor is net of employment credits. Crop insurance deferrals (line 6c) need the election statement. A loss with some investment not at risk needs Form 6198. Net farm profit is self-employment income unless the optional farm method applies; Conservation Reserve Program payments received while on social security are excluded on Schedule SE line 1b (supply crp_payments).`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const method = c.str("accounting_method") === "accrual" ? "accrual" : "cash";
    if (!c.has("accounting_method")) c.out["accounting_method"] = "cash";
    const taxable = (gross: string, tax: string, line: string) => {
      if (!c.has(tax) && c.has(gross)) {
        c.out[tax] = c.n(gross);
        c.computations.push({ id: tax, line, label: `Taxable amount (defaulted to line ${gross.replace("line", "")})`, value: c.n(gross), formula: `= ${gross.replace("line", "line ")}` });
      }
      return c.n(tax);
    };
    const l1c = c.set("line1c", c.n("line1a") - c.n("line1b"), "Resale items net", `${f(c.n("line1a"))} - ${f(c.n("line1b"))}`, "1c");
    const l3b = taxable("line3a", "line3b", "3b");
    const l4b = taxable("line4a", "line4b", "4b");
    const l5c = taxable("line5b", "line5c", "5c");
    let l6b = c.n("line6b");
    if (!c.has("line6b") && c.has("line6a")) {
      if (c.bool("line6c")) c.warn("Line 6c (deferral election) is checked and line 6b was not supplied: the crop insurance proceeds on line 6a are treated as deferred to next year (line 6b = 0).");
      else l6b = taxable("line6a", "line6b", "6b");
    }
    // Part III (accrual method).
    const l38b = taxable("line38a", "line38b", "38b");
    const l39b = taxable("line39a", "line39b", "39b");
    const l40c = taxable("line40b", "line40c", "40c");
    const part3 = ["line37", "line38a", "line39a", "line40a", "line40b", "line41", "line42", "line43", "line45", "line46", "line48"].some((k) => c.has(k));
    let l50 = 0;
    if (method === "accrual" || part3) {
      const l44 = c.set("line44", c.n("line37") + l38b + l39b + c.n("line40a") + l40c + c.sum(["line41", "line42", "line43"]), "Accrual income before inventory", "37 + 38b + 39b + 40a + 40c + 41 + 42 + 43", "44");
      const l47 = c.set("line47", c.n("line45") + c.n("line46"), "Beginning inventory plus purchases", `${f(c.n("line45"))} + ${f(c.n("line46"))}`, "47");
      const l49 = c.set("line49", l47 - c.n("line48"), "Cost of products sold", `${f(l47)} - ${f(c.n("line48"))}`, "49");
      l50 = c.set("line50", l44 - l49, "Gross income (accrual)", `${f(l44)} - ${f(l49)}`, "50");
      if (method === "cash") c.warn("Part III amounts were supplied but the accounting method is cash; line 9 uses Part I. Set accounting_method to \"accrual\" to use line 50.");
    }
    const cashIncome = l1c + c.n("line2") + l3b + l4b + c.n("line5a") + l5c + l6b + c.sum(["line6d", "line7", "line8"]);
    const l9 = method === "accrual"
      ? c.set("line9", l50, "Gross income", "Part III line 50", "9")
      : c.set("line9", cashIncome, "Gross income", `1c ${f(l1c)} + 2 ${f(c.n("line2"))} + 3b ${f(l3b)} + 4b ${f(l4b)} + 5a ${f(c.n("line5a"))} + 5c ${f(l5c)} + 6b ${f(l6b)} + 6d ${f(c.n("line6d"))} + 7 ${f(c.n("line7"))} + 8 ${f(c.n("line8"))}`, "9");
    if (method === "accrual" && ["line1a", "line2", "line7", "line8"].some((k) => c.has(k))) c.warn("Accrual method: Part I income lines 1 through 8 are not used; line 9 comes from Part III line 50.");
    const rows = c.list("other_expenses");
    if (rows.length > OTHER_ROWS) c.warn(`More than ${OTHER_ROWS} other expenses: only the first ${OTHER_ROWS} print; attach a statement for the rest.`);
    const other = rows.reduce((a, r: ListRow) => a + (Number(r["amount"] ?? 0) || 0), 0);
    const expenses = c.sum(EXPENSES.map(([id]) => id)) + other;
    const l33 = c.set("line33", expenses, "Total expenses", `lines 10-31 ${f(expenses - other)} + other expenses ${f(other)}`, "33");
    const l34 = c.set("line34", l9 - l33, "Net farm profit or (loss)", `${f(l9)} - ${f(l33)}`, "34");
    if (l34 < 0 && !c.has("at_risk")) c.warn("Line 34 is a loss: check line 36a (all investment at risk) or 36b (some investment not at risk; attach Form 6198) by supplying at_risk.");
    if (l34 < 0 && c.str("at_risk") === "some") c.warn("Some investment is not at risk: the deductible loss is limited by Form 6198, which this tool does not prepare.");
    if (c.n("line14") > 0) c.warn("Line 14 depreciation: attach Form 4562 if you placed property in service this year or claim listed-property or section 179 deductions.");
    if (c.bool("payments_requiring_1099") && !c.has("filed_1099")) c.warn("Line F is yes: also answer line G (filed_1099).");
    if (c.n("crp_payments") > l4b) c.warn("crp_payments exceeds the taxable agricultural program payments on line 4b.");
    return c.result();
  },
};
