import { describe, expect, it } from "vitest";
import { form8396 } from "../src/forms/form8396.ts";
import { form8814 } from "../src/forms/form8814.ts";
import { form5405 } from "../src/forms/form5405.ts";
import { form461 } from "../src/forms/form461.ts";
import { scheduleR } from "../src/forms/scheduleR.ts";
import { form8824 } from "../src/forms/form8824.ts";
import { form8839 } from "../src/forms/form8839.ts";
import { form4684 } from "../src/forms/form4684.ts";
import { form982 } from "../src/forms/form982.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { sampleValues } from "../src/samples.ts";
import type { FormId, ListRow } from "../src/types.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };
const opts = { renderBase: "https://clicktax.org/fill", rounding: "whole" as const };

describe("Phase 7d forms map to both PDFs", () => {
  const ids: FormId[] = ["f8396", "f8814", "f982", "f5405", "f461", "f1040r", "f8824", "f8839", "f4684"];
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

describe("Form 8396", () => {
  it("caps the credit at $2,000 when the rate exceeds 20% and orders the carryforwards", () => {
    const r = form8396.compute(sampleValues("f8396", 2025), ctx);
    expect(r.values["line3"]).toBe(2000);
    expect(r.values["line7"]).toBe(2350);
    expect(r.values["ws_line3"]).toBe(4700);
    expect(r.values["line9"]).toBe(2350);
    expect(r.values["line17"]).toBe(0);
    const limited = form8396.compute({ line1: 10000, line2: 20, line6: 500, line8: 1500 }, ctx);
    expect(limited.values["line3"]).toBe(2000);
    expect(limited.values["line9"]).toBe(1500);
    expect(limited.values["line12"]).toBe(2000);
    expect(limited.values["line13"]).toBe(500);
    expect(limited.values["line14"]).toBe(500);
    expect(limited.values["line17"]).toBe(500);
  });
});

describe("Form 8814", () => {
  it("splits the child's income into the parent's return", () => {
    const r = form8814.compute(sampleValues("f8814", 2025), ctx);
    expect(r.values["line4"]).toBe(4000);
    expect(r.values["line6"]).toBe(1300);
    expect(r.values["line7"]).toBe("0");
    expect(r.values["line7_decimals"]).toBe("225");
    expect(r.values["line8_decimals"]).toBe("150");
    expect(r.values["line9"]).toBe(293);
    expect(r.values["line10"]).toBe(195);
    expect(r.values["line12"]).toBe(812);
    expect(r.values["line14"]).toBe(2650);
    expect(r.values["line15"]).toBe(135);
    const small = form8814.compute({ line1a: 2000 }, { year: 2024, rounding: "whole" });
    expect(small.values["line6"]).toBe(0);
    expect(small.values["line14"]).toBe(700);
    expect(small.values["line15"]).toBe(70);
    expect(small.values["line15_under"]).toBe(true);
  });
});

describe("Forms 5405, 461, 982", () => {
  it("repay the homebuyer credit up to the gain, limit the business loss, and check attribute reductions", () => {
    const r = form5405.compute(sampleValues("f5405", 2025), ctx);
    expect(r.values["line6"]).toBe(2500);
    expect(r.values["line11"]).toBe(385400);
    expect(r.values["line14"]).toBe(359500);
    expect(r.values["line15"]).toBe(25900);
    expect(r.values["line8"]).toBe(2500);
    const noGain = form5405.compute({ line3: "a", line4: 7500, line5: 5000, line9: 200000, line12: 250000 }, ctx);
    expect(noGain.values["line8"]).toBe(0);
    const related = form5405.compute({ line3: "c", line4: 7500, line5: 5000 }, ctx);
    expect(related.values["line8"]).toBe(2500);
    const l = form461.compute(sampleValues("f461", 2025), ctx);
    expect(l.values["line9"]).toBe(-748000);
    expect(l.values["line13"]).toBe(-12000);
    expect(l.values["line14"]).toBe(-760000);
    expect(l.values["line15"]).toBe(626000);
    expect(l.values["line16"]).toBe(-134000);
    expect(l.values["excess_business_loss"]).toBe(134000);
    const l24 = form461.compute({ filing_status: "single", line2: -400000 }, { year: 2024, rounding: "whole" });
    expect(l24.values["line15"]).toBe(305000);
    expect(l24.values["excess_business_loss"]).toBe(95000);
    const d = form982.compute(sampleValues("f982", 2025), ctx);
    expect(d.values["total_reductions"]).toBe(18500);
    expect(d.warnings.some((w) => w.includes("exceed"))).toBe(false);
  });
});

describe("Schedule R", () => {
  it("reduces the initial amount by nontaxable benefits and half of excess AGI", () => {
    const r = scheduleR.compute(sampleValues("f1040r", 2025), ctx);
    expect(r.values["line10"]).toBe(5000);
    expect(r.values["line12"]).toBe(5000);
    expect(r.values["line13c"]).toBe(9600);
    expect(r.values["line15"]).toBe(7500);
    expect(r.values["line16"]).toBe(6700);
    expect(r.values["line17"]).toBe(3350);
    expect(r.values["line18"]).toBe(12950);
    expect(r.values["line19"]).toBe(0);
    expect(r.values["line22"]).toBe(0);
    const credit = scheduleR.compute({ box: "3", line13a: 1000, line14: 12000, line21: 900 }, ctx);
    expect(credit.values["line10"]).toBe(7500);
    expect(credit.values["line15"]).toBe(10000);
    expect(credit.values["line17"]).toBe(1000);
    expect(credit.values["line19"]).toBe(5500);
    expect(credit.values["line20"]).toBe(825);
    expect(credit.values["line22"]).toBe(825);
    const disabled = scheduleR.compute({ box: "2", line11: 3000, line14: 5000, line21: 5000 }, ctx);
    expect(disabled.values["line12"]).toBe(3000);
    expect(disabled.values["line22"]).toBe(450);
  });
});

describe("Form 8824", () => {
  it("recognizes gain only to the extent of boot and carries the basis", () => {
    const r = form8824.compute(sampleValues("f8824", 2025), ctx);
    expect(r.values["line17"]).toBe(855000);
    expect(r.values["line19"]).toBe(445000);
    expect(r.values["line20"]).toBe(35000);
    expect(r.values["line22"]).toBe(35000);
    expect(r.values["line23"]).toBe(35000);
    expect(r.values["line24"]).toBe(410000);
    expect(r.values["line25"]).toBe(410000);
    expect(r.values["long_term"]).toBe(true);
    const p24 = prepareFormValues("f8824", 2024, { line15: 10, line16: 20, line18: 5, line30: 100, line33: 60 }, "whole");
    expect(p24.pdfFields["topmostSubform[0].Page2[0].f2_14[0]"]).toBe("25");
    expect(p24.pdfFields["topmostSubform[0].Page2[0].f2_31[0]"]).toBe("100");
    const p25 = prepareFormValues("f8824", 2025, { line15: 10, line16: 20, line18: 5, line30: 100, line33: 60 }, "whole");
    expect(p25.pdfFields["topmostSubform[0].Page2[0].f2_16[0]"]).toBe("25");
    expect(p25.pdfFields["topmostSubform[0].Page2[0].f2_33[0]"]).toBe("100");
    expect(p25.values["line37"]).toBe(60);
  });
});

describe("Form 8839", () => {
  it("figures the adoption credit, the 2025 refundable part, and the phaseout", () => {
    const r = form8839.compute(sampleValues("f8839", 2025), ctx);
    const kid = (r.values["children"] as ListRow[])[0]!;
    expect(kid["line2"]).toBe(17280);
    expect(kid["line4"]).toBe(17280);
    expect(kid["line6"]).toBe(17280);
    expect(kid["line10"]).toBe(0);
    expect(kid["line11a"]).toBe(17280);
    expect(kid["line11b"]).toBe(5000);
    expect(r.values["line11c"]).toBe(5000);
    expect(r.values["line12"]).toBe(17280);
    expect(r.values["line13"]).toBe(5000);
    expect(r.values["line14"]).toBe(12280);
    expect(r.values["line16"]).toBe(12280);
    expect(r.values["line18"]).toBe(9800);
    const phased = form8839.compute({ line7: 279190, line17: 50000, children: [{ first_name: "A", last_name: "B", birth_year: "2020", identifying_number: "1", final: true, line5: 20000 }] }, ctx);
    expect(phased.values["line8"]).toBe(20000);
    expect(phased.values["line9_decimals"]).toBe("500");
    const pk = (phased.values["children"] as ListRow[])[0]!;
    expect(pk["line10"]).toBe(8640);
    expect(pk["line11a"]).toBe(8640);
    const r24 = form8839.compute({ line7: 100000, line17: 20000, children: [{ first_name: "A", last_name: "B", birth_year: "2019", identifying_number: "1", special_needs: true, final: true }] }, { year: 2024, rounding: "whole" });
    const k24 = (r24.values["children"] as ListRow[])[0]!;
    expect(k24["line5"]).toBe(16810);
    expect(k24["line6"]).toBe(16810);
    expect(r24.values["line12"]).toBe(16810);
    expect(r24.values["line16"]).toBe(16810);
    expect(r24.values["line18"]).toBe(16810);
    const benefits = form8839.compute({ line7: 100000, children: [{ first_name: "A", last_name: "B", birth_year: "2020", identifying_number: "1", final: true, benefits: 20000 }] }, ctx);
    expect(benefits.values["line23"]).toBe(20000);
    expect(benefits.values["line30"]).toBe(17280);
    expect(benefits.values["line31"]).toBe(2720);
  });
});

describe("Form 4684", () => {
  it("figures personal casualty losses with the $100 and 10% limits", () => {
    const r = form4684.compute(sampleValues("f4684", 2025), ctx);
    const rows = r.values["properties"] as ListRow[];
    expect(rows[0]!["line7"]).toBe(260000);
    expect(rows[0]!["line8"]).toBe(260000);
    expect(rows[0]!["line9"]).toBe(80000);
    expect(rows[1]!["line8"]).toBe(26000);
    expect(rows[1]!["line9"]).toBe(14000);
    expect(r.values["line10"]).toBe(94000);
    expect(r.values["line11"]).toBe(100);
    expect(r.values["line12"]).toBe(93900);
    expect(r.values["line13"]).toBe(0);
    expect(r.values["line16"]).toBe(93900);
    expect(r.values["line17"]).toBe(11000);
    expect(r.values["line18"]).toBe(82900);
    const gain = form4684.compute({ federally_declared: true, agi: 50000, properties: [{ description: "Boat", line2: 10000, line3: 15000, line5: 14000, line6: 0 }] }, ctx);
    expect((gain.values["properties"] as ListRow[])[0]!["line4"]).toBe(5000);
    expect(gain.values["line13"]).toBe(5000);
    expect(gain.values["line15"]).toBe(5000);
    expect(gain.values["line18"]).toBe(0);
  });
  it("summarizes business property by holding period", () => {
    const r = form4684.compute({ business_properties: [{ description: "Truck", line20: 30000, line21: 5000, line23: 25000, line24: 0 }, { description: "Office building", line20: 400000, line21: 450000, line23: 500000, line24: 100000, long_term: true }] }, ctx);
    const biz = r.values["business_properties"] as ListRow[];
    expect(biz[0]!["line27"]).toBe(20000);
    expect(biz[1]!["line22"]).toBe(50000);
    expect(biz[1]!["line27"]).toBe(0);
    expect(r.values["line28"]).toBe(20000);
    expect(r.values["line30_bi"]).toBe(20000);
    expect(r.values["line31"]).toBe(-20000);
    expect(r.values["line36"]).toBe(50000);
    expect(r.values["line37"]).toBe(0);
    expect(r.values["line39"]).toBe(50000);
  });
});

describe("Phase 7d return wiring", () => {
  it("adds Form 8814 income and tax to the parent's return and places Form 461 on Schedule 1", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 120000, line3a: 0, line7: 0 }, form8814: [{ child_name: "Avery", child_ssn: "987654321", line1a: 1900, line2a: 1500, line2b: 900, line3: 600 }], form461: { line2: -720000, line3: 12000, line5: -40000, line10: 12000 } }, opts);
    const s1 = r.forms.find((x) => x.form === "f1040s1")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    const f8814 = r.forms.find((x) => x.form === "f8814")!;
    expect(s1.values["line8z"]).toBe(812);
    expect(String(s1.values["line8z_description"])).toContain("Form 8814");
    expect(s1.values["line8p"]).toBe(134000);
    expect(f1040.values["line3a"]).toBe(293);
    expect(f1040.values["line7"]).toBe(195);
    expect(f8814.values["line15"]).toBe(135);
    const base = await prepareReturn({ year: 2025, form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 120000, line3a: 293, line7: 195, line8: 812 }, schedule1: { line8z: 812, line8p: 134000 } }, opts);
    expect(Number(f1040.values["line16"])).toBe(Number(base.forms.find((x) => x.form === "f1040")!.values["line16"]) + 135);
  });
  it("carries Form 5405 to Schedule 2 and Schedule R, 8839, and 8396 to Schedule 3", async () => {
    const r = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 110000, you_65_or_older: true, line6a: 20000, line6b: 3000 },
      form5405: { line3: "c", line4: 7500, line5: 5000 },
      scheduleR: { box: "7", line21: 9000 },
      form8839: { children: [{ first_name: "Mia", last_name: "Sample", birth_year: "2021", identifying_number: "123456780", final: true, line5: 22400, benefits: 3000 }] },
      form8396: { line1: 9800, line2: 20 },
    }, opts);
    const s2 = r.forms.find((x) => x.form === "f1040s2")!;
    const s3 = r.forms.find((x) => x.form === "f1040s3")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    const f8839 = r.forms.find((x) => x.form === "f8839")!;
    const f8396 = r.forms.find((x) => x.form === "f8396")!;
    expect(s2.values["line10"]).toBe(2500);
    expect(f1040.values["line1f"] ?? 0).toBe(0);
    expect(f8839.values["line31"]).toBe(0);
    expect(s3.values["line6c"]).toBe(f8839.values["line18"]);
    expect(Number(f8839.values["line18"])).toBeGreaterThan(0);
    expect(f1040.values["line30"]).toBe(5000);
    expect(s3.values["line6g"]).toBe(f8396.values["line9"]);
    expect(f8396.values["line3"]).toBe(1960);
    const sR = r.forms.find((x) => x.form === "f1040r")!;
    expect(sR.values["line13a"]).toBe(17000);
    expect(sR.values["line14"]).toBe(f1040.values["line11"]);
    expect(f1040.values["line20"]).toBe(s3.values["line8"]);
  });
  it("places Form 4684 on Schedule A and Form 8824 gains on Schedule D", async () => {
    const r = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "single", line1a: 110000 },
      scheduleA: { line5a: 6000, line5b: 7000, line8a: 12000, line18: true },
      form4684: { federally_declared: true, fema_dr: "4879", properties: [{ description: "Residence", line2: 310000, line3: 180000, line5: 420000, line6: 160000 }] },
      form8824: { line15: 35000, line16: 820000, line18: 410000 },
      form982: { line1b: true, line2: 5000, line6: 5000 },
    }, opts);
    const sA = r.forms.find((x) => x.form === "f1040sa")!;
    const sD = r.forms.find((x) => x.form === "f1040sd")!;
    const f4684 = r.forms.find((x) => x.form === "f4684")!;
    expect(f4684.values["agi"]).toBeDefined();
    expect(sA.values["line15"]).toBe(f4684.values["line18"]);
    expect(Number(sA.values["line15"])).toBeGreaterThan(60000);
    expect(sD.values["line11"]).toBe(35000);
    expect(r.forms.map((x) => x.form)).toContain("f982");
  });
});
