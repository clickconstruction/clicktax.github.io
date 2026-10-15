import { FORMS, FORM_IDS } from "@clicktax/forms";

const el = document.getElementById("forms");
if (el) {
  const items = FORM_IDS.map((id) => {
    const f = FORMS[id];
    return `<li><strong>${f.shortTitle}</strong> (${f.years.join(", ")}) — ${f.description}</li>`;
  }).join("");
  el.innerHTML = `<ul>${items}</ul>`;
}
