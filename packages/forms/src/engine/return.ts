import { FORMS } from "../forms/index.ts";
import { getFieldMap } from "../fieldmaps/index.ts";
import type { Computation, FormId, ListRow, Rounding, TaxYear, ValidationIssue, Values } from "../types.ts";
import { toPdfFields, type SummaryLine } from "./fill.ts";
import { encodePayload, renderUrl, type RenderPayload } from "./link.ts";
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

export async function linkFor(year: TaxYear, forms: PreparedForm[], opts: PrepareOptions): Promise<string> {
  const payload: RenderPayload = {
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

export async function prepareForm(formId: FormId, year: TaxYear, values: Values, opts: PrepareOptions): Promise<PreparedForm & { link: string }> {
  const prepared = prepareFormValues(formId, year, values, opts.rounding ?? "whole");
  const link = await linkFor(year, [prepared], opts);
  return { ...prepared, link };
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
  /** Optional Form 8829 inputs (home office, actual expenses) for the first Schedule C unless `business` (1-based) says otherwise. */
  form8829?: Values;
  /** Optional Form 4868 inputs; when present the extension voucher is filled from the computed totals. */
  form4868?: Values;
  /** Optional Form 8889 (HSA) inputs: coverage, line2 contributions, line9 employer contributions, line14a/15 distributions, age_55_or_older. */
  form8889?: Values;
  /** Optional Form 8959 inputs: line1 Medicare wages (W-2 box 5), line19 Medicare withheld (box 6), line2, line3, line14, line23. */
  form8959?: Values;
  /** Optional Schedule 1-A inputs (2025): line4a tips, line14a overtime, vehicles [{vin, description, interest}], line2a-2d. */
  schedule1A?: Values;
  /** Optional Schedule 3 inputs (foreign tax credit, energy credits, premium tax credit, extension payment, excess SS withholding...). */
  schedule3?: Values;
}

export interface PreparedReturn {
  year: TaxYear;
  forms: PreparedForm[];
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
  let f8829: PreparedForm | undefined;
  const schedC = (input.scheduleC ?? []).map((v, i) => {
    const owner = v["owner"] === "spouse" ? "spouse" : "you";
    const values: Values = { ...headerFor(owner), ...v };
    delete values["owner"];
    let p = prepareFormValues("f1040sc", year, values, rounding);
    // Form 8829 (actual home-office expenses) replaces the simplified method on this business's line 30.
    const target = Math.max(1, Math.round(n(input.form8829?.["business"] ?? 1)));
    if (input.form8829 && target === i + 1) {
      const v8829: Values = { ...headerFor(owner), ...input.form8829 };
      delete v8829["business"];
      if (v8829["line8"] === undefined) v8829["line8"] = p.values["line29"];
      f8829 = prepareFormValues("f8829", year, v8829, rounding);
      const withHome: Values = { ...values, line30: f8829.values["line36"] };
      delete withHome["line30_home_sqft"];
      delete withHome["line30_business_sqft"];
      if (values["line30"] !== undefined || values["line30_business_sqft"] !== undefined) warnings.push(`scheduleC[${i}] line 30 is replaced by Form 8829 line 36.`);
      p = prepareFormValues("f1040sc", year, withHome, rounding);
    }
    p.title = `${p.title} (business ${i + 1}${owner === "spouse" ? ", spouse" : ""})`;
    return { owner, prepared: p };
  });
  if (input.form8829 && !f8829) warnings.push("form8829 was supplied but no matching Schedule C business exists; it was ignored.");
  if (schedC.length > 1 && !["mfj"].includes(String(tp["filing_status"])) && schedC.some((s) => s.owner === "spouse")) {
    warnings.push("A spouse's Schedule C is listed but the filing status is not married filing jointly.");
  }

  const seForms: Array<{ owner: "you" | "spouse"; prepared: PreparedForm }> = [];
  for (const owner of ["you", "spouse"] as const) {
    const mine = schedC.filter((s) => s.owner === owner);
    const overrides = owner === "you" ? input.scheduleSE : input.scheduleSESpouse;
    if (mine.length === 0 && !overrides) continue;
    const net = mine.reduce((acc, s) => acc + n(s.prepared.values["line31"]), 0);
    const seValues: Values = { ...headerFor(owner), ...(overrides ?? {}) };
    if (overrides && overrides["line2"] !== undefined) warnings.push(`scheduleSE${owner === "spouse" ? "Spouse" : ""}.line2 was supplied; it is replaced by the Schedule C total (${net}).`);
    seValues["line2"] = net;
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
  let f8889: PreparedForm | undefined;
  if (input.form8889) {
    f8889 = prepareFormValues("f8889", year, { name: fullName, ssn: tp["ssn"], ...input.form8889 }, rounding);
  }

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

  const s1Values: Values = { name: jointName, ssn: tp["ssn"], ...(input.schedule1 ?? {}) };
  if (f8889) {
    if (s1Values["line13"] !== undefined) warnings.push("schedule1.line13 was supplied; it is replaced by Form 8889 line 13.");
    s1Values["line13"] = f8889.values["line13"];
    const hsaIncome = n(f8889.values["line16"]) + n(f8889.values["line20"]);
    if (hsaIncome > 0) s1Values["line8f"] = n(s1Values["line8f"]) + hsaIncome;
  }
  if (schedC.length) s1Values["line3"] = totalSchC;
  if (seForms.length) s1Values["line15"] = seDeduction;
  const s1 = prepareFormValues("f1040s1", year, s1Values, rounding);
  const s1Needed = n(s1.values["line10"]) !== 0 || n(s1.values["line26"]) !== 0 || schedC.length > 0 || Object.keys(input.schedule1 ?? {}).length > 0;

  const s2Values: Values = { name: jointName, ssn: tp["ssn"], ...(input.schedule2 ?? {}) };
  if (seForms.length) s2Values["line4"] = seTax;
  if (f8889) {
    if (n(f8889.values["line17b"]) > 0) s2Values["line17c"] = f8889.values["line17b"];
    if (n(f8889.values["line21"]) > 0) s2Values["line17d"] = f8889.values["line21"];
  }
  if (f8959) {
    if (s2Values["line11"] !== undefined) warnings.push("schedule2.line11 was supplied; it is replaced by Form 8959 line 18.");
    s2Values["line11"] = f8959.values["line18"];
  }
  const s2 = prepareFormValues("f1040s2", year, s2Values, rounding);
  const s2Needed = n(s2.values["line3"]) !== 0 || n(s2.values["line21"]) !== 0;

  const f1040Values: Values = { ...tp };
  if (f8959 && n(f8959.values["line24"]) > 0) f1040Values["line25c"] = n(tp["line25c"]) + n(f8959.values["line24"]);
  if (s1Needed) {
    f1040Values["line8"] = s1.values["line10"];
    f1040Values["line10"] = s1.values["line26"];
  }
  if (s2Needed) {
    f1040Values["line17"] = s2.values["line3"];
    f1040Values["line23"] = s2.values["line21"];
  }
  let f1040 = prepareFormValues("f1040", year, f1040Values, rounding);

  // Schedule 1-A (2025): tips, overtime, car loan interest, and senior deductions (1040 line 13b).
  let s1a: PreparedForm | undefined;
  const truthyFlag = (v: unknown) => v === true || v === 1 || (typeof v === "string" && /^(true|yes|y|1|x)$/i.test(v));
  if (year === 2025 && (input.schedule1A || truthyFlag(tp["you_65_or_older"]) || truthyFlag(tp["spouse_65_or_older"]))) {
    s1a = prepareFormValues("f1040s1a", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], you_65_or_older: tp["you_65_or_older"], spouse_65_or_older: tp["spouse_65_or_older"], line1: f1040.values["line11"], ...(input.schedule1A ?? {}) }, rounding);
    if (tp["line13b"] !== undefined) warnings.push("form1040.line13b was supplied; it is replaced by Schedule 1-A line 38.");
    f1040Values["line13b"] = s1a.values["line38"];
    f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
  }

  // Form 8995: qualified business income deduction (1040 line 13) from the Schedule C businesses.
  let f8995: PreparedForm | undefined;
  if (schedC.length > 0 || input.form8995) {
    const extra = input.form8995 ?? {};
    const adjustments = n(s1.values["line15"]) + n(s1.values["line16"]) + n(s1.values["line17"]);
    const profits = schedC.map((s) => n(s.prepared.values["line31"]));
    const totalPositive = profits.filter((p) => p > 0).reduce((a, b) => a + b, 0);
    const businesses = schedC.map((s, i) => {
      const profit = profits[i]!;
      const share = profit > 0 && totalPositive > 0 ? (adjustments * profit) / totalPositive : 0;
      return {
        name: String(s.prepared.values["business_name"] || s.prepared.values["principal_business"] || `Schedule C business ${i + 1}`),
        tin: String(s.prepared.values["ein"] || s.prepared.values["ssn"] || ""),
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
    if (tp["line13"] !== undefined) warnings.push("form1040.line13 was supplied; it is replaced by Form 8995 line 15.");
    f1040Values["line13"] = f8995.values["line15"];
    f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
  }

  // Schedule 3: other credits and payments (1040 lines 20 and 31).
  let s3: PreparedForm | undefined;
  if (input.schedule3) {
    s3 = prepareFormValues("f1040s3", year, { name: jointName, ssn: tp["ssn"], ...input.schedule3 }, rounding);
    if (tp["line20"] !== undefined) warnings.push("form1040.line20 was supplied; it is replaced by Schedule 3 line 8.");
    if (tp["line31"] !== undefined) warnings.push("form1040.line31 was supplied; it is replaced by Schedule 3 line 15.");
    f1040Values["line20"] = s3.values["line8"];
    f1040Values["line31"] = s3.values["line15"];
    f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
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
    const earned = Math.max(0, n(f1040.values["line1z"]) + totalSchC - seDeduction);
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
      line24: n(tp["line27"]) + (s3 ? n(s3.values["line11"]) : n(extra["schedule3_line11"])),
      ...extra,
    };
    delete s8Values["other_nonrefundable_credits"];
    delete s8Values["schedule3_line11"];
    s8 = prepareFormValues("f1040s8", year, s8Values, rounding);
    if (tp["line19"] !== undefined) warnings.push("form1040.line19 was supplied; it is replaced by Schedule 8812 line 14.");
    if (tp["line28"] !== undefined) warnings.push("form1040.line28 was supplied; it is replaced by Schedule 8812 line 27.");
    f1040Values["line19"] = s8.values["line14"];
    f1040Values["line28"] = s8.values["line27"];
    f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
  }

  // Form 4868 extension voucher from the computed totals.
  let f4868: PreparedForm | undefined;
  if (input.form4868) {
    const addr = [tp["address"], tp["apt"]].filter(Boolean).join(" ");
    f4868 = prepareFormValues("f4868", year, { name: jointName, address: addr, city: tp["city"], state: tp["state"], zip: tp["zip"], ssn: tp["ssn"], spouse_ssn: tp["spouse_ssn"], line4: f1040.values["line24"], line5: f1040.values["line33"], ...input.form4868 }, rounding);
  }

  forms.push(f1040);
  if (s1Needed) forms.push(s1);
  if (s2Needed) forms.push(s2);
  if (s1a && n(s1a.values["line38"]) > 0) forms.push(s1a);
  if (s3) forms.push(s3);
  if (s8) forms.push(s8);
  if (f8995) forms.push(f8995);
  if (f8889) forms.push(f8889);
  if (f8959 && (n(f8959.values["line18"]) > 0 || n(f8959.values["line24"]) > 0 || input.form8959)) forms.push(f8959);
  for (const s of schedC) forms.push(s.prepared);
  if (f8829) forms.push(f8829);
  for (const s of seForms) forms.push(s.prepared);
  if (f4868) forms.push(f4868);

  const link = await linkFor(year, forms, { ...opts, rounding, title: opts.title ?? `${year} Form 1040 return for ${jointName || "taxpayer"}` });
  return {
    year,
    forms,
    warnings,
    totals: {
      schedule_c_net_profit: totalSchC,
      self_employment_tax: seTax,
      adjusted_gross_income: n(f1040.values["line11"]),
      taxable_income: n(f1040.values["line15"]),
      qbi_deduction: f8995 ? n(f8995.values["line15"]) : 0,
      hsa_deduction: f8889 ? n(f8889.values["line13"]) : 0,
      additional_medicare_tax: f8959 ? n(f8959.values["line18"]) : 0,
      child_tax_credit: s8 ? n(s8.values["line14"]) : 0,
      additional_child_tax_credit: s8 ? n(s8.values["line27"]) : 0,
      total_tax: n(f1040.values["line24"]),
      total_payments: n(f1040.values["line33"]),
      refund: n(f1040.values["line35a"]),
      amount_owed: n(f1040.values["line37"]),
    },
    link,
  };
}
