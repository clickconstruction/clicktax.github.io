import { Calc, f } from "../engine/helpers.ts";
import type { FieldDef, FormDef, ListRow, TaxYear } from "../types.ts";

const both = <T,>(v: T): Partial<Record<TaxYear, T>> => ({ 2024: v, 2025: v });
const P1 = (n: number) => `Page1[0].f1_${String(n).padStart(2, "0")}[0]`;
const P2 = (n: number) => `Page2[0].f2_${String(n).padStart(2, "0")}[0]`;
const C2 = (n: number, i = 0) => `Page2[0].c2_${n}[${i}]`;
const yn = (name: string) => ({ yes: { name: name.replace("[i]", "[0]") }, no: { name: name.replace("[i]", "[1]") } });

/** Part III rows: 13 (deposit and custodial accounts) and 14 (other foreign assets), items a through g. */
const ITEMS: Array<[string, string]> = [["a", "Interest"], ["b", "Dividends"], ["c", "Royalties"], ["d", "Other income"], ["e", "Gains (losses)"], ["f", "Deductions"], ["g", "Credits"]];
const part3: FieldDef[] = [];
["13", "14"].forEach((ln, group) => {
  ITEMS.forEach(([letter, label], k) => {
    const row = group * 7 + k;
    const base = 17 + row * 3;
    const what = group === 0 ? "foreign deposit and custodial accounts" : "other foreign assets";
    part3.push(
      { id: `line${ln}${letter}_amount`, line: `${ln}${letter}`, label: `${label} from ${what}: amount reported on your return`, type: "money", locate: { name: `Page1[0].Table_Part3[0].BodyRow${ln}${letter}[0].f1_${base}[0]` } },
      { id: `line${ln}${letter}_form`, line: `${ln}${letter}`, label: `${label} from ${what}: form and line (for example "1040 line 2b")`, type: "text", locate: { name: `Page1[0].Table_Part3[0].BodyRow${ln}${letter}[0].f1_${base + 1}[0]` } },
      { id: `line${ln}${letter}_schedule`, line: `${ln}${letter}`, label: `${label} from ${what}: schedule and line (for example "Sch B line 1")`, type: "text", locate: { name: `Page1[0].Table_Part3[0].BodyRow${ln}${letter}[0].f1_${base + 2}[0]` } },
    );
  });
});

const fields: FieldDef[] = [
  { id: "calendar_year_suffix", label: "Calendar year: last two digits (\"25\" for 2025)", type: "text", maxLen: 2, locate: { name: "Page1[0].Pg1Header[0].f1_01[0]" }, notes: "Defaults to the tax year. For a fiscal year supply fy_begin, fy_begin_year, fy_end, fy_end_year instead." },
  { id: "fy_begin", label: "Fiscal year beginning (month and day)", type: "text", locate: { name: "Page1[0].Pg1Header[0].f1_02[0]" } },
  { id: "fy_begin_year", label: "Fiscal year beginning: last two digits of the year", type: "text", maxLen: 2, locate: { name: "Page1[0].Pg1Header[0].f1_03[0]" } },
  { id: "fy_end", label: "Fiscal year ending (month and day)", type: "text", locate: { name: "Page1[0].Pg1Header[0].f1_04[0]" } },
  { id: "fy_end_year", label: "Fiscal year ending: last two digits of the year", type: "text", maxLen: 2, locate: { name: "Page1[0].Pg1Header[0].f1_05[0]" } },
  { id: "additional_statements", label: "Additional statements are attached (for more than one account or asset)", type: "checkbox", locate: { name: "Page1[0].c1_1[0]" } },
  { id: "additional_statements_count", label: "Number of additional statements", type: "integer", locate: { name: P1(6) } },
  { id: "name", line: "1", label: "Name(s) shown on return", type: "text", locate: { name: P1(7) } },
  { id: "tin", line: "2", label: "Taxpayer identification number (TIN)", type: "text", maxLen: 11, locate: { name: P1(8) } },
  { id: "filer_type", line: "3", label: "Type of filer", type: "choice", choices: ["specified_individual", "partnership", "corporation", "trust"], locate: { specified_individual: { name: "Page1[0].c1_2[0]" }, partnership: { name: "Page1[0].c1_2[1]" }, corporation: { name: "Page1[0].c1_2[2]" }, trust: { name: "Page1[0].c1_2[3]" } }, notes: "Defaults to specified individual." },
  { id: "line4_name", line: "4a", label: "If a partnership or corporation filer: name of the specified individual who closely holds the entity", type: "text", locate: { name: P1(9) } },
  { id: "line4_tin", line: "4b", label: "TIN of that specified individual", type: "text", maxLen: 11, locate: { name: P1(10) } },
  { id: "line5", line: "5", label: "Number of deposit accounts (Part V)", type: "integer", locate: { name: P1(11) }, notes: "Computed from the accounts list when supplied." },
  { id: "line6", line: "6", label: "Maximum value of all deposit accounts", type: "money", locate: { name: P1(12) }, notes: "Computed from the accounts list when supplied." },
  { id: "line7", line: "7", label: "Number of custodial accounts (Part V)", type: "integer", locate: { name: P1(13) } },
  { id: "line8", line: "8", label: "Maximum value of all custodial accounts", type: "money", locate: { name: P1(14) } },
  { id: "line9", line: "9", label: "Were any foreign deposit or custodial accounts closed during the tax year?", type: "yesno", locate: yn("Page1[0].c1_3[i]") },
  { id: "line10", line: "10", label: "Number of other foreign assets (Part VI)", type: "integer", locate: { name: P1(15) } },
  { id: "line11", line: "11", label: "Maximum value of all other foreign assets", type: "money", locate: { name: P1(16) } },
  { id: "line12", line: "12", label: "Were any foreign assets acquired or sold during the tax year?", type: "yesno", locate: yn("Page1[0].c1_4[i]") },
  ...part3,
  { id: "line15", line: "15", label: "Number of Forms 3520 filed (excepted assets)", type: "integer", locate: { name: P1(59) } },
  { id: "line16", line: "16", label: "Number of Forms 3520-A", type: "integer", locate: { name: P1(60) } },
  { id: "line17", line: "17", label: "Number of Forms 5471", type: "integer", locate: { name: P1(61) } },
  { id: "line18", line: "18", label: "Number of Forms 8621", type: "integer", locate: { name: P1(62) } },
  { id: "line19", line: "19", label: "Number of Forms 8865", type: "integer", locate: { name: P1(63) } },
  {
    id: "accounts",
    line: "20-28",
    label: "Part V: each foreign deposit or custodial account. The printed form holds one account; further accounts print on continuation statements you attach",
    type: "list",
    rows: 1,
    items: [
      { id: "type", label: "\"deposit\" or \"custodial\"", type: "text" },
      { id: "deposit", label: "Line 20a: deposit account", type: "checkbox", computed: true },
      { id: "custodial", label: "Line 20b: custodial account", type: "checkbox", computed: true },
      { id: "number", label: "Line 21: account number or other designation", type: "text" },
      { id: "opened", label: "Line 22a: account opened during the tax year", type: "checkbox" },
      { id: "closed", label: "Line 22b: account closed during the tax year", type: "checkbox" },
      { id: "joint", label: "Line 22c: account jointly owned with spouse", type: "checkbox" },
      { id: "no_tax_item", label: "Line 22d: no tax item reported in Part III for this account", type: "checkbox" },
      { id: "max_value", label: "Line 23: maximum value of the account during the tax year (U.S. dollars)", type: "money" },
      { id: "foreign_currency", label: "Line 24: did you use a foreign currency exchange rate to convert the value?", type: "yesno" },
      { id: "currency", label: "Line 25a: foreign currency in which the account is maintained", type: "text" },
      { id: "exchange_rate", label: "Line 25b: foreign currency exchange rate used", type: "text" },
      { id: "rate_source", label: "Line 25c: source of the exchange rate if not the U.S. Treasury Bureau of the Fiscal Service", type: "text" },
      { id: "institution", label: "Line 26a: name of the financial institution", type: "text" },
      { id: "giin", label: "Line 26b: Global Intermediary Identification Number, optional (XXXXXX.XXXXX.XX.XXX)", type: "text" },
      { id: "giin1", label: "GIIN part 1", type: "text", computed: true, maxLen: 6 },
      { id: "giin2", label: "GIIN part 2", type: "text", computed: true, maxLen: 5 },
      { id: "giin3", label: "GIIN part 3", type: "text", computed: true, maxLen: 2 },
      { id: "giin4", label: "GIIN part 4", type: "text", computed: true, maxLen: 3 },
      { id: "institution_address", label: "Line 27: mailing address of the financial institution (number, street, room or suite)", type: "text" },
      { id: "institution_city", label: "Line 28: city or town, state or province, country, and ZIP or foreign postal code", type: "text" },
    ],
    listLocate: both({
      deposit: ["Page2[0].Line20_ReadOrder[0].c2_1[0]"], custodial: ["Page2[0].Line20_ReadOrder[0].c2_1[1]"], number: [P2(1)],
      opened: [C2(2)], closed: [C2(3)], joint: [C2(4)], no_tax_item: [C2(5)], max_value: [P2(2)],
      "foreign_currency.yes": [C2(6, 0)], "foreign_currency.no": [C2(6, 1)],
      currency: [P2(3)], exchange_rate: [P2(4)], rate_source: [P2(5)], institution: [P2(6)],
      giin1: [P2(7)], giin2: [P2(8)], giin3: [P2(9)], giin4: [P2(10)], institution_address: [P2(11)], institution_city: [P2(12)],
    }),
  },
  {
    id: "assets",
    line: "29-36",
    label: "Part VI: each other specified foreign financial asset (stock, interests in foreign entities, bonds, notes, swaps, options, foreign pensions...). The printed form holds one asset; further assets print on continuation statements",
    type: "list",
    rows: 1,
    items: [
      { id: "description", label: "Line 29: description of the asset", type: "text" },
      { id: "identifier", label: "Line 30: identifying number or other designation", type: "text" },
      { id: "date_acquired", label: "Line 31a: date acquired during the tax year, if applicable", type: "text" },
      { id: "date_disposed", label: "Line 31b: date disposed of during the tax year, if applicable", type: "text" },
      { id: "joint", label: "Line 31c: asset jointly owned with spouse", type: "checkbox" },
      { id: "no_tax_item", label: "Line 31d: no tax item reported in Part III for this asset", type: "checkbox" },
      { id: "max_value", label: "Line 32: maximum value of the asset during the tax year (U.S. dollars); the engine checks the matching range box", type: "money" },
      { id: "range_a", label: "Line 32a: $0 to $50,000", type: "checkbox", computed: true },
      { id: "range_b", label: "Line 32b: $50,001 to $100,000", type: "checkbox", computed: true },
      { id: "range_c", label: "Line 32c: $100,001 to $150,000", type: "checkbox", computed: true },
      { id: "range_d", label: "Line 32d: $150,001 to $200,000", type: "checkbox", computed: true },
      { id: "value_over_200k", label: "Line 32e: value when more than $200,000", type: "money", computed: true },
      { id: "foreign_currency", label: "Line 33: did you use a foreign currency exchange rate to convert the value?", type: "yesno" },
      { id: "currency", label: "Line 34a: foreign currency in which the asset is denominated", type: "text" },
      { id: "exchange_rate", label: "Line 34b: exchange rate used", type: "text" },
      { id: "rate_source", label: "Line 34c: source of the exchange rate if not the U.S. Treasury Bureau of the Fiscal Service", type: "text" },
      { id: "entity_name", label: "Line 35a: if stock of or an interest in a foreign entity, the entity's name", type: "text" },
      { id: "entity_giin", label: "Line 35b: the entity's GIIN, optional", type: "text" },
      { id: "entity_giin1", label: "Entity GIIN part 1", type: "text", computed: true, maxLen: 6 },
      { id: "entity_giin2", label: "Entity GIIN part 2", type: "text", computed: true, maxLen: 5 },
      { id: "entity_giin3", label: "Entity GIIN part 3", type: "text", computed: true, maxLen: 2 },
      { id: "entity_giin4", label: "Entity GIIN part 4", type: "text", computed: true, maxLen: 3 },
      { id: "entity_type", label: "Line 35c: type of foreign entity: partnership, corporation, trust, or estate", type: "text" },
      { id: "entity_partnership", label: "Line 35c(1): partnership", type: "checkbox", computed: true },
      { id: "entity_corporation", label: "Line 35c(2): corporation", type: "checkbox", computed: true },
      { id: "entity_trust", label: "Line 35c(3): trust", type: "checkbox", computed: true },
      { id: "entity_estate", label: "Line 35c(4): estate", type: "checkbox", computed: true },
      { id: "entity_address", label: "Line 35d: mailing address of the foreign entity", type: "text" },
      { id: "entity_city", label: "Line 35e: city or town, state or province, country, and ZIP or foreign postal code", type: "text" },
      { id: "issuer_name", label: "Line 36a: if not an entity interest, name of the issuer or counterparty", type: "text" },
      { id: "issuer_role", label: "Line 36a: \"issuer\" or \"counterparty\"", type: "text" },
      { id: "role_issuer", label: "Information is for the issuer", type: "checkbox", computed: true },
      { id: "role_counterparty", label: "Information is for the counterparty", type: "checkbox", computed: true },
      { id: "issuer_type", label: "Line 36b: type of issuer or counterparty: individual, partnership, corporation, trust, or estate", type: "text" },
      { id: "issuer_individual", label: "Line 36b(1): individual", type: "checkbox", computed: true },
      { id: "issuer_partnership", label: "Line 36b(2): partnership", type: "checkbox", computed: true },
      { id: "issuer_corporation", label: "Line 36b(3): corporation", type: "checkbox", computed: true },
      { id: "issuer_trust", label: "Line 36b(4): trust", type: "checkbox", computed: true },
      { id: "issuer_estate", label: "Line 36b(5): estate", type: "checkbox", computed: true },
      { id: "issuer_us_person", label: "Line 36c: the issuer or counterparty is a U.S. person (false: foreign person)", type: "checkbox" },
      { id: "issuer_foreign_person", label: "Line 36c: foreign person", type: "checkbox", computed: true },
      { id: "issuer_address", label: "Line 36d: mailing address of the issuer or counterparty", type: "text" },
      { id: "issuer_city", label: "Line 36e: city or town, state or province, country, and ZIP or foreign postal code", type: "text" },
    ],
    listLocate: both({
      description: [P2(13)], identifier: [P2(14)], date_acquired: [P2(15)], date_disposed: [P2(16)], joint: [C2(7)], no_tax_item: [C2(8)],
      range_a: [C2(9, 0)], range_b: [C2(9, 1)], range_c: [C2(9, 2)], range_d: [C2(9, 3)], value_over_200k: [P2(17)],
      "foreign_currency.yes": [C2(10, 0)], "foreign_currency.no": [C2(10, 1)],
      currency: [P2(18)], exchange_rate: [P2(19)], rate_source: [P2(20)],
      entity_name: [P2(21)], entity_giin1: [P2(22)], entity_giin2: [P2(23)], entity_giin3: [P2(24)], entity_giin4: [P2(25)],
      entity_partnership: [C2(11, 0)], entity_corporation: [C2(11, 1)], entity_trust: [C2(11, 2)], entity_estate: [C2(11, 3)],
      entity_address: [P2(26)], entity_city: [P2(27)],
      issuer_name: [P2(28)], role_issuer: [C2(12, 0)], role_counterparty: [C2(12, 1)],
      issuer_individual: [C2(13, 0)], issuer_partnership: [C2(13, 1)], issuer_corporation: [C2(13, 2)], issuer_trust: [C2(13, 3)], issuer_estate: [C2(13, 4)],
      issuer_us_person: [C2(14, 0)], issuer_foreign_person: [C2(14, 1)], issuer_address: [P2(29)], issuer_city: [P2(30)],
    }),
  },
];

const truthy = (v: unknown) => v === true || v === 1 || (typeof v === "string" && /^(true|yes|y|1|x)$/i.test(v));
const giinParts = (g: string): [string, string, string, string] => {
  const parts = g.replace(/\s/g, "").split(".");
  if (parts.length === 4) return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
  const s = g.replace(/[^A-Za-z0-9]/g, "");
  return [s.slice(0, 6), s.slice(6, 11), s.slice(11, 13), s.slice(13, 16)];
};

export const form8938: FormDef = {
  id: "f8938",
  title: "Form 8938, Statement of Specified Foreign Financial Assets",
  shortTitle: "Form 8938",
  description: "FATCA reporting of foreign financial accounts and other foreign financial assets when their total value exceeds the threshold; summary counts and values, the tax items they produced, and detail for each account and asset.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i8938.pdf",
  notes: `**Who files.** Specified individuals living in the United States file when the total value of specified foreign financial assets exceeds $50,000 on the last day of the year or $75,000 at any time ($100,000 / $150,000 for joint filers); taxpayers living abroad use $200,000 / $300,000 ($400,000 / $600,000 joint). Form 8938 is in addition to, not instead of, the FBAR (FinCEN Form 114).

**What the engine computes.** Lines 5 through 8 and 10 through 11 from the accounts and assets lists when you leave them blank (counts and the sum of maximum values), the line 32 value-range box, the GIIN comb boxes, and the entity and issuer type boxes from the text you supply. Line 1 of the header defaults to the tax year.

**What to verify.** The printed form holds one account (Part V) and one asset (Part VI); each additional account or asset needs a continuation statement in the same format, with the additional-statements box checked and counted. Values are the maximum during the year converted at the Treasury year-end rate. Assets reported on Forms 3520, 3520-A, 5471, 8621, or 8865 are only counted in Part IV, not detailed here. Penalties start at $10,000 for failing to file.`,
  compute(values, ctx) {
    const c = new Calc(values, ctx);
    if (!c.has("calendar_year_suffix") && !c.has("fy_begin")) c.out["calendar_year_suffix"] = String(ctx.year).slice(2);
    if (!c.has("filer_type")) c.out["filer_type"] = "specified_individual";
    const accounts = c.list("accounts");
    const assets = c.list("assets");
    if (accounts.length > 1) c.warn(`${accounts.length} accounts listed: only the first prints in Part V; attach ${accounts.length - 1} continuation statement(s) and check additional_statements.`);
    if (assets.length > 1) c.warn(`${assets.length} assets listed: only the first prints in Part VI; attach ${assets.length - 1} continuation statement(s) and check additional_statements.`);
    const extra = Math.max(0, accounts.length - 1) + Math.max(0, assets.length - 1);
    if (extra > 0 && !c.has("additional_statements")) {
      c.out["additional_statements"] = true;
      c.out["additional_statements_count"] = extra;
    }
    const money = (r: ListRow, k: string) => Number(r[k] ?? 0) || 0;
    const outAccounts: ListRow[] = accounts.map((r) => {
      const type = String(r["type"] ?? "deposit").toLowerCase();
      const g = r["giin"] !== undefined ? giinParts(String(r["giin"])) : undefined;
      return { ...r, deposit: type.startsWith("dep"), custodial: type.startsWith("cus"), ...(g ? { giin1: g[0], giin2: g[1], giin3: g[2], giin4: g[3] } : {}) };
    });
    const outAssets: ListRow[] = assets.map((r) => {
      const v = money(r, "max_value");
      const g = r["entity_giin"] !== undefined ? giinParts(String(r["entity_giin"])) : undefined;
      const et = String(r["entity_type"] ?? "").toLowerCase();
      const it = String(r["issuer_type"] ?? "").toLowerCase();
      const role = String(r["issuer_role"] ?? "").toLowerCase();
      const hasIssuer = r["issuer_name"] !== undefined || it !== "" || role !== "";
      return {
        ...r,
        range_a: r["max_value"] !== undefined && v <= 50000,
        range_b: v > 50000 && v <= 100000,
        range_c: v > 100000 && v <= 150000,
        range_d: v > 150000 && v <= 200000,
        ...(v > 200000 ? { value_over_200k: v } : {}),
        ...(g ? { entity_giin1: g[0], entity_giin2: g[1], entity_giin3: g[2], entity_giin4: g[3] } : {}),
        entity_partnership: et.startsWith("part"), entity_corporation: et.startsWith("corp"), entity_trust: et === "trust", entity_estate: et === "estate",
        role_issuer: role.startsWith("iss"), role_counterparty: role.startsWith("counter"),
        issuer_individual: it.startsWith("ind"), issuer_partnership: it.startsWith("part"), issuer_corporation: it.startsWith("corp"), issuer_trust: it === "trust", issuer_estate: it === "estate",
        ...(hasIssuer && r["issuer_us_person"] !== undefined ? { issuer_foreign_person: !truthy(r["issuer_us_person"]) } : {}),
      };
    });
    c.out["accounts"] = outAccounts;
    c.out["assets"] = outAssets;
    if (accounts.length) {
      const dep = outAccounts.filter((r) => r["deposit"] === true);
      const cus = outAccounts.filter((r) => r["custodial"] === true);
      if (!c.has("line5")) c.setScalar("line5", dep.length, "Deposit accounts", `${dep.length} account(s) in Part V`, "5");
      if (!c.has("line6")) c.set("line6", dep.reduce((a, r) => a + money(r, "max_value"), 0), "Maximum value of deposit accounts", "sum of maximum values", "6");
      if (!c.has("line7")) c.setScalar("line7", cus.length, "Custodial accounts", `${cus.length} account(s) in Part V`, "7");
      if (!c.has("line8")) c.set("line8", cus.reduce((a, r) => a + money(r, "max_value"), 0), "Maximum value of custodial accounts", "sum of maximum values", "8");
      if (!c.has("line9")) c.out["line9"] = accounts.some((r) => truthy(r["closed"]));
    }
    if (assets.length) {
      if (!c.has("line10")) c.setScalar("line10", assets.length, "Other foreign assets", `${assets.length} asset(s) in Part VI`, "10");
      if (!c.has("line11")) c.set("line11", assets.reduce((a, r) => a + money(r, "max_value"), 0), "Maximum value of other foreign assets", "sum of maximum values", "11");
      if (!c.has("line12")) c.out["line12"] = assets.some((r) => r["date_acquired"] !== undefined || r["date_disposed"] !== undefined);
    }
    const total = c.n("line6") + c.n("line8") + c.n("line11");
    if (total > 0 && total < 50000) c.warn(`Total maximum value ${f(total)} is under $50,000: Form 8938 may not be required for a taxpayer living in the United States unless year-end value or other assets push the total over the threshold.`);
    const part3Amounts = fields.filter((fd) => /^line1[34][a-g]_amount$/.test(fd.id)).reduce((a, fd) => a + c.n(fd.id), 0);
    if ((accounts.length || assets.length) && part3Amounts === 0 && !outAccounts.every((r) => truthy(r["no_tax_item"])) && !outAssets.every((r) => truthy(r["no_tax_item"]))) c.warn("No Part III tax items were reported: list the interest, dividends, gains, or other income from these assets (lines 13 and 14), or mark each account/asset no_tax_item.");
    return c.result();
  },
};
