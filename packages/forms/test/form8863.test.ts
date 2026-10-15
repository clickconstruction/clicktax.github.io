import { describe, expect, it } from "vitest";
import { form8863 } from "../src/forms/form8863.ts";
import { prepareFormValues } from "../src/engine/return.ts";

describe("Form 8863", () => {
  it("computes the American opportunity credit with the refundable 40%", () => {
    const r = form8863.compute({ filing_status: "single", line3: 50000, credit_limit: 3000, student_name: "S", line23: false, line24: true, line25: false, line26: false, line27: 5000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line27"]).toBe(4000); // capped
    expect(r.values["line28"]).toBe(2000);
    expect(r.values["line29"]).toBe(500);
    expect(r.values["line30"]).toBe(2500);
    expect(r.values["line1"]).toBe(2500);
    expect(r.values["line6_whole"]).toBe("1");
    expect(r.values["line7"]).toBe(2500);
    expect(r.values["line8"]).toBe(1000);
    expect(r.values["line9"]).toBe(1500);
    expect(r.values["line19"]).toBe(1500);
  });
  it("phases out and applies the lifetime learning credit limit", () => {
    const r = form8863.compute({ filing_status: "mfj", line3: 170000, credit_limit: 10000, student_name: "S", line31: 12000 }, { year: 2024, rounding: "whole" });
    expect(r.values["line11"]).toBe(10000);
    expect(r.values["line12"]).toBe(2000);
    expect(r.values["line15"]).toBe(10000);
    expect(r.values["line17_whole"]).toBe("0");
    expect(r.values["line17_decimals"]).toBe("500");
    expect(r.values["line18"]).toBe(1000);
    expect(r.values["line19"]).toBe(1000);
    const limited = form8863.compute({ filing_status: "single", line3: 40000, credit_limit: 400, student_name: "S", line31: 5000 }, { year: 2025, rounding: "whole" });
    expect(limited.values["line19"]).toBe(400);
    const ineligible = form8863.compute({ filing_status: "single", line3: 40000, credit_limit: 4000, student_name: "S", line23: true, line24: true, line25: false, line26: false, line27: 4000 }, { year: 2025, rounding: "whole" });
    expect(ineligible.values["line1"]).toBe(0);
    expect(ineligible.warnings.some((w) => w.includes("does not qualify"))).toBe(true);
  });
  it("maps every line, the split SSNs, and the EIN digit boxes in both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f8863", year, { name: "A", ssn: "111223333", filing_status: "single", line3: 50000, credit_limit: 3000, under_24_no_refundable: false, student_name: "S", student_ssn: "222334444", institution_1_name: "U", institution_1_address: "addr", institution_1_1098t: true, institution_1_1098t_prior_box7: false, institution_1_ein: "371234567", institution_2_name: "V", institution_2_address: "addr2", institution_2_1098t: false, institution_2_1098t_prior_box7: true, institution_2_ein: "123456789", line23: false, line24: true, line25: false, line26: false, line27: 4000, additional_students_line31: 3000 }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      const keys = Object.keys(p.pdfFields);
      expect(keys.filter((k) => /Line22a\[0\]\.f2_\d+\[0\]$/.test(k)).length).toBe(11);
      expect(keys.filter((k) => /Line22b\[0\]\.f2_\d+\[0\]$/.test(k)).length).toBe(11);
      expect(keys.filter((k) => /StudentSSN/.test(k)).length).toBe(3);
      expect(keys.filter((k) => /SocialSecurity/.test(k)).length).toBe(3);
      expect(keys.filter((k) => /Page2\[0\]\.SSN\[0\]/.test(k)).length).toBe(3);
    }
  });
});
