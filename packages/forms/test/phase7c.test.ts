import { describe, expect, it } from "vitest";
import { form8615 } from "../src/forms/form8615.ts";
import { scheduleH } from "../src/forms/scheduleH.ts";
import { form8801 } from "../src/forms/form8801.ts";
import { form8990 } from "../src/forms/form8990.ts";
import { form8853 } from "../src/forms/form8853.ts";
import { form3903 } from "../src/forms/form3903.ts";
import { form8911 } from "../src/forms/form8911.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { sampleValues } from "../src/samples.ts";
import { incomeTax } from "../src/tax.ts";
import type { FormId, ListRow } from "../src/types.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };
const opts = { renderBase: "https://clicktax.org/fill", rounding: "whole" as const };

describe("Phase 7c forms map to both PDFs", () => {
  const ids: FormId[] = ["f8615", "f1040sh", "f8801", "f8990", "f8853", "f3903", "f8911"];
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

describe("Form 8615", () => {
  it("stacks the child's net unearned income on the parent's taxable income", () => {
    const r = form8615.compute(sampleValues("f8615", 2025), ctx);
    expect(r.values["line2"]).toBe(2700);
    expect(r.values["line3"]).toBe(7100);
    expect(r.values["line5"]).toBe(7100);
    expect(r.values["line8"]).toBe(125100);
    expect(r.values["line9"]).toBe(incomeTax(125100, "mfj", 2025));
    expect(r.values["line11"]).toBe(incomeTax(125100, "mfj", 2025) - 15730);
    expect(r.values["line13"]).toBe(r.values["line11"]);
    expect(r.values["line14"]).toBe(1250);
    expect(r.values["line15"]).toBe(incomeTax(1250, "single", 2025));
    expect(r.values["line16"]).toBe(Number(r.values["line13"]) + Number(r.values["line15"]));
    expect(r.values["line17"]).toBe(incomeTax(8350, "single", 2025));
    expect(r.values["line18"]).toBe(Math.max(Number(r.values["line16"]), Number(r.values["line17"])));
    const two = form8615.compute({ parent_filing_status: "single", line1: 5000, line4: 4000, line6: 80000, line7: 2000, line10: 12000 }, ctx);
    expect(two.values["line12a"]).toBe(4300);
    expect(two.values["line12b"]).toBe("535");
    const r24 = form8615.compute({ line1: 3000, line4: 3000 }, { year: 2024, rounding: "whole" });
    expect(r24.values["line2"]).toBe(2600);
    expect(r24.values["line3"]).toBe(400);
  });
});

describe("Schedule H", () => {
  it("figures the employment taxes and Section A FUTA", () => {
    const r = scheduleH.compute(sampleValues("f1040sh", 2025), ctx);
    expect(r.values["line2"]).toBe(2976);
    expect(r.values["line3"]).toBe(24000);
    expect(r.values["line4"]).toBe(696);
    expect(r.values["line8"]).toBe(2976 + 696 + 1800);
    expect(r.values["line16"]).toBe(42);
    expect(r.values["line25"]).toBe(5472);
    expect(r.values["line26"]).toBe(5514);
    expect(r.values["lineA"]).toBe(true);
    expect(r.values["line9"]).toBe(true);
    expect(r.values["line27"]).toBe(true);
  });
  it("uses Section B with the state credit when contributions were paid to two states", () => {
    const r = scheduleH.compute({ line1: 10000, states: [{ state: "TX", taxable_wages: 5000, experience_rate: 0.027, contributions: 135 }, { state: "OK", taxable_wages: 2000, experience_rate: 0.054, contributions: 108 }], line20: 7000, line10: false }, ctx);
    const rows = r.values["states"] as ListRow[];
    expect(rows[0]!["col_e"]).toBe(270);
    expect(rows[0]!["col_f"]).toBe(135);
    expect(rows[0]!["col_g"]).toBe(135);
    expect(rows[1]!["col_g"]).toBe(0);
    expect(r.values["line18_g"]).toBe(135);
    expect(r.values["line18_h"]).toBe(243);
    expect(r.values["line19"]).toBe(378);
    expect(r.values["line21"]).toBe(420);
    expect(r.values["line22"]).toBe(378);
    expect(r.values["line23"]).toBe(378);
    expect(r.values["line24"]).toBe(42);
    expect(r.values["line26"]).toBe(42 + 1240 + 290);
  });
});

describe("Form 8801", () => {
  it("refigures last year's AMT on exclusion items and allows the credit", () => {
    const r = form8801.compute(sampleValues("f8801", 2025), ctx);
    expect(r.values["line4"]).toBe(352000);
    expect(r.values["line5"]).toBe(133300);
    expect(r.values["line6"]).toBe(1218700);
    expect(r.values["line9"]).toBe(133300);
    expect(r.values["line10"]).toBe(218700);
    expect(r.values["line11"]).toBe(56862);
    expect(r.values["line15"]).toBe(2862);
    expect(r.values["line18"]).toBe(14238 - 2862);
    expect(r.values["line21"]).toBe(13976);
    expect(r.values["line24"]).toBe(9000);
    expect(r.values["line25"]).toBe(9000);
    expect(r.values["line26"]).toBe(4976);
    const high = form8801.compute({ filing_status: "single", line1: 400000, line16: 20000, line22: 50000, line23: 30000 }, ctx);
    expect(high.values["line11"]).toBe(Math.round((400000 - 85700) * 0.28 - 4652));
    const r24 = form8801.compute({ filing_status: "mfj", line1: 200000, line16: 5000 }, { year: 2024, rounding: "whole" });
    expect(r24.values["line5"]).toBe(126500);
    expect(r24.values["line11"]).toBe(Math.round((200000 - 126500) * 0.26));
  });
  it("uses Part III when the prior year had capital gains", () => {
    const r = form8801.compute({ filing_status: "mfj", line1: 300000, line28: 50000, line35: 150000, line16: 10000, line22: 40000, line23: 20000 }, ctx);
    expect(r.values["line27"]).toBe(300000 - 133300);
    expect(r.values["line31"]).toBe(50000);
    expect(r.values["line32"]).toBe(116700);
    expect(r.values["line33"]).toBe(Math.round(116700 * 0.26));
    expect(r.values["line36"]).toBe(0);
    expect(r.values["line45"]).toBe(50000);
    expect(r.values["line46"]).toBe(7500);
    expect(r.values["line53"]).toBe(Math.round(116700 * 0.26) + 7500);
    expect(r.values["line11"]).toBe(r.values["line55"]);
  });
});

describe("Form 8990", () => {
  it("limits business interest to 30% of adjusted taxable income plus interest income", () => {
    const r = form8990.compute(sampleValues("f8990", 2025), ctx);
    const rows = r.values["partnerships"] as ListRow[];
    expect(rows[0]!["total_excess_expense"]).toBe(12000);
    expect(rows[0]!["treated_as_paid"]).toBe(12000);
    expect(rows[0]!["carryforward"]).toBe(0);
    expect(r.values["line3"]).toBe(12000);
    expect(r.values["line5"]).toBe(192000);
    expect(r.values["line14"]).toBe(30000);
    expect(r.values["line22"]).toBe(930000);
    expect(r.values["line25"]).toBe(6000);
    expect(r.values["line26"]).toBe(279000);
    expect(r.values["line29"]).toBe(285000);
    expect(r.values["line30"]).toBe(192000);
    expect(r.values["line31"]).toBe(0);
    const limited = form8990.compute({ entity_type: "partnership", line1: 500000, line6: 1000000, line23: 20000 }, ctx);
    expect(limited.values["line30"]).toBe(320000);
    expect(limited.values["line31"]).toBe(180000);
    expect(limited.values["line33"]).toBe(480000);
    expect(limited.values["line34"]).toBe(0);
    expect(limited.values["line35"]).toBe("0");
  });
});

describe("Form 8853", () => {
  it("figures the Archer MSA deduction and the LTC per diem limit", () => {
    const r = form8853.compute(sampleValues("f8853", 2025), ctx);
    expect(r.values["line5"]).toBe(2400);
    expect(r.values["line6c"]).toBe(1800);
    expect(r.values["line8"]).toBe(0);
    expect(r.values["line9b"]).toBe(0);
    expect(r.values["line20"]).toBe(36000);
    expect(r.values["line21"]).toBe(33600);
    expect(r.values["line23"]).toBe(33600);
    expect(r.values["line25"]).toBe(33600);
    expect(r.values["line26"]).toBe(2400);
    const taxed = form8853.compute({ line6a: 5000, line7: 2000, line10: 1000 }, { year: 2024, rounding: "whole" });
    expect(taxed.values["line8"]).toBe(3000);
    expect(taxed.values["line9b"]).toBe(600);
    expect(taxed.values["line12"]).toBe(1000);
    expect(taxed.values["line13b"]).toBe(500);
  });
});

describe("Forms 3903 and 8911", () => {
  it("compute the moving deduction and the refueling credit limit", () => {
    const m = form3903.compute(sampleValues("f3903", 2025), ctx);
    expect(m.values["line3"]).toBe(5550);
    expect(m.values["line5"]).toBe(2750);
    expect(m.values["line5_more"]).toBe(true);
    const excess = form3903.compute({ armed_forces: true, line1: 1000, line4: 1500 }, ctx);
    expect(excess.values["line5"]).toBe(0);
    expect(excess.warnings.some((w) => w.includes("line 1h"))).toBe(true);
    const r = form8911.compute(sampleValues("f8911", 2025), ctx);
    expect(r.values["line6c"]).toBe(1800);
    expect(r.values["line7"]).toBe(12400);
    expect(r.values["line9"]).toBe(2600);
    expect(r.values["line10"]).toBe(1000);
    const p24 = prepareFormValues("f8911", 2024, { line1: 5, line4: 7 }, "whole");
    expect(p24.pdfFields["topmostSubform[0].Page1[0].f1_3[0]"]).toBe("5");
    expect(p24.pdfFields["topmostSubform[0].Page1[0].f1_6[0]"]).toBe("7");
    const p25 = prepareFormValues("f8911", 2025, { line1: 5, line4: 7 }, "whole");
    expect(p25.pdfFields["topmostSubform[0].Page1[0].f1_04[0]"]).toBe("5");
    expect(p25.pdfFields["topmostSubform[0].Page1[0].f1_07[0]"]).toBe("7");
    expect(p25.pdfFields["topmostSubform[0].Page1[0].f1_03[0]"]).toBe("1");
  });
});

describe("Phase 7c return wiring", () => {
  it("replaces the child's tax with Form 8615 line 18", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { first_name: "Avery", last_name: "Sample", ssn: "987654321", filing_status: "single", digital_assets: false, line1a: 3000, line2b: 9000, claimed_as_dependent_you: true }, form8615: { parent_name: "Jane Q Sample", parent_ssn: "123456789", parent_filing_status: "mfj", line6: 118000, line10: 15730 } }, opts);
    const f8615 = r.forms.find((x) => x.form === "f8615")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(f8615.values["line1"]).toBe(9000);
    expect(f8615.values["line4"]).toBe(f1040.values["line15"]);
    expect(f1040.values["line16"]).toBe(f8615.values["line18"]);
    expect(Number(f1040.values["line16"])).toBeGreaterThan(incomeTax(Number(f1040.values["line15"]), "single", 2025));
  });
  it("carries Schedule H, Form 8853, and Form 3903 to Schedules 1 and 2", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 90000 }, scheduleH: { line1: 24000, line7: 1800, line13: "TX", line14: 648, line15: 7000 }, form8853: { line2: 2400, line3: 2925, line4: 61000, line6a: 5000, line7: 2000 }, form3903: { armed_forces: true, line1: 4200, line2: 1350, line4: 2800 } }, opts);
    const s1 = r.forms.find((x) => x.form === "f1040s1")!;
    const s2 = r.forms.find((x) => x.form === "f1040s2")!;
    expect(s1.values["line23"]).toBe(2400);
    expect(s1.values["line8e"]).toBe(3000);
    expect(s1.values["line14"]).toBe(2750);
    expect(s2.values["line9"]).toBe(5514);
    expect(s2.values["line17z"]).toBe(600);
    expect(s2.values["line17z_description"]).toBe("MSA");
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(f1040.values["line23"]).toBe(s2.values["line21"]);
    const ids = r.forms.map((x) => x.form);
    expect(ids).toContain("f1040sh");
    expect(ids).toContain("f8853");
    expect(ids).toContain("f3903");
  });
  it("feeds Forms 8801 and 8911 into Schedule 3 and the refueling business credit into Form 3800", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 160000 }, form8801: { line1: 310000, line2: 42000, line14: 54000, line16: 14238, line19: 2600 }, form8911: { line1: 3000, line4: 1000 }, form8990: { line1: 1000, line6: 100000 } }, opts);
    const s3 = r.forms.find((x) => x.form === "f1040s3")!;
    const f8801 = r.forms.find((x) => x.form === "f8801")!;
    const f8911 = r.forms.find((x) => x.form === "f8911")!;
    const f3800 = r.forms.find((x) => x.form === "f3800")!;
    expect(Number(f8801.values["line22"])).toBeGreaterThan(0);
    expect(s3.values["line6b"]).toBe(f8801.values["line25"]);
    // The minimum tax credit used all of the room above the tentative minimum tax, so nothing is left for the personal refueling credit.
    expect(f8911.values["line10"]).toBe(0);
    expect(s3.values["line6j"]).toBeUndefined();
    const alone = await prepareReturn({ year: 2025, form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 160000 }, form8911: { line4: 1000 } }, opts);
    expect(alone.forms.find((x) => x.form === "f1040s3")!.values["line6j"]).toBe(1000);
    const part3 = f3800.values["part3"] as ListRow[];
    expect(part3[18]!["nonpassive"]).toBe(3000); // line 1s
    expect(s3.values["line6a"]).toBe(f3800.values["line38"]);
    expect(r.forms.map((x) => x.form)).toContain("f8990");
  });
});
