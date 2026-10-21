import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const yn = (n: number) => ({ yes: { name: `Page1[0].c1_${n}[0]` }, no: { name: `Page1[0].c1_${n}[1]` } });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "lineA", line: "A", label: "Do you have a written policy providing at least 2 weeks of annual paid family and medical leave for full-time qualifying employees (prorated for part-time)?", type: "yesno", locate: yn(1) },
  { id: "lineB", line: "B", label: "Does the policy provide paid leave of at least 50% of the wages normally paid to a qualifying employee?", type: "yesno", locate: yn(2) },
  { id: "lineC", line: "C", label: "Did you pay family and medical leave to at least one qualifying employee during the tax year?", type: "yesno", locate: yn(3) },
  { id: "lineD", line: "D", label: "If you employed a qualifying employee not covered by the FMLA, does the policy include the required non-interference language?", type: "yesno", locate: yn(4) },
  { id: "line1", line: "1", label: "Paid family and medical leave credit figured on the wages paid during the tax year to qualifying employees (12.5% of leave wages at 50% pay, rising 0.25% for each point above 50%, up to 25%)", type: "money", locate: { name: P(3) } },
  { id: "line2", line: "2", label: "Employer credit for paid family and medical leave from partnerships and S corporations", type: "money", locate: { name: P(4) } },
  { id: "line3", line: "3", label: "Add lines 1 and 2; to Form 3800 Part III line 4j", type: "money", computed: true, alwaysShow: true, locate: { name: P(5) } },
  { id: "leave_wages", label: "Optional: total wages paid during family and medical leave (used with pay_rate to figure line 1)", type: "money", noPdf: true },
  { id: "pay_rate", label: "Optional: the leave pay as a percentage of normal wages (50 to 100), used with leave_wages to figure line 1", type: "percent", noPdf: true },
];

export const form8994: FormDef = {
  id: "f8994",
  title: "Form 8994, Employer Credit for Paid Family and Medical Leave",
  shortTitle: "Form 8994",
  description: "The section 45S credit for employers with a written policy paying at least 50% of wages during family and medical leave: 12.5% to 25% of the leave wages paid to employees earning under the compensation threshold; reported on Form 3800.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8994.pdf",
  notes: `**Who files.** Employers with a written paid-leave policy covering all qualifying employees (employed at least a year and paid no more than 60% of the highly compensated threshold, $96,000 for 2025 leave) who paid at least 2 weeks of leave at 50% or more of normal pay. Lines A through D must all be Yes.

**What the engine computes.** Line 3 (to Form 3800 Part III line 4j, placed automatically in a full return). When you supply leave_wages and pay_rate instead of line 1, line 1 is figured as 12.5% plus 0.25% for each percentage point the pay rate exceeds 50%, capped at 25%.

**What to verify.** Leave paid under state or local law does not count. Only up to 12 weeks of leave per employee per year qualifies, and you cannot also deduct the wages used for the credit. Public Law 119-21 made the credit permanent and allows it for insurance premiums starting in 2026.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.has("line1") && c.has("leave_wages")) {
      let rate = Number(values["pay_rate"]) || 50;
      if (rate <= 1) rate = rate * 100;
      const pct = Math.min(0.25, 0.125 + Math.max(0, rate - 50) * 0.0025);
      c.set("line1", c.n("leave_wages") * pct, "Paid leave credit", `${f(c.n("leave_wages"))} x ${(pct * 100).toFixed(2)}% (pay rate ${rate}%)`, "1");
      if (rate < 50) c.warn("The leave pay rate is under 50% of normal wages: the credit is not available.");
    }
    c.set("line3", c.n("line1") + c.n("line2"), "Credit to Form 3800 line 4j", `${f(c.n("line1"))} + ${f(c.n("line2"))}`, "3");
    for (const k of ["lineA", "lineB", "lineC", "lineD"]) if (c.has(k) && !c.bool(k) && k !== "lineD") c.warn(`${k.replace("line", "Line ")} is no: the credit is not allowed unless all policy requirements are met.`);
    if (!c.has("lineA") && c.n("line1") > 0) c.warn("Answer lines A through D (written policy, 50% pay, leave paid, FMLA non-interference language).");
    return c.result();
  },
};
