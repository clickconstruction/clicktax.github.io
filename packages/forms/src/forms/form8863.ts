import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, TaxYear } from "../types.ts";

type Y<T> = Partial<Record<TaxYear, T>>;
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const nm = (y24: string, y25: string): { names: Y<string> } => ({ names: { 2024: y24, 2025: y25 } });
const money = (id: string, line: string, label: string, locate: FieldDef["locate"] | undefined, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", ...(locate ? { locate } : {}), ...extra });
const comp = (id: string, line: string, label: string, locate: FieldDef["locate"] | undefined, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });
const ssnSplit = (p1: string, p2: string, p3: string) => ({ p1: { name: p1 }, p2: { name: p2 }, p3: { name: p3 } });

const PHASEOUT = { mfj: { start: 160000, range: 20000 }, other: { start: 80000, range: 10000 } };

function institution(k: "1" | "2", grp: "Line22a" | "Line22b", y24: { name: number; cb: [number, number]; ein: number }, y25: { name: number; cb: [number, number]; ein: number }): FieldDef[] {
  const g = (n: number) => `Page2[0].${grp}[0].f2_${n}[0]`;
  const cb = (i: number, which: 0 | 1) => `Page2[0].${grp}[0].c2_${i}[${which}]`;
  return [
    { id: `institution_${k}_name`, line: "22", label: `Eligible educational institution ${k}: name`, type: "text", locate: nm(g(y24.name), g(y25.name)) },
    { id: `institution_${k}_address`, line: "22", label: `Institution ${k}: address (number, street, city, state, ZIP)`, type: "text", locate: nm(g(y24.name + 1), g(y25.name + 1)) },
    { id: `institution_${k}_1098t`, line: "22(2)", label: `Institution ${k}: did the student receive Form 1098-T from this institution for this year?`, type: "yesno", locate: { yes: { name: cb(y24.cb[0], 0) }, no: { name: cb(y24.cb[0], 1) } } },
    { id: `institution_${k}_1098t_prior_box7`, line: "22(3)", label: `Institution ${k}: did the student receive Form 1098-T from this institution for the prior year with box 7 checked?`, type: "yesno", locate: { yes: { name: cb(y24.cb[1], 0) }, no: { name: cb(y24.cb[1], 1) } } },
    { id: `institution_${k}_ein`, line: "22(4)", label: `Institution ${k}: employer identification number (from Form 1098-T)`, type: "ein" },
    ...Array.from({ length: 9 }, (_, i): FieldDef => ({ id: `institution_${k}_ein_d${i + 1}`, label: `Institution ${k} EIN digit ${i + 1}`, type: "text", computed: true, maxLen: 1, locate: nm(g(y24.ein + i), g(y25.ein + i)) })),
  ];
}

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: nm(P1(1), P1(1)) },
  { id: "ssn", label: "Your social security number", type: "ssn", locate: ssnSplit("Page1[0].SocialSecurity[0].f1_2[0]", "Page1[0].SocialSecurity[0].f1_3[0]", "Page1[0].SocialSecurity[0].f1_4[0]") },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  money("additional_students_line30", "1", "Total of Part III line 30 from additional Forms 8863 (other students)", undefined),
  money("additional_students_line31", "10", "Total of Part III line 31 from additional Forms 8863 (other students)", undefined),
  comp("line1", "1", "Total of all Part III line 30 amounts (American opportunity credit tentative)", { name: P1(5) }, "line 30 (+ other students)"),
  comp("line2", "2", "$180,000 if married filing jointly; $90,000 otherwise", { name: P1(6) }, "by filing status"),
  money("line3", "3", "Amount from Form 1040 line 11 (modified AGI; see instructions if you file Form 2555 or 4563)", { name: P1(7) }),
  comp("line4", "4", "Subtract line 3 from line 2; if zero or less, stop (no education credit)", { name: P1(8) }, "2 - 3"),
  comp("line5", "5", "$20,000 if married filing jointly; $10,000 otherwise", { name: P1(9) }, "by filing status"),
  { id: "line6_whole", line: "6", label: "Line 6 whole number (1 if line 4 is at least line 5, else 0)", type: "text", computed: true, maxLen: 1, locate: { name: P1(10) } },
  { id: "line6_decimals", line: "6", label: "Line 6 decimals (three digits; line 4 / line 5 when less than 1)", type: "text", computed: true, maxLen: 3, locate: { name: P1(11) } },
  { id: "under_24_no_refundable", line: "7", label: "Check if you were under 24 at year end and meet the conditions in the instructions (no refundable credit)", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  comp("line7", "7", "Multiply line 1 by line 6", { name: P1(12) }, "1 x 6"),
  comp("line8", "8", "Refundable American opportunity credit (40% of line 7); carried to Form 1040 line 29", { name: P1(13) }, "7 x 0.40 (zero if the under-24 box is checked)", { alwaysShow: true }),
  comp("line9", "9", "Subtract line 8 from line 7 (to the Credit Limit Worksheet)", { name: P1(14) }, "7 - 8"),
  comp("line10", "10", "Total of all Part III line 31 amounts (lifetime learning credit expenses)", { name: P1(15) }, "line 31 (+ other students)"),
  comp("line11", "11", "Smaller of line 10 or $10,000", { name: P1(16) }, "min(10, 10,000)"),
  comp("line12", "12", "Multiply line 11 by 20%", { name: P1(17) }, "11 x 0.20"),
  comp("line13", "13", "$180,000 if married filing jointly; $90,000 otherwise", { name: P1(18) }, "by filing status"),
  comp("line14", "14", "Amount from Form 1040 line 11 (same as line 3)", { name: P1(19) }, "line 3"),
  comp("line15", "15", "Subtract line 14 from line 13; if zero or less, no lifetime learning credit", { name: P1(20) }, "13 - 14"),
  comp("line16", "16", "$20,000 if married filing jointly; $10,000 otherwise", { name: P1(21) }, "by filing status"),
  { id: "line17_whole", line: "17", label: "Line 17 whole number", type: "text", computed: true, maxLen: 1, locate: { name: P1(22) } },
  { id: "line17_decimals", line: "17", label: "Line 17 decimals (three digits)", type: "text", computed: true, maxLen: 3, locate: { name: P1(23) } },
  comp("line18", "18", "Multiply line 12 by line 17 (to line 1 of the Credit Limit Worksheet)", { name: P1(24) }, "12 x 17"),
  money("credit_limit", "19", "Credit Limit Worksheet line 6: Form 1040 line 18 minus Schedule 3 lines 1 and 2", undefined, { notes: "Supplied automatically in a full return." }),
  comp("line19", "19", "Nonrefundable education credits; carried to Schedule 3 line 3", { name: P1(25) }, "smaller of (line 18 + line 9) or the credit limit", { alwaysShow: true }),
  { id: "student_page_name", label: "Name(s) shown on return (page 2)", type: "text", computed: true, locate: nm("Page2[0].NameShown[0]", "Page2[0].f2_1[0]") },
  { id: "student_page_ssn", label: "Your social security number (page 2)", type: "ssn", computed: true, locate: { p1: nm("Page2[0].SSN[0].f2_1[0]", "Page2[0].SSN[0].f2_2[0]"), p2: nm("Page2[0].SSN[0].f2_2[0]", "Page2[0].SSN[0].f2_3[0]"), p3: nm("Page2[0].SSN[0].f2_3[0]", "Page2[0].SSN[0].f2_4[0]") } },
  { id: "student_name", line: "20", label: "Student name (as shown on page 1 of your tax return)", type: "text", locate: nm("Page2[0].StudentName[0]", "Page2[0].f2-5[0]") },
  { id: "student_ssn", line: "21", label: "Student social security number", type: "ssn", locate: { p1: nm("Page2[0].StudentSSN[0].f2_4[0]", "Page2[0].StudentSSN[0].f2_6[0]"), p2: nm("Page2[0].StudentSSN[0].f2_5[0]", "Page2[0].StudentSSN[0].f2_7[0]"), p3: nm("Page2[0].StudentSSN[0].f2_6[0]", "Page2[0].StudentSSN[0].f2_8[0]") } },
  ...institution("1", "Line22a", { name: 7, cb: [1, 2], ein: 9 }, { name: 9, cb: [1, 2], ein: 11 }),
  ...institution("2", "Line22b", { name: 18, cb: [3, 4], ein: 20 }, { name: 20, cb: [3, 4], ein: 22 }),
  { id: "line23", line: "23", label: "Has the American opportunity credit been claimed for this student for any 4 prior tax years?", type: "yesno", locate: { yes: { name: "Page2[0].c2_5[0]" }, no: { name: "Page2[0].c2_5[1]" } } },
  { id: "line24", line: "24", label: "Was the student enrolled at least half-time for at least one academic period that began (or is treated as beginning) in the year at an eligible institution in a program leading to a degree, certificate, or other recognized credential?", type: "yesno", locate: { yes: { name: "Page2[0].c2_6[0]" }, no: { name: "Page2[0].c2_6[1]" } } },
  { id: "line25", line: "25", label: "Did the student complete the first 4 years of postsecondary education before this year?", type: "yesno", locate: { yes: { name: "Page2[0].c2_7[0]" }, no: { name: "Page2[0].c2_7[1]" } } },
  { id: "line26", line: "26", label: "Was the student convicted, before the end of the year, of a felony for possession or distribution of a controlled substance?", type: "yesno", locate: { yes: { name: "Page2[0].c2_8[0]" }, no: { name: "Page2[0].c2_8[1]" } } },
  money("line27", "27", "American opportunity credit: adjusted qualified education expenses (not more than $4,000 matters)", nm("Page2[0].f2_29[0]", "Page2[0].f2_31[0]")),
  comp("line28", "28", "Subtract $2,000 from line 27; if zero or less, enter 0", nm("Page2[0].f2_30[0]", "Page2[0].f2_32[0]"), "27 - 2,000"),
  comp("line29", "29", "Multiply line 28 by 25%", nm("Page2[0].f2_31[0]", "Page2[0].f2_33[0]"), "28 x 0.25"),
  comp("line30", "30", "If line 28 is zero, line 27; otherwise line 29 + $2,000 (to Part I line 1)", nm("Page2[0].f2_32[0]", "Page2[0].f2_34[0]"), "27, or 29 + 2,000"),
  money("line31", "31", "Lifetime learning credit: adjusted qualified education expenses (to Part II line 10)", nm("Page2[0].f2_33[0]", "Page2[0].f2_35[0]")),
];

export const form8863: FormDef = {
  id: "f8863",
  title: "Form 8863, Education Credits (American Opportunity and Lifetime Learning Credits)",
  shortTitle: "Form 8863",
  description: "The American opportunity credit (up to $2,500 per student, 40% refundable) and the lifetime learning credit (20% of up to $10,000), with the income phaseout. Line 8 goes to Form 1040 line 29 and line 19 to Schedule 3 line 3.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8863.pdf",
  notes: `**One student per form.** Part III covers one student. For more students, prepare another Form 8863 for each and carry their line 30 and line 31 totals into additional_students_line30 / additional_students_line31 on this one, which holds Parts I and II.

**What the engine computes.** Part III lines 28 to 30 when the student qualifies for the American opportunity credit (line 23 No, 24 Yes, 25 No, 26 No); Part I lines 1, 2, 4, 5, 6, 7, 8, 9; Part II lines 10 through 18; line 19 against the credit limit (Form 1040 line 18 minus Schedule 3 lines 1 and 2). Phaseout: modified AGI from $160,000 to $180,000 joint, $80,000 to $90,000 otherwise. Married filing separately cannot claim either credit.

**What to verify.** Adjusted qualified expenses exclude tax-free scholarships, Pell grants, employer assistance, and 529 earnings used tax-free; Form 1098-T box 1 is the starting point; the institution's EIN is required for the American opportunity credit.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") || "single";
    const mfj = status === "mfj";
    const po = mfj ? PHASEOUT.mfj : PHASEOUT.other;
    const ratio = (num: number, den: number): [string, string, number] => {
      if (num >= den) return ["1", "000", 1];
      const r = Math.round((num / den) * 1000) / 1000;
      return ["0", String(Math.round(r * 1000)).padStart(3, "0"), r];
    };
    for (const k of ["1", "2"] as const) {
      const ein = String(values[`institution_${k}_ein`] ?? "").replace(/\D/g, "");
      if (ein.length === 9) ein.split("").forEach((d, i) => (c.out[`institution_${k}_ein_d${i + 1}`] = d));
      else if (ein.length > 0) c.warn(`institution_${k}_ein must have 9 digits.`);
    }
    c.out["student_page_name"] = values["name"] ?? "";
    c.out["student_page_ssn"] = values["ssn"] ?? "";

    // Part III for this student.
    const hasStudent = c.has("student_name") || c.has("line27") || c.has("line31");
    let l30 = 0;
    if (hasStudent) {
      const answered = ["line23", "line24", "line25", "line26"].every((k) => c.has(k));
      const aocEligible = !c.bool("line23") && c.bool("line24") && !c.bool("line25") && !c.bool("line26");
      if (c.has("line27") && c.n("line27") > 0) {
        if (!answered) c.warn("Answer lines 23 through 26 to establish American opportunity credit eligibility.");
        if (answered && !aocEligible) c.warn("Lines 23-26 show this student does not qualify for the American opportunity credit; move the expenses to line 31 (lifetime learning credit).");
        else {
          let l27 = c.n("line27");
          if (l27 > 4000) { c.warn(`line27 is limited to $4,000 (supplied ${f(l27)}); only the first $4,000 of expenses count toward the American opportunity credit.`); l27 = 4000; c.out["line27"] = 4000; }
          const l28 = c.set("line28", Math.max(0, l27 - 2000), "Expenses over $2,000", `max(0, ${f(l27)} - 2,000)`, "28");
          const l29 = c.set("line29", Math.round(l28 * 0.25), "25% of line 28", `${f(l28)} x 0.25`, "29");
          l30 = c.set("line30", l28 === 0 ? l27 : l29 + 2000, "Tentative American opportunity credit", l28 === 0 ? `line 27 ${f(l27)}` : `${f(l29)} + 2,000`, "30");
        }
      }
      if (c.n("line27") > 0 && c.n("line31") > 0) c.warn("The same student cannot take both credits in one year; use line 27 or line 31, not both.");
    }
    const l31 = c.n("line31");

    // Part I: American opportunity credit.
    const l1 = c.set("line1", l30 + c.n("additional_students_line30"), "Total line 30", `${f(l30)} + other students ${f(c.n("additional_students_line30"))}`, "1");
    const l2 = c.set("line2", po.start + po.range, "Phaseout end", mfj ? "married filing jointly" : "other statuses", "2");
    const l3 = c.n("line3");
    if (!c.has("line3")) c.warn("line3 (modified AGI, Form 1040 line 11) was not supplied; the phaseout cannot be applied.");
    const l4 = c.set("line4", Math.max(0, l2 - l3), "Room under the phaseout", `max(0, ${f(l2)} - ${f(l3)})`, "4");
    const l5 = c.set("line5", po.range, "Phaseout range", mfj ? "married filing jointly" : "other statuses", "5");
    const [w6, d6, r6] = ratio(l4, l5);
    c.setScalar("line6_whole", w6, "Line 6 (whole)", `${f(l4)} / ${f(l5)}`, "6");
    c.setScalar("line6_decimals", d6, "Line 6 (decimals)", `${f(l4)} / ${f(l5)} = ${r6}`, "6");
    let l7 = c.set("line7", Math.round(l1 * r6), "American opportunity credit after phaseout", `${f(l1)} x ${r6}`, "7");
    const under24 = c.bool("under_24_no_refundable");
    const l8 = c.set("line8", under24 ? 0 : Math.round(l7 * 0.4), "Refundable American opportunity credit", under24 ? "under-24 box checked: none refundable" : `${f(l7)} x 0.40`, "8");
    const l9 = c.set("line9", l7 - l8, "Nonrefundable part", `${f(l7)} - ${f(l8)}`, "9");

    // Part II: lifetime learning credit.
    const l10 = c.set("line10", l31 + c.n("additional_students_line31"), "Total line 31", `${f(l31)} + other students ${f(c.n("additional_students_line31"))}`, "10");
    const l11 = c.set("line11", Math.min(l10, 10000), "Limited to $10,000", `min(${f(l10)}, 10,000)`, "11");
    const l12 = c.set("line12", Math.round(l11 * 0.2), "20% of line 11", `${f(l11)} x 0.20`, "12");
    const l13 = c.set("line13", po.start + po.range, "Phaseout end", mfj ? "married filing jointly" : "other statuses", "13");
    c.set("line14", l3, "Modified AGI", "line 3", "14");
    const l15 = c.set("line15", Math.max(0, l13 - l3), "Room under the phaseout", `max(0, ${f(l13)} - ${f(l3)})`, "15");
    const l16 = c.set("line16", po.range, "Phaseout range", mfj ? "married filing jointly" : "other statuses", "16");
    const [w17, d17, r17] = ratio(l15, l16);
    c.setScalar("line17_whole", w17, "Line 17 (whole)", `${f(l15)} / ${f(l16)}`, "17");
    c.setScalar("line17_decimals", d17, "Line 17 (decimals)", `${f(l15)} / ${f(l16)} = ${r17}`, "17");
    const l18 = c.set("line18", Math.round(l12 * r17), "Lifetime learning credit after phaseout", `${f(l12)} x ${r17}`, "18");
    const tentative = l18 + l9;
    let l19 = c.has("credit_limit") ? Math.min(tentative, Math.max(0, c.n("credit_limit"))) : tentative;
    if (!c.has("credit_limit") && tentative > 0) c.warn("credit_limit (Form 1040 line 18 minus Schedule 3 lines 1 and 2) was not supplied; line 19 is shown without the tax limit.");
    if (status === "mfs") {
      c.warn("Married filing separately cannot claim education credits; lines 8 and 19 set to zero.");
      l7 = 0;
      c.out["line7"] = 0; c.out["line8"] = 0; c.out["line9"] = 0; l19 = 0;
    }
    if (l4 === 0 && (l1 > 0 || l10 > 0)) c.warn(`Modified AGI ${f(l3)} is at or above the phaseout end ${f(l2)}; no education credit.`);
    c.set("line19", l19, "Nonrefundable education credits", c.has("credit_limit") ? `min(${f(tentative)}, ${f(c.n("credit_limit"))})` : `${f(l18)} + ${f(l9)}`, "19");
    void l7;
    return c.result();
  },
};
