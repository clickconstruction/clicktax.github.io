import { Calc, f } from "../engine/helpers.ts";
import { params } from "../params.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

/** 2024 root is topmostSubform[0]; 2025 root is form1[0]; the generator prepends the root. */
const nm = (y24: number, y25: number): { names: Partial<Record<TaxYear, string>> } => ({ names: { 2024: `Page1[0].f1_${y24}[0]`, 2025: `Page1[0].f1_${y25}[0]` } });
const amt = (id: string, line: string, label: string, y24: number, y25: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: nm(y24, y25), ...extra });
const comp = (id: string, line: string, label: string, y24: number, y25: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => amt(id, line, label, y24, y25, { computed: true, notes, ...extra });

/** State and local tax deduction cap: TCJA $10,000 for 2024; OBBBA $40,000 for 2025 phased down 30% of MAGI over $500,000 to a $10,000 floor (half for MFS). */
const SALT: Record<TaxYear, { cap: number; capMfs: number; phaseStart?: number; phaseStartMfs?: number; floor?: number; floorMfs?: number }> = {
  2024: { cap: 10000, capMfs: 5000 },
  2025: { cap: 40000, capMfs: 20000, phaseStart: 500000, phaseStartMfs: 250000, floor: 10000, floorMfs: 5000 },
};

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on Form 1040", type: "text", locate: { name: "Page1[0].f1_1[0]" } },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: { name: "Page1[0].f1_2[0]" } },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss) for the state and local tax cap", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  amt("line1", "1", "Medical and dental expenses (unreimbursed)", 3, 3),
  amt("line2", "2", "Amount from Form 1040 line 11 (adjusted gross income)", 4, 4, { locate: { names: { 2024: "Page1[0].f1_4[0]", 2025: "Page1[0].Line2_ReadOrder[0].f1_4[0]" } } }),
  comp("line3", "3", "Multiply line 2 by 7.5%", 5, 5, "line 2 x 0.075"),
  comp("line4", "4", "Deductible medical expenses", 6, 6, "line 1 - line 3, not less than zero"),
  { id: "line5a_general_sales_tax", line: "5a", label: "Check if you elect to deduct general sales taxes instead of income taxes", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  amt("line5a", "5a", "State and local income taxes or general sales taxes", 7, 7),
  amt("line5b", "5b", "State and local real estate taxes", 8, 8),
  amt("line5c", "5c", "State and local personal property taxes", 9, 9),
  comp("line5d", "5d", "Add lines 5a through 5c", 10, 10, "5a + 5b + 5c"),
  comp("line5e", "5e", "State and local taxes allowed (capped)", 11, 11, "smaller of line 5d or the cap: $10,000 ($5,000 MFS) for 2024; $40,000 ($20,000 MFS) for 2025 reduced by 30% of MAGI over $500,000 ($250,000 MFS), not below $10,000 ($5,000 MFS)"),
  { id: "line6_description", line: "6", label: "Other taxes: type", type: "text", locate: nm(12, 12) },
  { id: "line6_description_2", line: "6", label: "Other taxes: type (second line, 2024 form only)", type: "text", years: [2024], locate: { names: { 2024: "Page1[0].f1_13[0]" } } },
  amt("line6", "6", "Other taxes amount", 14, 13),
  comp("line7", "7", "Add lines 5e and 6", 15, 14, "5e + 6"),
  { id: "line8_not_all_qualified", line: "8", label: "Check if you didn't use all of your home mortgage loan(s) to buy, build, or improve your home", type: "checkbox", locate: { name: "Page1[0].Line8_ReadOrder[0].c1_2[0]" } },
  amt("line8a", "8a", "Home mortgage interest and points reported on Form 1098", 16, 15),
  { id: "line8b_payee", line: "8b", label: "Name, identifying number, and address of the person you paid mortgage interest not reported on Form 1098", type: "text", locate: { names: { 2024: "Page1[0].f1_17[0]", 2025: "Page1[0].Line8b_ReadOrder[0].f1_16[0]" } } },
  { id: "line8b_payee_2", line: "8b", label: "Payee details (second line, 2024 form only)", type: "text", years: [2024], locate: { names: { 2024: "Page1[0].f1_18[0]" } } },
  amt("line8b", "8b", "Home mortgage interest not reported on Form 1098", 19, 17),
  amt("line8c", "8c", "Points not reported on Form 1098", 20, 18),
  comp("line8e", "8e", "Add lines 8a through 8c", 22, 20, "8a + 8b + 8c"),
  amt("line9", "9", "Investment interest (Form 4952)", 23, 21),
  comp("line10", "10", "Add lines 8e and 9", 24, 22, "8e + 9"),
  amt("line11", "11", "Gifts by cash or check", 25, 23),
  amt("line12", "12", "Gifts other than by cash or check (Form 8283 if over $500)", 26, 24),
  amt("line13", "13", "Carryover from prior year", 27, 25),
  comp("line14", "14", "Add lines 11 through 13", 28, 26, "11 + 12 + 13"),
  amt("line15", "15", "Casualty and theft loss(es) from a federally declared disaster (Form 4684)", 29, 27),
  { id: "line16_description", line: "16", label: "Other itemized deductions: type", type: "text", locate: nm(30, 28) },
  { id: "line16_description_2", line: "16", label: "Other itemized deductions: type (second line, 2024 form only)", type: "text", years: [2024], locate: { names: { 2024: "Page1[0].f1_31[0]" } } },
  { id: "line16_description_3", line: "16", label: "Other itemized deductions: type (third line, 2024 form only)", type: "text", years: [2024], locate: { names: { 2024: "Page1[0].f1_32[0]" } } },
  amt("line16", "16", "Other itemized deductions amount", 33, 29),
  comp("line17", "17", "Total itemized deductions; carried to Form 1040 line 12", 34, 30, "4 + 7 + 10 + 14 + 15 + 16", { alwaysShow: true }),
  { id: "line18", line: "18", label: "Check if you elect to itemize even though your itemized deductions are less than your standard deduction", type: "checkbox", locate: { name: "Page1[0].Line18_ReadOrder[0].c1_3[0]" } },
];

export const scheduleA: FormDef = {
  id: "f1040sa",
  title: "Schedule A (Form 1040), Itemized Deductions",
  shortTitle: "Schedule A",
  description: "Medical expenses over the 7.5% floor, state and local taxes under the year's cap, mortgage and investment interest, charitable gifts, casualty losses, and other deductions, totaled for Form 1040 line 12 when they beat the standard deduction.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040sca.pdf",
  notes: `**When to use it.** Itemize when line 17 exceeds your standard deduction, when you are married filing separately and your spouse itemizes, or when you elect to (line 18). Preparing a full return compares the two automatically and attaches Schedule A only when it helps or is required.

**What the engine computes.** Lines 3, 4, 5d, 5e, 7, 8e, 10, 14, and 17. The state and local tax cap is $10,000 ($5,000 married filing separately) for 2024. For 2025 it is $40,000 ($20,000 married filing separately), reduced by 30% of modified AGI above $500,000 ($250,000) but never below $10,000 ($5,000); line 2 (AGI) is used as the modified AGI.

**What to verify.** The mortgage interest limits (acquisition debt over $750,000; see Pub. 936) and the charitable contribution AGI limits (60%/30%/20%) are not applied; Form 8283 is required for non-cash gifts over $500; medical expenses must be unreimbursed and for the year paid.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") || "single";
    const l2 = c.n("line2");
    if (!c.has("line2")) c.warn("line2 (AGI from Form 1040 line 11) was not supplied; medical expenses and the 2025 state tax cap depend on it.");
    const l3 = c.set("line3", Math.round(l2 * 0.075), "7.5% of AGI", `${f(l2)} x 0.075`, "3");
    const l4 = c.set("line4", Math.max(0, c.n("line1") - l3), "Deductible medical", `max(0, ${f(c.n("line1"))} - ${f(l3)})`, "4");
    const l5d = c.set("line5d", c.sum(["line5a", "line5b", "line5c"]), "State and local taxes", "5a + 5b + 5c", "5d");
    const salt = SALT[ctx.year];
    const mfs = status === "mfs";
    let cap = mfs ? salt.capMfs : salt.cap;
    let how = `cap ${f(cap)}`;
    if (salt.phaseStart !== undefined) {
      const start = mfs ? salt.phaseStartMfs! : salt.phaseStart;
      const floor = mfs ? salt.floorMfs! : salt.floor!;
      const excess = Math.max(0, l2 - start);
      if (excess > 0) {
        cap = Math.max(floor, Math.round(cap - 0.3 * excess));
        how = `cap ${f(mfs ? salt.capMfs : salt.cap)} - 30% x (${f(l2)} - ${f(start)}) = ${f(cap)}, floor ${f(floor)}`;
      }
    }
    const l5e = c.set("line5e", Math.min(l5d, cap), "State and local taxes allowed", `min(${f(l5d)}, ${how})`, "5e");
    if (l5d > cap) c.warn(`State and local taxes of ${f(l5d)} are limited to ${f(cap)} on line 5e.`);
    const l7 = c.set("line7", l5e + c.n("line6"), "Taxes you paid", `${f(l5e)} + ${f(c.n("line6"))}`, "7");
    const l8e = c.set("line8e", c.sum(["line8a", "line8b", "line8c"]), "Home mortgage interest", "8a + 8b + 8c", "8e");
    const l10 = c.set("line10", l8e + c.n("line9"), "Interest you paid", `${f(l8e)} + ${f(c.n("line9"))}`, "10");
    const l14 = c.set("line14", c.sum(["line11", "line12", "line13"]), "Gifts to charity", "11 + 12 + 13", "14");
    if (c.n("line12") > 500) c.warn("Non-cash gifts over $500: attach Form 8283.");
    if (c.n("line11") + c.n("line12") > 0.6 * l2 && l2 > 0) c.warn("Charitable gifts exceed 60% of AGI: the AGI limits (Pub. 526) may reduce the deduction and create a carryover.");
    if (c.n("line8b") > 0 && !c.str("line8b_payee")) c.warn("Line 8b interest requires the payee's name, identifying number, and address (line8b_payee).");
    c.set("line17", l4 + l7 + l10 + l14 + c.n("line15") + c.n("line16"), "Total itemized deductions", `${f(l4)} + ${f(l7)} + ${f(l10)} + ${f(l14)} + ${f(c.n("line15"))} + ${f(c.n("line16"))}`, "17");
    void params;
    return c.result();
  },
};
