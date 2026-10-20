import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

/** Widget names are identical on the 2024 and 2025 forms. */
const P = (page: 1 | 2 | 3, n: number) => `Page${page}[0].f${page}_${n}[0]`;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });

/** Parts III-VII share one shape: prior excess, room, distributions, prior excess withdrawn, totals, this year's excess, and 6% of the smaller of the excess or the account value. */
interface ExcessPart { part: string; label: string; lines: [number, number, number, number, number, number, number, number, number]; page: 1 | 2; widgets: number[]; }
const EXCESS: ExcessPart[] = [
  { part: "III", label: "traditional IRA", lines: [9, 10, 11, 12, 13, 14, 15, 16, 17], page: 1, widgets: [18, 19, 20, 21, 22, 23, 24, 25, 26] },
  { part: "IV", label: "Roth IRA", lines: [18, 19, 20, -1, 21, 22, 23, 24, 25], page: 1, widgets: [27, 28, 29, -1, 30, 31, 32, 33, 34] },
  { part: "V", label: "Coverdell ESA", lines: [26, 27, 28, -1, 29, 30, 31, 32, 33], page: 2, widgets: [1, 2, 3, -1, 4, 5, 6, 7, 8] },
  { part: "VI", label: "Archer MSA", lines: [34, 35, 36, -1, 37, 38, 39, 40, 41], page: 2, widgets: [9, 10, 11, -1, 12, 13, 14, 15, 16] },
  { part: "VII", label: "HSA", lines: [42, 43, 44, -1, 45, 46, 47, 48, 49], page: 2, widgets: [17, 18, 19, -1, 20, 21, 22, 23, 24] },
];
const excessFields = (e: ExcessPart): FieldDef[] => {
  const L = (i: number) => `line${e.lines[i]}`;
  const W = (i: number) => P(e.page, e.widgets[i]!);
  const out: FieldDef[] = [
    money(L(0), String(e.lines[0]), `Part ${e.part} (${e.label}): excess contributions from last year's form (prior year's line ${e.lines[8]} base)`, W(0)),
    money(L(1), String(e.lines[1]), `Part ${e.part}: if this year's contributions are less than the maximum allowable, the difference; otherwise 0`, W(1)),
    money(L(2), String(e.lines[2]), `Part ${e.part}: this year's distributions from the account(s) included in income (or, for Roth/ESA/MSA/HSA, total distributions)`, W(2)),
  ];
  if (e.lines[3] > 0) out.push(money(L(3), String(e.lines[3]), `Part ${e.part}: this year's distributions of prior year excess contributions`, W(3)));
  out.push(
    comp(L(4), String(e.lines[4]), `Part ${e.part}: add the amounts above`, W(4), "sum"),
    comp(L(5), String(e.lines[5]), `Part ${e.part}: prior year excess remaining (not less than zero)`, W(5), "prior excess - line above"),
    money(L(6), String(e.lines[6]), `Part ${e.part}: excess contributions for this year`, W(6)),
    comp(L(7), String(e.lines[7]), `Part ${e.part}: total excess contributions`, W(7), "sum"),
    { id: `${L(8)}_value`, line: String(e.lines[8]), label: `Part ${e.part}: value of your ${e.label}(s) on December 31 (including contributions made after year end for this year)`, type: "money" },
    comp(L(8), String(e.lines[8]), `Part ${e.part}: additional tax, 6% of the smaller of the total excess or the account value`, W(8), "6% x min(excess, value)", { alwaysShow: true }),
  );
  return out;
};

const fields: FieldDef[] = [
  { id: "name", label: "Name of individual subject to additional tax (one form per person)", type: "text", locate: { name: P(1, 1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: { name: P(1, 2) } },
  { id: "address", label: "Home address (only if filing this form by itself)", type: "text", locate: { name: P(1, 3) } },
  { id: "apt", label: "Apt. no.", type: "text", locate: { name: P(1, 4) } },
  { id: "city_state_zip", label: "City, town or post office, state, and ZIP code", type: "text", locate: { name: P(1, 5) } },
  { id: "amended", label: "Check if this is an amended return", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "foreign_country", label: "Foreign country name", type: "text", locate: { name: P(1, 6) } },
  { id: "foreign_province", label: "Foreign province/state/county", type: "text", locate: { name: P(1, 7) } },
  { id: "foreign_postal_code", label: "Foreign postal code", type: "text", locate: { name: P(1, 8) } },
  money("line1", "1", "Early distributions includible in income (before age 59 1/2, from IRAs, qualified plans, annuities, modified endowment contracts)", P(1, 9)),
  { id: "line2_exception", line: "2", label: "Exception number from the instructions (01 separation after 55, 02 SEPP, 03 disability, 05 medical, 07 IRA for unemployed health insurance, 08 higher education, 09 first home, 12 other...)", type: "text", maxLen: 2, locate: { name: P(1, 10) } },
  money("line2", "2", "Early distributions included on line 1 that are not subject to the additional tax", P(1, 11)),
  comp("line3", "3", "Amount subject to additional tax", P(1, 12), "1 - 2"),
  { id: "simple_ira_first_two_years", label: "Line 1 includes SIMPLE IRA distributions within the first 2 years of participation (25% instead of 10%)", type: "checkbox" },
  comp("line4", "4", "Additional tax on early distributions (10%; 25% for SIMPLE IRAs in the first 2 years)", P(1, 13), "10% x 3", { alwaysShow: true }),
  money("line5", "5", "Distributions included in income from Coverdell ESAs, QTPs, and ABLE accounts", P(1, 14)),
  money("line6", "6", "Distributions on line 5 not subject to the additional tax", P(1, 15)),
  comp("line7", "7", "Amount subject to additional tax", P(1, 16), "5 - 6"),
  comp("line8", "8", "Additional tax on education and ABLE distributions (10%)", P(1, 17), "10% x 7", { alwaysShow: true }),
  ...EXCESS.flatMap(excessFields),
  money("line50", "50", "Excess contributions to an ABLE account for this year", P(2, 25)),
  { id: "line51_value", line: "51", label: "Value of the ABLE account on December 31", type: "money" },
  comp("line51", "51", "Additional tax on ABLE excess contributions (6% of the smaller of line 50 or the value)", P(2, 26), "6% x min(50, value)", { alwaysShow: true }),
  money("line52a", "52a", "Minimum required distribution for the year from qualified plans and IRAs, for the portion not corrected within the correction window", P(3, 1)),
  money("line52b", "52b", "Minimum required distribution for the portion corrected within the correction window", P(3, 2)),
  money("line53a", "53a", "Amount actually distributed (uncorrected portion)", P(3, 3)),
  money("line53b", "53b", "Amount actually distributed (corrected portion)", P(3, 4)),
  comp("line54a", "54a", "Shortfall not corrected (52a - 53a)", P(3, 5), "52a - 53a"),
  comp("line54b", "54b", "Shortfall corrected (52b - 53b)", P(3, 6), "52b - 53b"),
  comp("line55", "55", "Additional tax on excess accumulation (25% of line 54a plus 10% of line 54b); carried to Schedule 2 line 8", P(3, 7), "25% x 54a + 10% x 54b", { alwaysShow: true }),
  { id: "total_additional_tax", label: "Total of lines 4, 8, 17, 25, 33, 41, 49, 51, and 55 (to Schedule 2 line 8)", type: "money", computed: true, alwaysShow: true },
];

export const form5329: FormDef = {
  id: "f5329",
  title: "Form 5329, Additional Taxes on Qualified Plans (Including IRAs) and Other Tax-Favored Accounts",
  shortTitle: "Form 5329",
  description: "The 10% tax on early retirement distributions (with exception codes), the 10% tax on education and ABLE distributions, the 6% excise tax on excess contributions to IRAs, Roth IRAs, Coverdell ESAs, Archer MSAs, HSAs, and ABLE accounts, and the 25%/10% tax on missed required minimum distributions. One form per person; the total goes to Schedule 2 line 8.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i5329.pdf",
  notes: `**When it is required.** A Form 1099-R with distribution code 1 and an exception that applies (or a code other than 1 that should have been 1), excess contributions to any tax-favored account, education or ABLE distributions beyond qualified expenses, or a missed required minimum distribution. If the only additional tax is the 10% early distribution tax with no exception, Schedule 2 line 8 can be filled without this form.

**What the engine computes.** Lines 3, 4 (10%, or 25% for SIMPLE IRAs in the first two years), 7, 8, each excess-contribution part's totals and 6% tax against the year-end value you supply, line 51, and lines 54a, 54b, and 55 (25% of the uncorrected shortfall, 10% of the corrected one). In a full return the total lands on Schedule 2 line 8.

**What to verify.** The exception number on line 2 must match the instructions' list; excess contributions carry forward until withdrawn and each year's form picks up last year's remaining excess; for a missed RMD, request a waiver under the instructions by attaching an explanation.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l3 = c.set("line3", Math.max(0, c.n("line1") - c.n("line2")), "Early distributions subject to tax", `${f(c.n("line1"))} - ${f(c.n("line2"))}`, "3");
    if (c.n("line2") > 0 && !c.str("line2_exception")) c.warn("Line 2 has an amount: enter the exception number (line2_exception) from the instructions.");
    const rate4 = c.bool("simple_ira_first_two_years") ? 0.25 : 0.1;
    const l4 = c.set("line4", Math.round(l3 * rate4), "Tax on early distributions", `${f(l3)} x ${rate4}`, "4");
    const l7 = c.set("line7", Math.max(0, c.n("line5") - c.n("line6")), "Education/ABLE distributions subject to tax", `${f(c.n("line5"))} - ${f(c.n("line6"))}`, "7");
    const l8 = c.set("line8", Math.round(l7 * 0.1), "Tax on education and ABLE distributions", `${f(l7)} x 0.10`, "8");
    let total = l4 + l8;
    for (const e of EXCESS) {
      const L = (i: number) => `line${e.lines[i]}`;
      const sum = c.n(L(1)) + c.n(L(2)) + (e.lines[3] > 0 ? c.n(L(3)) : 0);
      const l4x = c.set(L(4), sum, `Part ${e.part} offsets`, "sum", String(e.lines[4]));
      const l5x = c.set(L(5), Math.max(0, c.n(L(0)) - l4x), `Part ${e.part} prior excess remaining`, `max(0, ${f(c.n(L(0)))} - ${f(l4x)})`, String(e.lines[5]));
      const l7x = c.set(L(7), l5x + c.n(L(6)), `Part ${e.part} total excess`, `${f(l5x)} + ${f(c.n(L(6)))}`, String(e.lines[7]));
      const value = c.has(`${L(8)}_value`) ? c.n(`${L(8)}_value`) : l7x;
      if (l7x > 0 && !c.has(`${L(8)}_value`)) c.warn(`Part ${e.part}: supply ${L(8)}_value (the December 31 value of your ${e.label}s); the 6% tax is figured on the whole excess.`);
      const tax = c.set(L(8), l7x > 0 ? Math.round(Math.min(l7x, value) * 0.06) : 0, `Part ${e.part} excise tax`, `6% x min(${f(l7x)}, ${f(value)})`, String(e.lines[8]));
      total += tax;
    }
    const v51 = c.has("line51_value") ? c.n("line51_value") : c.n("line50");
    total += c.set("line51", Math.round(Math.min(c.n("line50"), v51) * 0.06), "ABLE excise tax", `6% x min(${f(c.n("line50"))}, ${f(v51)})`, "51");
    const l54a = c.set("line54a", Math.max(0, c.n("line52a") - c.n("line53a")), "RMD shortfall, uncorrected", `${f(c.n("line52a"))} - ${f(c.n("line53a"))}`, "54a");
    const l54b = c.set("line54b", Math.max(0, c.n("line52b") - c.n("line53b")), "RMD shortfall, corrected", `${f(c.n("line52b"))} - ${f(c.n("line53b"))}`, "54b");
    total += c.set("line55", Math.round(l54a * 0.25 + l54b * 0.1), "Tax on excess accumulation", `25% x ${f(l54a)} + 10% x ${f(l54b)}`, "55");
    c.set("total_additional_tax", total, "Total additional tax to Schedule 2 line 8", "4 + 8 + 17 + 25 + 33 + 41 + 49 + 51 + 55", "Sch 2 line 8");
    return c.result();
  },
};
