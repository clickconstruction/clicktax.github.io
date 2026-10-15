import { describe, expect, it } from "vitest";
import { prepareFormValues } from "../src/engine/return.ts";

describe("Form 1099-NEC", () => {
  it("fills copies 1, B, and 2 identically and never Copy A", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f1099nec", year, { payer_name: "ACME", payer_address: "1 Rd", payer_city_state_zip: "Austin, TX 78701", payer_phone: "512", payer_tin: "123456789", recipient_tin: "987654321", recipient_name: "Pat", recipient_street: "2 St", recipient_city_state_zip: "Austin, TX 78701", box1: 1200, box2_direct_sales: true, states: [{ state_number: "TX", state_income: 1200 }] }, "whole");
      const keys = Object.keys(p.pdfFields);
      expect(keys.some((k) => k.startsWith("topmostSubform[0].CopyA"))).toBe(false);
      for (const copy of ["Copy1", "CopyB", "Copy2"]) {
        expect(p.pdfFields[`topmostSubform[0].${copy}[0].RightColumn[0].f2_9[0]`]).toBe("1,200");
        expect(p.pdfFields[`topmostSubform[0].${copy}[0].LeftColumn[0].f2_2[0]`]).toBe("ACME, 1 Rd, Austin, TX 78701, 512");
        expect(p.pdfFields[`topmostSubform[0].${copy}[0].LeftColumn[0].f2_3[0]`]).toBe("12-3456789");
        expect(p.pdfFields[`topmostSubform[0].${copy}[0].RightColumn[0].c2_3[0]`]).toBe(true);
        expect(p.pdfFields[`topmostSubform[0].${copy}[0].RightColumn[0].f2_13[0]`]).toBe("TX");
      }
      expect(p.values["calendar_year"]).toBe(String(year));
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
    }
  });
});
