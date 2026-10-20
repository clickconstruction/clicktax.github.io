import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

/** Excess business loss threshold: the amount of net business loss allowed before the rest becomes an NOL carryforward. */
const THRESHOLD: Record<TaxYear, { single: number; mfj: number }> = { 2024: { single: 305000, mfj: 610000 }, 2025: { single: 313000, mfj: 626000 } };

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "filing_status", label: "Filing status (married filing jointly doubles the threshold)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  money("line2", "2", "Schedule 1 line 3 (business income or loss, Schedule C)", 4),
  money("line3", "3", "Form 1040 line 7 (capital gain or loss) attributable to a trade or business", 5),
  money("line4", "4", "Schedule 1 line 4 (other gains or losses, Form 4797)", 6),
  money("line5", "5", "Schedule 1 line 5 (rental real estate, royalties, partnerships, S corporations, trusts)", 7),
  money("line6", "6", "Schedule 1 line 6 (farm income or loss, Schedule F)", 8),
  money("line8", "8", "Other income, gain, or losses from a trade or business not reported on lines 1 through 7", 10),
  comp("line9", "9", "Combine lines 1 through 8", 11, "2 + 3 + 4 + 5 + 6 + 8", { alwaysShow: true }),
  money("line10", "10", "Income or gain included on lines 1 through 8 that is not attributable to a trade or business (for example personal capital gains or non-business rental income)", 12),
  money("line11", "11", "Losses or deductions included on lines 1 through 8 that are not attributable to a trade or business", 13),
  comp("line12", "12", "Subtract line 11 from line 10", 14, "10 - 11"),
  comp("line13", "13", "Line 12 with the sign reversed", 15, "-(line 12)"),
  comp("line14", "14", "Add lines 9 and 13: net trade or business income or (loss)", 16, "9 + 13"),
  comp("line15", "15", "Threshold: $313,000 ($626,000 married filing jointly) for 2025; $305,000 ($610,000) for 2024", 17, "threshold for the year and filing status"),
  comp("line16", "16", "Add lines 14 and 15. If less than zero, the excess business loss (as a positive number) goes to Schedule 1 line 8p", 18, "14 + 15", { alwaysShow: true }),
  { id: "excess_business_loss", label: "Excess business loss disallowed this year (treated as a net operating loss carryforward)", type: "money", computed: true, noPdf: true },
];

export const form461: FormDef = {
  id: "f461",
  title: "Form 461, Limitation on Business Losses",
  shortTitle: "Form 461",
  description: "Limits the net loss from all trades or businesses a noncorporate taxpayer can deduct in a year to $313,000 ($626,000 joint) for 2025; the excess is added back as income on Schedule 1 line 8p and carried forward as a net operating loss.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i461.pdf",
  notes: `**Who files.** Individuals, estates, and trusts whose aggregate trade or business deductions exceed their business income by more than the threshold. Form 461 is figured after the passive activity and at-risk limits.

**What the engine computes.** Line 9 (all income and loss items), line 12 and its reversal on line 13 (removing non-business items), line 14 (net business result), line 15 (the threshold), and line 16. A negative line 16 is the excess business loss; in a full return it is placed on Schedule 1 line 8p as a positive amount.

**What to verify.** Wages are not trade or business income for this limit. Capital gains on line 3 count only to the extent attributable to a trade or business, and capital losses only up to the gains. Lines 10 and 11 remove everything non-business (personal investment income, non-business capital gains, hobby income). The disallowed amount becomes an NOL carryforward (Schedule 1 line 8a next year).`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status");
    const l9 = c.set("line9", c.sum(["line2", "line3", "line4", "line5", "line6", "line8"]), "All income and loss items", "2 + 3 + 4 + 5 + 6 + 8", "9");
    const l12 = c.set("line12", c.n("line10") - c.n("line11"), "Net non-business items", `${f(c.n("line10"))} - ${f(c.n("line11"))}`, "12");
    const l13 = c.set("line13", -l12, "Non-business items removed", `-(${f(l12)})`, "13");
    const l14 = c.set("line14", l9 + l13, "Net trade or business income or (loss)", `${f(l9)} + ${f(l13)}`, "14");
    const l15 = c.set("line15", status === "mfj" ? THRESHOLD[ctx.year].mfj : THRESHOLD[ctx.year].single, "Threshold", `${ctx.year} ${status === "mfj" ? "joint" : "single/other"}`, "15");
    const l16 = c.set("line16", l14 + l15, "Line 14 plus the threshold", `${f(l14)} + ${f(l15)}`, "16");
    const excess = c.set("excess_business_loss", l16 < 0 ? -l16 : 0, "Excess business loss (Schedule 1 line 8p)", l16 < 0 ? `-(${f(l16)})` : "none");
    if (excess > 0) c.warn(`An excess business loss of ${f(excess)} is disallowed this year: enter it as a positive amount on Schedule 1 line 8p (done automatically in a full return) and carry it forward as a net operating loss.`);
    if (!c.has("filing_status")) c.warn("filing_status was not supplied; the single threshold is used.");
    return c.result();
  },
};
