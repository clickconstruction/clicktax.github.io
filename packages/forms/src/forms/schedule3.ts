import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const amt = (id: string, line: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page: 1, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, { computed: true, notes, ...extra });

const OTHER_NONREF: Array<[string, string]> = [
  ["6a", "General business credit (Form 3800)"],
  ["6b", "Credit for prior year minimum tax (Form 8801)"],
  ["6c", "Adoption credit (Form 8839)"],
  ["6d", "Credit for the elderly or disabled (Schedule R)"],
  ["6e", "Reserved for future use"],
  ["6f", "Clean vehicle credit (Form 8936)"],
  ["6g", "Mortgage interest credit (Form 8396)"],
  ["6h", "District of Columbia first-time homebuyer credit (Form 8859)"],
  ["6i", "Qualified electric vehicle credit (Form 8834)"],
  ["6j", "Alternative fuel vehicle refueling property credit (Form 8911)"],
  ["6k", "Credit to holders of tax credit bonds (Form 8912)"],
  ["6l", "Amount on Form 8978, line 14"],
  ["6m", "Credit for previously owned clean vehicles (Form 8936)"],
];
const OTHER_PAY: Array<[string, string]> = [
  ["13a", "Form 2439"],
  ["13b", "Credit for repayment of amounts included in income from earlier years"],
  ["13c", "Elective payment election amount from Form 3800"],
  ["13d", "Deferred amount of net 965 tax liability"],
];

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on Form 1040", type: "text", locate: { names: { 2024: "Page1[0].f1_01[0]", 2025: "Page1[0].f1_01[0]" } } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 11, locate: { names: { 2024: "Page1[0].f1_02[0]", 2025: "Page1[0].f1_02[0]" } } },
  amt("line1", "1", "Foreign tax credit (Form 1116 if required)"),
  amt("line2", "2", "Credit for child and dependent care expenses (Form 2441 line 11)", { notes: "Filled from Form 2441 when preparing a full return." }),
  amt("line3", "3", "Education credits (Form 8863 line 19)", { notes: "Filled from Form 8863 when preparing a full return." }),
  amt("line4", "4", "Retirement savings contributions credit (Form 8880)", { notes: "Filled from Form 8880 when preparing a full return." }),
  amt("line5a", "5a", "Residential clean energy credit (Form 5695 line 15)"),
  amt("line5b", "5b", "Energy efficient home improvement credit (Form 5695 line 32)"),
  ...OTHER_NONREF.filter(([l]) => l !== "6e").map(([line, label]) => amt(`line${line}`, line, label)),
  { id: "line6z_description", line: "6z", label: "Other nonrefundable credits: type", type: "text", locate: { names: { 2024: "Page1[0].Line6z_ReadOrder[0].f2_23[0]", 2025: "Page1[0].Line6z_ReadOrder[0].f2_22[0]" } } },
  amt("line6z", "6z", "Other nonrefundable credits: amount"),
  comp("line7", "7", "Total other nonrefundable credits", "sum of lines 6a through 6z"),
  comp("line8", "8", "Add lines 1 through 4, 5a, 5b, and 7; carried to Form 1040 line 20", "nonrefundable credits total", { alwaysShow: true }),
  amt("line9", "9", "Net premium tax credit (Form 8962)"),
  amt("line10", "10", "Amount paid with request for extension to file (Form 4868)"),
  amt("line11", "11", "Excess social security and tier 1 RRTA tax withheld"),
  amt("line12", "12", "Credit for federal tax on fuels (Form 4136)"),
  ...OTHER_PAY.map(([line, label]) => amt(`line${line}`, line, label)),
  { id: "line13z_description", line: "13z", label: "Other payments or refundable credits: type", type: "text", locate: { names: { 2024: "Page1[0].Line13z_ReadOrder[0].f1_36[0]", 2025: "Page1[0].Line13z_ReadOrder[0].f1_34[0]" } } },
  amt("line13z", "13z", "Other payments or refundable credits: amount"),
  comp("line14", "14", "Total other payments or refundable credits", "sum of lines 13a through 13z"),
  comp("line15", "15", "Add lines 9 through 12 and 14; carried to Form 1040 line 31", "refundable credits and payments total", { alwaysShow: true }),
];

export const schedule3: FormDef = {
  id: "f1040s3",
  title: "Schedule 3 (Form 1040), Additional Credits and Payments",
  shortTitle: "Schedule 3",
  description: "Part I collects nonrefundable credits (child care, education, retirement savings, energy, foreign tax) into Form 1040 line 20. Part II collects other payments and refundable credits (premium tax credit, extension payment, excess social security withholding) into line 31.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/forms-pubs/about-schedule-3-form-1040",
  notes: `**What this form is for.** The routing sheet for credits that have their own form. Line 8 reduces tax on Form 1040 line 20; line 15 counts as a payment on line 31.

**What the engine computes.** Lines 7, 8, 14, and 15. When preparing a full return, lines 2, 3, and 4 are filled from Forms 2441, 8863, and 8880 when those are prepared.

**Things to verify before filing.**
- Nonrefundable credits cannot exceed the tax on Form 1040 line 18 less the child tax credit; the engine does not re-limit each credit form's own limit worksheet.
- Excess social security withholding (line 11) applies only when more than one employer withheld above the annual wage base.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const other = [...OTHER_NONREF.filter(([l]) => l !== "6e").map(([l]) => `line${l}`), "line6z"];
    const op: Array<[string, number]> = other.map((id) => [id.replace("line", ""), c.n(id)] as [string, number]).filter(([, v]) => v !== 0);
    const l7 = c.set("line7", c.sum(other), "Total other nonrefundable credits", op.length ? c.show(op) : "none", "7");
    const main = ["line1", "line2", "line3", "line4", "line5a", "line5b"];
    const mp: Array<[string, number]> = main.map((id) => [id.replace("line", ""), c.n(id)] as [string, number]).filter(([, v]) => v !== 0);
    if (l7) mp.push(["7", l7]);
    c.set("line8", c.sum(main) + l7, "Total nonrefundable credits", mp.length ? c.show(mp) : "none", "8");
    const otherPay = [...OTHER_PAY.map(([l]) => `line${l}`), "line13z"];
    const pp: Array<[string, number]> = otherPay.map((id) => [id.replace("line", ""), c.n(id)] as [string, number]).filter(([, v]) => v !== 0);
    const l14 = c.set("line14", c.sum(otherPay), "Total other payments or refundable credits", pp.length ? c.show(pp) : "none", "14");
    const pay = ["line9", "line10", "line11", "line12"];
    const qp: Array<[string, number]> = pay.map((id) => [id.replace("line", ""), c.n(id)] as [string, number]).filter(([, v]) => v !== 0);
    if (l14) qp.push(["14", l14]);
    c.set("line15", c.sum(pay) + l14, "Total other payments and refundable credits", qp.length ? c.show(qp) : "none", "15");
    return c.result();
  },
};
