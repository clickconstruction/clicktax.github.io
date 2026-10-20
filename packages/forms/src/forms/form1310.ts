import { Calc } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${n}[0]`;
const yn = (n: number) => ({ yes: { name: `Page1[0].c1_${n}[0]` }, no: { name: `Page1[0].c1_${n}[1]` } });

const fields: FieldDef[] = [
  { id: "calendar_year", label: "Tax year the decedent was due a refund (calendar year, four digits)", type: "text", maxLen: 4, locate: { name: P(1) }, notes: "Defaults to the tax year. For a fiscal year supply fy_begin, fy_begin_year, fy_end, fy_end_year instead." },
  { id: "fy_begin", label: "Other tax year beginning (month and day)", type: "text", locate: { name: P(2) } },
  { id: "fy_begin_year", label: "Beginning year, last two digits", type: "text", maxLen: 2, locate: { name: P(3) } },
  { id: "fy_end", label: "Ending (month and day)", type: "text", locate: { name: P(4) } },
  { id: "fy_end_year", label: "Ending year, last two digits", type: "text", maxLen: 2, locate: { name: P(5) } },
  { id: "decedent_name", label: "Name of decedent (one Form 1310 per deceased taxpayer on a joint return)", type: "text", locate: { name: P(6) } },
  { id: "date_of_death", label: "Date of death", type: "text", locate: { name: P(7) } },
  { id: "decedent_ssn", label: "Decedent's social security number", type: "ssn", maxLen: 11, locate: { name: P(8) } },
  { id: "claimant_name", label: "Name of person claiming refund", type: "text", locate: { name: P(9) } },
  { id: "claimant_ssn", label: "Claimant's social security number", type: "ssn", maxLen: 11, locate: { name: P(10) } },
  { id: "address", label: "Address of person claiming refund (number and street; see the instructions for a P.O. box)", type: "text", locate: { name: P(11) } },
  { id: "apt", label: "Apt. no.", type: "text", locate: { name: P(12) } },
  { id: "city_state_zip", label: "City, town or post office, state, and ZIP code", type: "text", locate: { name: P(13) } },
  { id: "box", line: "Part I", label: "Check only one: \"a\" surviving spouse requesting reissuance of a joint refund check; \"b\" court-appointed or certified personal representative (attach the court certificate); \"c\" other person claiming the refund for the estate (complete Part II)", type: "choice", choices: ["a", "b", "c"], locate: { a: { name: "Page1[0].c1_1[0]" }, b: { name: "Page1[0].c1_1[1]" }, c: { name: "Page1[0].c1_1[2]" } } },
  { id: "line1", line: "1", label: "Did the decedent leave a will?", type: "yesno", locate: yn(2) },
  { id: "line2a", line: "2a", label: "Has a court appointed a personal representative for the estate of the decedent?", type: "yesno", locate: yn(3) },
  { id: "line2b", line: "2b", label: "If no to 2a, will one be appointed?", type: "yesno", locate: yn(4) },
  { id: "line3", line: "3", label: "As the person claiming the refund for the decedent's estate, will you pay out the refund according to the laws of the state where the decedent was a legal resident?", type: "yesno", locate: yn(5) },
  { id: "phone", label: "Phone number (optional)", type: "text", locate: { name: P(14) } },
];

export const form1310: FormDef = {
  id: "f1310",
  title: "Form 1310, Statement of Person Claiming Refund Due a Deceased Taxpayer",
  shortTitle: "Form 1310",
  description: "Lets a surviving spouse, personal representative, or other person claim a refund on behalf of someone who died; Part II is answered when the claimant is not the spouse or a court-appointed representative.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f1310.pdf",
  notes: `**Who files.** Attach Form 1310 to the decedent's return (or Form 1040-X) when claiming a refund, unless you are a surviving spouse filing a joint return with the decedent (no Form 1310 needed) or a court-appointed personal representative filing the original return with the court certificate attached. Box A is only for reissuing a joint refund check already received.

**What the engine does.** Fills the header (the tax year defaults to the return's year), the Part I box, Part II answers, and the phone number, and checks the Part II logic: a court-appointed (or soon-to-be-appointed) representative must file the claim instead, and a "No" on line 3 blocks the refund until a court certificate or other evidence is submitted.

**What to verify.** Box B filers must attach the court certificate even if it was filed before. Only one box may be checked. The signature and date in Part III are completed by hand after printing.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.has("calendar_year") && !c.has("fy_begin")) c.out["calendar_year"] = String(ctx.year);
    const box = c.str("box");
    if (!box) c.warn("Check exactly one Part I box (box: \"a\", \"b\", or \"c\").");
    if (box === "c") {
      if (!c.has("line1") || !c.has("line2a") || !c.has("line3")) c.warn("Box C is checked: answer Part II lines 1, 2a (and 2b if 2a is no), and 3.");
      if (c.bool("line2a") || c.bool("line2b")) c.warn("A personal representative has been or will be appointed (line 2a or 2b is yes): the personal representative must file for the refund, not the person named here.");
      if (c.has("line3") && !c.bool("line3")) c.warn("Line 3 is no: the refund cannot be issued until a court certificate showing your appointment, or other evidence of entitlement under state law, is submitted.");
    } else if (["line1", "line2a", "line2b", "line3"].some((k) => c.has(k))) {
      c.warn("Part II is completed only when box C is checked.");
    }
    if (box === "b") c.warn("Box B: attach the court certificate showing your appointment as personal representative.");
    return c.result();
  },
};
