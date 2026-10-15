export * from "./types.ts";
export { PARAMS, params, type YearParams } from "./params.ts";
export { bracketTax, incomeTax, taxTableTax } from "./tax.ts";
export { parseMoney, fmtMoney, roundWhole } from "./money.ts";
export { FORMS, FORM_IDS, getForm } from "./forms/index.ts";
export { FIELD_MAPS, getFieldMap } from "./fieldmaps/index.ts";
export { validateValues, fieldsForYear } from "./engine/validate.ts";
export { toPdfFields, maskId, type FillOutput, type SummaryLine } from "./engine/fill.ts";
export { encodePayload, decodePayload, renderUrl, type RenderPayload, type RenderForm } from "./engine/link.ts";
export { prepareForm, prepareFormValues, prepareReturn, type PreparedForm, type PreparedReturn, type PrepareOptions, type ReturnInput } from "./engine/return.ts";

import { FORMS } from "./forms/index.ts";
import { fieldsForYear } from "./engine/validate.ts";
import type { FormId, TaxYear } from "./types.ts";

/** JSON-friendly schema for one form and year (what an agent needs to fill it). */
export function formSchema(formId: FormId, year: TaxYear) {
  const form = FORMS[formId];
  if (!form) throw new Error(`Unknown form ${formId}`);
  return {
    form: form.id,
    year,
    title: form.title,
    description: form.description,
    fields: fieldsForYear(form, year).map((f) => ({
      id: f.id,
      ...(f.line ? { line: f.line } : {}),
      label: f.label,
      type: f.type,
      ...(f.computed ? { computed: true } : {}),
      ...(f.notes ? { notes: f.notes } : {}),
      ...(f.maxLen ? { maxLen: f.maxLen } : {}),
      ...(f.choices ? { choices: f.choices } : {}),
      ...(f.items ? { rows: f.rows, items: f.items.filter((i) => !i.years || i.years.includes(year)).map((i) => ({ id: i.id, label: i.label, type: i.type })) } : {}),
    })),
  };
}

/** The "form notes": plain-language guidance, separate from the filled form itself. */
export function formNotes(formId: FormId, year: TaxYear) {
  const form = FORMS[formId];
  if (!form) throw new Error(`Unknown form ${formId}`);
  return {
    form: form.id,
    year,
    title: form.title,
    notes: form.notes,
    lineNotes: fieldsForYear(form, year)
      .filter((f) => f.notes)
      .map((f) => ({ id: f.id, ...(f.line ? { line: f.line } : {}), label: f.label, notes: f.notes! })),
    computedLines: fieldsForYear(form, year)
      .filter((f) => f.computed)
      .map((f) => ({ id: f.id, ...(f.line ? { line: f.line } : {}), label: f.label })),
  };
}

export const DISCLAIMER = "This is a free tool that you should use at your own risk.";
