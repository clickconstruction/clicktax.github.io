import { describe, expect, it } from "vitest";
import { form5695 } from "../src/forms/form5695.ts";
import { form4797 } from "../src/forms/form4797.ts";
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

describe("Form 5695", () => {
  it("applies the 30% rates and the per-item and annual caps", () => {
    const r = form5695.compute({ line1: 24000, line5a: true, line5b: 9000, line12: 500, line14: 5200, line18a: 3200, door1_cost: 900, door2_cost: 700, door3_cost: 600, doors_other_cost: 400, windows_top4_cost: 6000, ac1_cost: 5000, line26b: 600, heatpump1_cost: 8500, line31: 4000 }, { year: 2025, rounding: "whole" });
    expect(r.values["line6b"]).toBe(9900);
    expect(r.values["line13"]).toBe(10400);
    expect(r.values["line15"]).toBe(5200);
    expect(r.values["line16"]).toBe(5200);
    expect(r.values["line18b"]).toBe(960);
    expect(r.values["line19c_2025"]).toBe(250);
    expect(r.values["line19g_2025"]).toBe(510);
    expect(r.values["line19h"]).toBe(500);
    expect(r.values["line20d"]).toBe(600);
    expect(r.values["line22d"]).toBe(600);
    expect(r.values["line26c"]).toBe(150);
    expect(r.values["line27"]).toBe(960 + 500 + 600 + 600 + 150);
    expect(r.values["line28"]).toBe(1200);
    expect(r.values["line29h"]).toBe(2000);
    expect(r.values["line30"]).toBe(3200);
    expect(r.values["line32"]).toBe(3200);
  });
  it("maps both layouts", () => {
    clean("f5695", { name: "A", ssn: "111223333", home_street: "1 St", home_city: "X", home_state: "IL", home_zip: "60000", line1: 100, line2: 100, line3: 100, line4: 100, line5a: true, line5b: 100, line7a: true, fuel_cell_home_street: "1 St", line7c: true, line8: 1000, line10_kw: "2", line10_kw_decimal: "5", line12: 10, line14: 1000, line17a: true, line17b: true, line17c: true, improvement_home_street: "1 St", improvement_home_city: "X", improvement_home_state: "IL", improvement_home_zip: "60000", line17e: false, line18a: 100, door1_cost: 100, door1_pin1: "ABCD", door1_pin2: "1", door2_cost: 50, door3_cost: 50, doors_other_cost: 10, windows_top4_cost: 100, window1_cost: 50, windows_other_cost: 10, line21a: true, line21b: true, energy_property_homes: [{ street: "1 St", city: "X", state: "IL", zip: "60000" }], ac1_cost: 100, ac_other_cost: 10, wh1_cost: 100, wh_other_cost: 10, furnace1_cost: 100, furnace_other_cost: 10, line25a: true, panel_cost: 100, line26a: true, line26b: 100, heatpump1_cost: 100, heatpump_other_cost: 10, hpwh1_cost: 100, hpwh_other_cost: 10, biomass1_cost: 100, biomass_other_cost: 10, line31: 1000, line32_joint: true }, 55);
  });
});

describe("Form 4797", () => {
  it("nets section 1231 and recaptures section 1245 and 1250 depreciation", () => {
    const r = form4797.compute({ part1_sales: [{ description: "Land", proceeds: 45000, cost: 32000 }], properties: [{ description: "Skid steer", kind: "1245", line20: 28000, line21: 52000, line22: 52000 }, { description: "Rental duplex", kind: "1250", line20: 400000, line21: 300000, line22: 60000 }], line8: 5000 }, { year: 2025, rounding: "whole" });
    const props = r.values["properties"] as Array<Record<string, unknown>>;
    expect(props[0]!["line24"]).toBe(28000);
    expect(props[0]!["line25b"]).toBe(28000);
    expect(props[1]!["line24"]).toBe(160000);
    expect(props[1]!["line26g"]).toBe(0);
    expect(props[1]!["unrecaptured_1250"]).toBe(60000);
    expect(r.values["line30"]).toBe(188000);
    expect(r.values["line31"]).toBe(28000);
    expect(r.values["line32"]).toBe(160000);
    expect(r.values["line6"]).toBe(160000);
    expect(r.values["line7"]).toBe(173000);
    expect(r.values["line9"]).toBe(168000);
    expect(r.values["line12"]).toBe(5000);
    expect(r.values["line13"]).toBe(28000);
    expect(r.values["line18b"]).toBe(33000);
    expect(r.values["unrecaptured_1250_total"]).toBe(60000);
    const loss = form4797.compute({ part1_sales: [{ description: "Truck", proceeds: 5000, depreciation: 10000, cost: 30000 }] }, { year: 2024, rounding: "whole" });
    expect(loss.values["line7"]).toBe(-15000);
    expect(loss.values["line11"]).toBe(-15000);
    expect(loss.values["line18b"]).toBe(-15000);
  });
  it("maps both layouts including the fourth Part III column", () => {
    const row = { description: "x", date_acquired: "01/01/2020", date_sold: "01/01/2025", proceeds: 100, depreciation: 10, cost: 50 };
    clean("f4797", { name: "A", ssn: "111223333", line1a: 1, line1b: 1, line1c: 1, part1_sales: [row, row, row, row], line3: 1, line4: 1, line5: 1, line8: 1, part2_sales: [row, row, row, row], line14: 1, line15: 1, line16: 1, line18a: 1, properties: [1, 2, 3, 4].map((i) => ({ description: `P${i}`, date_acquired: "01/01/2020", date_sold: "01/01/2025", kind: i % 2 ? "1245" : "1250", line20: 1000, line21: 800, line22: 300, line26a: 50, line26d: 10, line26f: 0 })), line33a: 10, line33b: 10, line34a: 5, line34b: 5 }, 130);
  });
  it("wires 4797 and 5695 into the return", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 90000 }, form4797: { properties: [{ description: "Duplex", kind: "1250", line20: 400000, line21: 300000, line22: 60000 }], part2_sales: [{ description: "Trailer", proceeds: 2000, depreciation: 1000, cost: 4000 }] }, form5695: { line1: 20000, line18a: 2000 } },
      { renderBase: "https://clicktax.org" },
    );
    const ids = r.forms.map((x) => x.form);
    expect(ids).toContain("f4797");
    expect(ids).toContain("f1040sd");
    expect(ids).toContain("f5695");
    expect(ids).toContain("f1040s3");
    const sD = r.forms.find((x) => x.form === "f1040sd")!;
    const s1 = r.forms.find((x) => x.form === "f1040s1")!;
    const s3 = r.forms.find((x) => x.form === "f1040s3")!;
    const e = r.forms.find((x) => x.form === "f5695")!;
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    expect(sD.values["line11"]).toBe(160000);
    expect(sD.values["line19"]).toBe(60000);
    expect(s1.values["line4"]).toBe(-1000);
    expect(Number(e.values["line14"])).toBe(Number(f1040.values["line18"]) + Number(s3.values["line8"]) - Number(s3.values["line8"]));
    expect(s3.values["line5a"]).toBe(e.values["line15"]);
    expect(s3.values["line5b"]).toBe(e.values["line32"]);
    expect(Number(e.values["line15"]) + Number(e.values["line32"])).toBeLessThanOrEqual(Number(e.values["line14"]));
  });
});
