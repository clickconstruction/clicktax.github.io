import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

/** Page 1 is identical in both years. On page 2 the 2024 form names the fourth property's description differently and numbers every later widget one lower. */
const P1 = (n: number) => `Page1[0].f1_${n}[0]`;
const P2 = (n25: number): { names: Partial<Record<TaxYear, string>> } => ({ names: { 2024: `Page2[0].f2_${n25 - 1}[0]`, 2025: `Page2[0].f2_${n25}[0]` } });
const money = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });
const saleItems: NonNullable<FieldDef["items"]> = [
  { id: "description", label: "(a) Description of property", type: "text" },
  { id: "date_acquired", label: "(b) Date acquired (mo., day, yr.)", type: "text" },
  { id: "date_sold", label: "(c) Date sold (mo., day, yr.)", type: "text" },
  { id: "proceeds", label: "(d) Gross sales price", type: "money" },
  { id: "depreciation", label: "(e) Depreciation allowed or allowable since acquisition", type: "money" },
  { id: "cost", label: "(f) Cost or other basis, plus improvements and expense of sale", type: "money" },
  { id: "gain", label: "(g) Gain or (loss): (d) + (e) - (f)", type: "money", computed: true },
];
const tableLocate = (table: string, start: number) => Object.fromEntries(saleItems.map((it, c) => [it.id, [1, 2, 3, 4].map((r) => `Page1[0].${table}[0].Row${r}[0].f1_${start + 7 * (r - 1) + c}[0]`)]));
const COLS = ["A", "B", "C", "D"] as const;
const col = (lineWidgetStart25: number, i: number) => P2(lineWidgetStart25 + i);
const PART3_LINES: Array<[string, number, string, boolean]> = [["20", 13, "Gross sales price", false], ["21", 17, "Cost or other basis plus expense of sale", false], ["22", 21, "Depreciation (or depletion) allowed or allowable", false], ["23", 25, "Adjusted basis (21 - 22)", true], ["24", 29, "Total gain (20 - 23)", true], ["25a", 33, "Section 1245: depreciation allowed or allowable from line 22", true], ["25b", 37, "Section 1245: smaller of line 24 or 25a", true], ["26a", 41, "Section 1250: additional depreciation after 1975", false], ["26b", 45, "Section 1250: applicable percentage x the smaller of line 24 or 26a", true], ["26c", 49, "Section 1250: line 24 minus line 26a (excess)", true], ["26d", 53, "Section 1250: additional depreciation after 1969 and before 1976", false], ["26e", 57, "Section 1250: smaller of line 26c or 26d", true], ["26f", 61, "Section 291 amount (corporations only)", false], ["26g", 65, "Section 1250: add lines 26b, 26e, and 26f", true], ["27a", 69, "Section 1252: soil, water, and land clearing expenses", false], ["27b", 73, "Section 1252: line 27a x applicable percentage", false], ["27c", 77, "Section 1252: smaller of line 24 or 27b", true], ["28a", 81, "Section 1254: intangible drilling and development costs, mining exploration costs, depletion", false], ["28b", 85, "Section 1254: smaller of line 24 or 28a", true], ["29a", 89, "Section 1255: applicable percentage of payments excluded under section 126", false], ["29b", 93, "Section 1255: smaller of line 24 or 29a", true]];

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: { name: P1(1) } },
  { id: "ssn", label: "Identifying number", type: "ssn", locate: { name: P1(2) } },
  money("line1a", "1a", "Gross proceeds from sales or exchanges reported on Forms 1099-B or 1099-S that you are including on line 2, 10, or 20", { name: P1(3) }),
  money("line1b", "1b", "Gain included on lines 2, 10, and 24 from partial dispositions of MACRS assets", { name: P1(4) }),
  money("line1c", "1c", "Loss included on lines 2 and 10 from partial dispositions of MACRS assets", { name: P1(5) }),
  { id: "part1_sales", line: "2", label: "Part I: sales or exchanges of property held more than 1 year (section 1231), up to 4 rows", type: "list", rows: 4, items: saleItems, listLocate: { 2024: tableLocate("TableLine2", 6), 2025: tableLocate("TableLine2", 6) } },
  money("line3", "3", "Gain from Form 4684 line 39", { name: P1(34) }),
  money("line4", "4", "Section 1231 gain from installment sales (Form 6252 line 26 or 37)", { name: P1(35) }),
  money("line5", "5", "Section 1231 gain or (loss) from like-kind exchanges (Form 8824)", { name: P1(36) }),
  comp("line6", "6", "Gain from line 32, other than casualty or theft", { name: P1(37) }, "line 32"),
  comp("line7", "7", "Combine lines 2 through 6 (net section 1231 gain or loss)", { name: P1(38) }, "2 + 3 + 4 + 5 + 6", { alwaysShow: true }),
  money("line8", "8", "Nonrecaptured net section 1231 losses from the prior 5 years", { name: P1(39) }),
  comp("line9", "9", "Subtract line 8 from line 7; long-term capital gain to Schedule D line 11", { name: P1(40) }, "max(0, 7 - 8)", { alwaysShow: true }),
  { id: "part2_sales", line: "10", label: "Part II: ordinary gains and losses (property held 1 year or less), up to 4 rows", type: "list", rows: 4, items: saleItems, listLocate: { 2024: tableLocate("TableLine10", 41), 2025: tableLocate("TableLine10", 41) } },
  comp("line11", "11", "Loss, if any, from line 7 (as a negative)", { name: P1(69) }, "line 7 when negative"),
  comp("line12", "12", "Gain from line 7 treated as ordinary (the smaller of line 7 or line 8)", { name: P1(70) }, "min(7, 8) when 7 is a gain"),
  comp("line13", "13", "Gain from line 31 (recapture)", { name: P1(71) }, "line 31"),
  money("line14", "14", "Net gain or (loss) from Form 4684 lines 31 and 38a", { name: P1(72) }),
  money("line15", "15", "Ordinary gain from installment sales (Form 6252 line 25 or 36)", { name: P1(73) }),
  money("line16", "16", "Ordinary gain or (loss) from like-kind exchanges (Form 8824)", { name: P1(74) }),
  comp("line17", "17", "Combine lines 10 through 16", { name: P1(75) }, "10 + 11 + 12 + 13 + 14 + 15 + 16"),
  money("line18a", "18a", "Part of the line 11 loss from Form 4684 line 35 column (b)(ii) (employee property)", { name: P1(76) }),
  comp("line18b", "18b", "Ordinary gain or (loss); carried to Schedule 1 line 4", { name: P1(77) }, "17 - 18a", { alwaysShow: true }),
  {
    id: "properties", line: "19-29", label: "Part III: property sold with depreciation recapture (columns A-D): description, dates, kind (1245 equipment/vehicles, 1250 real property, 1252, 1254, 1255), and the line 20-29 inputs", type: "list", rows: 4,
    items: [
      { id: "description", label: "19 Description of section 1245, 1250, 1252, 1254, or 1255 property", type: "text" },
      { id: "date_acquired", label: "19(b) Date acquired", type: "text" },
      { id: "date_sold", label: "19(c) Date sold", type: "text" },
      { id: "kind", label: "Kind: 1245, 1250, 1252, 1254, or 1255", type: "text", maxLen: 4 },
      ...PART3_LINES.map(([line, , label, computed]) => ({ id: `line${line}`, label: `${line} ${label}`, type: "money" as const, ...(computed ? { computed: true } : {}) })),
      { id: "unrecaptured_1250", label: "Unrecaptured section 1250 gain (for Schedule D line 19)", type: "money", computed: true },
    ],
    listLocate: {
      2024: { description: COLS.map((_, i) => (i === 3 ? "Page2[0].PartIIITable1[0].Row4[0].PropertyDescription[0]" : `Page2[0].PartIIITable1[0].Row${i + 1}[0].f2_${1 + 3 * i}[0]`)), date_acquired: COLS.map((_, i) => `Page2[0].PartIIITable1[0].Row${i + 1}[0].f2_${(i === 3 ? 1 : 2) + 3 * i}[0]`), date_sold: COLS.map((_, i) => `Page2[0].PartIIITable1[0].Row${i + 1}[0].f2_${(i === 3 ? 2 : 3) + 3 * i}[0]`), ...Object.fromEntries(PART3_LINES.map(([line, n]) => [`line${line}`, COLS.map((_, i) => `Page2[0].PartIIITable2[0].Row${line}[0].f2_${n + i - 1}[0]`)])) },
      2025: { description: COLS.map((_, i) => `Page2[0].PartIIITable1[0].Row${i + 1}[0].f2_${1 + 3 * i}[0]`), date_acquired: COLS.map((_, i) => `Page2[0].PartIIITable1[0].Row${i + 1}[0].f2_${2 + 3 * i}[0]`), date_sold: COLS.map((_, i) => `Page2[0].PartIIITable1[0].Row${i + 1}[0].f2_${3 + 3 * i}[0]`), ...Object.fromEntries(PART3_LINES.map(([line, n]) => [`line${line}`, COLS.map((_, i) => `Page2[0].PartIIITable2[0].Row${line}[0].f2_${n + i}[0]`)])) },
    },
  },
  comp("line30", "30", "Total gains for all properties (line 24, columns A through D)", P2(97), "sum of 24"),
  comp("line31", "31", "Recapture: add columns A-D of lines 25b, 26g, 27c, 28b, and 29b; carried to line 13", P2(98), "sum of recapture lines"),
  comp("line32", "32", "Subtract line 31 from line 30; the part from casualty or theft goes to Form 4684, the rest to line 6", P2(99), "30 - 31"),
  money("line33a", "33(a)", "Section 179 expense deduction or depreciation allowable in prior years (recapture when business use fell to 50% or less)", { names: { 2024: "Page2[0].PartIVTable[0].Row33[0].f2_99[0]", 2025: "Page2[0].PartIVTable[0].Row33[0].f2_100[0]" } }),
  money("line33b", "33(b)", "Section 280F(b)(2): depreciation allowable in prior years", { names: { 2024: "Page2[0].PartIVTable[0].Row33[0].f2_100[0]", 2025: "Page2[0].PartIVTable[0].Row33[0].f2_101[0]" } }),
  money("line34a", "34(a)", "Recomputed depreciation (section 179 property)", { names: { 2024: "Page2[0].PartIVTable[0].Row34[0].f2_101[0]", 2025: "Page2[0].PartIVTable[0].Row34[0].f2_102[0]" } }),
  money("line34b", "34(b)", "Recomputed depreciation (section 280F property)", { names: { 2024: "Page2[0].PartIVTable[0].Row34[0].f2_102[0]", 2025: "Page2[0].PartIVTable[0].Row34[0].f2_103[0]" } }),
  comp("line35a", "35(a)", "Recapture amount (33 - 34), section 179; include on Schedule C or the form where the deduction was taken", { names: { 2024: "Page2[0].PartIVTable[0].Row35[0].f2_103[0]", 2025: "Page2[0].PartIVTable[0].Row35[0].f2_104[0]" } }, "33a - 34a"),
  comp("line35b", "35(b)", "Recapture amount (33 - 34), section 280F", { names: { 2024: "Page2[0].PartIVTable[0].Row35[0].f2_104[0]", 2025: "Page2[0].PartIVTable[0].Row35[0].f2_105[0]" } }, "33b - 34b"),
  { id: "unrecaptured_1250_total", label: "Total unrecaptured section 1250 gain for Schedule D line 19", type: "money", computed: true, alwaysShow: true },
];

export const form4797: FormDef = {
  id: "f4797",
  title: "Form 4797, Sales of Business Property",
  shortTitle: "Form 4797",
  description: "Sales of business assets and rental property: section 1231 netting (long-term gains to Schedule D, losses as ordinary), ordinary gains and losses, and the depreciation recapture of sections 1245 and 1250 on page 2. Line 9 goes to Schedule D line 11 and line 18b to Schedule 1 line 4.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i4797.pdf",
  notes: `**What goes where.** Depreciable business property held over a year goes through Part III (recapture first, the rest to Part I as section 1231 gain); land and other section 1231 property goes straight on line 2; property held a year or less goes in Part II. A net section 1231 gain is long-term capital gain (after the five-year lookback on line 8); a net loss is ordinary.

**What the engine computes.** Column (g) of lines 2 and 10, lines 6, 7, 9, 11, 12, 13, 17, 18b, Part III lines 23 through 29b for each property from its kind (section 1245 recaptures all depreciation; section 1250 recaptures only additional depreciation, with the straight-line part tracked as unrecaptured section 1250 gain for Schedule D line 19), lines 30 through 32, and the Part IV recapture. In a full return, line 9 lands on Schedule D line 11, line 18b on Schedule 1 line 4, and the unrecaptured gain on Schedule D line 19.

**What to verify.** Section 1250 applicable percentage is 100% for most individuals; installment sales and like-kind exchanges need Forms 6252 and 8824; casualty gains from Form 4684 are entered on lines 3 and 14.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const num = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
    const withGain = (rows: ListRow[]): ListRow[] => rows.map((r) => ({ ...r, gain: num(r, "proceeds") + num(r, "depreciation") - num(r, "cost") }));
    const p1 = withGain(c.list("part1_sales"));
    const p2 = withGain(c.list("part2_sales"));
    if (p1.length) c.out["part1_sales"] = p1;
    if (p2.length) c.out["part2_sales"] = p2;
    // Part III
    let l30 = 0, l31 = 0, unrecaptured = 0;
    const props = c.list("properties").map((r) => {
      const kind = String(r["kind"] ?? "1245").trim();
      const l20 = num(r, "line20"), l21 = num(r, "line21"), l22 = num(r, "line22");
      const l23 = l21 - l22;
      const l24 = l20 - l23;
      const out: ListRow = { ...r, kind, line23: l23, line24: l24 };
      let recapture = 0;
      if (kind === "1245") { out["line25a"] = l22; out["line25b"] = Math.min(l24, l22); recapture = Math.max(0, Math.min(l24, l22)); }
      else if (kind === "1250") {
        const l26a = num(r, "line26a");
        const l26b = Math.max(0, Math.min(l24, l26a));
        const l26c = Math.max(0, l24 - l26a);
        const l26e = Math.min(l26c, num(r, "line26d"));
        const l26g = l26b + l26e + num(r, "line26f");
        Object.assign(out, { line26b: l26b, line26c: l26c, line26e: l26e, line26g: l26g });
        recapture = l26g;
        out["unrecaptured_1250"] = Math.max(0, Math.min(l24, l22) - l26g);
        unrecaptured += Number(out["unrecaptured_1250"]);
      } else if (kind === "1252") { out["line27c"] = Math.min(l24, num(r, "line27b")); recapture = Number(out["line27c"]); }
      else if (kind === "1254") { out["line28b"] = Math.min(l24, num(r, "line28a")); recapture = Number(out["line28b"]); }
      else if (kind === "1255") { out["line29b"] = Math.min(l24, num(r, "line29a")); recapture = Number(out["line29b"]); }
      else c.warn(`properties: kind "${kind}" is not one of 1245, 1250, 1252, 1254, 1255; no recapture figured.`);
      if (l24 < 0) c.warn(`${String(r["description"] ?? "Property")}: Part III is for gains; a loss on depreciable property goes on line 2 (held over a year) or line 10.`);
      l30 += Math.max(0, l24);
      l31 += Math.max(0, recapture);
      return out;
    });
    if (props.length) c.out["properties"] = props;
    c.set("line30", l30, "Total gains, Part III", "sum of 24", "30");
    const l31v = c.set("line31", l31, "Ordinary recapture", "25b + 26g + 27c + 28b + 29b", "31");
    const l32 = c.set("line32", l30 - l31v, "Remaining section 1231 gain", `${f(l30)} - ${f(l31v)}`, "32");
    c.set("unrecaptured_1250_total", unrecaptured, "Unrecaptured section 1250 gain", "sum", "Sch D 19");
    // Part I
    const l6 = c.set("line6", l32, "From line 32", "line 32", "6");
    const l2 = p1.reduce((a, r) => a + num(r, "gain"), 0);
    const l7 = c.set("line7", l2 + c.n("line3") + c.n("line4") + c.n("line5") + l6, "Net section 1231 gain or (loss)", `${f(l2)} + ${f(c.n("line3"))} + ${f(c.n("line4"))} + ${f(c.n("line5"))} + ${f(l6)}`, "7");
    const l8 = c.n("line8");
    const l9 = c.set("line9", l7 > 0 ? Math.max(0, l7 - l8) : 0, "Long-term capital gain to Schedule D", l7 > 0 ? `max(0, ${f(l7)} - ${f(l8)})` : "line 7 is not a gain", "9");
    // Part II
    const l10 = p2.reduce((a, r) => a + num(r, "gain"), 0);
    const l11 = c.set("line11", l7 < 0 ? l7 : 0, "Section 1231 loss treated as ordinary", l7 < 0 ? "line 7" : "none", "11");
    const l12 = c.set("line12", l7 > 0 ? Math.min(l7, l8) : 0, "Section 1231 gain recaptured as ordinary", l7 > 0 ? `min(${f(l7)}, ${f(l8)})` : "none", "12");
    const l13 = c.set("line13", l31v, "Recapture from line 31", "line 31", "13");
    const l17 = c.set("line17", l10 + l11 + l12 + l13 + c.n("line14") + c.n("line15") + c.n("line16"), "Ordinary gains and losses", `${f(l10)} + ${f(l11)} + ${f(l12)} + ${f(l13)} + ${f(c.n("line14"))} + ${f(c.n("line15"))} + ${f(c.n("line16"))}`, "17");
    c.set("line18b", l17 - c.n("line18a"), "Ordinary gain or (loss) to Schedule 1 line 4", `${f(l17)} - ${f(c.n("line18a"))}`, "18b");
    c.set("line35a", Math.max(0, c.n("line33a") - c.n("line34a")), "Section 179 recapture", `${f(c.n("line33a"))} - ${f(c.n("line34a"))}`, "35a");
    c.set("line35b", Math.max(0, c.n("line33b") - c.n("line34b")), "Section 280F recapture", `${f(c.n("line33b"))} - ${f(c.n("line34b"))}`, "35b");
    if (l9 > 0) c.warn(`Line 9 (${f(l9)}) is long-term capital gain: enter it on Schedule D line 11 (done automatically in a full return).`);
    void l9;
    return c.result();
  },
};
