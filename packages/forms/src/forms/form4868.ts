import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const P = (n: number) => ({ names: { 2024: `Page1[0].Part1_ReadOrder[0].f1_${n}[0]`, 2025: `Page1[0].PartI_ReadOrder[0].f1_${n}[0]` } });

const fields: FieldDef[] = [
  { id: "name", line: "1", label: "Your name(s)", type: "text", locate: P(4) },
  { id: "address", line: "1", label: "Address", type: "text", locate: P(5) },
  { id: "city", line: "1", label: "City, town, or post office", type: "text", locate: P(6) },
  { id: "state", line: "1", label: "State", type: "text", maxLen: 2, locate: P(7) },
  { id: "zip", line: "1", label: "ZIP code", type: "text", maxLen: 10, locate: P(8) },
  { id: "ssn", line: "2", label: "Your social security number", type: "ssn", maxLen: 11, locate: P(9) },
  { id: "spouse_ssn", line: "3", label: "Spouse's social security number", type: "ssn", maxLen: 11, locate: P(10) },
  { id: "line4", line: "4", label: "Estimate of total tax liability for the year", type: "money", locate: N("Page1[0].f1_11[0]"), notes: "Filled from Form 1040 line 24 when preparing a full return." },
  { id: "line5", line: "5", label: "Total payments for the year (withholding, estimated payments, refundable credits)", type: "money", locate: N("Page1[0].f1_12[0]"), notes: "Filled from Form 1040 line 33 when preparing a full return." },
  { id: "line6", line: "6", label: "Balance due", type: "money", computed: true, locate: N("Page1[0].f1_13[0]"), alwaysShow: true, notes: "line 4 - line 5, not less than zero" },
  { id: "line7", line: "7", label: "Amount you are paying with the extension", type: "money", locate: N("Page1[0].f1_14[0]"), notes: "Defaults to the balance due." },
  { id: "line8", line: "8", label: "You are out of the country and a U.S. citizen or resident", type: "checkbox", locate: N("Page1[0].c1_1[0]") },
  { id: "line9", line: "9", label: "You file Form 1040-NR and did not receive wages subject to U.S. income tax withholding", type: "checkbox", locate: N("Page1[0].c1_2[0]") },
];

export const form4868: FormDef = {
  id: "f4868",
  title: "Form 4868, Application for Automatic Extension of Time To File U.S. Individual Income Tax Return",
  shortTitle: "Form 4868",
  description: "A six-month extension to file (not to pay). Estimate the year's tax, subtract payments, and pay the balance with the voucher by the April deadline.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f4868.pdf",
  notes: `**What this form is for.** Filing this by the April due date extends the time to file the return to October 15. It does not extend the time to pay: interest and the late-payment penalty run on any balance not paid by April.

**What the engine computes.** Line 6 (balance due) and, if not supplied, line 7 equal to the balance due. When preparing a full return, lines 4 and 5 come from Form 1040 lines 24 and 33.

**Things to verify before filing.**
- Paying electronically at IRS Direct Pay and selecting "extension" files the extension automatically; the paper voucher is only needed when mailing a check.
- Pay at least 90% of the actual tax by April to avoid the late-payment penalty.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l4 = c.n("line4");
    const l5 = c.n("line5");
    const l6 = c.set("line6", Math.max(0, l4 - l5), "Balance due", `max(0, line 4 ${f(l4)} - line 5 ${f(l5)})`, "6");
    if (!c.has("line7")) c.set("line7", l6, "Amount you are paying", `balance due ${f(l6)}`, "7");
    if (!c.has("line4")) c.warn("line4 (estimated total tax) is missing; the IRS may void an extension whose estimate is not reasonable.");
    return c.result();
  },
};
