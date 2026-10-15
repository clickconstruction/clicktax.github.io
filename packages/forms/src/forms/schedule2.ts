import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const amt = (id: string, line: string, label: string, page: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, page: number, notes: string): FieldDef => amt(id, line, label, page, { computed: true, notes });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on Form 1040", type: "text", locate: N("Page1[0].f1_01[0]") },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 11, locate: N("Page1[0].f1_02[0]") },
  amt("line1a", "1a", "Excess advance premium tax credit repayment (Form 8962)", 1),
  amt("line1b", "1b", "Repayment of new clean vehicle credit(s) (Form 8936)", 1),
  amt("line1c", "1c", "Repayment of previously owned clean vehicle credit(s) (Form 8936)", 1),
  amt("line1d", "1d", "Recapture of net EPE from Form 4255", 1),
  amt("line1e", "1e", "Excessive payments (EP) from Form 4255", 1),
  amt("line1f", "1f", "20% EP from Form 4255", 1),
  { id: "line1y_description", line: "1y", label: "Other additions to tax: type", type: "text", locate: N("Page1[0].f1_09[0]") },
  amt("line1y", "1y", "Other additions to tax: amount", 1),
  comp("line1z", "1z", "Add lines 1a through 1y", 1, "sum of lines 1a-1f and 1y"),
  amt("line2", "2", "Alternative minimum tax (Form 6251)", 1),
  comp("line3", "3", "Add lines 1z and 2; carried to Form 1040 line 17", 1, "line 1z + line 2"),
  amt("line4", "4", "Self-employment tax (Schedule SE)", 1, { notes: "Filled automatically from Schedule SE line 12 when preparing a full return." }),
  amt("line5", "5", "Social security and Medicare tax on unreported tip income (Form 4137)", 1),
  amt("line6", "6", "Uncollected social security and Medicare tax on wages (Form 8919)", 1),
  comp("line7", "7", "Total additional social security and Medicare tax", 1, "line 5 + line 6"),
  amt("line8", "8", "Additional tax on IRAs or other tax-favored accounts (Form 5329)", 1),
  amt("line9", "9", "Household employment taxes (Schedule H)", 1),
  amt("line10", "10", "Repayment of first-time homebuyer credit (Form 5405)", 1),
  amt("line11", "11", "Additional Medicare Tax (Form 8959)", 1, { notes: "0.9% of wages plus self-employment earnings over $200,000 ($250,000 married filing jointly, $125,000 married filing separately)." }),
  amt("line12", "12", "Net investment income tax (Form 8960)", 1),
  amt("line13", "13", "Uncollected social security and Medicare or RRTA tax on tips or group-term life insurance (Form W-2 box 12)", 1),
  amt("line14", "14", "Interest on tax due on installment income from the sale of certain residential lots and timeshares", 1),
  amt("line15", "15", "Interest on the deferred tax on gain from certain installment sales with a sales price over $150,000", 1),
  amt("line16", "16", "Recapture of low-income housing credit (Form 8611)", 1),
  { id: "line17z_description", line: "17z", label: "Any other taxes: type", type: "text", locate: N("Page2[0].Line17z_ReadOrder[0].f2_19[0]") },
  amt("line17z", "17z", "Any other taxes: amount", 2),
  comp("line18", "18", "Total additional taxes (lines 17a through 17z)", 2, "sum of supplied line 17 amounts"),
  amt("line20", "20", "Section 965 net tax liability installment from Form 965-A", 2),
  comp("line21", "21", "Add lines 4, 7 through 16, 18, and 20; carried to Form 1040 line 23", 2, "line 4 + 7 + 8 + ... + 16 + 18 + 20"),
];

export const schedule2: FormDef = {
  id: "f1040s2",
  title: "Schedule 2 (Form 1040), Additional Taxes",
  shortTitle: "Schedule 2",
  description: "Part I carries the alternative minimum tax and credit repayments to Form 1040 line 17. Part II carries self-employment tax and other additional taxes to Form 1040 line 23.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/forms-pubs/about-schedule-2-form-1040",
  notes: `**What this form is for.** For a sole proprietor the important line is 4 (self-employment tax from Schedule SE). Line 21 carries to Form 1040 line 23.

**What the engine computes.** Lines 1z, 3, 7, 18, and 21. Line 4 is filled from Schedule SE when preparing a full return.

**Things to verify before filing.**
- Additional Medicare Tax (line 11) applies when wages plus self-employment income exceed $200,000 single / $250,000 joint; the engine warns but does not compute Form 8959.
- Net investment income tax (line 12) applies to investment income when modified AGI exceeds $200,000 single / $250,000 joint.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const partI = ["line1a", "line1b", "line1c", "line1d", "line1e", "line1f", "line1y"];
    const p1: Array<[string, number]> = partI.map((id) => [id.replace("line", ""), c.n(id)]).filter(([, v]) => v !== 0) as Array<[string, number]>;
    const l1z = c.set("line1z", c.sum(partI), "Additions to tax", p1.length ? c.show(p1) : "none", "1z");
    const l2 = c.n("line2");
    c.set("line3", l1z + l2, "Part I total", `line 1z ${f(l1z)} + line 2 ${f(l2)}`, "3");
    const l7 = c.set("line7", c.n("line5") + c.n("line6"), "Additional social security and Medicare tax", `line 5 ${f(c.n("line5"))} + line 6 ${f(c.n("line6"))}`, "7");
    const l18 = c.set("line18", c.n("line17z"), "Total additional taxes", `line 17z ${f(c.n("line17z"))}`, "18");
    const ids = ["line4", "line8", "line9", "line10", "line11", "line12", "line13", "line14", "line15", "line16", "line20"];
    const parts: Array<[string, number]> = ids.map((id) => [id.replace("line", ""), c.n(id)]).filter(([, v]) => v !== 0) as Array<[string, number]>;
    if (l7 !== 0) parts.push(["7", l7]);
    if (l18 !== 0) parts.push(["18", l18]);
    c.set("line21", c.sum(ids) + l7 + l18, "Total other taxes", parts.length ? c.show(parts) : "none", "21");
    return c.result();
  },
};
