import { describe, expect, it } from "vitest";
import { form5884 } from "../src/forms/form5884.ts";
import { form8846 } from "../src/forms/form8846.ts";
import { form8994 } from "../src/forms/form8994.ts";
import { form8586 } from "../src/forms/form8586.ts";
import { form8992 } from "../src/forms/form8992.ts";
import { form2439 } from "../src/forms/form2439.ts";
import { form8997 } from "../src/forms/form8997.ts";
import { form6765 } from "../src/forms/form6765.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { sampleValues } from "../src/samples.ts";
import type { FormId, ListRow } from "../src/types.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };
const opts = { renderBase: "https://clicktax.org/fill", rounding: "whole" as const };

describe("Phase 7e forms map to both PDFs", () => {
  const ids: FormId[] = ["f5884", "f8846", "f8994", "f8586", "f8992", "f2439", "f8997", "f6765"];
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

describe("Business credit forms", () => {
  it("Form 5884 applies the 25%, 40%, and 50% rates", () => {
    const r = form5884.compute(sampleValues("f5884", 2025), ctx);
    expect(r.values["line1a"]).toBe(3000);
    expect(r.values["line1b"]).toBe(12000);
    expect(r.values["line1c"]).toBe(5000);
    expect(r.values["line2"]).toBe(20000);
    expect(r.values["line4"]).toBe(21500);
    expect(r.values["line6"]).toBe(21500);
  });
  it("Form 8846 figures 7.65% of creditable tips", () => {
    const r = form8846.compute(sampleValues("f8846", 2025), ctx);
    expect(r.values["line3"]).toBe(78000);
    expect(r.values["line4"]).toBe(5967);
    expect(r.values["line6"]).toBe(6867);
    const supplied = form8846.compute({ line1: 84000, line2: 6000, line4: 4000, line4_over_base: true }, ctx);
    expect(supplied.values["line4"]).toBe(4000);
    expect(supplied.values["line6"]).toBe(4000);
  });
  it("Form 8994 scales the rate with the leave pay percentage", () => {
    const r = form8994.compute(sampleValues("f8994", 2025), ctx);
    expect(r.values["line1"]).toBe(7000);
    expect(r.values["line3"]).toBe(8200);
    const max = form8994.compute({ leave_wages: 10000, pay_rate: 100 }, ctx);
    expect(max.values["line1"]).toBe(2500);
    const min = form8994.compute({ leave_wages: 10000, pay_rate: 50 }, ctx);
    expect(min.values["line1"]).toBe(1250);
  });
  it("Form 8586 totals the building and pass-through credits", () => {
    const r = form8586.compute(sampleValues("f8586", 2025), ctx);
    expect(r.values["line5"]).toBe(22700);
    expect(r.values["line7"]).toBe(22700);
  });
});

describe("Form 6765", () => {
  it("builds Section F from the Section G components and figures the alternative simplified credit", () => {
    const r = form6765.compute(sampleValues("f6765", 2025), ctx);
    const rows = r.values["business_components"] as ListRow[];
    expect(rows[0]!["line53"]).toBe(230000);
    expect(r.values["total_line53"]).toBe(230000);
    expect(r.values["total_line56"]).toBe(26000);
    expect(r.values["line42"]).toBe(230000);
    expect(r.values["line45"]).toBe(26000);
    expect(r.values["line48"]).toBe(270000);
    expect(r.values["line20"]).toBe(270000);
    expect(r.values["line22"]).toBe(90000);
    expect(r.values["line23"]).toBe(180000);
    expect(r.values["line24"]).toBe(25200);
    expect(r.values["line26"]).toBe(25200);
    expect(r.values["line28"]).toBe(25200);
    expect(r.values["line30"]).toBe(25200);
    expect(r.values["line13"]).toBeUndefined();
  });
  it("figures the regular credit with the 280C reduction and the payroll tax election", () => {
    const r = form6765.compute({ method: "regular", lineA: true, line42: 500000, line6: 3, line7: 4000000, line33a: true, line34: 600000, line35: 30000 }, ctx);
    expect(r.values["line48"]).toBe(500000);
    expect(r.values["line8"]).toBe(120000);
    expect(r.values["line9"]).toBe(380000);
    expect(r.values["line10"]).toBe(250000);
    expect(r.values["line11"]).toBe(250000);
    expect(r.values["line13"]).toBe(39500);
    expect(r.values["line28"]).toBe(39500);
    expect(r.values["line34"]).toBe(500000);
    expect(r.values["line36"]).toBe(30000);
    expect(r.warnings.some((w) => w.includes("$500,000"))).toBe(true);
  });
  it("uses the 6% rate when the prior-year QREs are missing", () => {
    const r = form6765.compute({ line42: 100000 }, ctx);
    expect(r.values["line24"]).toBe(6000);
    expect(r.values["line26"]).toBe(6000);
  });
});

describe("Forms 8992, 2439, and 8997", () => {
  it("Form 8992 nets tested income against the deemed tangible return", () => {
    const r = form8992.compute(sampleValues("f8992", 2025), ctx);
    expect(r.values["line3"]).toBe(385000);
    expect(r.values["part2_line2"]).toBe(150000);
    expect(r.values["line3c"]).toBe(48000);
    expect(r.values["line4"]).toBe(102000);
    expect(r.values["line5"]).toBe(283000);
    expect(r.values["filer_name"]).toBe(r.values["name"]);
    const loss = form8992.compute({ line1: 10000, line2: 20000, qbai: 50000 }, ctx);
    expect(loss.values["line3"]).toBe(-10000);
    expect(loss.values["line5"]).toBe(0);
  });
  it("Form 2439 defaults the year and figures the basis increase", () => {
    const r = form2439.compute(sampleValues("f2439", 2025), ctx);
    expect(r.values["tax_year"]).toBe("25");
    expect(r.values["basis_increase"]).toBe(6636);
    const r24 = form2439.compute(sampleValues("f2439", 2024), { ...ctx, year: 2024 });
    expect(r24.values["tax_year"]).toBe("24");
    const bad = form2439.compute({ line1a: 1000, line1b: 800, line1d: 500 }, ctx);
    expect(bad.warnings.some((w) => w.includes("cannot exceed"))).toBe(true);
  });
  it("Form 8997 totals each part and builds Part IV from Parts I and II", () => {
    const r = form8997.compute(sampleValues("f8997", 2025), ctx);
    expect(r.values["part1_long"]).toBe(60000);
    expect(r.values["part2_short"]).toBe(15000);
    expect((r.values["holdings_end"] as ListRow[]).length).toBe(2);
    expect(r.values["part4_short"]).toBe(15000);
    expect(r.values["part4_long"]).toBe(60000);
    expect(r.warnings.some((w) => w.includes("code Z"))).toBe(true);
    const mismatch = form8997.compute({ holdings_begin: [{ ein: "83-1234567", long_term: 60000 }], inclusion_events: [{ ein: "83-1234567", long_term: 20000 }], holdings_end: [{ ein: "83-1234567", long_term: 60000 }] }, ctx);
    expect(mismatch.warnings.some((w) => w.includes("do not equal"))).toBe(true);
    expect(mismatch.values["part3_long"]).toBe(20000);
  });
});

describe("Phase 7e return wiring", () => {
  it("feeds the business credits into Form 3800 and GILTI into Schedule 1", async () => {
    const r = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 160000 },
      form5884: { line1b_wages: 30000 },
      form8846: { line1: 84000, line2: 6000 },
      form8994: { lineA: true, lineB: true, lineC: true, lineD: true, leave_wages: 40000, pay_rate: 70 },
      form8586: { line4: 4200 },
      form6765: { line42: 100000, line21: 240000, eligible_small_business: true },
      form8992: { line1: 50000, line2: 0, qbai: 100000 },
    }, opts);
    const f3800 = r.forms.find((x) => x.form === "f3800")!;
    const s1 = r.forms.find((x) => x.form === "f1040s1")!;
    const s3 = r.forms.find((x) => x.form === "f1040s3")!;
    for (const id of ["f5884", "f8846", "f8994", "f8586", "f6765", "f8992"]) expect(r.forms.some((x) => x.form === id)).toBe(true);
    const part3 = f3800.values["part3_rows"] as ListRow[] | undefined;
    const rows = (part3 ?? (f3800.values["credits"] as ListRow[])).filter((row) => ["1c", "4b", "4d", "4f", "4i", "4j"].includes(String(row["line"])));
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(s1.values["line8o"]).toBe(40000);
    expect(Number(f3800.values["line38"])).toBeGreaterThan(0);
    expect(s3.values["line6a"]).toBe(f3800.values["line38"]);
    expect(r.totals["general_business_credit"]).toBe(Number(f3800.values["line38"]));
  });
  it("places Form 2439 on Schedule D and Schedule 3 and answers the Schedule D QOF question from Form 8997", async () => {
    const r = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "single", line1a: 90000 },
      form2439: [{ ric_name: "Fund A", line1a: 8400, line1b: 1200, line1d: 300, line2: 1764 }, { ric_name: "Fund B", line1a: 1600, line2: 336 }],
      form8997: { holdings_begin: [{ ein: "83-1234567", long_term: 60000 }], inclusion_events: [{ ein: "83-1234567", date: "05/01/2025", description: "sale of 100 shares", long_term: 60000 }], holdings_end: [] },
    }, opts);
    const sD = r.forms.find((x) => x.form === "f1040sd")!;
    const s3 = r.forms.find((x) => x.form === "f1040s3")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(r.forms.filter((x) => x.form === "f2439").length).toBe(2);
    expect(r.forms.some((x) => x.form === "f8997")).toBe(true);
    expect(sD.values["line11"]).toBe(10000);
    expect(sD.values["line19"]).toBe(1200);
    expect(sD.values["line18"]).toBe(300);
    expect(sD.values["qof_disposal"]).toBe(true);
    expect(s3.values["line13a"]).toBe(2100);
    expect(Number(f1040.values["line31"])).toBe(Number(s3.values["line15"]));
  });
});
