import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

/** The four copies (A, B, C, D) carry the same fields; Copy A's right column has no RightCol wrapper. */
const copies = (a: string, bcd = a) => [`CopyA[0].${a}`, `CopyB[0].${bcd}`, `CopyC[0].${bcd}`, `CopyD[0].${bcd}`];
const top = (n: number) => copies(`f1_${n}[0]`);
const left = (n: number) => copies(`LeftCol[0].f1_${n}[0]`);
const right = (n: number) => copies(`f1_${n}[0]`, `RightCol[0].f1_${n}[0]`);
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: right(n) }, ...extra });

const fields: FieldDef[] = [
  { id: "void", label: "VOID", type: "checkbox", locate: { name: copies("c1_1[0]") } },
  { id: "corrected", label: "CORRECTED", type: "checkbox", locate: { name: copies("c1_1[1]") } },
  { id: "tax_year", label: "Calendar year (last two digits; defaults to the tax year)", type: "text", maxLen: 2, locate: { name: top(1) } },
  { id: "fiscal_begin", label: "Fiscal year beginning (month and day, MM/DD) when the RIC or REIT does not use the calendar year", type: "text", maxLen: 8, locate: { name: top(2) } },
  { id: "fiscal_begin_year", label: "Fiscal year beginning: last two digits of the year", type: "text", maxLen: 2, locate: { name: top(3) } },
  { id: "fiscal_end", label: "Fiscal year ending (month and day, MM/DD)", type: "text", maxLen: 8, locate: { name: top(4) } },
  { id: "fiscal_end_year", label: "Fiscal year ending: last two digits of the year", type: "text", maxLen: 2, locate: { name: top(5) } },
  { id: "ric_name", label: "Name, address, and ZIP code of the RIC or REIT", type: "text", locate: { name: left(6) } },
  { id: "ric_ein", label: "Identification number of the RIC or REIT", type: "text", maxLen: 10, locate: { name: left(7) } },
  { id: "ssn", label: "Shareholder's identifying number", type: "ssn", maxLen: 11, locate: { name: left(8) } },
  { id: "name", label: "Shareholder's name, address, and ZIP code", type: "text", locate: { name: left(9) } },
  money("line1a", "1a", "Total undistributed long-term capital gains (to Schedule D line 11)", 10),
  money("line1b", "1b", "Unrecaptured section 1250 gain (part of box 1a; to the Unrecaptured Section 1250 Gain Worksheet)", 11),
  money("line1c", "1c", "Section 1202 gain (part of box 1a)", 12),
  money("line1d", "1d", "Collectibles (28%) gain (part of box 1a; to the 28% Rate Gain Worksheet)", 13),
  money("line2", "2", "Tax paid by the RIC or REIT on the box 1a gains (credit on Schedule 3 line 13a)", 14),
  { id: "basis_increase", label: "Increase to the basis of the shares: box 1a minus box 2", type: "money", computed: true, noPdf: true },
];

export const form2439: FormDef = {
  id: "f2439",
  title: "Form 2439, Notice to Shareholder of Undistributed Long-Term Capital Gains",
  shortTitle: "Form 2439",
  description: "The notice a regulated investment company or REIT issues for capital gains it retained and paid tax on: the shareholder reports the gain on Schedule D and claims the tax paid as a refundable credit on Schedule 3 line 13a.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f2439.pdf",
  notes: `**Who uses it.** The RIC or REIT prepares the form (Copy A to the IRS with Form 1120-RIC or 1120-REIT, Copies B and C to the shareholder, Copy D for its records). A shareholder who received one attaches Copy B to the return and reports box 1a on Schedule D line 11 and box 2 on Schedule 3 line 13a.

**What the engine computes.** The calendar year box defaults to the tax year, and the basis increase (box 1a minus box 2). In a full return, box 1a is added to Schedule D line 11, box 1b to Schedule D line 19, box 1d to Schedule D line 18, and box 2 to Schedule 3 line 13a; several notices may be supplied as a list.

**What to verify.** Box 1c (section 1202 gain) may qualify for a partial exclusion and then belongs in the 28% Rate Gain Worksheet; it is not placed automatically. Increase the basis of your shares by the box 1a gain less the box 2 tax.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.str("tax_year")) c.setScalar("tax_year", String(ctx.year).slice(2), "Calendar year", `tax year ${ctx.year}`);
    const l1a = c.n("line1a");
    const parts = c.n("line1b") + c.n("line1c") + c.n("line1d");
    if (parts > l1a) c.warn(`Boxes 1b, 1c, and 1d (${f(parts)}) are parts of box 1a (${f(l1a)}) and cannot exceed it.`);
    c.set("basis_increase", Math.max(0, l1a - c.n("line2")), "Basis increase to the shares", `${f(l1a)} - ${f(c.n("line2"))}`);
    if (c.n("line1c") > 0) c.warn("Box 1c (section 1202 gain): figure any exclusion and the 28% Rate Gain Worksheet amount yourself; it is not placed automatically.");
    return c.result();
  },
};
