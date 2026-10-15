#!/usr/bin/env node
// Downloads the official IRS PDFs for a tax year into apps/web/public/forms/<year>/.
// Usage: node tools/fetch-forms.mjs 2025            (current year: irs.gov/pub/irs-pdf/<form>.pdf)
//        node tools/fetch-forms.mjs 2024 --prior    (prior year:   irs.gov/pub/irs-prior/<form>--<year>.pdf)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [year, flag] = process.argv.slice(2);
if (!year) { console.error("usage: fetch-forms.mjs <year> [--prior]"); process.exit(1); }
import { FORMS, FORM_IDS } from "../packages/forms/src/forms/index.ts";
const dir = join(import.meta.dirname, "..", "apps", "web", "public", "forms", year);
mkdirSync(dir, { recursive: true });
const FORMS_FOR_YEAR = FORM_IDS.filter((id) => FORMS[id].years.includes(Number(year))).map((id) => FORMS[id].pdf ?? id);
for (const f of FORMS_FOR_YEAR) {
  const url = flag === "--prior" ? `https://www.irs.gov/pub/irs-prior/${f}--${year}.pdf` : `https://www.irs.gov/pub/irs-pdf/${f}.pdf`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`${f}: HTTP ${res.status} from ${url}`); process.exit(1); }
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(join(dir, `${f}.pdf`), bytes);
  console.log(`${f}: ${bytes.length} bytes -> ${join("apps/web/public/forms", year, f + ".pdf")}`);
}
