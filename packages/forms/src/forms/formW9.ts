import { Calc } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const N = (name: string) => ({ name });
const B = (i: number) => N(`Page1[0].Boxes3a-b_ReadOrder[0].c1_1[${i}]`);

const fields: FieldDef[] = [
  { id: "name", line: "1", label: "Name of entity/individual (as shown on your income tax return)", type: "text", locate: N("Page1[0].f1_01[0]") },
  { id: "business_name", line: "2", label: "Business name/disregarded entity name, if different", type: "text", locate: N("Page1[0].f1_02[0]") },
  {
    id: "classification",
    line: "3a",
    label: "Federal tax classification",
    type: "choice",
    choices: ["individual", "c_corporation", "s_corporation", "partnership", "trust_estate", "llc", "other"],
    locate: { individual: B(0), c_corporation: B(1), s_corporation: B(2), partnership: B(3), trust_estate: B(4), llc: B(5), other: B(6) },
    notes: "individual covers sole proprietors and single-member LLCs owned by an individual.",
  },
  { id: "llc_classification", line: "3a", label: "If LLC: tax classification letter (C, S, or P)", type: "text", maxLen: 1, locate: N("Page1[0].Boxes3a-b_ReadOrder[0].f1_03[0]") },
  { id: "other_classification", line: "3a", label: "If other: describe", type: "text", locate: N("Page1[0].Boxes3a-b_ReadOrder[0].f1_04[0]") },
  { id: "foreign_partners", line: "3b", label: "Partnership/trust/estate with foreign partners, owners, or beneficiaries", type: "checkbox", locate: N("Page1[0].Boxes3a-b_ReadOrder[0].c1_2[0]") },
  { id: "exempt_payee_code", line: "4", label: "Exempt payee code (if any)", type: "text", locate: N("Page1[0].f1_05[0]") },
  { id: "fatca_code", line: "4", label: "Exemption from FATCA reporting code (if any)", type: "text", locate: N("Page1[0].f1_06[0]") },
  { id: "address", line: "5", label: "Address (number, street, and apt. or suite no.)", type: "text", locate: N("Page1[0].Address_ReadOrder[0].f1_07[0]") },
  { id: "city_state_zip", line: "6", label: "City, state, and ZIP code", type: "text", locate: N("Page1[0].Address_ReadOrder[0].f1_08[0]") },
  { id: "requester", label: "Requester's name and address (optional)", type: "text", locate: N("Page1[0].f1_09[0]") },
  { id: "account_numbers", line: "7", label: "List account number(s) here (optional)", type: "text", locate: N("Page1[0].f1_10[0]") },
  { id: "ssn", line: "Part I", label: "Social security number", type: "ssn", locate: { p1: N("Page1[0].f1_11[0]"), p2: N("Page1[0].f1_12[0]"), p3: N("Page1[0].f1_13[0]") } },
  { id: "ein", line: "Part I", label: "Employer identification number", type: "ein", locate: { p1: N("Page1[0].f1_14[0]"), p2: N("Page1[0].f1_15[0]") } },
];

export const formW9: FormDef = {
  id: "fw9",
  title: "Form W-9, Request for Taxpayer Identification Number and Certification",
  shortTitle: "Form W-9",
  description: "What a contractor gives to the business that pays them: name, tax classification, address, and TIN, so the payer can issue Form 1099-NEC. Not filed with the IRS.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/fw9.pdf",
  notes: `**What this form is for.** Give it to anyone who will pay you $600 or more for services so they can report the payments on Form 1099-NEC. The form is not a tax year form; the current revision (March 2024) is used for every year.

**What the engine computes.** Nothing; it fills the boxes. Sign and date Part II by hand (or electronically) before sending.

**Things to verify before filing.**
- A sole proprietor or single-member LLC owned by an individual checks "individual" and may use either an SSN or the business EIN; the IRS prefers the SSN for sole proprietors.
- An LLC taxed as a corporation or partnership checks "llc" and supplies the classification letter.
- Never send a W-9 to someone you do not know; it contains your TIN.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.has("classification")) c.warn("classification (line 3a) is required.");
    if (c.str("classification") === "llc" && !c.has("llc_classification")) c.warn("An LLC must enter its tax classification letter: C, S, or P.");
    if (!c.has("ssn") && !c.has("ein")) c.warn("Enter either an SSN or an EIN in Part I.");
    return c.result();
  },
};
