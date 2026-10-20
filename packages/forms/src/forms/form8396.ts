import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

/** The 2024 PDF zero-pads single-digit widget numbers (f1_01, f2_01); the 2025 PDF does not. */
const nm = (page: 1 | 2, n: number, wrap = "") => ({ names: { 2024: `Page${page}[0].${wrap}f${page}_${String(n).padStart(2, "0")}[0]`, 2025: `Page${page}[0].${wrap}f${page}_${n}[0]` } });
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: nm(1, n), ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on your tax return", type: "text", locate: nm(1, 1) },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: nm(1, 2) },
  { id: "home_address", label: "Address of the home to which the Mortgage Credit Certificate relates (if different from the return address)", type: "text", locate: nm(1, 3) },
  { id: "issuer", label: "Name of the issuer of the Mortgage Credit Certificate", type: "text", locate: nm(1, 4) },
  { id: "certificate_number", label: "Mortgage Credit Certificate number", type: "text", locate: nm(1, 5) },
  { id: "issue_date", label: "Issue date", type: "text", locate: nm(1, 6) },
  money("line1", "1", "Interest paid on the certified indebtedness amount (your share if someone else also held an interest in the home)", 7),
  { id: "line2", line: "2", label: "Certificate credit rate shown on the Mortgage Credit Certificate (percent, for example 20)", type: "percent", locate: nm(1, 8) },
  comp("line3", "3", "Line 1 times line 2; when the rate is more than 20%, limited to $2,000", 9, "1 x 2 (max 2,000 if rate > 20%)"),
  money("line4", "4", "Credit carryforward from three years ago (line 16 of last year's Form 8396)", 10),
  money("line5", "5", "Credit carryforward from two years ago (line 14 of last year's Form 8396)", 11),
  money("line6", "6", "Credit carryforward from last year (line 17 of last year's Form 8396)", 12),
  comp("line7", "7", "Add lines 3 through 6", 13, "3 + 4 + 5 + 6"),
  money("line8", "8", "Limitation based on tax liability (Credit Limit Worksheet line 3)", 14, { notes: "Computed from ws_line1 and ws_line2 when supplied; in a full return from the Form 1040 tax less the credits ahead of this one." }),
  comp("line9", "9", "Current-year mortgage interest credit: the smaller of line 7 or line 8; to Schedule 3 line 6g", 15, "min(7, 8)", { alwaysShow: true }),
  comp("line10", "10", "Part II (carryforward): add lines 3 and 4", 16, "3 + 4"),
  comp("line11", "11", "The amount from line 7", 17, "= line 7"),
  comp("line12", "12", "The larger of line 9 or line 10", 18, "max(9, 10)"),
  comp("line13", "13", "Subtract line 12 from line 11", 19, "11 - 12"),
  comp("line14", "14", "Last year's credit carried forward to next year: the smaller of line 6 or line 13", 20, "min(6, 13)"),
  comp("line15", "15", "Subtract line 14 from line 13", 21, "13 - 14"),
  comp("line16", "16", "The credit from two years ago carried forward to next year: the smaller of line 5 or line 15", 22, "min(5, 15)"),
  comp("line17", "17", "This year's credit carried forward to next year. Subtract line 9 from line 3; not less than zero", 23, "max(0, 3 - 9)", { alwaysShow: true }),
  money("ws_line1", "Worksheet 1", "Credit Limit Worksheet: Form 1040 line 18", 1, { locate: nm(2, 1, "Col2[0].Line8_Worksheet[0].Line1[0].") }),
  money("ws_line2", "Worksheet 2", "Credit Limit Worksheet: Schedule 3 lines 1 through 4, 5a, 5b, 6d, 6f, 6h, 6i, and 6m", 2, { locate: nm(2, 2, "Col2[0].Line8_Worksheet[0].Line2[0].") }),
  comp("ws_line3", "Worksheet 3", "Credit Limit Worksheet: line 1 minus line 2 (to line 8)", 3, "worksheet line 1 - line 2", { locate: nm(2, 3, "Col2[0].Line8_Worksheet[0].Line3[0].") }),
];

export const form8396: FormDef = {
  id: "f8396",
  title: "Form 8396, Mortgage Interest Credit",
  shortTitle: "Form 8396",
  description: "The credit for holders of a state or local Mortgage Credit Certificate: the certificate rate times the mortgage interest paid (capped at $2,000 when the rate exceeds 20%), limited by tax, with unused amounts carried forward three years.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f8396.pdf",
  notes: `**Who files.** Homeowners issued a qualified Mortgage Credit Certificate (MCC) by a state or local housing agency when they bought their main home. The certificate rate is on the MCC, not the mortgage interest rate.

**What the engine computes.** Line 3 (with the $2,000 cap when the rate exceeds 20%), lines 7, 9, and the Part II carryforward ordering (lines 10 through 17, oldest carryforwards used first), and the Credit Limit Worksheet (line 8) when its inputs are supplied. In a full return line 8 comes from the Form 1040 tax less the credits ahead of this one, and line 9 goes to Schedule 3 line 6g.

**What to verify.** Reduce the Schedule A mortgage interest deduction by the credit on line 3. If you refinanced, the credit is based on the reissued certificate and the remaining certified indebtedness; selling the home within 9 years may trigger recapture on Form 8828.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    let rate = c.has("line2") ? Number(values["line2"]) || 0 : 0;
    if (rate > 1) rate = rate / 100;
    const raw = c.n("line1") * rate;
    const l3 = c.set("line3", rate > 0.2 ? Math.min(raw, 2000) : raw, "Current-year certificate credit", rate > 0.2 ? `min(${f(c.n("line1"))} x ${(rate * 100).toFixed(2)}%, 2,000)` : `${f(c.n("line1"))} x ${(rate * 100).toFixed(2)}%`, "3");
    if (c.has("line1") && !c.has("line2")) c.warn("Line 2 (the certificate credit rate from the MCC) was not supplied; line 3 is zero.");
    const l7 = c.set("line7", l3 + c.sum(["line4", "line5", "line6"]), "Credit before the tax limit", `${f(l3)} + ${f(c.sum(["line4", "line5", "line6"]))}`, "7");
    if (c.has("ws_line1") || c.has("ws_line2")) {
      const ws3 = c.set("ws_line3", Math.max(0, c.n("ws_line1") - c.n("ws_line2")), "Credit Limit Worksheet", `${f(c.n("ws_line1"))} - ${f(c.n("ws_line2"))}`, "Worksheet 3");
      if (!c.has("line8")) c.out["line8"] = ws3;
    }
    const limited = c.has("line8") || c.has("ws_line1");
    const l8 = c.n("line8");
    if (!limited && l7 > 0) c.warn("Line 8 (tax liability limit) was not supplied; supply ws_line1 (Form 1040 line 18) and ws_line2 (the credits ahead of this one) or line8 directly. The credit is shown unlimited.");
    const l9 = c.set("line9", limited ? Math.min(l7, l8) : l7, "Mortgage interest credit (Schedule 3 line 6g)", limited ? `min(${f(l7)}, ${f(l8)})` : "= line 7 (no limit supplied)", "9");
    const l10 = c.set("line10", l3 + c.n("line4"), "Lines 3 and 4", `${f(l3)} + ${f(c.n("line4"))}`, "10");
    const l11 = c.set("line11", l7, "Line 7", "= line 7", "11");
    const l12 = c.set("line12", Math.max(l9, l10), "Larger of line 9 or line 10", `max(${f(l9)}, ${f(l10)})`, "12");
    const l13 = c.set("line13", Math.max(0, l11 - l12), "Unused carryforwards", `${f(l11)} - ${f(l12)}`, "13");
    const l14 = c.set("line14", Math.min(c.n("line6"), l13), "Last year's credit carried to next year", `min(${f(c.n("line6"))}, ${f(l13)})`, "14");
    const l15 = c.set("line15", Math.max(0, l13 - l14), "Line 13 minus line 14", `${f(l13)} - ${f(l14)}`, "15");
    c.set("line16", Math.min(c.n("line5"), l15), "Two-year-old credit carried to next year", `min(${f(c.n("line5"))}, ${f(l15)})`, "16");
    c.set("line17", Math.max(0, l3 - l9), "This year's credit carried to next year", `max(0, ${f(l3)} - ${f(l9)})`, "17");
    if (c.n("line4") > 0 && l12 <= l10 && l9 < l7) c.warn("The carryforward from three years ago (line 4) expires this year: any part not used on line 9 is lost.");
    return c.result();
  },
};
