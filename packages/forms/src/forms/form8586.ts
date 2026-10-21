import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "line1", line: "1", label: "Number of Forms 8609-A attached", type: "integer", locate: { name: P(3) } },
  { id: "line2", line: "2", label: "Has there been a decrease in the qualified basis of any building accounted for on line 1 since the close of the preceding tax year?", type: "yesno", locate: { yes: { name: "Page1[0].c1_1[0]" }, no: { name: "Page1[0].c1_1[1]" } } },
  { id: "bin1", line: "2(i)", label: "Building identification number (BIN) of a building with a decrease in qualified basis", type: "text", locate: { name: P(4) } },
  { id: "bin2", line: "2(ii)", label: "Second BIN", type: "text", locate: { name: P(5) } },
  { id: "bin3", line: "2(iii)", label: "Third BIN", type: "text", locate: { name: P(6) } },
  { id: "bin4", line: "2(iv)", label: "Fourth BIN", type: "text", locate: { name: P(7) } },
  { id: "line3", line: "3", label: "Current year credit from the attached Form(s) 8609-A (line 18 of each)", type: "money", locate: { name: P(8) } },
  { id: "line4", line: "4", label: "Low-income housing credit from partnerships, S corporations, estates, and trusts (Schedule K-1)", type: "money", locate: { name: P(9) } },
  { id: "line5", line: "5", label: "Add lines 3 and 4; to Form 3800 Part III line 4d", type: "money", computed: true, alwaysShow: true, locate: { name: P(10) } },
  { id: "line6", line: "6", label: "Amount allocated to beneficiaries of the estate or trust", type: "money", locate: { name: P(11) } },
  { id: "line7", line: "7", label: "Estates and trusts: subtract line 6 from line 5", type: "money", computed: true, locate: { name: P(12) } },
  { id: "estate_or_trust", label: "Filed by an estate or trust (line 7 is reported instead of line 5)", type: "checkbox", noPdf: true },
];

export const form8586: FormDef = {
  id: "f8586",
  title: "Form 8586, Low-Income Housing Credit",
  shortTitle: "Form 8586",
  description: "Summarizes the section 42 low-income housing credit from each building's Form 8609-A and from pass-through entities for Form 3800.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f8586.pdf",
  notes: `**Who files.** Owners of residential rental buildings that received a housing credit allocation (Form 8609) during the 10-year credit period, and partners or shareholders with a Schedule K-1 share of the credit. Most individuals receive the credit through a partnership (line 4).

**What the engine computes.** Line 5 (to Form 3800 Part III line 4d, placed automatically in a full return) and line 7 for estates and trusts.

**What to verify.** Each building needs its own Form 8609-A (not prepared here). A decrease in qualified basis (line 2) can trigger recapture on Form 8611. The credit is a specified credit on Form 3800, so it can offset tentative minimum tax; passive activity limits usually apply unless the $25,000 rental real estate allowance covers it.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const l5 = c.set("line5", c.n("line3") + c.n("line4"), "Low-income housing credit to Form 3800 line 4d", `${f(c.n("line3"))} + ${f(c.n("line4"))}`, "5");
    c.set("line7", Math.max(0, l5 - c.n("line6")), "Credit after allocation to beneficiaries", `${f(l5)} - ${f(c.n("line6"))}`, "7");
    if (c.n("line3") > 0 && !c.has("line1")) c.warn("Line 1 (number of Forms 8609-A attached) was not supplied.");
    if (c.bool("line2") && !c.str("bin1")) c.warn("Line 2 is yes: enter the BIN(s) of the buildings with a decrease in qualified basis (bin1 through bin4) and consider Form 8611 recapture.");
    return c.result();
  },
};
