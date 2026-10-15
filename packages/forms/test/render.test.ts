/**
 * End-to-end smoke test: for every form and year, prepare representative values, then fill the
 * real IRS PDF with pdf-lib exactly as the browser renderer does. Catches field-map drift,
 * type mismatches (text vs checkbox), and values that the PDF rejects.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { prepareFormValues } from "../src/engine/return.ts";
import { FORM_IDS, FORMS } from "../src/forms/index.ts";
import { SUPPORTED_YEARS, type FormId, type TaxYear, type Values } from "../src/types.ts";

const PDF_DIR = join(import.meta.dirname, "..", "..", "..", "apps", "web", "public", "forms");

/** Values that exercise every field type on each form. */
function sample(formId: FormId, year: TaxYear): Values {
  const form = FORMS[formId];
  const v: Values = {};
  for (const field of form.fields) {
    if (field.years && !field.years.includes(year)) continue;
    if (field.computed) continue;
    switch (field.type) {
      case "money": v[field.id] = 1234; break;
      case "integer": v[field.id] = 3; break;
      case "text": v[field.id] = field.maxLen ? "A".repeat(Math.min(field.maxLen, 4)) : `Sample ${field.id}`; break;
      case "ssn": v[field.id] = "123456789"; break;
      case "ein": v[field.id] = "123456789"; break;
      case "checkbox": v[field.id] = true; break;
      case "yesno": v[field.id] = false; break;
      case "choice": v[field.id] = field.choices![0]; break;
      case "date_mdy": v[field.id] = "03/15/2024"; break;
      case "list": {
        const rows = field.rows ?? 1;
        v[field.id] = Array.from({ length: rows }, (_, i) => {
          const row: Record<string, string | number | boolean> = {};
          for (const item of field.items ?? []) {
            if (item.years && !item.years.includes(year)) continue;
            row[item.id] = item.type === "money" ? 100 * (i + 1) : item.type === "checkbox" ? true : item.type === "ssn" ? "111223333" : `Row ${i + 1} ${item.id}`;
          }
          return row;
        });
        break;
      }
    }
  }
  if (formId === "f1040") v["filing_status"] = "mfj";
  if (formId === "f1040") v["schedule_d_gain"] = 0;
  return v;
}

describe.each(SUPPORTED_YEARS)("render %d", (year) => {
  for (const formId of FORM_IDS) {
    const form = FORMS[formId];
    if (!form.years.includes(year)) continue;
    it(`${formId}: every mapped widget accepts its value`, async () => {
      const prepared = prepareFormValues(formId, year, sample(formId, year), "whole");
      expect(prepared.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(Object.keys(prepared.pdfFields).length).toBeGreaterThan(5);
      const pdf = await PDFDocument.load(readFileSync(join(PDF_DIR, String(year), `${formId}.pdf`)), { ignoreEncryption: true });
      const acro = pdf.getForm();
      const errors: string[] = [];
      let text = 0;
      let checks = 0;
      for (const [name, value] of Object.entries(prepared.pdfFields)) {
        try {
          const field = acro.getField(name);
          if (field instanceof PDFTextField) {
            if (typeof value !== "string") errors.push(`${name}: text field got ${typeof value}`);
            else {
              const max = field.getMaxLength();
              if (max !== undefined && value.length > max) errors.push(`${name}: "${value}" longer than maxLen ${max}`);
              field.setText(value);
              text++;
            }
          } else if (field instanceof PDFCheckBox) {
            if (value !== true) errors.push(`${name}: checkbox got ${JSON.stringify(value)}`);
            else {
              field.check();
              checks++;
            }
          } else errors.push(`${name}: unsupported widget`);
        } catch (e) {
          errors.push(`${name}: ${(e as Error).message}`);
        }
      }
      expect(errors).toEqual([]);
      acro.updateFieldAppearances();
      const bytes = await pdf.save();
      expect(bytes.length).toBeGreaterThan(10000);
      expect(text + checks).toBe(Object.keys(prepared.pdfFields).length);
    });
  }
});
