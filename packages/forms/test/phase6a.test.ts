import { describe, expect, it } from "vitest";
import { form8606 } from "../src/forms/form8606.ts";
import { form6251 } from "../src/forms/form6251.ts";
import { form5329 } from "../src/forms/form5329.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import type { Values } from "../src/types.ts";

const clean = (id: Parameters<typeof prepareFormValues>[0], values: Values, min: number) => {
  for (const year of [2024, 2025] as const) {
    const p = prepareFormValues(id, year, values, "whole");
    expect(p.issues.filter((i) => i.severity === "error"), `${id} ${year}`).toEqual([]);
    expect(p.warnings.filter((w) => w.includes("No PDF field")), `${id} ${year}`).toEqual([]);
    expect(Object.keys(p.pdfFields).length, `${id} ${year}`).toBeGreaterThanOrEqual(min);
  }
};

describe("Form 8606", () => {
  it("prorates a backdoor Roth conversion against existing pre-tax balances", () => {
    const r = form8606.compute({ line1: 7000, line2: 0, line6: 93000, line8: 7000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line9"]).toBe(100000);
    expect(r.values["line10_decimals"]).toBe("070");
    expect(r.values["line11"]).toBe(490);
    expect(r.values["line18"]).toBe(6510);
    expect(r.values["line14"]).toBe(6510);
    const clean8606 = form8606.compute({ line1: 7000, line6: 0, line8: 7000 }, { year: 2024, rounding: "whole" });
    expect(clean8606.values["line10_whole"]).toBe("1");
    expect(clean8606.values["line18"]).toBe(0);
    const roth = form8606.compute({ line19: 20000, line22: 15000, line24: 3000 }, { year: 2025, rounding: "whole" });
    expect(roth.values["line25c"]).toBe(2000);
  });
  it("maps both layouts", () => clean("f8606", { name: "A", ssn: "111223333", line1: 1, line2: 2, line4: 1, line6: 10, line7: 5, line8: 5, line15b: 1, line19: 9, line20: 1, line22: 1, line24: 1, line25b: 1 }, 24));
});

describe("Form 6251", () => {
  it("charges AMT when state taxes and ISO spreads are added back", () => {
    const r = form6251.compute({ filing_status: "mfj", line1: 400000, line2a: 40000, line2i: 150000, line10: 82000 }, { year: 2024, rounding: "whole" });
    expect(r.values["line4"]).toBe(590000);
    expect(r.values["line5"]).toBe(133300);
    expect(r.values["line6"]).toBe(456700);
    expect(r.values["line7"]).toBe(Math.round(456700 * 0.28 - 232600 * 0.02));
    expect(r.values["line11"]).toBe(Number(r.values["line9"]) - 82000);
    const none = form6251.compute({ filing_status: "single", line1: 100000, line2a: 15000, line10: 14000 }, { year: 2024, rounding: "whole" });
    expect(none.values["line11"]).toBe(0);
    const phased = form6251.compute({ filing_status: "single", agi: 900000, line1a: 0, line10: 280000 }, { year: 2025, rounding: "whole" });
    expect(phased.values["line5"]).toBe(88100 - Math.round((900000 - 626350) * 0.25));
  });
  it("runs Part III for capital gains and uses the 2025 line 1a/1b layout", () => {
    const r = form6251.compute({ filing_status: "single", agi: 500000, line1a: 15750, line2a: 15750, line10: 120000, line13: 200000, line14: 0, line20: 284250 }, { year: 2025, rounding: "whole" });
    expect(r.values["line1b"]).toBe(484250);
    expect(r.values["line4"]).toBe(500000);
    expect(r.values["line22"]).toBe(200000);
    expect(r.values["line21"]).toBe(0);
    expect(r.values["line30"]).toBe(200000);
    expect(r.values["line31"]).toBe(30000);
    expect(Number(r.values["line40"])).toBeLessThan(Number(r.values["line39"]));
    expect(r.values["line7"]).toBe(r.values["line40"]);
  });
  it("maps both layouts", () => clean("f6251", { name: "A", ssn: "111223333", filing_status: "single", line1: 1000000, line1a: 20000, agi: 1020000, line2a: 1, line2b: -1, line2c: 1, line2d: 1, line2e: 1, line2f: -1, line2g: 1, line2h: 1, line2i: 1, line2j: 1, line2k: 1, line2l: 1, line2m: 1, line2n: 1, line2o: 1, line2p: 1, line2q: 1, line2r: 1, line2s: -1, line2t: 1, line3: 1, line8: 1, line10: 1, line13: 100000, line14: 10000, line20: 800000 }, 50));
});

describe("Form 5329", () => {
  it("figures the early distribution, excess contribution, and RMD taxes", () => {
    const r = form5329.compute({ line1: 18000, line2_exception: "08", line2: 6000, line15: 1500, line17_value: 48000, line52a: 9000, line53a: 4000, line50: 2000, line51_value: 1000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line4"]).toBe(1200);
    expect(r.values["line16"]).toBe(1500);
    expect(r.values["line17"]).toBe(90);
    expect(r.values["line51"]).toBe(60);
    expect(r.values["line55"]).toBe(1250);
    expect(r.values["total_additional_tax"]).toBe(1200 + 90 + 60 + 1250);
    const simple = form5329.compute({ line1: 10000, simple_ira_first_two_years: true }, { year: 2024, rounding: "whole" });
    expect(simple.values["line4"]).toBe(2500);
  });
  it("maps both layouts", () => clean("f5329", { name: "A", ssn: "111223333", line1: 1, line2_exception: "01", line2: 1, line5: 1, line6: 1, line9: 1, line10: 1, line11: 1, line12: 1, line15: 1, line18: 1, line19: 1, line20: 1, line23: 1, line26: 1, line27: 1, line28: 1, line31: 1, line34: 1, line35: 1, line36: 1, line39: 1, line42: 1, line43: 1, line44: 1, line47: 1, line50: 1, line52a: 1, line52b: 1, line53a: 1, line53b: 1 }, 50));
});

describe("Form 8283 and the return wiring", () => {
  it("maps Section A, Section B, and the page 2 fields", () => clean("f8283", { name: "A", ssn: "111223333", section_a: [1, 2, 3, 4].map((i) => ({ donee: `D${i}`, vehicle: i === 1, vin: "1HGCM82633A004352", description: "x", date_contributed: "01/01/2025", date_acquired: "2019", how_acquired: "purchase", cost: 10, fmv: 20, method: "thrift" })), partial_interest_item: "A", property_type: "equipment", section_b: [1, 2, 3].map((i) => ({ description: `B${i}`, condition: "good", appraised_fmv: 6000, date_acquired: "2018", how_acquired: "gift", cost: 1000, bargain_sale_amount: 0, amount_claimed: 6000, date_contributed: "02/02/2025" })), restriction_use: false, restriction_income: false, restriction_purpose: true, appraiser_name: "Ann", appraiser_title: "ASA", appraiser_address: "1 St", appraiser_id: "123456789", appraiser_city: "X", appraisal_date: "03/03/2025", donee_unrelated_use: false, donee_name: "Charity", donee_ein: "987654321", donee_address: "2 St", donee_city: "Y", donee_signature_date: "03/04/2025" }, 78));
  it("feeds 1040 line 4b, Schedule 2 line 8, and attaches the AMT when it applies", async () => {
    const r = await prepareReturn(
      {
        year: 2025,
        form1040: { first_name: "A", last_name: "B", spouse_first_name: "S", spouse_last_name: "B", ssn: "111111111", spouse_ssn: "222222222", filing_status: "mfj", digital_assets: false, line1a: 400000 },
        scheduleA: { line5a: 30000, line5b: 20000, line8a: 12000 },
        form8606: [{ line1: 7000, line6: 93000, line8: 7000 }, { owner: "spouse", line19: 20000, line22: 15000 }],
        form5329: { line1: 10000 },
        form6251: { line2i: 150000 },
        form8283: { section_a: [{ donee: "Goodwill", description: "Clothes", fmv: 800, cost: 2000, date_contributed: "01/01/2025", how_acquired: "purchase", method: "thrift" }] },
      },
      { renderBase: "https://clicktax.org" },
    );
    const ids = r.forms.map((x) => x.form);
    expect(ids.filter((x) => x === "f8606").length).toBe(2);
    expect(ids).toContain("f5329");
    expect(ids).toContain("f6251");
    expect(ids).toContain("f8283");
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    const s2 = r.forms.find((x) => x.form === "f1040s2")!;
    const amt = r.forms.find((x) => x.form === "f6251")!;
    expect(f1040.values["line4b"]).toBe(6510 + 5000);
    expect(f1040.values["line4a"]).toBe(7000 + 20000);
    expect(s2.values["line8"]).toBe(1000);
    expect(amt.values["line2a"]).toBe(40000); // Schedule A line 7: SALT capped at 40,000 for 2025
    expect(amt.values["line2i"]).toBe(150000);
    expect(Number(amt.values["line11"])).toBeGreaterThan(0);
    expect(s2.values["line2"]).toBe(amt.values["line11"]);
    expect(r.totals["alternative_minimum_tax"]).toBe(amt.values["line11"]);
    const plain = await prepareReturn({ year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 90000 } }, { renderBase: "https://clicktax.org" });
    expect(plain.forms.map((x) => x.form)).not.toContain("f6251");
  });
});
