import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListItemDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const pad = (n: number) => String(n).padStart(2, "0");
const P1 = (n: number, ro = false) => `Page1[0].f1_${pad(n)}${ro ? "_RO" : ""}[0]`;
const P2 = (n: number) => `Page2[0].f2_${pad(n)}[0]`;
const P3 = (n: number, ro = false) => `Page3[0].f3_${pad(n)}${ro ? "_RO" : ""}[0]`;
const rows8 = (fn: (r: number) => string) => Array.from({ length: 8 }, (_, r) => fn(r));
const rows4 = (fn: (r: number) => string) => Array.from({ length: 4 }, (_, r) => fn(r));
const rows10 = (fn: (r: number) => string) => Array.from({ length: 10 }, (_, r) => fn(r));
const T1 = (col: number) => rows8((r) => `Page1[0].Table_Part1_a-e[0].BodyRow${r + 1}[0].${P1(4 + r * 5 + col, col === 4 && [3, 5, 6, 7].includes(r)).replace("Page1[0].", "")}`);
const T1b = (col: number) => rows8((r) => `Page1[0].Table_Part2_f-k[0].BodyRow${r + 1}[0].f1_${pad(44 + r * 5 + col)}[0]`);
const T1c = (idx: 0 | 1) => rows8((r) => `Page1[0].Table_Part2_f-k[0].BodyRow${r + 1}[0].c1_${2 + r}[${idx}]`);
const T2 = (col: number) => rows8((r) => `Page1[0].Table_Part2_a-f[0].BodyRow${r + 1}[0].f1_${pad(84 + r * 6 + col)}[0]`);
const T2b = (col: number) => rows8((r) => `Page2[0].Table_Part2_g-k[0].BodyRow${r + 1}[0].f2_${pad(1 + r * 5 + col)}[0]`);
const PART3: Array<{ year: string; line: number; base: number; cbBase: number; total: string }> = [
  { year: "2017", line: 1, base: 43, cbBase: 1, total: "Page2[0].Total-Line2_ReadOrder[0].f2_67[0]" }, { year: "2018", line: 2, base: 68, cbBase: 6, total: "Page2[0].Total-Line3_ReadOrder[0].f2_92[0]" },
  { year: "2019", line: 3, base: 93, cbBase: 11, total: "Page2[0].Total-Line4_ReadOrder[0].f2_117[0]" }, { year: "2020", line: 4, base: 118, cbBase: 15, total: "Page2[0].f2_142[0]" },
];
const T3 = (p: (typeof PART3)[number], col: number) => rows4((r) => `Page2[0].Table_Line${p.line}_${p.year}[0].Row${r + 1}[0].f2_${pad(p.base + r * 6 + col)}[0]`);
const T3c = (p: (typeof PART3)[number], idx: 0 | 1) => rows4((r) => `Page2[0].Table_Line${p.line}_${p.year}[0].Row${r + 1}[0].c2_${p.cbBase + r}[${idx}]`);
const T4 = (col: number) => rows10((r) => `Page3[0].Table_Part4_a-e[0].BodyRow${r + 1}[0].f3_${pad(1 + r * 4 + col)}[0]`);
const T4b = (col: number) => rows10((r) => `Page3[0].Table_Part4_f-j[0].BodyRow${r + 1}[0].f3_${pad(41 + r * 5 + col)}[0]`);

const money = (id: string, label: string, extra: Partial<ListItemDef> = {}): ListItemDef => ({ id, label, type: "money", ...extra });
const liabilityItems: ListItemDef[] = [
  { id: "year", label: "(a) Year of the section 965(a) inclusion, liability assumed, or triggering event (rows 1-4 are 2017-2020)", type: "text", maxLen: 4 },
  money("with_965", "(b) Net tax liability with all 965 amounts"),
  money("without_965", "(c) Net tax liability without 965 amounts"),
  money("net_965", "(d) Net 965 tax liability: (b) minus (c)", { computed: true }),
  money("s_corp_deferred", "(e) S corporation shareholder total deferred net 965 tax liability (Part III column (g) total; defaults from Part III)"),
  money("eligible", "(f) Net 965 tax liability eligible for the installment election: (d) minus (e)", { computed: true }),
  { id: "installment_election", label: "(g) Installment election made (section 965(h))", type: "yesno" },
  money("paid_in_full", "(h) Paid in full for year 1 (column (f) when no election)", { computed: true }),
  money("installments", "(i) Paid in installments (column (f) when the election was made)", { computed: true }),
  money("transferred", "(j) Transferred (out) as a negative amount, transferred in, or subsequent adjustments"),
  { id: "transferee_tin", label: "(k) TIN of the buyer/transferee or seller/transferor", type: "text", maxLen: 11 },
  money("paid_y1", "Part II (b) Paid for year 1"), money("paid_y2", "Part II (c) Paid for year 2"), money("paid_y3", "Part II (d) Paid for year 3"), money("paid_y4", "Part II (e) Paid for year 4"),
  money("paid_y5", "Part II (f) Paid for year 5"), money("paid_y6", "Part II (g) Paid for year 6"), money("paid_y7", "Part II (h) Paid for year 7"), money("paid_y8", "Part II (i) Paid for year 8"),
  money("remaining", "Part II (j) Net 965 tax liability remaining unpaid: (i) plus (j) of Part I minus the payments", { computed: true }),
  money("paid_this_year", "Part II (k) Net 965 tax liability paid for the reporting year"),
  { id: "year2", label: "Part II (a) year (repeats column (a))", type: "text", maxLen: 4, computed: true },
];
const sCorpItems: ListItemDef[] = [
  { id: "name", label: "(a) S corporation name", type: "text" },
  { id: "tin", label: "(b) S corporation TIN", type: "text", maxLen: 11 },
  money("with_965", "(c) Net tax liability with only the 965 amounts from this S corporation"),
  money("without_965", "(d) Net tax liability without 965 amounts"),
  money("net_965", "(e) Net 965 tax liability from this S corporation: (c) minus (d)", { computed: true }),
  { id: "deferral_election", label: "(f) Deferral election made (section 965(i))", type: "yesno" },
  money("deferred", "(g) Deferred net 965 tax liability (column (e) when the election was made)", { computed: true }),
];
const deferredItems: ListItemDef[] = [
  { id: "year", label: "(a) Election or transfer year", type: "text", maxLen: 4 },
  { id: "name", label: "(b) S corporation name", type: "text" },
  { id: "tin", label: "(c) S corporation TIN", type: "text", maxLen: 11 },
  money("beginning", "(d) Beginning deferred net 965 tax liability"),
  money("triggered", "(f) Net 965 tax liability triggered this year (enter as a positive amount; it is subtracted)"),
  money("transferred", "(g) Deferred liability transferred (out) as a negative amount or transferred in by agreement"),
  { id: "transferee_tin", label: "(h) TIN of the transferee or transferor", type: "text", maxLen: 11 },
  money("ending", "(i) Deferred net 965 tax liability at the end of the reporting year: (d) minus (f) plus (g)", { computed: true }),
];

const fields: FieldDef[] = [
  { id: "amended", label: "Check if this is an amended report", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "name", label: "Name of taxpayer with a net 965 tax liability", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Identifying number", type: "text", maxLen: 11, locate: { name: P1(2) } },
  { id: "reporting_year", label: "Taxable year of reporting (defaults to the tax year)", type: "text", maxLen: 4, locate: { name: P1(3) } },
  {
    id: "liabilities", line: "I-II", label: "Parts I and II: one row per section 965 inclusion year (rows 1-4 are the preprinted years 2017-2020; rows 5-8 are for liabilities assumed or triggered in later years)", type: "list", items: liabilityItems,
    listLocate: both({
      year: T1(0), with_965: T1(1), without_965: T1(2), net_965: T1(3), s_corp_deferred: T1(4),
      eligible: T1b(0), "installment_election.yes": T1c(0), "installment_election.no": T1c(1), paid_in_full: T1b(1), installments: T1b(2), transferred: T1b(3), transferee_tin: T1b(4),
      year2: T2(0), paid_y1: T2(1), paid_y2: T2(2), paid_y3: T2(3), paid_y4: T2(4), paid_y5: T2(5),
      paid_y6: T2b(0), paid_y7: T2b(1), paid_y8: T2b(2), remaining: T2b(3), paid_this_year: T2b(4),
    }),
  },
  { id: "remaining_total", line: "II", label: "Part II column (j) total: net 965 tax liability remaining unpaid", type: "money", computed: true, locate: { name: P2(41) } },
  { id: "paid_this_year_total", line: "II", label: "Part II column (k) total: net 965 tax liability paid for the reporting year", type: "money", computed: true, locate: { name: P2(42) } },
  ...PART3.flatMap((p): FieldDef[] => [
    { id: `s_corps_${p.year}`, line: `III-${p.line}`, label: `Part III line ${p.line}: S corporations with ${p.year} section 965(a) inclusions (up to 4 rows)`, type: "list", items: sCorpItems, listLocate: both({ name: T3(p, 0), tin: T3(p, 1), with_965: T3(p, 2), without_965: T3(p, 3), net_965: T3(p, 4), "deferral_election.yes": T3c(p, 0), "deferral_election.no": T3c(p, 1), deferred: T3(p, 5) }) },
    { id: `part3_total_${p.year}`, line: `III-${p.line}`, label: `Part III line ${p.line} total deferred net 965 tax liability (${p.year})`, type: "money", computed: true, locate: { name: p.total } },
  ]),
  {
    id: "deferred_report", line: "IV", label: "Part IV: annual report of deferred net 965 tax liability from S corporations (up to 10 rows)", type: "list", items: deferredItems,
    listLocate: both({ year: T4(0), name: T4(1), tin: T4(2), beginning: T4(3), triggered: T4b(1), transferred: T4b(2), transferee_tin: T4b(3), ending: T4b(4) }),
  },
  { id: "deferred_total", line: "IV", label: "Part IV column (i) total", type: "money", computed: true, locate: { name: P3(91) } },
];

const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
const FIXED_YEARS = ["2017", "2018", "2019", "2020"];

export const form965a: FormDef = {
  id: "f965a",
  title: "Form 965-A, Individual Report of Net 965 Tax Liability",
  shortTitle: "Form 965-A",
  description: "The annual report of an individual's section 965 transition tax: the net 965 tax liability by inclusion year, the installment election, payments made each year and the balance unpaid, S corporation deferral elections, and the deferred liability carried from year to year.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i965a.pdf",
  notes: `**Who files.** Individuals who elected to pay a section 965 transition tax liability in installments (section 965(h)), S corporation shareholders who elected to defer it (section 965(i)), and anyone who assumed such a liability or had a triggering event; the report is filed every year until the liability is paid in full.

**What the engine computes.** Part I columns (d), (f), (h), and (i); column (e) from the Part III totals for 2017-2020 when not supplied; Part II column (j) (the amount still unpaid after the payments entered) and the column (j) and (k) totals; Part III columns (e) and (g) and the four totals; Part IV column (i) and its total. Rows 1-4 of Parts I and II are fixed to 2017-2020.

**What to verify.** The installment paid with this year's return (Part II column (k)) is paid with Form 1040 but is not part of the tax figured on the return; it is not placed automatically. A triggering event (Part IV column (f)) makes the deferred liability due unless a transfer agreement applies. The 8-year installment schedule for a 2017 inclusion ends with the payment due in 2025.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.str("reporting_year")) c.setScalar("reporting_year", String(ctx.year), "Taxable year of reporting", `tax year ${ctx.year}`);
    const part3Totals: Record<string, number> = {};
    for (const p of PART3) {
      const rows = c.list(`s_corps_${p.year}`);
      if (rows.length > 4) c.warn(`Part III line ${p.line} has more than 4 rows: only the first 4 print; attach a statement.`);
      const out = rows.map((r) => {
        const net = num(r, "with_965") - num(r, "without_965");
        const elected = r["deferral_election"] === true;
        return { ...r, net_965: net, deferred: elected ? net : 0 };
      });
      c.out[`s_corps_${p.year}`] = out;
      const total = out.reduce((a, r) => a + num(r, "deferred"), 0);
      part3Totals[p.year] = total;
      c.set(`part3_total_${p.year}`, total, `Part III line ${p.line} total deferred net 965 tax liability`, out.length ? out.map((r) => f(num(r, "deferred"))).join(" + ") : "none", `III-${p.line}`);
    }
    const rows = c.list("liabilities");
    if (rows.length > 8) c.warn("Parts I and II have more than 8 rows: only the first 8 print; attach a statement.");
    let remainingTotal = 0;
    let paidThisYearTotal = 0;
    const out = rows.map((r, i) => {
      let year = String(r["year"] ?? "").trim();
      if (i < 4) {
        if (year && year !== FIXED_YEARS[i]) c.warn(`Part I row ${i + 1} is preprinted as ${FIXED_YEARS[i]}; the supplied year ${year} is replaced (use rows 5-8 for other years).`);
        year = FIXED_YEARS[i]!;
      }
      const net = num(r, "with_965") - num(r, "without_965");
      const sCorp = r["s_corp_deferred"] !== undefined ? num(r, "s_corp_deferred") : (part3Totals[year] ?? 0);
      const eligible = net - sCorp;
      const elected = r["installment_election"] === true;
      const installments = elected ? eligible : 0;
      const paidInFull = elected ? 0 : eligible;
      const paid = ["paid_y1", "paid_y2", "paid_y3", "paid_y4", "paid_y5", "paid_y6", "paid_y7", "paid_y8"].reduce((a, k) => a + num(r, k), 0);
      const remaining = Math.max(0, installments + num(r, "transferred") - paid);
      remainingTotal += remaining;
      paidThisYearTotal += num(r, "paid_this_year");
      return { ...r, year, year2: year, net_965: net, s_corp_deferred: sCorp, eligible, paid_in_full: paidInFull, installments, remaining };
    });
    c.out["liabilities"] = out;
    for (const [i, r] of out.entries()) {
      c.computations.push({ id: `liabilities[${i}].net_965`, line: `I-${i + 1}`, label: `Row ${i + 1} (${r["year"]}): net 965 tax liability`, value: num(r, "net_965"), formula: `${f(num(r, "with_965"))} - ${f(num(r, "without_965"))}` });
      c.computations.push({ id: `liabilities[${i}].remaining`, line: `II-${i + 1}`, label: `Row ${i + 1} (${r["year"]}): remaining unpaid`, value: num(r, "remaining"), formula: `${f(num(r, "installments"))} + ${f(num(r, "transferred"))} - payments` });
    }
    c.set("remaining_total", remainingTotal, "Total net 965 tax liability remaining unpaid", out.length ? out.map((r) => f(num(r, "remaining"))).join(" + ") : "none", "II");
    c.set("paid_this_year_total", paidThisYearTotal, "Total net 965 tax liability paid for the reporting year", out.length ? out.map((r) => f(num(r, "paid_this_year"))).join(" + ") : "none", "II");
    const deferred = c.list("deferred_report");
    if (deferred.length > 10) c.warn("Part IV has more than 10 rows: only the first 10 print; attach a statement.");
    const dOut = deferred.map((r) => ({ ...r, ending: num(r, "beginning") - num(r, "triggered") + num(r, "transferred") }));
    c.out["deferred_report"] = dOut;
    c.set("deferred_total", dOut.reduce((a, r) => a + num(r, "ending"), 0), "Total deferred net 965 tax liability at year end", dOut.length ? dOut.map((r) => f(num(r, "ending"))).join(" + ") : "none", "IV");
    if (paidThisYearTotal > 0) c.warn(`Pay the ${f(paidThisYearTotal)} installment (Part II column (k)) with the return; it is not included in the tax computed on Form 1040.`);
    if (dOut.some((r) => num(r, "triggered") > 0)) c.warn("A triggering event ended a section 965(i) deferral: the triggered liability is due with this return unless you elected installments or have a transfer agreement.");
    return c.result();
  },
};
