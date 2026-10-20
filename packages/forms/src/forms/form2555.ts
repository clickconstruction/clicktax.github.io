import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const P2 = (n: number) => `Page2[0].f2_${n}[0]`;
const P3 = (n: number) => `Page3[0].f3_${n}[0]`;
const yn1 = (n: number) => ({ yes: { name: `Page1[0].c1_${n}[0]` }, no: { name: `Page1[0].c1_${n}[1]` } });
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });

/** Annual limits: maximum exclusion, days in the year, the base housing amount (16% of the exclusion) and its daily rate, and the standard housing limit (30%). */
const LIMITS: Record<TaxYear, { max: number; days: number; housingBase: number; housingDaily: number; housingLimit: number }> = {
  2024: { max: 126500, days: 366, housingBase: 20240, housingDaily: 55.3, housingLimit: 37950 },
  2025: { max: 130000, days: 365, housingBase: 20800, housingDaily: 56.99, housingLimit: 39000 },
};

const fields: FieldDef[] = [
  { id: "name", label: "Name shown on Form 1040", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: P1(2) } },
  { id: "foreign_address", line: "1", label: "Your foreign address (including country)", type: "text", locate: { name: P1(3) } },
  { id: "occupation", line: "2", label: "Your occupation", type: "text", locate: { name: P1(4) } },
  { id: "employer_name", line: "3", label: "Employer's name", type: "text", locate: { name: P1(5) } },
  { id: "employer_us_address", line: "4a", label: "Employer's U.S. address", type: "text", locate: { name: P1(6) } },
  { id: "employer_foreign_address", line: "4b", label: "Employer's foreign address", type: "text", locate: { name: P1(7) } },
  { id: "employer_foreign_entity", line: "5a", label: "Employer is a foreign entity", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "employer_us_company", line: "5b", label: "Employer is a U.S. company", type: "checkbox", locate: { name: "Page1[0].c1_2[0]" } },
  { id: "employer_self", line: "5c", label: "Self-employed", type: "checkbox", locate: { name: "Page1[0].c1_3[0]" } },
  { id: "employer_foreign_affiliate", line: "5d", label: "Employer is a foreign affiliate of a U.S. company", type: "checkbox", locate: { name: "Page1[0].c1_4[0]" } },
  { id: "employer_other", line: "5e", label: "Other employer type", type: "checkbox", locate: { name: "Page1[0].c1_5[0]" } },
  { id: "employer_other_specify", line: "5e", label: "Other employer type: specify", type: "text", locate: { name: P1(8) } },
  { id: "line6a", line: "6a", label: "If you previously filed Form 2555 or 2555-EZ, the last year you filed it", type: "text", maxLen: 4, locate: { name: P1(9) } },
  { id: "line6b", line: "6b", label: "You did not previously file Form 2555 or 2555-EZ", type: "checkbox", locate: { name: "Page1[0].c1_6[0]" } },
  { id: "line6c", line: "6c", label: "Have you ever revoked either of the exclusions?", type: "yesno", locate: yn1(7) },
  { id: "line6d", line: "6d", label: "If yes, the type of exclusion revoked and the tax year the revocation was effective", type: "text", locate: { name: P1(10) } },
  { id: "line7", line: "7", label: "Of what country are you a citizen/national?", type: "text", locate: { name: P1(11) } },
  { id: "line8a", line: "8a", label: "Did you maintain a separate foreign residence for your family because of adverse living conditions at your tax home?", type: "yesno", locate: yn1(9) },
  { id: "line8b", line: "8b", label: "If yes, the city and country of the separate residence and the number of days you maintained it", type: "text", locate: { name: P1(12) } },
  { id: "line9", line: "9", label: "Your tax home(s) during the tax year and the date(s) established", type: "text", locate: { name: P1(13) } },
  { id: "line9_more", line: "9", label: "Tax homes, continued", type: "text", locate: { name: P1(14) } },
  { id: "line10_began", line: "10", label: "Part II (bona fide residence test): date bona fide residence began", type: "text", locate: { name: P1(15) } },
  { id: "line10_ended", line: "10", label: "Date bona fide residence ended (or \"continues\")", type: "text", locate: { name: P1(16) } },
  { id: "line11", line: "11", label: "Kind of living quarters in the foreign country: \"purchased\" house, \"rented\" house or apartment, rented \"room\", or quarters furnished by \"employer\"", type: "choice", choices: ["purchased", "rented", "room", "employer"], locate: { purchased: { name: "Page1[0].c1_11[0]" }, rented: { name: "Page1[0].c1_11[1]" }, room: { name: "Page1[0].c1_11[2]" }, employer: { name: "Page1[0].c1_11[3]" } } },
  { id: "line12a", line: "12a", label: "Did any of your family live with you abroad during any part of the tax year?", type: "yesno", locate: yn1(15) },
  { id: "line12b", line: "12b", label: "If yes, who and for what period?", type: "text", locate: { name: P1(17) } },
  { id: "line13a", line: "13a", label: "Have you submitted a statement to the authorities of the foreign country where you claim bona fide residence that you are not a resident of that country?", type: "yesno", locate: yn1(17) },
  { id: "line13b", line: "13b", label: "Are you required to pay income tax to the country where you claim bona fide residence?", type: "yesno", locate: yn1(19), notes: "Yes on 13a and no on 13b means you do not qualify as a bona fide resident." },
  {
    id: "us_visits",
    line: "14",
    label: "Trips to the United States or its territories during the tax year (up to 8 rows)",
    type: "list",
    rows: 8,
    items: [
      { id: "date_arrived", label: "(a) Date arrived in U.S.", type: "text" },
      { id: "date_left", label: "(b) Date left U.S.", type: "text" },
      { id: "business_days", label: "(c) Number of days in U.S. on business", type: "integer" },
      { id: "us_income", label: "(d) Income earned in U.S. on business (attach computation)", type: "money" },
    ],
    listLocate: both({
      date_arrived: [18, 22, 26, 30].map((n) => `Page1[0].Table1_Line14[0].BodyRow${(n - 18) / 4 + 1}[0].f1_${n}[0]`).concat([34, 38, 42, 46].map((n) => `Page1[0].Table2_Line14[0].BodyRow${(n - 34) / 4 + 5}[0].f1_${n}[0]`)),
      date_left: [19, 23, 27, 31].map((n) => `Page1[0].Table1_Line14[0].BodyRow${(n - 19) / 4 + 1}[0].f1_${n}[0]`).concat([35, 39, 43, 47].map((n) => `Page1[0].Table2_Line14[0].BodyRow${(n - 35) / 4 + 5}[0].f1_${n}[0]`)),
      business_days: [20, 24, 28, 32].map((n) => `Page1[0].Table1_Line14[0].BodyRow${(n - 20) / 4 + 1}[0].f1_${n}[0]`).concat([36, 40, 44, 48].map((n) => `Page1[0].Table2_Line14[0].BodyRow${(n - 36) / 4 + 5}[0].f1_${n}[0]`)),
      us_income: [21, 25, 29, 33].map((n) => `Page1[0].Table1_Line14[0].BodyRow${(n - 21) / 4 + 1}[0].f1_${n}[0]`).concat([37, 41, 45, 49].map((n) => `Page1[0].Table2_Line14[0].BodyRow${(n - 37) / 4 + 5}[0].f1_${n}[0]`)),
    }),
  },
  { id: "line15a", line: "15a", label: "Contractual terms or other conditions relating to the length of your employment abroad", type: "text", locate: { name: P1(50) } },
  { id: "line15a_more", line: "15a", label: "Contractual terms, continued", type: "text", locate: { name: P1(51) } },
  { id: "line15b", line: "15b", label: "Type of visa under which you entered the foreign country", type: "text", locate: { name: P1(52) } },
  { id: "line15c", line: "15c", label: "Did your visa limit the length of your stay or employment in a foreign country?", type: "yesno", locate: yn1(21) },
  { id: "line15d", line: "15d", label: "Did you maintain a home in the United States while living abroad?", type: "yesno", locate: yn1(23) },
  { id: "line15e", line: "15e", label: "If yes, the address of your U.S. home, whether it was rented, the names of the occupants, and their relationship to you", type: "text", locate: { name: P1(53) } },
  { id: "line15e_more", line: "15e", label: "U.S. home details, continued", type: "text", locate: { name: P1(54) } },
  { id: "line16_from", line: "16", label: "Part III (physical presence test): the 12-month period begins (date)", type: "text", locate: { name: P2(1) } },
  { id: "line16_through", line: "16", label: "The 12-month period ends (date)", type: "text", locate: { name: P2(2) } },
  { id: "line17", line: "17", label: "Principal country of employment during the tax year", type: "text", locate: { name: P2(3) } },
  {
    id: "travel",
    line: "18",
    label: "Travel abroad during the 12-month period (up to 4 rows): each country, dates, full days present, days in the U.S. on business, and U.S. business income",
    type: "list",
    rows: 4,
    items: [
      { id: "country", label: "(a) Name of country (including U.S.)", type: "text" },
      { id: "date_arrived", label: "(b) Date arrived", type: "text" },
      { id: "date_left", label: "(c) Date left", type: "text" },
      { id: "full_days", label: "(d) Full days present in country", type: "integer" },
      { id: "business_days", label: "(e) Number of days in U.S. on business", type: "integer" },
      { id: "us_income", label: "(f) Income earned in U.S. on business (attach computation)", type: "money" },
    ],
    listLocate: both(Object.fromEntries(["country", "date_arrived", "date_left", "full_days", "business_days", "us_income"].map((item, col) => [item, [0, 1, 2, 3].map((r) => `Page2[0].Table_Line18[0].BodyRow${r + 1}[0].f2_${4 + r * 6 + col}[0]`)]))),
  },
  money("line19", "19", "Part IV: total wages, salaries, bonuses, commissions, etc.", P2(28)),
  money("line20a", "20a", "Allowable share of income for personal services performed in a business (including farming) or profession", P2(29)),
  { id: "line20b_partnership", line: "20b", label: "Partnership name and address", type: "text", locate: { name: P2(30) } },
  { id: "line20b_partnership_more", line: "20b", label: "Partnership, continued", type: "text", locate: { name: P2(31) } },
  money("line20b", "20b", "Allowable share of income from a partnership", P2(32)),
  money("line21a", "21a", "Noncash income (fair market value): home (lodging)", P2(33)),
  money("line21b", "21b", "Noncash income: meals", P2(34)),
  money("line21c", "21c", "Noncash income: car", P2(35)),
  { id: "line21d_type", line: "21d", label: "Other noncash property or facilities: type", type: "text", locate: { name: P2(36) } },
  { id: "line21d_type_more", line: "21d", label: "Other noncash, continued", type: "text", locate: { name: P2(37) } },
  money("line21d", "21d", "Other noncash income: amount", P2(38)),
  money("line22a", "22a", "Allowances, reimbursements, or expenses paid on your behalf: cost of living and overseas differential", P2(39)),
  money("line22b", "22b", "Family", P2(40)),
  money("line22c", "22c", "Education", P2(41)),
  money("line22d", "22d", "Home leave", P2(42)),
  money("line22e", "22e", "Quarters", P2(43)),
  { id: "line22f_type", line: "22f", label: "Allowances for any other purpose: type", type: "text", locate: { name: P2(44) } },
  { id: "line22f_type_more", line: "22f", label: "Other allowances, continued", type: "text", locate: { name: P2(45) } },
  money("line22f", "22f", "Other allowances: amount", P2(46)),
  comp("line22g", "22g", "Add lines 22a through 22f", P2(47), "22a + 22b + 22c + 22d + 22e + 22f"),
  { id: "line23_type", line: "23", label: "Other foreign earned income: type", type: "text", locate: { name: P2(48) } },
  { id: "line23_type_more", line: "23", label: "Other foreign earned income, continued", type: "text", locate: { name: P2(49) } },
  money("line23", "23", "Other foreign earned income: amount", P2(50)),
  comp("line24", "24", "Add lines 19 through 21d, line 22g, and line 23", P2(51), "19 + 20a + 20b + 21a + 21b + 21c + 21d + 22g + 23"),
  money("line25", "25", "Total meals and lodging included on line 24 that are excludable under section 119 (employer's convenience)", P2(52)),
  comp("line26", "26", "Subtract line 25 from line 24: foreign earned income", P2(53), "24 - 25", { alwaysShow: true }),
  comp("line27", "27", "Part V: the amount from line 26", "Page3[0].Line27TagCorrectingSubform[0].f3_1[0]", "= line 26"),
  { id: "claim_housing", line: "27", label: "Are you claiming the housing exclusion or housing deduction? (Yes: complete Part VI)", type: "yesno", locate: { yes: { name: "Page3[0].c3_1[0]" }, no: { name: "Page3[0].c3_1[1]" } }, notes: "Defaults to yes when line 28 (housing expenses) is supplied." },
  money("line28", "28", "Part VI: qualified housing expenses for the tax year (rent, utilities other than telephone, insurance, furniture rental, parking; not purchase costs, mortgage interest, or domestic labor)", "Page3[0].Line28TagCorrectingSubform[0].f3_2[0]"),
  { id: "line29a", line: "29a", label: "Location where the housing expenses were incurred (city, country)", type: "text", locate: { name: P3(3) } },
  money("line29b", "29b", "Limit on housing expenses (standard: 30% of the maximum exclusion, prorated by days; high-cost locations use the table in the instructions)", P3(4), { notes: "Computed from the standard limit when not supplied." }),
  comp("line30", "30", "The smaller of line 28 or line 29b", P3(5), "min(28, 29b)"),
  { id: "line31", line: "31", label: "Number of days in your qualifying period that fall within the tax year", type: "integer", maxLen: 3, locate: { name: P3(6) }, notes: "Defaults to the whole year when the qualifying period covers it." },
  comp("line32", "32", "Base housing amount: the daily rate ($56.99 for 2025, $55.30 for 2024) times line 31 (the full-year amount is $20,800 / $20,240)", P3(7), "daily rate x line 31"),
  comp("line33", "33", "Subtract line 32 from line 30; if zero or less, no housing exclusion or deduction", P3(8), "max(0, 30 - 32)"),
  money("line34", "34", "Employer-provided amounts (wages, salary, allowances, and the fair market value of noncash pay included on line 27)", P3(9), { notes: "Defaults to line 27 for employees (zero for the self-employed, who use the housing deduction instead)." }),
  { id: "line35", line: "35", label: "Line 34 divided by line 27, as a decimal (whole-number part)", type: "text", computed: true, maxLen: 1, locate: { name: P3(10) } },
  { id: "line35_decimals", line: "35", label: "Line 35 decimal places (three digits)", type: "text", computed: true, maxLen: 3, locate: { name: P3(11) } },
  comp("line36", "36", "Housing exclusion: line 33 times line 35, not more than line 34", P3(12), "min(33 x 35, 34)", { alwaysShow: true }),
  comp("line37", "37", "Part VII: maximum foreign earned income exclusion ($130,000 for 2025; $126,500 for 2024)", P3(13), "annual limit"),
  { id: "line38", line: "38", label: "Number of days in your qualifying period that fall within the tax year (from line 31 when Part VI is completed)", type: "integer", maxLen: 3, locate: { name: P3(14) }, notes: "Defaults to line 31, or to the whole year." },
  { id: "line39", line: "39", label: "Line 38 divided by the days in the year, as a decimal (whole-number part)", type: "text", computed: true, maxLen: 1, locate: { name: P3(15) } },
  { id: "line39_decimals", line: "39", label: "Line 39 decimal places (three digits)", type: "text", computed: true, maxLen: 3, locate: { name: P3(16) } },
  comp("line40", "40", "Multiply line 37 by line 39", P3(17), "37 x 39"),
  comp("line41", "41", "Subtract line 36 from line 27", P3(18), "27 - 36"),
  comp("line42", "42", "Foreign earned income exclusion: the smaller of line 40 or line 41", P3(19), "min(40, 41)", { alwaysShow: true }),
  comp("line43", "43", "Part VIII: add lines 36 and 42", P3(20), "36 + 42"),
  money("line44", "44", "Deductions allowed in figuring AGI that are allocable to the excluded income (attach computation)", P3(21)),
  comp("line45", "45", "Subtract line 44 from line 43; to Schedule 1 line 8d (as a negative amount)", P3(22), "43 - 44", { alwaysShow: true }),
  comp("line46", "46", "Part IX (housing deduction): subtract line 36 from line 33", P3(23), "33 - 36"),
  comp("line47", "47", "Subtract line 43 from line 27", P3(24), "27 - 43"),
  comp("line48", "48", "The smaller of line 46 or line 47", P3(25), "min(46, 47)"),
  money("line49", "49", "Housing deduction carryover from the prior year (Housing Deduction Carryover Worksheet)", P3(26)),
  comp("line50", "50", "Housing deduction. Add lines 48 and 49; to Schedule 1 line 24j", P3(27), "48 + 49", { alwaysShow: true }),
];

const decimalParts = (x: number): [string, string] => {
  const v = Math.min(1, Math.max(0, x));
  const whole = Math.floor(v + 1e-9);
  const frac = Math.round((v - whole) * 1000);
  return [String(whole), String(frac).padStart(3, "0")];
};

export const form2555: FormDef = {
  id: "f2555",
  title: "Form 2555, Foreign Earned Income",
  shortTitle: "Form 2555",
  description: "Excludes foreign earned income (up to $130,000 for 2025, $126,500 for 2024) and a housing amount for U.S. citizens and residents who meet the bona fide residence or physical presence test; lines 45 and 50 go to Schedule 1.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i2555.pdf",
  notes: `**Who files.** U.S. citizens and resident aliens with a tax home in a foreign country who either were bona fide residents of a foreign country for an uninterrupted period that includes a full tax year (Part II) or were physically present in foreign countries at least 330 full days in a 12-month period (Part III). Each spouse with foreign earned income files a separate Form 2555.

**What the engine computes.** Part IV totals (lines 22g, 24, 26) and line 27; the housing exclusion (lines 30 through 36, with the standard 30% housing limit and the base housing amount prorated by the days on line 31); the foreign earned income exclusion (lines 37 through 42, prorated by the days on line 38); lines 43, 45 (to Schedule 1 line 8d), and the housing deduction (lines 46 through 50, to Schedule 1 line 24j). In a full return the Form 1040 tax is then figured with the Foreign Earned Income Tax Worksheet.

**What to verify.** The housing limit on line 29b is higher in listed high-cost cities (see the instructions table); supply line29b when one applies. Income earned in the United States (line 14/18 column d/f) is not foreign earned income. Pensions, social security, and investment income are never foreign earned income. Self-employed filers take the housing amount as a deduction (Part IX), not an exclusion, and still owe self-employment tax on the excluded income.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const L = LIMITS[ctx.year];
    const l22g = c.set("line22g", c.sum(["line22a", "line22b", "line22c", "line22d", "line22e", "line22f"]), "Allowances and reimbursements", "22a + 22b + 22c + 22d + 22e + 22f", "22g");
    const l24 = c.set("line24", c.sum(["line19", "line20a", "line20b", "line21a", "line21b", "line21c", "line21d"]) + l22g + c.n("line23"), "Total foreign earned income before exclusions", `wages ${f(c.n("line19"))} + business ${f(c.n("line20a") + c.n("line20b"))} + noncash ${f(c.sum(["line21a", "line21b", "line21c", "line21d"]))} + allowances ${f(l22g)} + other ${f(c.n("line23"))}`, "24");
    const l26 = c.set("line26", l24 - c.n("line25"), "Foreign earned income", `${f(l24)} - ${f(c.n("line25"))}`, "26");
    const l27 = c.set("line27", l26, "Foreign earned income (line 26)", "= line 26", "27");
    const housing = c.has("claim_housing") ? c.bool("claim_housing") : c.has("line28");
    if (!c.has("claim_housing")) c.out["claim_housing"] = housing;
    const bona = c.has("line10_began");
    const physical = c.has("line16_from");
    if (!bona && !physical) c.warn("Complete Part II (bona fide residence: line10_began) or Part III (physical presence: line16_from, line16_through, travel).");
    if (bona && c.bool("line13a") && c.has("line13b") && !c.bool("line13b")) c.warn("Lines 13a yes and 13b no: you do not qualify as a bona fide resident; use the physical presence test if 330 full days apply.");
    const travel = c.list("travel");
    if (travel.length > 4) c.warn("More than 4 travel rows: only the first 4 print; attach a statement.");
    if (c.list("us_visits").length > 8) c.warn("More than 8 U.S. trips: only the first 8 print; attach a statement.");
    const fullDays = travel.reduce((a, r) => a + (Number(r["full_days"] ?? 0) || 0), 0);
    if (physical && travel.length && fullDays < 330) c.warn(`The travel rows show ${fullDays} full days in foreign countries; the physical presence test requires 330 full days in the 12-month period on line 16.`);
    let days = c.has("line31") ? c.n("line31") : c.has("line38") ? c.n("line38") : L.days;
    if (days > L.days) {
      c.warn(`Line 31/38 cannot exceed ${L.days} days for ${ctx.year}; it was limited.`);
      days = L.days;
    }
    if (!c.has("line31") && !c.has("line38")) c.warn(`Lines 31 and 38 default to the full year (${L.days} days); supply line31 (or line38) with the days of the qualifying period that fall within ${ctx.year} if it started or ended during the year.`);
    let l36 = 0;
    let l33 = 0;
    if (housing) {
      if (!c.has("line31")) c.out["line31"] = days;
      const limit = c.has("line29b") ? c.n("line29b") : Math.round((L.housingLimit * days) / L.days);
      if (!c.has("line29b")) c.set("line29b", limit, "Housing expense limit", `${f(L.housingLimit)} x ${days}/${L.days} (standard 30% limit; high-cost locations differ)`, "29b");
      const l30 = c.set("line30", Math.min(c.n("line28"), limit), "Housing expenses within the limit", `min(${f(c.n("line28"))}, ${f(limit)})`, "30");
      const l32 = c.set("line32", days === L.days ? L.housingBase : L.housingDaily * days, "Base housing amount", days === L.days ? `full year ${f(L.housingBase)}` : `${L.housingDaily} x ${days} days`, "32");
      l33 = c.set("line33", Math.max(0, l30 - l32), "Housing expenses above the base amount", `max(0, ${f(l30)} - ${f(l32)})`, "33");
      const selfEmployed = c.bool("employer_self") && !c.has("line34");
      const l34 = c.has("line34") ? c.n("line34") : selfEmployed ? 0 : l27;
      if (!c.has("line34")) c.set("line34", l34, "Employer-provided amounts", selfEmployed ? "self-employed: none" : "= line 27 (all pay employer-provided)", "34");
      const ratio = l27 > 0 ? Math.min(1, l34 / l27) : 0;
      const [w, d] = decimalParts(ratio);
      c.setScalar("line35", w, "Employer-provided share (whole part)", `${f(l34)} / ${f(l27)} = ${ratio.toFixed(3)}`, "35");
      c.setScalar("line35_decimals", d, "Employer-provided share (decimals)", ratio.toFixed(3), "35");
      l36 = c.set("line36", Math.min(l33 * Math.round(ratio * 1000) / 1000, l34), "Housing exclusion", `min(${f(l33)} x ${ratio.toFixed(3)}, ${f(l34)})`, "36");
    } else if (c.has("line28")) {
      c.warn("line28 (housing expenses) was supplied but claim_housing is no; Part VI is skipped.");
    }
    const l37 = c.set("line37", L.max, "Maximum exclusion", `${ctx.year} limit`, "37");
    if (!c.has("line38")) c.out["line38"] = days;
    const frac = days / L.days;
    const [w39, d39] = decimalParts(frac);
    c.setScalar("line39", w39, "Days fraction (whole part)", `${days} / ${L.days} = ${frac.toFixed(3)}`, "39");
    c.setScalar("line39_decimals", d39, "Days fraction (decimals)", frac.toFixed(3), "39");
    const l40 = c.set("line40", l37 * Math.round(frac * 1000) / 1000, "Prorated maximum exclusion", `${f(l37)} x ${frac.toFixed(3)}`, "40");
    const l41 = c.set("line41", Math.max(0, l27 - l36), "Income left after the housing exclusion", `${f(l27)} - ${f(l36)}`, "41");
    const l42 = c.set("line42", Math.min(l40, l41), "Foreign earned income exclusion", `min(${f(l40)}, ${f(l41)})`, "42");
    const l43 = c.set("line43", l36 + l42, "Total exclusions", `${f(l36)} + ${f(l42)}`, "43");
    const l45 = c.set("line45", Math.max(0, l43 - c.n("line44")), "Exclusions after allocable deductions (Schedule 1 line 8d)", `${f(l43)} - ${f(c.n("line44"))}`, "45");
    let l50 = 0;
    if (housing && l33 > l36 && l27 > l43) {
      const l46 = c.set("line46", l33 - l36, "Housing amount not excluded", `${f(l33)} - ${f(l36)}`, "46");
      const l47 = c.set("line47", l27 - l43, "Income not excluded", `${f(l27)} - ${f(l43)}`, "47");
      const l48 = c.set("line48", Math.min(l46, l47), "Housing deduction before carryover", `min(${f(l46)}, ${f(l47)})`, "48");
      l50 = c.set("line50", l48 + c.n("line49"), "Housing deduction (Schedule 1 line 24j)", `${f(l48)} + ${f(c.n("line49"))}`, "50");
    } else {
      c.set("line50", 0, "Housing deduction", "Part IX does not apply", "50");
    }
    if (l45 + l50 > 0) c.warn("Figure Form 1040 line 16 with the Foreign Earned Income Tax Worksheet (tax on taxable income plus the excluded amount, less tax on the excluded amount); a full return does this automatically.");
    if (c.n("line19") > 0 && c.bool("employer_self")) c.warn("Self-employed filers report net business income on line 20a; line 19 is for wages.");
    return c.result();
  },
};
