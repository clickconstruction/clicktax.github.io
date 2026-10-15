import { describe, expect, it } from "vitest";
import { decodePayload } from "../src/engine/link.ts";
import { prepareReturn } from "../src/engine/return.ts";

describe("prepareReturn", () => {
  it("assembles Schedule C -> SE -> 1 -> 2 -> 1040 for a 2025 sole proprietor", async () => {
    const r = await prepareReturn(
      {
        year: 2025,
        form1040: { first_name: "Robert", last_name: "Douglas", ssn: "123456789", filing_status: "single", digital_assets: false, line25a: 0, line26: 20000 },
        scheduleC: [{ principal_business: "Plumbing contractor", business_code: "238220", line1: 120000, line2: 2000, line6: 500, line8: 1200, line9: 4300, line11: 15000, line22: 8000, line24b: 900, accounting_method: "cash", material_participation: true, payments_require_1099: true, filed_required_1099: true, line44a_business_miles: 12000 }],
      },
      { renderBase: "https://clicktax.org" },
    );
    const ids = r.forms.map((f) => f.form);
    expect(ids).toEqual(["f1040", "f1040s1", "f1040s2", "f1040sc", "f1040sse"]);
    const se = r.forms.find((f) => f.form === "f1040sse")!;
    expect(se.values["line2"]).toBe(89100);
    expect(se.values["line12"]).toBe(12589);
    const s1 = r.forms.find((f) => f.form === "f1040s1")!;
    expect(s1.values["line3"]).toBe(89100);
    expect(s1.values["line15"]).toBe(6295);
    expect(s1.values["line10"]).toBe(89100);
    expect(s1.values["line26"]).toBe(6295);
    const s2 = r.forms.find((f) => f.form === "f1040s2")!;
    expect(s2.values["line4"]).toBe(12589);
    expect(s2.values["line21"]).toBe(12589);
    const f1040 = r.forms.find((f) => f.form === "f1040")!;
    expect(f1040.values["line8"]).toBe(89100);
    expect(f1040.values["line10"]).toBe(6295);
    expect(f1040.values["line11"]).toBe(82805);
    expect(f1040.values["line12"]).toBe(15750);
    expect(f1040.values["line15"]).toBe(67055);
    expect(f1040.values["line23"]).toBe(12589);
    expect(r.totals.total_tax).toBe(Number(f1040.values["line24"]));
    expect(r.link.startsWith("https://clicktax.org/fill#v1.")).toBe(true);
    const payload = await decodePayload(new URL(r.link).hash);
    expect(payload.forms.length).toBe(5);
    expect(payload.year).toBe(2025);
    // name and SSN propagate to every schedule header
    for (const f of r.forms) {
      expect(f.values["name"] ?? f.values["first_name"]).toBeTruthy();
    }
  });
  it("omits Schedule SE under $400 and handles a spouse business on a joint return", async () => {
    const r = await prepareReturn(
      {
        year: 2024,
        form1040: { first_name: "A", last_name: "B", ssn: "111111111", spouse_first_name: "C", spouse_last_name: "D", spouse_ssn: "222222222", filing_status: "mfj", digital_assets: false, line1a: 90000 },
        scheduleC: [{ line1: 300 }, { owner: "spouse", line1: 40000, line11: 5000 }],
      },
      { renderBase: "https://clicktax.org" },
    );
    const ses = r.forms.filter((f) => f.form === "f1040sse");
    expect(ses.length).toBe(1);
    expect(ses[0]!.values["name"]).toBe("C D");
    expect(ses[0]!.values["ssn"]).toBe("222222222");
    expect(r.warnings.some((w) => w.includes("not required"))).toBe(true);
    const s1 = r.forms.find((f) => f.form === "f1040s1")!;
    expect(s1.values["line3"]).toBe(35300);
  });
});

describe("prepareReturn with Schedule 8812", () => {
  it("feeds the child tax credit and the additional child tax credit into Form 1040", async () => {
    const r = await prepareReturn(
      {
        year: 2025,
        form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "hoh", digital_assets: false, line1a: 28000, line25a: 500, dependents: [{ name: "Kid One", ssn: "111223333", relationship: "Daughter", child_tax_credit: true }, { name: "Grandpa", ssn: "111224444", relationship: "Father", other_dependents_credit: true }] },
        scheduleC: [{ line1: 12000, line22: 2000, accounting_method: "cash", material_participation: true }],
      },
      { renderBase: "https://clicktax.org" },
    );
    const s8 = r.forms.find((f) => f.form === "f1040s8")!;
    const f1040 = r.forms.find((f) => f.form === "f1040")!;
    expect(s8.values["line4"]).toBe(1);
    expect(s8.values["line6"]).toBe(1);
    expect(s8.values["line8"]).toBe(2700);
    expect(s8.values["line13"]).toBe(Number(f1040.values["line18"]));
    expect(f1040.values["line19"]).toBe(s8.values["line14"]);
    expect(f1040.values["line28"]).toBe(s8.values["line27"]);
    expect(Number(s8.values["line14"]) + Number(s8.values["line27"])).toBeGreaterThan(0);
    expect(Number(s8.values["line18a"])).toBe(28000 + 10000 - Number(r.forms.find((f) => f.form === "f1040sse")!.values["line13"]));
    expect(r.totals.child_tax_credit).toBe(Number(s8.values["line14"]));
    expect(r.forms.map((f) => f.form)).toContain("f1040s8");
  });
});
