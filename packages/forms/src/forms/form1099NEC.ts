import { Calc } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

/**
 * Copies 1 (state), B (recipient), and 2 (recipient's state return) are filled identically. Copy A is
 * deliberately not filled: the IRS requires the official scannable red form or e-filing (IRIS) for Copy A.
 */
const COPIES = ["Copy1", "CopyB", "Copy2"];
const left = (n: number) => ({ name: COPIES.map((c) => `${c}[0].LeftColumn[0].f2_${n}[0]`) });
const right = (n: number) => ({ name: COPIES.map((c) => `${c}[0].RightColumn[0].f2_${n}[0]`) });
const header = (n: number) => ({ name: [`Copy1[0].Copy1Header[0].CalendarYear[0].f2_${n}[0]`, `CopyB[0].CopyBHeader[0].CalendarYear[0].f2_${n}[0]`, `Copy2[0].CopyCHeader[0].CalendarYear[0].f2_${n}[0]`] });

const fields: FieldDef[] = [
  { id: "calendar_year", label: "Calendar year of the payments (4 digits)", type: "text", maxLen: 4, computed: true, locate: header(1), notes: "Set to the tax year." },
  { id: "corrected", label: "Corrected", type: "checkbox", locate: { name: ["Copy1[0].Copy1Header[0].c2_1[1]", "CopyB[0].CopyBHeader[0].c2_1[0]", "Copy2[0].CopyCHeader[0].c2_1[1]"] } },
  { id: "payer_name", label: "Payer's name", type: "text" },
  { id: "payer_address", label: "Payer's street address", type: "text" },
  { id: "payer_city_state_zip", label: "Payer's city or town, state, and ZIP code", type: "text" },
  { id: "payer_phone", label: "Payer's telephone number", type: "text" },
  { id: "payer_block", label: "Payer's name, address, and telephone (one block)", type: "text", computed: true, locate: left(2) },
  { id: "payer_tin", label: "Payer's TIN", type: "ein", maxLen: 10, locate: left(3), notes: "EIN formatted 12-3456789; an SSN is also accepted." },
  { id: "recipient_tin", label: "Recipient's TIN", type: "ssn", maxLen: 11, locate: left(4), notes: "SSN formatted 123-45-6789 (an EIN may be supplied as 9 digits)." },
  { id: "recipient_name", label: "Recipient's name", type: "text", locate: left(5) },
  { id: "recipient_street", label: "Recipient's street address (including apt. no.)", type: "text", locate: left(6) },
  { id: "recipient_city_state_zip", label: "Recipient's city or town, state or province, country, and ZIP or foreign postal code", type: "text", locate: left(7) },
  { id: "account_number", label: "Account number (see instructions)", type: "text", locate: left(8) },
  { id: "box1", line: "1", label: "Nonemployee compensation", type: "money", locate: right(9) },
  { id: "box2_direct_sales", line: "2", label: "Payer made direct sales totaling $5,000 or more of consumer products to recipient for resale", type: "checkbox", locate: { name: COPIES.map((c) => `${c}[0].RightColumn[0].c2_3[0]`) } },
  { id: "box4", line: "4", label: "Federal income tax withheld", type: "money", locate: right(10) },
  {
    id: "states",
    line: "5-7",
    label: "State information (up to 2 rows): state tax withheld, state/payer's state number, state income",
    type: "list",
    rows: 2,
    items: [
      { id: "state_tax_withheld", label: "Box 5 State tax withheld", type: "money" },
      { id: "state_number", label: "Box 6 State/Payer's state no.", type: "text" },
      { id: "state_income", label: "Box 7 State income", type: "money" },
    ],
    listLocate: {
      2024: { state_tax_withheld: [["Copy1[0].RightColumn[0].f2_11[0]", "CopyB[0].RightColumn[0].f2_11[0]", "Copy2[0].RightColumn[0].f2_11[0]"], ["Copy1[0].RightColumn[0].f2_12[0]", "CopyB[0].RightColumn[0].f2_12[0]", "Copy2[0].RightColumn[0].f2_12[0]"]], state_number: [["Copy1[0].RightColumn[0].f2_13[0]", "CopyB[0].RightColumn[0].f2_13[0]", "Copy2[0].RightColumn[0].f2_13[0]"], ["Copy1[0].RightColumn[0].f2_14[0]", "CopyB[0].RightColumn[0].f2_14[0]", "Copy2[0].RightColumn[0].f2_14[0]"]], state_income: [["Copy1[0].RightColumn[0].f2_15[0]", "CopyB[0].RightColumn[0].f2_15[0]", "Copy2[0].RightColumn[0].f2_15[0]"], ["Copy1[0].RightColumn[0].f2_16[0]", "CopyB[0].RightColumn[0].f2_16[0]", "Copy2[0].RightColumn[0].f2_16[0]"]] },
      2025: { state_tax_withheld: [["Copy1[0].RightColumn[0].f2_11[0]", "CopyB[0].RightColumn[0].f2_11[0]", "Copy2[0].RightColumn[0].f2_11[0]"], ["Copy1[0].RightColumn[0].f2_12[0]", "CopyB[0].RightColumn[0].f2_12[0]", "Copy2[0].RightColumn[0].f2_12[0]"]], state_number: [["Copy1[0].RightColumn[0].f2_13[0]", "CopyB[0].RightColumn[0].f2_13[0]", "Copy2[0].RightColumn[0].f2_13[0]"], ["Copy1[0].RightColumn[0].f2_14[0]", "CopyB[0].RightColumn[0].f2_14[0]", "Copy2[0].RightColumn[0].f2_14[0]"]], state_income: [["Copy1[0].RightColumn[0].f2_15[0]", "CopyB[0].RightColumn[0].f2_15[0]", "Copy2[0].RightColumn[0].f2_15[0]"], ["Copy1[0].RightColumn[0].f2_16[0]", "CopyB[0].RightColumn[0].f2_16[0]", "Copy2[0].RightColumn[0].f2_16[0]"]] },
    },
  },
];

export const form1099NEC: FormDef = {
  id: "f1099nec",
  title: "Form 1099-NEC, Nonemployee Compensation (Copies 1, B, and 2)",
  shortTitle: "Form 1099-NEC",
  description: "What a business gives each contractor it paid $600 or more: Copy B for the recipient, Copy 2 for the recipient's state return, and Copy 1 for the state tax department. Copy A is not produced here because the IRS only accepts the scannable red form or e-filing through IRIS.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1099mec.pdf",
  notes: `**What this form is for.** Report nonemployee compensation of $600 or more paid to a contractor during the calendar year. Furnish Copy B to the recipient by January 31. Copy A goes to the IRS by January 31 too, but only on the official red form or electronically through IRIS; this tool does not print Copy A.

**What the engine computes.** The calendar year and the payer block; everything else is filled as supplied. One form per recipient.

**Things to verify before filing.**
- Get a Form W-9 from every contractor before paying them so the TIN and name match IRS records.
- Payments by credit card or payment apps are reported by the processor on Form 1099-K, not here.
- Corporations are generally exempt, except for attorneys' fees.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    c.setScalar("calendar_year", String(ctx.year), "Calendar year", "tax year", undefined);
    const block = [c.str("payer_name"), c.str("payer_address"), c.str("payer_city_state_zip"), c.str("payer_phone")].filter(Boolean).join(", ");
    if (block) c.setScalar("payer_block", block, "Payer block", "name, address, city/state/ZIP, telephone");
    if (!c.has("payer_tin")) c.warn("payer_tin is required.");
    if (!c.has("recipient_tin")) c.warn("recipient_tin is required.");
    if (c.n("box1") < 600) c.warn("Box 1 is under $600; a 1099-NEC is generally not required (but may still be issued).");
    return c.result();
  },
};
