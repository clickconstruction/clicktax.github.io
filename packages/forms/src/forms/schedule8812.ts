import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const names = (y24: string, y25: string) => ({ names: { 2024: y24, 2025: y25 } });
const amt = (id: string, line: string, label: string, page: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, page: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, page, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: N("Page1[0].f1_1[0]") },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 11, locate: N("Page1[0].f1_2[0]") },
  amt("line1", "1", "Amount from Form 1040 line 11 (adjusted gross income)", 1, { notes: "Filled from Form 1040 when preparing a full return." }),
  amt("line2a", "2a", "Income from Puerto Rico that you excluded", 1),
  amt("line2b", "2b", "Amounts from Form 2555 lines 45 and 50", 1),
  amt("line2c", "2c", "Amount from Form 4563 line 15", 1),
  comp("line2d", "2d", "Add lines 2a through 2c", 1, "2a + 2b + 2c"),
  comp("line3", "3", "Modified adjusted gross income", 1, "line 1 + line 2d"),
  { id: "line4", line: "4", label: "Number of qualifying children under age 17 with the required social security number", type: "integer", locate: { tok: "4", page: 1, kind: "text" }, notes: "Counted from Form 1040 dependents marked child_tax_credit when preparing a full return." },
  comp("line5", "5", "Line 4 times the credit per child", 1, "line 4 x $2,000 (2024) or $2,200 (2025)"),
  { id: "line6", line: "6", label: "Number of other dependents, including any qualifying children who are not under age 17 or who do not have the required social security number", type: "integer", locate: { tok: "6", page: 1, kind: "text" }, notes: "Counted from dependents marked other_dependents_credit when preparing a full return." },
  comp("line7", "7", "Line 6 times $500", 1, "line 6 x $500"),
  comp("line8", "8", "Add lines 5 and 7", 1, "line 5 + line 7"),
  comp("line9", "9", "Phaseout threshold for your filing status", 1, "$400,000 married filing jointly; $200,000 otherwise"),
  comp("line10", "10", "Line 3 minus line 9, rounded up to the next $1,000 (zero if not positive)", 1, "ceil((line 3 - line 9) / 1,000) x 1,000"),
  comp("line11", "11", "Line 10 times 5%", 1, "line 10 x 0.05"),
  { id: "line12_more", line: "12", label: "Is the amount on line 8 more than the amount on line 11?", type: "yesno", computed: true, locate: { no: N("Page1[0].c1_1[0]"), yes: N("Page1[0].c1_1[1]") } },
  comp("line12", "12", "Line 8 minus line 11 (if line 8 is more)", 1, "line 8 - line 11"),
  amt("line13", "13", "Credit Limit Worksheet A amount (tax on Form 1040 line 18 minus certain other nonrefundable credits)", 1, { notes: "Filled from Form 1040 line 18 less other_nonrefundable_credits when preparing a full return." }),
  comp("line14", "14", "Child tax credit and credit for other dependents; carried to Form 1040 line 19", 1, "smaller of line 12 or line 13", { alwaysShow: true }),
  { id: "decline_actc", line: "15", label: "Do not claim the additional child tax credit", type: "checkbox", years: [2024], locate: { names: { 2024: "Page2[0].c2_1[0]" } } },
  comp("line16a", "16a", "Line 12 minus line 14", 2, "line 12 - line 14"),
  { id: "line16b_children", line: "16b", label: "Number of qualifying children under 17 with the required SSN (same as line 4)", type: "integer", computed: true, locate: { tok: "number:", page: 2, kind: "text" } },
  comp("line16b", "16b", "Line 16b children times $1,700", 2, "children x $1,700"),
  comp("line17", "17", "Smaller of line 16a or line 16b", 2, "min(16a, 16b)"),
  amt("line18a", "18a", "Earned income", 2, { notes: "Computed as wages (1040 line 1z) plus net self-employment profit minus the deductible half of SE tax when preparing a full return; supply to override." }),
  amt("line18b", "18b", "Nontaxable combat pay", 2),
  { id: "line19_more", line: "19", label: "Is the amount on line 18a more than $2,500?", type: "yesno", computed: true, locate: { no: names("Page2[0].c2_2[0]", "Page2[0].c2_1[0]"), yes: names("Page2[0].c2_2[1]", "Page2[0].c2_1[1]") } },
  comp("line19", "19", "Line 18a minus $2,500", 2, "line 18a - 2,500"),
  comp("line20", "20", "Line 19 times 15%", 2, "line 19 x 0.15"),
  { id: "line20_three_or_more", line: "20", label: "On line 16b, is the amount $5,100 or more (three or more qualifying children)?", type: "yesno", computed: true, locate: { no: names("Page2[0].c2_3[0]", "Page2[0].c2_2[0]"), yes: names("Page2[0].c2_3[1]", "Page2[0].c2_2[1]") } },
  amt("line21", "21", "Withheld social security, Medicare, and Additional Medicare taxes from Form(s) W-2 boxes 4 and 6 (both spouses if joint)", 2, { notes: "Only used with three or more qualifying children (Part II-B)." }),
  amt("line22", "22", "Schedule 1 line 15 plus Schedule 2 lines 5, 6, and 13", 2, { notes: "Filled from Schedules 1 and 2 when preparing a full return." }),
  comp("line23", "23", "Add lines 21 and 22", 2, "line 21 + line 22"),
  amt("line24", "24", "Form 1040 line 27 (EIC) plus Schedule 3 line 11", 2, { notes: "Filled from Form 1040 line 27 plus schedule3_line11 when preparing a full return." }),
  comp("line25", "25", "Line 23 minus line 24 (not less than zero)", 2, "max(0, line 23 - line 24)"),
  comp("line26", "26", "Larger of line 20 or line 25", 2, "max(line 20, line 25)"),
  comp("line27", "27", "Additional child tax credit; carried to Form 1040 line 28", 2, "smaller of line 17 and line 26 (or line 20 with fewer than three children)", { alwaysShow: true }),
];

export const schedule8812: FormDef = {
  id: "f1040s8",
  title: "Schedule 8812 (Form 1040), Credits for Qualifying Children and Other Dependents",
  shortTitle: "Schedule 8812",
  description: "Figures the child tax credit and credit for other dependents (Form 1040 line 19) and the refundable additional child tax credit (Form 1040 line 28).",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040s8.pdf",
  notes: `**What this form is for.** The child tax credit is $2,000 per qualifying child under 17 for 2024 and $2,200 for 2025, plus $500 per other dependent, reduced by 5% of modified AGI over $200,000 ($400,000 married filing jointly). The nonrefundable part is limited to your tax; up to $1,700 per child can come back as the refundable additional child tax credit based on earned income over $2,500.

**What the engine computes.** Every line except the inputs on lines 2a-2c, 13 (filled from Form 1040 line 18 less other nonrefundable credits), 18a (earned income, filled from wages and self-employment profit), 18b, and 21.

**Things to verify before filing.**
- A qualifying child must be under 17 at year end, have a social security number valid for employment, live with you more than half the year, and not provide over half of their own support.
- Earned income on line 18a follows the IRS Earned Income Worksheet; the engine uses wages plus net self-employment profit minus the deductible half of SE tax. Supply line18a if your situation differs.
- If you file Form 2555 you cannot claim the additional child tax credit.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const p = params(ctx.year).ctc;
    const status = c.str("filing_status");
    const l1 = c.n("line1");
    const l2d = c.set("line2d", c.sum(["line2a", "line2b", "line2c"]), "Add lines 2a through 2c", c.show([["2a", c.n("line2a")], ["2b", c.n("line2b")], ["2c", c.n("line2c")]]), "2d");
    const l3 = c.set("line3", l1 + l2d, "Modified AGI", `line 1 ${f(l1)} + line 2d ${f(l2d)}`, "3");
    const kids = Math.max(0, Math.round(c.n("line4")));
    const others = Math.max(0, Math.round(c.n("line6")));
    c.out["line4"] = kids;
    c.out["line6"] = others;
    const l5 = c.set("line5", kids * p.perChild, "Qualifying children credit", `${kids} x ${f(p.perChild)}`, "5");
    const l7 = c.set("line7", others * p.perOtherDependent, "Other dependents credit", `${others} x ${f(p.perOtherDependent)}`, "7");
    const l8 = c.set("line8", l5 + l7, "Add lines 5 and 7", `line 5 ${f(l5)} + line 7 ${f(l7)}`, "8");
    const l9 = c.set("line9", status === "mfj" ? p.phaseoutMfj : p.phaseoutOther, "Phaseout threshold", status === "mfj" ? "married filing jointly" : "all other filing statuses", "9");
    const over = l3 - l9;
    const l10 = c.set("line10", over > 0 ? Math.ceil(over / 1000) * 1000 : 0, "Excess over threshold, rounded up to $1,000", over > 0 ? `ceil((${f(l3)} - ${f(l9)}) / 1,000) x 1,000` : "line 3 is not more than line 9", "10");
    const l11 = c.set("line11", l10 * 0.05, "Phaseout amount", `line 10 ${f(l10)} x 5%`, "11");
    const more = l8 > l11;
    c.setScalar("line12_more", more, "Is line 8 more than line 11?", more ? "yes" : "no: no child tax credit", "12");
    const l12 = c.set("line12", more ? l8 - l11 : 0, "Credit before limit", more ? `line 8 ${f(l8)} - line 11 ${f(l11)}` : "0", "12");
    const l13 = c.n("line13");
    const l14 = c.set("line14", Math.min(l12, Math.max(0, l13)), "Child tax credit and credit for other dependents", `min(line 12 ${f(l12)}, line 13 ${f(l13)})`, "14");
    if (!c.has("line13")) c.warn("Line 13 (Credit Limit Worksheet A) was not supplied; the nonrefundable credit is limited to 0. Supply line13 (tax minus other nonrefundable credits) or prepare the full return.");

    const zeroActc = (why: string) => {
      c.out["line27"] = 0;
      c.computations.push({ id: "line27", line: "27", label: "Additional child tax credit", value: 0, formula: why });
    };
    if (c.bool("decline_actc")) {
      zeroActc("box on line 15 checked: additional child tax credit not claimed");
      return c.result();
    }
    const l16a = c.set("line16a", Math.max(0, l12 - l14), "Line 12 minus line 14", `line 12 ${f(l12)} - line 14 ${f(l14)}`, "16a");
    if (l16a === 0) {
      zeroActc("line 16a is zero: the whole credit was used against tax");
      return c.result();
    }
    c.out["line16b_children"] = kids;
    const l16b = c.set("line16b", kids * p.actcMax, "Refundable limit", `${kids} x ${f(p.actcMax)}`, "16b");
    if (l16b === 0) {
      zeroActc("no qualifying children under 17: no additional child tax credit");
      return c.result();
    }
    const l17 = c.set("line17", Math.min(l16a, l16b), "Smaller of line 16a or 16b", `min(${f(l16a)}, ${f(l16b)})`, "17");
    const l18a = c.n("line18a");
    const l19more = l18a > p.earnedIncomeFloor;
    c.setScalar("line19_more", l19more, "Is line 18a more than $2,500?", l19more ? "yes" : "no", "19");
    const l19 = c.set("line19", l19more ? l18a - p.earnedIncomeFloor : 0, "Earned income over $2,500", l19more ? `line 18a ${f(l18a)} - 2,500` : "0", "19");
    const l20 = c.set("line20", l19 * 0.15, "Line 19 times 15%", `line 19 ${f(l19)} x 15%`, "20");
    const three = l16b >= p.threeChildrenAmount;
    c.setScalar("line20_three_or_more", three, "Three or more qualifying children?", three ? "yes" : "no", "20");
    if (!three) {
      c.set("line27", Math.min(l17, l20), "Additional child tax credit", `min(line 17 ${f(l17)}, line 20 ${f(l20)})`, "27");
      return c.result();
    }
    if (l20 >= l17) {
      c.set("line27", l17, "Additional child tax credit", `line 20 ${f(l20)} is at least line 17 ${f(l17)}: line 17`, "27");
      return c.result();
    }
    const l21 = c.n("line21");
    const l22 = c.n("line22");
    const l23 = c.set("line23", l21 + l22, "Add lines 21 and 22", `line 21 ${f(l21)} + line 22 ${f(l22)}`, "23");
    const l24 = c.n("line24");
    const l25 = c.set("line25", Math.max(0, l23 - l24), "Line 23 minus line 24", `max(0, ${f(l23)} - ${f(l24)})`, "25");
    const l26 = c.set("line26", Math.max(l20, l25), "Larger of line 20 or 25", `max(${f(l20)}, ${f(l25)})`, "26");
    c.set("line27", Math.min(l17, l26), "Additional child tax credit", `min(line 17 ${f(l17)}, line 26 ${f(l26)})`, "27");
    if (!c.has("line21")) c.warn("Three or more qualifying children: supply line21 (withheld social security and Medicare taxes from W-2 boxes 4 and 6) so Part II-B can be figured.");
    return c.result();
  },
};
