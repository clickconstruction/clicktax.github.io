import { describe, expect, it } from "vitest";
import { form4868 } from "../src/forms/form4868.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";

describe("Form 4868", () => {
  it("computes the balance due and defaults the payment to it", () => {
    const r = form4868.compute({ line4: 12000, line5: 9000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line6"]).toBe(3000);
    expect(r.values["line7"]).toBe(3000);
  });
  it("is filled from the return's totals", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 90000, line25a: 5000, address: "1 Main", city: "Austin", state: "TX", zip: "78701" }, form4868: {} },
      { renderBase: "https://clicktax.org" },
    );
    const f = r.forms.find((x) => x.form === "f4868")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(f.values["line4"]).toBe(f1040.values["line24"]);
    expect(f.values["line5"]).toBe(5000);
    expect(f.values["line6"]).toBe(Number(f1040.values["line24"]) - 5000);
    expect(f.pdfFields[Object.keys(f.pdfFields).find((k) => k.endsWith("f1_9[0]"))!]).toBe("111-11-1111");
  });
});

describe("Form W-9", () => {
  it("splits the SSN and EIN across the comb boxes and checks the classification", () => {
    const p = prepareFormValues("fw9", 2025, { name: "Jane Sample", classification: "llc", llc_classification: "S", address: "1 Main", city_state_zip: "Austin, TX 78701", ssn: "123456789", ein: "123456789" }, "whole");
    const k = (suffix: string) => Object.keys(p.pdfFields).find((x) => x.endsWith(suffix))!;
    expect(p.pdfFields[k("f1_11[0]")]).toBe("123");
    expect(p.pdfFields[k("f1_12[0]")]).toBe("45");
    expect(p.pdfFields[k("f1_13[0]")]).toBe("6789");
    expect(p.pdfFields[k("f1_14[0]")]).toBe("12");
    expect(p.pdfFields[k("f1_15[0]")]).toBe("3456789");
    expect(p.pdfFields[k("c1_1[5]")]).toBe(true);
    expect(p.pdfFields[k("f1_03[0]")]).toBe("S");
    expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
  });
});
