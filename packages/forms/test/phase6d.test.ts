import { describe, expect, it } from "vitest";
import { form1040X } from "../src/forms/form1040X.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { sampleValues } from "../src/samples.ts";

describe("Form 1040-X", () => {
  it("computes the net change column and the balance due", () => {
    const r = form1040X.compute({ line1_a: 85000, line1_c: 91500, line2_a: 15750, line2_c: 15750, line6_a: 10600, line6_c: 12030, line12_a: 9800, line12_c: 9800, line16: 800, line18: 0 }, { year: 2025, rounding: "whole" });
    expect(r.values["line1_b"]).toBe(6500);
    expect(r.values["line3_c"]).toBe(75750);
    expect(r.values["line5_c"]).toBe(75750);
    expect(r.values["line8_c"]).toBe(12030);
    expect(r.values["line11_c"]).toBe(12030);
    expect(r.values["line11_b"]).toBe(1430);
    expect(r.values["line17"]).toBe(10600);
    expect(r.values["line19"]).toBe(10600);
    expect(r.values["line20"]).toBe(1430);
    expect(r.values["line21"]).toBe(0);
    const refund = form1040X.compute({ line1_a: 50000, line1_c: 45000, line2_a: 14600, line2_c: 14600, line6_a: 4000, line6_c: 3400, line12_a: 5000, line12_c: 5000, line18: 1000, line23: 100 }, { year: 2024, rounding: "whole" });
    expect(refund.values["line21"]).toBe(600);
    expect(refund.values["line22"]).toBe(500);
  });
  it("maps both revisions including the dependents table", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f1040x", year, { tax_year: String(year), first_name: "A", last_name: "B", ssn: "111111111", address: "1 St", city: "X", state: "IL", zip: "60000", presidential_campaign_you: true, filing_status: "hoh", qualifying_person_name: "Kid", line1_nol_carryback: true, line1_a: 1, line1_c: 2, line2_a: 1, line2_c: 1, line4a_a: 0, line4a_c: 1, line4b_a: 0, line4b_c: 1, line6_a: 1, line6_c: 2, line6_method: "Tax Table", line7_a: 1, line7_c: 1, line7_gbc_carryback: true, line10_a: 1, line10_c: 1, line12_a: 1, line12_c: 1, line13_a: 1, line13_c: 1, line14_a: 1, line14_c: 1, line15_a: 1, line15_c: 1, line15_forms: "form_8962", line15_other: "x", line16: 1, line18: 1, line23_year: String(year + 1), line23: 0, line25_a: 1, line25_c: 2, line27_a: 0, line27_c: 1, more_than_four_dependents: false, dependents: [1, 2, 3, 4].map((i) => ({ first_name: `K${i}`, last_name: "B", ssn: "222222222", relationship: "son", child_tax_credit: i % 2 === 1, other_dependents_credit: i % 2 === 0, lived_with_you: true, lived_in_us: true, full_time_student: i === 1, permanently_disabled: i === 2 })), explanation: "Test", occupation: "x", identity_protection_pin: "123456", spouse_occupation: "y", phone: "555", email: "a@b.c" }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBeGreaterThanOrEqual(75);
      const depKeys = Object.keys(p.pdfFields).filter((k) => /Table_Dependents/.test(k));
      expect(depKeys.length).toBeGreaterThanOrEqual(year === 2024 ? 16 : 30);
    }
  });
});

describe("Form 1040-SR", () => {
  it("fills the senior layout from the Form 1040 inputs in both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f1040sr", year, { ...sampleValues("f1040", year), you_65_or_older: true, spouse_65_or_older: false, dependents: [{ first_name: "Kid", last_name: "Sample", ssn: "222222222", relationship: "daughter", child_tax_credit: true, lived_with_you: true, lived_in_us: true }], routing_number: "011000015", account_type: "checking", account_number: "12345678", third_party_designee: false }, "whole");
      expect(p.issues.filter((i) => i.severity === "error"), String(year)).toEqual([]);
      const missing = p.warnings.filter((w) => w.includes("No PDF field"));
      expect(missing, String(year)).toEqual([]);
      expect(Object.keys(p.pdfFields).length, String(year)).toBeGreaterThanOrEqual(45);
      expect(p.values["std_boxes_count"]).toBe(1);
      expect(p.values["line15"]).toBe(prepareFormValues("f1040", year, { ...sampleValues("f1040", year), you_65_or_older: true }, "whole").values["line15"]);
      const names = Object.keys(p.pdfFields);
      expect(names.some((k) => /Page4\[0\]\.f4_01/.test(k))).toBe(true);
      expect(names.some((k) => /Dependents/.test(k))).toBe(true);
    }
  });
  it("renders the main return on the SR layout when use_1040sr is set", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 40000, line5a: 20000, line5b: 18000, you_65_or_older: true, use_1040sr: true } }, { renderBase: "https://clicktax.org" });
    expect(r.forms[0]!.form).toBe("f1040sr");
    expect(r.forms.map((x) => x.form)).not.toContain("f1040");
  });
  it("places 2024 Form 1040 dependents' names (regression)", () => {
    const p = prepareFormValues("f1040", 2024, { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "hoh", digital_assets: false, dependents: [{ first_name: "Kid", last_name: "B", ssn: "222222222", relationship: "daughter", child_tax_credit: true }] }, "whole");
    expect(Object.values(p.pdfFields)).toContain("Kid B");
  });
});
