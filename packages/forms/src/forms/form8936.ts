import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, Locate } from "../types.ts";

/** The 2024 PDF zero-pads single-digit widget numbers (f1_03); the 2025 PDF does not (f1_3). Lines 1a and 3a sit in read-order subforms. */
const nm = (n: number, wrap = ""): Locate => {
  const w = wrap ? `${wrap}[0].` : "";
  return n < 10 ? { names: { 2024: `Page1[0].${w}f1_0${n}[0]`, 2025: `Page1[0].${w}f1_${n}[0]` } } : { name: `Page1[0].${w}f1_${n}[0]` };
};
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: nm(n), ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

/** Modified AGI limits: the credit is allowed when MAGI in the current or the preceding year is at or below the limit. */
const LIMITS = { new: { mfj: 300000, hoh: 225000, other: 150000 }, used: { mfj: 150000, hoh: 112500, other: 75000 } };
const STATUS_CODE: Record<string, string> = { single: "S", mfj: "MFJ", mfs: "MFS", hoh: "HOH", qss: "QSS" };

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: nm(1) },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: nm(2) },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  { id: "line1a", line: "1a", label: "Modified AGI for the tax year: Form 1040 line 11 (AGI)", type: "money", locate: nm(3, "Line1a_ReadOrder") },
  money("line1b", "1b", "Income from Puerto Rico excluded this year", 4),
  money("line1c", "1c", "Form 2555 line 45 (foreign earned income exclusion) this year", 5),
  money("line1d", "1d", "Form 2555 line 50 (housing exclusion) this year", 6),
  money("line1e", "1e", "Form 4563 line 15 (American Samoa exclusion) this year", 7),
  comp("line2", "2", "Modified AGI for the tax year. Add lines 1a through 1e", 8, "1a + 1b + 1c + 1d + 1e"),
  { id: "line3a", line: "3a", label: "Prior-year AGI (Form 1040 line 11 of the preceding year)", type: "money", locate: nm(9, "Line3a_ReadOrder"), notes: "Leave the line 3 entries blank if you did not file a prior-year return; the credit then depends on the current year alone." },
  money("line3b", "3b", "Prior year: income from Puerto Rico excluded", 10),
  money("line3c", "3c", "Prior year: Form 2555 line 45", 11),
  money("line3d", "3d", "Prior year: Form 2555 line 50", 12),
  money("line3e", "3e", "Prior year: Form 4563 line 15", 13),
  comp("line4", "4", "Prior-year modified AGI. Add lines 3a through 3e", 14, "3a + 3b + 3c + 3d + 3e"),
  { id: "line5", line: "5", label: "Prior-year filing status (S, MFJ, MFS, HOH, QSS)", type: "text", maxLen: 3, locate: nm(15), notes: "Defaults to this year's filing status." },
  money("line6", "6", "Part II: total new clean vehicle credit for business/investment use from Schedule A (Form 8936) Part II", 16),
  money("line7", "7", "New clean vehicle credit from partnerships and S corporations", 17),
  comp("line8", "8", "Business/investment use part of the new clean vehicle credit. Add lines 6 and 7; to Form 3800 Part III line 1y", 18, "6 + 7"),
  money("line9", "9", "Part III: total personal-use new clean vehicle credit from Schedule A (Form 8936) Part III", 19),
  money("line10", "10", "Form 1040 line 18 (tax)", 20, { notes: "Filled from the return when preparing a full return." }),
  money("line11", "11", "Personal credits from Form 1040 that come before this one (Schedule 3 lines 1 through 4, 5a, 5b, and 6b, 6d, 6e, 6g, 6h, 6i, 6j, 6k, 6l)", 21),
  comp("line12", "12", "Subtract line 11 from line 10; not less than zero", 22, "max(0, 10 - 11)"),
  comp("line13", "13", "Personal-use new clean vehicle credit: the smaller of line 9 or line 12; to Schedule 3 line 6f", 23, "min(9, 12)", { alwaysShow: true }),
  money("line14", "14", "Part IV: total previously owned clean vehicle credit from Schedule A (Form 8936) Part IV", 24),
  money("line15", "15", "Form 1040 line 18 (tax)", 25, { notes: "Filled from the return when preparing a full return." }),
  money("line16", "16", "Personal credits that come before this one, including line 13", 26),
  comp("line17", "17", "Subtract line 16 from line 15; not less than zero", 27, "max(0, 15 - 16)"),
  comp("line18", "18", "Previously owned clean vehicle credit: the smaller of line 14 or line 17; to Schedule 3 line 6m", 28, "min(14, 17)", { alwaysShow: true }),
  money("line19", "19", "Part V: total qualified commercial clean vehicle credit from Schedule A (Form 8936) Part V", 29),
  money("line20", "20", "Qualified commercial clean vehicle credit from partnerships and S corporations", 30),
  comp("line21", "21", "Qualified commercial clean vehicle credit. Add lines 19 and 20; to Form 3800 Part III line 1aa", 31, "19 + 20"),
];

export const form8936: FormDef = {
  id: "f8936",
  title: "Form 8936, Clean Vehicle Credits",
  shortTitle: "Form 8936",
  description: "Figures the new clean vehicle credit (up to $7,500), the previously owned clean vehicle credit (up to $4,000), and the commercial clean vehicle credit from the per-vehicle Schedule A totals, applying the modified AGI limits and the tax-liability limit.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8936.pdf",
  notes: `**Who files.** Buyers of qualifying new or used clean vehicles placed in service during the year, and businesses claiming the commercial clean vehicle credit. Each vehicle's VIN and credit amount is figured on Schedule A (Form 8936), one per vehicle; supply its Part II, III, IV, and V totals on lines 6, 9, 14, and 19. The new and previously owned credits end for vehicles acquired after September 30, 2025 (Public Law 119-21).

**What the engine computes.** Lines 2 and 4 (modified AGI for this year and last year), the MAGI test (the credit is disallowed only when both years exceed the limit: $300,000 joint / $225,000 head of household / $150,000 other for new vehicles, half those amounts for previously owned vehicles), lines 8, 12, 13, 17, 18, and 21, and line 5 from the filing status.

**What to verify.** If the dealer transferred the credit to you at purchase (advance payment), you must still file this form; if your MAGI turns out to be over the limit you repay the transferred credit on Schedule 2 lines 1b or 1c. The personal-use credits are nonrefundable and do not carry forward.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") || "single";
    const key = status === "mfj" || status === "qss" ? "mfj" : status === "hoh" ? "hoh" : "other";
    if (!c.has("line5")) c.out["line5"] = STATUS_CODE[status] ?? "S";
    const l2 = c.set("line2", c.sum(["line1a", "line1b", "line1c", "line1d", "line1e"]), "Modified AGI, current year", "1a + 1b + 1c + 1d + 1e", "2");
    const prior = ["line3a", "line3b", "line3c", "line3d", "line3e"].some((k) => c.has(k));
    const l4 = c.set("line4", c.sum(["line3a", "line3b", "line3c", "line3d", "line3e"]), "Modified AGI, prior year", "3a + 3b + 3c + 3d + 3e", "4");
    const magi = prior ? Math.min(l2, l4) : l2;
    const over = (kind: "new" | "used") => c.has("line1a") && magi > LIMITS[kind][key];
    c.set("line8", c.n("line6") + c.n("line7"), "Business-use new clean vehicle credit", `${f(c.n("line6"))} + ${f(c.n("line7"))}`, "8");
    const l12 = c.set("line12", Math.max(0, c.n("line10") - c.n("line11")), "Tax available for the credit", `max(0, ${f(c.n("line10"))} - ${f(c.n("line11"))})`, "12");
    let l13 = Math.min(c.n("line9"), l12);
    if (c.n("line9") > 0 && over("new")) {
      c.warn(`Modified AGI ${f(magi)} (the smaller of this year and last year) exceeds the $${LIMITS.new[key].toLocaleString()} limit for ${status}: no new clean vehicle credit.${prior ? "" : " Supply the prior-year figures on lines 3a through 3e if last year's MAGI was within the limit."}`);
      l13 = 0;
    }
    if (c.n("line9") > 0 && !c.has("line10")) c.warn("Line 10 (Form 1040 line 18) was not supplied; the personal-use credit is limited to tax and is shown as zero.");
    c.set("line13", l13, "Personal-use new clean vehicle credit", over("new") ? "MAGI over the limit" : `min(${f(c.n("line9"))}, ${f(l12)})`, "13");
    const l16 = c.has("line16") ? c.n("line16") : c.n("line11") + l13;
    if (!c.has("line16") && (c.has("line11") || l13 > 0)) c.out["line16"] = l16;
    const l17 = c.set("line17", Math.max(0, c.n("line15") - l16), "Tax available for the previously owned credit", `max(0, ${f(c.n("line15"))} - ${f(l16)})`, "17");
    let l18 = Math.min(c.n("line14"), l17);
    if (c.n("line14") > 0 && over("used")) {
      c.warn(`Modified AGI ${f(magi)} exceeds the $${LIMITS.used[key].toLocaleString()} limit for ${status}: no previously owned clean vehicle credit.`);
      l18 = 0;
    }
    if (c.n("line14") > 0 && !c.has("line15")) c.warn("Line 15 (Form 1040 line 18) was not supplied; the previously owned credit is limited to tax and is shown as zero.");
    c.set("line18", l18, "Previously owned clean vehicle credit", over("used") ? "MAGI over the limit" : `min(${f(c.n("line14"))}, ${f(l17)})`, "18");
    c.set("line21", c.n("line19") + c.n("line20"), "Qualified commercial clean vehicle credit", `${f(c.n("line19"))} + ${f(c.n("line20"))}`, "21");
    if (c.n("line9") > 7500 && c.n("line9") % 7500 !== 0) c.warn("Line 9 exceeds $7,500: the new clean vehicle credit is at most $7,500 per vehicle; check the Schedule A totals.");
    if (c.n("line14") > 4000 && c.n("line14") % 4000 !== 0) c.warn("Line 14 exceeds $4,000: the previously owned credit is the smaller of $4,000 or 30% of the sale price per vehicle.");
    return c.result();
  },
};
