#!/usr/bin/env node
// Renders a ClickTax link exactly as the browser does, but locally with Node + pdf-lib.
// Usage: node tools/render-link.mjs "<link or fragment>" <outdir>   (writes <year>-<form>[-n].pdf)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import { decodePayload } from "../packages/forms/src/engine/link.ts";

const [linkArg, outdir = "render-out"] = process.argv.slice(2);
if (!linkArg) { console.error("usage: render-link.mjs <link> [outdir]"); process.exit(1); }
const hash = linkArg.includes("#") ? linkArg.slice(linkArg.indexOf("#")) : linkArg;
const payload = await decodePayload(hash);
mkdirSync(outdir, { recursive: true });
const ROOT = join(import.meta.dirname, "..");
const seen = {};
for (const f of payload.forms) {
  const pdf = await PDFDocument.load(readFileSync(join(ROOT, "apps", "web", "public", "forms", String(payload.year), `${f.form}.pdf`)), { ignoreEncryption: true });
  const acro = pdf.getForm();
  let placed = 0;
  const errors = [];
  for (const [name, value] of Object.entries(f.fields)) {
    try {
      const field = acro.getField(name);
      if (field instanceof PDFTextField) field.setText(typeof value === "boolean" ? (value ? "X" : "") : value);
      else if (field instanceof PDFCheckBox) value ? field.check() : field.uncheck();
      placed++;
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
    }
  }
  acro.updateFieldAppearances();
  seen[f.form] = (seen[f.form] ?? 0) + 1;
  const file = join(outdir, `${payload.year}-${f.form}${seen[f.form] > 1 ? "-" + seen[f.form] : ""}.pdf`);
  writeFileSync(file, await pdf.save());
  console.log(`${file}: ${placed} fields placed${errors.length ? `, ${errors.length} errors: ${errors.slice(0, 3).join("; ")}` : ""}`);
}
