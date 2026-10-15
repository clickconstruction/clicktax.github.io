import { describe, expect, it } from "vitest";
import { form1040 } from "../src/forms/form1040.ts";
import { prepareFormValues } from "../src/engine/return.ts";

describe("Form 1040 compute", () => {
  it("computes AGI, standard deduction, taxable income, tax, and refund (2024 single)", () => {
    const r = form1040.compute({ filing_status: "single", line1a: 60000, line2b: 500, line25a: 7000, digital_assets: false }, { year: 2024, rounding: "whole" });
    expect(r.values["line1z"]).toBe(60000);
    expect(r.values["line9"]).toBe(60500);
    expect(r.values["line11"]).toBe(60500);
    expect(r.values["line12"]).toBe(14600);
    expect(r.values["line15"]).toBe(45900);
    // 2024 single tax table row 45,900-45,950: 1,160 + 0.12 x (45,925 - 11,600) = 5,279
    expect(r.values["line16"]).toBe(5279);
    expect(r.values["line24"]).toBe(5279);
    expect(r.values["line33"]).toBe(7000);
    expect(r.values["line34"]).toBe(1721);
    expect(r.values["line35a"]).toBe(1721);
    expect(r.values["line37"]).toBe(0);
  });
  it("adds the age-65 amount and computes an amount owed (2025 mfj)", () => {
    const r = form1040.compute({ filing_status: "mfj", you_65_or_older: true, spouse_65_or_older: true, line1a: 150000, line25a: 10000, digital_assets: false }, { year: 2025, rounding: "whole" });
    expect(r.values["line12"]).toBe(31500 + 2 * 1600);
    expect(r.values["line15"]).toBe(150000 - 34700);
    expect(r.values["line16"]).toBe(15194); // >= 100,000 uses the worksheet: 2,385 + 8,772 + 0.22 x (115,300 - 96,950) = 15,194
    expect(r.values["line37"]).toBeGreaterThan(0);
  });
  it("warns about qualified dividends and missing digital asset answer", () => {
    const r = form1040.compute({ filing_status: "single", line3a: 100, line3b: 100 }, { year: 2025, rounding: "whole" });
    expect(r.warnings.some((w) => w.includes("Qualified Dividends"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("digital_assets"))).toBe(true);
  });
});

describe("Form 1040 fill", () => {
  it("places header, filing status, dependents, and totals for both years", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f1040", year, { first_name: "Robert", last_name: "Douglas", ssn: "123-45-6789", filing_status: "mfj", spouse_first_name: "Pat", spouse_last_name: "Douglas", spouse_ssn: "987654321", digital_assets: false, line1a: 1000, dependents: [{ name: "Sam Douglas", ssn: "111223333", relationship: "Son", child_tax_credit: true }] }, "whole");
      const f = p.pdfFields;
      const find = (suffix: string) => Object.keys(f).find((k) => k.endsWith(suffix));
      expect(f[find(year === 2024 ? "f1_06[0]" : "f1_16[0]")!]).toBe("123456789");
      expect(f[find(year === 2024 ? "FilingStatus_ReadOrder[0].c1_3[1]" : "Checkbox_ReadOrder[0].c1_8[1]")!]).toBe(true);
      expect(f[find(year === 2024 ? "c1_5[1]" : "c1_10[1]")!]).toBe(true);
      if (year === 2024) {
        expect(f[find("Row1[0].f1_20[0]")!]).toBe("Sam Douglas");
        expect(f[find("Row1[0].c1_14[0]")!]).toBe(true);
      } else {
        expect(f[find("Row1[0].f1_31[0]")!]).toBe("Sam");
        expect(f[find("Row2[0].f1_35[0]")!]).toBe("Douglas");
        expect(f[find("Dependent1[0].c1_28[0]")!]).toBe(true);
      }
      expect(f[find(year === 2024 ? "Page1[0].f1_60[0]" : "Page2[0].f2_06[0]")!]).toBeDefined(); // line 15 taxable income
    }
  });
});
