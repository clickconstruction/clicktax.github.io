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
  const schedC = (input.scheduleC ?? []).map((v, i) => {
    const owner = v["owner"] === "spouse" ? "spouse" : "you";
    const values: Values = { ...headerFor(owner), ...v };
    delete values["owner"];
    const p = prepareFormValues("f1040sc", year, values, rounding);
    p.title = `${p.title} (business ${i + 1}${owner === "spouse" ? ", spouse" : ""})`;
    return { owner, prepared: p };
  });
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

  const s1Values: Values = { name: jointName, ssn: tp["ssn"], ...(input.schedule1 ?? {}) };
  if (schedC.length) s1Values["line3"] = totalSchC;
  if (seForms.length) s1Values["line15"] = seDeduction;
  const s1 = prepareFormValues("f1040s1", year, s1Values, rounding);
  const s1Needed = n(s1.values["line10"]) !== 0 || n(s1.values["line26"]) !== 0 || schedC.length > 0 || Object.keys(input.schedule1 ?? {}).length > 0;

  const s2Values: Values = { name: jointName, ssn: tp["ssn"], ...(input.schedule2 ?? {}) };
  if (seForms.length) s2Values["line4"] = seTax;
  const s2 = prepareFormValues("f1040s2", year, s2Values, rounding);
  const s2Needed = n(s2.values["line3"]) !== 0 || n(s2.values["line21"]) !== 0;

  const f1040Values: Values = { ...tp };
  if (s1Needed) {
    f1040Values["line8"] = s1.values["line10"];
    f1040Values["line10"] = s1.values["line26"];
  }
  if (s2Needed) {
    f1040Values["line17"] = s2.values["line3"];
    f1040Values["line23"] = s2.values["line21"];
  }
  let f1040 = prepareFormValues("f1040", year, f1040Values, rounding);

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

  forms.push(f1040);
  if (s1Needed) forms.push(s1);
  if (s2Needed) forms.push(s2);
  if (s3) forms.push(s3);
  if (s8) forms.push(s8);
  if (f8995) forms.push(f8995);
  for (const s of schedC) forms.push(s.prepared);
  for (const s of seForms) forms.push(s.prepared);

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
