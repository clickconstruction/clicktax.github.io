import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const P2 = (n: number) => `Page2[0].f2_${n}[0]`;
const P3 = (n: number) => `Page3[0].f3_${n}[0]`;
const P4 = (n: number) => `Page4[0].f4_${n}[0]`;
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, name, { computed: true, notes, ...extra });
const text = (id: string, line: string, label: string, name: string): FieldDef => ({ id, line, label, type: "text", locate: { name } });
/** Section A lines 2-9 and Section B lines 20-27: four property columns per line. */
const lineA = (line: number) => [0, 1, 2, 3].map((col) => `Page1[0].Table_Lines2-9[0].Line${line}[0].f1_${21 + (line - 2) * 4 + col}[0]`);
const lineB = (line: number) => [0, 1, 2, 3].map((col) => `Page2[0].Table_Line20-27[0].Line${line}[0].f2_${7 + (line - 20) * 4 + col}[0]`);
const rowA = (col: number) => ["A", "B", "C", "D"].map((r, i) => `Page1[0].Table_Line1[0].Row${r}[0].f1_${5 + i * 4 + col}[0]`);
const summary = (table: string, first: number) => ({
  description: [`Page2[0].Table_Line${table}[0].Row1[0].f2_${first}[0]`, `Page2[0].Table_Line${table}[0].Row2[0].f2_${first + 4}[0]`],
  loss_business: [`Page2[0].Table_Line${table}[0].Row1[0].bi[0].f2_${first + 1}[0]`, `Page2[0].Table_Line${table}[0].Row2[0].bi[0].f2_${first + 5}[0]`],
  loss_income: [`Page2[0].Table_Line${table}[0].Row1[0].bii[0].f2_${first + 2}[0]`, `Page2[0].Table_Line${table}[0].Row2[0].bii[0].f2_${first + 6}[0]`],
  gain: [`Page2[0].Table_Line${table}[0].Row1[0].c[0].f2_${first + 3}[0]`, `Page2[0].Table_Line${table}[0].Row2[0].c[0].f2_${first + 7}[0]`],
});

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on tax return", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: P1(2) } },
  { id: "federally_declared", label: "The casualty or theft loss is attributable to a federally declared disaster", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "fema_dr", label: "FEMA disaster declaration number (the digits after DR-)", type: "text", maxLen: 4, locate: { name: P1(3) } },
  { id: "fema_em", label: "FEMA emergency declaration number (the digits after EM-)", type: "text", maxLen: 4, locate: { name: P1(4) } },
  { id: "qualified_disaster", label: "The loss is a qualified disaster loss (the $500 reduction applies and the 10% of AGI limit does not)", type: "checkbox", noPdf: true },
  { id: "agi", label: "Adjusted gross income (Form 1040 line 11), for the 10% limit on line 17", type: "money", noPdf: true },
  {
    id: "properties",
    line: "1-9",
    label: "Section A, personal-use property: up to four properties (A through D) with their descriptions and the line 2 through 9 figures",
    type: "list",
    rows: 4,
    items: [
      { id: "description", label: "Type of property", type: "text" },
      { id: "location", label: "Location (city, state)", type: "text" },
      { id: "zip", label: "ZIP code", type: "text", maxLen: 10 },
      { id: "date_acquired", label: "Date acquired", type: "text", maxLen: 10 },
      { id: "line2", label: "Line 2: cost or other basis", type: "money" },
      { id: "line3", label: "Line 3: insurance or other reimbursement (whether or not you filed a claim)", type: "money" },
      { id: "line4", label: "Line 4: gain from casualty or theft (line 3 over line 2)", type: "money", computed: true },
      { id: "line5", label: "Line 5: fair market value before the casualty or theft", type: "money" },
      { id: "line6", label: "Line 6: fair market value after the casualty or theft", type: "money" },
      { id: "line7", label: "Line 7: line 5 minus line 6", type: "money", computed: true },
      { id: "line8", label: "Line 8: the smaller of line 2 or line 7", type: "money", computed: true },
      { id: "line9", label: "Line 9: line 8 minus line 3, not less than zero", type: "money", computed: true },
    ],
    listLocate: both({ description: rowA(0), location: rowA(1), zip: rowA(2), date_acquired: rowA(3), line2: lineA(2), line3: lineA(3), line4: lineA(4), line5: lineA(5), line6: lineA(6), line7: lineA(7), line8: lineA(8), line9: lineA(9) }),
  },
  comp("line10", "10", "Casualty or theft loss. Add the amounts on line 9", P1(53), "sum of line 9"),
  comp("line11", "11", "$100 ($500 for a qualified disaster loss)", P1(54), "100 or 500"),
  comp("line12", "12", "Subtract line 11 from line 10; not less than zero", P1(55), "max(0, 10 - 11)"),
  comp("line13", "13", "Add the amounts on line 4 of all Forms 4684 (gains)", P1(56), "sum of line 4"),
  comp("line14", "14", "Add the amounts on line 12 of all Forms 4684 (losses)", P1(57), "= line 12"),
  comp("line15", "15", "If line 13 is more than line 14: the difference, to Schedule D (net gain); otherwise zero", P1(58), "max(0, 13 - 14)"),
  comp("line16", "16", "Net loss: line 14 minus line 13 (zero when line 13 is larger)", P1(59), "max(0, 14 - 13)"),
  comp("line17", "17", "10% of adjusted gross income (zero for a qualified disaster loss)", P1(60), "agi x 10%"),
  comp("line18", "18", "Subtract line 17 from line 16; not less than zero; to Schedule A line 15 (or line 16 for a qualified disaster loss)", P1(61), "max(0, 16 - 17)", { alwaysShow: true }),
  { id: "name_page2", label: "Name(s) shown on tax return (page 2)", type: "text", computed: true, locate: { name: P2(1) } },
  { id: "ssn_page2", label: "Identifying number (page 2)", type: "ssn", computed: true, locate: { name: P2(2) } },
  {
    id: "business_properties",
    line: "19-27",
    label: "Section B, business and income-producing property: up to four properties with the line 20 through 27 figures",
    type: "list",
    rows: 4,
    items: [
      { id: "description", label: "Line 19: description of property (type, location, date acquired)", type: "text" },
      { id: "line20", label: "Line 20: cost or adjusted basis", type: "money" },
      { id: "line21", label: "Line 21: insurance or other reimbursement", type: "money" },
      { id: "line22", label: "Line 22: gain from casualty or theft (line 21 over line 20)", type: "money", computed: true },
      { id: "line23", label: "Line 23: fair market value before", type: "money" },
      { id: "line24", label: "Line 24: fair market value after", type: "money" },
      { id: "line25", label: "Line 25: line 23 minus line 24", type: "money", computed: true },
      { id: "line26", label: "Line 26: the smaller of line 20 or line 25 (for property totally lost, line 20)", type: "money", computed: true },
      { id: "line27", label: "Line 27: line 26 minus line 21, not less than zero", type: "money", computed: true },
      { id: "long_term", label: "Held more than one year (the loss or gain is long-term, Part II line 34)", type: "checkbox" },
      { id: "income_producing", label: "Income-producing property (column (b)(ii)) rather than trade or business property (column (b)(i))", type: "checkbox" },
    ],
    listLocate: both({ description: ["Page2[0].f2_3[0]", "Page2[0].f2_4[0]", "Page2[0].f2_5[0]", "Page2[0].f2_6[0]"], line20: lineB(20), line21: lineB(21), line22: lineB(22), line23: lineB(23), line24: lineB(24), line25: lineB(25), line26: lineB(26), line27: lineB(27) }),
  },
  comp("line28", "28", "Casualty or theft loss. Add the amounts on line 27", P2(39), "sum of line 27"),
  {
    id: "short_term_items",
    line: "29",
    label: "Part II, short-term (held one year or less): one row per Form 4684 or casualty with the losses by type and gains (filled from the business properties when not supplied)",
    type: "list",
    rows: 2,
    items: [
      { id: "description", label: "(a) Identify the casualty or theft", type: "text" },
      { id: "loss_business", label: "(b)(i) Loss from trade, business, rental, or royalty property", type: "money" },
      { id: "loss_income", label: "(b)(ii) Loss from income-producing and employee property", type: "money" },
      { id: "gain", label: "(c) Gains from casualties or thefts includible in income", type: "money" },
    ],
    listLocate: both(summary("29", 40)),
  },
  comp("line30_bi", "30(b)(i)", "Totals: column (b)(i)", P2(48), "sum"),
  comp("line30_bii", "30(b)(ii)", "Totals: column (b)(ii)", P2(49), "sum"),
  comp("line30_c", "30(c)", "Totals: column (c)", P2(50), "sum"),
  comp("line31", "31", "Combine line 30 columns (b)(i) and (c): net short-term gain or (loss) to Form 4797 line 14", P2(51), "30(c) - 30(b)(i)"),
  comp("line32", "32", "Line 30 column (b)(ii): income-producing property losses to Schedule A line 16", P2(52), "= 30(b)(ii)"),
  money("line33", "33", "Casualty or theft gains from Form 4797 line 32", "Page2[0].f2_53[0]", { locate: { names: { 2024: "Page2[0].f2_53[0]", 2025: "Page2[0].Line33_ReadOrder[0].f2_53[0]" } } }),
  {
    id: "long_term_items",
    line: "34",
    label: "Part II, long-term (held more than one year): one row per casualty with the losses by type and gains (filled from the business properties when not supplied)",
    type: "list",
    rows: 2,
    items: [
      { id: "description", label: "(a) Identify the casualty or theft", type: "text" },
      { id: "loss_business", label: "(b)(i) Loss from trade, business, rental, or royalty property", type: "money" },
      { id: "loss_income", label: "(b)(ii) Loss from income-producing and employee property", type: "money" },
      { id: "gain", label: "(c) Gains from casualties or thefts includible in income", type: "money" },
    ],
    listLocate: both(summary("34", 54)),
  },
  comp("line35_bi", "35(b)(i)", "Total long-term losses: column (b)(i)", P2(62), "sum"),
  comp("line35_bii", "35(b)(ii)", "Total long-term losses: column (b)(ii)", P2(63), "sum"),
  comp("line36", "36", "Total gains. Add line 33 and line 34 column (c)", P2(64), "33 + sum of 34(c)"),
  comp("line37", "37", "Add line 35 columns (b)(i) and (b)(ii)", P2(65), "35(b)(i) + 35(b)(ii)"),
  comp("line38a", "38a", "If line 37 exceeds line 36: combine line 35 (b)(i) and line 36; the net to Form 4797 line 14", P2(66), "36 - 35(b)(i) when 37 > 36"),
  comp("line38b", "38b", "If line 37 exceeds line 36: line 35 column (b)(ii), to Schedule A line 16", P2(67), "= 35(b)(ii) when 37 > 36"),
  comp("line39", "39", "If line 37 is not more than line 36: combine lines 36 and 37; the net gain to Form 4797 line 3", P2(68), "36 - 37 when 37 <= 36"),
  { id: "name_page3", label: "Name(s) shown on tax return (page 3)", type: "text", computed: true, locate: { name: P3(1) } },
  { id: "ssn_page3", label: "Identifying number (page 3)", type: "ssn", computed: true, locate: { name: P3(2) } },
  money("line40", "40", "Part III (Ponzi-type theft loss safe harbor): initial investment", P3(3)),
  money("line41", "41", "Subsequent investments", P3(4)),
  money("line42", "42", "Income reported on your tax returns and reinvested in the arrangement", P3(5)),
  comp("line43", "43", "Add lines 40, 41, and 42", P3(6), "40 + 41 + 42"),
  money("line44", "44", "Withdrawals for all years", P3(7)),
  comp("line45", "45", "Total qualified investment. Subtract line 44 from line 43", P3(8), "43 - 44"),
  { id: "line46", line: "46", label: "Percentage: 0.95 if you are not pursuing any potential third-party recovery, 0.75 if you are", type: "percent", noPdf: true, notes: "Defaults to 0.95." },
  { id: "line46_whole", line: "46", label: "Line 46 whole-number part", type: "text", computed: true, maxLen: 1, locate: { name: P3(9) } },
  { id: "line46_decimals", line: "46", label: "Line 46 decimal places", type: "text", computed: true, maxLen: 2, locate: { name: P3(10) } },
  comp("line47", "47", "Multiply line 46 by line 45", P3(11), "45 x 46"),
  money("line48", "48", "Actual recovery", P3(12)),
  money("line49", "49", "Potential insurance or Securities Investor Protection Corporation (SIPC) recovery", P3(13)),
  comp("line50", "50", "Total recovery. Add lines 48 and 49", P3(14), "48 + 49"),
  comp("line51", "51", "Deductible theft loss. Subtract line 50 from line 47; to Section B line 28 (as a business property row)", P3(15), "max(0, 47 - 50)"),
  text("responsible_name", "Part III", "Name of the individual or entity that conducted the fraudulent arrangement", "Page3[0].BulletedList2[0].Bullet1[0].f3_16[0]"),
  { id: "responsible_tin", line: "Part III", label: "Taxpayer identification number of that person (if known)", type: "text", maxLen: 11, locate: { name: "Page3[0].BulletedList2[0].Bullet1[0].f3_17[0]" } },
  text("responsible_address", "Part III", "Address of that person", "Page3[0].BulletedList2[0].Bullet1[0].f3_18[0]"),
  text("return_dates", "Part III", "Dates the returns reporting the fictitious income were filed", "Page3[0].ReturnDates[0].f3_19[0]"),
  { id: "name_page4", label: "Name(s) shown on tax return (page 4)", type: "text", computed: true, locate: { name: P4(1) } },
  { id: "ssn_page4", label: "Identifying number (page 4)", type: "ssn", computed: true, locate: { name: P4(2) } },
  text("disaster_name", "52", "Part IV (election to deduct a disaster loss in the preceding year): name or description of the disaster", P4(3)),
  text("disaster_name_more", "52", "Disaster, continued", P4(4)),
  text("disaster_dates", "52", "Date or dates of the disaster (MM/DD/YYYY)", P4(5)),
  text("disaster_dates_more", "52", "Dates, continued", P4(6)),
  text("disaster_address", "52", "Address of the damaged or destroyed property at the time of the disaster", P4(7)),
  text("disaster_address_more", "52", "Address, continued", P4(8)),
  text("election_year", "53", "The tax year for which the election is claimed (the preceding year)", P4(9)),
  text("election_more", "53", "Election statement, continued", P4(10)),
  { id: "election_date", line: "53", label: "Date the election statement was filed (MM/DD/YYYY)", type: "text", maxLen: 10, locate: { name: P4(11) } },
  text("revocation", "54", "Revocation of a prior election: the refund received that relates to the election being revoked", P4(12)),
  text("revocation_more", "54", "Revocation, continued", P4(13)),
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
const truthy = (v: unknown) => v === true || v === 1 || (typeof v === "string" && /^(true|yes|y|1|x)$/i.test(v));

export const form4684: FormDef = {
  id: "f4684",
  title: "Form 4684, Casualties and Thefts",
  shortTitle: "Form 4684",
  description: "Figures the deductible loss (or taxable gain) from casualties and thefts: personal-use property in a federally declared disaster (Section A, to Schedule A), business and income-producing property (Section B, to Form 4797 and Schedule A), Ponzi-scheme theft losses (Part III), and the election to deduct a disaster loss in the prior year.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i4684.pdf",
  notes: `**Who files.** For 2018 through 2025, personal casualty losses are deductible only if attributable to a federally declared disaster (Section A); business and income-producing property losses and all casualty gains are reported in Section B. Ponzi-type investment theft losses use the Part III safe harbor.

**What the engine computes.** Section A per property: line 4 (gain), 7, 8, 9; lines 10 through 18 ($100 or $500 reduction, the 10% of AGI floor unless a qualified disaster loss, net gain to Schedule D, deductible loss to Schedule A). Section B per property: lines 22, 25, 26, 27, and 28; the Part II summary rows (filled from the business properties by holding period when not supplied), totals, and lines 31, 32, 36 through 39. Part III: lines 43, 45, 47, 50, and 51. In a full return line 18 goes to Schedule A line 15, lines 32 and 38b to Schedule A line 16, and line 15 to Schedule D; Form 4797 amounts (lines 31, 38a, 39) are reported as warnings.

**What to verify.** The decrease in fair market value (lines 5 and 6) needs an appraisal or the cost of repairs; insurance you could have claimed counts as reimbursement even if you did not file a claim. Qualified disaster losses (specific 2016-2024 disasters named in the law) use the $500 reduction, skip the 10% floor, and can be added to the standard deduction. Use Part IV to elect to deduct a federally declared disaster loss on the prior year's return instead.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    for (const p of ["2", "3", "4"]) {
      if (c.has("name")) c.out[`name_page${p}`] = c.str("name");
      if (c.has("ssn")) c.out[`ssn_page${p}`] = c.str("ssn");
    }
    const props = c.list("properties");
    if (props.length > 4) c.warn("More than 4 personal-use properties: only four print; use another Form 4684 for the rest.");
    const outA: ListRow[] = props.map((r) => {
      const l4 = Math.max(0, num(r, "line3") - num(r, "line2"));
      const l7 = Math.max(0, num(r, "line5") - num(r, "line6"));
      const l8 = Math.min(num(r, "line2"), l7);
      return { ...r, line4: l4, line7: l7, line8: l8, line9: l4 > 0 ? 0 : Math.max(0, l8 - num(r, "line3")) };
    });
    c.out["properties"] = outA;
    const qualified = c.bool("qualified_disaster");
    const l10 = c.set("line10", outA.reduce((a, r) => a + num(r, "line9"), 0), "Personal casualty or theft loss", "sum of line 9", "10");
    const l11 = c.set("line11", props.length ? (qualified ? 500 : 100) : 0, "Reduction", qualified ? "qualified disaster loss: 500" : "100", "11");
    const l12 = c.set("line12", Math.max(0, l10 - l11), "Loss after the reduction", `max(0, ${f(l10)} - ${f(l11)})`, "12");
    const l13 = c.set("line13", outA.reduce((a, r) => a + num(r, "line4"), 0), "Personal casualty gains", "sum of line 4", "13");
    const l14 = c.set("line14", l12, "Losses from all Forms 4684", "= line 12", "14");
    c.set("line15", Math.max(0, l13 - l14), "Net gain to Schedule D", `max(0, ${f(l13)} - ${f(l14)})`, "15");
    const l16 = c.set("line16", Math.max(0, l14 - l13), "Net loss", `max(0, ${f(l14)} - ${f(l13)})`, "16");
    const l17 = c.set("line17", qualified ? 0 : c.n("agi") * 0.1, "10% of AGI floor", qualified ? "qualified disaster loss: no floor" : `${f(c.n("agi"))} x 10%`, "17");
    c.set("line18", Math.max(0, l16 - l17), "Deductible personal casualty loss (Schedule A)", `max(0, ${f(l16)} - ${f(l17)})`, "18");
    if (props.length && !c.has("agi") && !qualified) c.warn("Supply agi (Form 1040 line 11) for the 10% floor on line 17; it is treated as zero.");
    if (props.length && !c.bool("federally_declared") && !qualified) c.warn("Personal casualty and theft losses for 2018 through 2025 are deductible only when attributable to a federally declared disaster; check federally_declared and supply the FEMA number.");
    const biz = c.list("business_properties");
    if (biz.length > 4) c.warn("More than 4 business properties: only four print; use another Form 4684 for the rest.");
    const outB: ListRow[] = biz.map((r) => {
      const l22 = Math.max(0, num(r, "line21") - num(r, "line20"));
      const l25 = Math.max(0, num(r, "line23") - num(r, "line24"));
      const l26 = r["line23"] === undefined && r["line24"] === undefined ? num(r, "line20") : Math.min(num(r, "line20"), l25);
      return { ...r, line22: l22, line25: l25, line26: l26, line27: l22 > 0 ? 0 : Math.max(0, l26 - num(r, "line21")) };
    });
    c.out["business_properties"] = outB;
    c.set("line28", outB.reduce((a, r) => a + num(r, "line27"), 0), "Business casualty or theft loss", "sum of line 27", "28");
    const build = (lt: boolean): ListRow[] => {
      const rows = outB.filter((r) => truthy(r["long_term"]) === lt);
      if (!rows.length) return [];
      const income = rows.filter((r) => truthy(r["income_producing"]));
      const trade = rows.filter((r) => !truthy(r["income_producing"]));
      return [{ description: rows.map((r) => String(r["description"] ?? "")).filter(Boolean).join("; ") || "Form 4684 Section B", loss_business: trade.reduce((a, r) => a + num(r, "line27"), 0), loss_income: income.reduce((a, r) => a + num(r, "line27"), 0), gain: rows.reduce((a, r) => a + num(r, "line22"), 0) }];
    };
    const st = c.list("short_term_items").length ? c.list("short_term_items") : build(false);
    const lt = c.list("long_term_items").length ? c.list("long_term_items") : build(true);
    c.out["short_term_items"] = st;
    c.out["long_term_items"] = lt;
    const sum = (rows: ListRow[], k: string) => rows.reduce((a, r) => a + num(r, k), 0);
    const bi30 = c.set("line30_bi", sum(st, "loss_business"), "Short-term business losses", "sum", "30(b)(i)");
    const bii30 = c.set("line30_bii", sum(st, "loss_income"), "Short-term income-producing losses", "sum", "30(b)(ii)");
    const c30 = c.set("line30_c", sum(st, "gain"), "Short-term gains", "sum", "30(c)");
    c.set("line31", c30 - bi30, "Net short-term gain or (loss) to Form 4797 line 14", `${f(c30)} - ${f(bi30)}`, "31");
    c.set("line32", bii30, "Income-producing losses to Schedule A line 16", "= 30(b)(ii)", "32");
    const bi35 = c.set("line35_bi", sum(lt, "loss_business"), "Long-term business losses", "sum", "35(b)(i)");
    const bii35 = c.set("line35_bii", sum(lt, "loss_income"), "Long-term income-producing losses", "sum", "35(b)(ii)");
    const l36 = c.set("line36", c.n("line33") + sum(lt, "gain"), "Total long-term gains", `${f(c.n("line33"))} + ${f(sum(lt, "gain"))}`, "36");
    const l37 = c.set("line37", bi35 + bii35, "Total long-term losses", `${f(bi35)} + ${f(bii35)}`, "37");
    if (l37 > l36) {
      c.set("line38a", l36 - bi35, "Net long-term result to Form 4797 line 14", `${f(l36)} - ${f(bi35)}`, "38a");
      c.set("line38b", bii35, "Income-producing losses to Schedule A line 16", "= 35(b)(ii)", "38b");
      c.set("line39", 0, "Net gain to Form 4797 line 3", "losses exceed gains", "39");
    } else {
      c.set("line38a", 0, "Net long-term result to Form 4797 line 14", "gains are not less than losses", "38a");
      c.set("line38b", 0, "Income-producing losses to Schedule A line 16", "gains are not less than losses", "38b");
      c.set("line39", l36 - l37, "Net gain to Form 4797 line 3", `${f(l36)} - ${f(l37)}`, "39");
    }
    if (["line40", "line41", "line44"].some((k) => c.has(k))) {
      const l43 = c.set("line43", c.sum(["line40", "line41", "line42"]), "Total invested", "40 + 41 + 42", "43");
      const l45 = c.set("line45", Math.max(0, l43 - c.n("line44")), "Qualified investment", `${f(l43)} - ${f(c.n("line44"))}`, "45");
      let pct = c.has("line46") ? Number(values["line46"]) || 0 : 0.95;
      if (pct > 1) pct = pct / 100;
      c.out["line46"] = pct;
      c.setScalar("line46_whole", String(Math.floor(pct + 1e-9)), "Safe-harbor percentage (whole)", pct.toFixed(2), "46");
      c.setScalar("line46_decimals", String(Math.round((pct - Math.floor(pct + 1e-9)) * 100)).padStart(2, "0"), "Safe-harbor percentage (decimals)", pct.toFixed(2), "46");
      const l47 = c.set("line47", l45 * pct, "Safe-harbor loss", `${f(l45)} x ${pct}`, "47");
      const l50 = c.set("line50", c.n("line48") + c.n("line49"), "Total recovery", `${f(c.n("line48"))} + ${f(c.n("line49"))}`, "50");
      c.set("line51", Math.max(0, l47 - l50), "Deductible theft loss (Section B line 28)", `max(0, ${f(l47)} - ${f(l50)})`, "51");
      c.warn("Part III: carry line 51 into Section B as a business property row (basis = line 51, no reimbursement) so it reaches line 28 and Part II.");
    }
    if (c.n("line31") !== 0 || c.n("line38a") !== 0 || c.n("line39") !== 0) c.warn("Business casualty results (lines 31, 38a, 39) are reported on Form 4797; enter them there (they are not placed automatically).");
    return c.result();
  },
};
