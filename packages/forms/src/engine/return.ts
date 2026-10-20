import { FORMS } from "../forms/index.ts";
import { getFieldMap } from "../fieldmaps/index.ts";
import type { Computation, FormId, ListRow, Rounding, TaxYear, ValidationIssue, Values } from "../types.ts";
import { toPdfFields, type SummaryLine } from "./fill.ts";
import { encodePayload, renderUrl, type RenderPayload, type RenderStatement } from "./link.ts";
import { validateValues } from "./validate.ts";

export interface PreparedForm {
  form: FormId;
  title: string;
  year: TaxYear;
  values: Values;
  computations: Computation[];
  warnings: string[];
  issues: ValidationIssue[];
  summary: SummaryLine[];
  pdfFields: Record<string, string | boolean>;
}

export interface PrepareOptions {
  rounding?: Rounding;
  /** Base URL of the web renderer, e.g. https://clicktax.org */
  renderBase: string;
  title?: string;
  /** Mark the link as sample data (shown as a banner on the render page). */
  sample?: boolean;
}

/** Validate, compute, and map one form. Pure; no I/O. */
export function prepareFormValues(formId: FormId, year: TaxYear, values: Values, rounding: Rounding): PreparedForm {
  const form = FORMS[formId];
  if (!form) throw new Error(`Unknown form ${formId}`);
  if (!form.years.includes(year)) throw new Error(`${form.shortTitle} is not supported for tax year ${year}`);
  const issues = validateValues(form, year, values);
  const cleaned: Values = { ...values };
  for (const issue of issues) if (issue.severity === "error") delete cleaned[issue.field];
  for (const f of form.fields) if (f.computed) delete cleaned[f.id];
  const result = form.compute(cleaned, { year, rounding });
  const fill = toPdfFields(form, year, result.values, getFieldMap(year, formId), rounding);
  return {
    form: formId,
    title: form.title,
    year,
    values: result.values,
    computations: result.computations,
    warnings: [...result.warnings, ...fill.warnings],
    issues,
    summary: fill.summary,
    pdfFields: fill.fields,
  };
}

export async function linkFor(year: TaxYear, forms: PreparedForm[], opts: PrepareOptions, statements: RenderStatement[] = []): Promise<string> {
  const payload: RenderPayload = {
    ...(statements.length ? { statements } : {}),
    v: 1,
    year,
    ...(opts.title ? { title: opts.title } : {}),
    ...(opts.sample ? { sample: true } : {}),
    forms: forms.map((f) => ({
      form: f.form,
      title: FORMS[f.form]?.shortTitle ?? f.form,
      fields: f.pdfFields,
      summary: f.summary,
      ...(f.computations.length || f.warnings.length
        ? { notes: { computations: f.computations.map((c) => ({ ...(c.line ? { line: c.line } : {}), label: c.label, value: c.value, formula: c.formula })), warnings: f.warnings } }
        : {}),
    })),
  };
  return renderUrl(opts.renderBase, await encodePayload(payload));
}

/** Supporting statements a single prepared form carries (the Form 4562 Depreciation and Amortization Report). */
export function statementsFor(p: PreparedForm, year: TaxYear, idx = 1): RenderStatement[] {
  const rows = (p.values["depreciation_report"] as ListRow[] | undefined) ?? [];
  if (p.form !== "f4562" || !rows.length) return [];
  const m = (x: unknown) => n(x).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const tot = (k: string) => m(rows.reduce((a, r) => a + n(r[k]), 0));
  const who = [p.values["name"], p.values["business_activity"]].filter(Boolean).map(String).join(", ");
  return [{
    id: `depreciation-${idx}`,
    title: `Depreciation and Amortization Report (supports ${p.title})`,
    header: [who, `Tax year ${year}`],
    columns: ["Asset", "Placed", "Cost", "Bus. %", "Sec. 179", "Special allowance", "Basis", "Method / life", "Yr", "Prior depreciation", "Current", "Accumulated"],
    rows: [
      ...rows.map((r) => [String(r["description"] ?? ""), String(r["placed"] ?? ""), m(r["cost"]), `${n(r["business_pct"])}%`, m(r["section179"]), m(r["bonus"]), m(r["basis"]), `${String(r["method"] ?? "")} / ${String(r["life"] ?? "")}`, String(r["recovery_year"] ?? ""), m(r["prior_depreciation"]), m(r["current"]), m(r["accumulated"])]),
      ["Totals", "", tot("cost"), "", tot("section179"), tot("bonus"), tot("basis"), "", "", tot("prior_depreciation"), tot("current"), tot("accumulated")],
    ],
    notes: ["Current depreciation is figured by the MACRS declining-balance method switching to straight line (or straight line for real and ADS property) with the half-year, mid-quarter, or mid-month convention, matching the IRS percentage tables within a dollar. Passenger automobiles are limited under section 280F. Section 179 and the special allowance are shown in the year placed in service.", "Basis is cost times business use less section 179 and the special allowance. Prior depreciation is computed from the same schedule unless you supplied it."],
  }];
}

export async function prepareForm(formId: FormId, year: TaxYear, values: Values, opts: PrepareOptions): Promise<PreparedForm & { link: string; statements: RenderStatement[] }> {
  const prepared = prepareFormValues(formId, year, values, opts.rounding ?? "whole");
  const statements = statementsFor(prepared, year);
  const link = await linkFor(year, [prepared], opts, statements);
  return { ...prepared, link, statements };
}

export interface ReturnInput {
  year: TaxYear;
  rounding?: Rounding;
  /** Form 1040 values (names, address, filing status, income lines, payments...). */
  form1040: Values;
  /** One entry per business. Add owner: "spouse" for a spouse's business on a joint return. */
  scheduleC?: Values[];
  /** Optional Schedule SE inputs for the primary taxpayer (e.g. line8a W-2 social security wages). */
  scheduleSE?: Values;
  scheduleSESpouse?: Values;
  schedule1?: Values;
  schedule2?: Values;
  /** Optional Schedule 8812 inputs: line18b, line21, line18a override, other_nonrefundable_credits, schedule3_line11. */
  schedule8812?: Values;
  /** Optional Form 8995 inputs: line3, line6, line7 carryforwards; businesses override. */
  form8995?: Values;
  /** Optional Form 8829 inputs (home office, actual expenses), one per business: `business` (1-based) picks the Schedule C, default 1. */
  form8829?: Values | Values[];
  /** Optional Form 4562 inputs (depreciation), one per business: `business` (1-based) picks the Schedule C, default 1; line 22 replaces that Schedule C's line 13. */
  form4562?: Values | Values[];
  /** Optional Form 1040-ES inputs; when present, next year's vouchers are figured from this year's return (overrides allowed). */
  form1040es?: Values;
  /** Optional Form 4868 inputs; when present the extension voucher is filled from the computed totals. */
  form4868?: Values;
  /** Optional Form 8889 (HSA) inputs: coverage, line2 contributions, line9 employer contributions, line14a/15 distributions, age_55_or_older. */
  form8889?: Values | Values[];
  /** Optional Form 8959 inputs: line1 Medicare wages (W-2 box 5), line19 Medicare withheld (box 6), line2, line3, line14, line23. */
  form8959?: Values;
  /** Optional Schedule 1-A inputs (2025): line4a tips, line14a overtime, vehicles [{vin, description, interest}], line2a-2d. */
  schedule1A?: Values;
  /** Optional Schedule 3 inputs (foreign tax credit, energy credits, premium tax credit, extension payment, excess SS withholding...). */
  schedule3?: Values;
  /** Optional Schedule B inputs (interest and dividend payers); line 4 → 1040 line 2b, line 6 → 1040 line 3b. */
  scheduleB?: Values;
  /** Optional Schedule E inputs (rentals, royalties, K-1s); line 41 → Schedule 1 line 5. */
  scheduleE?: Values;
  /** Optional Form 8582 inputs (other_activities, line6 override, mfs_lived_apart); prepared automatically when a rental shows a loss. `{ skip: true }` disables it. */
  form8582?: Values;
  /** Optional Form 8960 inputs; prepared automatically when AGI exceeds the NIIT threshold. `{ skip: true }` disables it. */
  form8960?: Values;
  /** Optional Schedule EIC inputs (qualifying children); the computed earned income credit → 1040 line 27. */
  scheduleEIC?: Values;
  /** Optional Form 2210 inputs (prior_year_tax, prior_year_agi, estimated_payments, boxes); figured automatically when the balance due is $1,000 or more. `{ skip: true }` disables it. */
  form2210?: Values;
  /** Optional Form 4797 (sales of business property): line 9 → Schedule D line 11, line 18b → Schedule 1 line 4, unrecaptured 1250 gain → Schedule D line 19. */
  form4797?: Values;
  /** Optional Form 5695 (residential energy credits): lines 15 and 32 → Schedule 3 lines 5a and 5b. */
  form5695?: Values;
  /** Optional Form 8962 (premium tax credit) from Form 1095-A; net credit → Schedule 3 line 9, repayment → Schedule 2 line 1a. */
  form8962?: Values;
  /** Optional Forms 1116 (foreign tax credit), one per category; line 35 totals → Schedule 3 line 1. */
  form1116?: Values | Values[];
  /** Optional Form 8606 (nondeductible IRAs), one per spouse (owner: "spouse"); taxable amounts → 1040 line 4b. */
  form8606?: Values | Values[];
  /** Optional Form 5329 (additional taxes on retirement accounts), one per spouse; totals → Schedule 2 line 8. */
  form5329?: Values | Values[];
  /** Optional Form 6251 inputs (AMT adjustments); the AMT is figured automatically and the form attached when it applies. `{ skip: true }` disables it. */
  form6251?: Values;
  /** Optional Form 8283 (noncash charitable contributions), attached as supplied. */
  form8283?: Values;
  /** Optional Schedule D inputs; Forms 8949 totals are added by box, line 16 (or the line 21 loss) goes to 1040 line 7. */
  scheduleD?: Values;
  /** Optional Forms 8949, one per box combination; totals flow to Schedule D rows 1b/2/3 and 8b/9/10. */
  form8949?: Values[];
  /** Optional Form 2441 (child and dependent care): line 11 → Schedule 3 line 2; taxable benefits → 1040 line 1e. */
  form2441?: Values;
  /** Optional Form 8863 (education credits): line 19 → Schedule 3 line 3; line 8 → 1040 line 29. */
  form8863?: Values;
  /** Optional Form 8880 (saver's credit): line 12 → Schedule 3 line 4. */
  form8880?: Values;
  /** Optional Schedule A inputs (itemized deductions); used on 1040 line 12 when larger than the standard deduction, elected (line18), or required (MFS spouse itemizes). */
  scheduleA?: Values;
  /** Optional Schedule F (farm) inputs, one per farm (owner: "spouse" for a spouse's farm); line 34 → Schedule 1 line 6 and Schedule SE line 1a. */
  scheduleF?: Values | Values[];
  /** Optional Form 4952 (investment interest expense); line 8 → Schedule A line 9. */
  form4952?: Values;
  /** Optional Form 3800 (general business credit): credits and carryovers rows; line 38 → Schedule 3 line 6a. Built automatically when Form 8936 has business-use credits. */
  form3800?: Values;
  /** Optional Form 6781 (section 1256 contracts and straddles); the 40%/60% split → Schedule D lines 4 and 11. */
  form6781?: Values;
  /** Optional Form 8936 (clean vehicle credits); line 13 → Schedule 3 line 6f, line 18 → Schedule 3 line 6m, lines 8/21 → Form 3800. */
  form8936?: Values;
  /** Optional Form 8862 (information to claim credits after disallowance), attached as supplied. */
  form8862?: Values;
  /** Optional Form 8938 (specified foreign financial assets), attached as supplied. */
  form8938?: Values;
  /** Optional Form 8888 (split refund among accounts); line 5 is checked against Form 1040 line 35a. */
  form8888?: Values;
  /** Optional Form 1310 (person claiming a refund for a deceased taxpayer), attached as supplied. */
  form1310?: Values;
  /** Optional Forms 6252 (installment sales), one per sale; line 26 → Schedule D line 11 (or line 4 when long_term is false); business_property keeps it for Form 4797. */
  form6252?: Values | Values[];
  /** Optional Form 2555 (foreign earned income exclusion); line 45 → Schedule 1 line 8d, line 50 → line 24j, and Form 1040 line 16 uses the Foreign Earned Income Tax Worksheet. */
  form2555?: Values;
  /** Optional Form 4835 (farm rental income); net → Schedule E line 40. */
  form4835?: Values;
  /** Optional Form 2106 (employee business expenses); line 10 → Schedule 1 line 12. */
  form2106?: Values;
  /** Optional Form 8958 (community property allocation), attached with the names and SSNs from Form 1040. */
  form8958?: Values;
  /** Optional Form 8615 (kiddie tax); line 18 replaces Form 1040 line 16. */
  form8615?: Values;
  /** Optional Schedule H (household employment taxes); line 26 → Schedule 2 line 9. */
  scheduleH?: Values;
  /** Optional Form 8801 (credit for prior-year minimum tax); line 25 → Schedule 3 line 6b. */
  form8801?: Values;
  /** Optional Form 8990 (business interest limitation), attached as supplied. */
  form8990?: Values;
  /** Optional Form 8853 (Archer MSAs and LTC contracts); line 5 → Schedule 1 line 23, taxable amounts → line 8e, additional taxes → Schedule 2 line 17z. */
  form8853?: Values;
  /** Optional Form 3903 (moving expenses); line 5 → Schedule 1 line 14. */
  form3903?: Values;
  /** Optional Form 8911 (alternative fuel vehicle refueling property credit); line 10 → Schedule 3 line 6j, line 3 → Form 3800 line 1s. */
  form8911?: Values;
  /** Optional Form 8396 (mortgage interest credit); line 9 → Schedule 3 line 6g. */
  form8396?: Values;
  /** Optional Forms 8814 (parents' election to report a child's interest and dividends), one per child; line 12 → Schedule 1 line 8z, line 9 → Form 1040 line 3a, line 10 → Schedule D line 13, line 15 → added to Form 1040 line 16. */
  form8814?: Values | Values[];
  /** Optional Form 982 (reduction of tax attributes), attached as supplied. */
  form982?: Values;
  /** Optional Form 5405 (repayment of the first-time homebuyer credit); line 8 → Schedule 2 line 10. */
  form5405?: Values;
  /** Optional Form 461 (limitation on business losses); the excess business loss → Schedule 1 line 8p. Lines 2 through 6 default from the return. */
  form461?: Values;
  /** Optional Schedule R (credit for the elderly or the disabled); line 22 → Schedule 3 line 6d. */
  scheduleR?: Values;
  /** Optional Forms 8824 (like-kind exchanges), one per exchange; the recognized gain → Schedule D line 11 (or 4); business_property keeps it for Form 4797. */
  form8824?: Values | Values[];
  /** Optional Form 8839 (adoption credit and employer benefits); line 18 → Schedule 3 line 6c, line 31 → Form 1040 line 1f, line 13 (2025 refundable part) → Form 1040 line 29. */
  form8839?: Values;
  /** Optional Form 4684 (casualties and thefts); line 18 → Schedule A line 15, lines 32/38b → Schedule A line 16, line 15 gain → Schedule D line 11. */
  form4684?: Values;
}

export interface PreparedReturn {
  year: TaxYear;
  forms: PreparedForm[];
  /** Supporting statements rendered as plain pages next to the forms. */
  statements: RenderStatement[];
  warnings: string[];
  totals: Record<string, number>;
  link: string;
}

function n(v: unknown): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Assemble a sole-proprietor return: Schedule C(s) → Schedule SE → Schedules 1 and 2 → Form 1040. */
export async function prepareReturn(input: ReturnInput, opts: PrepareOptions): Promise<PreparedReturn> {
  const year = input.year;
  const rounding = input.rounding ?? opts.rounding ?? "whole";
  const warnings: string[] = [];
  const tp = input.form1040;
  const fullName = [tp["first_name"], tp["last_name"]].filter(Boolean).join(" ");
  const spouseName = [tp["spouse_first_name"], tp["spouse_last_name"]].filter(Boolean).join(" ");
  const jointName = spouseName ? `${fullName} & ${spouseName}` : fullName;
  const headerFor = (owner: "you" | "spouse"): Values => ({
    name: owner === "spouse" ? spouseName : fullName,
    ssn: owner === "spouse" ? tp["spouse_ssn"] : tp["ssn"],
  });

  const forms: PreparedForm[] = [];
  const statements: RenderStatement[] = [];
  const mainId: FormId = tp["use_1040sr"] === true ? "f1040sr" : "f1040";
  const asList = (v: Values | Values[] | undefined): Values[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  const businessOf = (v: Values) => Math.max(1, Math.round(n(v["business"] ?? 1)));
  const f8829s: PreparedForm[] = [];
  const f4562s: PreparedForm[] = [];
  const used4562 = new Set<number>();
  const used8829 = new Set<number>();
  const schedC = (input.scheduleC ?? []).map((v, i) => {
    const owner = v["owner"] === "spouse" ? "spouse" : "you";
    const values: Values = { ...headerFor(owner), ...v };
    delete values["owner"];
    let p = prepareFormValues("f1040sc", year, values, rounding);
    const tag = `${i + 1}${owner === "spouse" ? ", spouse" : ""}`;
    // Form 4562 (depreciation) replaces this business's line 13.
    const dep = asList(input.form4562).find((d, k) => businessOf(d) === i + 1 && !used4562.has(k));
    if (dep) {
      used4562.add(asList(input.form4562).indexOf(dep));
      const v4562: Values = { name: headerFor(owner)["name"], identifying_number: values["ein"] || headerFor(owner)["ssn"], business_activity: values["principal_business"] || values["business_name"] || "Schedule C business", ...dep };
      delete v4562["business"];
      if (v4562["line11"] === undefined) {
        const preDep = prepareFormValues("f1040sc", year, { ...values, line13: 0 }, rounding);
        v4562["line11"] = Math.max(0, n(preDep.values["line31"]) + n(tp["line1a"]));
      }
      const f4562 = prepareFormValues("f4562", year, v4562, rounding);
      f4562.title = `${f4562.title} (business ${tag})`;
      f4562s.push(f4562);
      if (values["line13"] !== undefined) warnings.push(`scheduleC[${i}] line 13 is replaced by Form 4562 line 22.`);
      values["line13"] = f4562.values["line22"];
      p = prepareFormValues("f1040sc", year, values, rounding);
    }
    // Form 8829 (actual home-office expenses) replaces the simplified method on this business's line 30.
    const home = asList(input.form8829).find((h, k) => businessOf(h) === i + 1 && !used8829.has(k));
    if (home) {
      used8829.add(asList(input.form8829).indexOf(home));
      const v8829: Values = { ...headerFor(owner), ...home };
      delete v8829["business"];
      if (v8829["line8"] === undefined) v8829["line8"] = p.values["line29"];
      const f8829 = prepareFormValues("f8829", year, v8829, rounding);
      f8829.title = `${f8829.title} (business ${tag})`;
      f8829s.push(f8829);
      const withHome: Values = { ...values, line30: f8829.values["line36"] };
      delete withHome["line30_home_sqft"];
      delete withHome["line30_business_sqft"];
      if (values["line30"] !== undefined || values["line30_business_sqft"] !== undefined) warnings.push(`scheduleC[${i}] line 30 is replaced by Form 8829 line 36.`);
      p = prepareFormValues("f1040sc", year, withHome, rounding);
    }
    p.title = `${p.title} (business ${tag})`;
    return { owner, prepared: p };
  });
  asList(input.form8829).forEach((h, k) => { if (!used8829.has(k)) warnings.push(`form8829[${k}] names business ${businessOf(h)} but no such Schedule C exists; it was ignored.`); });
  asList(input.form4562).forEach((d, k) => { if (!used4562.has(k)) warnings.push(`form4562[${k}] names business ${businessOf(d)} but no such Schedule C exists; it was ignored.`); });
  if (schedC.length > 1 && !["mfj"].includes(String(tp["filing_status"])) && schedC.some((s) => s.owner === "spouse")) {
    warnings.push("A spouse's Schedule C is listed but the filing status is not married filing jointly.");
  }

  // Schedule F: farm income, one per farm; line 34 feeds Schedule 1 line 6 and Schedule SE line 1a.
  const schedF = asList(input.scheduleF).map((v, i, all) => {
    const owner = v["owner"] === "spouse" ? "spouse" : "you";
    const values: Values = { ...headerFor(owner), ...v };
    delete values["owner"];
    const p = prepareFormValues("f1040sf", year, values, rounding);
    if (all.length > 1 || owner === "spouse") p.title = `${p.title} (farm ${i + 1}${owner === "spouse" ? ", spouse" : ""})`;
    return { owner, prepared: p };
  });
  const totalSchF = schedF.reduce((acc, s) => acc + n(s.prepared.values["line34"]), 0);

  const seForms: Array<{ owner: "you" | "spouse"; prepared: PreparedForm }> = [];
  for (const owner of ["you", "spouse"] as const) {
    const mine = schedC.filter((s) => s.owner === owner);
    const farms = schedF.filter((s) => s.owner === owner);
    const overrides = owner === "you" ? input.scheduleSE : input.scheduleSESpouse;
    if (mine.length === 0 && farms.length === 0 && !overrides) continue;
    const net = mine.reduce((acc, s) => acc + n(s.prepared.values["line31"]), 0);
    const seValues: Values = { ...headerFor(owner), ...(overrides ?? {}) };
    if (overrides && overrides["line2"] !== undefined) warnings.push(`scheduleSE${owner === "spouse" ? "Spouse" : ""}.line2 was supplied; it is replaced by the Schedule C total (${net}).`);
    seValues["line2"] = net;
    if (farms.length) {
      const farmNet = farms.reduce((acc, s) => acc + n(s.prepared.values["line34"]), 0);
      if (overrides && overrides["line1a"] !== undefined) warnings.push(`scheduleSE${owner === "spouse" ? "Spouse" : ""}.line1a was supplied; it is replaced by the Schedule F total (${farmNet}).`);
      seValues["line1a"] = farmNet;
      const crp = farms.reduce((acc, s) => acc + n(s.prepared.values["crp_payments"]), 0);
      if (crp > 0) seValues["line1b"] = crp;
    }
    const p = prepareFormValues("f1040sse", year, seValues, rounding);
    const required = n(p.values["line4c"]) >= 400 || n(p.values["line5b"]) > 0;
    if (!required) {
      warnings.push(`Schedule SE for ${owner === "spouse" ? "spouse" : "you"} is not required (net earnings ${n(p.values["line4c"])} under $400); it is omitted.`);
      continue;
    }
    if (owner === "spouse") p.title = `${p.title} (spouse)`;
    seForms.push({ owner, prepared: p });
  }

  const totalSchC = schedC.reduce((acc, s) => acc + n(s.prepared.values["line31"]), 0);
  const seTax = seForms.reduce((acc, s) => acc + n(s.prepared.values["line12"]), 0);
  const seDeduction = seForms.reduce((acc, s) => acc + n(s.prepared.values["line13"]), 0);

  // Form 8889 (HSA): deduction to Schedule 1 line 13, taxable distributions to Schedule 1 line 8f, additional taxes to Schedule 2.
  // One Form 8889 per account holder: `owner: "spouse"` for the spouse's HSA on a joint return.
  const f8889s: PreparedForm[] = asList(input.form8889).map((v) => {
    const owner = v["owner"] === "spouse" ? "spouse" : "you";
    const vals: Values = { ...headerFor(owner), ...v };
    delete vals["owner"];
    const p = prepareFormValues("f8889", year, vals, rounding);
    if (owner === "spouse") p.title = `${p.title} (spouse)`;
    return p;
  });
  const f8889 = f8889s.length ? f8889s[0] : undefined;
  const sum8889 = (k: string) => f8889s.reduce((a, p) => a + n(p.values[k]), 0);

  // Form 8959 (Additional Medicare Tax): when wages plus self-employment income cross the threshold, or when inputs are supplied.
  let f8959: PreparedForm | undefined;
  {
    const seIncome = seForms.reduce((acc, s) => acc + Math.max(0, n(s.prepared.values["line6"])), 0);
    const wagesGuess = n(tp["line1a"]);
    const thr = String(tp["filing_status"]) === "mfj" ? 250000 : String(tp["filing_status"]) === "mfs" ? 125000 : 200000;
    const supplied = input.form8959 ?? {};
    const wages = supplied["line1"] !== undefined ? n(supplied["line1"]) : wagesGuess;
    if (input.form8959 || wages + seIncome > thr) {
      if (supplied["line1"] === undefined && wagesGuess > 0) warnings.push("Form 8959 line 1 assumed equal to W-2 box 1 wages (Form 1040 line 1a); supply form8959.line1 with Medicare wages from W-2 box 5 if different.");
      f8959 = prepareFormValues("f8959", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line1: wages, line8: seIncome, ...supplied }, rounding);
    }
  }

  // Form 4797: business property sales feed Schedule 1 line 4 and Schedule D lines 11 and 19.
  let f4797: PreparedForm | undefined;
  if (input.form4797) f4797 = prepareFormValues("f4797", year, { name: jointName, ssn: tp["ssn"], ...input.form4797 }, rounding);

  // Form 4835: farm rental income feeds Schedule E line 40.
  let f4835: PreparedForm | undefined;
  const eIn: Values = { ...(input.scheduleE ?? {}) };
  if (input.form4835) {
    f4835 = prepareFormValues("f4835", year, { name: jointName, ssn: tp["ssn"], ...input.form4835 }, rounding);
    const net = n(f4835.values["line32"]);
    if (eIn["line40"] !== undefined) warnings.push("scheduleE.line40 was supplied; it is replaced by Form 4835.");
    eIn["line40"] = net < 0 ? n(f4835.values["line34c"]) : net;
  }
  // Schedule E: rental, royalty, and pass-through income to Schedule 1 line 5.
  let sE: PreparedForm | undefined;
  if (input.scheduleE || f4835) sE = prepareFormValues("f1040se", year, { name: jointName, ssn: tp["ssn"], ...eIn }, rounding);

  const s1Values: Values = { name: jointName, ssn: tp["ssn"], ...(input.schedule1 ?? {}) };
  // Form 2555: the foreign earned income exclusion (Schedule 1 line 8d) and housing deduction (line 24j).
  let f2555: PreparedForm | undefined;
  let feieExcluded = 0;
  if (input.form2555) {
    f2555 = prepareFormValues("f2555", year, { name: fullName, ssn: tp["ssn"], ...input.form2555 }, rounding);
    if (s1Values["line8d"] !== undefined) warnings.push("schedule1.line8d was supplied; it is replaced by Form 2555 line 45.");
    s1Values["line8d"] = f2555.values["line45"];
    if (n(f2555.values["line50"]) > 0) {
      if (s1Values["line24j"] !== undefined) warnings.push("schedule1.line24j was supplied; it is replaced by Form 2555 line 50.");
      s1Values["line24j"] = f2555.values["line50"];
    }
    feieExcluded = n(f2555.values["line45"]) + n(f2555.values["line50"]);
  }
  // Form 2106: employee business expenses for reservists, performing artists, and fee-basis officials (Schedule 1 line 12).
  let f2106: PreparedForm | undefined;
  if (input.form2106) {
    f2106 = prepareFormValues("f2106", year, { name: fullName, ssn: tp["ssn"], ...input.form2106 }, rounding);
    if (String(input.form2106["filer_type"] ?? "") === "impairment") warnings.push("Form 2106 for impairment-related work expenses: enter line 10 on Schedule A line 16 (scheduleA.line16); it is not placed on Schedule 1.");
    else {
      if (s1Values["line12"] !== undefined) warnings.push("schedule1.line12 was supplied; it is replaced by Form 2106 line 10.");
      s1Values["line12"] = f2106.values["line10"];
    }
  }
  // Form 8853: the Archer MSA deduction (Schedule 1 line 23) and taxable MSA and LTC amounts (line 8e); Form 3903: moving expenses (line 14).
  let f8853: PreparedForm | undefined;
  if (input.form8853) {
    f8853 = prepareFormValues("f8853", year, { name: jointName, ssn: tp["ssn"], ...input.form8853 }, rounding);
    if (n(f8853.values["line5"]) > 0) {
      if (s1Values["line23"] !== undefined) warnings.push("schedule1.line23 was supplied; it is replaced by Form 8853 line 5.");
      s1Values["line23"] = f8853.values["line5"];
    }
    const msaIncome = n(f8853.values["line8"]) + n(f8853.values["line12"]) + n(f8853.values["line26"]);
    if (msaIncome > 0) s1Values["line8e"] = n(s1Values["line8e"]) + msaIncome;
  }
  let f3903: PreparedForm | undefined;
  if (input.form3903) {
    f3903 = prepareFormValues("f3903", year, { name: jointName, ssn: tp["ssn"], ...input.form3903 }, rounding);
    if (s1Values["line14"] !== undefined) warnings.push("schedule1.line14 was supplied; it is replaced by Form 3903 line 5.");
    s1Values["line14"] = f3903.values["line5"];
  }
  if (f4797) {
    if (s1Values["line4"] !== undefined) warnings.push("schedule1.line4 was supplied; it is replaced by Form 4797 line 18b.");
    s1Values["line4"] = f4797.values["line18b"];
  }
  if (sE) {
    if (s1Values["line5"] !== undefined) warnings.push("schedule1.line5 was supplied; it is replaced by Schedule E line 41.");
    s1Values["line5"] = sE.values["line41"];
  }
  if (f8889) {
    if (s1Values["line13"] !== undefined) warnings.push("schedule1.line13 was supplied; it is replaced by Form 8889 line 13.");
    s1Values["line13"] = sum8889("line13");
    const hsaIncome = sum8889("line16") + sum8889("line20");
    if (hsaIncome > 0) s1Values["line8f"] = n(s1Values["line8f"]) + hsaIncome;
  }
  if (schedC.length) s1Values["line3"] = totalSchC;
  if (schedF.length) {
    if (s1Values["line6"] !== undefined) warnings.push("schedule1.line6 was supplied; it is replaced by the Schedule F total.");
    s1Values["line6"] = totalSchF;
  }
  if (seForms.length) s1Values["line15"] = seDeduction;
  let s1 = prepareFormValues("f1040s1", year, s1Values, rounding);
  // Forms 8814 (one per child): the child's income over the base goes to Schedule 1 line 8z, qualified dividends to Form 1040 line 3a,
  // capital gain distributions to Schedule D line 13 (or Form 1040 line 7), and the line 15 tax is added to Form 1040 line 16.
  const f8814s: PreparedForm[] = asList(input.form8814).map((v, i, all) => {
    const p = prepareFormValues("f8814", year, { name: jointName, ssn: tp["ssn"], ...(all.length > 1 ? { multiple_forms: true } : {}), ...v }, rounding);
    if (all.length > 1) p.title = `${p.title} (${String(v["child_name"] ?? i + 1)})`;
    return p;
  });
  const f8814Tax = f8814s.reduce((a, p) => a + n(p.values["line15"]), 0);
  const f8814QD = f8814s.reduce((a, p) => a + n(p.values["line9"]), 0);
  const f8814CG = f8814s.reduce((a, p) => a + n(p.values["line10"]), 0);
  if (f8814s.length) {
    const other = f8814s.reduce((a, p) => a + n(p.values["line12"]), 0);
    if (other > 0) {
      s1Values["line8z"] = n(s1Values["line8z"]) + other;
      s1Values["line8z_description"] = [s1Values["line8z_description"], "Form 8814"].filter(Boolean).join(", ");
    }
    s1 = prepareFormValues("f1040s1", year, s1Values, rounding);
  }
  // Form 461: an excess business loss is added back on Schedule 1 line 8p.
  let f461: PreparedForm | undefined;
  if (input.form461) {
    f461 = prepareFormValues("f461", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line2: s1.values["line3"], line4: s1.values["line4"], line5: s1.values["line5"], line6: s1.values["line6"], ...input.form461 }, rounding);
    const excess = n(f461.values["excess_business_loss"]);
    if (excess > 0) {
      if (s1Values["line8p"] !== undefined) warnings.push("schedule1.line8p was supplied; it is replaced by Form 461.");
      s1Values["line8p"] = excess;
      s1 = prepareFormValues("f1040s1", year, s1Values, rounding);
    }
  }
  const s1Needed = n(s1.values["line10"]) !== 0 || n(s1.values["line26"]) !== 0 || schedC.length > 0 || schedF.length > 0 || Boolean(sE) || Object.keys(input.schedule1 ?? {}).length > 0;

  const s2Values: Values = { name: jointName, ssn: tp["ssn"], ...(input.schedule2 ?? {}) };
  // Form 5329, one per person: the additional taxes total goes to Schedule 2 line 8.
  const f5329s: PreparedForm[] = asList(input.form5329).map((v) => {
    const owner = v["owner"] === "spouse" ? "spouse" : "you";
    const vals: Values = { ...headerFor(owner), ...v };
    delete vals["owner"];
    const p = prepareFormValues("f5329", year, vals, rounding);
    if (owner === "spouse") p.title = `${p.title} (spouse)`;
    return p;
  });
  if (f5329s.length) {
    if (s2Values["line8"] !== undefined) warnings.push("schedule2.line8 was supplied; it is replaced by the Form 5329 total.");
    s2Values["line8"] = f5329s.reduce((a, p) => a + n(p.values["total_additional_tax"]), 0);
  }
  if (seForms.length) s2Values["line4"] = seTax;
  if (f8853) {
    const msaTax = n(f8853.values["line9b"]) + n(f8853.values["line13b"]);
    if (msaTax > 0) {
      s2Values["line17z"] = n(s2Values["line17z"]) + msaTax;
      s2Values["line17z_description"] = [s2Values["line17z_description"], "MSA"].filter(Boolean).join(", ");
    }
  }
  // Form 5405: repayment of the first-time homebuyer credit on a disposition (Schedule 2 line 10).
  let f5405: PreparedForm | undefined;
  if (input.form5405) {
    f5405 = prepareFormValues("f5405", year, { name: jointName, ssn: tp["ssn"], ...input.form5405 }, rounding);
    if (n(f5405.values["line8"]) > 0) {
      if (s2Values["line10"] !== undefined) warnings.push("schedule2.line10 was supplied; it is replaced by Form 5405 line 8.");
      s2Values["line10"] = f5405.values["line8"];
    }
  }
  // Schedule H: household employment taxes to Schedule 2 line 9.
  let sH: PreparedForm | undefined;
  if (input.scheduleH) {
    sH = prepareFormValues("f1040sh", year, { name: fullName, ssn: tp["ssn"], ...input.scheduleH }, rounding);
    if (s2Values["line9"] !== undefined) warnings.push("schedule2.line9 was supplied; it is replaced by Schedule H line 26.");
    s2Values["line9"] = sH.values["line26"];
  }
  if (f8889) {
    if (sum8889("line17b") > 0) s2Values["line17c"] = sum8889("line17b");
    if (sum8889("line21") > 0) s2Values["line17d"] = sum8889("line21");
  }
  if (f8959) {
    if (s2Values["line11"] !== undefined) warnings.push("schedule2.line11 was supplied; it is replaced by Form 8959 line 18.");
    s2Values["line11"] = f8959.values["line18"];
  }
  let s2 = prepareFormValues("f1040s2", year, s2Values, rounding);
  let s2Needed = n(s2.values["line3"]) !== 0 || n(s2.values["line21"]) !== 0;

  const f1040Values: Values = { ...tp, ...(feieExcluded > 0 ? { feie_excluded: feieExcluded } : {}), ...(f8814Tax > 0 ? { line16_additions: f8814Tax } : {}), ...(f8814QD > 0 ? { line3a: n(tp["line3a"]) + f8814QD } : {}) };
  // Schedule B: payer detail for interest and ordinary dividends.
  let sB: PreparedForm | undefined;
  if (input.scheduleB) {
    sB = prepareFormValues("f1040sb", year, { name: jointName, ssn: tp["ssn"], ...input.scheduleB }, rounding);
    if (tp["line2b"] !== undefined) warnings.push("form1040.line2b was supplied; it is replaced by Schedule B line 4.");
    if (tp["line3b"] !== undefined) warnings.push("form1040.line3b was supplied; it is replaced by Schedule B line 6.");
    f1040Values["line2b"] = sB.values["line4"];
    f1040Values["line3b"] = sB.values["line6"];
  } else if (n(tp["line2b"]) > 1500 || n(tp["line3b"]) > 1500) {
    warnings.push("Taxable interest or ordinary dividends exceed $1,500: Schedule B is required; supply scheduleB with each payer.");
  }
  if (f8959 && n(f8959.values["line24"]) > 0) f1040Values["line25c"] = n(tp["line25c"]) + n(f8959.values["line24"]);

  // Forms 8824 (one per exchange): the recognized gain goes to Schedule D unless the property is business property.
  const f8824s: PreparedForm[] = asList(input.form8824).map((v, i, all) => {
    const p = prepareFormValues("f8824", year, { name: jointName, ssn: tp["ssn"], ...v }, rounding);
    if (all.length > 1) p.title = `${p.title} (${i + 1})`;
    return p;
  });
  const f8824ToD = f8824s.filter((p) => p.values["business_property"] !== true);
  if (f8824s.length > f8824ToD.length) warnings.push("Form 8824 with business_property: report lines 22 and 36 on Form 4797; they are not placed on Schedule D.");

  // Form 4684: casualty and theft losses (Schedule A) and gains (Schedule D); the 10% floor uses the AGI figured so far.
  let f4684: PreparedForm | undefined;
  if (input.form4684) {
    const pre = prepareFormValues(mainId, year, f1040Values, rounding);
    f4684 = prepareFormValues("f4684", year, { name: jointName, ssn: tp["ssn"], agi: pre.values["line11"], ...input.form4684 }, rounding);
    if (!input.scheduleA && n(f4684.values["line18"]) + n(f4684.values["line32"]) + n(f4684.values["line38b"]) > 0) warnings.push("Form 4684 losses are itemized deductions: supply scheduleA so lines 18, 32, and 38b can be placed on Schedule A lines 15 and 16.");
  }

  // Form 6781: section 1256 contracts and straddles feed Schedule D lines 4 and 11.
  let f6781: PreparedForm | undefined;
  if (input.form6781) f6781 = prepareFormValues("f6781", year, { name: jointName, ssn: tp["ssn"], ...input.form6781 }, rounding);

  // Forms 6252: installment sale income to Schedule D (kept for Form 4797 when business property).
  const f6252s: PreparedForm[] = asList(input.form6252).map((v, i, all) => {
    const p = prepareFormValues("f6252", year, { name: jointName, ssn: tp["ssn"], ...v }, rounding);
    if (all.length > 1) p.title = `${p.title} (${i + 1})`;
    return p;
  });
  const f6252ToD = f6252s.filter((p) => p.values["business_property"] !== true);
  if (f6252s.length > f6252ToD.length) warnings.push("Form 6252 with business_property: report line 26 (and 37) on Form 4797; it is not placed on Schedule D.");
  if (f6252s.some((p) => n(p.values["line25"]) + n(p.values["line36"]) > 0)) warnings.push("Form 6252 ordinary recapture income (lines 25/36) belongs on Form 4797 Part II; it is not placed automatically.");

  // Form 8949 / Schedule D: capital gains and losses to Form 1040 line 7 (before AGI).
  const f8949s: PreparedForm[] = [];
  let sD: PreparedForm | undefined;
  if (input.form8949?.length || input.scheduleD || f6781 || f6252ToD.length || f8824ToD.length || (f4684 && n(f4684.values["line15"]) > 0) || (f4797 && (n(f4797.values["line9"]) > 0 || n(f4797.values["unrecaptured_1250_total"]) > 0))) {
    const dValues: Values = { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], ...(input.scheduleD ?? {}) };
    if (f6781) {
      const shortTerm = n(f6781.values["line8"]) - n(f6781.values["line11a"]) + n(f6781.values["line13a"]);
      const longTerm = n(f6781.values["line9"]) - n(f6781.values["line11b"]) + n(f6781.values["line13b"]);
      if (shortTerm !== 0) dValues["line4"] = n(dValues["line4"]) + shortTerm;
      if (longTerm !== 0) dValues["line11"] = n(dValues["line11"]) + longTerm;
    }
    for (const p of f6252ToD) {
      const gain = n(p.values["line26"]) + n(p.values["line37"]);
      const key = p.values["long_term"] === false ? "line4" : "line11";
      if (gain !== 0) dValues[key] = n(dValues[key]) + gain;
    }
    for (const p of f8824ToD) {
      const gain = n(p.values["line22"]) + n(p.values["line36"]);
      const key = p.values["long_term"] === false ? "line4" : "line11";
      if (gain !== 0) dValues[key] = n(dValues[key]) + gain;
    }
    if (f4684 && n(f4684.values["line15"]) > 0) dValues["line11"] = n(dValues["line11"]) + n(f4684.values["line15"]);
    if (f8814CG > 0) dValues["line13"] = n(dValues["line13"]) + f8814CG;
    if (f4797 && n(f4797.values["line9"]) > 0) dValues["line11"] = n(dValues["line11"]) + n(f4797.values["line9"]);
    if (f4797 && n(f4797.values["unrecaptured_1250_total"]) > 0 && n(f4797.values["line7"]) > 0) dValues["line19"] = n(dValues["line19"]) + n(f4797.values["unrecaptured_1250_total"]);
    const rowFor: Record<string, string> = { A: "1b", G: "1b", B: "2", H: "2", C: "3", I: "3", D: "8b", J: "8b", E: "9", K: "9", F: "10", L: "10" };
    if (input.form8949?.length) {
      const fed = Object.keys(dValues).filter((k) => /^line(1b|2|3|8b|9|10)_[deg]$/.test(k));
      if (fed.length) warnings.push(`scheduleD ${fed.join(", ")} were supplied; they are replaced by the Form 8949 totals.`);
      for (const k of fed) delete dValues[k];
    }
    for (const [i, v] of (input.form8949 ?? []).entries()) {
      const p = prepareFormValues("f8949", year, { name: jointName, ssn: tp["ssn"], ...v }, rounding);
      if ((input.form8949?.length ?? 0) > 1) p.title = `${p.title} (${i + 1})`;
      f8949s.push(p);
      for (const [boxKey, prefix] of [["short_term_box", "line2_"], ["long_term_box", "line2_long_"]] as const) {
        const row = rowFor[String(v[boxKey] ?? "")];
        if (!row) continue;
        for (const [k, col] of [["proceeds", "d"], ["cost", "e"], ["adjustment", "g"]] as const) dValues[`line${row}_${col}`] = n(dValues[`line${row}_${col}`]) + n(p.values[`${prefix}${k}`]);
      }
    }
    sD = prepareFormValues("f1040sd", year, dValues, rounding);
    const l16 = n(sD.values["line16"]);
    if (tp["line7"] !== undefined) warnings.push("form1040.line7 was supplied; it is replaced by Schedule D.");
    f1040Values["line7"] = l16 > 0 ? l16 : l16 < 0 ? n(sD.values["line21"]) : 0;
    if (l16 > 0 && n(sD.values["line15"]) > 0) f1040Values["schedule_d_gain"] = Math.min(l16, n(sD.values["line15"]));
  }
  if (!sD && f8814CG > 0) {
    f1040Values["line7"] = n(f1040Values["line7"]) + f8814CG;
    f1040Values["schedule_d_not_required"] = true;
  }

  // Form 8606, one per person: taxable IRA distributions and conversions to Form 1040 line 4b.
  const f8606s: PreparedForm[] = asList(input.form8606).map((v) => {
    const owner = v["owner"] === "spouse" ? "spouse" : "you";
    const vals: Values = { ...headerFor(owner), ...v };
    delete vals["owner"];
    const p = prepareFormValues("f8606", year, vals, rounding);
    if (owner === "spouse") p.title = `${p.title} (spouse)`;
    return p;
  });
  if (f8606s.length) {
    const taxable = f8606s.reduce((a, p) => a + n(p.values["line15c"]) + n(p.values["line18"]) + n(p.values["line25c"]), 0);
    const gross = f8606s.reduce((a, p) => a + n(p.values["line7"]) + n(p.values["line8"]) + n(p.values["line19"]), 0);
    if (tp["line4b"] !== undefined) warnings.push("form1040.line4b was supplied; it is replaced by the Form 8606 taxable amounts.");
    f1040Values["line4b"] = taxable;
    if (tp["line4a"] === undefined) f1040Values["line4a"] = gross;
  }

  // Form 2441 Part III: taxable dependent care benefits raise Form 1040 line 1e before AGI is figured.
  if (input.form2441 && (input.form2441["line12"] !== undefined || input.form2441["line13"] !== undefined)) {
    const pre = prepareFormValues("f2441", year, { filing_status: tp["filing_status"], line4: Math.max(0, n(tp["line1a"]) + totalSchC + totalSchF - seDeduction), ...input.form2441 }, rounding);
    if (n(pre.values["line26"]) > 0) {
      if (tp["line1e"] !== undefined) warnings.push("form1040.line1e was supplied; it is replaced by Form 2441 line 26.");
      f1040Values["line1e"] = pre.values["line26"];
    }
  }
  if (s1Needed) {
    f1040Values["line8"] = s1.values["line10"];
    f1040Values["line10"] = s1.values["line26"];
  }
  if (s2Needed) {
    f1040Values["line17"] = s2.values["line3"];
    f1040Values["line23"] = s2.values["line21"];
  }
  // Form 8582: passive activity loss limits for Schedule E rentals with losses (before AGI, which they reduce).
  let f8582: PreparedForm | undefined;
  const lossProps = sE ? ((sE.values["properties"] as ListRow[] | undefined) ?? []).map((r, i) => ({ r, i })).filter(({ r }) => n(r["line21"]) < 0 && String(r["type"] ?? "") !== "6") : [];
  if (sE && input.form8582?.["skip"] !== true && (lossProps.length || input.form8582)) {
    const props = (sE.values["properties"] as ListRow[] | undefined) ?? [];
    const rentals = props.map((r, i) => ({ r, i })).filter(({ r }) => String(r["type"] ?? "") !== "6");
    const row = ({ r, i }: { r: ListRow; i: number }) => ({ name: String(r["address"] ?? `Property ${i + 1}`), form_schedule: "Sch E line 22", net_income: Math.max(0, n(r["line21"])), net_loss: Math.max(0, -n(r["line21"])), prior_unallowed: Math.abs(n(r["prior_unallowed_loss"])) });
    const extra = { ...(input.form8582 ?? {}) };
    delete extra["skip"];
    const rentalRows = [...rentals.filter(({ r }) => r["active_participation"] !== false).map(row), ...((extra["rental_activities"] as ListRow[] | undefined) ?? [])];
    const otherRows = [...rentals.filter(({ r }) => r["active_participation"] === false).map(row), ...((extra["other_activities"] as ListRow[] | undefined) ?? [])];
    // Modified AGI: AGI figured with the rental losses left out, plus the IRA and student loan deductions and taxable social security.
    const lossTotal = lossProps.reduce((a, { r }) => a + -n(r["line21"]), 0);
    const s1NoLoss = prepareFormValues("f1040s1", year, { ...s1Values, line5: n(sE.values["line41"]) + lossTotal }, rounding);
    const pre = prepareFormValues(mainId, year, { ...f1040Values, line8: s1NoLoss.values["line10"], line10: s1NoLoss.values["line26"] }, rounding);
    const magi = n(pre.values["line11"]) + n(s1NoLoss.values["line20"]) + n(s1NoLoss.values["line21"]) + n(pre.values["line6b"]);
    f8582 = prepareFormValues("f8582", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line6: magi, ...extra, rental_activities: rentalRows, other_activities: otherRows }, rounding);
    const allowed = (f8582.values["allowed_losses"] as ListRow[] | undefined) ?? [];
    const eProps = ((eIn["properties"] as ListRow[] | undefined) ?? []).map((r) => ({ ...r }));
    for (const { r, i } of lossProps) {
      const a = allowed.find((x) => String(x["name"]) === String(r["address"] ?? `Property ${i + 1}`));
      if (a && eProps[i]) eProps[i]!["line22"] = n(a["allowed"]);
    }
    sE = prepareFormValues("f1040se", year, { name: jointName, ssn: tp["ssn"], ...eIn, properties: eProps }, rounding);
    s1Values["line5"] = sE.values["line41"];
    s1 = prepareFormValues("f1040s1", year, s1Values, rounding);
    f1040Values["line8"] = s1.values["line10"];
    f1040Values["line10"] = s1.values["line26"];
  }

  // Form 8839 (first pass): taxable employer-provided adoption benefits are income on Form 1040 line 1f.
  if (input.form8839) {
    const pre = prepareFormValues(mainId, year, f1040Values, rounding);
    const p = prepareFormValues("f8839", year, { line7: pre.values["line11"], ...input.form8839 }, rounding);
    if (n(p.values["line31"]) > 0) {
      if (tp["line1f"] !== undefined) warnings.push("form1040.line1f was supplied; it is replaced by Form 8839 line 31.");
      f1040Values["line1f"] = p.values["line31"];
    }
  }

  // Form 8615: the kiddie tax replaces the child's Form 1040 line 16.
  let f8615: PreparedForm | undefined;
  if (input.form8615) {
    const pre = prepareFormValues(mainId, year, f1040Values, rounding);
    const unearned = n(pre.values["line2b"]) + n(pre.values["line3b"]) + Math.max(0, n(pre.values["line7"])) + n(pre.values["line4b"]) + n(pre.values["line5b"]) + n(pre.values["line6b"]) + n(s1.values["line7"]);
    f8615 = prepareFormValues("f8615", year, { name: fullName, ssn: tp["ssn"], child_filing_status: tp["filing_status"], line1: unearned, line4: pre.values["line15"], ...input.form8615 }, rounding);
    if (input.form8615["line1"] === undefined) warnings.push("Form 8615 line 1 (unearned income) was taken from the taxable interest, dividends, capital gain, pension, social security, and unemployment amounts on the return; supply form8615.line1 if other unearned income applies.");
    if (tp["line16_override"] !== undefined) warnings.push("form1040.line16_override was supplied; it is replaced by Form 8615 line 18.");
    f1040Values["line16_override"] = f8615.values["line18"];
  }

  let f1040 = prepareFormValues(mainId, year, f1040Values, rounding);

  // Schedule A: itemize when it beats the standard deduction, when elected, or when required.
  let sA: PreparedForm | undefined;
  // Form 4952: the investment interest deduction allowed goes to Schedule A line 9.
  let f4952: PreparedForm | undefined;
  if (input.form4952) {
    f4952 = prepareFormValues("f4952", year, { name: jointName, ssn: tp["ssn"], line4a: n(f1040.values["line2b"]) + n(f1040.values["line3b"]), line4b: f1040.values["line3a"], ...input.form4952 }, rounding);
    if (!input.scheduleA) warnings.push("Form 4952 was supplied without scheduleA: the investment interest deduction (line 8) applies only when itemizing; the form is attached but not used.");
  }
  if (input.scheduleA) {
    const aIn: Values = { ...input.scheduleA };
    if (f4684) {
      if (n(f4684.values["line18"]) > 0) {
        if (aIn["line15"] !== undefined) warnings.push("scheduleA.line15 was supplied; it is replaced by Form 4684 line 18.");
        aIn["line15"] = f4684.values["line18"];
      }
      const otherLosses = n(f4684.values["line32"]) + n(f4684.values["line38b"]);
      if (otherLosses > 0) aIn["line16"] = n(aIn["line16"]) + otherLosses;
    }
    if (f4952) {
      if (aIn["line9"] !== undefined) warnings.push("scheduleA.line9 was supplied; it is replaced by Form 4952 line 8.");
      aIn["line9"] = f4952.values["line8"];
    }
    const a = prepareFormValues("f1040sa", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line2: f1040.values["line11"], ...aIn }, rounding);
    const itemized = n(a.values["line17"]);
    const std = n(f1040.values["line12"]);
    const elected = a.values["line18"] === true;
    const required = String(tp["filing_status"]) === "mfs" && tp["spouse_itemizes"] === true;
    if (itemized > std || elected || required) {
      sA = a;
      if (tp["itemized_deductions"] !== undefined) warnings.push("form1040.itemized_deductions was supplied; it is replaced by Schedule A line 17.");
      f1040Values["itemized_deductions"] = itemized;
      f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
      if (itemized <= std) warnings.push(`Itemizing ${itemized} although the standard deduction (${std}) is larger${elected ? " (line 18 elected)" : " (required: spouse itemizes)"}.`);
    } else {
      warnings.push(`Schedule A total (${itemized}) is less than the standard deduction (${std}); the standard deduction is used and Schedule A is omitted.`);
    }
  }

  // Form 8960: net investment income tax when AGI exceeds the threshold (Schedule 2 line 12).
  let f8960: PreparedForm | undefined;
  {
    const thr = ["mfj", "qss"].includes(String(tp["filing_status"])) ? 250000 : String(tp["filing_status"]) === "mfs" ? 125000 : 200000;
    const agi = n(f1040.values["line11"]);
    if (input.form8960?.["skip"] !== true && (input.form8960 || agi > thr)) {
      const extra = { ...(input.form8960 ?? {}) };
      delete extra["skip"];
      const v: Values = {
        name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"],
        line1: f1040.values["line2b"], line2: f1040.values["line3b"], line4a: s1.values["line5"], line5a: n(f1040.values["line7"]) + n(s1.values["line4"]),
        ...(sA ? { line9a: sA.values["line9"] } : {}), line13: agi, ...extra,
      };
      f8960 = prepareFormValues("f8960", year, v, rounding);
      if (n(f8960.values["line17"]) > 0 || input.form8960) {
        if (s2Values["line12"] !== undefined) warnings.push("schedule2.line12 was supplied; it is replaced by Form 8960 line 17.");
        s2Values["line12"] = f8960.values["line17"];
        s2 = prepareFormValues("f1040s2", year, s2Values, rounding);
        s2Needed = true;
        f1040Values["line17"] = s2.values["line3"];
        f1040Values["line23"] = s2.values["line21"];
        f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
      } else f8960 = undefined;
    }
  }

  // Schedule 1-A (2025): tips, overtime, car loan interest, and senior deductions (1040 line 13b).
  let s1a: PreparedForm | undefined;
  const truthyFlag = (v: unknown) => v === true || v === 1 || (typeof v === "string" && /^(true|yes|y|1|x)$/i.test(v));
  if (year === 2025 && (input.schedule1A || truthyFlag(tp["you_65_or_older"]) || truthyFlag(tp["spouse_65_or_older"]))) {
    s1a = prepareFormValues("f1040s1a", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], you_65_or_older: tp["you_65_or_older"], spouse_65_or_older: tp["spouse_65_or_older"], line1: f1040.values["line11"], ...(input.schedule1A ?? {}) }, rounding);
    if (tp["line13b"] !== undefined) warnings.push("form1040.line13b was supplied; it is replaced by Schedule 1-A line 38.");
    f1040Values["line13b"] = s1a.values["line38"];
    f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
  }

  // Form 8995: qualified business income deduction (1040 line 13) from the Schedule C businesses.
  let f8995: PreparedForm | undefined;
  if (schedC.length > 0 || schedF.length > 0 || input.form8995) {
    const extra = input.form8995 ?? {};
    const adjustments = n(s1.values["line15"]) + n(s1.values["line16"]) + n(s1.values["line17"]);
    const trades = [
      ...schedC.map((s, i) => ({ prepared: s.prepared, profit: n(s.prepared.values["line31"]), name: String(s.prepared.values["business_name"] || s.prepared.values["principal_business"] || `Schedule C business ${i + 1}`) })),
      ...schedF.map((s, i) => ({ prepared: s.prepared, profit: n(s.prepared.values["line34"]), name: s.prepared.values["principal_crop"] ? `Farm: ${String(s.prepared.values["principal_crop"])}` : `Schedule F farm ${i + 1}` })),
    ];
    const profits = trades.map((t) => t.profit);
    const totalPositive = profits.filter((p) => p > 0).reduce((a, b) => a + b, 0);
    const businesses = trades.map((t, i) => {
      const profit = profits[i]!;
      const share = profit > 0 && totalPositive > 0 ? (adjustments * profit) / totalPositive : 0;
      return {
        name: t.name,
        tin: String(t.prepared.values["ein"] || t.prepared.values["ssn"] || ""),
        qbi: Math.round(profit - share),
      };
    });
    const deductions = n(f1040.values["line12"]) + (year === 2025 ? n(f1040.values["line13b"]) : 0);
    const v8995: Values = {
      name: jointName,
      ssn: tp["ssn"],
      filing_status: tp["filing_status"],
      businesses,
      line11: Math.max(0, n(f1040.values["line11"]) - deductions),
      line12: Math.max(0, n(tp["line7"])) + n(tp["line3a"]),
      ...extra,
    };
    f8995 = prepareFormValues("f8995", year, v8995, rounding);
    const money = (x: unknown) => n(x).toLocaleString("en-US", { maximumFractionDigits: 0 });
    statements.push({
      id: "qbi",
      title: "Qualified Business Income Computation Statement (supports Form 8995)",
      header: [`${jointName}${tp["ssn"] ? `, SSN ${String(tp["ssn"]).replace(/\d(?=\d{4})/g, "x")}` : ""}`, `Tax year ${year}`],
      columns: ["Business", "Net profit (Sch C line 31 / Sch F line 34)", "Less SE tax deduction, SE health insurance, and retirement (allocated)", "Qualified business income"],
      rows: [
        ...businesses.map((b, i) => [b.name, money(profits[i]), money(-(profits[i]! > 0 && totalPositive > 0 ? (adjustments * profits[i]!) / totalPositive : 0)), money(b.qbi)]),
        ["Total qualified business income (Form 8995 line 2)", "", "", money(f8995.values["line2"])],
        ["Qualified business income component, 20% (line 5)", "", "", money(f8995.values["line5"])],
        ["Taxable income before the deduction (line 11)", "", "", money(v8995["line11"])],
        ["Net capital gain (line 12)", "", "", money(v8995["line12"])],
        ["Income limitation, 20% of line 13 (line 14)", "", "", money(f8995.values["line14"])],
        ["Qualified business income deduction (line 15, Form 1040 line 13)", "", "", money(f8995.values["line15"])],
      ],
      notes: [`Schedule 1 adjustments allocated to each business in proportion to its positive net profit: deductible part of self-employment tax ${money(s1.values["line15"])}, self-employed SEP/SIMPLE/qualified plans ${money(s1.values["line16"])}, self-employed health insurance ${money(s1.values["line17"])}.`, "Qualified business income excludes capital gains, wages paid to you, and investment income. The simplified Form 8995 applies only below the taxable-income threshold; above it Form 8995-A is required."],
    });
    if (tp["line13"] !== undefined) warnings.push("form1040.line13 was supplied; it is replaced by Form 8995 line 15.");
    f1040Values["line13"] = f8995.values["line15"];
    f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
  }

  // Form 6251: the alternative minimum tax is figured for every return with taxable income and attached when it applies.
  let f6251: PreparedForm | undefined;
  let tentativeMinTax = 0;
  if (input.form6251?.["skip"] !== true && (n(f1040.values["line15"]) > 0 || input.form6251)) {
    const extra = { ...(input.form6251 ?? {}) };
    delete extra["skip"];
    const qd = n(f1040.values["line3a"]);
    const gain = sD ? Math.max(0, Math.min(n(sD.values["line15"]), n(sD.values["line16"]))) : Math.max(0, n(f1040.values["line7"]));
    const l15 = n(f1040.values["line15"]);
    const v: Values = {
      name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"],
      ...(year === 2025 ? { line1a: n(f1040.values["line14"]) - (s1a ? n(s1a.values["line37"]) : 0), agi: f1040.values["line11"] } : { line1: l15 > 0 ? l15 : n(f1040.values["line11"]) - n(f1040.values["line14"]) }),
      line2a: sA ? sA.values["line7"] : f1040.values["line12"],
      line2b: -n(s1.values["line1"]),
      line2e: n(s1.values["line8a"]),
      line8: n(input.schedule3?.["line1"]),
      line10: n(f1040.values["line16"]) + n(s2.values["line1z"]),
      ...(qd + gain > 0 ? { line13: qd + gain, line14: sD ? n(sD.values["line19"]) : 0, line20: Math.max(0, l15 - qd - gain) } : {}),
      ...extra,
    };
    const prepared = prepareFormValues("f6251", year, v, rounding);
    tentativeMinTax = n(prepared.values["line9"]);
    if (n(prepared.values["line11"]) > 0 || input.form6251) {
      f6251 = prepared;
      if (s2Values["line2"] !== undefined) warnings.push("schedule2.line2 was supplied; it is replaced by Form 6251 line 11.");
      s2Values["line2"] = prepared.values["line11"];
      s2 = prepareFormValues("f1040s2", year, s2Values, rounding);
      s2Needed = true;
      f1040Values["line17"] = s2.values["line3"];
      f1040Values["line23"] = s2.values["line21"];
      f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
    }
  }
  let f8283: PreparedForm | undefined;
  if (input.form8283) f8283 = prepareFormValues("f8283", year, { name: jointName, ssn: tp["ssn"], ...input.form8283 }, rounding);
  // Forms 8862 and 8938 are informational attachments filled as supplied.
  let f8862: PreparedForm | undefined;
  if (input.form8862) f8862 = prepareFormValues("f8862", year, { name: jointName, ssn: tp["ssn"], ...input.form8862 }, rounding);
  let f8938: PreparedForm | undefined;
  if (input.form8938) f8938 = prepareFormValues("f8938", year, { name: jointName, tin: tp["ssn"], ...input.form8938 }, rounding);
  let f8990: PreparedForm | undefined;
  if (input.form8990) f8990 = prepareFormValues("f8990", year, { name: jointName, ssn: tp["ssn"], ...input.form8990 }, rounding);
  let f982: PreparedForm | undefined;
  if (input.form982) f982 = prepareFormValues("f982", year, { name: jointName, ssn: tp["ssn"], ...input.form982 }, rounding);

  // Form 5695: residential energy credits (Schedule 3 lines 5a and 5b), limited by the tax after the credits ahead of them.
  let f5695: PreparedForm | undefined;
  if (input.form5695) {
    const ahead = ["line1", "line2", "line3", "line4"].reduce((a, k) => a + n(input.schedule3?.[k]), 0);
    const limit = Math.max(0, n(f1040.values["line18"]) - ahead);
    f5695 = prepareFormValues("f5695", year, { name: jointName, ssn: tp["ssn"], line14: limit, ...input.form5695 }, rounding);
    const after15 = Math.max(0, limit - n(f5695.values["line15"]));
    if (input.form5695["line31"] === undefined) f5695 = prepareFormValues("f5695", year, { name: jointName, ssn: tp["ssn"], line14: limit, line31: after15, ...input.form5695 }, rounding);
  }

  // Form 8962: premium tax credit reconciliation from Form 1095-A (Schedule 3 line 9 / Schedule 2 line 1a).
  let f8962: PreparedForm | undefined;
  if (input.form8962) {
    const depCount = Array.isArray(tp["dependents"]) ? (tp["dependents"] as ListRow[]).length : 0;
    const magi = n(f1040.values["line11"]) + n(f1040.values["line2a"]) + Math.max(0, n(f1040.values["line6a"]) - n(f1040.values["line6b"]));
    f8962 = prepareFormValues("f8962", year, { name: fullName, ssn: tp["ssn"], filing_status: tp["filing_status"], line1: 1 + (String(tp["filing_status"]) === "mfj" ? 1 : 0) + depCount, line2a: magi, ...input.form8962 }, rounding);
    if (n(f8962.values["line29"]) > 0) {
      if (s2Values["line1a"] !== undefined) warnings.push("schedule2.line1a was supplied; it is replaced by Form 8962 line 29.");
      s2Values["line1a"] = f8962.values["line29"];
      s2 = prepareFormValues("f1040s2", year, s2Values, rounding);
      s2Needed = true;
      f1040Values["line17"] = s2.values["line3"];
      f1040Values["line23"] = s2.values["line21"];
      f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
    }
  }

  // Forms 1116: the foreign tax credit, one per income category (Schedule 3 line 1).
  const f1116s: PreparedForm[] = asList(input.form1116).map((v, i, all) => {
    const p = prepareFormValues("f1116", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line18: f1040.values["line15"], line20: n(f1040.values["line16"]) + n(s2.values["line1z"]), ...v }, rounding);
    if (all.length > 1) p.title = `${p.title} (${String(v["category"] ?? `category ${i + 1}`).replace(/_/g, " ")})`;
    return p;
  });

  // Credit forms, each limited by the tax left after the credits ahead of it on Schedule 3:
  // Form 2441 (line 2), Form 8863 (line 3 and the refundable part on 1040 line 29), Form 8880 (line 4).
  const s3Input: Values = { ...(input.schedule3 ?? {}) };
  if (f1116s.length) {
    if (s3Input["line1"] !== undefined) warnings.push("schedule3.line1 was supplied; it is replaced by the Form 1116 total.");
    // Each form's line 35 already includes the other categories it was told about; take the largest single total rather than double counting.
    s3Input["line1"] = Math.max(...f1116s.map((p) => n(p.values["line35"])));
  }
  if (f5695) {
    if (s3Input["line5a"] !== undefined || s3Input["line5b"] !== undefined) warnings.push("schedule3.line5a/5b were supplied; they are replaced by Form 5695 lines 15 and 32.");
    s3Input["line5a"] = f5695.values["line15"];
    s3Input["line5b"] = f5695.values["line32"];
  }
  if (f8962 && n(f8962.values["line26"]) > 0) {
    if (s3Input["line9"] !== undefined) warnings.push("schedule3.line9 was supplied; it is replaced by Form 8962 line 26.");
    s3Input["line9"] = f8962.values["line26"];
  }
  let f2441: PreparedForm | undefined;
  let f8863: PreparedForm | undefined;
  let f8880: PreparedForm | undefined;
  if (input.form2441 || input.form8863 || input.form8880) {
    const agi = n(f1040.values["line11"]);
    const taxBeforeCredits = n(f1040.values["line18"]);
    const earned = Math.max(0, n(f1040.values["line1z"]) + totalSchC + totalSchF - seDeduction);
    if (input.form2441) {
      f2441 = prepareFormValues("f2441", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line4: earned, line7: agi, line10: Math.max(0, taxBeforeCredits - n(s3Input["line1"])), ...input.form2441 }, rounding);
      if (s3Input["line2"] !== undefined) warnings.push("schedule3.line2 was supplied; it is replaced by Form 2441 line 11.");
      s3Input["line2"] = f2441.values["line11"];
    }
    if (input.form8863) {
      f8863 = prepareFormValues("f8863", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line3: agi, credit_limit: Math.max(0, taxBeforeCredits - n(s3Input["line1"]) - n(s3Input["line2"])), ...input.form8863 }, rounding);
      if (s3Input["line3"] !== undefined) warnings.push("schedule3.line3 was supplied; it is replaced by Form 8863 line 19.");
      s3Input["line3"] = f8863.values["line19"];
      if (tp["line29"] !== undefined) warnings.push("form1040.line29 was supplied; it is replaced by Form 8863 line 8.");
      f1040Values["line29"] = f8863.values["line8"];
    }
    if (input.form8880) {
      const ws2 = ["line1", "line2", "line3", "line6d", "line6l"].reduce((a, k) => a + n(s3Input[k]), 0);
      f8880 = prepareFormValues("f8880", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line8: agi, ws_line1: taxBeforeCredits, ws_line2: ws2, ...input.form8880 }, rounding);
      if (s3Input["line4"] !== undefined) warnings.push("schedule3.line4 was supplied; it is replaced by Form 8880 line 12.");
      s3Input["line4"] = f8880.values["line12"];
    }
  }

  // Form 8936: clean vehicle credits (Schedule 3 lines 6f and 6m), limited by the tax after the credits ahead of them.
  let f8936: PreparedForm | undefined;
  if (input.form8936) {
    const ahead = ["line1", "line2", "line3", "line4", "line5a", "line5b", "line6b", "line6d", "line6e", "line6g", "line6h", "line6i", "line6j", "line6k", "line6l"].reduce((a, k) => a + n(s3Input[k]), 0);
    f8936 = prepareFormValues("f8936", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line1a: f1040.values["line11"], ...(f2555 ? { line1c: n(f2555.values["line42"]) + n(f2555.values["line36"]), line1d: f2555.values["line50"] } : {}), line10: f1040.values["line18"], line11: ahead, line15: f1040.values["line18"], ...input.form8936 }, rounding);
    if (n(f8936.values["line13"]) > 0) {
      if (s3Input["line6f"] !== undefined) warnings.push("schedule3.line6f was supplied; it is replaced by Form 8936 line 13.");
      s3Input["line6f"] = f8936.values["line13"];
    }
    if (n(f8936.values["line18"]) > 0) {
      if (s3Input["line6m"] !== undefined) warnings.push("schedule3.line6m was supplied; it is replaced by Form 8936 line 18.");
      s3Input["line6m"] = f8936.values["line18"];
    }
  }

  // Schedule R: the credit for the elderly or the disabled (Schedule 3 line 6d).
  let sR: PreparedForm | undefined;
  if (input.scheduleR) {
    const ahead = ["line1", "line2", "line3", "line4", "line5a", "line5b"].reduce((a, k) => a + n(s3Input[k]), 0);
    sR = prepareFormValues("f1040r", year, { name: jointName, ssn: tp["ssn"], line13a: Math.max(0, n(f1040.values["line6a"]) - n(f1040.values["line6b"])), line14: f1040.values["line11"], line21: Math.max(0, n(f1040.values["line18"]) - ahead), ...input.scheduleR }, rounding);
    if (n(sR.values["line22"]) > 0) {
      if (s3Input["line6d"] !== undefined) warnings.push("schedule3.line6d was supplied; it is replaced by Schedule R line 22.");
      s3Input["line6d"] = sR.values["line22"];
    }
  }

  // Form 8839 (second pass): the adoption credit (Schedule 3 line 6c) and, for 2025, the refundable part (Form 1040 line 30).
  let f8839: PreparedForm | undefined;
  if (input.form8839) {
    const ahead = ["line1", "line2", "line3", "line4", "line5a", "line5b", "line6b"].reduce((a, k) => a + n(s3Input[k]), 0);
    f8839 = prepareFormValues("f8839", year, { name: jointName, ssn: tp["ssn"], line7: n(f1040.values["line11"]) + feieExcluded, line17: Math.max(0, n(f1040.values["line18"]) - ahead), ...input.form8839 }, rounding);
    if (n(f8839.values["line18"]) > 0) {
      if (s3Input["line6c"] !== undefined) warnings.push("schedule3.line6c was supplied; it is replaced by Form 8839 line 18.");
      s3Input["line6c"] = f8839.values["line18"];
    }
    if (year === 2025 && n(f8839.values["line13"]) > 0) {
      if (tp["line30"] !== undefined) warnings.push("form1040.line30 was supplied; it is replaced by Form 8839 line 13.");
      f1040Values["line30"] = f8839.values["line13"];
    }
  }

  // Form 8396: the mortgage interest credit (Schedule 3 line 6g).
  let f8396: PreparedForm | undefined;
  if (input.form8396) {
    const ahead = ["line1", "line2", "line3", "line4", "line5a", "line5b", "line6d", "line6f", "line6h", "line6i", "line6m"].reduce((a, k) => a + n(s3Input[k]), 0);
    f8396 = prepareFormValues("f8396", year, { name: jointName, ssn: tp["ssn"], ws_line1: f1040.values["line18"], ws_line2: ahead, ...input.form8396 }, rounding);
    if (n(f8396.values["line9"]) > 0) {
      if (s3Input["line6g"] !== undefined) warnings.push("schedule3.line6g was supplied; it is replaced by Form 8396 line 9.");
      s3Input["line6g"] = f8396.values["line9"];
    }
  }

  // Form 8801: the minimum tax credit (Schedule 3 line 6b) from last year's AMT on deferral items.
  let f8801: PreparedForm | undefined;
  if (input.form8801) {
    const creditsAhead = ["line1", "line2", "line3", "line4", "line5a", "line5b", "line6c", "line6d", "line6f", "line6g", "line6h", "line6i", "line6j", "line6k", "line6l", "line6m"].reduce((a, k) => a + n(s3Input[k]), 0);
    f8801 = prepareFormValues("f8801", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line22: Math.max(0, n(f1040.values["line16"]) + n(s2.values["line1z"]) - creditsAhead), line23: tentativeMinTax, ...input.form8801 }, rounding);
    if (n(f8801.values["line25"]) > 0) {
      if (s3Input["line6b"] !== undefined) warnings.push("schedule3.line6b was supplied; it is replaced by Form 8801 line 25.");
      s3Input["line6b"] = f8801.values["line25"];
    }
  }

  // Form 8911: the alternative fuel vehicle refueling property credit (Schedule 3 line 6j; the business part goes to Form 3800 line 1s).
  let f8911: PreparedForm | undefined;
  if (input.form8911) {
    const ahead = ["line2", "line3", "line4", "line5a", "line5b", "line6b", "line6c", "line6d", "line6f", "line6g", "line6h", "line6i"].reduce((a, k) => a + n(s3Input[k]), 0);
    f8911 = prepareFormValues("f8911", year, { name: jointName, ssn: tp["ssn"], line5: n(f1040.values["line16"]) + n(s2.values["line1z"]), line6a: n(s3Input["line1"]), line6b: ahead, line8: tentativeMinTax, ...input.form8911 }, rounding);
    if (n(f8911.values["line10"]) > 0) {
      if (s3Input["line6j"] !== undefined) warnings.push("schedule3.line6j was supplied; it is replaced by Form 8911 line 10.");
      s3Input["line6j"] = f8911.values["line10"];
    }
  }

  // Form 3800: the general business credit (Schedule 3 line 6a), limited by net income tax and the tentative minimum tax.
  let f3800: PreparedForm | undefined;
  if (input.form3800 || (f8936 && (n(f8936.values["line8"]) > 0 || n(f8936.values["line21"]) > 0)) || (f8911 && n(f8911.values["line3"]) > 0)) {
    const extra: Values = { ...(input.form3800 ?? {}) };
    const credits: ListRow[] = [...((extra["credits"] as ListRow[] | undefined) ?? [])];
    if (f8936 && n(f8936.values["line8"]) > 0) credits.push({ line: "1y", nonpassive: n(f8936.values["line8"]) });
    if (f8936 && n(f8936.values["line21"]) > 0) credits.push({ line: "1aa", nonpassive: n(f8936.values["line21"]) });
    if (f8911 && n(f8911.values["line3"]) > 0) credits.push({ line: "1s", nonpassive: n(f8911.values["line3"]) });
    const otherCredits = ["line2", "line3", "line4", "line5a", "line5b", "line6b", "line6c", "line6d", "line6f", "line6g", "line6h", "line6i", "line6j", "line6k", "line6l", "line6m"].reduce((a, k) => a + n(s3Input[k]), 0);
    f3800 = prepareFormValues("f3800", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line7: n(f1040.values["line16"]) + n(s2.values["line1z"]), line8: n(s2.values["line2"]), line10a: n(s3Input["line1"]), line10b: otherCredits, line14: tentativeMinTax, ...extra, credits }, rounding);
    if (s3Input["line6a"] !== undefined) warnings.push("schedule3.line6a was supplied; it is replaced by Form 3800 line 38.");
    s3Input["line6a"] = f3800.values["line38"];
  }

  // Schedule 3: other credits and payments (1040 lines 20 and 31).
  let s3: PreparedForm | undefined;
  if (input.schedule3 || f2441 || f8863 || f8880 || f8936 || f3800 || f8801 || f8911 || sR || f8839 || f8396 || f1116s.length || f5695 || (f8962 && n(f8962.values["line26"]) > 0)) {
    s3 = prepareFormValues("f1040s3", year, { name: jointName, ssn: tp["ssn"], ...s3Input }, rounding);
    if (tp["line20"] !== undefined) warnings.push("form1040.line20 was supplied; it is replaced by Schedule 3 line 8.");
    if (tp["line31"] !== undefined) warnings.push("form1040.line31 was supplied; it is replaced by Schedule 3 line 15.");
    f1040Values["line20"] = s3.values["line8"];
    f1040Values["line31"] = s3.values["line15"];
    f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
  }

  // Schedule EIC / earned income credit to Form 1040 line 27 (before Schedule 8812, whose line 24 includes it).
  let sEIC: PreparedForm | undefined;
  if (input.scheduleEIC) {
    const earned = Math.max(0, n(f1040.values["line1z"]) + totalSchC + totalSchF - seDeduction);
    const investment = n(f1040.values["line2a"]) + n(f1040.values["line2b"]) + n(f1040.values["line3b"]) + Math.max(0, n(f1040.values["line7"]));
    const eic = prepareFormValues("f1040sei", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], earned_income: earned, agi: f1040.values["line11"], investment_income: investment, ...input.scheduleEIC }, rounding);
    if (tp["line27"] !== undefined) warnings.push("form1040.line27 was supplied; it is replaced by the computed earned income credit.");
    f1040Values["line27"] = eic.values["eic_credit"];
    f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
    if (n(eic.values["qualifying_children"]) > 0) sEIC = eic; // Schedule EIC is attached only with qualifying children
    else for (const w of eic.warnings) warnings.push(`Earned income credit: ${w}`);
  }

  // Schedule 8812: child tax credit (1040 line 19) and additional child tax credit (1040 line 28).
  const truthy = (v: unknown) => v === true || v === 1 || (typeof v === "string" && /^(true|yes|y|1|x)$/i.test(v));
  const depRows = Array.isArray(tp["dependents"]) ? (tp["dependents"] as ListRow[]) : [];
  const kids = depRows.filter((r) => truthy(r["child_tax_credit"])).length;
  const others = depRows.filter((r) => truthy(r["other_dependents_credit"])).length;
  let s8: PreparedForm | undefined;
  if (kids + others > 0 || input.schedule8812) {
    const extra = input.schedule8812 ?? {};
    // Credit Limit Worksheet A: Schedule 3 lines 1, 2, 3, 4, 5b, 6d, 6f, 6l, 6m reduce the tax available for the child credit.
    const otherCredits = s3
      ? ["line1", "line2", "line3", "line4", "line5b", "line6d", "line6f", "line6l", "line6m"].reduce((a, k) => a + n(s3!.values[k]), 0)
      : n(extra["other_nonrefundable_credits"]);
    const earned = Math.max(0, n(f1040.values["line1z"]) + totalSchC + totalSchF - seDeduction);
    const s8Values: Values = {
      name: jointName,
      ssn: tp["ssn"],
      filing_status: tp["filing_status"],
      line1: f1040.values["line11"],
      line4: kids,
      line6: others,
      line13: Math.max(0, n(f1040.values["line18"]) - otherCredits),
      line18a: earned,
      line22: n(s1.values["line15"]) + n(s2.values["line5"]) + n(s2.values["line6"]) + n(s2.values["line13"]),
      line24: n(f1040Values["line27"] ?? tp["line27"]) + (s3 ? n(s3.values["line11"]) : n(extra["schedule3_line11"])),
      ...extra,
    };
    delete s8Values["other_nonrefundable_credits"];
    delete s8Values["schedule3_line11"];
    s8 = prepareFormValues("f1040s8", year, s8Values, rounding);
    if (tp["line19"] !== undefined) warnings.push("form1040.line19 was supplied; it is replaced by Schedule 8812 line 14.");
    if (tp["line28"] !== undefined) warnings.push("form1040.line28 was supplied; it is replaced by Schedule 8812 line 27.");
    f1040Values["line19"] = s8.values["line14"];
    f1040Values["line28"] = s8.values["line27"];
    f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
  }

  // Form 2210: the estimated tax penalty when the balance due reaches $1,000 (Form 1040 line 38).
  let f2210: PreparedForm | undefined;
  if (input.form2210?.["skip"] !== true && (input.form2210 || n(f1040.values["line37"]) >= 1000)) {
    const extra = { ...(input.form2210 ?? {}) };
    delete extra["skip"];
    const refundable = n(f1040.values["line27"]) + n(f1040.values["line28"]) + n(f1040.values["line29"]) + (year === 2025 ? n(f1040.values["line30"]) : 0) + (f8962 ? n(f8962.values["line26"]) : 0);
    const payments = extra["estimated_payments"] ?? (n(f1040.values["line26"]) > 0 ? [1, 2, 3, 4].map((q) => ({ date: q === 4 ? `01/15/${year + 1}` : `${[4, 6, 9][q - 1]}/15/${year}`, amount: Math.round(n(f1040.values["line26"]) / 4) })) : []);
    if (extra["estimated_payments"] === undefined && n(f1040.values["line26"]) > 0) warnings.push("Form 2210: estimated payments were assumed paid in four equal installments on the due dates; supply form2210.estimated_payments with the actual dates.");
    f2210 = prepareFormValues("f2210", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line1: f1040.values["line22"], line2: f1040.values["line23"], line3: -refundable, line6: f1040.values["line25d"], ...extra, estimated_payments: payments }, rounding);
    if (n(f2210.values["line19"]) > 0 || input.form2210) {
      if (tp["line38"] !== undefined) warnings.push("form1040.line38 was supplied; it is replaced by Form 2210 line 19.");
      f1040Values["line38"] = f2210.values["line19"];
      f1040 = prepareFormValues(mainId, year, f1040Values, rounding);
    } else f2210 = undefined;
  }

  // Form 4868 extension voucher from the computed totals.
  let f4868: PreparedForm | undefined;
  if (input.form4868) {
    const addr = [tp["address"], tp["apt"]].filter(Boolean).join(" ");
    f4868 = prepareFormValues("f4868", year, { name: jointName, address: addr, city: tp["city"], state: tp["state"], zip: tp["zip"], ssn: tp["ssn"], spouse_ssn: tp["spouse_ssn"], line4: f1040.values["line24"], line5: f1040.values["line33"], ...input.form4868 }, rounding);
  }

  // Forms 8888, 1310, and 8958: filled from the return's figures and attached.
  let f8888: PreparedForm | undefined;
  if (input.form8888) f8888 = prepareFormValues("f8888", year, { name: jointName, ssn: tp["ssn"], refund: f1040.values["line35a"], ...input.form8888 }, rounding);
  let f1310: PreparedForm | undefined;
  if (input.form1310) f1310 = prepareFormValues("f1310", year, { ...input.form1310 }, rounding);
  let f8958: PreparedForm | undefined;
  if (input.form8958) f8958 = prepareFormValues("f8958", year, { first_name: tp["first_name"], last_name: tp["last_name"], ssn: tp["ssn"], spouse_first_name: tp["spouse_first_name"], spouse_last_name: tp["spouse_last_name"], spouse_ssn: tp["spouse_ssn"], ...input.form8958 }, rounding);

  // Form 1040-ES: next year's estimated payments from this year's return.
  let f1040es: PreparedForm | undefined;
  if (input.form1040es) {
    const seTax = n(s2.values["line4"]);
    f1040es = prepareFormValues("f1040es", year, {
      first_name: tp["first_name"], last_name: tp["last_name"], ssn: tp["ssn"], spouse_first_name: tp["spouse_first_name"], spouse_last_name: tp["spouse_last_name"], spouse_ssn: tp["spouse_ssn"],
      address: [tp["address"], tp["apt"]].filter(Boolean).join(" "), city: tp["city"], state: tp["state"], zip: tp["zip"],
      filing_status: tp["filing_status"],
      line1: f1040.values["line11"], line2a: f1040.values["line12"], line2b: f1040.values["line13"], ...(year === 2025 ? { line2c_additional: f1040.values["line13b"] } : {}),
      line5: s2.values["line2"], line7: f1040.values["line21"], line9: seTax, line10: Math.max(0, n(s2.values["line21"]) - seTax), line11b: f1040.values["line32"],
      prior_year_tax: f1040.values["line24"], prior_year_agi: f1040.values["line11"], line13: f1040.values["line25d"], overpayment_applied: tp["line36"],
      ...input.form1040es,
    }, rounding);
  }

  forms.push(f1040);
  if (s1Needed) forms.push(s1);
  for (const p of f8814s) forms.push(p);
  if (f461) forms.push(f461);
  if (s2Needed) forms.push(s2);
  if (sH) forms.push(sH);
  if (f8615) forms.push(f8615);
  if (f5405) forms.push(f5405);
  if (sB) forms.push(sB);
  if (sA) forms.push(sA);
  if (f4952) forms.push(f4952);
  if (f4684) forms.push(f4684);
  if (sD) forms.push(sD);
  for (const p of f8949s) forms.push(p);
  if (f6781) forms.push(f6781);
  for (const p of f6252s) forms.push(p);
  for (const p of f8824s) forms.push(p);
  if (s1a && n(s1a.values["line38"]) > 0) forms.push(s1a);
  if (f2555) forms.push(f2555);
  if (f2106) forms.push(f2106);
  if (f8853) forms.push(f8853);
  if (f3903) forms.push(f3903);
  if (s3) forms.push(s3);
  if (f2441) forms.push(f2441);
  if (f8863) forms.push(f8863);
  if (f8880) forms.push(f8880);
  if (f8936) forms.push(f8936);
  if (f3800) forms.push(f3800);
  if (f8801) forms.push(f8801);
  if (f8911) forms.push(f8911);
  if (sR) forms.push(sR);
  if (f8839) forms.push(f8839);
  if (f8396) forms.push(f8396);
  if (s8) forms.push(s8);
  if (sEIC) forms.push(sEIC);
  if (f8995) forms.push(f8995);
  for (const p of f8889s) forms.push(p);
  if (f8959 && (n(f8959.values["line18"]) > 0 || n(f8959.values["line24"]) > 0 || input.form8959)) forms.push(f8959);
  if (f8960) forms.push(f8960);
  if (f6251) forms.push(f6251);
  for (const p of f8606s) forms.push(p);
  for (const p of f5329s) forms.push(p);
  if (f8283) forms.push(f8283);
  if (f8862) forms.push(f8862);
  if (f8938) forms.push(f8938);
  if (f8958) forms.push(f8958);
  if (f8990) forms.push(f8990);
  if (f982) forms.push(f982);
  if (f8962) forms.push(f8962);
  if (f5695) forms.push(f5695);
  if (f4797) forms.push(f4797);
  for (const p of f1116s) forms.push(p);
  for (const s of schedC) forms.push(s.prepared);
  for (const s of schedF) forms.push(s.prepared);
  for (const p of f8829s) forms.push(p);
  for (const [i, p] of f4562s.entries()) { forms.push(p); statements.push(...statementsFor(p, year, i + 1)); }
  for (const s of seForms) forms.push(s.prepared);
  if (sE) forms.push(sE);
  if (f4835) forms.push(f4835);
  if (f8582) forms.push(f8582);
  if (f2210) forms.push(f2210);
  if (f4868) forms.push(f4868);
  if (f8888) forms.push(f8888);
  if (f1310) forms.push(f1310);
  if (f1040es) forms.push(f1040es);

  const link = await linkFor(year, forms, { ...opts, rounding, title: opts.title ?? `${year} Form 1040 return for ${jointName || "taxpayer"}` }, statements);
  return {
    year,
    forms,
    statements,
    warnings,
    totals: {
      schedule_c_net_profit: totalSchC,
      schedule_f_net_profit: totalSchF,
      self_employment_tax: seTax,
      adjusted_gross_income: n(f1040.values["line11"]),
      taxable_income: n(f1040.values["line15"]),
      qbi_deduction: f8995 ? n(f8995.values["line15"]) : 0,
      hsa_deduction: sum8889("line13"),
      additional_medicare_tax: f8959 ? n(f8959.values["line18"]) : 0,
      net_investment_income_tax: f8960 ? n(f8960.values["line17"]) : 0,
      alternative_minimum_tax: f6251 ? n(f6251.values["line11"]) : 0,
      net_premium_tax_credit: f8962 ? n(f8962.values["line26"]) : 0,
      excess_advance_ptc_repayment: f8962 ? n(f8962.values["line29"]) : 0,
      child_tax_credit: s8 ? n(s8.values["line14"]) : 0,
      additional_child_tax_credit: s8 ? n(s8.values["line27"]) : 0,
      total_tax: n(f1040.values["line24"]),
      total_payments: n(f1040.values["line33"]),
      refund: n(f1040.values["line35a"]),
      amount_owed: n(f1040.values["line37"]),
      estimated_tax_penalty: f2210 ? n(f2210.values["line19"]) : 0,
      general_business_credit: f3800 ? n(f3800.values["line38"]) : 0,
      foreign_earned_income_exclusion: feieExcluded,
    },
    link,
  };
}
