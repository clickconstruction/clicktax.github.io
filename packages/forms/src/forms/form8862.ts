import { Calc } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const yn = (page: number, n: number) => ({ yes: { name: `Page${page}[0].c${page}_${n}[0]` }, no: { name: `Page${page}[0].c${page}_${n}[1]` } });
const ynList = (page: number, ns: number[]) => ({ yes: ns.map((n) => `Page${page}[0].c${page}_${n}[0]`), no: ns.map((n) => `Page${page}[0].c${page}_${n}[1]`) });
const spread = (prefix: string, o: Record<string, string[]>): Record<string, string[]> => Object.fromEntries(Object.entries(o).map(([k, v]) => [`${prefix}.${k}`, v]));

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: "Page1[0].f1_01[0]" } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: "Page1[0].f1_02[0]" } },
  { id: "tax_year", line: "1", label: "Tax year for which you are filing this form (for example, 2025)", type: "text", maxLen: 4, locate: { name: "Page1[0].Line1_CombField[0].f1_03[0]" }, notes: "Defaults to the return's tax year." },
  { id: "claim_eic", line: "2", label: "Claiming the earned income credit (complete Part II)", type: "checkbox", locate: { name: "Page1[0].Checkbox1_ReadOrder[0].c1_1[0]" } },
  { id: "claim_ctc", line: "2", label: "Claiming the child tax credit, additional child tax credit, or credit for other dependents (complete Part III)", type: "checkbox", locate: { name: "Page1[0].Checkbox2_ReadOrder[0].c1_2[0]" } },
  { id: "claim_aotc", line: "2", label: "Claiming the American opportunity tax credit (complete Part IV)", type: "checkbox", locate: { name: "Page1[0].Checkbox3_ReadOrder[0].c1_3[0]" } },
  { id: "line3", line: "3", label: "Was the only reason your EIC was reduced or disallowed that you incorrectly reported earned income or investment income?", type: "yesno", locate: yn(1, 4), notes: "Yes: skip the rest of Part II and attach the form." },
  { id: "line4", line: "4", label: "Could you (or your spouse if filing jointly) be claimed as a qualifying child of another taxpayer for the year on line 1?", type: "yesno", locate: yn(1, 5), notes: "Yes: you cannot claim the EIC." },
  {
    id: "eic_children",
    line: "5-8",
    label: "Section A: the qualifying children listed on Schedule EIC (up to 3), with the days each lived with you in the United States and birth/death dates (MM and DD) when born or died during the year",
    type: "list",
    rows: 3,
    items: [
      { id: "name", label: "Child's name", type: "text" },
      { id: "days", label: "Days the child lived with you in the United States (line 7)", type: "integer", maxLen: 3 },
      { id: "birth_month", label: "Month of birth, if born during the year (MM)", type: "text", maxLen: 2 },
      { id: "birth_day", label: "Day of birth (DD)", type: "text", maxLen: 2 },
      { id: "death_month", label: "Month of death, if died during the year (MM)", type: "text", maxLen: 2 },
      { id: "death_day", label: "Day of death (DD)", type: "text", maxLen: 2 },
    ],
    listLocate: both({
      name: ["Page1[0].f1_04[0]", "Page1[0].f1_05[0]", "Page1[0].f1_06[0]"],
      days: ["Page1[0].Child1_CombField[0].f1_07[0]", "Page1[0].Child2_CombField[0].f1_08[0]", "Page1[0].Child3_CombField[0].f1_09[0]"],
      birth_month: ["Page1[0].Child1_Birth_Ln8[0].f1_10[0]", "Page1[0].Child2_Birth_Ln8[0].f1_14[0]", "Page1[0].Child3_Birth_Ln8[0].f1_18[0]"],
      birth_day: ["Page1[0].Child1_Birth_Ln8[0].f1_11[0]", "Page1[0].Child2_Birth_Ln8[0].f1_15[0]", "Page1[0].Child3_Birth_Ln8[0].f1_19[0]"],
      death_month: ["Page1[0].Child1_Death_Ln8[0].f1_12[0]", "Page1[0].Child2_Death_Ln8[0].f1_16[0]", "Page1[0].Child3_Death_Ln8[0].f1_20[0]"],
      death_day: ["Page1[0].Child1_Death_Ln8[0].f1_13[0]", "Page1[0].Child2_Death_Ln8[0].f1_17[0]", "Page1[0].Child3_Death_Ln8[0].f1_21[0]"],
    }),
  },
  { id: "line6", line: "6", label: "Does your completed Schedule EIC for the year on line 1 show that you had a qualifying child for the EIC?", type: "yesno", locate: yn(1, 6) },
  { id: "line9a", line: "9a", label: "Section B (no qualifying child): number of days during the year that your main home was in the United States", type: "integer", maxLen: 3, locate: { name: "Page2[0].Ln9a_CombField[0].f2_01[0]" } },
  { id: "line9b", line: "9b", label: "Number of days your spouse's main home was in the United States (joint returns)", type: "integer", maxLen: 3, locate: { name: "Page2[0].Ln9b_CombField[0].f2_02[0]" } },
  { id: "line10a", line: "10a", label: "Your age at the end of the year on line 1", type: "integer", maxLen: 3, locate: { name: "Page2[0].f2_03[0]" } },
  { id: "line10b", line: "10b", label: "Your spouse's age at the end of the year on line 1", type: "integer", maxLen: 3, locate: { name: "Page2[0].f2_04[0]" } },
  { id: "line11a", line: "11a", label: "Can you be claimed as a dependent on another taxpayer's return?", type: "yesno", locate: yn(2, 1) },
  { id: "line11b", line: "11b", label: "Can your spouse (if filing jointly) be claimed as a dependent on another taxpayer's return?", type: "yesno", locate: yn(2, 2) },
  {
    id: "ctc_children",
    line: "12, 14-17",
    label: "Part III: each child claimed for the child tax credit or additional child tax credit (up to 4) with the line 14 through 17 answers",
    type: "list",
    rows: 4,
    items: [
      { id: "name", label: "Child's name", type: "text" },
      { id: "lived_with_you", label: "Line 14: did the child live with you for more than half of the year (or meet an exception)?", type: "yesno" },
      { id: "qualifying_child", label: "Line 15: did the child meet the requirements to be a qualifying child for the CTC/ACTC?", type: "yesno" },
      { id: "is_dependent", label: "Line 16: is the child your dependent?", type: "yesno" },
      { id: "citizen", label: "Line 17: is the child a citizen, national, or resident of the United States?", type: "yesno" },
    ],
    listLocate: both({
      name: ["Page2[0].f2_05[0]", "Page2[0].f2_06[0]", "Page2[0].f2_07[0]", "Page2[0].f2_08[0]"],
      ...spread("lived_with_you", ynList(2, [3, 4, 5, 6])),
      ...spread("qualifying_child", ynList(2, [7, 8, 9, 10])),
      ...spread("is_dependent", ynList(2, [11, 12, 13, 14])),
      ...spread("citizen", ynList(2, [19, 20, 21, 22])),
    }),
  },
  {
    id: "other_dependents",
    line: "13, 16-17",
    label: "Part III: each person claimed for the credit for other dependents (up to 4) with the line 16 and 17 answers",
    type: "list",
    rows: 4,
    items: [
      { id: "name", label: "Dependent's name", type: "text" },
      { id: "is_dependent", label: "Line 16: is the person your dependent?", type: "yesno" },
      { id: "citizen", label: "Line 17: is the person a citizen, national, or resident of the United States?", type: "yesno" },
    ],
    listLocate: both({
      name: ["Page2[0].f2_09[0]", "Page2[0].f2_10[0]", "Page2[0].f2_11[0]", "Page2[0].f2_12[0]"],
      ...spread("is_dependent", ynList(2, [15, 16, 17, 18])),
      ...spread("citizen", ynList(2, [23, 24, 25, 26])),
    }),
  },
  {
    id: "aotc_students",
    line: "18-19",
    label: "Part IV: each student claimed for the American opportunity tax credit (up to 3)",
    type: "list",
    rows: 3,
    items: [
      { id: "name", label: "Student's name", type: "text" },
      { id: "eligible_student", label: "Line 19a: did the student meet the requirements to be an eligible student for the AOTC for the year on line 1?", type: "yesno" },
      { id: "four_prior_years", label: "Line 19b: has the Hope scholarship credit or AOTC been claimed for this student for any 4 tax years before the year on line 1?", type: "yesno" },
    ],
    listLocate: both({
      name: ["Page3[0].f3_01[0]", "Page3[0].f3_02[0]", "Page3[0].f3_03[0]"],
      ...spread("eligible_student", ynList(3, [1, 2, 3])),
      ...spread("four_prior_years", ynList(3, [4, 5, 6])),
    }),
  },
];

export const form8862: FormDef = {
  id: "f8862",
  title: "Form 8862, Information To Claim Certain Credits After Disallowance",
  shortTitle: "Form 8862",
  description: "Required when claiming the earned income credit, child tax credit, credit for other dependents, or American opportunity credit after the IRS disallowed or reduced that credit in an earlier year for a reason other than a math or clerical error.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8862.pdf",
  notes: `**Who files.** You must attach Form 8862 the first time you claim a credit again after it was disallowed (unless the disallowance was only a math or clerical error, or you are within a 2- or 10-year ban, in which case the credit cannot be claimed at all). Once the credit is allowed again you do not need the form in later years unless it is disallowed again.

**What the engine does.** Fills the parts you answer (Part II for the EIC, Part III for the child credits, Part IV for the AOTC), defaults line 1 to the tax year, and checks the answers that would make a credit unavailable: a qualifying child who lived with you fewer than 183 days, a "Yes" on line 4 or 11a, an age outside 25 through 64 for the childless EIC, and a student with four prior AOTC years.

**What to verify.** Names must match Schedule EIC, the Form 1040 dependents table, and Form 8863 exactly. Days in the United States include temporary absences (school, illness, military service). Claiming the credit without a required Form 8862 causes the IRS to deny it and delays the refund.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.has("tax_year")) c.out["tax_year"] = String(ctx.year);
    const eic = c.list("eic_children");
    const ctc = c.list("ctc_children");
    const others = c.list("other_dependents");
    const students = c.list("aotc_students");
    if (eic.length > 3) c.warn("More than 3 EIC children: only the first 3 print.");
    if (ctc.length > 4) c.warn("More than 4 CTC/ACTC children: only the first 4 print; attach a statement.");
    if (others.length > 4) c.warn("More than 4 other dependents: only the first 4 print; attach a statement.");
    if (students.length > 3) c.warn("More than 3 students: only the first 3 print; attach a statement.");
    if (!c.bool("claim_eic") && !c.bool("claim_ctc") && !c.bool("claim_aotc")) c.warn("Check at least one line 2 box (claim_eic, claim_ctc, claim_aotc) for the credit being claimed again.");
    if (c.bool("claim_eic")) {
      if (c.bool("line3")) c.warn("Line 3 is yes: do not complete the rest of Part II; attach the form to the return.");
      if (c.bool("line4")) c.warn("Line 4 is yes: you cannot claim the EIC for this year.");
      if (eic.length === 0 && c.has("line6") && c.bool("line6")) c.warn("Line 6 is yes but no eic_children were listed.");
      for (const [i, r] of eic.entries()) {
        const days = Number((r as ListRow)["days"] ?? 0) || 0;
        if (r["days"] !== undefined && days < 183) c.warn(`EIC child ${i + 1} lived with you ${days} days: fewer than 183 days means the child is not a qualifying child unless born or died during the year (line 8).`);
      }
      if (eic.length === 0 && !c.bool("line6")) {
        if (c.has("line9a") && c.n("line9a") < 183) c.warn("Line 9a is under 183 days: you cannot claim the EIC without a qualifying child.");
        const age = c.n("line10a");
        if (c.has("line10a") && (age < 25 || age > 64) && !(c.has("line10b") && c.n("line10b") >= 25 && c.n("line10b") <= 64)) c.warn("The childless EIC requires you (or your spouse) to be at least 25 and under 65 at the end of the year.");
        if (c.bool("line11a") && !(c.has("line11b") && !c.bool("line11b"))) c.warn("Line 11a is yes: a person who can be claimed as a dependent cannot take the childless EIC.");
      }
    }
    const no = (r: ListRow, k: string) => r[k] !== undefined && !/^(true|yes|y|1|x)$/i.test(String(r[k])) && r[k] !== true;
    for (const [i, r] of ctc.entries()) {
      if (no(r, "lived_with_you") || no(r, "qualifying_child") || no(r, "is_dependent") || no(r, "citizen")) c.warn(`Child ${i + 1} (${String(r["name"] ?? "")}) has a "No" on lines 14 through 17: the child tax credit cannot be claimed for that child.`);
    }
    for (const [i, r] of others.entries()) {
      if (no(r, "is_dependent") || no(r, "citizen")) c.warn(`Other dependent ${i + 1} (${String(r["name"] ?? "")}) has a "No" on line 16 or 17: the credit for other dependents cannot be claimed for that person.`);
    }
    for (const [i, r] of students.entries()) {
      if (no(r, "eligible_student")) c.warn(`Student ${i + 1} is not an eligible student: no American opportunity credit for that student.`);
      if (r["four_prior_years"] === true || /^(true|yes|y|1|x)$/i.test(String(r["four_prior_years"] ?? ""))) c.warn(`Student ${i + 1} already has 4 years of the Hope/American opportunity credit: the credit cannot be claimed again.`);
    }
    if (c.bool("claim_ctc") && ctc.length === 0 && others.length === 0) c.warn("claim_ctc is checked but no ctc_children or other_dependents were listed.");
    if (c.bool("claim_aotc") && students.length === 0) c.warn("claim_aotc is checked but no aotc_students were listed.");
    return c.result();
  },
};
