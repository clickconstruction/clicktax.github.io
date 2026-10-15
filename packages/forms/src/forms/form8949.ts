import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

/** Rows per part: 14 on the 2024 form, 11 on the 2025 form (which added the 1099-DA boxes). */
export const ROWS_8949: Record<TaxYear, number> = { 2024: 14, 2025: 11 };
const COLS = ["description", "date_acquired", "date_sold", "proceeds", "cost", "code", "adjustment", "gain"] as const;
const pad = (n: number, year: TaxYear) => (year === 2025 ? String(n).padStart(2, "0") : String(n));
const cell = (year: TaxYear, page: 1 | 2, row: number, col: number) => {
  const table = year === 2025 ? `Table_Line1_Part${page}` : "Table_Line1";
  return `Page${page}[0].${table}[0].Row${row}[0].f${page}_${pad(3 + 8 * (row - 1) + col, year)}[0]`;
};
const total = (year: TaxYear, page: 1 | 2, col: number) => `Page${page}[0].f${page}_${pad((year === 2025 ? 91 : 115) + col, year)}[0]`;
const listLocate = (page: 1 | 2) => {
  const out: Partial<Record<TaxYear, Record<string, string[]>>> = {};
  for (const year of [2024, 2025] as const) {
    const rows = Array.from({ length: ROWS_8949[year] }, (_, i) => i + 1);
    out[year] = Object.fromEntries(COLS.map((c, ci) => [c, rows.map((r) => cell(year, page, r, ci))]));
  }
  return out;
};
const items: FieldDef["items"] = [
  { id: "description", label: "(a) Description of property (e.g. 100 sh. XYZ Co.)", type: "text" },
  { id: "date_acquired", label: "(b) Date acquired (Mo., day, yr.)", type: "text" },
  { id: "date_sold", label: "(c) Date sold or disposed of", type: "text" },
  { id: "proceeds", label: "(d) Proceeds (sales price)", type: "money" },
  { id: "cost", label: "(e) Cost or other basis", type: "money" },
  { id: "code", label: "(f) Adjustment code(s) from the instructions", type: "text", maxLen: 6 },
  { id: "adjustment", label: "(g) Amount of adjustment (negative to reduce gain)", type: "money" },
  { id: "gain", label: "(h) Gain or (loss): (d) - (e) + (g)", type: "money", computed: true },
];
const boxLocate = (page: 1 | 2, letters: string[]) => Object.fromEntries(letters.map((l, i) => [l, i < 3 ? { name: `Page${page}[0].c${page}_1[${i}]` } : { names: { 2025: `Page${page}[0].c${page}_1[${i}]` } }]));

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { names: { 2024: ["Page1[0].f1_1[0]", "Page2[0].f2_1[0]"], 2025: ["Page1[0].f1_01[0]", "Page2[0].f2_01[0]"] } } },
  { id: "ssn", label: "Social security number or taxpayer identification number", type: "ssn", locate: { names: { 2024: ["Page1[0].f1_2[0]", "Page2[0].f2_2[0]"], 2025: ["Page1[0].f1_02[0]", "Page2[0].f2_02[0]"] } } },
  { id: "short_term_box", line: "Part I", label: "Short-term box: A (1099-B, basis reported), B (1099-B, basis not reported), C (no 1099-B/1099-DA, not digital assets); 2025 adds G (1099-DA, basis reported), H (1099-DA, basis not reported), I (digital assets with no 1099-DA)", type: "choice", choices: ["A", "B", "C", "G", "H", "I"], locate: boxLocate(1, ["A", "B", "C", "G", "H", "I"]) },
  { id: "short_term", line: "1", label: "Short-term transactions (one box per form; up to 14 rows in 2024, 11 in 2025)", type: "list", rows: 14, items, listLocate: listLocate(1) },
  { id: "line2_proceeds", line: "2", label: "Short-term totals: proceeds; to Schedule D line 1b, 2, or 3 column (d)", type: "money", computed: true, locate: { names: { 2024: total(2024, 1, 0), 2025: total(2025, 1, 0) } } },
  { id: "line2_cost", line: "2", label: "Short-term totals: cost, column (e)", type: "money", computed: true, locate: { names: { 2024: total(2024, 1, 1), 2025: total(2025, 1, 1) } } },
  { id: "line2_adjustment", line: "2", label: "Short-term totals: adjustments, column (g)", type: "money", computed: true, locate: { names: { 2024: total(2024, 1, 3), 2025: total(2025, 1, 3) } } },
  { id: "line2_gain", line: "2", label: "Short-term totals: gain or (loss), column (h)", type: "money", computed: true, alwaysShow: true, locate: { names: { 2024: total(2024, 1, 4), 2025: total(2025, 1, 4) } } },
  { id: "long_term_box", line: "Part II", label: "Long-term box: D (1099-B, basis reported), E (1099-B, basis not reported), F (no 1099-B/1099-DA, not digital assets); 2025 adds J (1099-DA, basis reported), K (1099-DA, basis not reported), L (digital assets with no 1099-DA)", type: "choice", choices: ["D", "E", "F", "J", "K", "L"], locate: boxLocate(2, ["D", "E", "F", "J", "K", "L"]) },
  { id: "long_term", line: "1", label: "Long-term transactions (one box per form; up to 14 rows in 2024, 11 in 2025)", type: "list", rows: 14, items, listLocate: listLocate(2) },
  { id: "line2_long_proceeds", line: "2", label: "Long-term totals: proceeds; to Schedule D line 8b, 9, or 10 column (d)", type: "money", computed: true, locate: { names: { 2024: total(2024, 2, 0), 2025: total(2025, 2, 0) } } },
  { id: "line2_long_cost", line: "2", label: "Long-term totals: cost, column (e)", type: "money", computed: true, locate: { names: { 2024: total(2024, 2, 1), 2025: total(2025, 2, 1) } } },
  { id: "line2_long_adjustment", line: "2", label: "Long-term totals: adjustments, column (g)", type: "money", computed: true, locate: { names: { 2024: total(2024, 2, 3), 2025: total(2025, 2, 3) } } },
  { id: "line2_long_gain", line: "2", label: "Long-term totals: gain or (loss), column (h)", type: "money", computed: true, alwaysShow: true, locate: { names: { 2024: total(2024, 2, 4), 2025: total(2025, 2, 4) } } },
];

export const form8949: FormDef = {
  id: "f8949",
  title: "Form 8949, Sales and Other Dispositions of Capital Assets",
  shortTitle: "Form 8949",
  description: "Each sale of stock, crypto, or other capital assets with dates, proceeds, basis, adjustment codes, and gain or loss, one box (A-C/G-I short-term, D-F/J-L long-term) per form, totaled for Schedule D.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8949.pdf",
  notes: `**One box per part per form.** Each Form 8949 holds one short-term box and one long-term box. Use a separate Form 8949 for each box you need (for example Box A sales and Box B sales), and the totals of each flow to the matching Schedule D row. Transactions on a 1099-B with basis reported and no adjustments may instead go straight on Schedule D lines 1a/8a without this form.

**What the engine computes.** Column (h) for every row (proceeds minus cost plus adjustment) and the line 2 totals for each part. In a full return, each supplied Form 8949's totals land on Schedule D lines 1b/2/3 or 8b/9/10 by box.

**What to verify.** Codes in column (f) (W wash sale, B basis wrong, etc.) and the matching adjustment in (g); the 2025 form adds boxes G/H/I and J/K/L for digital assets reported on Form 1099-DA; the 2024 form holds 14 rows per part, the 2025 form 11.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const cap = ROWS_8949[ctx.year];
    const rowMoney = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
    const part = (listId: string, prefix: string, label: string) => {
      const rows = c.list(listId);
      if (rows.length > cap) c.warn(`${label}: ${rows.length} rows supplied but the ${ctx.year} form holds ${cap}; the rest need another Form 8949.`);
      const out: ListRow[] = rows.map((r) => ({ ...r, gain: rowMoney(r, "proceeds") - rowMoney(r, "cost") + rowMoney(r, "adjustment") }));
      for (const [i, r] of out.entries()) if (rowMoney(r, "adjustment") !== 0 && !String(r["code"] ?? "").trim()) c.warn(`${label} row ${i + 1} has an adjustment without a code in column (f).`);
      c.out[listId] = out;
      const sum = (k: string) => out.slice(0, cap).reduce((a, r) => a + rowMoney(r, k), 0);
      c.set(`${prefix}proceeds`, sum("proceeds"), `${label} total proceeds`, "sum of column (d)", "2");
      c.set(`${prefix}cost`, sum("cost"), `${label} total cost`, "sum of column (e)", "2");
      c.set(`${prefix}adjustment`, sum("adjustment"), `${label} total adjustments`, "sum of column (g)", "2");
      c.set(`${prefix}gain`, sum("gain"), `${label} total gain or (loss)`, "sum of column (h)", "2");
      return out.length;
    };
    const st = part("short_term", "line2_", "Short-term");
    const lt = part("long_term", "line2_long_", "Long-term");
    if (st && !c.has("short_term_box")) c.warn("Short-term transactions listed: choose short_term_box (A, B, C; 2025: G, H, I).");
    if (lt && !c.has("long_term_box")) c.warn("Long-term transactions listed: choose long_term_box (D, E, F; 2025: J, K, L).");
    if (ctx.year === 2024 && /^[GHIJKL]$/.test(c.str("short_term_box") + c.str("long_term_box"))) c.warn("Boxes G-I and J-L exist only on the 2025 form.");
    void f;
    return c.result();
  },
};
