import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const amt = (id: string, line: string, label: string, page: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { tok: line, page, kind: "text" }, ...extra });
const comp = (id: string, line: string, label: string, page: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, page, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on Form 1040", type: "text", locate: N("Page1[0].f1_01[0]") },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 11, locate: N("Page1[0].f1_02[0]") },
  amt("line1", "1", "Amount from Form 1040 line 11b (adjusted gross income)", 1, { notes: "Filled from Form 1040 when preparing a full return." }),
  amt("line2a", "2a", "Income from Puerto Rico that you excluded", 1),
  amt("line2b", "2b", "Form 2555 line 45", 1),
  amt("line2c", "2c", "Form 2555 line 50", 1),
  amt("line2d", "2d", "Form 4563 line 15", 1),
  comp("line2e", "2e", "Add lines 2a through 2d", 1, "2a + 2b + 2c + 2d"),
  comp("line3", "3", "Modified adjusted gross income", 1, "line 1 + line 2e"),
  amt("line4a", "4a", "Qualified tips received as an employee reported on Form W-2 (subject to social security and Medicare taxes)", 1),
  amt("line4b", "4b", "Qualified tips received as an employee not reported on Form W-2 (Form 4137)", 1),
  comp("line4c", "4c", "Total qualified employee tips", 1, "line 4a + line 4b"),
  amt("line5", "5", "Qualified tips received in the course of a trade or business (Schedule C)", 1),
  comp("line6", "6", "Add lines 4c and 5", 1, "4c + 5"),
  comp("line7", "7", "Smaller of line 6 or $25,000", 1, "min(line 6, 25,000)"),
  comp("line8", "8", "Amount from line 3", 1, "line 3"),
  comp("line9", "9", "$150,000 ($300,000 if married filing jointly)", 1, "threshold"),
  comp("line10", "10", "Line 8 minus line 9 (zero if not positive)", 1, "max(0, line 8 - line 9)"),
  comp("line11", "11", "Line 10 divided by $1,000, rounded down", 1, "floor(line 10 / 1,000)"),
  comp("line12", "12", "Line 11 times $100", 1, "line 11 x 100"),
  comp("line13", "13", "Qualified tips deduction", 1, "max(0, line 7 - line 12)", { alwaysShow: true }),
  amt("line14a", "14a", "Qualified overtime compensation included in Form W-2 box 1", 1),
  amt("line14b", "14b", "Qualified overtime compensation not included on Form W-2", 1),
  comp("line14c", "14c", "Total qualified overtime compensation", 1, "14a + 14b"),
  comp("line15", "15", "Smaller of line 14c or $12,500 ($25,000 if married filing jointly)", 1, "min(14c, cap)"),
  comp("line16", "16", "Amount from line 3", 1, "line 3"),
  comp("line17", "17", "$150,000 ($300,000 if married filing jointly)", 1, "threshold"),
  comp("line18", "18", "Line 16 minus line 17 (zero if not positive)", 1, "max(0, line 16 - line 17)"),
  comp("line19", "19", "Line 18 divided by $1,000, rounded down", 1, "floor(line 18 / 1,000)"),
  comp("line20", "20", "Line 19 times $100", 1, "line 19 x 100"),
  comp("line21", "21", "Qualified overtime compensation deduction", 1, "max(0, line 15 - line 20)", { alwaysShow: true }),
  {
    id: "vehicles",
    line: "22",
    label: "Applicable passenger vehicles (up to 2): VIN, description, and qualified loan interest paid in 2025",
    type: "list",
    rows: 2,
    items: [
      { id: "vin", label: "Vehicle identification number", type: "text", maxLen: 17 },
      { id: "description", label: "Column (ii)", type: "text" },
      { id: "interest", label: "Qualified passenger vehicle loan interest paid (column (iii))", type: "money" },
    ],
    listLocate: {
      2025: {
        vin: ["Page2[0].Table_Line22[0].Line22a[0].VIN-1_Comb[0].f2_01[0]", "Page2[0].Table_Line22[0].Line22b[0].VIN-2_Comb[0].f2_04[0]"],
        description: ["Page2[0].Table_Line22[0].Line22a[0].f2_02[0]", "Page2[0].Table_Line22[0].Line22b[0].f2_05[0]"],
        interest: ["Page2[0].Table_Line22[0].Line22a[0].f2_03[0]", "Page2[0].Table_Line22[0].Line22b[0].f2_06[0]"],
      },
    },
    notes: "The vehicle must be new, for personal use, assembled in the U.S., and the loan originated after December 31, 2024.",
  },
  comp("line23", "23", "Add lines 22a and 22b, column (iii)", 2, "sum of interest"),
  comp("line24", "24", "Smaller of line 23 or $10,000", 2, "min(line 23, 10,000)"),
  comp("line25", "25", "Amount from line 3", 2, "line 3"),
  comp("line26", "26", "$100,000 ($200,000 if married filing jointly)", 2, "threshold"),
  comp("line27", "27", "Line 25 minus line 26 (zero if not positive)", 2, "max(0, line 25 - line 26)"),
  comp("line28", "28", "Line 27 divided by $1,000, rounded up", 2, "ceil(line 27 / 1,000)"),
  comp("line29", "29", "Line 28 times $200", 2, "line 28 x 200"),
  comp("line30", "30", "Qualified passenger vehicle loan interest deduction", 2, "max(0, line 24 - line 29)", { alwaysShow: true }),
  comp("line31", "31", "Amount from line 3", 2, "line 3"),
  comp("line32", "32", "$75,000 ($150,000 if married filing jointly)", 2, "threshold"),
  comp("line33", "33", "Line 31 minus line 32 (zero if not positive)", 2, "max(0, line 31 - line 32)"),
  comp("line34", "34", "Line 33 times 6%", 2, "line 33 x 0.06"),
  comp("line35", "35", "$6,000 minus line 34 (zero if not positive)", 2, "max(0, 6,000 - line 34)"),
  comp("line36a", "36a", "Your enhanced senior deduction (born before January 2, 1961, with a valid SSN)", 2, "line 35 if you qualify"),
  comp("line36b", "36b", "Spouse's enhanced senior deduction (married filing jointly)", 2, "line 35 if your spouse qualifies"),
  comp("line37", "37", "Enhanced deduction for seniors", 2, "line 36a + line 36b", { alwaysShow: true }),
  comp("line38", "38", "Total additional deductions; carried to Form 1040 line 13b", 2, "line 13 + 21 + 30 + 37", { alwaysShow: true }),
];

export const schedule1A: FormDef = {
  id: "f1040s1a",
  title: "Schedule 1-A (Form 1040), Additional Deductions",
  shortTitle: "Schedule 1-A",
  description: "New for 2025: the deductions for qualified tips (up to $25,000), qualified overtime (up to $12,500 or $25,000 joint), qualified passenger vehicle loan interest (up to $10,000), and the $6,000 enhanced deduction for seniors, each with its own income phaseout. Line 38 goes to Form 1040 line 13b.",
  years: [2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040s1a.pdf",
  notes: `**What this form is for.** Four 2025 deductions you can take whether or not you itemize. Tips and overtime phase out by $100 per $1,000 of modified AGI over $150,000 ($300,000 joint); car loan interest by $200 per $1,000 over $100,000 ($200,000 joint); the senior deduction by 6% of modified AGI over $75,000 ($150,000 joint).

**What the engine computes.** Every line except the inputs (lines 1, 2a-2d, 4a, 4b, 5, 14a, 14b, and the vehicle rows). When preparing a full return, line 1 comes from Form 1040 and the senior lines use the age-65 boxes.

**Things to verify before filing.**
- Qualified tips must be in an occupation that customarily received tips (the instructions list them) and reported to the employer or on Form 4137.
- Qualified overtime is only the premium portion (the half in time-and-a-half) required by the Fair Labor Standards Act and shown by your employer.
- The vehicle must be new, assembled in the United States, for personal use, with the loan taken after December 31, 2024.
- Married taxpayers must file jointly to take the senior deduction.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status");
    const mfj = status === "mfj";
    const l1 = c.n("line1");
    const l2e = c.set("line2e", c.sum(["line2a", "line2b", "line2c", "line2d"]), "Excluded income added back", c.show([["2a", c.n("line2a")], ["2b", c.n("line2b")], ["2c", c.n("line2c")], ["2d", c.n("line2d")]]), "2e");
    const magi = c.set("line3", l1 + l2e, "Modified adjusted gross income", `line 1 ${f(l1)} + line 2e ${f(l2e)}`, "3");
    const phase = (over: number, per: number, round: "down" | "up") => (over <= 0 ? 0 : (round === "down" ? Math.floor(over / 1000) : Math.ceil(over / 1000)) * per);

    // Part II: tips
    const l4c = c.set("line4c", c.n("line4a") + c.n("line4b"), "Total qualified employee tips", `4a ${f(c.n("line4a"))} + 4b ${f(c.n("line4b"))}`, "4c");
    const l6 = c.set("line6", l4c + c.n("line5"), "Add lines 4c and 5", `4c ${f(l4c)} + 5 ${f(c.n("line5"))}`, "6");
    const l7 = c.set("line7", Math.min(l6, 25000), "Tips cap", `min(${f(l6)}, 25,000)`, "7");
    c.set("line8", magi, "Amount from line 3", `line 3 ${f(magi)}`, "8");
    const l9 = c.set("line9", mfj ? 300000 : 150000, "Threshold", mfj ? "married filing jointly" : "other", "9");
    const l10 = c.set("line10", Math.max(0, magi - l9), "Excess over threshold", `max(0, ${f(magi)} - ${f(l9)})`, "10");
    const l11 = c.set("line11", Math.floor(l10 / 1000), "Thousands over, rounded down", `floor(${f(l10)} / 1,000)`, "11");
    const l12 = c.set("line12", l11 * 100, "Phaseout", `${f(l11)} x 100`, "12");
    c.set("line13", Math.max(0, l7 - l12), "Qualified tips deduction", `max(0, ${f(l7)} - ${f(l12)})`, "13");

    // Part III: overtime
    const l14c = c.set("line14c", c.n("line14a") + c.n("line14b"), "Total qualified overtime compensation", `14a ${f(c.n("line14a"))} + 14b ${f(c.n("line14b"))}`, "14c");
    const l15 = c.set("line15", Math.min(l14c, mfj ? 25000 : 12500), "Overtime cap", `min(${f(l14c)}, ${mfj ? "25,000" : "12,500"})`, "15");
    c.set("line16", magi, "Amount from line 3", `line 3 ${f(magi)}`, "16");
    const l17 = c.set("line17", mfj ? 300000 : 150000, "Threshold", mfj ? "married filing jointly" : "other", "17");
    const l18 = c.set("line18", Math.max(0, magi - l17), "Excess over threshold", `max(0, ${f(magi)} - ${f(l17)})`, "18");
    const l19 = c.set("line19", Math.floor(l18 / 1000), "Thousands over, rounded down", `floor(${f(l18)} / 1,000)`, "19");
    const l20 = c.set("line20", l19 * 100, "Phaseout", `${f(l19)} x 100`, "20");
    c.set("line21", Math.max(0, l15 - l20), "Qualified overtime compensation deduction", `max(0, ${f(l15)} - ${f(l20)})`, "21");

    // Part IV: car loan interest
    const rows = c.list("vehicles");
    const interest = rows.reduce((a, r) => a + (Number(r["interest"] ?? 0) || 0), 0);
    if (rows.length > 2) c.warn("More than two vehicles: see the instructions for attaching a statement.");
    const l23 = c.set("line23", interest, "Total qualified vehicle loan interest", rows.length ? rows.map((r) => `${String(r["description"] ?? r["vin"] ?? "vehicle")} ${f(Number(r["interest"] ?? 0) || 0)}`).join(" + ") : "none", "23");
    const l24 = c.set("line24", Math.min(l23, 10000), "Interest cap", `min(${f(l23)}, 10,000)`, "24");
    c.set("line25", magi, "Amount from line 3", `line 3 ${f(magi)}`, "25");
    const l26 = c.set("line26", mfj ? 200000 : 100000, "Threshold", mfj ? "married filing jointly" : "other", "26");
    const l27 = c.set("line27", Math.max(0, magi - l26), "Excess over threshold", `max(0, ${f(magi)} - ${f(l26)})`, "27");
    const l28 = c.set("line28", l27 > 0 ? Math.ceil(l27 / 1000) : 0, "Thousands over, rounded up", `ceil(${f(l27)} / 1,000)`, "28");
    const l29 = c.set("line29", l28 * 200, "Phaseout", `${f(l28)} x 200`, "29");
    c.set("line30", Math.max(0, l24 - l29), "Qualified passenger vehicle loan interest deduction", `max(0, ${f(l24)} - ${f(l29)})`, "30");
    void phase;

    // Part V: seniors
    c.set("line31", magi, "Amount from line 3", `line 3 ${f(magi)}`, "31");
    const l32 = c.set("line32", mfj ? 150000 : 75000, "Threshold", mfj ? "married filing jointly" : "other", "32");
    const l33 = c.set("line33", Math.max(0, magi - l32), "Excess over threshold", `max(0, ${f(magi)} - ${f(l32)})`, "33");
    const l34 = c.set("line34", l33 * 0.06, "Line 33 times 6%", `${f(l33)} x 6%`, "34");
    const l35 = c.set("line35", Math.max(0, 6000 - l34), "Per-person senior deduction", `max(0, 6,000 - ${f(l34)})`, "35");
    const you = c.bool("you_65_or_older");
    const spouse = mfj && c.bool("spouse_65_or_older");
    if (status === "mfs" && (you || c.bool("spouse_65_or_older"))) c.warn("Married filing separately: the enhanced senior deduction is not allowed; file jointly to claim it.");
    const l36a = c.set("line36a", you && status !== "mfs" ? l35 : 0, "Your senior deduction", you ? `line 35 ${f(l35)}` : "not 65 or older", "36a");
    const l36b = c.set("line36b", spouse ? l35 : 0, "Spouse's senior deduction", spouse ? `line 35 ${f(l35)}` : "not applicable", "36b");
    const l37 = c.set("line37", l36a + l36b, "Enhanced deduction for seniors", `36a ${f(l36a)} + 36b ${f(l36b)}`, "37");
    c.set("line38", c.n("line13") + c.n("line21") + c.n("line30") + l37, "Total additional deductions", `13 ${f(c.n("line13"))} + 21 ${f(c.n("line21"))} + 30 ${f(c.n("line30"))} + 37 ${f(l37)}`, "38");
    return c.result();
  },
};
