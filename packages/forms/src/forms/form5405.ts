import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef } from "../types.ts";

const P = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const money = (id: string, line: string, label: string, n: number, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate: { name: P(n) }, ...extra });
const comp = (id: string, line: string, label: string, n: number, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, n, { computed: true, notes, ...extra });
const BOXES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P(1) } },
  { id: "ssn", label: "Your social security number", type: "ssn", maxLen: 9, locate: { name: P(2) } },
  { id: "line1", line: "1", label: "Date you disposed of, or stopped using as your main home, the home for which you claimed the credit (MM/DD/YYYY)", type: "text", maxLen: 10, locate: { name: P(3) } },
  { id: "line2", line: "2", label: "You (and your spouse if married at the time) are a member of the uniformed services, Foreign Service, or intelligence community and the disposition is in connection with government orders for qualified official extended duty (no repayment required)", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "line3", line: "3", label: "The box that applies: \"a\" sold to an unrelated person with a gain (Part III), \"b\" sold to an unrelated person with no gain (no repayment), \"c\" sold to a related person or gave the home away, \"d\" converted to rental or business use or no longer your main home, \"e\" transferred to a spouse or ex-spouse (no repayment; name on line3e_name), \"f\" destroyed, condemned, or sold under threat of condemnation with a gain, \"g\" same with no gain, \"h\" the taxpayer who claimed the credit died", type: "choice", choices: BOXES, locate: Object.fromEntries(BOXES.map((b, i) => [b, { name: `Page1[0].c1_2[${i}]` }])) },
  { id: "line3e_name", line: "3e", label: "Full name of the spouse or ex-spouse who received the home", type: "text", locate: { name: P(4) } },
  money("line4", "4", "Credit claimed on Form 5405 for 2008 (your half on a joint return later split)", 5),
  money("line5", "5", "Credit repaid with your tax returns for 2010 through the year before this one", 6),
  comp("line6", "6", "Subtract line 5 from line 4 (the unrepaid credit)", 7, "4 - 5"),
  comp("line7", "7", "Gain on the disposition of your main home (from line 15)", 8, "= line 15"),
  comp("line8", "8", "Amount of the credit to be repaid; to Schedule 2 line 10", 9, "box a or f: the smaller of line 6 or line 7; box c or d: line 6", { alwaysShow: true }),
  money("line9", "9", "Part III: selling price of the home, insurance proceeds, or gross condemnation award", 10),
  money("line10", "10", "Selling expenses (commissions, advertising, legal fees, seller-paid loan charges) or expenses of the condemnation award", 11),
  comp("line11", "11", "Amount realized. Subtract line 10 from line 9", 12, "9 - 10"),
  money("line12", "12", "Adjusted basis of the home sold", 13),
  comp("line13", "13", "The first-time homebuyer credit claimed minus the amount repaid (line 6)", 14, "= line 6"),
  comp("line14", "14", "Adjusted basis for repayment purposes. Subtract line 13 from line 12", 15, "12 - 13"),
  comp("line15", "15", "Gain or (loss). Subtract line 14 from line 11", 16, "11 - 14"),
];

export const form5405: FormDef = {
  id: "f5405",
  title: "Form 5405, Repayment of the First-Time Homebuyer Credit",
  shortTitle: "Form 5405",
  description: "Reports the sale, transfer, or change in use of a home bought in 2008 with the first-time homebuyer credit and figures how much of the unrepaid credit is due with this year's return (Schedule 2 line 10).",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i5405.pdf",
  notes: `**Who files.** Anyone who claimed the 2008 first-time homebuyer credit (repayable over 15 years) and disposed of the home or stopped using it as a main home this year. The regular annual installment for a home you still live in does not need Form 5405; it goes straight on Schedule 2 line 10.

**What the engine computes.** Line 6 (the unrepaid credit), Part III gain or loss (lines 11, 13, 14, 15), line 7, and line 8: the repayment is the smaller of the unrepaid credit or the gain for a sale to an unrelated person (box a) or a condemnation with a gain (box f), the full unrepaid credit for a sale to a related person, a gift, or conversion to rental or business use (boxes c and d), and zero for boxes b, e, g, and h.

**What to verify.** The adjusted basis on line 12 is reduced by the credit when figuring the gain for this purpose (line 14). Spouses who claimed a joint credit each file their own Form 5405 for half. Box e (transfer to a spouse) shifts the remaining repayment to the recipient.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const box = c.str("line3");
    if (!box) c.warn("Check one line 3 box (line3: a through h) describing the disposition.");
    const l6 = c.set("line6", Math.max(0, c.n("line4") - c.n("line5")), "Unrepaid credit", `${f(c.n("line4"))} - ${f(c.n("line5"))}`, "6");
    const l11 = c.set("line11", c.n("line9") - c.n("line10"), "Amount realized", `${f(c.n("line9"))} - ${f(c.n("line10"))}`, "11");
    const l13 = c.set("line13", l6, "Credit claimed less repaid", "= line 6", "13");
    const l14 = c.set("line14", c.n("line12") - l13, "Adjusted basis for repayment", `${f(c.n("line12"))} - ${f(l13)}`, "14");
    const l15 = c.set("line15", c.has("line9") ? l11 - l14 : 0, "Gain or (loss)", c.has("line9") ? `${f(l11)} - ${f(l14)}` : "Part III not completed", "15");
    const l7 = c.set("line7", Math.max(0, l15), "Gain on the disposition", "= line 15 (not less than zero)", "7");
    let l8 = 0;
    let how = "no repayment required";
    if (c.bool("line2")) how = "line 2: official extended duty, no repayment";
    else if (box === "a" || box === "f") {
      l8 = Math.min(l6, l7);
      how = `min(${f(l6)}, ${f(l7)})`;
    } else if (box === "c" || box === "d") {
      l8 = l6;
      how = "= line 6 (full unrepaid credit)";
    }
    c.set("line8", l8, "Credit to be repaid (Schedule 2 line 10)", how, "8");
    if ((box === "a" || box === "f") && !c.has("line9")) c.warn("Box a or f: complete Part III (lines 9 through 12) so the gain on line 7 can limit the repayment.");
    if ((box === "a" || box === "f") && c.has("line9") && l15 <= 0) c.warn(`No gain on the disposition (${f(l15)}): check box ${box === "a" ? "b" : "g"} instead; no repayment is required.`);
    if (box === "e" && !c.str("line3e_name")) c.warn("Box e: supply line3e_name (the spouse or ex-spouse who received the home).");
    if (box === "h") c.warn("Box h: no repayment is required of the deceased taxpayer; on a joint return the surviving spouse repays only their half.");
    return c.result();
  },
};
