import { describe, expect, it } from "vitest";
import { form8995a, netLosses } from "../src/forms/form8995a.ts";
import { form8995aa } from "../src/forms/form8995aa.ts";
import { form8995ab } from "../src/forms/form8995ab.ts";
import { form8995ac } from "../src/forms/form8995ac.ts";
import { form8995ad } from "../src/forms/form8995ad.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { sampleValues } from "../src/samples.ts";
import type { FormId, ListRow } from "../src/types.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };
const opts = { renderBase: "https://clicktax.org/fill", rounding: "whole" as const };

describe("Form 8995-A and its schedules map to both PDFs", () => {
  const ids: FormId[] = ["f8995a", "f8995aa", "f8995ab", "f8995ac", "f8995ad"];
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

describe("Form 8995-A", () => {
  it("applies the wage/UBIA limit, the phase-in, and the SSTB percentage inside the range", () => {
    const r = form8995a.compute(sampleValues("f8995a", 2025), ctx);
    const rows = r.values["businesses"] as ListRow[];
    expect(rows[0]!["line3"]).toBe(84000);
    expect(rows[0]!["line10"]).toBe(75000);
    expect(rows[0]!["line11"]).toBe(75000);
    expect(rows[0]!["line19"]).toBe(9000);
    expect(rows[0]!["line25"]).toBe(4086);
    expect(rows[0]!["line12"]).toBe(79914);
    expect(rows[0]!["line15"]).toBe(79914);
    expect(rows[1]!["line2"]).toBe(32760);
    expect(rows[1]!["line4"]).toBe(10920);
    expect(rows[1]!["line15"]).toBe(6056);
    expect(r.values["line16"]).toBe(85970);
    expect(r.values["line24"]).toBe("45.4");
    expect(r.values["line21"]).toBe(394600);
    expect(r.values["line31"]).toBe(1000);
    expect(r.values["line32"]).toBe(86970);
    expect(r.values["line36"]).toBe(85600);
    expect(r.values["line39"]).toBe(85600);
  });
  it("excludes an SSTB above the range, skips the wage limit below the threshold, and nets losses", () => {
    const high = form8995a.compute({ filing_status: "single", line33: 300000, businesses: [{ name: "Law", sstb: true, qbi: 200000, w2_wages: 80000 }, { name: "Shop", qbi: 100000, w2_wages: 10000, ubia: 400000 }] }, ctx);
    const rows = high.values["businesses"] as ListRow[];
    expect(rows[0]!["line15"]).toBe(0);
    expect(rows[1]!["line9"]).toBe(12500);
    expect(rows[1]!["line15"]).toBe(12500);
    expect(high.warnings.some((w) => w.includes("no deduction"))).toBe(true);
    const low = form8995a.compute({ filing_status: "single", line33: 150000, businesses: [{ name: "Shop", patron: true, qbi: 100000, patron_qbi: 40000, patron_wages: 30000 }] }, ctx);
    const lr = low.values["businesses"] as ListRow[];
    expect(lr[0]!["line13"]).toBe(20000);
    expect(lr[0]!["line14"]).toBe(3600);
    expect(lr[0]!["line15"]).toBe(16400);
    expect(lr[0]!["line4"]).toBeUndefined();
    const netted = form8995a.compute({ filing_status: "single", line33: 250000, qbi_loss_carryforward: 15000, businesses: [{ name: "A", qbi: 100000, w2_wages: 60000 }, { name: "B", qbi: 50000, w2_wages: 30000 }, { name: "C", qbi: -30000 }] }, ctx);
    const nr = netted.values["businesses"] as ListRow[];
    expect(nr[0]!["line2"]).toBe(70000);
    expect(nr[1]!["line2"]).toBe(35000);
    expect(nr[2]!["line2"]).toBe(0);
    expect(netted.values["qbi_loss_carryforward_next"]).toBe(0);
  });
  it("carries a remaining loss forward", () => {
    const n = netLosses([20000, -50000], 0);
    expect(n.adjusted).toEqual([0, 0]);
    expect(n.netted).toBe(20000);
    expect(n.carryforward).toBe(30000);
  });
});

describe("Schedules A, B, C, and D (Form 8995-A)", () => {
  it("Schedule A figures the applicable percentage", () => {
    const r = form8995aa.compute(sampleValues("f8995aa", 2025), ctx);
    const rows = r.values["businesses"] as ListRow[];
    expect(r.values["line7"]).toBe(22700);
    expect(r.values["line9"]).toBe("0.454");
    expect(r.values["line10"]).toBe("54.6");
    expect(rows[0]!["line11"]).toBe(32760);
    expect(rows[0]!["line12"]).toBe(10920);
    expect(rows[0]!["line13"]).toBe(5460);
    expect(r.values["line17"]).toBe(4000);
    expect(r.values["line24"]).toBe(2184);
  });
  it("Schedule B totals the aggregation", () => {
    const r = form8995ab.compute(sampleValues("f8995ab", 2025), ctx);
    expect(r.values["line4_qbi"]).toBe(75000);
    expect(r.values["line4_wages"]).toBe(30000);
    expect(r.values["line4_ubia"]).toBe(30000);
  });
  it("Schedule C allocates the netted losses in proportion to income", () => {
    const r = form8995ac.compute(sampleValues("f8995ac", 2025), ctx);
    const rows = r.values["businesses"] as ListRow[];
    expect(r.values["line3"]).toBe(45000);
    expect(r.values["line4"]).toBe(150000);
    expect(r.values["line5"]).toBe(45000);
    expect(r.values["line6"]).toBe(0);
    expect(rows[0]!["reduction"]).toBe(30000);
    expect(rows[0]!["adjusted"]).toBe(70000);
    expect(rows[1]!["adjusted"]).toBe(35000);
    expect(rows[2]!["adjusted"]).toBe(0);
  });
  it("Schedule D figures the patron reduction", () => {
    const r = form8995ad.compute(sampleValues("f8995ad", 2025), ctx);
    const rows = r.values["businesses"] as ListRow[];
    expect(rows[0]!["line3"]).toBe(7200);
    expect(rows[0]!["line5"]).toBe(15000);
    expect(rows[0]!["line6"]).toBe(7200);
  });
});

describe("Form 8995-A in a full return", () => {
  it("replaces Form 8995 above the threshold, defaults W-2 wages from Schedule C, and feeds Form 1040 line 13", async () => {
    const r = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 0 },
      scheduleC: [{ principal_business: "Plumbing", accounting_method: "cash", material_participation: true, line1: 700000, line26: 150000 }],
      form4562: [{ business: 1, assets: [{ description: "Service van", date_placed: "03/15/2022", cost: 60000, life: 5 }, { description: "Old lathe", date_placed: "06/01/2010", cost: 20000, life: 7 }] }],
    }, opts);
    const a = r.forms.find((x) => x.form === "f8995a")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(a).toBeDefined();
    expect(r.forms.some((x) => x.form === "f8995")).toBe(false);
    const rows = a.values["businesses"] as ListRow[];
    expect(rows[0]!["w2_wages"]).toBe(150000);
    expect(rows[0]!["ubia"]).toBe(60000);
    expect(Number(a.values["line33"])).toBeGreaterThan(394600);
    expect(Number(a.values["line39"])).toBeGreaterThan(0);
    expect(f1040.values["line13"]).toBe(a.values["line39"]);
    expect(r.totals["qbi_deduction"]).toBe(Number(a.values["line39"]));
    expect(r.statements.some((s) => s.title.includes("8995-A"))).toBe(true);
  });
  it("keeps Form 8995 below the threshold and attaches Schedule A for an SSTB in the phase-in range", async () => {
    const low = await prepareReturn({ year: 2025, form1040: { ...sampleValues("f1040", 2025), filing_status: "single", line1a: 20000 }, scheduleC: [{ principal_business: "Consulting", accounting_method: "cash", material_participation: true, line1: 60000 }] }, opts);
    expect(low.forms.some((x) => x.form === "f8995")).toBe(true);
    expect(low.forms.some((x) => x.form === "f8995a")).toBe(false);
    const mid = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "single", line1a: 150000 },
      scheduleC: [{ principal_business: "Consulting", accounting_method: "cash", material_participation: true, line1: 90000, line26: 20000 }],
      form8995a: { businesses: [{ name: "Consulting", tin: "123456789", sstb: true, qbi: 80000, w2_wages: 20000 }] },
    }, opts);
    expect(mid.forms.some((x) => x.form === "f8995a")).toBe(true);
    expect(mid.forms.some((x) => x.form === "f8995aa")).toBe(true);
    const a = mid.forms.find((x) => x.form === "f8995a")!;
    expect(Number(a.values["line39"])).toBeGreaterThan(0);
  });
});
