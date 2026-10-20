import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P2 = (n: number) => `Page2[0].f2_${n}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P2(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

const BOX_NAMES: Record<string, string> = {
  "1": "Page1[0].c1_1[0]", "2": "Page1[0].c1_1[1]",
  "3": "Page1[0].Married[0].c1_1[0]", "4": "Page1[0].Married[0].c1_1[1]", "5": "Page1[0].Married[0].c1_1[2]", "6": "Page1[0].Married[0].c1_1[3]", "7": "Page1[0].Married[0].c1_1[4]",
  "8": "Page1[0].MarriedSeparate[0].c1_1[0]", "9": "Page1[0].MarriedSeparate[0].c1_1[1]",
};
const LINE10: Record<string, number> = { "1": 5000, "2": 5000, "4": 5000, "7": 5000, "3": 7500, "5": 7500, "6": 7500, "8": 3750, "9": 3750 };
const LINE15: Record<string, number> = { "1": 7500, "2": 7500, "3": 10000, "4": 10000, "5": 10000, "6": 10000, "7": 10000, "8": 5000, "9": 5000 };
const DISABILITY_BOXES = new Set(["2", "4", "5", "6", "9"]);

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on Form 1040 or 1040-SR", type: "text", locate: { name: "Page1[0].f1_1[0]" } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: "Page1[0].f1_2[0]" } },
  { id: "box", line: "Part I", label: "Filing status and age box: single/head of household/qualifying surviving spouse: \"1\" 65 or older, \"2\" under 65 and retired on permanent and total disability; married filing jointly: \"3\" both 65 or older, \"4\" both under 65 and one retired on disability, \"5\" both under 65 and both retired on disability, \"6\" one 65 or older and the other under 65 and retired on disability, \"7\" one 65 or older and the other under 65 and not retired on disability; married filing separately and lived apart all year: \"8\" 65 or older, \"9\" under 65 and retired on disability", type: "choice", choices: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], locate: Object.fromEntries(Object.entries(BOX_NAMES).map(([k, name]) => [k, { name }])) },
  { id: "physician_statement", line: "Part II", label: "You filed a physician's statement for this disability for 1983 or an earlier year (or for a later year with line B signed) and were unable to engage in any substantial gainful activity this year (no new statement needed)", type: "checkbox", locate: { name: "Page1[0].c1_2[0]" } },
  comp("line10", "10", "Initial amount: $5,000 (boxes 1, 2, 4, 7), $7,500 (boxes 3, 5, 6), or $3,750 (boxes 8, 9)", 1, "by box"),
  money("line11", "11", "Taxable disability income (boxes 2, 4, 9: yours; box 5: both spouses'; box 6: the disabled spouse's plus $5,000)", 2),
  comp("line12", "12", "The smaller of line 10 or line 11 when line 11 applies; otherwise line 10", 3, "min(10, 11) or 10"),
  money("line13a", "13a", "Nontaxable part of social security and railroad retirement benefits treated as social security", 4, { notes: "In a full return: Form 1040 line 6a minus line 6b." }),
  money("line13b", "13b", "Nontaxable veterans' pensions and any other pension, annuity, or disability benefit excluded from income under any other provision of law", 5),
  comp("line13c", "13c", "Add lines 13a and 13b", 6, "13a + 13b"),
  money("line14", "14", "Adjusted gross income (Form 1040 line 11)", 7),
  comp("line15", "15", "AGI limit: $7,500 (boxes 1, 2), $10,000 (boxes 3 through 7), or $5,000 (boxes 8, 9)", 8, "by box"),
  comp("line16", "16", "Subtract line 15 from line 14; not less than zero", 9, "max(0, 14 - 15)"),
  comp("line17", "17", "One-half of line 16", 10, "16 / 2"),
  comp("line18", "18", "Add lines 13c and 17", 11, "13c + 17"),
  comp("line19", "19", "Subtract line 18 from line 12; if zero or less, no credit", 12, "max(0, 12 - 18)"),
  comp("line20", "20", "Multiply line 19 by 15%", 13, "19 x 15%"),
  money("line21", "21", "Tax liability limit (Credit Limit Worksheet: Form 1040 line 18 minus Schedule 3 lines 1 through 4 and 5a)", 14, { notes: "Filled from the return when preparing a full return." }),
  comp("line22", "22", "Credit for the elderly or the disabled: the smaller of line 20 or line 21; to Schedule 3 line 6d", 15, "min(20, 21)", { alwaysShow: true }),
];

export const scheduleR: FormDef = {
  id: "f1040r",
  title: "Schedule R (Form 1040), Credit for the Elderly or the Disabled",
  shortTitle: "Schedule R",
  description: "A credit of 15% of an initial amount ($5,000, $7,500, or $3,750 by filing status) reduced by nontaxable social security and pensions and by half of AGI over a limit, for people 65 or older or retired on permanent and total disability.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040sr.pdf",
  notes: `**Who qualifies.** U.S. citizens or residents who at year end were 65 or older, or under 65, retired on permanent and total disability, and received taxable disability income. Because nontaxable social security reduces the credit dollar for dollar and half of AGI over $7,500 to $10,000 also reduces it, very few people with social security benefits get a credit.

**What the engine computes.** Lines 10, 12, 13c, 15 through 20, and 22 from the box you check; line 14 and line 13a default from the return and line 21 from the Form 1040 tax less the credits ahead of this one. Line 22 goes to Schedule 3 line 6d.

**What to verify.** Taxable disability income (line 11) is wages or payments received under an employer's plan while retired on disability and under the employer's mandatory retirement age; it is not social security disability. A physician's statement must be kept for disability boxes unless the Part II box applies. Married people must file jointly unless they lived apart all year (boxes 8 and 9).`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const box = c.str("box");
    if (!LINE10[box]) {
      c.warn("Supply box (1 through 9) for your filing status and age/disability situation; no credit is figured without it.");
      c.set("line22", 0, "Credit for the elderly or the disabled", "no box checked", "22");
      return c.result();
    }
    const l10 = c.set("line10", LINE10[box]!, "Initial amount", `box ${box}`, "10");
    const disability = DISABILITY_BOXES.has(box);
    if (disability && !c.has("line11")) c.warn(`Box ${box} requires taxable disability income on line 11; line 12 uses line 10 unreduced.`);
    const l12 = c.set("line12", disability && c.has("line11") ? Math.min(l10, c.n("line11")) : l10, "Initial amount after disability income", disability && c.has("line11") ? `min(${f(l10)}, ${f(c.n("line11"))})` : "= line 10", "12");
    const l13c = c.set("line13c", c.n("line13a") + c.n("line13b"), "Nontaxable benefits and pensions", `${f(c.n("line13a"))} + ${f(c.n("line13b"))}`, "13c");
    const l15 = c.set("line15", LINE15[box]!, "AGI limit", `box ${box}`, "15");
    const l16 = c.set("line16", Math.max(0, c.n("line14") - l15), "AGI over the limit", `max(0, ${f(c.n("line14"))} - ${f(l15)})`, "16");
    const l17 = c.set("line17", l16 / 2, "Half of the excess AGI", `${f(l16)} / 2`, "17");
    const l18 = c.set("line18", l13c + l17, "Total reductions", `${f(l13c)} + ${f(l17)}`, "18");
    const l19 = c.set("line19", Math.max(0, l12 - l18), "Amount eligible for the credit", `max(0, ${f(l12)} - ${f(l18)})`, "19");
    const l20 = c.set("line20", l19 * 0.15, "15% credit before the tax limit", `${f(l19)} x 15%`, "20");
    const limited = c.has("line21");
    if (!limited && l20 > 0) c.warn("Line 21 (tax liability limit) was not supplied; the credit is shown unlimited.");
    c.set("line22", limited ? Math.min(l20, c.n("line21")) : l20, "Credit for the elderly or the disabled (Schedule 3 line 6d)", limited ? `min(${f(l20)}, ${f(c.n("line21"))})` : "= line 20", "22");
    if (l19 === 0 && c.has("line14")) c.warn("Line 19 is zero: nontaxable benefits and AGI over the limit absorb the initial amount, so no credit is available.");
    return c.result();
  },
};
