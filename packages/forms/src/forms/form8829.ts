import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const amt = (id: string, line: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page: 1, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, { computed: true, notes, ...extra });
/** Two-column rows: (a) direct expenses on the left, (b) indirect expenses on the right. */
const col = (id: string, line: string, label: string, side: "a" | "b", extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page: 1, kind: "text", pick: side === "a" ? "leftmost" : "rightmost" }, ...extra });

/** MACRS 39-year nonresidential real property, mid-month convention: first-year percentage by month placed in service. */
const FIRST_YEAR_PCT = [2.461, 2.247, 2.033, 1.819, 1.605, 1.391, 1.177, 0.963, 0.749, 0.535, 0.321, 0.107];

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) of proprietor(s)", type: "text", locate: N("Page1[0].f1_01[0]") },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 11, locate: N("Page1[0].f1_02[0]") },
  { id: "line1", line: "1", label: "Area used regularly and exclusively for business (square feet)", type: "integer", locate: { tok: "1", page: 1, kind: "text" } },
  { id: "line2", line: "2", label: "Total area of home (square feet)", type: "integer", locate: { tok: "2", page: 1, kind: "text" } },
  { id: "line3", line: "3", label: "Line 1 divided by line 2, as a percentage", type: "percent", computed: true, locate: { tok: "3", page: 1, kind: "text" }, alwaysShow: true },
  { id: "line4", line: "4", label: "Daycare only: days used for daycare times hours used per day", type: "integer", locate: { tok: "4", page: 1, kind: "text" } },
  { id: "line5", line: "5", label: "Daycare only: total hours available for use during the year (8,760 for a full year)", type: "integer", locate: { tok: "5", page: 1, kind: "text" } },
  { id: "line6", line: "6", label: "Daycare only: line 4 divided by line 5, as a decimal", type: "percent", computed: true, locate: N("Page1[0].f1_08[0]") },
  { id: "line7", line: "7", label: "Business percentage", type: "percent", computed: true, locate: { tok: "7", page: 1, kind: "text" }, alwaysShow: true, notes: "Line 3, or line 6 times line 3 for daycare facilities not used exclusively for business." },
  amt("line8", "8", "Schedule C line 29 plus gains from the business use of the home, minus losses", { notes: "Filled from Schedule C line 29 when preparing a full return." }),
  col("line9a", "9", "Casualty losses, direct", "a"),
  col("line9b", "9", "Casualty losses, indirect", "b"),
  col("line10a", "10", "Deductible mortgage interest, direct", "a"),
  col("line10b", "10", "Deductible mortgage interest, indirect", "b"),
  col("line11a", "11", "Real estate taxes, direct", "a"),
  col("line11b", "11", "Real estate taxes, indirect", "b"),
  col("line12a", "12", "Add lines 9, 10, and 11, column (a)", "a", { computed: true }),
  col("line12b", "12", "Add lines 9, 10, and 11, column (b)", "b", { computed: true }),
  comp("line13", "13", "Line 12 column (b) times line 7", "indirect x business percentage"),
  comp("line14", "14", "Line 12 column (a) plus line 13", "direct + allowed indirect"),
  comp("line15", "15", "Line 8 minus line 14", "not less than zero"),
  col("line16a", "16", "Excess mortgage interest, direct", "a"),
  col("line16b", "16", "Excess mortgage interest, indirect", "b"),
  col("line17a", "17", "Excess real estate taxes, direct", "a"),
  col("line17b", "17", "Excess real estate taxes, indirect", "b"),
  col("line18a", "18", "Insurance, direct", "a"),
  col("line18b", "18", "Insurance, indirect", "b"),
  col("line19a", "19", "Rent, direct", "a"),
  col("line19b", "19", "Rent, indirect", "b"),
  col("line20a", "20", "Repairs and maintenance, direct", "a"),
  col("line20b", "20", "Repairs and maintenance, indirect", "b"),
  col("line21a", "21", "Utilities, direct", "a"),
  col("line21b", "21", "Utilities, indirect", "b"),
  col("line22a", "22", "Other expenses, direct", "a"),
  col("line22b", "22", "Other expenses, indirect", "b"),
  col("line23a", "23", "Add lines 16 through 22, column (a)", "a", { computed: true }),
  col("line23b", "23", "Add lines 16 through 22, column (b)", "b", { computed: true }),
  comp("line24", "24", "Line 23 column (b) times line 7", "indirect x business percentage"),
  amt("line25", "25", "Carryover of prior year operating expenses (prior year Form 8829 line 43)"),
  comp("line26", "26", "Line 23 column (a) plus lines 24 and 25", "operating expenses"),
  comp("line27", "27", "Allowable operating expenses", "smaller of line 15 or line 26"),
  comp("line28", "28", "Limit on excess casualty losses and depreciation", "line 15 - line 27"),
  amt("line29", "29", "Excess casualty losses"),
  comp("line30", "30", "Depreciation of your home from line 42", "line 42"),
  amt("line31", "31", "Carryover of prior year excess casualty losses and depreciation (prior year line 44)"),
  comp("line32", "32", "Add lines 29 through 31", "29 + 30 + 31"),
  comp("line33", "33", "Allowable excess casualty losses and depreciation", "smaller of line 28 or line 32"),
  comp("line34", "34", "Add lines 14, 27, and 33", "total allowable"),
  amt("line35", "35", "Casualty loss portion (carried to Form 4684)"),
  comp("line36", "36", "Allowable expenses for business use of your home; carried to Schedule C line 30", "line 34 - line 35", { alwaysShow: true }),
  amt("line37", "37", "Smaller of your home's adjusted basis or its fair market value (excluding land only on line 38)"),
  amt("line38", "38", "Value of land included on line 37"),
  comp("line39", "39", "Basis of building", "line 37 - line 38"),
  comp("line40", "40", "Business basis of building", "line 39 x line 7"),
  { id: "line41", line: "41", label: "Depreciation percentage", type: "percent", computed: true, locate: { tok: "41", page: 1, kind: "text" }, notes: "39-year nonresidential property, mid-month: first-year table by month placed in service (first_business_use_month, first_business_use_year), 2.564% in later years. Supply line41 to override." },
  comp("line42", "42", "Depreciation allowable; carried to line 30", "line 40 x line 41"),
  comp("line43", "43", "Operating expenses carryover to next year", "line 26 - line 27, not less than zero"),
  comp("line44", "44", "Excess casualty losses and depreciation carryover to next year", "line 32 - line 33, not less than zero"),
];

export const form8829: FormDef = {
  id: "f8829",
  title: "Form 8829, Expenses for Business Use of Your Home",
  shortTitle: "Form 8829",
  description: "The actual-expense method for a home office: business percentage of mortgage interest, taxes, insurance, utilities, repairs, and depreciation, limited to the business's tentative profit. Line 36 goes to Schedule C line 30.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8829.pdf",
  notes: `**What this form is for.** Instead of the simplified $5-per-square-foot method on Schedule C line 30, deduct the business share of real home costs plus depreciation. The deduction is limited to the business's profit; the excess carries forward on lines 43 and 44.

**What the engine computes.** The business percentage, every total and limitation line, and the depreciation of the home (39-year nonresidential, mid-month convention) from the basis on line 37.

**Things to verify before filing.**
- The area on line 1 must be used regularly and exclusively for business (daycare is the exception).
- Enter costs that benefit only the office in column (a) and whole-house costs in column (b); the engine applies the business percentage to column (b) only.
- Mortgage interest and real estate taxes not deducted here may still be deductible on Schedule A.
- Depreciation claimed on the home reduces its basis and may be recaptured when you sell.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l1 = c.n("line1");
    const l2 = c.n("line2");
    const pct3 = l2 > 0 ? (l1 / l2) * 100 : 0;
    c.out["line3"] = Math.round(pct3 * 100) / 100;
    c.computations.push({ id: "line3", line: "3", label: "Business percentage of the home", value: c.out["line3"] as number, formula: `${f(l1)} sq ft / ${f(l2)} sq ft` });
    let pct7 = pct3;
    if (c.n("line4") > 0) {
      const l5 = c.n("line5") || 8760;
      const dec = c.n("line4") / l5;
      c.out["line6"] = Math.round(dec * 10000) / 10000;
      c.computations.push({ id: "line6", line: "6", label: "Daycare hours ratio", value: c.out["line6"] as number, formula: `${f(c.n("line4"))} / ${f(l5)}` });
      pct7 = dec * pct3;
    }
    c.out["line7"] = Math.round(pct7 * 100) / 100;
    c.computations.push({ id: "line7", line: "7", label: "Business percentage", value: c.out["line7"] as number, formula: c.n("line4") > 0 ? "line 6 x line 3" : "line 3" });
    const pct = (c.out["line7"] as number) / 100;
    const l8 = c.n("line8");
    const l12a = c.set("line12a", c.sum(["line9a", "line10a", "line11a"]), "Direct casualty, interest, taxes", "9a + 10a + 11a", "12a");
    const l12b = c.set("line12b", c.sum(["line9b", "line10b", "line11b"]), "Indirect casualty, interest, taxes", "9b + 10b + 11b", "12b");
    const l13 = c.set("line13", l12b * pct, "Business share of indirect", `${f(l12b)} x ${c.out["line7"]}%`, "13");
    const l14 = c.set("line14", l12a + l13, "Direct plus business share", `${f(l12a)} + ${f(l13)}`, "14");
    const l15 = c.set("line15", Math.max(0, l8 - l14), "Line 8 minus line 14", `max(0, ${f(l8)} - ${f(l14)})`, "15");
    const l23a = c.set("line23a", c.sum(["line16a", "line17a", "line18a", "line19a", "line20a", "line21a", "line22a"]), "Direct operating expenses", "16a through 22a", "23a");
    const l23b = c.set("line23b", c.sum(["line16b", "line17b", "line18b", "line19b", "line20b", "line21b", "line22b"]), "Indirect operating expenses", "16b through 22b", "23b");
    const l24 = c.set("line24", l23b * pct, "Business share of indirect operating expenses", `${f(l23b)} x ${c.out["line7"]}%`, "24");
    const l26 = c.set("line26", l23a + l24 + c.n("line25"), "Operating expenses", `${f(l23a)} + ${f(l24)} + carryover ${f(c.n("line25"))}`, "26");
    const l27 = c.set("line27", Math.min(l15, l26), "Allowable operating expenses", `min(${f(l15)}, ${f(l26)})`, "27");
    const l28 = c.set("line28", l15 - l27, "Limit on excess casualty losses and depreciation", `${f(l15)} - ${f(l27)}`, "28");
    // Part III depreciation
    const l39 = c.set("line39", Math.max(0, c.n("line37") - c.n("line38")), "Basis of building", `${f(c.n("line37"))} - ${f(c.n("line38"))}`, "39");
    const l40 = c.set("line40", l39 * pct, "Business basis of building", `${f(l39)} x ${c.out["line7"]}%`, "40");
    let pct41: number;
    let how: string;
    if (c.has("line41")) {
      pct41 = c.n("line41");
      how = "supplied";
    } else {
      const month = Math.round(c.n("first_business_use_month"));
      const firstYear = Math.round(c.n("first_business_use_year"));
      if (firstYear === ctx.year && month >= 1 && month <= 12) {
        pct41 = FIRST_YEAR_PCT[month - 1]!;
        how = `first year, placed in service in month ${month}`;
      } else {
        pct41 = 2.564;
        how = "39-year straight line, full year";
      }
    }
    c.out["line41"] = l40 > 0 ? pct41 : 0;
    c.computations.push({ id: "line41", line: "41", label: "Depreciation percentage", value: c.out["line41"] as number, formula: how });
    const l42 = c.set("line42", (l40 * pct41) / 100, "Depreciation allowable", `${f(l40)} x ${pct41}%`, "42");
    const l30 = c.set("line30", l42, "Depreciation of your home", `line 42 ${f(l42)}`, "30");
    const l32 = c.set("line32", c.n("line29") + l30 + c.n("line31"), "Excess casualty losses and depreciation", `${f(c.n("line29"))} + ${f(l30)} + ${f(c.n("line31"))}`, "32");
    const l33 = c.set("line33", Math.min(l28, l32), "Allowable excess casualty losses and depreciation", `min(${f(l28)}, ${f(l32)})`, "33");
    const l34 = c.set("line34", l14 + l27 + l33, "Add lines 14, 27, and 33", `${f(l14)} + ${f(l27)} + ${f(l33)}`, "34");
    const l35 = c.n("line35");
    c.set("line36", l34 - l35, "Allowable expenses for business use of your home", `${f(l34)} - ${f(l35)}`, "36");
    c.set("line43", Math.max(0, l26 - l27), "Operating expenses carryover", `max(0, ${f(l26)} - ${f(l27)})`, "43");
    c.set("line44", Math.max(0, l32 - l33), "Excess casualty and depreciation carryover", `max(0, ${f(l32)} - ${f(l33)})`, "44");
    if (l2 <= 0 || l1 <= 0) c.warn("Lines 1 and 2 (square footage) are required to compute the business percentage.");
    if (l8 <= 0) c.warn("Line 8 (Schedule C line 29 tentative profit) is zero or missing; the deduction is limited to zero and everything carries forward.");
    return c.result();
  },
};
