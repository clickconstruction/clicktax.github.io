import { describe, expect, it } from "vitest";
import { form6252 } from "../src/forms/form6252.ts";
import { form2555 } from "../src/forms/form2555.ts";
import { form4835 } from "../src/forms/form4835.ts";
import { form2106 } from "../src/forms/form2106.ts";
import { form8958 } from "../src/forms/form8958.ts";
import { form8888 } from "../src/forms/form8888.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { sampleValues } from "../src/samples.ts";
import { incomeTax } from "../src/tax.ts";
import type { FormId, ListRow } from "../src/types.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };
const opts = { renderBase: "https://clicktax.org/fill", rounding: "whole" as const };

describe("Phase 7b forms map to both PDFs", () => {
  const ids: FormId[] = ["f8888", "f1310", "f6252", "f2555", "f4835", "f2106", "f8958"];
  for (const id of ids) {
    for (const year of [2024, 2025] as const) {
      it(`${id} ${year} sample has no mapping gaps`, () => {
        const p = prepareFormValues(id, year, sampleValues(id, year), "whole");
        expect(p.issues.filter((i) => i.severity === "error")).toEqual([]);
        expect(p.warnings.filter((w) => w.includes("No PDF field"))).toEqual([]);
        expect(Object.keys(p.pdfFields).length).toBeGreaterThan(8);
      });
    }
  }
});

describe("Form 6252", () => {
  it("figures gross profit, contract price, the percentage, and this year's income", () => {
    const r = form6252.compute(sampleValues("f6252", 2025), ctx);
    expect(r.values["line13"]).toBe(66000);
    expect(r.values["line14"]).toBe(54000);
    expect(r.values["line16"]).toBe(54000);
    expect(r.values["line18"]).toBe(120000);
    expect(r.values["line19"]).toBe("0.4500");
    expect(r.values["line20"]).toBe(0);
    expect(r.values["line22"]).toBe(30000);
    expect(r.values["line24"]).toBe(13500);
    expect(r.values["line26"]).toBe(13500);
    const later = form6252.compute({ gross_profit_percentage: 0.45, line21: 20000, line23: 30000 }, ctx);
    expect(later.values["line19"]).toBe("0.4500");
    expect(later.values["line24"]).toBe(9000);
    const debt = form6252.compute({ year_of_sale: true, line5: 100000, line6: 70000, line8: 50000, line21: 5000 }, ctx);
    expect(debt.values["line17"]).toBe(20000);
    expect(debt.values["line18"]).toBe(50000);
    expect(debt.values["line20"]).toBe(20000);
  });
});

describe("Form 2555", () => {
  it("excludes a full year of foreign earned income with the housing exclusion", () => {
    const r = form2555.compute(sampleValues("f2555", 2025), ctx);
    expect(r.values["line24"]).toBe(148000);
    expect(r.values["line27"]).toBe(148000);
    expect(r.values["line29b"]).toBe(39000);
    expect(r.values["line32"]).toBe(20800);
    expect(r.values["line33"]).toBe(9200);
    expect(r.values["line35"]).toBe("1");
    expect(r.values["line35_decimals"]).toBe("000");
    expect(r.values["line36"]).toBe(9200);
    expect(r.values["line37"]).toBe(130000);
    expect(r.values["line39"]).toBe("1");
    expect(r.values["line42"]).toBe(130000);
    expect(r.values["line43"]).toBe(139200);
    expect(r.values["line45"]).toBe(139200);
    expect(r.values["line50"]).toBe(0);
  });
  it("prorates a partial year and uses the 2024 limits", () => {
    const r = form2555.compute({ line19: 90000, line31: 200, line28: 15000, claim_housing: true }, { year: 2024, rounding: "whole" });
    expect(r.values["line29b"]).toBe(Math.round((37950 * 200) / 366));
    expect(r.values["line32"]).toBe(11060);
    expect(r.values["line37"]).toBe(126500);
    expect(r.values["line39"]).toBe("0");
    expect(r.values["line39_decimals"]).toBe("546");
    expect(r.values["line40"]).toBe(Math.round(126500 * 0.546));
    const selfEmployed = form2555.compute({ employer_self: true, line20a: 100000, line28: 30000, line31: 365, claim_housing: true }, ctx);
    expect(selfEmployed.values["line34"]).toBe(0);
    expect(selfEmployed.values["line36"]).toBe(0);
    expect(selfEmployed.values["line42"]).toBe(100000);
    expect(selfEmployed.values["line50"]).toBe(0); // line 47 (27 - 43) is zero, so no housing deduction
    const deduction = form2555.compute({ employer_self: true, line20a: 160000, line28: 30000, line31: 365, claim_housing: true }, ctx);
    expect(deduction.values["line46"]).toBe(9200);
    expect(deduction.values["line47"]).toBe(30000);
    expect(deduction.values["line50"]).toBe(9200);
  });
});

describe("Form 4835", () => {
  it("totals farm rental income and expenses", () => {
    const r = form4835.compute(sampleValues("f4835", 2025), ctx);
    expect(r.values["line3b"]).toBe(2500);
    expect(r.values["line7"]).toBe(48000 + 2500 + 400);
    expect(r.values["line31"]).toBe(1200 + 3100 + 4800 + 5200 + 900 + 2600 + 1800 + 1500);
    expect(r.values["line32"]).toBe(50900 - 21100);
    const loss = form4835.compute({ line1: 5000, line12: 9000, at_risk: "all", active_participation: true }, ctx);
    expect(loss.values["line32"]).toBe(-4000);
    expect(loss.values["line34c"]).toBe(-4000);
  });
});

describe("Form 2106", () => {
  it("uses the standard mileage rate and the 50% meals limit", () => {
    const r = form2106.compute(sampleValues("f2106", 2025), ctx);
    expect(r.values["line22"]).toBe(1820);
    expect(r.values["line1_a"]).toBe(1820);
    expect(r.values["line6_a"]).toBe(1820 + 120 + 1850);
    expect(r.values["line8_a"]).toBe(3790 - 500);
    expect(r.values["line9_b"]).toBe(320);
    expect(r.values["line10"]).toBe(3290 + 320);
    const v = (r.values["vehicles"] as ListRow[])[0]!;
    expect(v["business_pct"]).toBe("18.6");
    expect(v["other_miles"]).toBe(14000 - 2600 - 4300);
    const r24 = form2106.compute({ vehicles: [{ total_miles: 1000, business_miles: 1000 }] }, { year: 2024, rounding: "whole" });
    expect(r24.values["line22"]).toBe(670);
  });
  it("figures actual vehicle expenses with depreciation", () => {
    const r = form2106.compute({ method: "actual", vehicles: [{ total_miles: 10000, business_miles: 6000, line23: 4000, line24a: 1000, line24b: 200, line30: 30000, line31: 0, depreciation_rate: 0.2, line36: 12400 }] }, ctx);
    const v = (r.values["vehicles"] as ListRow[])[0]!;
    expect(v["line24c"]).toBe(800);
    expect(v["line26"]).toBe(4800);
    expect(v["line27"]).toBe(2880);
    expect(v["line32"]).toBe(18000);
    expect(v["line34"]).toBe(3600);
    expect(v["line35"]).toBe(3600);
    expect(v["line37"]).toBe(7440);
    expect(v["line38"]).toBe(3600);
    expect(v["line28"]).toBe(3600);
    expect(v["line29"]).toBe(6480);
    expect(r.values["line1_a"]).toBe(6480);
  });
});

describe("Form 8958", () => {
  it("places items by line and splits community income equally by default", () => {
    const r = form8958.compute(sampleValues("f8958", 2025), ctx);
    const rows = r.values["rows"] as ListRow[];
    expect(rows[0]!["total"]).toBe(84000);
    expect(rows[0]!["spouse_a"]).toBe(42000);
    expect(rows[1]!["description"]).toBe("City of Austin (W-2)");
    expect(rows[5]!["total"]).toBe(1240); // line 2 starts at row 6
    expect(rows[5]!["spouse_b"]).toBe(620);
    expect(rows[30]!["total"]).toBe(14200); // line 11 starts at page-2 row 9
    expect(r.values["ssn_col_b"]).toBe("123456789");
    const p = prepareFormValues("f8958", 2025, sampleValues("f8958", 2025), "whole");
    expect(p.pdfFields["topmostSubform[0].Page1[0].Table_1-8[0].Header[0].B\\.Allocated[0].SSN-B[0].f1_7[0]"]).toBe("123");
    expect(p.pdfFields["topmostSubform[0].Page2[0].Table_9-12[0].BodyRow9[0].f2_40[0]"]).toBe("14,200");
    const partial = form8958.compute({ items: [{ line: "3", description: "Broker", total: 1000, spouse_a: 1000 }] }, ctx);
    const prow = (partial.values["rows"] as ListRow[])[8]!;
    expect(prow["spouse_b"]).toBe(0);
  });
});

describe("Form 8888", () => {
  it("totals the deposits and checks them against the refund", () => {
    const r = form8888.compute(sampleValues("f8888", 2025), ctx);
    expect(r.values["line5"]).toBe(3200);
    expect(r.warnings.some((w) => w.includes("does not equal"))).toBe(false);
    const rows = r.values["accounts"] as ListRow[];
    expect(rows[0]!["checking"]).toBe(true);
    expect(rows[1]!["savings"]).toBe(true);
    const bad = form8888.compute({ refund: 3000, accounts: [{ amount: 2000, routing: "12345", type: "checking", account: "1" }, { amount: 1200, routing: "021000021", type: "savings", account: "2" }] }, ctx);
    expect(bad.warnings.some((w) => w.includes("does not equal"))).toBe(true);
    expect(bad.warnings.some((w) => w.includes("9 digits"))).toBe(true);
  });
});

describe("Phase 7b return wiring", () => {
  it("applies Form 2555 to Schedule 1 and the Foreign Earned Income Tax Worksheet", async () => {
    // No qualified dividends or capital gains, so the worksheet's line 4 uses the plain tax computation.
    const r = await prepareReturn({ year: 2025, form1040: { ...sampleValues("f1040", 2025), filing_status: "single", line1a: 150000, line3a: 0, line7: 0 }, form2555: { line19: 150000, line31: 365 } }, opts);
    const s1 = r.forms.find((x) => x.form === "f1040s1")!;
    expect(s1.values["line8d"]).toBe(130000);
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    const l15 = Number(f1040.values["line15"]);
    const expected = Math.max(0, incomeTax(l15 + 130000, "single", 2025) - incomeTax(130000, "single", 2025));
    expect(f1040.values["line16"]).toBe(expected);
    expect(Number(f1040.values["line16"])).toBeGreaterThan(incomeTax(l15, "single", 2025));
    expect(r.totals["foreign_earned_income_exclusion"]).toBe(130000);
    expect(r.forms.map((x) => x.form)).toContain("f2555");
  });
  it("carries Form 4835 to Schedule E line 40 and Form 2106 to Schedule 1 line 12", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { ...sampleValues("f1040", 2025), filing_status: "single", line1a: 60000 }, form4835: { line1: 20000, line12: 5000 }, form2106: { filer_type: "reservist", line3_a: 2000, vehicles: [{ total_miles: 5000, business_miles: 1000 }] } }, opts);
    const sE = r.forms.find((x) => x.form === "f1040se")!;
    expect(sE.values["line40"]).toBe(15000);
    expect(sE.values["line41"]).toBe(15000);
    const s1 = r.forms.find((x) => x.form === "f1040s1")!;
    expect(s1.values["line5"]).toBe(15000);
    expect(s1.values["line12"]).toBe(2700);
    expect(r.forms.map((x) => x.form)).toContain("f4835");
    expect(r.forms.map((x) => x.form)).toContain("f2106");
  });
  it("carries Form 6252 to Schedule D and attaches Forms 8888, 1310, and 8958", async () => {
    const r = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 80000, line25a: 20000 },
      form6252: [{ year_of_sale: true, line5: 100000, line8: 40000, line21: 25000 }, { gross_profit_percentage: 0.5, line21: 10000, long_term: false }],
      form8888: { accounts: [{ amount: 1000, routing: "021000021", type: "checking", account: "1" }, { amount: 500, routing: "021000021", type: "savings", account: "2" }] },
      form1310: { decedent_name: "John Sample", box: "a" },
      form8958: { items: [{ line: "1", description: "W-2", total: 80000 }] },
    }, opts);
    const sD = r.forms.find((x) => x.form === "f1040sd")!;
    expect(sD.values["line11"]).toBe(15000);
    expect(sD.values["line4"]).toBe(5000);
    const ids = r.forms.map((x) => x.form);
    expect(ids.filter((x) => x === "f6252").length).toBe(2);
    expect(ids).toContain("f8888");
    expect(ids).toContain("f1310");
    expect(ids).toContain("f8958");
    const f8958 = r.forms.find((x) => x.form === "f8958")!;
    expect(f8958.values["spouse_ssn"]).toBe("987654321");
    const f1310 = r.forms.find((x) => x.form === "f1310")!;
    expect(f1310.values["calendar_year"]).toBe("2025");
  });
});
