#!/usr/bin/env node
// Pairs each PDF widget with the printed text on its row (needs `pdftotext` from poppler on PATH).
// Usage: node tools/draft-labels.mjs 2025 -> packages/forms/pdf/2025/<form>.draft.json
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FORMS, FORM_IDS } from "../packages/forms/src/forms/index.ts";
const year = process.argv[2];
if (!year) { console.error("usage: draft-labels.mjs <year>"); process.exit(1); }
const ROOT = join(import.meta.dirname, "..");
const tmp = mkdtempSync(join(tmpdir(), "clicktax-"));
for (const form of FORM_IDS.filter((id) => FORMS[id].years.includes(Number(year)))) {
  const pdf = join(ROOT, "apps", "web", "public", "forms", year, form + ".pdf");
  const html = join(tmp, `${form}.html`);
  execFileSync("pdftotext", ["-bbox-layout", pdf, html]);
  const fields = JSON.parse(readFileSync(join(ROOT, "packages", "forms", "pdf", year, form + ".fields.json"), "utf8"));
  const text = readFileSync(html, "utf8");
  const pages = [];
  const pageRe = /<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pm;
  while ((pm = pageRe.exec(text))) {
    const H = parseFloat(pm[2]);
    const words = [];
    const wordRe = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
    let wm;
    while ((wm = wordRe.exec(pm[3]))) {
      const [xMin, yMin, xMax, yMax] = [wm[1], wm[2], wm[3], wm[4]].map(parseFloat);
      words.push({ text: wm[5].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"), x0: xMin, x1: xMax, y0: H - yMax, y1: H - yMin });
    }
    pages.push({ H, words });
  }
  const out = [];
  for (const f of fields.fields) {
    const pg = pages[f.page - 1];
    if (!pg) continue;
    const cy = f.y + f.h / 2;
    const row = pg.words.filter((w) => w.y0 < cy + 4 && w.y1 > cy - 4).sort((a, b) => a.x0 - b.x0);
    const left = row.filter((w) => w.x1 <= f.x + 2);
    const above = pg.words.filter((w) => w.y0 >= f.y + f.h - 1 && w.y0 < f.y + f.h + 14 && w.x1 > f.x - 2 && w.x0 < f.x + f.w + 2).sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(" ");
    out.push({ pdfField: f.name, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, maxLen: f.maxLen, leftTok: left.length ? left[left.length - 1].text : "", rowText: left.map((w) => w.text).join(" ").slice(-110), above: above.slice(0, 90) });
  }
  writeFileSync(join(ROOT, "packages", "forms", "pdf", year, form + ".draft.json"), JSON.stringify(out, null, 1));
  console.log(form, year, "draft rows:", out.length);
}
