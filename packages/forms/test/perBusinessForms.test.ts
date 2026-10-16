import { describe, expect, it } from "vitest";
import { prepareReturn, prepareFormValues } from "../src/engine/return.ts";

describe("one Form 4562/8829 per business and one Form 8889 per spouse", () => {
  it("attaches a Form 4562 to each Schedule C and sums two Forms 8889", async () => {
    const r = await prepareReturn(
      {
        year: 2025,
        form1040: { first_name: "A", last_name: "B", spouse_first_name: "S", spouse_last_name: "B", ssn: "111111111", spouse_ssn: "222222222", filing_status: "mfj", digital_assets: false },
        scheduleC: [{ principal_business: "Plumbing", line1: 90000 }, { principal_business: "Ranch", owner: "spouse", line1: 40000 }],
        form4562: [{ business: 1, macrs_7yr_b: "03/2025", macrs_7yr_c: 7000 }, { business: 2, macrs_5yr_b: "05/2025", macrs_5yr_c: 10000 }],
        form8829: { business: 2, line1: 300, line2: 1500, line10b: 2400, line11b: 900 },
        form8889: [{ coverage: "family", line2: 3000 }, { owner: "spouse", coverage: "self_only", line2: 1500 }],
      },
      { renderBase: "https://clicktax.org" },
    );
    const ids = r.forms.map((x) => x.form);
    expect(ids.filter((x) => x === "f4562").length).toBe(2);
    expect(ids.filter((x) => x === "f8829").length).toBe(1);
    expect(ids.filter((x) => x === "f8889").length).toBe(2);
    const sc = r.forms.filter((x) => x.form === "f1040sc");
    expect(sc[0]!.values["line13"]).toBe(1000); // 7,000 x 14.29%
    expect(sc[1]!.values["line13"]).toBe(2000); // 10,000 x 20%
    expect(Number(sc[1]!.values["line30"])).toBeGreaterThan(0);
    const d = r.forms.filter((x) => x.form === "f4562");
    expect(d[0]!.title).toContain("business 1");
    expect(d[1]!.title).toContain("business 2, spouse");
    const h = r.forms.filter((x) => x.form === "f8889");
    expect(h[1]!.title).toContain("spouse");
    expect(h[1]!.values["name"]).toBe("S B");
    const s1 = r.forms.find((x) => x.form === "f1040s1")!;
    expect(s1.values["line13"]).toBe(4500);
    expect(r.totals["hsa_deduction"]).toBe(4500);
    expect(r.warnings.filter((w) => w.includes("ignored"))).toEqual([]);
  });
  it("warns when a per-business form names a missing business", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false }, scheduleC: [{ line1: 1000 }], form4562: [{ business: 3, line14: 100 }] }, { renderBase: "https://clicktax.org" });
    expect(r.warnings.some((w) => w.includes("form4562[0] names business 3"))).toBe(true);
  });
  it("fills Form 9325", () => {
    for (const year of [2024, 2025] as const) {
      const p = prepareFormValues("f9325", year, { taxpayer_name: "A B", taxpayer_address: "1 St", item1: true, item1_year: "2025", item1_center: "Ogden", item1_provider: "ERO LLC", item2: true, item2_date: "02/01/2026", item2_submission_id: "123", item3: true, item3_date: "02/02/2026", item4: true, item5: false, item6: true, item6_date: "04/10/2026", item6_submission_id: "456" }, "whole");
      expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
      expect(Object.keys(p.pdfFields).length).toBe(15);
    }
  });
});
