#!/usr/bin/env node
// Enumerates every AcroForm widget (name, type, page, rectangle, maxLen) of each IRS PDF for a year.
// Usage: node tools/dump-fields.mjs 2025   -> packages/forms/pdf/2025/<form>.fields.json
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFName } from "pdf-lib";
const year = process.argv[2];
if (!year) { console.error("usage: dump-fields.mjs <year>"); process.exit(1); }
const ROOT = join(import.meta.dirname, "..");
await mkdir(join(ROOT, "packages", "forms", "pdf", year), { recursive: true });
for (const form of ["f1040", "f1040s1", "f1040s2", "f1040sc", "f1040sse"]) {
  const f = join(ROOT, "apps", "web", "public", "forms", year, form + ".pdf");
  const outPath = join(ROOT, "packages", "forms", "pdf", year, form + ".fields.json");
  const pdf = await PDFDocument.load(await readFile(f), { ignoreEncryption: true });
  const pages = pdf.getPages();
  const rows = [];
  for (const fld of pdf.getForm().getFields()) {
    const widgets = fld.acroField.getWidgets();
    widgets.forEach((w, wi) => {
      const r = w.getRectangle(); const pageIdx = pages.findIndex(p => p.ref === w.P());
      const tu = fld.acroField.dict.lookup(PDFName.of("TU"));
      rows.push({ name: fld.getName(), widget: wi, type: fld instanceof PDFTextField ? "text" : fld instanceof PDFCheckBox ? "check" : "other", page: pageIdx + 1, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), maxLen: fld instanceof PDFTextField ? fld.getMaxLength() ?? null : null, tip: tu && tu.decodeText ? tu.decodeText() : null, exportValues: fld instanceof PDFCheckBox ? fld.acroField.getOnValue ? String(fld.acroField.getOnValue()) : null : null });
    });
  }
  await writeFile(outPath, JSON.stringify({ pdf: `apps/web/public/forms/${year}/${form}.pdf`, pages: pages.map(p => ({ w: p.getWidth(), h: p.getHeight() })), count: rows.length, fields: rows }, null, 1));
  console.log(form, year, "fields:", rows.length, "pages:", pages.length);
}
