import { fmtMoney, parseMoney, roundTo } from "../money.ts";
import type { FieldDef, FieldMap, FormDef, ListRow, Rounding, Scalar, TaxYear, Values } from "../types.ts";
import { fieldsForYear } from "./validate.ts";

export interface SummaryLine {
  line?: string;
  label: string;
  value: string;
}

export interface FillOutput {
  /** Full PDF field name → text value or checkbox state. */
  fields: Record<string, string | boolean>;
  summary: SummaryLine[];
  warnings: string[];
}

function truthy(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return /^(true|yes|y|1|x)$/i.test(v.trim());
  return false;
}

function digits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

function fmtSsn(v: unknown, maxLen: number | undefined): string {
  const d = digits(v);
  if (d.length !== 9) return String(v ?? "");
  return maxLen !== undefined && maxLen >= 11 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : d;
}

function fmtEin(v: unknown, maxLen: number | undefined): string {
  const d = digits(v);
  if (d.length !== 9) return String(v ?? "");
  return maxLen !== undefined && maxLen >= 10 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
}

function parseDate(v: unknown): { month: string; day: string; year: string } | undefined {
  const s = String(v ?? "").trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return { month: m[1]!.padStart(2, "0"), day: m[2]!.padStart(2, "0"), year: m[3]! };
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return { month: m[2]!, day: m[3]!, year: m[1]! };
  return undefined;
}

function scalarText(field: FieldDef, raw: Scalar, rounding: Rounding, warnings: string[]): string | undefined {
  switch (field.type) {
    case "money": {
      const n = parseMoney(raw);
      if (n === undefined) return undefined;
      const r = roundTo(n, rounding);
      if (r === 0 && !(field.computed && field.alwaysShow)) return undefined;
      return fmtMoney(r, rounding);
    }
    case "integer": {
      const n = parseMoney(raw);
      if (n === undefined || n === 0) return undefined;
      return String(Math.round(n));
    }
    case "percent": {
      const n = parseMoney(raw);
      if (n === undefined || (n === 0 && !(field.computed && field.alwaysShow))) return undefined;
      return (Math.round(n * 100) / 100).toString();
    }
    case "ssn":
      return fmtSsn(raw, field.maxLen);
    case "ein":
      return fmtEin(raw, field.maxLen);
    case "text": {
      let s = String(raw).trim();
      if (s === "") return undefined;
      if (field.maxLen && s.length > field.maxLen) {
        warnings.push(`"${field.id}" truncated to ${field.maxLen} characters.`);
        s = s.slice(0, field.maxLen);
      }
      return s;
    }
    default:
      return undefined;
  }
}

/** Convert semantic values into PDF field values for one form and year. */
export function toPdfFields(form: FormDef, year: TaxYear, values: Values, map: FieldMap, rounding: Rounding): FillOutput {
  const fields: Record<string, string | boolean> = {};
  const summary: SummaryLine[] = [];
  const warnings: string[] = [];
  const put = (key: string | undefined, value: string | boolean, fieldId: string, mapKey?: string) => {
    if (!key) {
      warnings.push(`No PDF field mapped for "${fieldId}" on the ${year} ${form.shortTitle}; value not placed.`);
      return;
    }
    fields[key] = value;
    // Copies of the same box (e.g. every 1099-NEC copy, every 1040-ES voucher) are mapped as key@2, key@3...
    if (mapKey) for (let i = 2; map[`${mapKey}@${i}`]; i++) fields[map[`${mapKey}@${i}`]!] = value;
  };
  for (const field of fieldsForYear(form, year)) {
    const raw = values[field.id];
    if (raw === undefined || raw === null || raw === "") continue;
    const mapKey = field.id;
    const absentThisYear = field.locate && !Array.isArray(field.locate) && typeof field.locate === "object" && "names" in (field.locate as object) && !((field.locate as { names?: Record<number, unknown> }).names?.[year]);
    if (absentThisYear && field.type !== "list") continue;
    switch (field.type) {
      case "money":
      case "integer":
      case "percent":
      case "ssn":
      case "ein":
      case "text": {
        if (Array.isArray(raw)) break;
        const text = scalarText(field, raw, rounding, warnings);
        if (text === undefined) break;
        if ((field.type === "ssn" || field.type === "ein") && map[`${mapKey}.p1`]) {
          // Split across comb boxes (W-9 style): SSN 3-2-4, EIN 2-7.
          const d = digits(raw);
          const parts = field.type === "ssn" ? [d.slice(0, 3), d.slice(3, 5), d.slice(5, 9)] : [d.slice(0, 2), d.slice(2, 9)];
          parts.forEach((part, i) => put(map[`${mapKey}.p${i + 1}`], part, field.id, `${mapKey}.p${i + 1}`));
        } else if (field.locate) put(map[mapKey], text, field.id, mapKey);
        summary.push({ ...(field.line ? { line: field.line } : {}), label: field.label, value: field.type === "ssn" || field.type === "ein" ? maskId(text) : text });
        break;
      }
      case "checkbox":
        if (truthy(raw)) {
          if (field.locate) put(map[mapKey], true, field.id, mapKey);
          summary.push({ ...(field.line ? { line: field.line } : {}), label: field.label, value: "X" });
        }
        break;
      case "yesno": {
        const yes = truthy(raw);
        if (field.locate) put(map[`${mapKey}.${yes ? "yes" : "no"}`], true, field.id, `${mapKey}.${yes ? "yes" : "no"}`);
        summary.push({ ...(field.line ? { line: field.line } : {}), label: field.label, value: yes ? "Yes" : "No" });
        break;
      }
      case "choice": {
        const v = String(raw);
        if (!field.choices?.includes(v)) break;
        if (field.locate) put(map[`${mapKey}.${v}`], true, field.id, `${mapKey}.${v}`);
        summary.push({ ...(field.line ? { line: field.line } : {}), label: field.label, value: v });
        break;
      }
      case "date_mdy": {
        const d = parseDate(raw);
        if (!d) break;
        put(map[`${mapKey}.month`], d.month, field.id, `${mapKey}.month`);
        put(map[`${mapKey}.day`], d.day, field.id, `${mapKey}.day`);
        put(map[`${mapKey}.year`], d.year, field.id, `${mapKey}.year`);
        summary.push({ ...(field.line ? { line: field.line } : {}), label: field.label, value: `${d.month}/${d.day}/${d.year}` });
        break;
      }
      case "list": {
        if (!Array.isArray(raw)) break;
        const rows = raw as ListRow[];
        const max = field.rows ?? rows.length;
        rows.slice(0, max).forEach((row, i) => {
          const r = normalizeRow(row, map, field.id, i);
          for (const item of field.items ?? []) {
            if (item.years && !item.years.includes(year)) continue;
            const v = r[item.id];
            if (v === undefined || v === null || v === "") continue;
            const listKey = `${field.id}[${i}].${item.id}`;
            if (item.type === "yesno") {
              const yes = truthy(v);
              const yk = map[`${listKey}.${yes ? "yes" : "no"}`];
              if (yk) put(yk, true, field.id, `${listKey}.${yes ? "yes" : "no"}`);
              continue;
            }
            const key = map[listKey];
            if (!key) continue; // item not on this year's form (e.g. split names)
            let out: string | boolean | undefined;
            if (item.type === "percent") {
              const n = parseMoney(v as Scalar);
              if (n !== undefined && n !== 0) out = (Math.round(n * 100) / 100).toString();
            } else if (item.type === "integer") {
              const n = parseMoney(v as Scalar);
              if (n !== undefined && n !== 0) out = String(Math.round(n));
            } else if (item.type === "checkbox") {
              if (truthy(v)) out = true;
            } else if (item.type === "money") {
              const n = parseMoney(v as Scalar);
              if (n !== undefined && n !== 0) out = fmtMoney(roundTo(n, rounding), rounding);
            } else if (item.type === "ssn") {
              out = fmtSsn(v, item.maxLen);
            } else {
              out = String(v);
            }
            if (out !== undefined) put(key, out, field.id, listKey);
          }
          // 2024-style single name box
          const nameKey = map[`${field.id}[${i}].name`];
          if (nameKey && r["name"]) fields[nameKey] = String(r["name"]);
          const desc = Object.entries(r)
            .filter(([k, v]) => v !== undefined && v !== "" && v !== false && !/ssn/.test(k))
            .map(([k, v]) => (v === true ? k : `${k}: ${String(v)}`))
            .join(", ");
          summary.push({ label: `${field.label} ${i + 1}`, value: desc });
        });
        break;
      }
    }
  }
  return { fields, summary, warnings };
}

/** Joins or splits dependent names so both the 2024 (one box) and 2025 (two boxes) layouts fill. */
function normalizeRow(row: ListRow, map: FieldMap, listId: string, i: number): ListRow {
  const r: ListRow = { ...row };
  const first = r["first_name"];
  const last = r["last_name"];
  const name = r["name"];
  if (map[`${listId}[${i}].name`] && !name && (first || last)) r["name"] = [first, last].filter(Boolean).join(" ");
  if (map[`${listId}[${i}].first_name`] && !first && !last && typeof name === "string") {
    const parts = name.trim().split(/\s+/);
    r["last_name"] = parts.length > 1 ? parts.pop()! : "";
    r["first_name"] = parts.join(" ");
  }
  return r;
}

export function maskId(s: string): string {
  const d = s.replace(/\D/g, "");
  return d.length >= 4 ? `***-**-${d.slice(-4)}` : "***";
}
