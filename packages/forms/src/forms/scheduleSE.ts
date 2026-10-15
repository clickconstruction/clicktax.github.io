import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const amt = (id: string, line: string, label: string, page: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, page: number, notes: string): FieldDef => amt(id, line, label, page, { computed: true, notes });

const fields: FieldDef[] = [
  { id: "name", label: "Name of person with self-employment income", type: "text", locate: N("Page1[0].f1_1[0]") },
  { id: "ssn", label: "Social security number of person with self-employment income", type: "ssn", maxLen: 11, locate: N("Page1[0].f1_2[0]") },
  amt("line1a", "1a", "Net farm profit or (loss) from Schedule F line 34 and farm partnerships", 1),
  amt("line1b", "1b", "Conservation Reserve Program payments included on Schedule F line 4b (enter as a positive amount; it is subtracted)", 1, { locate: { name: "Page1[0].f1_4[0]" } }),
  amt("line2", "2", "Net profit or (loss) from Schedule C line 31 and Schedule K-1 (Form 1065) box 14 code A", 1, { notes: "Filled automatically from Schedule C when preparing a full return." }),
  comp("line3", "3", "Combine lines 1a, 1b, and 2", 1, "line 1a - line 1b + line 2"),
  comp("line4a", "4a", "If line 3 is more than zero, multiply line 3 by 92.35%; otherwise enter line 3", 1, "line 3 x 0.9235"),
  amt("line4b", "4b", "Optional methods amount from line 17 (if used)", 1),
  comp("line4c", "4c", "Combine lines 4a and 4b. If less than $400, you do not owe self-employment tax (unless line 5a applies)", 1, "line 4a + line 4b"),
  amt("line5a", "5a", "Church employee income from Form W-2", 1),
  comp("line5b", "5b", "Multiply line 5a by 92.35%; if less than $100, enter 0", 1, "line 5a x 0.9235"),
  comp("line6", "6", "Add lines 4c and 5b", 1, "line 4c + line 5b"),
  amt("line8a", "8a", "Total social security wages and tips (Form W-2 boxes 3 and 7) and railroad retirement compensation", 1, { notes: "Only matters when wages plus net earnings exceed the social security wage base." }),
  amt("line8b", "8b", "Unreported tips subject to social security tax (Form 4137 line 10)", 1),
  amt("line8c", "8c", "Wages subject to social security tax (Form 8919 line 10)", 1),
  comp("line8d", "8d", "Add lines 8a, 8b, and 8c", 1, "line 8a + 8b + 8c"),
  comp("line9", "9", "Subtract line 8d from line 7 (the wage base); if zero or less, enter 0 here and on line 10", 1, "wage base - line 8d"),
  comp("line10", "10", "Multiply the smaller of line 6 or line 9 by 12.4%", 1, "min(line 6, line 9) x 0.124"),
  comp("line11", "11", "Multiply line 6 by 2.9%", 1, "line 6 x 0.029"),
  comp("line12", "12", "Self-employment tax. Add lines 10 and 11; carried to Schedule 2 line 4", 1, "line 10 + line 11"),
  comp("line13", "13", "Deduction for one-half of self-employment tax; carried to Schedule 1 line 15", 1, "line 12 x 0.5"),
];

export const scheduleSE: FormDef = {
  id: "f1040sse",
  title: "Schedule SE (Form 1040), Self-Employment Tax",
  shortTitle: "Schedule SE",
  description: "Figures social security and Medicare tax on net self-employment earnings of $400 or more. Line 12 goes to Schedule 2 line 4; line 13 goes to Schedule 1 line 15.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040sse.pdf",
  notes: `**What this form is for.** Self-employment tax is 15.3% of net earnings (12.4% social security up to the annual wage base, plus 2.9% Medicare on everything). Net earnings are 92.35% of net profit.

**What the engine computes.** Lines 3, 4a, 4c, 5b, 6, 8d, 9, 10, 11, 12, and 13 using the year's wage base (2024: $168,600; 2025: $176,100).

**Things to verify before filing.**
- If you also had W-2 wages, enter line 8a so social security tax is not over-collected.
- Optional methods (Part II) are not computed; supply line 4b if you use them.
- If net earnings (line 4c) are under $400 and there is no church employee income, Schedule SE is not required.
- The Additional Medicare Tax (0.9% over $200,000 single / $250,000 joint) is figured on Form 8959, not here.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const p = params(ctx.year).se;
    const l1a = c.n("line1a");
    const l1b = Math.abs(c.n("line1b"));
    const l2 = c.n("line2");
    const l3 = c.set("line3", l1a - l1b + l2, "Combine lines 1a, 1b, and 2", `line 1a ${f(l1a)} - line 1b ${f(l1b)} + line 2 ${f(l2)}`, "3");
    const l4a = c.set("line4a", l3 > 0 ? l3 * p.netEarningsFactor : l3, "Net earnings factor", l3 > 0 ? `line 3 ${f(l3)} x 92.35%` : `line 3 ${f(l3)} (not more than zero)`, "4a");
    const l4b = c.n("line4b");
    const l4c = c.set("line4c", l4a + l4b, "Combine lines 4a and 4b", `line 4a ${f(l4a)} + line 4b ${f(l4b)}`, "4c");
    const l5a = c.n("line5a");
    const l5bRaw = l5a * p.netEarningsFactor;
    const l5b = c.set("line5b", l5bRaw < 100 ? 0 : l5bRaw, "Church employee income x 92.35%", `line 5a ${f(l5a)} x 92.35%${l5bRaw < 100 ? " (under $100, enter 0)" : ""}`, "5b");
    if (l4c < p.filingThreshold && l5b === 0) {
      c.warn(`Line 4c (${f(l4c)}) is under $${p.filingThreshold} and there is no church employee income: no self-employment tax is owed and Schedule SE need not be filed.`);
    }
    const l6 = c.set("line6", l4c + l5b, "Add lines 4c and 5b", `line 4c ${f(l4c)} + line 5b ${f(l5b)}`, "6");
    const l8d = c.set("line8d", c.sum(["line8a", "line8b", "line8c"]), "Add lines 8a, 8b, and 8c", c.show([["8a", c.n("line8a")], ["8b", c.n("line8b")], ["8c", c.n("line8c")]]), "8d");
    const l9raw = p.wageBase - l8d;
    const l9 = c.set("line9", l9raw > 0 ? l9raw : 0, "Wage base minus line 8d", `${f(p.wageBase)} - line 8d ${f(l8d)}${l9raw <= 0 ? " (zero or less: enter 0)" : ""}`, "9");
    const base6 = Math.max(0, l6);
    const l10 = c.set("line10", Math.min(base6, l9) * p.socialSecurityRate, "Social security part", `min(line 6 ${f(base6)}, line 9 ${f(l9)}) x 12.4%`, "10");
    const l11 = c.set("line11", base6 * p.medicareRate, "Medicare part", `line 6 ${f(base6)} x 2.9%`, "11");
    const l12 = c.set("line12", l10 + l11, "Self-employment tax", `line 10 ${f(l10)} + line 11 ${f(l11)}`, "12");
    c.set("line13", l12 * 0.5, "Deduction for one-half of self-employment tax", `line 12 ${f(l12)} x 50%`, "13");
    if (l6 <= 0) {
      c.out["line10"] = 0;
      c.out["line11"] = 0;
      c.out["line12"] = 0;
      c.out["line13"] = 0;
    }
    return c.result();
  },
};
