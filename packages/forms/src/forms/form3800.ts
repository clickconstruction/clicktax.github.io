import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
/** Page 1 widgets shifted up by one in 2025 (line B(ii) was added); pages 2 through 9 are the same in both years. */
const p1 = (n2025: number, wrap = "") => {
  const w = wrap ? `${wrap}[0].` : "";
  return { names: { 2024: `Page1[0].${w}f1_${n2025 - 1}[0]`, 2025: `Page1[0].${w}f1_${n2025}[0]` } };
};
const p2 = (n: number) => ({ name: `Page2[0].f2_${n}[0]` });
const money = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });

const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];
/** Part III rows in print order: page 3 holds lines 1a through 1zz and 2; page 4 holds 3, 4a through 4z, 5, and 6. */
const PART3_ROWS: Array<{ line: string; page: 3 | 4 }> = [
  ...LETTERS.map((l) => ({ line: `1${l}`, page: 3 as const })),
  ...["aa", "bb", "cc", "dd", "ee", "ff", "gg", "hh", "ii", "zz"].map((l) => ({ line: `1${l}`, page: 3 as const })),
  { line: "2", page: 3 },
  { line: "3", page: 4 },
  ...LETTERS.slice(0, 13).map((l) => ({ line: `4${l}`, page: 4 as const })),
  { line: "4z", page: 4 },
  { line: "5", page: 4 },
  { line: "6", page: 4 },
];
/** Part IV rows: page 5 holds 1a through 1zz; page 6 holds 2a through 2zz and 3; page 7 holds 4a through 4z, 5, 6, and 7. */
const PART4_ROWS: Array<{ line: string; page: 5 | 6 | 7 }> = [
  ...LETTERS.map((l) => ({ line: `1${l}`, page: 5 as const })),
  ...["aa", "bb", "cc", "dd", "ee", "ff", "gg", "hh", "ii", "jj", "zz"].map((l) => ({ line: `1${l}`, page: 5 as const })),
  ...LETTERS.map((l) => ({ line: `2${l}`, page: 6 as const })),
  { line: "2zz", page: 6 },
  { line: "3", page: 6 },
  ...LETTERS.slice(0, 13).map((l) => ({ line: `4${l}`, page: 7 as const })),
  { line: "4y", page: 7 },
  { line: "4z", page: 7 },
  { line: "5", page: 7 },
  { line: "6", page: 7 },
  { line: "7", page: 7 },
];
const PART3_ITEMS = ["count", "registration", "ein", "passive", "nonpassive", "transfer", "combined", "epe", "epe_applied", "net_epe"];
const PART4_ITEMS = ["count", "year", "ein", "passive_before", "passive_after", "nonpassive", "applied", "recaptured", "carryforward"];
const tableLocate = (rows: Array<{ line: string; page: number }>, items: string[]) => {
  const out: Record<string, string[]> = Object.fromEntries(items.map((it) => [it, []]));
  const perPage = new Map<number, number>();
  for (const r of rows) {
    const idx = perPage.get(r.page) ?? 0;
    items.forEach((it, col) => out[it]!.push(`Page${r.page}[0].Pg${r.page}Table[0].Line${r.line}[0].f${r.page}_${idx * items.length + col + 1}[0]`));
    perPage.set(r.page, idx + 1);
  }
  return both(out);
};
const TOTAL_LINES = new Set(["2", "5", "6", "7"]);
/** Which Part III/IV line each source form feeds (current rules; the 3800 instructions govern). */
export const CREDIT_LINES: Record<string, string> = {
  f3468_part2: "1a", f7207: "1b", f6765: "1c", f3468_part3: "1d", f8826: "1e", f8835_part2: "1f", f7210: "1g", f8820: "1h", f8874: "1i", f8881_part1: "1j", f8882: "1k", f8864_diesel: "1l", f8896: "1m", f8906: "1n", f3468_part4: "1o", f8908: "1p", f7218: "1q", f8911: "1s", f8830: "1t", f7213_part2: "1u", f3468_part5: "1v", f8932: "1w", f8933: "1x", f8936_part2: "1y", f8936_part5: "1aa", f8904: "1bb", f7213_part1: "1cc", f8881_part2: "1dd", f8881_part3: "1ee", f8864_saf: "1ff", f7211: "1gg", other: "1zz",
  f8844: "3", f3468_part6: "4a", f5884: "4b", f6478: "4c", f8586: "4d", f8835_part2_specified: "4e", f8846: "4f", f8900: "4g", f8941: "4h", f6765_esb: "4i", f8994: "4j", f3468_part7: "4k", other_specified: "4z",
};

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: "Page1[0].f1_1[0]" } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: "Page1[0].f1_2[0]" } },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss); married filing separately halves the $25,000 on line 13", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  { id: "question_a", line: "A", label: "Are you both an applicable corporation for the CAMT and an applicable taxpayer for the BEAT? (individuals: No)", type: "yesno", locate: { yes: { name: "Page1[0].c1_1[0]" }, no: { name: "Page1[0].c1_1[1]" } }, notes: "Defaults to No." },
  { id: "question_b", line: "B(i)", label: "Did you make an entry in Part III column (f) (credit transfer election)?", type: "yesno", years: [2025], locate: { yes: { names: { 2025: "Page1[0].c1_2[0]" } }, no: { names: { 2025: "Page1[0].c1_2[1]" } } }, notes: "Set automatically from the credits rows." },
  { id: "transfer_statements", line: "B(ii)", label: "Number of transfer election statements attached", type: "integer", years: [2025], locate: { names: { 2025: "Page1[0].f1_3[0]" } } },
  comp("line1", "1", "Credits not subject to the passive activity limit: Part III line 2 column (e) plus non-passive amounts in column (f)", p1(4), "Part III line 2: (e) + (f)", { alwaysShow: true }),
  comp("line2", "2", "Credits subject to the passive activity limit: Part III line 2 column (d) plus Part IV line 6 column (d)", p1(5, "Line2_ReadOrder"), "Part III line 2 (d) + Part IV line 6 (d)"),
  money("line3", "3", "Portion of line 2 allowed this year (from Form 8582-CR)", p1(6), { notes: "Defaults to the passive_allowed amounts on the credit rows, or to all of line 2 when none are supplied." }),
  money("line4", "4", "Portion of Part IV line 6 column (f) that is from carryforwards", p1(7), { notes: "Defaults to the non-passive carryforwards in the carryovers rows (lines 1a through 2zz)." }),
  { id: "line4_changed", line: "4", label: "The carryforward was changed or revised from the amount originally reported", type: "checkbox", locate: { names: { 2024: "Page1[0].c1_2[0]", 2025: "Page1[0].c1_3[0]" } } },
  money("line5", "5", "Portion of Part IV line 6 column (f) that is from carrybacks from the following year", p1(8)),
  comp("line6", "6", "Add lines 1, 3, 4, and 5", p1(9), "1 + 3 + 4 + 5", { alwaysShow: true }),
  money("line7", "7", "Regular tax before credits: Form 1040 line 16 plus Schedule 2 line 1z", p1(10), { notes: "Filled from the return when preparing a full return." }),
  money("line8", "8", "Alternative minimum tax (Form 6251 line 11)", p1(11)),
  comp("line9", "9", "Add lines 7 and 8", p1(12), "7 + 8"),
  money("line10a", "10a", "Foreign tax credit (Schedule 3 line 1)", p1(13)),
  money("line10b", "10b", "Certain allowable credits: the other nonrefundable personal credits on Schedule 3 (lines 2 through 5b and 6b through 6m)", p1(14)),
  comp("line10c", "10c", "Add lines 10a and 10b", p1(15), "10a + 10b"),
  comp("line11", "11", "Net income tax. Subtract line 10c from line 9", p1(16), "max(0, 9 - 10c)"),
  comp("line12", "12", "Net regular tax. Subtract line 10c from line 7; not less than zero", p1(17), "max(0, 7 - 10c)"),
  comp("line13", "13", "25% of the excess of line 12 over $25,000 ($12,500 married filing separately)", p1(18), "25% x max(0, 12 - 25,000)"),
  money("line14", "14", "Tentative minimum tax (Form 6251 line 9)", p1(19), { notes: "Filled from the AMT computation when preparing a full return; zero when Form 6251 does not apply only if the tentative minimum tax is truly zero (it rarely is), so supply it when known." }),
  comp("line15", "15", "The greater of line 13 or line 14", p1(20), "max(13, 14)"),
  comp("line16", "16", "Subtract line 15 from line 11; not less than zero", p1(21), "max(0, 11 - 15)"),
  comp("line17", "17", "Credit allowed after the section 38(c)(1) limitation: the smaller of line 6 or line 16", p1(22), "min(6, 16)", { alwaysShow: true }),
  comp("line18", "18", "Multiply line 14 by 75%", p2(1), "14 x 75%"),
  comp("line19", "19", "The greater of line 13 or line 18", p2(2), "max(13, 18)"),
  comp("line20", "20", "Subtract line 19 from line 11; not less than zero", p2(3), "max(0, 11 - 19)"),
  comp("line21", "21", "Subtract line 17 from line 20; not less than zero", p2(4), "max(0, 20 - 17)"),
  comp("line22", "22", "Empowerment zone credit (Form 8844) not subject to passive limits: Part III line 3 columns (e) and (f) plus Part IV line 3 column (f)", p2(5), "Part III line 3 (e)+(f) + Part IV line 3 (f)"),
  comp("line23", "23", "Passive activity credit from Part III line 3 column (d) plus Part IV line 3 column (d)", p2(6), "Part III line 3 (d) + Part IV line 3 (d)"),
  money("line24", "24", "Passive activity credit allowed this year (Form 8582-CR)", p2(7), { notes: "Defaults to the passive_allowed amount on the line 3 rows, or to line 23." }),
  comp("line25", "25", "Add lines 22 and 24", p2(8), "22 + 24"),
  comp("line26", "26", "Empowerment zone and renewal community employment credit allowed: the smaller of line 21 or line 25", p2(9), "min(21, 25)", { alwaysShow: true }),
  comp("line27", "27", "Subtract line 13 from line 11; not less than zero", p2(10), "max(0, 11 - 13)"),
  comp("line28", "28", "Add lines 17 and 26", p2(11), "17 + 26"),
  comp("line29", "29", "Subtract line 28 from line 27; not less than zero", p2(12), "max(0, 27 - 28)"),
  comp("line30", "30", "Specified credits not subject to passive limits: Part III line 5 column (e) plus non-passive amounts in column (f)", p2(13), "Part III line 5 (e) + (f)"),
  comp("line32", "32", "Passive specified credits: Part III line 5 column (d) plus Part IV line 5 column (d)", p2(15), "Part III line 5 (d) + Part IV line 5 (d)"),
  money("line33", "33", "Passive specified credits allowed this year (Form 8582-CR)", p2(16), { notes: "Defaults to the passive_allowed amounts on the specified-credit rows, or to line 32." }),
  money("line34", "34", "Carryforward of specified business credits to this year", p2(17), { notes: "Defaults to the non-passive carryforwards on the Part IV line 4 rows." }),
  { id: "line34_changed", line: "34", label: "The carryforward was changed or revised from the amount originally reported", type: "checkbox", locate: { name: "Page2[0].c2_1[0]" } },
  money("line35", "35", "Carryback of specified business credits from the following year", p2(18)),
  comp("line36", "36", "Add lines 30, 33, 34, and 35", p2(19), "30 + 33 + 34 + 35"),
  comp("line37", "37", "Specified credits allowed: the smaller of line 29 or line 36", p2(20), "min(29, 36)", { alwaysShow: true }),
  comp("line38", "38", "Credit allowed for the current year. Add lines 28 and 37; to Schedule 3 line 6a", p2(21), "28 + 37", { alwaysShow: true }),
  {
    id: "credits",
    line: "Part III",
    label: "Current-year general business credits, one row per source form (or per pass-through entity): `line` is the Part III line (\"4b\" for Form 5884, \"4f\" for Form 8846, \"1c\" for Form 6765, \"4d\" for Form 8586, \"4j\" for Form 8994, \"1y\" for Form 8936 Part II...), with the credit split into passive (d), nonpassive (e), and transfer (f) amounts",
    type: "list",
    noPdf: true,
    items: [
      { id: "line", label: "Part III line number (1a-1zz, 3, 4a-4z)", type: "text" },
      { id: "count", label: "(a) Number of items when more than one entity or facility is combined on this line (then also complete Part V)", type: "integer" },
      { id: "registration", label: "(b) Elective payment or transfer registration number", type: "text" },
      { id: "ein", label: "(c) EIN of the pass-through or transferor entity", type: "text" },
      { id: "passive", label: "(d) Credit subject to the passive activity limit, before the limit", type: "money" },
      { id: "passive_allowed", label: "Portion of (d) allowed after the passive activity limit (Form 8582-CR); defaults to all of (d)", type: "money" },
      { id: "nonpassive", label: "(e) Credit not subject to the passive activity limit", type: "money" },
      { id: "transfer", label: "(f) Credit transfer election amount (purchased credits positive, credits sold negative)", type: "money" },
      { id: "epe", label: "(h) Gross elective payment election (EPE) amount", type: "money" },
      { id: "epe_applied", label: "(i) Amount of column (g) applied against tax in Part II", type: "money" },
    ],
  },
  {
    id: "part3",
    line: "Part III",
    label: "Part III as printed (one row per form line, in print order; filled from the credits rows)",
    type: "list",
    rows: PART3_ROWS.length,
    computed: true,
    items: [
      { id: "count", label: "(a) Number of items", type: "integer", computed: true },
      { id: "registration", label: "(b) Registration number", type: "text", computed: true },
      { id: "ein", label: "(c) Pass-through or transferor EIN", type: "text", computed: true },
      { id: "passive", label: "(d) Subject to passive limit, before the limit", type: "money", computed: true },
      { id: "nonpassive", label: "(e) Not subject to passive limit", type: "money", computed: true },
      { id: "transfer", label: "(f) Transfer election amount", type: "money", computed: true },
      { id: "combined", label: "(g) Columns (e) and (f) plus (d) allowed", type: "money", computed: true },
      { id: "epe", label: "(h) Gross EPE amount", type: "money", computed: true },
      { id: "epe_applied", label: "(i) Column (g) applied against tax", type: "money", computed: true },
      { id: "net_epe", label: "(j) Net EPE amount", type: "money", computed: true },
    ],
    listLocate: tableLocate(PART3_ROWS, PART3_ITEMS),
  },
  {
    id: "carryovers",
    line: "Part IV",
    label: "Carryovers of general business credits to this year, one row per credit and originating year: `line` is the Part IV line (same numbering as Part III, plus 2a-2zz for expired credits)",
    type: "list",
    noPdf: true,
    items: [
      { id: "line", label: "Part IV line number (1a-1zz, 2a-2zz, 3, 4a-4z)", type: "text" },
      { id: "count", label: "(a) Number of items when several years or entities are combined (then also complete Part VI)", type: "integer" },
      { id: "year", label: "(b) Originating tax year", type: "text" },
      { id: "ein", label: "(c) Pass-through entity EIN", type: "text" },
      { id: "passive_before", label: "(d) Carryover subject to the passive activity limit, before the limit", type: "money" },
      { id: "passive_after", label: "(e) Carryover subject to the passive activity limit, after the limit", type: "money" },
      { id: "nonpassive", label: "(f) Carryover not subject to the passive activity limit", type: "money" },
      { id: "applied", label: "(g) Amount of (e) and (f) applied against tax this year; defaults to the amount the engine allocates from line 38", type: "money" },
      { id: "recaptured", label: "(h) Amount of (e) and (f) recaptured or otherwise adjusted", type: "money" },
    ],
  },
  {
    id: "part4",
    line: "Part IV",
    label: "Part IV as printed (one row per form line; filled from the carryovers rows)",
    type: "list",
    rows: PART4_ROWS.length,
    computed: true,
    items: [
      { id: "count", label: "(a) Number of items", type: "integer", computed: true },
      { id: "year", label: "(b) Originating tax year", type: "text", computed: true },
      { id: "ein", label: "(c) Pass-through entity EIN", type: "text", computed: true },
      { id: "passive_before", label: "(d) Before passive limits", type: "money", computed: true },
      { id: "passive_after", label: "(e) After passive limits", type: "money", computed: true },
      { id: "nonpassive", label: "(f) Not subject to passive limits", type: "money", computed: true },
      { id: "applied", label: "(g) Applied against tax", type: "money", computed: true },
      { id: "recaptured", label: "(h) Recaptured or adjusted", type: "money", computed: true },
      { id: "carryforward", label: "(i) Carryforward to next year: (e) + (f) - (g) - (h)", type: "money", computed: true },
    ],
    listLocate: tableLocate(PART4_ROWS, PART4_ITEMS),
  },
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/^line\s*/, "").replace(/\s/g, "");
const group = (line: string) => (line.startsWith("1") ? "1" : line.startsWith("2") ? "2" : line === "3" ? "3" : line.startsWith("4") ? "4" : "total");

export const form3800: FormDef = {
  id: "f3800",
  title: "Form 3800, General Business Credit",
  shortTitle: "Form 3800",
  description: "Combines the business credits from their source forms (work opportunity, FICA tip, research, investment, low-income housing, paid family leave, clean vehicle...), applies the tax-liability limits, and carries the allowed credit to Schedule 3 line 6a with the unused amount carried forward.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i3800.pdf",
  notes: `**Who files.** Anyone claiming more than one general business credit, a carryforward or carryback of one, or a credit from a pass-through entity; most source forms (5884, 8846, 6765, 3468, 8586, 8994, 8936 Parts II and V, 8911 Part I) are claimed through Form 3800.

**How to supply the credits.** One \`credits\` row per source form with its Part III line: 1a Form 3468 Part II, 1c Form 6765, 1e Form 8826, 1j Form 8881 Part I, 1k Form 8882, 1s Form 8911 Part I, 1y Form 8936 Part II, 1aa Form 8936 Part V, 1zz other; 3 Form 8844; 4a Form 3468 Part VI, 4b Form 5884, 4c Form 6478, 4d Form 8586, 4f Form 8846, 4g Form 8900, 4h Form 8941, 4i Form 6765 (eligible small business), 4j Form 8994, 4k Form 3468 Part VII, 4z other specified credits. Credits from rental or other passive activities go in \`passive\` (column d) with the amount allowed by Form 8582-CR in \`passive_allowed\`; everything else in \`nonpassive\` (column e). Prior-year carryforwards go in \`carryovers\` rows with the same line numbering.

**What the engine computes.** Parts III and IV as printed (rows placed by line, column (g) and (j), the line 2, 5, 6, and 7 totals, and the Part IV carryforward column), Part I lines 1, 2, 6 (with lines 3 and 4 defaulted from the rows), the Part II limitation (lines 9 through 38, including the empowerment zone and specified-credit sections), and the Part IV column (g) allocation of the allowed credit to carryforwards first (oldest year first). In a full return lines 7, 8, 10a, 10b, and 14 come from the Form 1040, Schedule 2, Schedule 3, and Form 6251 figures and line 38 goes to Schedule 3 line 6a.

**What to verify.** Form 8582-CR (passive activity credit limits), Parts V and VI (breakdowns when several entities or years share one line), and Form 4255 recapture are not prepared here. Unused credits carry forward 20 years; keep the Part IV carryforward column for next year's return. Specified credits (lines 4a through 4z) can offset tentative minimum tax; the others cannot.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status");
    if (!c.has("question_a")) c.out["question_a"] = false;
    // Part III rows.
    const credits = c.list("credits");
    const idx3 = new Map(PART3_ROWS.map((r, i) => [r.line, i]));
    const rows3: Array<Record<string, number | string | boolean | undefined> & { _n: number; _allowed?: number }> = PART3_ROWS.map(() => ({ _n: 0 }));
    let anyTransfer = false;
    for (const r of credits) {
      const line = norm(r["line"]);
      const i = idx3.get(line);
      if (i === undefined || TOTAL_LINES.has(line)) {
        c.warn(`credits row with line "${String(r["line"] ?? "")}" does not match a Part III line (1a-1zz, 3, 4a-4z); it was ignored.`);
        continue;
      }
      const row = rows3[i]!;
      row._n += 1;
      for (const k of ["passive", "nonpassive", "transfer", "epe", "epe_applied"]) if (r[k] !== undefined) row[k] = (Number(row[k] ?? 0) || 0) + num(r, k);
      if (r["passive_allowed"] !== undefined) row._allowed = (row._allowed ?? 0) + num(r, "passive_allowed");
      if (r["count"] !== undefined) row["count"] = (Number(row["count"] ?? 0) || 0) + num(r, "count");
      for (const k of ["registration", "ein"]) if (r[k] !== undefined && r[k] !== "") row[k] = row[k] === undefined || row[k] === r[k] ? String(r[k]) : "";
      if (num(r, "transfer") !== 0) anyTransfer = true;
    }
    const part3: ListRow[] = PART3_ROWS.map((spec, i) => {
      const row = rows3[i]!;
      if (TOTAL_LINES.has(spec.line) || row._n === 0) return {};
      if (row._n > 1) {
        if (row["count"] === undefined) row["count"] = row._n;
        c.warn(`Part III line ${spec.line} combines ${row._n} items: complete Part V (not prepared here) with the breakdown.`);
      }
      const passive = Number(row["passive"] ?? 0) || 0;
      const allowed = row._allowed ?? passive;
      if (row._allowed !== undefined && row._allowed > passive) c.warn(`Part III line ${spec.line}: passive_allowed exceeds the passive credit in column (d).`);
      const combined = allowed + (Number(row["nonpassive"] ?? 0) || 0) + (Number(row["transfer"] ?? 0) || 0);
      const epe = Number(row["epe"] ?? 0) || 0;
      const out: ListRow = { count: row["count"] as number | undefined, registration: row["registration"] as string | undefined, ein: row["ein"] as string | undefined, passive: row["passive"] as number | undefined, nonpassive: row["nonpassive"] as number | undefined, transfer: row["transfer"] as number | undefined, combined, epe: row["epe"] as number | undefined, epe_applied: row["epe_applied"] as number | undefined };
      if (epe > 0) out["net_epe"] = Math.min(epe, Math.max(0, combined - (Number(row["epe_applied"] ?? 0) || 0)));
      return out;
    });
    const sum3 = (g: string | string[], k: string) => PART3_ROWS.reduce((a, spec, i) => ((Array.isArray(g) ? g : [g]).includes(group(spec.line)) ? a + (Number(part3[i]![k] ?? 0) || 0) : a), 0);
    const allowed3 = (g: string) => PART3_ROWS.reduce((a, spec, i) => (group(spec.line) === g ? a + (rows3[i]!._allowed ?? (Number(part3[i]![`passive`] ?? 0) || 0)) : a), 0);
    const anyAllowed3 = (g: string) => PART3_ROWS.some((spec, i) => group(spec.line) === g && rows3[i]!._allowed !== undefined);
    const totals3 = (line: string, groups: string[]) => {
      const i = idx3.get(line)!;
      const t: ListRow = {};
      for (const k of ["passive", "nonpassive", "transfer", "combined", "epe", "epe_applied", "net_epe"]) {
        const v = sum3(groups, k);
        if (v !== 0) t[k] = v;
      }
      part3[i] = t;
    };
    totals3("2", ["1"]);
    totals3("5", ["4"]);
    totals3("6", ["1", "3", "4"]);
    c.out["part3"] = part3;
    if (ctx.year === 2025 && !c.has("question_b")) c.out["question_b"] = anyTransfer;
    // Part IV rows.
    const carry = c.list("carryovers");
    const idx4 = new Map(PART4_ROWS.map((r, i) => [r.line, i]));
    const rows4: ListRow[] = PART4_ROWS.map(() => ({}));
    const counts4: number[] = PART4_ROWS.map(() => 0);
    const pending: Array<{ i: number; year: number; amount: number }> = [];
    for (const r of carry) {
      const line = norm(r["line"]);
      const i = idx4.get(line);
      if (i === undefined || TOTAL_LINES.has(line)) {
        c.warn(`carryovers row with line "${String(r["line"] ?? "")}" does not match a Part IV line (1a-1zz, 2a-2zz, 3, 4a-4z); it was ignored.`);
        continue;
      }
      const row = rows4[i]!;
      counts4[i] = (counts4[i] ?? 0) + 1;
      for (const k of ["passive_before", "passive_after", "nonpassive", "applied", "recaptured"]) if (r[k] !== undefined) row[k] = (Number(row[k] ?? 0) || 0) + num(r, k);
      if (r["count"] !== undefined) row["count"] = (Number(row["count"] ?? 0) || 0) + num(r, "count");
      for (const k of ["year", "ein"]) if (r[k] !== undefined && r[k] !== "") row[k] = row[k] === undefined || row[k] === r[k] ? String(r[k]) : "";
      if (r["applied"] === undefined) pending.push({ i, year: Number(r["year"]) || 0, amount: num(r, "passive_after") + num(r, "nonpassive") - num(r, "recaptured") });
    }
    PART4_ROWS.forEach((spec, i) => {
      if ((counts4[i] ?? 0) > 1) {
        if (rows4[i]!["count"] === undefined) rows4[i]!["count"] = counts4[i];
        c.warn(`Part IV line ${spec.line} combines ${counts4[i]} carryovers: complete Part VI (not prepared here) with the breakdown by year.`);
      }
    });
    const sum4 = (groups: string[], k: string) => PART4_ROWS.reduce((a, spec, i) => (groups.includes(group(spec.line)) ? a + (Number(rows4[i]![k] ?? 0) || 0) : a), 0);
    // Part I.
    const l1 = c.set("line1", sum3("1", "nonpassive") + sum3("1", "transfer"), "Non-passive current-year credits", "Part III line 2: (e) + (f)", "1");
    const l2 = c.set("line2", sum3("1", "passive") + sum4(["1", "2"], "passive_before"), "Passive current-year credits and carryovers", `Part III ${f(sum3("1", "passive"))} + Part IV ${f(sum4(["1", "2"], "passive_before"))}`, "2");
    let l3 = c.n("line3");
    if (!c.has("line3")) {
      l3 = anyAllowed3("1") || carry.length ? allowed3("1") + sum4(["1", "2"], "passive_after") : l2;
      if (l2 > 0 && !anyAllowed3("1") && sum3("1", "passive") > 0) c.warn("Line 3 assumes the passive credits on line 2 are fully allowed; supply passive_allowed on each passive credit row (from Form 8582-CR) or line3 directly.");
      c.set("line3", l3, "Passive credits allowed", anyAllowed3("1") || carry.length ? "passive_allowed amounts + Part IV column (e)" : "= line 2 (assumed fully allowed)", "3");
    }
    let l4 = c.n("line4");
    if (!c.has("line4")) l4 = c.set("line4", sum4(["1", "2"], "nonpassive"), "Non-passive carryforwards", "Part IV line 6 column (f)", "4");
    const l6 = c.set("line6", l1 + l3 + l4 + c.n("line5"), "Credits before the limitation", `${f(l1)} + ${f(l3)} + ${f(l4)} + ${f(c.n("line5"))}`, "6");
    // Part II, Section A.
    const l7 = c.n("line7");
    const l9 = c.set("line9", l7 + c.n("line8"), "Regular tax plus AMT", `${f(l7)} + ${f(c.n("line8"))}`, "9");
    const l10c = c.set("line10c", c.n("line10a") + c.n("line10b"), "Credits ahead of the general business credit", `${f(c.n("line10a"))} + ${f(c.n("line10b"))}`, "10c");
    const l11 = c.set("line11", Math.max(0, l9 - l10c), "Net income tax", `max(0, ${f(l9)} - ${f(l10c)})`, "11");
    const l12 = c.set("line12", Math.max(0, l7 - l10c), "Net regular tax", `max(0, ${f(l7)} - ${f(l10c)})`, "12");
    const floor = status === "mfs" ? 12500 : 25000;
    const l13 = c.set("line13", 0.25 * Math.max(0, l12 - floor), "25% of net regular tax over the threshold", `25% x max(0, ${f(l12)} - ${f(floor)})`, "13");
    const l14 = c.n("line14");
    if (l6 > 0 && !c.has("line14")) c.warn("Line 14 (tentative minimum tax, Form 6251 line 9) was not supplied and is treated as zero; the allowed credit may be overstated.");
    const l15 = c.set("line15", Math.max(l13, l14), "Greater of line 13 or line 14", `max(${f(l13)}, ${f(l14)})`, "15");
    const l16 = c.set("line16", Math.max(0, l11 - l15), "Tax available for the credit", `max(0, ${f(l11)} - ${f(l15)})`, "16");
    const l17 = c.set("line17", Math.min(l6, l16), "Credit allowed after the section 38(c)(1) limit", `min(${f(l6)}, ${f(l16)})`, "17");
    // Section B: empowerment zone credit (Form 8844, line 3).
    const l22 = c.set("line22", sum3("3", "nonpassive") + sum3("3", "transfer") + sum4(["3"], "nonpassive"), "Non-passive empowerment zone credit", "Part III line 3 (e)+(f) + Part IV line 3 (f)", "22");
    const l23 = c.set("line23", sum3("3", "passive") + sum4(["3"], "passive_before"), "Passive empowerment zone credit", "Part III line 3 (d) + Part IV line 3 (d)", "23");
    let l24 = c.n("line24");
    if (!c.has("line24") && l23 > 0) {
      l24 = anyAllowed3("3") ? allowed3("3") + sum4(["3"], "passive_after") : l23;
      c.set("line24", l24, "Passive empowerment zone credit allowed", anyAllowed3("3") ? "passive_allowed + Part IV (e)" : "= line 23 (assumed fully allowed)", "24");
    }
    let l26 = 0;
    if (l22 !== 0 || l24 !== 0) {
      const l18 = c.set("line18", 0.75 * l14, "75% of tentative minimum tax", `${f(l14)} x 75%`, "18");
      const l19 = c.set("line19", Math.max(l13, l18), "Greater of line 13 or line 18", `max(${f(l13)}, ${f(l18)})`, "19");
      const l20 = c.set("line20", Math.max(0, l11 - l19), "Line 11 minus line 19", `max(0, ${f(l11)} - ${f(l19)})`, "20");
      const l21 = c.set("line21", Math.max(0, l20 - l17), "Line 20 minus line 17", `max(0, ${f(l20)} - ${f(l17)})`, "21");
      const l25 = c.set("line25", l22 + l24, "Empowerment zone credit before the limit", `${f(l22)} + ${f(l24)}`, "25");
      l26 = Math.min(l21, l25);
    }
    c.set("line26", l26, "Empowerment zone credit allowed", l22 !== 0 || l24 !== 0 ? "min(21, 25)" : "no Form 8844 credit", "26");
    // Section C: specified credits (lines 4a through 4z).
    const l27 = c.set("line27", Math.max(0, l11 - l13), "Line 11 minus line 13", `max(0, ${f(l11)} - ${f(l13)})`, "27");
    const l28 = c.set("line28", l17 + l26, "Lines 17 and 26", `${f(l17)} + ${f(l26)}`, "28");
    const l29 = c.set("line29", Math.max(0, l27 - l28), "Tax available for specified credits", `max(0, ${f(l27)} - ${f(l28)})`, "29");
    const l30 = c.set("line30", sum3("4", "nonpassive") + sum3("4", "transfer"), "Non-passive specified credits", "Part III line 5 (e) + (f)", "30");
    const l32 = c.set("line32", sum3("4", "passive") + sum4(["4"], "passive_before"), "Passive specified credits", "Part III line 5 (d) + Part IV line 5 (d)", "32");
    let l33 = c.n("line33");
    if (!c.has("line33")) {
      l33 = anyAllowed3("4") || carry.length ? allowed3("4") + sum4(["4"], "passive_after") : l32;
      if (l32 > 0 && !anyAllowed3("4") && sum3("4", "passive") > 0) c.warn("Line 33 assumes the passive specified credits on line 32 are fully allowed; supply passive_allowed on those rows or line33 directly.");
      c.set("line33", l33, "Passive specified credits allowed", anyAllowed3("4") || carry.length ? "passive_allowed amounts + Part IV column (e)" : "= line 32 (assumed fully allowed)", "33");
    }
    let l34 = c.n("line34");
    if (!c.has("line34")) l34 = c.set("line34", sum4(["4"], "nonpassive"), "Specified credit carryforwards", "Part IV line 5 column (f)", "34");
    const l36 = c.set("line36", l30 + l33 + l34 + c.n("line35"), "Specified credits before the limit", `${f(l30)} + ${f(l33)} + ${f(l34)} + ${f(c.n("line35"))}`, "36");
    const l37 = c.set("line37", Math.min(l29, l36), "Specified credits allowed", `min(${f(l29)}, ${f(l36)})`, "37");
    const l38 = c.set("line38", l28 + l37, "General business credit allowed", `${f(l28)} + ${f(l37)}`, "38");
    const requested = l6 + (l22 + l24) + l36;
    if (l38 < requested) c.warn(`Only ${f(l38)} of the ${f(requested)} in credits is allowed this year; the unused ${f(requested - l38)} carries forward (Part IV column (i) next year).`);
    // Part IV column (g): carryforwards are used before current-year credits, oldest year first.
    let capacity = l38;
    for (const p of pending.sort((a, b) => a.year - b.year)) {
      const use = Math.max(0, Math.min(p.amount, capacity));
      rows4[p.i]!["applied"] = (Number(rows4[p.i]!["applied"] ?? 0) || 0) + use;
      capacity -= use;
    }
    if (pending.length && l38 > 0) c.warn("Part IV column (g) was allocated by the engine (carryforwards applied before current-year credits, oldest year first); supply `applied` on each carryovers row to override.");
    const part4: ListRow[] = PART4_ROWS.map((spec, i) => {
      if (TOTAL_LINES.has(spec.line)) return {};
      const row = rows4[i]!;
      if (Object.keys(row).length === 0) return {};
      const cf = Math.max(0, (Number(row["passive_after"] ?? 0) || 0) + (Number(row["nonpassive"] ?? 0) || 0) - (Number(row["applied"] ?? 0) || 0) - (Number(row["recaptured"] ?? 0) || 0));
      return { ...row, carryforward: cf };
    });
    const totals4 = (line: string, groups: string[]) => {
      const i = idx4.get(line)!;
      const t: ListRow = {};
      for (const k of ["passive_before", "passive_after", "nonpassive", "applied", "recaptured", "carryforward"]) {
        const v = PART4_ROWS.reduce((a, spec, j) => (groups.includes(group(spec.line)) ? a + (Number(part4[j]![k] ?? 0) || 0) : a), 0);
        if (v !== 0) t[k] = v;
      }
      part4[i] = t;
    };
    totals4("5", ["4"]);
    totals4("6", ["1", "2"]);
    totals4("7", ["1", "2", "3", "4"]);
    c.out["part4"] = part4;
    if (!credits.length && !carry.length) c.warn("No credits or carryovers rows were supplied; Part III and Part IV are empty.");
    return c.result();
  },
};
