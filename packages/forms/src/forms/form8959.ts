import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const amt = (id: string, line: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page: 1, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: N("Page1[0].f1_1[0]") },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 11, locate: N("Page1[0].f1_2[0]") },
  amt("line1", "1", "Medicare wages and tips from Form(s) W-2 box 5 (both spouses if joint)", { notes: "Filled from Form 1040 line 1a when preparing a full return unless supplied; box 5 can differ from box 1." }),
  amt("line2", "2", "Unreported tips from Form 4137 line 6"),
  amt("line3", "3", "Wages from Form 8919 line 6"),
  comp("line4", "4", "Add lines 1 through 3", "1 + 2 + 3"),
  comp("line5", "5", "Threshold for your filing status", "$250,000 joint, $125,000 separate, $200,000 otherwise"),
  comp("line6", "6", "Line 4 minus line 5", "not less than zero"),
  comp("line7", "7", "Additional Medicare Tax on Medicare wages", "line 6 x 0.9%"),
  amt("line8", "8", "Self-employment income from Schedule SE line 6 (both spouses if joint)", { notes: "Filled from Schedule SE when preparing a full return." }),
  comp("line9", "9", "Threshold for your filing status", "same as line 5"),
  comp("line10", "10", "Amount from line 4", "line 4"),
  comp("line11", "11", "Line 9 minus line 10", "not less than zero"),
  comp("line12", "12", "Line 8 minus line 11", "not less than zero"),
  comp("line13", "13", "Additional Medicare Tax on self-employment income", "line 12 x 0.9%"),
  amt("line14", "14", "Railroad retirement (RRTA) compensation and tips (Form W-2 box 14)"),
  comp("line15", "15", "Threshold for your filing status", "same as line 5"),
  comp("line16", "16", "Line 14 minus line 15", "not less than zero"),
  comp("line17", "17", "Additional Medicare Tax on RRTA compensation", "line 16 x 0.9%"),
  comp("line18", "18", "Total Additional Medicare Tax; carried to Schedule 2 line 11", "7 + 13 + 17", { alwaysShow: true }),
  amt("line19", "19", "Medicare tax withheld from Form(s) W-2 box 6"),
  comp("line20", "20", "Amount from line 1", "line 1"),
  comp("line21", "21", "Regular Medicare tax withholding on Medicare wages", "line 20 x 1.45%"),
  comp("line22", "22", "Additional Medicare Tax withholding", "line 19 - line 21, not less than zero"),
  amt("line23", "23", "Additional Medicare Tax withholding on RRTA compensation (Form W-2 box 14)"),
  comp("line24", "24", "Total Additional Medicare Tax withholding; included on Form 1040 line 25c", "22 + 23", { alwaysShow: true }),
];

export const form8959: FormDef = {
  id: "f8959",
  title: "Form 8959, Additional Medicare Tax",
  shortTitle: "Form 8959",
  description: "The 0.9% Additional Medicare Tax on wages and self-employment income above $200,000 ($250,000 married filing jointly, $125,000 married filing separately). Line 18 goes to Schedule 2 line 11; line 24 counts as withholding on Form 1040 line 25c.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8959.pdf",
  notes: `**What this form is for.** Employers withhold the extra 0.9% only on wages above $200,000 regardless of filing status, so joint filers with two earners often owe more, and single filers whose wages crossed $200,000 at one employer may have overpaid. The form reconciles both.

**What the engine computes.** Every line except the inputs on lines 1, 2, 3, 8, 14, 19, and 23. The self-employment part uses the threshold left over after wages.

**Things to verify before filing.**
- Line 1 should be Form W-2 box 5 (Medicare wages), which can exceed box 1 when you had pre-tax retirement deferrals.
- Line 19 is box 6 of every W-2, both spouses on a joint return.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const p = params(ctx.year).additionalMedicare;
    const status = c.str("filing_status");
    const thr = status === "mfj" ? p.mfj : status === "mfs" ? p.mfs : p.other;
    const l4 = c.set("line4", c.sum(["line1", "line2", "line3"]), "Medicare wages and tips", c.show([["1", c.n("line1")], ["2", c.n("line2")], ["3", c.n("line3")]]), "4");
    c.set("line5", thr, "Threshold", status || "single", "5");
    const l6 = c.set("line6", Math.max(0, l4 - thr), "Wages over the threshold", `max(0, ${f(l4)} - ${f(thr)})`, "6");
    const l7 = c.set("line7", l6 * p.rate, "Additional Medicare Tax on wages", `${f(l6)} x 0.9%`, "7");
    const l8 = Math.max(0, c.n("line8"));
    c.set("line9", thr, "Threshold", status || "single", "9");
    c.set("line10", l4, "Amount from line 4", `${f(l4)}`, "10");
    const l11 = c.set("line11", Math.max(0, thr - l4), "Threshold remaining after wages", `max(0, ${f(thr)} - ${f(l4)})`, "11");
    const l12 = c.set("line12", Math.max(0, l8 - l11), "Self-employment income over the remaining threshold", `max(0, ${f(l8)} - ${f(l11)})`, "12");
    const l13 = c.set("line13", l12 * p.rate, "Additional Medicare Tax on self-employment income", `${f(l12)} x 0.9%`, "13");
    const l14 = c.n("line14");
    c.set("line15", thr, "Threshold", status || "single", "15");
    const l16 = c.set("line16", Math.max(0, l14 - thr), "RRTA compensation over the threshold", `max(0, ${f(l14)} - ${f(thr)})`, "16");
    const l17 = c.set("line17", l16 * p.rate, "Additional Medicare Tax on RRTA compensation", `${f(l16)} x 0.9%`, "17");
    c.set("line18", l7 + l13 + l17, "Total Additional Medicare Tax", `${f(l7)} + ${f(l13)} + ${f(l17)}`, "18");
    const l1 = c.n("line1");
    c.set("line20", l1, "Amount from line 1", `${f(l1)}`, "20");
    const l21 = c.set("line21", l1 * 0.0145, "Regular Medicare withholding", `${f(l1)} x 1.45%`, "21");
    const l22 = c.set("line22", Math.max(0, c.n("line19") - l21), "Additional Medicare Tax withholding", `max(0, line 19 ${f(c.n("line19"))} - ${f(l21)})`, "22");
    c.set("line24", l22 + c.n("line23"), "Total Additional Medicare Tax withholding", `${f(l22)} + line 23 ${f(c.n("line23"))}`, "24");
    if (!c.has("line19") && l1 > 0) c.warn("line19 (Medicare tax withheld, W-2 box 6) was not supplied; withholding of the additional tax is treated as 0.");
    return c.result();
  },
};
