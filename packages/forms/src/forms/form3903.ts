import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "armed_forces", label: "You are a member of the Armed Forces on active duty and moved because of a permanent change of station (certification box)", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" }, notes: "Only active-duty members moving under military orders may deduct moving expenses for 2018 through 2025." },
  { id: "line1", line: "1", label: "Transportation and storage of household goods and personal effects", type: "money", locate: { name: P(3) } },
  { id: "line2", line: "2", label: "Travel (including lodging) from your old home to your new home; do not include meals", type: "money", locate: { name: P(4) } },
  { id: "line3", line: "3", label: "Add lines 1 and 2", type: "money", computed: true, locate: { name: P(5) } },
  { id: "line4", line: "4", label: "Total the government paid you for the expenses on lines 1 and 2 that is not included in W-2 box 1 (box 12 code P)", type: "money", locate: { name: P(6) } },
  { id: "line5_more", line: "5", label: "Is line 3 more than line 4? (Yes: deduct the difference on Schedule 1 line 14; no: include the excess reimbursement in income)", type: "yesno", computed: true, locate: { yes: { name: "Page1[0].c1_2[0]" }, no: { name: "Page1[0].c1_2[1]" } } },
  { id: "line5", line: "5", label: "Moving expense deduction. Subtract line 4 from line 3; to Schedule 1 line 14", type: "money", computed: true, alwaysShow: true, locate: { name: P(7) } },
];

export const form3903: FormDef = {
  id: "f3903",
  title: "Form 3903, Moving Expenses",
  shortTitle: "Form 3903",
  description: "The moving expense deduction for members of the Armed Forces on active duty who move under a permanent change of station; the result goes to Schedule 1 line 14.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f3903.pdf",
  notes: `**Who files.** For 2018 through 2025 only active-duty members of the Armed Forces moving because of a military order and permanent change of station (and their spouses and dependents) can deduct moving expenses. Civilian moves are not deductible.

**What the engine computes.** Line 3 (the total expenses), the line 5 yes/no box, and line 5 (expenses over the nontaxable government reimbursement). In a full return line 5 goes to Schedule 1 line 14.

**What to verify.** Deductible costs are moving household goods and travel (lodging and mileage or actual car costs) for one trip; meals, house-hunting trips, and temporary living expenses are not deductible. Allowances the military paid directly (not in your pay) are not reported anywhere; reimbursements in W-2 box 12 code P go on line 4. If line 4 exceeds line 3, the excess is income on Form 1040 line 1h.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l3 = c.set("line3", c.n("line1") + c.n("line2"), "Total moving expenses", `${f(c.n("line1"))} + ${f(c.n("line2"))}`, "3");
    const more = l3 > c.n("line4");
    c.out["line5_more"] = more;
    c.set("line5", Math.max(0, l3 - c.n("line4")), "Moving expense deduction", more ? `${f(l3)} - ${f(c.n("line4"))}` : "line 4 is not less than line 3: no deduction", "5");
    if (!more && c.n("line4") > l3) c.warn(`The government reimbursement (${f(c.n("line4"))}) exceeds the expenses (${f(l3)}): include the excess ${f(c.n("line4") - l3)} in income on Form 1040 line 1h.`);
    if (!c.bool("armed_forces") && l3 > 0) c.warn("Only active-duty Armed Forces members moving under a permanent change of station can deduct moving expenses for 2018 through 2025; check armed_forces to certify.");
    return c.result();
  },
};
