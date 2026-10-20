import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

/** 2025 zero-pads single-digit widget numbers (f1_01) and names table rows "RowN"; 2024 uses f1_1 and "BodyRowN". */
const w = (year: TaxYear, n: number) => `f1_${year === 2025 && n < 10 ? `0${n}` : n}`;
const plain = (n: number) => ({ names: { 2024: `Page1[0].${w(2024, n)}[0]`, 2025: `Page1[0].${w(2025, n)}[0]` } });
const row = (year: TaxYear, table: string, r: number, n: number) => `Page1[0].Table_Line${table}[0].${year === 2025 ? "Row" : "BodyRow"}${r}[0].${w(year, n)}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: plain(n), ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });
/** listLocate for a table: items in column order, `start` the first widget number of row 1, `width` widgets per row. */
const table = (tbl: string, items: string[], start: number, width: number, rows: number) => {
  const out: Partial<Record<TaxYear, Record<string, string[]>>> = {};
  for (const year of [2024, 2025] as const) {
    out[year] = Object.fromEntries(items.map((item, col) => [item, Array.from({ length: rows }, (_, r) => row(year, tbl, r + 1, start + r * width + col))]));
  }
  return out;
};

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on tax return", type: "text", locate: plain(1) },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: plain(2) },
  { id: "box_a", line: "A", label: "Mixed straddle election", type: "checkbox", locate: { name: "Page1[0].Checkbox_ReadOrder[0].c1_1[0]" } },
  { id: "box_b", line: "B", label: "Straddle-by-straddle identification election", type: "checkbox", locate: { name: "Page1[0].Checkbox_ReadOrder[0].c1_2[0]" } },
  { id: "box_c", line: "C", label: "Mixed straddle account election", type: "checkbox", locate: { name: "Page1[0].c1_3[0]" } },
  { id: "box_d", line: "D", label: "Net section 1256 contracts loss election (carry the loss back 3 years)", type: "checkbox", locate: { name: "Page1[0].c1_4[0]" } },
  {
    id: "contracts",
    line: "1",
    label: "Part I: section 1256 contracts marked to market (regulated futures, foreign currency contracts, nonequity options, dealer equity options): each account or contract with its loss and gain, usually from Form 1099-B boxes 8 through 11 (up to 3 rows)",
    type: "list",
    rows: 3,
    items: [
      { id: "account", label: "(a) Identification of account", type: "text" },
      { id: "loss", label: "(b) Loss (as a positive number)", type: "money" },
      { id: "gain", label: "(c) Gain", type: "money" },
    ],
    listLocate: table("1", ["account", "loss", "gain"], 3, 3, 3),
  },
  comp("line2_loss", "2(b)", "Total of line 1 column (b) losses", 12, "sum of column (b)"),
  comp("line2_gain", "2(c)", "Total of line 1 column (c) gains", 13, "sum of column (c)"),
  comp("line3", "3", "Net gain or (loss). Combine line 2 columns (b) and (c)", 14, "2(c) - 2(b)"),
  money("line4", "4", "Form 1099-B adjustments (attach a statement)", 15),
  comp("line5", "5", "Combine lines 3 and 4", 16, "3 + 4"),
  money("line6", "6", "If you checked box D and line 5 is a loss: the amount of loss to carry back (as a positive number)", 17, { notes: "Limited to the smaller of the line 5 loss or the net section 1256 contract gains of the three prior years." }),
  comp("line7", "7", "Combine lines 5 and 6", 18, "5 + 6"),
  comp("line8", "8", "Short-term capital gain or (loss). Multiply line 7 by 40%; to Schedule D line 4", 19, "40% of line 7", { alwaysShow: true }),
  comp("line9", "9", "Long-term capital gain or (loss). Multiply line 7 by 60%; to Schedule D line 11", 20, "60% of line 7", { alwaysShow: true }),
  {
    id: "straddle_losses",
    line: "10",
    label: "Part II Section A: losses from straddles (up to 2 rows)",
    type: "list",
    rows: 2,
    items: [
      { id: "description", label: "(a) Description of property", type: "text" },
      { id: "date_entered", label: "(b) Date entered into or acquired", type: "text" },
      { id: "date_closed", label: "(c) Date closed out or sold", type: "text" },
      { id: "sales_price", label: "(d) Gross sales price", type: "money" },
      { id: "cost", label: "(e) Cost or other basis plus expense of sale", type: "money" },
      { id: "loss", label: "(f) Loss: (e) minus (d), when positive", type: "money", computed: true },
      { id: "unrecognized_gain", label: "(g) Unrecognized gain on offsetting positions", type: "money" },
      { id: "recognized_loss", label: "(h) Recognized loss: (f) minus (g), when positive", type: "money", computed: true },
      { id: "long_term", label: "Held more than one year (long-term)", type: "checkbox" },
    ],
    listLocate: table("10", ["description", "date_entered", "date_closed", "sales_price", "cost", "loss", "unrecognized_gain", "recognized_loss"], 21, 8, 2),
  },
  comp("line11a", "11a", "Short-term portion of the losses on line 10 column (h); to Schedule D line 4 (as a loss)", 37, "column (h) rows not marked long_term", { alwaysShow: true }),
  comp("line11b", "11b", "Long-term portion of the losses on line 10 column (h); to Schedule D line 11 (as a loss)", 38, "column (h) rows marked long_term", { alwaysShow: true }),
  {
    id: "straddle_gains",
    line: "12",
    label: "Part II Section B: gains from straddles (up to 2 rows)",
    type: "list",
    rows: 2,
    items: [
      { id: "description", label: "(a) Description of property", type: "text" },
      { id: "date_entered", label: "(b) Date entered into or acquired", type: "text" },
      { id: "date_closed", label: "(c) Date closed out or sold", type: "text" },
      { id: "sales_price", label: "(d) Gross sales price", type: "money" },
      { id: "cost", label: "(e) Cost or other basis plus expense of sale", type: "money" },
      { id: "gain", label: "(f) Gain: (d) minus (e), when positive", type: "money", computed: true },
      { id: "long_term", label: "Held more than one year (long-term)", type: "checkbox" },
    ],
    listLocate: table("12", ["description", "date_entered", "date_closed", "sales_price", "cost", "gain"], 39, 6, 2),
  },
  comp("line13a", "13a", "Short-term portion of the gains on line 12 column (f); to Schedule D line 4", 51, "column (f) rows not marked long_term", { alwaysShow: true }),
  comp("line13b", "13b", "Long-term portion of the gains on line 12 column (f); to Schedule D line 11", 52, "column (f) rows marked long_term", { alwaysShow: true }),
  {
    id: "unrecognized_gains",
    line: "14",
    label: "Part III: unrecognized gains from positions held on the last business day of the tax year (up to 3 rows)",
    type: "list",
    rows: 3,
    items: [
      { id: "description", label: "(a) Description of property", type: "text" },
      { id: "date_acquired", label: "(b) Date acquired", type: "text" },
      { id: "fmv", label: "(c) Fair market value on the last business day of the tax year", type: "money" },
      { id: "cost", label: "(d) Cost or other basis as adjusted", type: "money" },
      { id: "unrecognized_gain", label: "(e) Unrecognized gain: (c) minus (d), when positive", type: "money", computed: true },
    ],
    listLocate: table("14", ["description", "date_acquired", "fmv", "cost", "unrecognized_gain"], 53, 5, 3),
  },
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
const truthy = (v: unknown) => v === true || v === 1 || (typeof v === "string" && /^(true|yes|y|1|x)$/i.test(v));

export const form6781: FormDef = {
  id: "f6781",
  title: "Form 6781, Gains and Losses From Section 1256 Contracts and Straddles",
  shortTitle: "Form 6781",
  description: "Marks section 1256 contracts (regulated futures, broad-based index options, foreign currency contracts) to market with the 60/40 long-term/short-term split, and reports straddle losses, gains, and unrecognized gains. The results flow to Schedule D lines 4 and 11.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f6781.pdf",
  notes: `**Who files.** Anyone with Form 1099-B box 8 through 11 amounts (aggregate profit or loss on section 1256 contracts), open section 1256 positions at year end, or straddle positions.

**What the engine computes.** Line 2 totals, lines 3, 5, 7, the 40% short-term (line 8) and 60% long-term (line 9) split, the straddle loss (f), recognized loss (h), and gain (f) columns, lines 11a/11b and 13a/13b from the long_term flag on each row, and the unrecognized gain column in Part III. In a full return lines 8, 11a, and 13a go to Schedule D line 4 and lines 9, 11b, and 13b to line 11.

**What to verify.** The box D carryback election (line 6) is only available for a net section 1256 loss and is limited to prior-year section 1256 gains; losses carried back need amended returns. Straddle rules (Part II) and the mixed straddle elections (boxes A through C) are specialized; confirm the holding-period flags and offsetting-position amounts against your records.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const contracts = c.list("contracts");
    if (contracts.length > 3) c.warn("More than 3 section 1256 accounts: only the first 3 print; attach a statement with the rest.");
    const loss = contracts.reduce((a, r) => a + Math.abs(num(r, "loss")), 0);
    const gain = contracts.reduce((a, r) => a + num(r, "gain"), 0);
    c.set("line2_loss", loss, "Total section 1256 losses", `sum of ${contracts.length} row(s), column (b)`, "2(b)");
    c.set("line2_gain", gain, "Total section 1256 gains", `sum of ${contracts.length} row(s), column (c)`, "2(c)");
    const l3 = c.set("line3", gain - loss, "Net section 1256 gain or (loss)", `${f(gain)} - ${f(loss)}`, "3");
    const l5 = c.set("line5", l3 + c.n("line4"), "After Form 1099-B adjustments", `${f(l3)} + ${f(c.n("line4"))}`, "5");
    let l6 = Math.abs(c.n("line6"));
    if (l6 > 0 && !c.bool("box_d")) {
      c.warn("Line 6 (loss carryback) requires box D (net section 1256 contracts loss election); line 6 is ignored.");
      l6 = 0;
      c.out["line6"] = 0;
    }
    if (l6 > 0 && l5 >= 0) {
      c.warn("Line 6 applies only when line 5 is a loss; it is ignored.");
      l6 = 0;
      c.out["line6"] = 0;
    }
    if (l6 > Math.abs(l5)) {
      c.warn(`Line 6 (${f(l6)}) cannot exceed the line 5 loss (${f(Math.abs(l5))}); it is limited.`);
      l6 = Math.abs(l5);
      c.out["line6"] = l6;
    }
    const l7 = c.set("line7", l5 + l6, "Net gain or (loss) after carryback", `${f(l5)} + ${f(l6)}`, "7");
    const l8 = c.set("line8", l7 * 0.4, "Short-term 40%", `${f(l7)} x 40%`, "8");
    c.set("line9", l7 - l8, "Long-term 60%", `${f(l7)} - ${f(l8)}`, "9");
    const losses = c.list("straddle_losses");
    const gains = c.list("straddle_gains");
    const open = c.list("unrecognized_gains");
    if (losses.length > 2) c.warn("More than 2 straddle loss rows: only the first 2 print; attach a statement.");
    if (gains.length > 2) c.warn("More than 2 straddle gain rows: only the first 2 print; attach a statement.");
    if (open.length > 3) c.warn("More than 3 unrecognized-gain rows: only the first 3 print; attach a statement.");
    const outLosses: ListRow[] = losses.map((r) => {
      const lossF = Math.max(0, num(r, "cost") - num(r, "sales_price"));
      return { ...r, loss: lossF, recognized_loss: Math.max(0, lossF - num(r, "unrecognized_gain")) };
    });
    const outGains: ListRow[] = gains.map((r) => ({ ...r, gain: Math.max(0, num(r, "sales_price") - num(r, "cost")) }));
    const outOpen: ListRow[] = open.map((r) => ({ ...r, unrecognized_gain: Math.max(0, num(r, "fmv") - num(r, "cost")) }));
    c.out["straddle_losses"] = outLosses;
    c.out["straddle_gains"] = outGains;
    c.out["unrecognized_gains"] = outOpen;
    const part = (rows: ListRow[], k: string, lt: boolean) => rows.filter((r) => truthy(r["long_term"]) === lt).reduce((a, r) => a + num(r, k), 0);
    c.set("line11a", part(outLosses, "recognized_loss", false), "Short-term straddle losses", "column (h), short-term rows", "11a");
    c.set("line11b", part(outLosses, "recognized_loss", true), "Long-term straddle losses", "column (h), long-term rows", "11b");
    c.set("line13a", part(outGains, "gain", false), "Short-term straddle gains", "column (f), short-term rows", "13a");
    c.set("line13b", part(outGains, "gain", true), "Long-term straddle gains", "column (f), long-term rows", "13b");
    if ((losses.length || gains.length) && !c.bool("box_a") && !c.bool("box_b") && !c.bool("box_c")) c.warn("Straddle positions are reported in Part II: check any election that applies (box_a mixed straddle, box_b straddle-by-straddle identification, box_c mixed straddle account).");
    return c.result();
  },
};
