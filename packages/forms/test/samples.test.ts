import { describe, expect, it } from "vitest";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { FORM_IDS, FORMS } from "../src/forms/index.ts";
import { sampleReturn, sampleValues } from "../src/samples.ts";
import { SUPPORTED_YEARS } from "../src/types.ts";

describe("sample data (the website's Test buttons)", () => {
  for (const year of SUPPORTED_YEARS) {
    for (const formId of FORM_IDS) {
      if (!FORMS[formId].years.includes(year)) continue;
      it(`${year} ${formId} prepares cleanly`, () => {
        const p = prepareFormValues(formId, year, sampleValues(formId, year), "whole");
        expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
        expect(p.issues.filter((i) => i.message.includes("Unknown field"))).toEqual([]);
        expect(p.warnings.filter((w) => w.includes("No PDF field mapped") || w.includes("truncated"))).toEqual([]);
        expect(Object.keys(p.pdfFields).length).toBeGreaterThan(3);
      });
    }
    it(`${year} sample return assembles every schedule`, async () => {
      const r = await prepareReturn(sampleReturn(year), { renderBase: "https://clicktax.org", sample: true });
      expect(r.forms.map((f) => f.form)).toEqual(["f1040", "f1040s1", "f1040s2", "f1040s8", "f8995", "f1040sc", "f1040sse"]);
      for (const f of r.forms) expect(f.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(r.totals.schedule_c_net_profit).toBeGreaterThan(0);
      expect(r.totals.child_tax_credit).toBeGreaterThan(0);
      expect(r.link).toContain("/fill#v1.");
    });
  }
});
