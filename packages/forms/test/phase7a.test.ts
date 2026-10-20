import { describe, expect, it } from "vitest";
import { scheduleF } from "../src/forms/scheduleF.ts";
import { form4952 } from "../src/forms/form4952.ts";
import { form8936 } from "../src/forms/form8936.ts";
import { form6781 } from "../src/forms/form6781.ts";
import { form3800 } from "../src/forms/form3800.ts";
import { form8938 } from "../src/forms/form8938.ts";
import { prepareFormValues, prepareReturn } from "../src/engine/return.ts";
import { sampleValues } from "../src/samples.ts";
import type { FormId, ListRow } from "../src/types.ts";

const ctx = { year: 2025 as const, rounding: "whole" as const };
const opts = { renderBase: "https://clicktax.org/fill", rounding: "whole" as const };

describe("Phase 7a forms map to both PDFs", () => {
  const ids: FormId[] = ["f1040sf", "f4952", "f8862", "f3800", "f8938", "f8936", "f6781"];
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

describe("Schedule F", () => {
  it("computes cash-method gross income, expenses, and net profit", () => {
    const r = scheduleF.compute(sampleValues("f1040sf", 2025), ctx);
    expect(r.values["line1c"]).toBe(11000);
    expect(r.values["line3b"]).toBe(1200);
    expect(r.values["line4b"]).toBe(5400);
    expect(r.values["line6b"]).toBe(3000);
    expect(r.values["line9"]).toBe(11000 + 68500 + 1200 + 5400 + 3000 + 2500 + 800);
    const expenses = 4100 + 2600 + 1800 + 9800 + 12400 + 6100 + 1500 + 7200 + 3300 + 8900 + 6000 + 2400 + 4300 + 3900 + 2100 + 1700 + 2800 + 1900 + 1250 + 300;
    expect(r.values["line33"]).toBe(expenses);
    expect(r.values["line34"]).toBe(92400 - expenses);
  });
  it("uses Part III for the accrual method and places the 2024 zero-padded names", () => {
    const r = scheduleF.compute({ accounting_method: "accrual", line37: 90000, line38a: 2000, line40a: 5000, line41: 1000, line45: 20000, line46: 35000, line48: 15000, line16: 10000 }, ctx);
    expect(r.values["line44"]).toBe(98000);
    expect(r.values["line47"]).toBe(55000);
    expect(r.values["line49"]).toBe(40000);
    expect(r.values["line50"]).toBe(58000);
    expect(r.values["line9"]).toBe(58000);
    expect(r.values["line34"]).toBe(48000);
    const p = prepareFormValues("f1040sf", 2024, { name: "A", ssn: "111111111", line1a: 5, line38a: 7, line45: 9, line42: 3 }, "whole");
    expect(p.pdfFields["topmostSubform[0].Page1[0].f1_06[0]"]).toBe("5");
    expect(p.pdfFields["topmostSubform[0].Page2[0].Line38a_ReadOrder[0].f2_02[0]"]).toBe("7");
    expect(p.pdfFields["topmostSubform[0].Page2[0].Line45_ReadOrder[0].f2_13[0]"]).toBe("9");
    expect(p.pdfFields["topmostSubform[0].Page2[0].f2_10[0]"]).toBe("3");
    const p25 = prepareFormValues("f1040sf", 2025, { line1a: 5, line38a: 7 }, "whole");
    expect(p25.pdfFields["topmostSubform[0].Page1[0].f1_6[0]"]).toBe("5");
    expect(p25.pdfFields["topmostSubform[0].Page2[0].Line38a_ReadOrder[0].f2_2[0]"]).toBe("7");
  });
  it("warns about at-risk boxes on a loss", () => {
    const r = scheduleF.compute({ line2: 1000, line16: 5000 }, ctx);
    expect(r.values["line34"]).toBe(-4000);
    expect(r.warnings.some((w) => w.includes("at_risk"))).toBe(true);
  });
});

describe("Form 4952", () => {
  it("limits the deduction to net investment income and carries the rest forward", () => {
    const r = form4952.compute(sampleValues("f4952", 2025), ctx);
    expect(r.values["line3"]).toBe(7600);
    expect(r.values["line4c"]).toBe(3300);
    expect(r.values["line4f"]).toBe(0);
    expect(r.values["line4h"]).toBe(4300);
    expect(r.values["line6"]).toBe(3950);
    expect(r.values["line7"]).toBe(3650);
    expect(r.values["line8"]).toBe(3950);
  });
  it("maps the 2024 unpadded and 2025 padded names", () => {
    const a = prepareFormValues("f4952", 2024, { line1: 1, line4a: 2 }, "whole");
    expect(a.pdfFields["topmostSubform[0].Page1[0].f1_3[0]"]).toBe("1");
    expect(a.pdfFields["topmostSubform[0].Page1[0].f1_6[0]"]).toBe("2");
    const b = prepareFormValues("f4952", 2025, { line1: 1, line4a: 2 }, "whole");
    expect(b.pdfFields["topmostSubform[0].Page1[0].f1_03[0]"]).toBe("1");
    expect(b.pdfFields["topmostSubform[0].Page1[0].Line4a_ReadOrder[0].f1_06[0]"]).toBe("2");
  });
});

describe("Form 8936", () => {
  it("applies the MAGI test using the lower of two years and the tax limit", () => {
    const r = form8936.compute(sampleValues("f8936", 2025), ctx);
    expect(r.values["line2"]).toBe(148000);
    expect(r.values["line4"]).toBe(139500);
    expect(r.values["line5"]).toBe("MFJ");
    expect(r.values["line12"]).toBe(12400);
    expect(r.values["line13"]).toBe(7500);
    const over = form8936.compute({ filing_status: "single", line1a: 160000, line3a: 155000, line9: 7500, line10: 20000 }, ctx);
    expect(over.values["line13"]).toBe(0);
    expect(over.warnings.some((w) => w.includes("exceeds"))).toBe(true);
    const saved = form8936.compute({ filing_status: "single", line1a: 160000, line3a: 120000, line9: 7500, line10: 20000 }, ctx);
    expect(saved.values["line13"]).toBe(7500);
    const used = form8936.compute({ filing_status: "hoh", line1a: 90000, line14: 4000, line15: 3000, line16: 500 }, ctx);
    expect(used.values["line17"]).toBe(2500);
    expect(used.values["line18"]).toBe(2500);
  });
});

describe("Form 6781", () => {
  it("splits section 1256 results 40/60 and totals straddles", () => {
    const r = form6781.compute(sampleValues("f6781", 2025), ctx);
    expect(r.values["line2_loss"]).toBe(3100);
    expect(r.values["line2_gain"]).toBe(12400);
    expect(r.values["line3"]).toBe(9300);
    expect(r.values["line7"]).toBe(9300);
    expect(r.values["line8"]).toBe(3720);
    expect(r.values["line9"]).toBe(5580);
    const losses = r.values["straddle_losses"] as ListRow[];
    expect(losses[0]!["loss"]).toBe(3500);
    expect(losses[0]!["recognized_loss"]).toBe(2300);
    expect(r.values["line11a"]).toBe(2300);
    expect(r.values["line11b"]).toBe(0);
    const open = r.values["unrecognized_gains"] as ListRow[];
    expect(open[0]!["unrecognized_gain"]).toBe(1200);
  });
  it("maps table rows in both years", () => {
    const v = { contracts: [{ account: "A", loss: 1, gain: 2 }, { account: "B", loss: 3, gain: 4 }], straddle_gains: [{ description: "X", sales_price: 10, cost: 4, long_term: true }] };
    const a = prepareFormValues("f6781", 2024, v, "whole");
    expect(a.pdfFields["topmostSubform[0].Page1[0].Table_Line1[0].BodyRow2[0].f1_7[0]"]).toBe("3");
    expect(a.pdfFields["topmostSubform[0].Page1[0].Table_Line12[0].BodyRow1[0].f1_44[0]"]).toBe("6");
    expect(a.values["line13b"]).toBe(6);
    const b = prepareFormValues("f6781", 2025, v, "whole");
    expect(b.pdfFields["topmostSubform[0].Page1[0].Table_Line1[0].Row2[0].f1_07[0]"]).toBe("3");
    expect(b.pdfFields["topmostSubform[0].Page1[0].Table_Line12[0].Row1[0].f1_44[0]"]).toBe("6");
  });
});

describe("Form 3800", () => {
  it("places credits by line, totals Part III, and applies the Part II limits", () => {
    const r = form3800.compute(sampleValues("f3800", 2025), ctx);
    const part3 = r.values["part3"] as ListRow[];
    const row = (line: string) => part3[["1a", "1b", "1c"].indexOf(line) >= 0 ? ["1a", "1b", "1c"].indexOf(line) : -1];
    expect(row("1c")!["nonpassive"]).toBe(3200);
    // Row order: 36 "1x" rows, then "2", "3", then 4a..4m (13), 4z, 5, 6.
    const i4b = 36 + 2 + 1;
    expect(part3[i4b]!["nonpassive"]).toBe(2400);
    expect(part3[i4b + 2]!["combined"]).toBe(2500); // 4d: passive 4000 allowed 2500
    expect(part3[i4b + 2]!["ein"]).toBe("36-1234567");
    const line2 = part3[36]!;
    expect(line2["nonpassive"]).toBe(3200);
    const line5 = part3[36 + 2 + 14]!;
    expect(line5["nonpassive"]).toBe(2400 + 1850);
    expect(line5["passive"]).toBe(4000);
    expect(line5["combined"]).toBe(2400 + 1850 + 2500);
    const line6 = part3[36 + 2 + 15]!;
    expect(line6["combined"]).toBe(3200 + 2400 + 1850 + 2500);
    // Part I: only the non-specified credit (1c) is in line 1; no passive non-specified credits.
    expect(r.values["line1"]).toBe(3200);
    expect(r.values["line2"]).toBe(0);
    expect(r.values["line6"]).toBe(3200);
    // Part II with tax 18,400, AMT 0, credits ahead 2,720, TMT 9,800.
    expect(r.values["line11"]).toBe(18400 - 2720);
    expect(r.values["line13"]).toBe(0);
    expect(r.values["line15"]).toBe(9800);
    expect(r.values["line16"]).toBe(15680 - 9800);
    expect(r.values["line17"]).toBe(3200);
    expect(r.values["line26"]).toBe(0);
    expect(r.values["line27"]).toBe(15680);
    expect(r.values["line29"]).toBe(15680 - 3200);
    expect(r.values["line30"]).toBe(4250);
    expect(r.values["line32"]).toBe(4000);
    expect(r.values["line33"]).toBe(2500);
    expect(r.values["line34"]).toBe(900);
    expect(r.values["line36"]).toBe(4250 + 2500 + 900);
    expect(r.values["line37"]).toBe(7650);
    expect(r.values["line38"]).toBe(3200 + 7650);
    const part4 = r.values["part4"] as ListRow[];
    const i4bCarry = 37 + 28 + 1;
    expect(part4[i4bCarry]!["nonpassive"]).toBe(900);
    expect(part4[i4bCarry]!["applied"]).toBe(900);
    expect(part4[i4bCarry]!["carryforward"]).toBe(0);
    expect(part4[37 + 28 + 15]!["nonpassive"]).toBe(900); // line 5 total
  });
  it("limits the credit to net income tax over tentative minimum tax", () => {
    const r = form3800.compute({ filing_status: "single", line7: 5000, line14: 4000, credits: [{ line: "1c", nonpassive: 3000 }] }, ctx);
    expect(r.values["line16"]).toBe(1000);
    expect(r.values["line17"]).toBe(1000);
    expect(r.values["line38"]).toBe(1000);
    expect(r.warnings.some((w) => w.includes("carries forward"))).toBe(true);
  });
  it("maps the moved page-1 widgets and the table rows in both years", () => {
    const v = { line7: 1, line8: 2, credits: [{ line: "4f", nonpassive: 5 }], carryovers: [{ line: "2a", year: "2019", nonpassive: 7, applied: 0 }] };
    const a = prepareFormValues("f3800", 2024, v, "whole");
    expect(a.pdfFields["topmostSubform[0].Page1[0].f1_9[0]"]).toBe("1");
    expect(a.pdfFields["topmostSubform[0].Page1[0].f1_10[0]"]).toBe("2");
    expect(a.pdfFields["topmostSubform[0].Page4[0].Pg4Table[0].Line4f[0].f4_65[0]"]).toBe("5");
    expect(a.pdfFields["topmostSubform[0].Page6[0].Pg6Table[0].Line2a[0].f6_6[0]"]).toBe("7");
    expect(a.pdfFields["topmostSubform[0].Page6[0].Pg6Table[0].Line2a[0].f6_9[0]"]).toBe("7");
    const b = prepareFormValues("f3800", 2025, v, "whole");
    expect(b.pdfFields["topmostSubform[0].Page1[0].f1_10[0]"]).toBe("1");
    expect(b.pdfFields["topmostSubform[0].Page1[0].f1_11[0]"]).toBe("2");
    expect(b.pdfFields["topmostSubform[0].Page4[0].Pg4Table[0].Line4f[0].f4_65[0]"]).toBe("5");
  });
});

describe("Form 8938", () => {
  it("fills the summary from the account and asset lists", () => {
    const r = form8938.compute(sampleValues("f8938", 2025), ctx);
    expect(r.values["line5"]).toBe(1);
    expect(r.values["line6"]).toBe(62000);
    expect(r.values["line7"]).toBe(0);
    expect(r.values["line10"]).toBe(1);
    expect(r.values["line11"]).toBe(48000);
    expect(r.values["calendar_year_suffix"]).toBe("25");
    const accounts = r.values["accounts"] as ListRow[];
    expect(accounts[0]!["deposit"]).toBe(true);
    expect(accounts[0]!["giin1"]).toBe("ABCDEF");
    expect(accounts[0]!["giin4"]).toBe("756");
    const assets = r.values["assets"] as ListRow[];
    expect(assets[0]!["range_a"]).toBe(true);
    expect(assets[0]!["entity_corporation"]).toBe(true);
    const big = form8938.compute({ assets: [{ description: "x", max_value: 250000 }, { description: "y", max_value: 10 }] }, ctx);
    expect((big.values["assets"] as ListRow[])[0]!["value_over_200k"]).toBe(250000);
    expect(big.values["additional_statements"]).toBe(true);
    expect(big.values["additional_statements_count"]).toBe(1);
  });
});

describe("Phase 7a return wiring", () => {
  it("carries Schedule F to Schedule 1 line 6, Schedule SE line 1a, and the QBI deduction", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 40000 }, scheduleF: { principal_crop: "Corn", line2: 120000, line16: 30000, line14: 10000, crp_payments: 500 } }, opts);
    const ids = r.forms.map((f) => f.form);
    expect(ids).toContain("f1040sf");
    expect(ids).toContain("f1040sse");
    const s1 = r.forms.find((f) => f.form === "f1040s1")!;
    expect(s1.values["line6"]).toBe(80000);
    const se = r.forms.find((f) => f.form === "f1040sse")!;
    expect(se.values["line1a"]).toBe(80000);
    expect(se.values["line1b"]).toBe(500);
    expect(r.totals["schedule_f_net_profit"]).toBe(80000);
    const f8995 = r.forms.find((f) => f.form === "f8995")!;
    expect(f8995).toBeDefined();
    expect(r.statements.some((s) => (s.rows ?? []).some((row) => String(row[0]).includes("Corn")))).toBe(true);
  });
  it("places Form 4952 on Schedule A line 9 and Form 6781 on Schedule D", async () => {
    const r = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "single", line1a: 150000, line2b: 4000, line3b: 2000, line3a: 1500 },
      scheduleA: { line5a: 9000, line5b: 8000, line8a: 14000, line11: 3000, line18: true },
      form4952: { line1: 5000 },
      form6781: { contracts: [{ account: "futures", gain: 10000 }] },
    }, opts);
    const sA = r.forms.find((f) => f.form === "f1040sa")!;
    const f4952 = r.forms.find((f) => f.form === "f4952")!;
    expect(f4952.values["line4a"]).toBe(6000);
    expect(f4952.values["line4b"]).toBe(1500);
    expect(f4952.values["line8"]).toBe(4500);
    expect(sA.values["line9"]).toBe(4500);
    const sD = r.forms.find((f) => f.form === "f1040sd")!;
    expect(sD.values["line4"]).toBe(4000);
    expect(sD.values["line11"]).toBe(6000);
    expect(sD.values["line16"]).toBe(10000);
    const f1040 = r.forms.find((f) => f.form === "f1040")!;
    expect(f1040.values["line7"]).toBe(10000);
  });
  it("feeds Form 8936 and Form 3800 into Schedule 3 lines 6f and 6a", async () => {
    const r = await prepareReturn({
      year: 2025,
      form1040: { ...sampleValues("f1040", 2025), filing_status: "mfj", line1a: 160000 },
      form8936: { line9: 7500, line6: 3000 },
      form3800: { credits: [{ line: "4b", nonpassive: 2400 }] },
    }, opts);
    const f8936 = r.forms.find((f) => f.form === "f8936")!;
    const f3800 = r.forms.find((f) => f.form === "f3800")!;
    const s3 = r.forms.find((f) => f.form === "f1040s3")!;
    expect(f8936.values["line13"]).toBe(7500);
    expect(s3.values["line6f"]).toBe(7500);
    const part3 = f3800.values["part3"] as ListRow[];
    expect(part3[24]!["nonpassive"]).toBe(3000); // line 1y from Form 8936 line 8
    expect(f3800.values["line1"]).toBe(3000);
    expect(f3800.values["line30"]).toBe(2400);
    expect(Number(f3800.values["line10b"])).toBe(7500);
    expect(s3.values["line6a"]).toBe(f3800.values["line38"]);
    expect(Number(f3800.values["line38"])).toBeGreaterThan(0);
    expect(r.totals["general_business_credit"]).toBe(f3800.values["line38"]);
    const f1040 = r.forms.find((f) => f.form === "f1040")!;
    expect(f1040.values["line20"]).toBe(s3.values["line8"]);
  });
  it("attaches Forms 8862 and 8938 as supplied", async () => {
    const r = await prepareReturn({ year: 2024, form1040: sampleValues("f1040", 2024), form8862: sampleValues("f8862", 2024), form8938: sampleValues("f8938", 2024) }, opts);
    const ids = r.forms.map((f) => f.form);
    expect(ids).toContain("f8862");
    expect(ids).toContain("f8938");
    const f8938 = r.forms.find((f) => f.form === "f8938")!;
    expect(f8938.values["calendar_year_suffix"]).toBe("24");
  });
});
