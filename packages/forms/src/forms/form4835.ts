import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const P = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });

/** Part II expenses: lines 8 through 20 in the left column (Part2_LeftCol f1_17 to f1_30), 21 through 29 in the right column. */
const EXPENSES: Array<[string, string, string]> = [
  ["line8", "8", "Car and truck expenses (attach Form 4562 if required)"],
  ["line9", "9", "Chemicals"],
  ["line10", "10", "Conservation expenses"],
  ["line11", "11", "Custom hire (machine work)"],
  ["line12", "12", "Depreciation and section 179 expense deduction not claimed elsewhere"],
  ["line13", "13", "Employee benefit programs other than on line 21"],
  ["line14", "14", "Feed"],
  ["line15", "15", "Fertilizers and lime"],
  ["line16", "16", "Freight and trucking"],
  ["line17", "17", "Gasoline, fuel, and oil"],
  ["line18", "18", "Insurance (other than health)"],
  ["line19a", "19a", "Interest: mortgage (paid to banks, etc.)"],
  ["line19b", "19b", "Interest: other"],
  ["line20", "20", "Labor hired (less employment credits)"],
  ["line21", "21", "Pension and profit-sharing plans"],
  ["line22a", "22a", "Rent or lease: vehicles, machinery, and equipment"],
  ["line22b", "22b", "Rent or lease: other (land, animals, etc.)"],
  ["line23", "23", "Repairs and maintenance"],
  ["line24", "24", "Seeds and plants"],
  ["line25", "25", "Storage and warehousing"],
  ["line26", "26", "Supplies"],
  ["line27", "27", "Taxes"],
  ["line28", "28", "Utilities"],
  ["line29", "29", "Veterinary, breeding, and medicine"],
];
const expenseFields: FieldDef[] = EXPENSES.map(([id, line, label], i) => money(id, line, label, i < 14 ? `Page1[0].Part2_LeftCol[0].f1_${17 + i}[0]` : P(31 + (i - 14))));
const OTHER_ROWS = 7;

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on tax return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "ein", label: "Employer ID number (EIN), if any", type: "ein", maxLen: 9, locate: { name: "Page1[0].Comb[0].f1_03[0]" } },
  { id: "active_participation", line: "A", label: "Did you actively participate in the operation of this farm during the year?", type: "yesno", locate: { yes: { name: "Page1[0].c1_1[0]" }, no: { name: "Page1[0].c1_1[1]" } } },
  money("line1", "1", "Income from production of livestock, produce, grains, and other crops", P(4)),
  money("line2a", "2a", "Cooperative distributions (Form(s) 1099-PATR)", P(5)),
  money("line2b", "2b", "Cooperative distributions: taxable amount", P(6), { notes: "Defaults to line 2a." }),
  money("line3a", "3a", "Agricultural program payments", P(7)),
  money("line3b", "3b", "Agricultural program payments: taxable amount", P(8), { notes: "Defaults to line 3a." }),
  money("line4a", "4a", "Commodity Credit Corporation (CCC) loans reported under election", P(9)),
  money("line4b", "4b", "CCC loans forfeited", P(10)),
  money("line4c", "4c", "CCC loans forfeited: taxable amount", P(11), { notes: "Defaults to line 4b." }),
  money("line5a", "5a", "Crop insurance proceeds and federal crop disaster payments received this year", P(12)),
  money("line5b", "5b", "Crop insurance proceeds: taxable amount", P(13), { notes: "Defaults to line 5a unless the deferral box (5c) is checked." }),
  { id: "line5c", line: "5c", label: "Election to defer crop insurance proceeds to the next year is attached", type: "checkbox", locate: { name: "Page1[0].c1_2[0]" } },
  money("line5d", "5d", "Amount deferred from the prior year", P(14)),
  money("line6", "6", "Other income, including federal and state gasoline or fuel tax credit or refund", P(15)),
  comp("line7", "7", "Gross farm rental income. Add amounts in the right column for lines 1 through 6; to Schedule E line 42", P(16), "1 + 2b + 3b + 4a + 4c + 5b + 5d + 6", { alwaysShow: true }),
  ...expenseFields,
  {
    id: "other_expenses",
    line: "30",
    label: "Other expenses: description and amount (up to 7 rows)",
    type: "list",
    rows: OTHER_ROWS,
    items: [
      { id: "description", label: "Description", type: "text" },
      { id: "amount", label: "Amount", type: "money" },
    ],
    listLocate: both({ description: [41, 43, 45, 47, 49, 51, 53].map(P), amount: [42, 44, 46, 48, 50, 52, 54].map(P) }),
  },
  comp("line31", "31", "Total expenses. Add lines 8 through 30g", P(55), "sum of lines 8 through 30g", { alwaysShow: true }),
  comp("line32", "32", "Net farm rental income or (loss). Subtract line 31 from line 7; to Schedule E line 40 when a profit", P(56), "7 - 31", { alwaysShow: true }),
  { id: "at_risk", line: "34", label: "If line 32 is a loss: is all investment at risk (\"all\") or is some investment not at risk (\"some\", attach Form 6198)?", type: "choice", choices: ["all", "some"], locate: { all: { name: "Page1[0].c1_4[0]" }, some: { name: "Page1[0].c1_4[1]" } } },
  comp("line34c", "34c", "Deductible loss (after the at-risk and passive activity limits); to Schedule E line 40", P(58), "line 32 loss when all investment is at risk and the passive loss rules allow it"),
  { id: "allowed_loss", label: "Loss allowed by Form 8582 (passive activity rules) when less than the full loss", type: "money", noPdf: true },
];

export const form4835: FormDef = {
  id: "f4835",
  title: "Form 4835, Farm Rental Income and Expenses",
  shortTitle: "Form 4835",
  description: "Crop-share and livestock-share rental income for a landowner (or sub-lessor) who did not materially participate in the farm's operation; the net result goes to Schedule E line 40 and is not subject to self-employment tax.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f4835.pdf",
  notes: `**Who files.** Landowners paid in a share of crops or livestock who did not materially participate in the farming. Cash rent for farmland goes on Schedule E Part I instead; a landowner who materially participates files Schedule F.

**What the engine computes.** The taxable amounts on lines 2b, 3b, 4c, and 5b (equal to the gross amounts unless you supply less), line 7 gross farm rental income, line 31 total expenses, line 32 net income or loss, and line 34c (the deductible loss when all investment is at risk; supply allowed_loss when Form 8582 limits it). In a full return the result is placed on Schedule E line 40.

**What to verify.** Farm rental activities are passive unless you actively participate (line A), so losses are limited by Form 8582 and the $25,000 special allowance. Depreciation on line 12 needs Form 4562 in the year assets are placed in service.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const taxable = (gross: string, tax: string, line: string) => {
      if (!c.has(tax) && c.has(gross)) {
        c.out[tax] = c.n(gross);
        c.computations.push({ id: tax, line, label: `Taxable amount (defaulted to line ${gross.replace("line", "")})`, value: c.n(gross), formula: `= ${gross.replace("line", "line ")}` });
      }
      return c.n(tax);
    };
    const l2b = taxable("line2a", "line2b", "2b");
    const l3b = taxable("line3a", "line3b", "3b");
    const l4c = taxable("line4b", "line4c", "4c");
    let l5b = c.n("line5b");
    if (!c.has("line5b") && c.has("line5a")) {
      if (c.bool("line5c")) c.warn("Line 5c (deferral election) is checked and line 5b was not supplied: the proceeds on line 5a are treated as deferred (line 5b = 0).");
      else l5b = taxable("line5a", "line5b", "5b");
    }
    const l7 = c.set("line7", c.n("line1") + l2b + l3b + c.n("line4a") + l4c + l5b + c.n("line5d") + c.n("line6"), "Gross farm rental income", `1 ${f(c.n("line1"))} + 2b ${f(l2b)} + 3b ${f(l3b)} + 4a ${f(c.n("line4a"))} + 4c ${f(l4c)} + 5b ${f(l5b)} + 5d ${f(c.n("line5d"))} + 6 ${f(c.n("line6"))}`, "7");
    const rows = c.list("other_expenses");
    if (rows.length > OTHER_ROWS) c.warn(`More than ${OTHER_ROWS} other expenses: only the first ${OTHER_ROWS} print; attach a statement.`);
    const other = rows.reduce((a, r: ListRow) => a + (Number(r["amount"] ?? 0) || 0), 0);
    const l31 = c.set("line31", c.sum(EXPENSES.map(([id]) => id)) + other, "Total expenses", `lines 8-29 ${f(c.sum(EXPENSES.map(([id]) => id)))} + other ${f(other)}`, "31");
    const l32 = c.set("line32", l7 - l31, "Net farm rental income or (loss)", `${f(l7)} - ${f(l31)}`, "32");
    if (l32 < 0) {
      if (!c.has("at_risk")) c.warn("Line 32 is a loss: supply at_risk (\"all\" or \"some\") for line 34.");
      if (c.str("at_risk") === "some") c.warn("Some investment is not at risk: the deductible loss is limited by Form 6198, which this tool does not prepare.");
      const allowed = c.has("allowed_loss") ? -Math.abs(c.n("allowed_loss")) : c.str("at_risk") === "some" ? 0 : l32;
      c.set("line34c", allowed, "Deductible loss", c.has("allowed_loss") ? "Form 8582 allowed loss" : c.str("at_risk") === "some" ? "limited by Form 6198 (not figured)" : "= line 32 (all at risk)", "34c");
      if (!c.has("allowed_loss") && c.has("active_participation") && !c.bool("active_participation")) c.warn("No active participation: the loss is passive and may be limited by Form 8582; supply allowed_loss with the allowed amount.");
    }
    if (c.n("line12") > 0) c.warn("Line 12 depreciation: attach Form 4562 if you placed property in service this year.");
    return c.result();
  },
};
