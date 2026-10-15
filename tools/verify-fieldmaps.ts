/** Checks every generated field map against the real PDF field dump (catches IRS layout changes). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIELD_MAPS } from "../packages/forms/src/fieldmaps/index.ts";
import { FORMS } from "../packages/forms/src/forms/index.ts";
import type { FormId, TaxYear } from "../packages/forms/src/types.ts";

const ROOT = join(import.meta.dirname, "..", "packages", "forms");
let bad = 0;
for (const [yearStr, byForm] of Object.entries(FIELD_MAPS)) {
  const year = Number(yearStr) as TaxYear;
  for (const [formId, map] of Object.entries(byForm) as Array<[FormId, Record<string, string>]>) {
    const dump = JSON.parse(readFileSync(join(ROOT, "pdf", String(year), `${formId}.fields.json`), "utf8")) as { fields: Array<{ name: string; type: string }> };
    const byName = new Map(dump.fields.map((f) => [f.name, f.type === "check" ? "checkbox" : f.type] as const));
    const form = FORMS[formId];
    let okCount = 0;
    for (const [key, pdfName] of Object.entries(map)) {
      const t = byName.get(pdfName);
      if (!t) { console.log(`${year} ${formId}: ${key} -> ${pdfName} NOT IN PDF`); bad++; continue; }
      const base = key.replace(/\[\d+\]\..*$/, "").replace(/\.(yes|no|month|day|year|[a-z_]+)$/, (m) => (form.fields.some((f) => f.id === key) ? m : ""));
      const field = form.fields.find((f) => f.id === key || f.id === base || key.startsWith(f.id + ".") || key.startsWith(f.id + "["));
      const wantsCheck = field && (field.type === "checkbox" || field.type === "yesno" || field.type === "choice" || (field.type === "list" && /\.(child_tax_credit|other_dependents_credit|lived_with_you|lived_in_us|full_time_student|permanently_disabled)$/.test(key)));
      if (wantsCheck && t !== "checkbox") { console.log(`${year} ${formId}: ${key} -> ${pdfName} is ${t}, expected checkbox`); bad++; continue; }
      if (!wantsCheck && t === "checkbox") { console.log(`${year} ${formId}: ${key} -> ${pdfName} is a checkbox, expected text`); bad++; continue; }
      okCount++;
    }
    const unmapped = dump.fields.filter((f) => !Object.values(map).includes(f.name)).length;
    console.log(`${year} ${formId}: ${okCount} mapped OK, ${unmapped} PDF widgets intentionally unmapped`);
  }
}
console.log(bad ? `\n${bad} problem(s)` : "\nAll field maps verified against the PDFs.");
process.exit(bad ? 1 : 0);
