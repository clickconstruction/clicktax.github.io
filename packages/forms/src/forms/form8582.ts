import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

type Y<T> = Partial<Record<TaxYear, T>>;
const YEARS = [2024, 2025] as const;
const pad = (n: number, year: TaxYear) => (year === 2025 ? String(n).padStart(2, "0") : String(n));
/** 2025 names the worksheet tables Table_Part4..7 and zero-pads widget numbers; 2024 uses Roman numerals and no padding. */
const PART: Record<TaxYear, Record<number, string>> = {
  2024: { 4: "Table_PartIV", 5: "Table_PartV", 6: "Table_PartVI", 7: "Table_PartVII", 8: "Table_PartVIII" },
  2025: { 4: "Table_Part4", 5: "Table_Part5", 6: "Table_Part6", 7: "Table_Part7", 8: "Table_PartVIII" },
};
const p1 = (n: number): { names: Y<string> } => ({ names: { 2024: `Page1[0].f1_${n}[0]`, 2025: `Page1[0].f1_${pad(n, 2025)}[0]` } });
const p2 = (n: number): { names: Y<string> } => ({ names: { 2024: `Page2[0].f2_${n}[0]`, 2025: `Page2[0].f2_${pad(n, 2025)}[0]` } });
const money = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, extra: Partial<FieldDef> = {}): FieldDef => ({ id, line, label, type: "money", locate, ...extra });
const comp = (id: string, line: string, label: string, locate: NonNullable<FieldDef["locate"]>, notes: string, extra: Partial<FieldDef> = {}): FieldDef => money(id, line, label, locate, { computed: true, notes, ...extra });
const ROWS = [1, 2, 3, 4, 5];
const perYear = (fn: (y: TaxYear) => Record<string, string[]>): Y<Record<string, string[]>> => ({ 2024: fn(2024), 2025: fn(2025) });

const wsItems = (): NonNullable<FieldDef["items"]> => [
  { id: "name", label: "Name of activity", type: "text" },
  { id: "form_schedule", label: "Form or schedule and line number the loss is reported on (e.g. Sch E line 22)", type: "text" },
  { id: "net_income", label: "(a) Current year net income", type: "money" },
  { id: "net_loss", label: "(b) Current year net loss (as a positive number)", type: "money" },
  { id: "prior_unallowed", label: "(c) Prior years' unallowed loss (as a positive number)", type: "money" },
  { id: "overall_gain", label: "(d) Overall gain", type: "money", computed: true },
  { id: "overall_loss", label: "(e) Overall loss", type: "money", computed: true },
];
const ws1Locate = perYear((y) => ({
  name: ROWS.map((r) => `Page1[0].${PART[y][4]}[0].Row${r}[0].f1_${20 + 6 * (r - 1)}[0]`),
  net_income: ROWS.map((r) => `Page1[0].${PART[y][4]}[0].Row${r}[0].f1_${21 + 6 * (r - 1)}[0]`),
  net_loss: ROWS.map((r) => `Page1[0].${PART[y][4]}[0].Row${r}[0].f1_${22 + 6 * (r - 1)}[0]`),
  prior_unallowed: ROWS.map((r) => `Page1[0].${PART[y][4]}[0].Row${r}[0].f1_${23 + 6 * (r - 1)}[0]`),
  overall_gain: ROWS.map((r) => `Page1[0].${PART[y][4]}[0].Row${r}[0].f1_${24 + 6 * (r - 1)}[0]`),
  overall_loss: ROWS.map((r) => `Page1[0].${PART[y][4]}[0].Row${r}[0].f1_${25 + 6 * (r - 1)}[0]`),
}));
const ws2Locate = perYear((y) => ({
  name: ROWS.map((r) => `Page2[0].${PART[y][5]}[0].Row${r}[0].f2_${pad(1 + 6 * (r - 1), y)}[0]`),
  net_income: ROWS.map((r) => `Page2[0].${PART[y][5]}[0].Row${r}[0].f2_${pad(2 + 6 * (r - 1), y)}[0]`),
  net_loss: ROWS.map((r) => `Page2[0].${PART[y][5]}[0].Row${r}[0].f2_${pad(3 + 6 * (r - 1), y)}[0]`),
  prior_unallowed: ROWS.map((r) => `Page2[0].${PART[y][5]}[0].Row${r}[0].f2_${pad(4 + 6 * (r - 1), y)}[0]`),
  overall_gain: ROWS.map((r) => `Page2[0].${PART[y][5]}[0].Row${r}[0].f2_${pad(5 + 6 * (r - 1), y)}[0]`),
  overall_loss: ROWS.map((r) => `Page2[0].${PART[y][5]}[0].Row${r}[0].f2_${pad(6 + 6 * (r - 1), y)}[0]`),
}));
const part6Locate = perYear((y) => Object.fromEntries(["name", "form_schedule", "loss", "ratio", "special_allowance", "remaining"].map((k, c) => [k, ROWS.map((r) => `Page2[0].${PART[y][6]}[0].Row${r}[0].f2_${36 + 6 * (r - 1) + c}[0]`)])));
const part7Locate = perYear((y) => Object.fromEntries(["name", "form_schedule", "loss", "ratio", "unallowed"].map((k, c) => [k, ROWS.map((r) => `Page2[0].${PART[y][7]}[0].Row${r}[0].f2_${70 + 5 * (r - 1) + c}[0]`)])));
const part8Locate = perYear((y) => Object.fromEntries(["name", "form_schedule", "loss", "unallowed", "allowed"].map((k, c) => [k, ROWS.map((r) => `Page2[0].${PART[y][8]}[0].Row${r}[0].f2_${98 + 5 * (r - 1) + c}[0]`)])));
const wsTotal = (part: 4 | 5, c: number): { names: Y<string> } => ({ names: { 2024: part === 4 ? `Page1[0].${PART[2024][4]}[0].Row6[0].f1_${50 + c}[0]` : `Page2[0].${PART[2024][5]}[0].Total[0].f2_${31 + c}[0]`, 2025: part === 4 ? `Page1[0].${PART[2025][4]}[0].Row6[0].f1_${50 + c}[0]` : `Page2[0].${PART[2025][5]}[0].Total[0].f2_${31 + c}[0]` } });

const fields: FieldDef[] = [
  { id: "name", label: "Name(s) shown on return", type: "text", locate: p1(1) },
  { id: "ssn", label: "Identifying number", type: "ssn", locate: p1(2) },
  { id: "filing_status", label: "Filing status (single, mfj, mfs, hoh, qss)", type: "choice", choices: ["single", "mfj", "mfs", "hoh", "qss"] },
  { id: "mfs_lived_apart", label: "Married filing separately and you lived apart from your spouse all year (halves the special allowance; otherwise MFS gets none)", type: "checkbox" },
  { id: "rental_activities", line: "Part IV", label: "Worksheet 1: rental real estate activities with active participation (up to 5)", type: "list", rows: 5, items: wsItems(), listLocate: ws1Locate },
  { id: "other_activities", line: "Part V", label: "Worksheet 2: all other passive activities (up to 5)", type: "list", rows: 5, items: wsItems(), listLocate: ws2Locate },
  comp("ws1_income", "Part IV", "Worksheet 1 total: (a) net income", wsTotal(4, 0), "sum"),
  comp("ws1_loss", "Part IV", "Worksheet 1 total: (b) net loss", wsTotal(4, 1), "sum"),
  comp("ws1_prior", "Part IV", "Worksheet 1 total: (c) prior unallowed", wsTotal(4, 2), "sum"),
  comp("ws1_gain", "Part IV", "Worksheet 1 total: (d) overall gain", wsTotal(4, 3), "sum"),
  comp("ws1_overall_loss", "Part IV", "Worksheet 1 total: (e) overall loss", wsTotal(4, 4), "sum"),
  comp("ws2_income", "Part V", "Worksheet 2 total: (a) net income", wsTotal(5, 0), "sum"),
  comp("ws2_loss", "Part V", "Worksheet 2 total: (b) net loss", wsTotal(5, 1), "sum"),
  comp("ws2_prior", "Part V", "Worksheet 2 total: (c) prior unallowed", wsTotal(5, 2), "sum"),
  comp("ws2_gain", "Part V", "Worksheet 2 total: (d) overall gain", wsTotal(5, 3), "sum"),
  comp("ws2_overall_loss", "Part V", "Worksheet 2 total: (e) overall loss", wsTotal(5, 4), "sum"),
  comp("line1a", "1a", "Rental real estate activities with active participation: net income", p1(3), "Worksheet 1 (a)"),
  comp("line1b", "1b", "Net loss (negative)", p1(4), "-Worksheet 1 (b)"),
  comp("line1c", "1c", "Prior years' unallowed losses (negative)", p1(5), "-Worksheet 1 (c)"),
  comp("line1d", "1d", "Combine lines 1a, 1b, and 1c", p1(6), "1a + 1b + 1c"),
  comp("line2a", "2a", "All other passive activities: net income", p1(7), "Worksheet 2 (a)"),
  comp("line2b", "2b", "Net loss (negative)", p1(8), "-Worksheet 2 (b)"),
  comp("line2c", "2c", "Prior years' unallowed losses (negative)", p1(9), "-Worksheet 2 (c)"),
  comp("line2d", "2d", "Combine lines 2a, 2b, and 2c", p1(10), "2a + 2b + 2c"),
  comp("line3", "3", "Combine lines 1d and 2d; if zero or more, all losses are allowed", p1(11), "1d + 2d", { alwaysShow: true }),
  comp("line4", "4", "Smaller of the loss on line 1d or the loss on line 3", p1(12), "min(-1d, -3)"),
  comp("line5", "5", "$150,000 ($75,000 if married filing separately and lived apart all year)", p1(13), "by filing status"),
  money("line6", "6", "Modified adjusted gross income (AGI without passive losses, taxable social security, IRA and student loan deductions)", p1(14)),
  comp("line7", "7", "Subtract line 6 from line 5; if zero or less, no special allowance", p1(15), "5 - 6"),
  comp("line8", "8", "Multiply line 7 by 50%, not more than $25,000 ($12,500 MFS lived apart)", p1(16), "min(7 x 0.5, 25,000)"),
  comp("line9", "9", "Special allowance: smaller of line 4 or line 8", p1(17), "min(4, 8)", { alwaysShow: true }),
  comp("line10", "10", "Add the income on lines 1a and 2a", p1(18), "1a + 2a"),
  comp("line11", "11", "Total losses allowed from all passive activities this year", p1(19), "9 + 10", { alwaysShow: true }),
  { id: "part6", line: "Part VI", label: "Allocation of the special allowance among rental activities with overall losses", type: "list", rows: 5, computed: true, items: [{ id: "name", label: "Name of activity", type: "text" }, { id: "form_schedule", label: "Form or schedule", type: "text" }, { id: "loss", label: "(a) Loss", type: "money" }, { id: "ratio", label: "(b) Ratio", type: "text" }, { id: "special_allowance", label: "(c) Special allowance", type: "money" }, { id: "remaining", label: "(d) Subtract (c) from (a)", type: "money" }], listLocate: part6Locate },
  comp("part6_loss", "Part VI", "Total (a)", p2(66), "sum"),
  comp("part6_special", "Part VI", "Total (c)", p2(68), "sum"),
  comp("part6_remaining", "Part VI", "Total (d)", p2(69), "sum"),
  { id: "part7", line: "Part VII", label: "Allocation of unallowed losses", type: "list", rows: 5, computed: true, items: [{ id: "name", label: "Name of activity", type: "text" }, { id: "form_schedule", label: "Form or schedule", type: "text" }, { id: "loss", label: "(a) Loss", type: "money" }, { id: "ratio", label: "(b) Ratio", type: "text" }, { id: "unallowed", label: "(c) Unallowed loss", type: "money" }], listLocate: part7Locate },
  comp("part7_loss", "Part VII", "Total (a)", p2(95), "sum"),
  comp("part7_unallowed", "Part VII", "Total (c)", p2(97), "sum"),
  { id: "part8", line: "Part VIII", label: "Allowed losses", type: "list", rows: 5, computed: true, items: [{ id: "name", label: "Name of activity", type: "text" }, { id: "form_schedule", label: "Form or schedule", type: "text" }, { id: "loss", label: "(a) Loss", type: "money" }, { id: "unallowed", label: "(b) Unallowed loss", type: "money" }, { id: "allowed", label: "(c) Allowed loss", type: "money" }], listLocate: part8Locate },
  comp("part8_loss", "Part VIII", "Total (a)", p2(123), "sum"),
  comp("part8_unallowed", "Part VIII", "Total (b)", p2(124), "sum"),
  comp("part8_allowed", "Part VIII", "Total (c)", p2(125), "sum"),
];

export const form8582: FormDef = {
  id: "f8582",
  title: "Form 8582, Passive Activity Loss Limitations",
  shortTitle: "Form 8582",
  description: "Nets passive income against passive losses, applies the $25,000 special allowance for rental real estate with active participation (phased out between $100,000 and $150,000 of modified AGI), and allocates the allowed and unallowed loss to each activity.",
  years: YEARS as unknown as TaxYear[],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8582.pdf",
  notes: `**What this form is for.** Losses from passive activities (rentals, businesses you don't materially participate in) can only offset passive income, except for up to $25,000 of rental real estate loss when you actively participate, which phases out as modified AGI goes from $100,000 to $150,000. Unallowed losses carry forward.

**What the engine computes.** Worksheet 1 and 2 totals, Parts I-III, the Part VI allocation of the special allowance, the Part VII allocation of unallowed losses, and the Part VIII allowed losses per activity. In a full return it is prepared automatically when a Schedule E rental shows a loss: each property's allowed loss goes on Schedule E line 22 and the unallowed amount is reported for next year's column (c).

**What to verify.** Modified AGI (line 6) excludes passive losses, taxable social security, and the IRA and student loan deductions; real estate professionals and activities with losses on two or more forms (Part IX) are not handled; married filing separately gets no allowance unless you lived apart all year.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    const status = c.str("filing_status") || "single";
    const num = (r: ListRow, k: string) => Math.abs(Number(r[k] ?? 0) || 0);
    const fill = (rows: ListRow[], ws: string): ListRow[] => rows.map((r) => {
      const net = num(r, "net_income") - num(r, "net_loss") - num(r, "prior_unallowed");
      return { ...r, worksheet: ws, net_income: num(r, "net_income"), net_loss: num(r, "net_loss"), prior_unallowed: num(r, "prior_unallowed"), overall_gain: net >= 0 ? net : 0, overall_loss: net < 0 ? -net : 0 };
    });
    const ws1 = fill(c.list("rental_activities"), "1");
    const ws2 = fill(c.list("other_activities"), "2");
    if (ws1.length > 5 || ws2.length > 5) c.warn("More than five activities in a worksheet: only five print; attach a statement for the rest.");
    c.out["rental_activities"] = ws1;
    c.out["other_activities"] = ws2;
    const sum = (rows: ListRow[], k: string) => rows.reduce((a, r) => a + num(r, k), 0);
    const t = (id: string, rows: ListRow[], k: string) => c.set(id, sum(rows, k), id, `sum of ${k}`, id.startsWith("ws1") ? "Part IV" : "Part V");
    const w1i = t("ws1_income", ws1, "net_income"), w1l = t("ws1_loss", ws1, "net_loss"), w1p = t("ws1_prior", ws1, "prior_unallowed");
    t("ws1_gain", ws1, "overall_gain"); t("ws1_overall_loss", ws1, "overall_loss");
    const w2i = t("ws2_income", ws2, "net_income"), w2l = t("ws2_loss", ws2, "net_loss"), w2p = t("ws2_prior", ws2, "prior_unallowed");
    t("ws2_gain", ws2, "overall_gain"); t("ws2_overall_loss", ws2, "overall_loss");
    c.set("line1a", w1i, "Rental income", "Worksheet 1 (a)", "1a");
    c.set("line1b", -w1l, "Rental losses", "Worksheet 1 (b)", "1b");
    c.set("line1c", -w1p, "Prior unallowed rental losses", "Worksheet 1 (c)", "1c");
    const l1d = c.set("line1d", w1i - w1l - w1p, "Net rental", `${f(w1i)} - ${f(w1l)} - ${f(w1p)}`, "1d");
    c.set("line2a", w2i, "Other passive income", "Worksheet 2 (a)", "2a");
    c.set("line2b", -w2l, "Other passive losses", "Worksheet 2 (b)", "2b");
    c.set("line2c", -w2p, "Prior unallowed other losses", "Worksheet 2 (c)", "2c");
    const l2d = c.set("line2d", w2i - w2l - w2p, "Net other passive", `${f(w2i)} - ${f(w2l)} - ${f(w2p)}`, "2d");
    const l3 = c.set("line3", l1d + l2d, "Net passive income or (loss)", `${f(l1d)} + ${f(l2d)}`, "3");
    let l9 = 0;
    if (l3 < 0 && l1d < 0) {
      const l4 = c.set("line4", Math.min(-l1d, -l3), "Rental loss eligible for the allowance", `min(${f(-l1d)}, ${f(-l3)})`, "4");
      const mfs = status === "mfs";
      const apart = c.bool("mfs_lived_apart");
      const l5 = c.set("line5", mfs ? (apart ? 75000 : 0) : 150000, "Phaseout ceiling", mfs ? (apart ? "MFS, lived apart" : "MFS living together: no special allowance") : "150,000", "5");
      const l6 = c.n("line6");
      if (!c.has("line6")) c.warn("line6 (modified AGI) was not supplied; the special allowance assumes zero modified AGI.");
      const l7 = c.set("line7", Math.max(0, l5 - l6), "Room under the phaseout", `max(0, ${f(l5)} - ${f(l6)})`, "7");
      const l8 = c.set("line8", Math.min(mfs ? 12500 : 25000, Math.round(l7 * 0.5)), "Special allowance limit", `min(${f(l7)} x 0.5, ${mfs ? "12,500" : "25,000"})`, "8");
      l9 = c.set("line9", mfs && !apart ? 0 : Math.min(l4, l8), "Special allowance", `min(${f(l4)}, ${f(l8)})`, "9");
    } else {
      c.set("line9", 0, "Special allowance", l3 >= 0 ? "line 3 is not a loss" : "line 1d is not a loss", "9");
    }
    const l10 = c.set("line10", w1i + w2i, "Passive income", `${f(w1i)} + ${f(w2i)}`, "10");
    c.set("line11", l9 + l10, "Total losses allowed", `${f(l9)} + ${f(l10)}`, "11");
    const ratio4 = (x: number, total: number) => (total > 0 ? (x / total).toFixed(4) : "0.0000");
    const all = [...ws1, ...ws2];
    const allowed: ListRow[] = [];
    if (l3 >= 0) {
      for (const r of all) allowed.push({ name: r["name"], worksheet: r["worksheet"], allowed: num(r, "net_loss") + num(r, "prior_unallowed"), unallowed: 0 });
      c.out["part6"] = []; c.out["part7"] = []; c.out["part8"] = [];
    } else {
      // Part VI: spread the special allowance over rental activities with overall losses.
      const p6src = ws1.filter((r) => num(r, "overall_loss") > 0);
      const p6total = sum(p6src, "overall_loss");
      const part6: ListRow[] = l9 > 0 ? p6src.map((r) => { const loss = num(r, "overall_loss"); const sa = Math.round((l9 * loss) / p6total); return { name: r["name"], form_schedule: r["form_schedule"], loss, ratio: ratio4(loss, p6total), special_allowance: sa, remaining: loss - sa }; }) : [];
      if (part6.length) { const drift = l9 - sum(part6, "special_allowance"); if (drift) { const last = part6[part6.length - 1]!; last["special_allowance"] = num(last, "special_allowance") + drift; last["remaining"] = num(last, "loss") - num(last, "special_allowance"); } }
      c.out["part6"] = part6;
      c.set("part6_loss", sum(part6, "loss"), "Part VI total loss", "sum", "Part VI");
      c.set("part6_special", sum(part6, "special_allowance"), "Part VI total special allowance", "sum", "Part VI");
      c.set("part6_remaining", sum(part6, "remaining"), "Part VI total remaining", "sum", "Part VI");
      // Part VII: unallowed loss = loss on line 3 less the special allowance, allocated by ratio.
      const totalUnallowed = -l3 - l9;
      const p7src = all.map((r) => { const p6 = part6.find((x) => x["name"] === r["name"] && r["worksheet"] === "1"); const loss = p6 ? num(p6, "remaining") : num(r, "overall_loss"); return { r, loss }; }).filter((x) => x.loss > 0);
      const p7total = p7src.reduce((a, x) => a + x.loss, 0);
      const part7: ListRow[] = p7src.map(({ r, loss }) => ({ name: r["name"], form_schedule: r["form_schedule"], loss, ratio: ratio4(loss, p7total), unallowed: Math.round((totalUnallowed * loss) / p7total) }));
      if (part7.length) { const drift = totalUnallowed - sum(part7, "unallowed"); if (drift) { const last = part7[part7.length - 1]!; last["unallowed"] = num(last, "unallowed") + drift; } }
      c.out["part7"] = part7;
      c.set("part7_loss", sum(part7, "loss"), "Part VII total loss", "sum", "Part VII");
      c.set("part7_unallowed", sum(part7, "unallowed"), "Part VII total unallowed", "sum", "Part VII");
      // Part VIII: allowed loss = the activity's total losses less its unallowed share.
      const part8: ListRow[] = part7.map((p7) => { const src = all.find((r) => r["name"] === p7["name"])!; const loss = num(src, "net_loss") + num(src, "prior_unallowed"); return { name: p7["name"], form_schedule: p7["form_schedule"], loss, unallowed: num(p7, "unallowed"), allowed: loss - num(p7, "unallowed") }; });
      c.out["part8"] = part8;
      c.set("part8_loss", sum(part8, "loss"), "Part VIII total loss", "sum", "Part VIII");
      c.set("part8_unallowed", sum(part8, "unallowed"), "Part VIII total unallowed", "sum", "Part VIII");
      c.set("part8_allowed", sum(part8, "allowed"), "Part VIII total allowed", "sum", "Part VIII");
      for (const r of all) {
        const p8 = part8.find((x) => x["name"] === r["name"]);
        allowed.push({ name: r["name"], worksheet: r["worksheet"], allowed: p8 ? num(p8, "allowed") : num(r, "net_loss") + num(r, "prior_unallowed"), unallowed: p8 ? num(p8, "unallowed") : 0 });
      }
      if (totalUnallowed > 0) c.warn(`${f(totalUnallowed)} of passive losses are not allowed this year and carry forward; enter each activity's unallowed amount in column (c) next year.`);
    }
    c.out["allowed_losses"] = allowed; // not a printed field: the return assembler reads it to set Schedule E line 22
    if (all.length > 1 && new Set(all.map((r) => String(r["name"]))).size !== all.length) c.warn("Activity names must be unique so the allocations can be matched back.");
    return c.result();
  },
};
