import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });
const THRESHOLD: Record<string, number> = { mfj: 250000, qss: 250000, mfs: 125000, single: 200000, hoh: 200000 };

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on your tax return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your social security number or EIN", type: "ssn", locate: { name: P(2) } },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  { id: "election_6013g", label: "Section 6013(g) election (nonresident spouse treated as resident)", type: "checkbox", locate: { name: "Page1[0].PartI[0].c1_1[0]" } },
  { id: "election_6013h", label: "Section 6013(h) election (dual-status spouse)", type: "checkbox", locate: { name: "Page1[0].PartI[0].c1_2[0]" } },
  { id: "election_1411_10g", label: "Regulations section 1.1411-10(g) election (CFC/PFIC)", type: "checkbox", locate: { name: "Page1[0].PartI[0].c1_3[0]" } },
  money("line1", "1", "Taxable interest (Form 1040 line 2b)", 3),
  money("line2", "2", "Ordinary dividends (Form 1040 line 3b)", 4),
  money("line3", "3", "Annuities (taxable portion from nonqualified annuities)", 5),
  money("line4a", "4a", "Rental real estate, royalties, partnerships, S corporations, trusts, etc. (Schedule 1 line 5)", 6),
  money("line4b", "4b", "Adjustment for net income or loss derived in the ordinary course of a non-section 1411 trade or business (as a negative number)", 7),
  comp("line4c", "4c", "Combine lines 4a and 4b", 8, "4a + 4b"),
  money("line5a", "5a", "Net gain or loss from disposition of property (Form 1040 line 7 plus Schedule 1 line 4)", 9),
  money("line5b", "5b", "Net gain or loss from disposition of property not subject to NIIT (as a negative number)", 10),
  money("line5c", "5c", "Adjustment from disposition of partnership interest or S corporation stock", 11),
  comp("line5d", "5d", "Combine lines 5a through 5c", 12, "5a + 5b + 5c"),
  money("line6", "6", "Adjustments to investment income for certain CFCs and PFICs", 13),
  money("line7", "7", "Other modifications to investment income", 14),
  comp("line8", "8", "Total investment income", 15, "1 + 2 + 3 + 4c + 5d + 6 + 7"),
  money("line9a", "9a", "Investment interest expenses (Schedule A line 9)", 16),
  money("line9b", "9b", "State, local, and foreign income tax allocable to investment income", 17),
  money("line9c", "9c", "Miscellaneous investment expenses", 18),
  comp("line9d", "9d", "Add lines 9a, 9b, and 9c", 19, "9a + 9b + 9c"),
  money("line10", "10", "Additional modifications", 20),
  comp("line11", "11", "Total deductions and modifications", 21, "9d + 10"),
  comp("line12", "12", "Net investment income (line 8 minus line 11; if zero or less, no tax)", 22, "max(0, 8 - 11)", { alwaysShow: true }),
  money("line13", "13", "Modified adjusted gross income (Form 1040 line 11 for most filers)", 23),
  comp("line14", "14", "Threshold based on filing status ($250,000 joint/qualifying surviving spouse, $125,000 married filing separately, $200,000 others)", 24, "by filing status"),
  comp("line15", "15", "Subtract line 14 from line 13; if zero or less, enter 0", 25, "max(0, 13 - 14)"),
  comp("line16", "16", "Smaller of line 12 or line 15", 26, "min(12, 15)"),
  comp("line17", "17", "Net investment income tax (3.8%); carried to Schedule 2 line 12", 27, "16 x 0.038", { alwaysShow: true }),
  money("line18a", "18a", "Estates and trusts: net investment income", 28),
  money("line18b", "18b", "Estates and trusts: deductions for distributions and charitable deductions", 29),
  money("line18c", "18c", "Estates and trusts: undistributed net investment income", 30),
  money("line19a", "19a", "Estates and trusts: adjusted gross income", 31),
  money("line19b", "19b", "Estates and trusts: highest tax bracket threshold", 32),
  money("line19c", "19c", "Estates and trusts: subtract 19b from 19a", 33),
  money("line20", "20", "Estates and trusts: smaller of 18c or 19c", 34),
  money("line21", "21", "Estates and trusts: net investment income tax", 35),
];

export const form8960: FormDef = {
  id: "f8960",
  title: "Form 8960, Net Investment Income Tax",
  shortTitle: "Form 8960",
  description: "The 3.8% tax on the smaller of net investment income (interest, dividends, capital gains, rents, royalties, passive business income, less allocable deductions) or modified AGI over $200,000 ($250,000 joint, $125,000 married filing separately). Line 17 goes to Schedule 2 line 12.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8960.pdf",
  notes: `**Who owes it.** Individuals with modified AGI over the threshold for their filing status and any net investment income. The thresholds are not indexed for inflation.

**What the engine computes.** Lines 4c, 5d, 8, 9d, 11, 12, 14, 15, 16, and 17. In a full return it is prepared automatically when AGI exceeds the threshold: line 1 is Form 1040 line 2b, line 2 is line 3b, line 4a is Schedule 1 line 5, line 5a is Form 1040 line 7 plus Schedule 1 line 4, line 9a is Schedule A line 9 when itemizing, and line 13 is AGI.

**What to verify.** Line 4b removes non-passive trade or business income reported on Schedule E (supply it as a negative number); line 5b removes gains not subject to the tax (for example, the excluded gain on a home sale is already out of line 7); state income tax on line 9b is the part allocable to investment income under a reasonable method; estates and trusts use lines 18-21, which are inputs only.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") || "single";
    const l4c = c.set("line4c", c.n("line4a") + c.n("line4b"), "Rental and pass-through income", `${f(c.n("line4a"))} + ${f(c.n("line4b"))}`, "4c");
    const l5d = c.set("line5d", c.n("line5a") + c.n("line5b") + c.n("line5c"), "Net gains", `${f(c.n("line5a"))} + ${f(c.n("line5b"))} + ${f(c.n("line5c"))}`, "5d");
    const l8 = c.set("line8", c.n("line1") + c.n("line2") + c.n("line3") + l4c + l5d + c.n("line6") + c.n("line7"), "Total investment income", `${f(c.n("line1"))} + ${f(c.n("line2"))} + ${f(c.n("line3"))} + ${f(l4c)} + ${f(l5d)} + ${f(c.n("line6"))} + ${f(c.n("line7"))}`, "8");
    const l9d = c.set("line9d", c.sum(["line9a", "line9b", "line9c"]), "Investment expenses", "9a + 9b + 9c", "9d");
    const l11 = c.set("line11", l9d + c.n("line10"), "Total deductions and modifications", `${f(l9d)} + ${f(c.n("line10"))}`, "11");
    const l12 = c.set("line12", Math.max(0, l8 - l11), "Net investment income", `max(0, ${f(l8)} - ${f(l11)})`, "12");
    const l13 = c.n("line13");
    if (!c.has("line13")) c.warn("line13 (modified AGI) was not supplied; the threshold test cannot be applied.");
    const l14 = c.set("line14", THRESHOLD[status] ?? 200000, "Threshold", status, "14");
    const l15 = c.set("line15", Math.max(0, l13 - l14), "MAGI over the threshold", `max(0, ${f(l13)} - ${f(l14)})`, "15");
    const l16 = c.set("line16", Math.min(l12, l15), "Amount subject to tax", `min(${f(l12)}, ${f(l15)})`, "16");
    c.set("line17", Math.round(l16 * 0.038), "Net investment income tax", `${f(l16)} x 0.038`, "17");
    if (c.n("line4a") > 0 && !c.has("line4b")) c.warn("Line 4a includes all Schedule E income; if any is from a trade or business you materially participate in (not passive), supply line4b as a negative adjustment.");
    return c.result();
  },
};
