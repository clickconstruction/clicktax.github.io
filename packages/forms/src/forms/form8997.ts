import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListItemDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const pad = (n: number) => String(n).padStart(2, "0");
const P1 = (n: number) => `Page1[0].f1_${pad(n)}[0]`;
const P2 = (n: number) => `Page2[0].f2_${pad(n)}[0]`;
const T = (page: 1 | 2, part: number, base: number, col: number, rows = 5) => Array.from({ length: rows }, (_, r) => `Page${page}[0].Table_Part${part}[0].Row${r + 1}[0].f${page}_${pad(base + r * 6 + col)}[0]`);
const cols = (page: 1 | 2, part: number, base: number) => both({ ein: T(page, part, base, 0), date: T(page, part, base, 1), description: T(page, part, base, 2), code: T(page, part, base, 3), short_term: T(page, part, base, 4), long_term: T(page, part, base, 5) });
const items = (dateLabel: string, descLabel: string, stLabel: string, ltLabel: string): ListItemDef[] => [
  { id: "ein", label: "(a) QOF EIN", type: "text", maxLen: 10 },
  { id: "date", label: dateLabel, type: "text", maxLen: 10 },
  { id: "description", label: descLabel, type: "text" },
  { id: "code", label: "(d) Special gain code (one letter, A through H), if any", type: "text", maxLen: 1 },
  { id: "short_term", label: stLabel, type: "money" },
  { id: "long_term", label: ltLabel, type: "money" },
];
const money = (id: string, line: string, label: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name }, ...extra });
const comp = (id: string, line: string, label: string, name: string, notes: string): FieldDef => money(id, line, label, name, { computed: true, notes });

const fields: FieldDef[] = [
  { id: "name", label: "Name", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Taxpayer identification number (TIN)", type: "text", maxLen: 11, locate: { name: P1(2) } },
  { id: "holdings_begin", line: "I", label: "Part I: QOF investments held at the beginning of the tax year due to deferrals (up to 5 rows)", type: "list", items: items("(b) Date QOF investment acquired (MM/DD/YYYY)", "(c) Description of QOF investment (for example, 100 shares or 25% interest)", "(e) Short-term deferred gain remaining in QOF", "(f) Long-term deferred gain remaining in QOF"), listLocate: cols(1, 1, 3) },
  money("part1_cont_short", "I-1", "Part I continuation sheet total: column (e)", P1(33)),
  money("part1_cont_long", "I-1", "Part I continuation sheet total: column (f)", P1(34)),
  comp("part1_short", "I-2", "Part I total short-term deferred gain held at the beginning of the year", P1(35), "sum of column (e) + continuation"),
  comp("part1_long", "I-2", "Part I total long-term deferred gain held at the beginning of the year", P1(36), "sum of column (f) + continuation"),
  { id: "deferred_gains", line: "II", label: "Part II: current-year capital gains deferred by investing in a QOF (up to 5 rows)", type: "list", items: items("(b) Date QOF investment acquired (MM/DD/YYYY)", "(c) Description of interest acquired", "(e) Short-term deferred gain invested in QOF", "(f) Long-term deferred gain invested in QOF"), listLocate: cols(1, 2, 37) },
  money("part2_cont_short", "II-1", "Part II continuation sheet total: column (e)", P1(67)),
  money("part2_cont_long", "II-1", "Part II continuation sheet total: column (f)", P1(68)),
  comp("part2_short", "II-2", "Part II total short-term gain deferred this year (report on Form 8949 with code Z)", P1(69), "sum of column (e) + continuation"),
  comp("part2_long", "II-2", "Part II total long-term gain deferred this year (report on Form 8949 with code Z)", P1(70), "sum of column (f) + continuation"),
  { id: "foreign_eligible", label: "Are you a foreign eligible taxpayer?", type: "yesno", locate: { yes: { name: "Page1[0].c1_1[0]" }, no: { name: "Page1[0].c1_1[1]" } } },
  { id: "treaty_waiver", label: "Foreign eligible taxpayers: do you irrevocably waive treaty benefits that would exempt the deferred gains from U.S. tax at inclusion?", type: "yesno", locate: { yes: { name: "Page1[0].c1_2[0]" }, no: { name: "Page1[0].c1_2[1]" } } },
  { id: "inclusion_events", line: "III", label: "Part III: inclusion events and other transfers during the year (up to 5 rows)", type: "list", items: items("(b) Date of event (MM/DD/YYYY)", "(c) Description of event (for example, sale of 100 shares, gift of 25% interest)", "(e) Previously deferred short-term gain now included in income", "(f) Previously deferred long-term gain now included in income"), listLocate: cols(2, 3, 1) },
  money("part3_cont_short", "III-1", "Part III continuation sheet total: column (e)", P2(31)),
  money("part3_cont_long", "III-1", "Part III continuation sheet total: column (f)", P2(32)),
  comp("part3_short", "III-2", "Part III total short-term gain now included (report on Form 8949 with code Y)", P2(33), "sum of column (e) + continuation"),
  comp("part3_long", "III-2", "Part III total long-term gain now included (report on Form 8949 with code Y)", P2(34), "sum of column (f) + continuation"),
  { id: "no_1099b", label: "Check if you disposed of an investment and did not receive a Form 1099-B for the disposition", type: "checkbox", locate: { name: "Page2[0].c2_3[0]" } },
  { id: "holdings_end", line: "IV", label: "Part IV: QOF investments held at year end due to deferrals (up to 5 rows; built from Parts I and II when omitted and there were no inclusion events)", type: "list", items: items("(b) Date QOF investment acquired (MM/DD/YYYY)", "(c) Description of interest acquired", "(e) Short-term deferred gain invested in QOF", "(f) Long-term deferred gain invested in QOF"), listLocate: cols(2, 4, 35) },
  money("part4_cont_short", "IV-1", "Part IV continuation sheet total: column (e)", P2(65)),
  money("part4_cont_long", "IV-1", "Part IV continuation sheet total: column (f)", P2(66)),
  comp("part4_short", "IV-2", "Part IV total short-term deferred gain held at year end", P2(67), "sum of column (e) + continuation"),
  comp("part4_long", "IV-2", "Part IV total long-term deferred gain held at year end", P2(68), "sum of column (f) + continuation"),
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;

export const form8997: FormDef = {
  id: "f8997",
  title: "Form 8997, Initial and Annual Statement of Qualified Opportunity Fund (QOF) Investments",
  shortTitle: "Form 8997",
  description: "The annual statement of qualified opportunity fund investments: holdings at the start of the year, gains deferred this year, inclusion events, and holdings at year end, with the short-term and long-term totals of each part.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8997.pdf",
  notes: `**Who files.** Anyone who held a QOF investment at any time during the year (because an eligible gain was deferred under section 1400Z-2) files Form 8997 with a timely return, including the year of acquisition and every year until the investment is disposed of or December 31, 2026, whichever is earlier.

**What the engine computes.** The line 2 totals of each part (columns (e) and (f), including continuation sheet amounts). When Part IV is omitted and there were no inclusion events, it repeats Parts I and II. A reconciliation warning appears when Part IV does not equal Part I plus Part II minus Part III.

**What to verify.** Deferral elections (Part II) are also reported on Form 8949 with code Z, and inclusion events (Part III) with code Y; neither is placed automatically. The deferred gain is included in income no later than the 2026 tax year even without a sale. Special gain codes: A section 1256, B section 1231, C straddles, D collectibles, E treaty-exempt, F noninclusion transfer, G 5-year basis adjustment, H 7-year basis adjustment.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const parts: Array<[string, string, string, string]> = [
      ["holdings_begin", "part1", "I", "Part I"],
      ["deferred_gains", "part2", "II", "Part II"],
      ["inclusion_events", "part3", "III", "Part III"],
      ["holdings_end", "part4", "IV", "Part IV"],
    ];
    const begin = c.list("holdings_begin");
    const deferred = c.list("deferred_gains");
    const events = c.list("inclusion_events");
    let end = c.list("holdings_end");
    if (!end.length && (begin.length || deferred.length) && !events.length) {
      end = [...begin, ...deferred].map((r) => ({ ...r }));
      c.out["holdings_end"] = end;
      if (end.length > 5) c.warn("Part IV has more than 5 rows: only the first 5 print; attach a continuation sheet.");
    }
    const lists: Record<string, ListRow[]> = { holdings_begin: begin, deferred_gains: deferred, inclusion_events: events, holdings_end: end };
    const totals: Record<string, [number, number]> = {};
    for (const [listId, prefix, roman, title] of parts) {
      const rows = lists[listId] ?? [];
      if (rows.length > 5) c.warn(`${title} has more than 5 rows: only the first 5 print; put the rest on a continuation sheet and enter its totals on line 1.`);
      const st = rows.reduce((a, r) => a + num(r, "short_term"), 0) + c.n(`${prefix}_cont_short`);
      const lt = rows.reduce((a, r) => a + num(r, "long_term"), 0) + c.n(`${prefix}_cont_long`);
      c.set(`${prefix}_short`, st, `${title} total short-term deferred gain`, `rows ${f(st - c.n(`${prefix}_cont_short`))} + continuation ${f(c.n(`${prefix}_cont_short`))}`, `${roman}-2`);
      c.set(`${prefix}_long`, lt, `${title} total long-term deferred gain`, `rows ${f(lt - c.n(`${prefix}_cont_long`))} + continuation ${f(c.n(`${prefix}_cont_long`))}`, `${roman}-2`);
      totals[prefix] = [st, lt];
    }
    const t = (k: string): [number, number] => totals[k] ?? [0, 0];
    const expSt = t("part1")[0] + t("part2")[0] - t("part3")[0];
    const expLt = t("part1")[1] + t("part2")[1] - t("part3")[1];
    if (end.length && (Math.abs(expSt - t("part4")[0]) > 1 || Math.abs(expLt - t("part4")[1]) > 1)) c.warn(`Part IV totals (${f(t("part4")[0])} short-term, ${f(t("part4")[1])} long-term) do not equal Part I + Part II - Part III (${f(expSt)}, ${f(expLt)}); attach an explanation.`);
    if (deferred.length) c.warn("Report each Part II deferral on Form 8949 as a separate row with code Z and the deferred gain as a negative adjustment.");
    if (events.length) c.warn("Report each Part III inclusion event on Form 8949 with code Y; the included gain keeps its original short-term or long-term character.");
    if (c.has("foreign_eligible") && c.bool("foreign_eligible") && !c.bool("treaty_waiver")) c.warn("A foreign eligible taxpayer may not defer gain by investing in a QOF without waiving treaty benefits (answer Yes to the waiver question).");
    return c.result();
  },
};
