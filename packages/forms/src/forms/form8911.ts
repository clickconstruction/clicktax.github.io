import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

/** 2025 zero-pads widget numbers (f1_01) and adds line A, shifting lines 1-10 up by one; 2024 uses f1_1 through f1_14. */
const nm = (n2025: number) => ({ names: { 2024: `Page1[0].f1_${n2025 <= 2 ? n2025 : n2025 - 1}[0]`, 2025: `Page1[0].f1_${String(n2025).padStart(2, "0")}[0]` } });
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: nm(n), ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: nm(1) },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: nm(2) },
  { id: "lineA", line: "A", label: "Total number of qualified alternative fuel vehicle refueling properties for which you are claiming the credit (one Schedule A (Form 8911) per property)", type: "integer", years: [2025], locate: { names: { 2025: "Page1[0].f1_03[0]" } } },
  money("line1", "1", "Part I: total business/investment use credit from Schedule(s) A (Form 8911) Part II", 4),
  money("line2", "2", "Alternative fuel vehicle refueling property credit from partnerships and S corporations", 5),
  comp("line3", "3", "Business/investment use part of the credit. Add lines 1 and 2; to Form 3800 Part III line 1s", 6, "1 + 2"),
  money("line4", "4", "Part II: total personal-use credit from Schedule(s) A (Form 8911) Part III", 7),
  money("line5", "5", "Regular tax before credits: Form 1040 line 16 plus Schedule 2 line 1z", 8, { notes: "Filled from the return when preparing a full return." }),
  money("line6a", "6a", "Foreign tax credit", 9),
  money("line6b", "6b", "Certain allowable credits (the Schedule 3 credits ahead of this one)", 10),
  comp("line6c", "6c", "Add lines 6a and 6b", 11, "6a + 6b"),
  comp("line7", "7", "Net regular tax. Subtract line 6c from line 5; if zero or less, stop", 12, "max(0, 5 - 6c)"),
  money("line8", "8", "Tentative minimum tax (Form 6251 line 9)", 13, { notes: "Filled from the AMT computation when preparing a full return." }),
  comp("line9", "9", "Subtract line 8 from line 7; if zero or less, stop", 14, "max(0, 7 - 8)"),
  comp("line10", "10", "Personal use part of the credit: the smaller of line 4 or line 9; to Schedule 3 line 6j", 15, "min(4, 9)", { alwaysShow: true }),
];

export const form8911: FormDef = {
  id: "f8911",
  title: "Form 8911, Alternative Fuel Vehicle Refueling Property Credit",
  shortTitle: "Form 8911",
  description: "The credit for installing electric vehicle chargers or other alternative fuel refueling equipment in an eligible census tract: 30% of the cost up to $1,000 for personal use (Schedule 3 line 6j), and the business part through Form 3800.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8911.pdf",
  notes: `**Who files.** Anyone who placed qualified refueling property (EV chargers, natural gas, propane, hydrogen, E85, or biodiesel dispensers) in service at a home or business located in a low-income community or non-urban census tract. Each property's credit is figured on Schedule A (Form 8911); supply its Part II and Part III totals on lines 1 and 4. The credit ends for property placed in service after June 30, 2026.

**What the engine computes.** Lines 3, 6c, 7, 9, and 10 (the personal credit limited to regular tax over tentative minimum tax). In a full return line 5 is the Form 1040 tax plus Schedule 2 line 1z, line 6a the foreign tax credit, line 6b the other credits ahead of this one, line 8 the tentative minimum tax, line 10 goes to Schedule 3 line 6j, and line 3 to Form 3800 line 1s.

**What to verify.** The personal-use credit is 30% of cost up to $1,000 per item; the business credit is 6% (30% with prevailing wage and apprenticeship requirements) up to $100,000 per item. The property must be in an eligible census tract (check the IRS/Argonne mapping tool). Residential installations that are later used in a business change character.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l3 = c.set("line3", c.n("line1") + c.n("line2"), "Business-use refueling property credit", `${f(c.n("line1"))} + ${f(c.n("line2"))}`, "3");
    const l6c = c.set("line6c", c.n("line6a") + c.n("line6b"), "Credits ahead of this one", `${f(c.n("line6a"))} + ${f(c.n("line6b"))}`, "6c");
    const l7 = c.set("line7", Math.max(0, c.n("line5") - l6c), "Net regular tax", `max(0, ${f(c.n("line5"))} - ${f(l6c)})`, "7");
    const l9 = c.set("line9", Math.max(0, l7 - c.n("line8")), "Tax available for the credit", `max(0, ${f(l7)} - ${f(c.n("line8"))})`, "9");
    c.set("line10", Math.min(c.n("line4"), l9), "Personal-use refueling property credit", `min(${f(c.n("line4"))}, ${f(l9)})`, "10");
    if (c.n("line4") > 0 && !c.has("line5")) c.warn("Line 5 (regular tax before credits) was not supplied; the personal credit is limited to tax and is shown as zero.");
    if (c.n("line4") > 1000 && c.n("line4") % 1000 !== 0) c.warn("Line 4 exceeds $1,000: the personal-use credit is limited to $1,000 per item of property; check the Schedule A totals.");
    if (l3 > 0) c.warn("Line 3 is reported on Form 3800 Part III line 1s (general business credit); a full return adds it there automatically.");
    if (ctx.year === 2025 && !c.has("lineA") && (c.n("line1") > 0 || c.n("line4") > 0)) c.out["lineA"] = 1;
    return c.result();
  },
};
