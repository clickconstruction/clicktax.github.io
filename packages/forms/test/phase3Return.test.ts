import { describe, expect, it } from "vitest";
import { prepareReturn } from "../src/engine/return.ts";

describe("Phase 3 forms in a full return", () => {
  it("routes capital gains to line 7 and chains the credits through Schedule 3", async () => {
    const r = await prepareReturn(
      {
        year: 2025,
        form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false, line1a: 60000, line25a: 7000 },
        form8949: [{ short_term_box: "A", short_term: [{ description: "100 XYZ", date_acquired: "01/02/2025", date_sold: "06/30/2025", proceeds: 10000, cost: 7000 }] }],
        scheduleD: { line13: 500 },
        form2441: { providers: [{ name: "Care Co", address: "1 St", id_number: "12-3456789", household_employee: false, amount_paid: 4000 }], persons: [{ first_name: "C", last_name: "B", ssn: "222222222", expenses: 4000 }] },
        form8863: { student_name: "A B", student_ssn: "111111111", line23: false, line24: true, line25: false, line26: false, line27: 4000 },
        form8880: { line1a: 2000 },
      },
      { renderBase: "https://clicktax.org" },
    );
    const ids = r.forms.map((x) => x.form);
    for (const id of ["f1040", "f1040sd", "f8949", "f1040s3", "f2441", "f8863", "f8880"]) expect(ids).toContain(id);
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    const sD = r.forms.find((x) => x.form === "f1040sd")!;
    const s3 = r.forms.find((x) => x.form === "f1040s3")!;
    const f2441 = r.forms.find((x) => x.form === "f2441")!;
    const f8863 = r.forms.find((x) => x.form === "f8863")!;
    const f8880 = r.forms.find((x) => x.form === "f8880")!;
    expect(sD.values["line1b_d"]).toBe(10000);
    expect(sD.values["line7"]).toBe(3000);
    expect(sD.values["line16"]).toBe(3500);
    expect(f1040.values["line7"]).toBe(3500);
    expect(f1040.values["line11"]).toBe(63500);
    const tax = Number(f1040.values["line18"]);
    expect(tax).toBeGreaterThan(5000);
    expect(f2441.values["line3"]).toBe(3000);
    expect(f2441.values["line8"]).toBe("20");
    expect(f2441.values["line11"]).toBe(600);
    expect(f2441.values["line10"]).toBe(tax);
    expect(f8863.values["line8"]).toBe(1000);
    expect(f8863.values["line19"]).toBe(1500);
    expect(f8863.values["credit_limit"]).toBe(tax - 600);
    expect(f8880.values["line12"]).toBe(0); // AGI above the saver's credit limit
    expect(s3.values["line2"]).toBe(600);
    expect(s3.values["line3"]).toBe(1500);
    expect(s3.values["line4"]).toBe(0);
    expect(f1040.values["line20"]).toBe(2100);
    expect(f1040.values["line29"]).toBe(1000);
    expect(f1040.values["line19"] ?? 0).toBe(0);
  });
  it("uses the allowed loss on line 7 and raises line 1e from taxable dependent care benefits", async () => {
    const r = await prepareReturn(
      {
        year: 2024,
        form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "mfs", digital_assets: false, line1a: 50000 },
        scheduleD: { line1a_d: 2000, line1a_e: 9000, line22: false },
        form2441: { mfs_exception: true, persons: [{ first_name: "C", last_name: "B", ssn: "222222222", expenses: 1000 }], line12: 5000, line16: 1000, line22_sole_proprietorship: false },
      },
      { renderBase: "https://clicktax.org" },
    );
    const f1040 = r.forms.find((x) => x.form === "f1040")!;
    const f2441 = r.forms.find((x) => x.form === "f2441")!;
    expect(f1040.values["line7"]).toBe(-1500);
    expect(f2441.values["line26"]).toBe(4000);
    expect(f1040.values["line1e"]).toBe(4000);
    expect(f1040.values["line9"]).toBe(50000 + 4000 - 1500);
  });
});
