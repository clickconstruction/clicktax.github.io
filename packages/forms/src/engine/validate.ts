import { parseMoney } from "../money.ts";
import type { FieldDef, FormDef, TaxYear, ValidationIssue, Values } from "../types.ts";

const BOOL_RE = /^(true|false|yes|no|y|n|1|0|x)$/i;

function isBoolish(v: unknown): boolean {
  return typeof v === "boolean" || (typeof v === "string" && BOOL_RE.test(v.trim())) || v === 0 || v === 1;
}

function digits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

export function fieldsForYear(form: FormDef, year: TaxYear): FieldDef[] {
  return form.fields.filter((f) => !f.years || f.years.includes(year));
}

/** Validate agent-supplied values against the form schema for a given year. Never throws. */
export function validateValues(form: FormDef, year: TaxYear, values: Values): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byId = new Map(form.fields.map((f) => [f.id, f] as const));
  for (const [key, raw] of Object.entries(values)) {
    const field = byId.get(key);
    if (!field) {
      if (!INTERNAL_KEYS.has(key)) issues.push({ field: key, message: `Unknown field "${key}" for ${form.shortTitle}; it will be ignored. Call get_form_schema to see valid ids.`, severity: "warning" });
      continue;
    }
    if (raw === undefined || raw === null || raw === "") continue;
    if (field.years && !field.years.includes(year)) {
      issues.push({ field: key, message: `"${key}" does not exist on the ${year} ${form.shortTitle}; it will be ignored.`, severity: "warning" });
      continue;
    }
    if (field.computed) {
      issues.push({ field: key, message: `"${key}" (line ${field.line ?? "?"}) is computed by the engine; the supplied value is ignored.`, severity: "warning" });
      continue;
    }
    switch (field.type) {
      case "money":
        if (Array.isArray(raw) || parseMoney(raw) === undefined) issues.push({ field: key, message: `"${key}" must be a number (got ${JSON.stringify(raw)}).`, severity: "error" });
        break;
      case "percent":
        if (Array.isArray(raw) || parseMoney(raw) === undefined) issues.push({ field: key, message: `"${key}" must be a number (a percentage without the % sign).`, severity: "error" });
        break;
      case "integer":
        if (Array.isArray(raw) || parseMoney(raw) === undefined || !Number.isInteger(Number(parseMoney(raw)))) issues.push({ field: key, message: `"${key}" must be a whole number.`, severity: "error" });
        break;
      case "ssn":
        if (digits(raw).length !== 9) issues.push({ field: key, message: `"${key}" must contain 9 digits.`, severity: "error" });
        break;
      case "ein":
        if (digits(raw).length !== 9) issues.push({ field: key, message: `"${key}" must contain 9 digits.`, severity: "error" });
        break;
      case "checkbox":
      case "yesno":
        if (!isBoolish(raw)) issues.push({ field: key, message: `"${key}" must be true/false (or yes/no).`, severity: "error" });
        break;
      case "choice":
        if (!field.choices?.includes(String(raw))) issues.push({ field: key, message: `"${key}" must be one of: ${field.choices?.join(", ")}.`, severity: "error" });
        break;
      case "date_mdy": {
        const s = String(raw).trim();
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s)) issues.push({ field: key, message: `"${key}" must be a date like 03/15/2024 or 2024-03-15.`, severity: "error" });
        break;
      }
      case "list": {
        if (!Array.isArray(raw)) {
          issues.push({ field: key, message: `"${key}" must be an array of rows.`, severity: "error" });
          break;
        }
        if (field.rows && raw.length > field.rows) issues.push({ field: key, message: `"${key}" has ${raw.length} rows but the form has room for ${field.rows}.`, severity: "warning" });
        const itemIds = new Set((field.items ?? []).map((i) => i.id));
        if (key === "dependents") itemIds.add("name");
        raw.forEach((row, i) => {
          if (typeof row !== "object" || row === null) {
            issues.push({ field: `${key}[${i}]`, message: "Each row must be an object.", severity: "error" });
            return;
          }
          for (const k of Object.keys(row)) if (!itemIds.has(k)) issues.push({ field: `${key}[${i}].${k}`, message: `Unknown row item "${k}"; valid items: ${[...itemIds].join(", ")}.`, severity: "warning" });
        });
        break;
      }
      case "text":
        if (field.maxLen && String(raw).length > field.maxLen) issues.push({ field: key, message: `"${key}" is longer than ${field.maxLen} characters and will be truncated.`, severity: "warning" });
        break;
    }
  }
  return issues;
}

/** Keys the engine accepts that are not PDF fields. */
export const INTERNAL_KEYS = new Set(["owner", "earned_income", "filing_status", "other_nonrefundable_credits", "schedule3_line11", "you_65_or_older", "spouse_65_or_older", "age_55_or_older", "first_business_use_month", "first_business_use_year", "business"]);
