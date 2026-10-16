import { describe, expect, it } from "vitest";
import { decodePayload, encodePayload } from "../src/engine/link.ts";
import { prepareReturn } from "../src/engine/return.ts";

describe("supporting statements", () => {
  it("round-trips statements through the link payload", async () => {
    const encoded = await encodePayload({ v: 1, year: 2025, forms: [], statements: [{ id: "x", title: "T", columns: ["a", "b"], rows: [["1", "2"]], notes: ["n"] }] });
    const back = await decodePayload(encoded);
    expect(back.statements?.[0]?.rows).toEqual([["1", "2"]]);
  });
  it("adds a QBI computation statement to a return with Schedule C income", async () => {
    const r = await prepareReturn({ year: 2025, form1040: { first_name: "A", last_name: "B", ssn: "111111111", filing_status: "single", digital_assets: false }, scheduleC: [{ principal_business: "Plumbing", line1: 80000 }, { principal_business: "Ranch", line1: 20000, line22: 30000 }] }, { renderBase: "https://clicktax.org" });
    const qbi = r.statements.find((s) => s.id === "qbi")!;
    expect(qbi).toBeDefined();
    expect(qbi.rows![0]![0]).toBe("Plumbing");
    expect(qbi.rows![0]![1]).toBe("80,000");
    expect(qbi.rows![1]![0]).toBe("Ranch");
    expect(qbi.rows![1]![1]).toBe("-10,000");
    const f8995 = r.forms.find((x) => x.form === "f8995")!;
    const last = qbi.rows![qbi.rows!.length - 1]!;
    expect(last[0]).toContain("deduction");
    expect(last[3]).toBe(Number(f8995.values["line15"]).toLocaleString("en-US"));
    const payload = await decodePayload(r.link.split("#")[1]!);
    expect(payload.statements?.length).toBe(1);
  });
});
