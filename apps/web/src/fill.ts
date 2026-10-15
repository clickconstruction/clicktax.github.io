import { decodePayload, type RenderPayload } from "@clicktax/forms";
import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";

const status = document.getElementById("status")!;
const out = document.getElementById("out")!;

const TITLES: Record<string, string> = {
  f1040: "Form 1040",
  f1040s1: "Schedule 1",
  f1040s2: "Schedule 2",
  f1040sc: "Schedule C",
  f1040sse: "Schedule SE",
  f1040s8: "Schedule 8812",
};
const titleOf = (f: { form: string; title?: string }) => f.title ?? TITLES[f.form] ?? f.form;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

async function fillOne(year: number, form: string, fields: Record<string, string | boolean>): Promise<{ blob: Blob; errors: string[] }> {
  const res = await fetch(`/forms/${year}/${form}.pdf`);
  if (!res.ok) throw new Error(`Could not load the blank ${TITLES[form] ?? form} for ${year}`);
  const pdf = await PDFDocument.load(await res.arrayBuffer(), { ignoreEncryption: true });
  const acro = pdf.getForm();
  const errors: string[] = [];
  for (const [name, value] of Object.entries(fields)) {
    try {
      const f = acro.getField(name);
      if (f instanceof PDFTextField) {
        f.setText(typeof value === "boolean" ? (value ? "X" : "") : value);
      } else if (f instanceof PDFCheckBox) {
        if (value === true || value === "X" || value === "true") f.check();
        else f.uncheck();
      } else {
        errors.push(`${name}: unsupported field type`);
      }
    } catch (e) {
      errors.push(`${name}: ${(e as Error).message}`);
    }
  }
  acro.updateFieldAppearances();
  const bytes = await pdf.save();
  return { blob: new Blob([bytes as BlobPart], { type: "application/pdf" }), errors };
}

async function main() {
  let payload: RenderPayload;
  try {
    if (!location.hash || location.hash.length < 4) {
      status.textContent = "This page renders forms from a ClickTax link. Ask your agent for one, or read about ClickTax on the home page.";
      return;
    }
    payload = await decodePayload(location.hash);
  } catch (e) {
    status.innerHTML = `<span class="err">That link could not be read: ${esc((e as Error).message)}</span>`;
    return;
  }
  if (payload.sample) {
    const b = document.createElement("div");
    b.className = "banner sample";
    b.textContent = "Sample data. These figures are invented for testing; nothing here is yours.";
    status.before(b);
  }
  status.textContent = `Filling ${payload.forms.length} form${payload.forms.length === 1 ? "" : "s"} for tax year ${payload.year} in your browser…`;
  const blobs: Array<{ name: string; url: string }> = [];
  for (const f of payload.forms) {
    const card = document.createElement("section");
    card.className = "card";
    const title = `${titleOf(f)} (${payload.year})`;
    card.innerHTML = `<h3>${esc(title)}</h3><p class="muted">Filling…</p>`;
    out.appendChild(card);
    try {
      const { blob, errors } = await fillOne(payload.year, f.form, f.fields);
      const url = URL.createObjectURL(blob);
      const fileName = `${payload.year}-${f.form}.pdf`;
      blobs.push({ name: fileName, url });
      const summary = (f.summary ?? [])
        .map((s) => `<tr><td class="muted">${esc(s.line ?? "")}</td><td>${esc(s.label)}</td><td class="num">${esc(s.value)}</td></tr>`)
        .join("");
      const comps = (f.notes?.computations ?? [])
        .map((c) => `<tr><td class="muted">${esc(c.line ?? "")}</td><td>${esc(c.label)}<br><span class="muted">${esc(c.formula)}</span></td><td class="num">${esc(typeof c.value === "number" ? c.value.toLocaleString("en-US") : String(c.value))}</td></tr>`)
        .join("");
      const warns = (f.notes?.warnings ?? []).map((w) => `<li>${esc(w)}</li>`).join("");
      const total = Object.keys(f.fields).length;
      const placedLine = errors.length ? `<p class="err">${total - errors.length} of ${total} fields placed. Could not place: ${esc(errors.slice(0, 5).join("; "))}</p>` : `<p class="ok">All ${total} fields placed on the official PDF.</p>`;
      card.innerHTML = `
        <h3>${esc(title)}</h3>
        <div class="row">
          <a class="btn" href="${url}" download="${fileName}">Download ${esc(titleOf(f))}</a>
          <a class="btn secondary" href="${url}" target="_blank" rel="noopener">Open in a new tab</a>
        </div>
        ${placedLine}
        <object class="preview" data="${url}" type="application/pdf"><p>Your browser cannot preview PDFs inline; use the download button.</p></object>
        ${comps ? `<details open><summary>How each line was computed</summary><table><tbody>${comps}</tbody></table></details>` : ""}
        ${warns ? `<details open><summary>Warnings (${(f.notes?.warnings ?? []).length})</summary><ul>${warns}</ul></details>` : ""}
        ${summary ? `<details><summary>Values placed on this form</summary><table><tbody>${summary}</tbody></table></details>` : ""}
      `;
    } catch (e) {
      card.innerHTML = `<h3>${esc(title)}</h3><p class="err">${esc((e as Error).message)}</p>`;
    }
  }
  status.innerHTML = `${payload.title ? `<strong>${esc(payload.title)}</strong>. ` : ""}Done. Review every line against the IRS instructions before you sign.`;
  if (blobs.length > 1) {
    const all = document.createElement("div");
    all.className = "row";
    all.innerHTML = `<button class="btn" id="dl-all">Download all ${blobs.length} PDFs</button>`;
    out.prepend(all);
    document.getElementById("dl-all")!.addEventListener("click", () => {
      for (const b of blobs) {
        const a = document.createElement("a");
        a.href = b.url;
        a.download = b.name;
        a.click();
      }
    });
  }
}

main();
