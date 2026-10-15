import { describe, expect, it } from "vitest";
import { form8889 } from "../src/forms/form8889.ts";
import { prepareReturn } from "../src/engine/return.ts";

describe("Form 8889", () => {
  it("limits the deduction to the family limit less employer contributions (2025)", () => {
    const r = form8889.compute({ coverage: "family", line2: 9000, line9: 1500 }, { year: 2025, rounding: "whole" });
    expect(r.values["line3"]).toBe(8550);
    expect(r.values["line12"]).toBe(7050);
    expect(r.values["line13"]).toBe(7050);
    expect(r.warnings.some((w) => w.includes("5329"))).toBe(true);
  });
  it("adds the age-55 catch-up and taxes non-medical distributions (2024)", () => {
    const r = form8889.compute({ coverage: "self_only", line2: 5150, age_55_or_older: true, line14a: 3000, line15: 1000 }, { year: 2024, rounding: "whole" });
    expect(r.values["line3"]).toBe(4150);
    expect(r.values["line8"]).toBe(5150);
    expect(r.values["line13"]).toBe(5150);
    expect(r.values["line16"]).toBe(2000);
    expect(r.values["line17b"]).toBe(400);
  });
  it("flows into Schedule 1 line 13 and 8f and Schedule 2 line 17c", async () => {
    const r = await prepareReturn(
      { year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 50000 }, form8889: { coverage: "self_only", line2: 4000, line14a: 500, line15: 0 } },
      { renderBase: "https://clicktax.org" },
    );
    const s1 = r.forms.find((x) => x.form === "f1040s1")!;
    const s2 = r.forms.find((x) => x.form === "f1040s2")!;
    expect(s1.values["line13"]).toBe(4000);
    expect(s1.values["line8f"]).toBe(500);
    expect(s1.values["line26"]).toBe(4000);
    expect(s2.values["line17c"]).toBe(100);
    expect(s2.values["line21"]).toBe(100);
    expect(r.forms.map((x) => x.form)).toContain("f8889");
  });
});
