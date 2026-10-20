import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });

const fields: FieldDef[] = [
  { id: "filer_name", label: "Name of person filing this return (defaults to the U.S. shareholder)", type: "text", locate: { name: P(1) } },
  { id: "filer_id", line: "A", label: "Identifying number of the person filing (defaults to the shareholder's)", type: "text", maxLen: 11, locate: { name: P(2) } },
  { id: "name", label: "Name of U.S. shareholder", type: "text", locate: { name: P(3) } },
  { id: "ssn", line: "B", label: "Identifying number of the U.S. shareholder", type: "text", maxLen: 11, locate: { name: P(4) } },
  money("line1", "I-1", "Sum of pro rata share of net tested income (Schedule A (Form 8992) line 1, column (e))", 5),
  money("line2", "I-2", "Sum of pro rata share of net tested loss (Schedule A line 1, column (f)); enter as a positive amount, it is subtracted", 6),
  comp("line3", "I-3", "Net CFC tested income. Line 1 minus line 2 (if zero or less, no GILTI)", 7, "I-1 - I-2", { alwaysShow: true }),
  comp("part2_line1", "II-1", "Net CFC tested income from Part I line 3", 8, "Part I line 3"),
  { id: "qbai", label: "Sum of pro rata share of qualified business asset investment (QBAI) (Schedule A line 1, column (g)); line II-2 is figured as 10% of it when II-2 is not supplied", type: "money", noPdf: true },
  money("part2_line2", "II-2", "Deemed tangible income return (DTIR): 10% of the QBAI total", 9, { notes: "Figured as 10% of qbai when not supplied." }),
  money("line3a", "II-3a", "Sum of pro rata share of tested interest expense (Schedule A line 1, column (j))", 10),
  money("line3b", "II-3b", "Sum of pro rata share of tested interest income (Schedule A line 1, column (i))", 11),
  comp("line3c", "II-3c", "Specified interest expense. Line 3a minus line 3b (not less than zero)", 12, "II-3a - II-3b"),
  comp("line4", "II-4", "Net DTIR. Line II-2 minus line 3c (not less than zero)", 13, "II-2 - II-3c"),
  comp("line5", "II-5", "GILTI. Line II-1 minus line 4 (not less than zero); to Schedule 1 line 8o", 14, "II-1 - II-4", { alwaysShow: true }),
];

export const form8992: FormDef = {
  id: "f8992",
  title: "Form 8992, U.S. Shareholder Calculation of Global Intangible Low-Taxed Income (GILTI)",
  shortTitle: "Form 8992",
  description: "Figures a U.S. shareholder's GILTI inclusion from the Schedule A totals: net CFC tested income less the net deemed tangible income return; the inclusion goes to Schedule 1 line 8o.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8992.pdf",
  notes: `**Who files.** U.S. persons who own (directly or indirectly) 10% or more of a controlled foreign corporation (CFC) and have a pro rata share of tested income. Schedule A (Form 8992), which lists each CFC, is not prepared here; enter its line 1 column totals.

**What the engine computes.** Part I line 3 (net CFC tested income), Part II line 2 (10% of QBAI when you supply qbai instead of the line), line 3c (specified interest expense), line 4 (net DTIR), and line 5 (GILTI, placed on Schedule 1 line 8o in a full return).

**What to verify.** Public Law 119-21 renames GILTI "net CFC tested income" for tax years beginning after 2025 and removes the QBAI reduction; this form follows the 2024 and 2025 rules. Individuals cannot take the section 250 deduction or the deemed-paid foreign tax credit without a section 962 election. Also attach Form 5471 for each CFC.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.str("filer_name") && c.str("name")) c.setScalar("filer_name", c.str("name"), "Person filing", "the U.S. shareholder");
    if (!c.str("filer_id") && c.str("ssn")) c.setScalar("filer_id", c.str("ssn"), "Filer identifying number", "the U.S. shareholder's");
    const l3 = c.set("line3", c.n("line1") - c.n("line2"), "Net CFC tested income", `${f(c.n("line1"))} - ${f(c.n("line2"))}`, "I-3");
    if (l3 <= 0) {
      c.warn("Net CFC tested income is zero or less: there is no GILTI inclusion this year (Part II does not apply).");
      c.set("line5", 0, "GILTI", "none", "II-5");
      return c.result();
    }
    c.set("part2_line1", l3, "Net CFC tested income", "Part I line 3", "II-1");
    let dtir: number;
    if (c.has("part2_line2")) dtir = c.n("part2_line2");
    else dtir = c.set("part2_line2", c.n("qbai") * 0.1, "Deemed tangible income return", `${f(c.n("qbai"))} x 10%`, "II-2");
    const l3c = c.set("line3c", Math.max(0, c.n("line3a") - c.n("line3b")), "Specified interest expense", `${f(c.n("line3a"))} - ${f(c.n("line3b"))}`, "II-3c");
    const l4 = c.set("line4", Math.max(0, dtir - l3c), "Net DTIR", `${f(dtir)} - ${f(l3c)}`, "II-4");
    const l5 = c.set("line5", Math.max(0, l3 - l4), "GILTI", `${f(l3)} - ${f(l4)}`, "II-5");
    if (l5 > 0) c.warn("Report the GILTI on Schedule 1 line 8o (done automatically in a full return); attach Schedule A (Form 8992) and Form 5471 for each CFC.");
    return c.result();
  },
};
