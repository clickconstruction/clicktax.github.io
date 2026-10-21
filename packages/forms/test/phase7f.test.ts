import { describe, expect, it } from "vitest";
import { form4136 } from "../src/forms/form4136.ts";
import { form965a } from "../src/forms/form965a.ts";
import { form3468 } from "../src/forms/form3468.ts";
import { form1040nr } from "../src/forms/form1040nr.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { sampleValues } from "../src/samples.ts";
import { qdcgWorksheet } from "../src/tax.ts";
import type { FormId, ListRow } from "../src/types.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };
const opts = { renderBase: "https://clicktax.org/fill", rounding: "whole" as const };

describe("Phase 7f forms map to both PDFs", () => {
  const ids: FormId[] = ["f4136", "f965a", "f3468", "f1040nr"];
  for (const id of ids) {
    for (const year of [2024, 2025] as const) {
      it(`${id} ${year} sample has no mapping gaps`, () => {
        const p = prepareFormValues(id, year, sampleValues(id, year), "whole");
        expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
        expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
        expect(Object.keys(p.pdfFields).length).toBeGreaterThan(6);
      });
    }
  }
});

describe("Form 4136", () => {
  it("groups same-rate rows and totals the credit to the cent", () => {
    const r = form4136.compute(sampleValues("f4136", 2025), ctx);
    expect(r.values["line1c_amount"]).toBe("274");
    expect(r.values["line1c_amount_cents"]).toBe("50");
    expect(r.values["line3b_amount"]).toBe("704");
    expect(r.values["line3b_amount_cents"]).toBe("70");
    expect(r.values["line11a_amount"]).toBe("146");
    expect(r.values["line11a_amount_cents"]).toBe("40");
    expect(r.values["line17_dollars"]).toBe("1125");
    expect(r.values["line17_cents"]).toBe("60");
    expect(r.values["line17"]).toBe(1126);
    expect(r.warnings.some((w) => w.includes("Part I line A"))).toBe(true);
  });
  it("uses the 2024-only biodiesel and alternative fuel lines and asks for the type of use", () => {
    const r = form4136.compute({ line10a_gallons: 1000, line12a_gallons: 500, line1c_gallons: 100 }, { ...ctx, year: 2024 });
    expect(r.values["line10a_amount"]).toBe("1000");
    expect(r.values["line12a_amount"]).toBe("250");
    expect(r.values["line17"]).toBe(1268);
    expect(r.warnings.some((w) => w.includes("type of use"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("Line 10 requires"))).toBe(true);
    const skipped = form4136.compute({ line10a_gallons: 1000 }, ctx);
    expect(skipped.values["line17"]).toBe(0);
  });
});

describe("Form 965-A", () => {
  it("nets the liability, defaults column (e) from Part III, and tracks the unpaid balance", () => {
    const r = form965a.compute(sampleValues("f965a", 2025), ctx);
    const rows = r.values["liabilities"] as ListRow[];
    expect(rows[0]!["year"]).toBe("2017");
    expect(rows[0]!["year2"]).toBe("2017");
    expect(rows[0]!["net_965"]).toBe(60000);
    expect(rows[0]!["s_corp_deferred"]).toBe(10000);
    expect(rows[0]!["eligible"]).toBe(50000);
    expect(rows[0]!["installments"]).toBe(50000);
    expect(rows[0]!["paid_in_full"]).toBe(0);
    expect(rows[0]!["remaining"]).toBe(5000);
    expect(r.values["remaining_total"]).toBe(5000);
    expect(r.values["paid_this_year_total"]).toBe(15000);
    expect(r.values["part3_total_2017"]).toBe(10000);
    expect(r.values["deferred_total"]).toBe(10000);
    expect(r.values["reporting_year"]).toBe("2025");
  });
});

describe("Form 3468", () => {
  it("figures the energy credit with a full low-income allocation", () => {
    const r = form3468.compute(sampleValues("f3468", 2025), ctx);
    expect(r.values["p6_line3c"]).toBe(120000);
    expect(r.values["p6_line3f"]).toBe(40000);
    expect(r.values["p6_line3j"]).toBe(40000);
    expect(r.values["p6_line4"]).toBe(160000);
    expect(r.values["p6_line27"]).toBe(160000);
    expect(r.values["p6_line32"]).toBe(160000);
    expect(r.values["p2_line7"]).toBe(0);
  });
  it("prorates a partial allocation and applies the capacity limits", () => {
    const r = form3468.compute({ line12a_i: "250", p6_line3a: 400000, p6_line3b: 30, p6_line3d: 10, p6_line3e: "100", p6_line5a: 100000, p6_line5c: 20, p6_line7a: 50000, p6_line7b: 10, p6_line7j: 10, p7_line1g: 200000, p2_line1a: 1000000 }, ctx);
    expect(r.values["p6_line3g"]).toBe("0.4");
    expect(r.values["p6_line3h"]).toBe("4");
    expect(r.values["p6_line3i"]).toBe(16000);
    expect(r.values["p6_line4"]).toBe(136000);
    expect(r.values["p6_line5e"]).toBe(20000);
    expect(r.values["p6_line8"]).toBe(2000);
    expect(r.values["p6_line27"]).toBe(158000);
    expect(r.values["p7_line1j"]).toBe(8000);
    expect(r.values["p7_line3"]).toBe(8000);
    expect(r.values["p2_line7"]).toBe(200000);
    const r24 = form3468.compute({ p7_line1g: 200000, p7_transition_historic: true }, { ...ctx, year: 2024 });
    expect(r24.values["p7_line1i"]).toBe(40000);
    expect(r24.values["p7_line3"]).toBe(40000);
  });
});

describe("Form 1040-NR", () => {
  it("computes the return like Form 1040 for a single filer", () => {
    const r = form1040nr.compute(sampleValues("f1040nr", 2025), ctx);
    expect(r.values["line1z"]).toBe(60000);
    expect(r.values["line9"]).toBe(60900);
    expect(r.values["line11a"]).toBe(60900);
    expect(r.values["line11b"]).toBe(60900);
    expect(r.values["line15"]).toBe(51900);
    const tax = qdcgWorksheet({ taxableIncome: 51900, qualifiedDividends: 200, capitalGain: 0, status: "single", year: 2025 }).tax;
    expect(r.values["line16"]).toBe(tax);
    expect(r.values["line24"]).toBe(tax);
    expect(r.values["line33"]).toBe(7000);
    expect(r.values["line37"]).toBe(Math.max(0, tax - 7000));
    const r24 = form1040nr.compute(sampleValues("f1040nr", 2024), { ...ctx, year: 2024 });
    expect(r24.values["line13c_2024"]).toBe(0);
    expect(r24.values["line15"]).toBe(51900);
    const estate = form1040nr.compute({ filing_status: "estate", line1a: 10000 }, ctx);
    expect(estate.values["line16"]).toBe(0);
    expect(estate.warnings.some((w) => w.includes("Estates and trusts"))).toBe(true);
  });
});

describe("Phase 7f return wiring", () => {
  it("places Form 4136 on Schedule 3, Form 3468 on Form 3800, and attaches 965-A and 1040-NR", async () => {
    const r = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "single", line1a: 90000 },
      form4136: { line1b_gallons: 1000 },
      form3468: { p6_line3a: 100000, p6_line3b: 30 },
      form965a: { liabilities: [{ with_965: 20000, without_965: 15000 }] },
      form1040nr: { filing_status: "single" },
    }, opts);
    const s3 = r.forms.find((x) => x.form === "f1040s3")!;
    const f3800 = r.forms.find((x) => x.form === "f3800")!;
    const nr = r.forms.find((x) => x.form === "f1040nr")!;
    for (const id of ["f4136", "f3468", "f965a", "f1040nr", "f3800"]) expect(r.forms.some((x) => x.form === id)).toBe(true);
    expect(s3.values["line12"]).toBe(183);
    expect(Number(f3800.values["line38"])).toBeGreaterThan(0);
    expect(nr.values["line1a"]).toBe(90000);
    expect(nr.values["first_name"]).toBeDefined();
    expect(Number(nr.values["line16"])).toBeGreaterThan(0);
  });
});
