import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const T = (row: number, col: "a" | "b") => `Page1[0].Table_Ln1-6[0].BodyRow${row}[0].f1_${2 * row + (col === "a" ? 1 : 2)}[0]`;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });

/** Line 9 decimal by AGI: [upper AGI for 0.5, for 0.2, for 0.1] per filing status. */
const RATE_TABLE: Record<TaxYear, Record<"mfj" | "hoh" | "other", [number, number, number]>> = {
  2024: { mfj: [46000, 50000, 76500], hoh: [34500, 37500, 57375], other: [23000, 25000, 38250] },
  2025: { mfj: [47500, 51000, 79000], hoh: [35625, 38250, 59250], other: [23750, 25500, 39500] },
};
const BIRTH_CUTOFF: Record<TaxYear, string> = { 2024: "January 1, 2007", 2025: "January 1, 2008" };

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: { name: P(2) } },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  { id: "born_after_cutoff", label: "Was the contributor born after the year's cutoff (January 1, 2007 for 2024; January 1, 2008 for 2025)?", type: "checkbox" },
  { id: "full_time_student", label: "Was the contributor a full-time student during the year?", type: "checkbox" },
  { id: "claimed_as_dependent", label: "Is the contributor claimed as a dependent on someone else's return?", type: "checkbox" },
  money("line1a", "1(a)", "Traditional and Roth IRA contributions, and ABLE account contributions by the designated beneficiary: you", T(1, "a")),
  money("line1b", "1(b)", "Same, your spouse", T(1, "b")),
  money("line2a", "2(a)", "Elective deferrals to a 401(k) or other qualified employer plan, voluntary employee contributions, and 501(c)(18)(D) contributions: you", T(2, "a")),
  money("line2b", "2(b)", "Same, your spouse", T(2, "b")),
  comp("line3a", "3(a)", "Add lines 1 and 2: you", T(3, "a"), "1(a) + 2(a)"),
  comp("line3b", "3(b)", "Add lines 1 and 2: spouse", T(3, "b"), "1(b) + 2(b)"),
  money("line4a", "4(a)", "Certain distributions received after 2021 and before the due date (including extensions); see instructions: you", T(4, "a")),
  money("line4b", "4(b)", "Same, your spouse", T(4, "b")),
  comp("line5a", "5(a)", "Subtract line 4 from line 3, not less than zero: you", T(5, "a"), "3(a) - 4(a)"),
  comp("line5b", "5(b)", "Same, spouse", T(5, "b"), "3(b) - 4(b)"),
  comp("line6a", "6(a)", "Smaller of line 5 or $2,000: you", T(6, "a"), "min(5(a), 2,000)"),
  comp("line6b", "6(b)", "Smaller of line 5 or $2,000: spouse", T(6, "b"), "min(5(b), 2,000)"),
  comp("line7", "7", "Add the amounts on line 6", P(15), "6(a) + 6(b)", { alwaysShow: true }),
  money("line8", "8", "Amount from Form 1040 line 11 (AGI)", P(16)),
  { id: "line9", line: "9", label: "Decimal amount from the table for your filing status and AGI", type: "text", computed: true, maxLen: 1, locate: { name: P(17) }, notes: "The tenths digit after the printed \"0.\": 5, 2, 1, or 0" },
  comp("line10", "10", "Multiply line 7 by line 9", P(18), "7 x 9"),
  money("line11", "11", "Limitation based on tax liability (Credit Limit Worksheet line 3)", P(19), { notes: "Form 1040 line 18 minus Schedule 3 lines 1 through 3, 6d, and 6l. Computed from the worksheet inputs when not supplied." }),
  comp("line12", "12", "Credit for qualified retirement savings contributions; carried to Schedule 3 line 4", P(20), "smaller of line 10 or line 11", { alwaysShow: true }),
  money("ws_line1", "Worksheet 1", "Credit Limit Worksheet: amount from Form 1040 line 18", "Page2[0].Col2[0].Pg2Worksheet[0].f2_1[0]"),
  money("ws_line2", "Worksheet 2", "Credit Limit Worksheet: total of Schedule 3 lines 1 through 3, 6d, and 6l", "Page2[0].Col2[0].Pg2Worksheet[0].f2_2[0]"),
  comp("ws_line3", "Worksheet 3", "Credit Limit Worksheet: line 1 minus line 2 (to line 11)", "Page2[0].Col2[0].Pg2Worksheet[0].f2_3[0]", "worksheet line 1 - line 2"),
];

export const form8880: FormDef = {
  id: "f8880",
  title: "Form 8880, Credit for Qualified Retirement Savings Contributions",
  shortTitle: "Form 8880",
  description: "The saver's credit: 50%, 20%, or 10% of up to $2,000 of IRA and workplace retirement contributions per spouse, depending on AGI and filing status, limited by tax liability. Line 12 goes to Schedule 3 line 4.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f8880.pdf",
  notes: `**Who qualifies.** AGI at or below the top of the table ($39,500 single, $59,250 head of household, $79,000 joint for 2025; $38,250 / $57,375 / $76,500 for 2024), and the contributor was born on or before the cutoff date, is not a full-time student, and is not claimed as a dependent.

**What the engine computes.** Lines 3, 5, 6, 7, 9 (the decimal from the AGI table), 10, 12, and the Credit Limit Worksheet (line 11) when its two inputs are supplied. In a full return, line 8 is AGI and line 11 is the tax after the foreign tax credit, child and dependent care credit, and education credits.

**What to verify.** Line 4 distributions: include distributions received in the current year, the two preceding years, and up to the return's due date, from IRAs and employer plans (not rollovers or returned excess contributions). Elective deferrals come from W-2 box 12 codes D, E, F, G, H, S, AA, BB, EE.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") || "single";
    const l3a = c.set("line3a", c.n("line1a") + c.n("line2a"), "Contributions, you", "1(a) + 2(a)", "3(a)");
    const l3b = c.set("line3b", c.n("line1b") + c.n("line2b"), "Contributions, spouse", "1(b) + 2(b)", "3(b)");
    const l5a = c.set("line5a", Math.max(0, l3a - c.n("line4a")), "Net of distributions, you", `max(0, ${f(l3a)} - ${f(c.n("line4a"))})`, "5(a)");
    const l5b = c.set("line5b", Math.max(0, l3b - c.n("line4b")), "Net of distributions, spouse", `max(0, ${f(l3b)} - ${f(c.n("line4b"))})`, "5(b)");
    const l6a = c.set("line6a", Math.min(l5a, 2000), "Limited, you", `min(${f(l5a)}, 2,000)`, "6(a)");
    const l6b = c.set("line6b", Math.min(l5b, 2000), "Limited, spouse", `min(${f(l5b)}, 2,000)`, "6(b)");
    const l7 = c.set("line7", l6a + l6b, "Eligible contributions", `${f(l6a)} + ${f(l6b)}`, "7");
    const agi = c.n("line8");
    const key = status === "mfj" ? "mfj" : status === "hoh" ? "hoh" : "other";
    const [t1, t2, t3] = RATE_TABLE[ctx.year][key];
    const rate = agi <= t1 ? 0.5 : agi <= t2 ? 0.2 : agi <= t3 ? 0.1 : 0;
    // The form prints "0." before a single-digit box, so line 9 holds the tenths digit: 5, 2, 1, or 0.
    c.setScalar("line9", String(Math.round(rate * 10)), "Decimal amount", `AGI ${f(agi)} for ${status}: 0.${Math.round(rate * 10)}`, "9");
    const l10 = c.set("line10", Math.round(l7 * rate), "Tentative credit", `${f(l7)} x ${rate}`, "10");
    if (c.has("ws_line1") || c.has("ws_line2")) {
      const ws3 = c.set("ws_line3", Math.max(0, c.n("ws_line1") - c.n("ws_line2")), "Credit Limit Worksheet", `${f(c.n("ws_line1"))} - ${f(c.n("ws_line2"))}`, "Worksheet 3");
      if (!c.has("line11")) c.out["line11"] = ws3;
    }
    const l11 = c.n("line11");
    if (!c.has("line11") && !c.has("ws_line1") && l10 > 0) c.warn("line11 (tax liability limit) was not supplied; supply ws_line1 (Form 1040 line 18) and ws_line2 (Schedule 3 lines 1-3, 6d, 6l) or line11 directly. The credit is shown unlimited.");
    let l12 = c.has("line11") || c.has("ws_line1") ? Math.min(l10, l11) : l10;
    const blocked = c.bool("born_after_cutoff") || c.bool("full_time_student") || c.bool("claimed_as_dependent");
    if (blocked) {
      c.warn(`The saver's credit is not allowed: the contributor was born after ${BIRTH_CUTOFF[ctx.year]}, was a full-time student, or is claimed as a dependent.`);
      l12 = 0;
    }
    if (rate === 0 && l7 > 0) c.warn(`AGI ${f(agi)} is above the limit for ${status}; no saver's credit.`);
    c.set("line12", l12, "Saver's credit", blocked ? "not eligible" : `min(${f(l10)}, ${f(l11)})`, "12");
    return c.result();
  },
};
