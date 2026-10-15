import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

type Y<T> = Partial<Record<TaxYear, T>>;
const pad = (n: number, year: TaxYear) => (year === 2024 ? String(n).padStart(2, "0") : String(n));
const p1 = (n: number): { names: Y<string> } => ({ names: { 2024: `Page1[0].f1_${pad(n, 2024)}[0]`, 2025: `Page1[0].f1_${pad(n, 2025)}[0]` } });
const p2 = (n: number): { names: Y<string> } => ({ names: { 2024: `Page2[0].f2_${pad(n, 2024)}[0]`, 2025: `Page2[0].f2_${pad(n, 2025)}[0]` } });
const tbl = (part: "I" | "II", row: string, n: number, ro = false): { names: Y<string> } => ({ names: { 2024: `Page1[0].Table_Part${part}[0].Row${row}[0].f1_${pad(n, 2024)}${ro ? "_RO" : ""}[0]`, 2025: `Page1[0].Table_Part${part}[0].Row${row}[0].f1_${n}[0]` } });
const money = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });

const ROW_LABEL: Record<string, string> = { "1a": "Totals for all short-term transactions on Form 1099-B with basis reported and no adjustments (no Form 8949)", "1b": "Totals from Form(s) 8949 with Box A (or 2025 Box G) checked", "2": "Totals from Form(s) 8949 with Box B (or Box H) checked", "3": "Totals from Form(s) 8949 with Box C (or Box I) checked", "8a": "Totals for all long-term transactions on Form 1099-B with basis reported and no adjustments (no Form 8949)", "8b": "Totals from Form(s) 8949 with Box D (or Box J) checked", "9": "Totals from Form(s) 8949 with Box E (or Box K) checked", "10": "Totals from Form(s) 8949 with Box F (or Box L) checked" };
function row(part: "I" | "II", line: string, start: number, hasG: boolean): FieldDef[] {
  const id = `line${line}`;
  const out: FieldDef[] = [
    money(`${id}_d`, line, `${ROW_LABEL[line]}: (d) proceeds`, tbl(part, line, start)),
    money(`${id}_e`, line, `${ROW_LABEL[line]}: (e) cost or other basis`, tbl(part, line, start + 1)),
  ];
  if (hasG) out.push(money(`${id}_g`, line, `${ROW_LABEL[line]}: (g) adjustments from Form 8949`, tbl(part, line, start + 2)));
  out.push(comp(`${id}_h`, line, `${ROW_LABEL[line]}: (h) gain or (loss)`, tbl(part, line, start + 3), hasG ? "(d) - (e) + (g)" : "(d) - (e)"));
  return out;
}

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: p1(1) },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: p1(2) },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss) for the capital loss limit", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  { id: "qof_disposal", label: "Did you dispose of any investment(s) in a qualified opportunity fund during the tax year?", type: "yesno", locate: { yes: { name: "Page1[0].c1_1[0]" }, no: { name: "Page1[0].c1_1[1]" } } },
  ...row("I", "1a", 3, false),
  ...row("I", "1b", 7, true),
  ...row("I", "2", 11, true),
  ...row("I", "3", 15, true),
  money("line4", "4", "Short-term gain from Form 6252 and short-term gain or (loss) from Forms 4684, 6781, and 8824", p1(19)),
  money("line5", "5", "Net short-term gain or (loss) from partnerships, S corporations, estates, and trusts (Schedule(s) K-1)", p1(20)),
  money("line6", "6", "Short-term capital loss carryover from the prior year (enter as a negative number)", p1(21)),
  comp("line7", "7", "Net short-term capital gain or (loss)", p1(22), "lines 1a-3 column (h) + 4 + 5 + 6", { alwaysShow: true }),
  ...row("II", "8a", 23, false),
  ...row("II", "8b", 27, true),
  ...row("II", "9", 31, true),
  ...row("II", "10", 35, true),
  money("line11", "11", "Gain from Form 4797 Part I; long-term gain from Forms 2439 and 6252; long-term gain or (loss) from Forms 4684, 6781, and 8824", p1(39)),
  money("line12", "12", "Net long-term gain or (loss) from partnerships, S corporations, estates, and trusts", p1(40)),
  money("line13", "13", "Capital gain distributions (Form 1099-DIV box 2a)", p1(41)),
  money("line14", "14", "Long-term capital loss carryover from the prior year (enter as a negative number)", p1(42)),
  comp("line15", "15", "Net long-term capital gain or (loss)", p1(43), "lines 8a-10 column (h) + 11 + 12 + 13 + 14", { alwaysShow: true }),
  comp("line16", "16", "Combine lines 7 and 15; carried to Form 1040 line 7 (gain) or line 21 (loss)", p2(1), "7 + 15", { alwaysShow: true }),
  { id: "line17", line: "17", label: "Are lines 15 and 16 both gains?", type: "yesno", computed: true, locate: { yes: { name: "Page2[0].c2_1[0]" }, no: { name: "Page2[0].c2_1[1]" } } },
  money("line18", "18", "28% rate gain (collectibles and section 1202) from the worksheet", p2(2)),
  money("line19", "19", "Unrecaptured section 1250 gain from the worksheet", p2(3)),
  { id: "line20", line: "20", label: "Are lines 18 and 19 both zero or blank and you are not filing Form 4952?", type: "yesno", computed: true, locate: { yes: { name: "Page2[0].c2_2[0]" }, no: { name: "Page2[0].c2_2[1]" } } },
  comp("line21", "21", "Capital loss allowed: the smaller of the line 16 loss or $3,000 ($1,500 MFS); carried to Form 1040 line 7", { names: { 2024: "Page2[0].TagCorrectingSubform[0].f2_04[0]", 2025: "Page2[0].f2_4[0]" } }, "max(line 16, -3,000 or -1,500)"),
  { id: "line22", line: "22", label: "Do you have qualified dividends on Form 1040 line 3a? (answered when line 16 is zero or a loss)", type: "yesno", locate: { yes: { name: "Page2[0].c2_3[0]" }, no: { name: "Page2[0].c2_3[1]" } } },
];

export const scheduleD: FormDef = {
  id: "f1040sd",
  title: "Schedule D (Form 1040), Capital Gains and Losses",
  shortTitle: "Schedule D",
  description: "Nets short-term and long-term sales (from Forms 8949 or 1099-B totals), K-1 and carryover amounts, and capital gain distributions, applies the $3,000 loss limit, and feeds Form 1040 line 7 and the capital gain tax worksheet.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040sd.pdf",
  notes: `**What this form is for.** Required when you sold capital assets (stock, crypto, property), have a capital loss carryover, or received capital gain distributions you cannot report directly on Form 1040 line 7.

**What the engine computes.** Column (h) for each row, lines 7, 15, 16, 17, 20, and 21. In a full return, each Form 8949's totals fill lines 1b/2/3 and 8b/9/10 by box; line 16 (gain) or line 21 (allowed loss) goes to Form 1040 line 7; when lines 15 and 16 are both gains, Form 1040 uses the Qualified Dividends and Capital Gain Tax Worksheet with the smaller of the two.

**What the engine does not do.** The 28% Rate Gain Worksheet, the Unrecaptured Section 1250 Gain Worksheet, and the Schedule D Tax Worksheet (needed when line 18 or 19 has an amount, or Form 4952 applies); supply line 18/19 and use line16_override on Form 1040. Loss carryovers to next year come from the Capital Loss Carryover Worksheet (line 16 loss beyond the $3,000 limit).`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") || "single";
    const rows = (lines: string[]) => lines.reduce((a, line) => a + c.set(`line${line}_h`, c.n(`line${line}_d`) - c.n(`line${line}_e`) + c.n(`line${line}_g`), `Line ${line} gain or (loss)`, `${f(c.n(`line${line}_d`))} - ${f(c.n(`line${line}_e`))}${c.has(`line${line}_g`) ? ` + ${f(c.n(`line${line}_g`))}` : ""}`, line), 0);
    const stRows = rows(["1a", "1b", "2", "3"].filter((l) => c.has(`line${l}_d`) || c.has(`line${l}_e`) || c.has(`line${l}_g`)));
    const l7 = c.set("line7", stRows + c.n("line4") + c.n("line5") + c.n("line6"), "Net short-term capital gain or (loss)", `${f(stRows)} + ${f(c.n("line4"))} + ${f(c.n("line5"))} + ${f(c.n("line6"))}`, "7");
    const ltRows = rows(["8a", "8b", "9", "10"].filter((l) => c.has(`line${l}_d`) || c.has(`line${l}_e`) || c.has(`line${l}_g`)));
    const l15 = c.set("line15", ltRows + c.n("line11") + c.n("line12") + c.n("line13") + c.n("line14"), "Net long-term capital gain or (loss)", `${f(ltRows)} + ${f(c.n("line11"))} + ${f(c.n("line12"))} + ${f(c.n("line13"))} + ${f(c.n("line14"))}`, "15");
    if (c.n("line6") > 0 || c.n("line14") > 0) c.warn("Loss carryovers on lines 6 and 14 are entered as negative numbers.");
    const l16 = c.set("line16", l7 + l15, "Net capital gain or (loss)", `${f(l7)} + ${f(l15)}`, "16");
    if (l16 > 0) {
      const both = l15 > 0;
      c.setScalar("line17", both, "Lines 15 and 16 both gains?", both ? "yes: continue to line 18" : "no: skip to line 22", "17");
      if (both) {
        const l18 = c.n("line18"), l19 = c.n("line19");
        const neither = l18 === 0 && l19 === 0;
        c.setScalar("line20", neither, "Lines 18 and 19 both zero?", neither ? "yes: use the Qualified Dividends and Capital Gain Tax Worksheet" : "no: use the Schedule D Tax Worksheet", "20");
        if (!neither) c.warn("Line 18 or 19 has an amount: Form 1040 line 16 must come from the Schedule D Tax Worksheet (supply line16_override on Form 1040).");
      }
    } else if (l16 < 0) {
      const limit = status === "mfs" ? 1500 : 3000;
      const l21 = c.set("line21", Math.max(l16, -limit), "Allowed capital loss", `max(${f(l16)}, ${f(-limit)})`, "21");
      if (l16 < -limit) c.warn(`Capital loss of ${f(l16)} exceeds the ${f(limit)} limit; ${f(l16 + limit)} carries over to next year (Capital Loss Carryover Worksheet).`);
      if (!c.has("line22")) c.warn("Line 16 is a loss: answer line22 (qualified dividends on Form 1040 line 3a?).");
      void l21;
    } else if (!c.has("line22")) c.warn("Line 16 is zero: answer line22 (qualified dividends on Form 1040 line 3a?).");
    return c.result();
  },
};
