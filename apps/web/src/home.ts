import { FORMS, FORM_IDS, SUPPORTED_YEARS, prepareForm, prepareReturn, sampleReturn, sampleValues, type FormId, type TaxYear } from "@clicktax/forms";

const el = document.getElementById("forms");
let year: TaxYear = SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1]!;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function render() {
  if (!el) return;
  const years = SUPPORTED_YEARS.map((y) => `<button class="btn small ${y === year ? "" : "secondary"}" data-year="${y}" aria-pressed="${y === year}">${y}</button>`).join(" ");
  const items = FORM_IDS.filter((id) => FORMS[id].years.includes(year))
    .map((id) => {
      const f = FORMS[id];
      return `<li><strong>${esc(f.shortTitle)}</strong> — ${esc(f.description)} <button class="btn small" data-test="${id}">Test</button></li>`;
    })
    .join("");
  el.innerHTML = `
    <p class="row"><span class="muted">Tax year:</span> ${years}</p>
    <ul>${items}</ul>
    <p class="row"><button class="btn" data-test-return="1">Test a full return</button> <span class="muted">Married couple, one plumbing business, two children: Form 1040 with every schedule.</span></p>
    <p class="muted">Test fills the form with invented sample figures, in your browser, and shows the result with every computed line explained. It is also how we check that each form still lines up with the IRS PDF.</p>
    <p id="test-status" class="muted" aria-live="polite"></p>`;
  el.querySelectorAll<HTMLButtonElement>("[data-year]").forEach((b) => b.addEventListener("click", () => { year = Number(b.dataset["year"]) as TaxYear; render(); }));
  el.querySelectorAll<HTMLButtonElement>("[data-test]").forEach((b) => b.addEventListener("click", () => void test(b.dataset["test"] as FormId, b)));
  el.querySelector<HTMLButtonElement>("[data-test-return]")?.addEventListener("click", (e) => void testReturn(e.currentTarget as HTMLButtonElement));
}

function busy(b: HTMLButtonElement, on: boolean) {
  b.disabled = on;
  const s = document.getElementById("test-status");
  if (s) s.textContent = on ? "Computing…" : "";
}

async function test(id: FormId, b: HTMLButtonElement) {
  busy(b, true);
  try {
    const p = await prepareForm(id, year, sampleValues(id, year), { renderBase: location.origin, title: `Sample ${FORMS[id].shortTitle} (${year})`, sample: true });
    location.href = p.link;
  } catch (e) {
    const s = document.getElementById("test-status");
    if (s) s.textContent = `Could not build the test: ${(e as Error).message}`;
  } finally {
    busy(b, false);
  }
}

async function testReturn(b: HTMLButtonElement) {
  busy(b, true);
  try {
    const r = await prepareReturn(sampleReturn(year), { renderBase: location.origin, title: `Sample ${year} return for Jane & John Sample`, sample: true });
    location.href = r.link;
  } catch (e) {
    const s = document.getElementById("test-status");
    if (s) s.textContent = `Could not build the test: ${(e as Error).message}`;
  } finally {
    busy(b, false);
  }
}

render();
