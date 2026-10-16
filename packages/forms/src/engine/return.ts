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

  // Schedule E: rental, royalty, and pass-through income to Schedule 1 line 5.
  let sE: PreparedForm | undefined;
  if (input.scheduleE) sE = prepareFormValues("f1040se", year, { name: jointName, ssn: tp["ssn"], ...input.scheduleE }, rounding);

  const s1Values: Values = { name: jointName, ssn: tp["ssn"], ...(input.schedule1 ?? {}) };
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
  if (seForms.length) s1Values["line15"] = seDeduction;
  let s1 = prepareFormValues("f1040s1", year, s1Values, rounding);
  const s1Needed = n(s1.values["line10"]) !== 0 || n(s1.values["line26"]) !== 0 || schedC.length > 0 || Boolean(sE) || Object.keys(input.schedule1 ?? {}).length > 0;

  const s2Values: Values = { name: jointName, ssn: tp["ssn"], ...(input.schedule2 ?? {}) };
  if (seForms.length) s2Values["line4"] = seTax;
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

  const f1040Values: Values = { ...tp };
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

  // Form 8949 / Schedule D: capital gains and losses to Form 1040 line 7 (before AGI).
  const f8949s: PreparedForm[] = [];
  let sD: PreparedForm | undefined;
  if (input.form8949?.length || input.scheduleD) {
    const dValues: Values = { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], ...(input.scheduleD ?? {}) };
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

  // Form 2441 Part III: taxable dependent care benefits raise Form 1040 line 1e before AGI is figured.
  if (input.form2441 && (input.form2441["line12"] !== undefined || input.form2441["line13"] !== undefined)) {
    const pre = prepareFormValues("f2441", year, { filing_status: tp["filing_status"], line4: Math.max(0, n(tp["line1a"]) + totalSchC - seDeduction), ...input.form2441 }, rounding);
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
    const pre = prepareFormValues("f1040", year, { ...f1040Values, line8: s1NoLoss.values["line10"], line10: s1NoLoss.values["line26"] }, rounding);
    const magi = n(pre.values["line11"]) + n(s1NoLoss.values["line20"]) + n(s1NoLoss.values["line21"]) + n(pre.values["line6b"]);
    f8582 = prepareFormValues("f8582", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line6: magi, ...extra, rental_activities: rentalRows, other_activities: otherRows }, rounding);
    const allowed = (f8582.values["allowed_losses"] as ListRow[] | undefined) ?? [];
    const eProps = ((input.scheduleE!["properties"] as ListRow[] | undefined) ?? []).map((r, i) => ({ ...r }));
    for (const { r, i } of lossProps) {
      const a = allowed.find((x) => String(x["name"]) === String(r["address"] ?? `Property ${i + 1}`));
      if (a && eProps[i]) eProps[i]!["line22"] = n(a["allowed"]);
    }
    sE = prepareFormValues("f1040se", year, { name: jointName, ssn: tp["ssn"], ...input.scheduleE, properties: eProps }, rounding);
    s1Values["line5"] = sE.values["line41"];
    s1 = prepareFormValues("f1040s1", year, s1Values, rounding);
    f1040Values["line8"] = s1.values["line10"];
    f1040Values["line10"] = s1.values["line26"];
  }

  let f1040 = prepareFormValues("f1040", year, f1040Values, rounding);

  // Schedule A: itemize when it beats the standard deduction, when elected, or when required.
  let sA: PreparedForm | undefined;
  if (input.scheduleA) {
    const a = prepareFormValues("f1040sa", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], line2: f1040.values["line11"], ...input.scheduleA }, rounding);
    const itemized = n(a.values["line17"]);
    const std = n(f1040.values["line12"]);
    const elected = a.values["line18"] === true;
    const required = String(tp["filing_status"]) === "mfs" && tp["spouse_itemizes"] === true;
    if (itemized > std || elected || required) {
      sA = a;
      if (tp["itemized_deductions"] !== undefined) warnings.push("form1040.itemized_deductions was supplied; it is replaced by Schedule A line 17.");
      f1040Values["itemized_deductions"] = itemized;
      f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
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
        f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
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
    const money = (x: unknown) => n(x).toLocaleString("en-US", { maximumFractionDigits: 0 });
    statements.push({
      id: "qbi",
      title: "Qualified Business Income Computation Statement (supports Form 8995)",
      header: [`${jointName}${tp["ssn"] ? `, SSN ${String(tp["ssn"]).replace(/\d(?=\d{4})/g, "x")}` : ""}`, `Tax year ${year}`],
      columns: ["Business", "Net profit (Sch C line 31)", "Less SE tax deduction, SE health insurance, and retirement (allocated)", "Qualified business income"],
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
    f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
  }

  // Credit forms, each limited by the tax left after the credits ahead of it on Schedule 3:
  // Form 2441 (line 2), Form 8863 (line 3 and the refundable part on 1040 line 29), Form 8880 (line 4).
  const s3Input: Values = { ...(input.schedule3 ?? {}) };
  let f2441: PreparedForm | undefined;
  let f8863: PreparedForm | undefined;
  let f8880: PreparedForm | undefined;
  if (input.form2441 || input.form8863 || input.form8880) {
    const agi = n(f1040.values["line11"]);
    const taxBeforeCredits = n(f1040.values["line18"]);
    const earned = Math.max(0, n(f1040.values["line1z"]) + totalSchC - seDeduction);
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

  // Schedule 3: other credits and payments (1040 lines 20 and 31).
  let s3: PreparedForm | undefined;
  if (input.schedule3 || f2441 || f8863 || f8880) {
    s3 = prepareFormValues("f1040s3", year, { name: jointName, ssn: tp["ssn"], ...s3Input }, rounding);
    if (tp["line20"] !== undefined) warnings.push("form1040.line20 was supplied; it is replaced by Schedule 3 line 8.");
    if (tp["line31"] !== undefined) warnings.push("form1040.line31 was supplied; it is replaced by Schedule 3 line 15.");
    f1040Values["line20"] = s3.values["line8"];
    f1040Values["line31"] = s3.values["line15"];
    f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
  }

  // Schedule EIC / earned income credit to Form 1040 line 27 (before Schedule 8812, whose line 24 includes it).
  let sEIC: PreparedForm | undefined;
  if (input.scheduleEIC) {
    const earned = Math.max(0, n(f1040.values["line1z"]) + totalSchC - seDeduction);
    const investment = n(f1040.values["line2a"]) + n(f1040.values["line2b"]) + n(f1040.values["line3b"]) + Math.max(0, n(f1040.values["line7"]));
    const eic = prepareFormValues("f1040sei", year, { name: jointName, ssn: tp["ssn"], filing_status: tp["filing_status"], earned_income: earned, agi: f1040.values["line11"], investment_income: investment, ...input.scheduleEIC }, rounding);
    if (tp["line27"] !== undefined) warnings.push("form1040.line27 was supplied; it is replaced by the computed earned income credit.");
    f1040Values["line27"] = eic.values["eic_credit"];
    f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
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
    f1040 = prepareFormValues("f1040", year, f1040Values, rounding);
  }

  // Form 4868 extension voucher from the computed totals.
  let f4868: PreparedForm | undefined;
  if (input.form4868) {
    const addr = [tp["address"], tp["apt"]].filter(Boolean).join(" ");
    f4868 = prepareFormValues("f4868", year, { name: jointName, address: addr, city: tp["city"], state: tp["state"], zip: tp["zip"], ssn: tp["ssn"], spouse_ssn: tp["spouse_ssn"], line4: f1040.values["line24"], line5: f1040.values["line33"], ...input.form4868 }, rounding);
  }

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
  if (s2Needed) forms.push(s2);
  if (sB) forms.push(sB);
  if (sA) forms.push(sA);
  if (sD) forms.push(sD);
  for (const p of f8949s) forms.push(p);
  if (s1a && n(s1a.values["line38"]) > 0) forms.push(s1a);
  if (s3) forms.push(s3);
  if (f2441) forms.push(f2441);
  if (f8863) forms.push(f8863);
  if (f8880) forms.push(f8880);
  if (s8) forms.push(s8);
  if (sEIC) forms.push(sEIC);
  if (f8995) forms.push(f8995);
  for (const p of f8889s) forms.push(p);
  if (f8959 && (n(f8959.values["line18"]) > 0 || n(f8959.values["line24"]) > 0 || input.form8959)) forms.push(f8959);
  if (f8960) forms.push(f8960);
  for (const s of schedC) forms.push(s.prepared);
  for (const p of f8829s) forms.push(p);
  for (const p of f4562s) forms.push(p);
  for (const s of seForms) forms.push(s.prepared);
  if (sE) forms.push(sE);
  if (f8582) forms.push(f8582);
  if (f4868) forms.push(f4868);
  if (f1040es) forms.push(f1040es);

  const link = await linkFor(year, forms, { ...opts, rounding, title: opts.title ?? `${year} Form 1040 return for ${jointName || "taxpayer"}` }, statements);
  return {
    year,
    forms,
    statements,
    warnings,
    totals: {
      schedule_c_net_profit: totalSchC,
      self_employment_tax: seTax,
      adjusted_gross_income: n(f1040.values["line11"]),
      taxable_income: n(f1040.values["line15"]),
      qbi_deduction: f8995 ? n(f8995.values["line15"]) : 0,
      hsa_deduction: sum8889("line13"),
      additional_medicare_tax: f8959 ? n(f8959.values["line18"]) : 0,
      net_investment_income_tax: f8960 ? n(f8960.values["line17"]) : 0,
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
