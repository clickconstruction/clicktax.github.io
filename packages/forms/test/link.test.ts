import { describe, expect, it } from "vitest";
import { decodePayload, encodePayload, renderUrl, type RenderPayload } from "../src/engine/link.ts";

describe("render link", () => {
  it("round-trips a payload through deflate + base64url", async () => {
    const payload: RenderPayload = {
      v: 1,
      year: 2025,
      title: "Test",
      forms: [{ form: "f1040sc", fields: { "topmostSubform[0].Page1[0].f1_1[0]": "ROBERT", "topmostSubform[0].Page1[0].c1_1[0]": true } }],
    };
    const enc = await encodePayload(payload);
    expect(enc.startsWith("v1.")).toBe(true);
    expect(enc).not.toMatch(/[+/=]/);
    const url = renderUrl("https://clicktax.org/", enc);
    expect(url.startsWith("https://clicktax.org/fill#v1.")).toBe(true);
    const dec = await decodePayload(new URL(url).hash);
    expect(dec).toEqual(payload);
  });
  it("stays small for a full Schedule C", async () => {
    const fields: Record<string, string | boolean> = {};
    for (let i = 1; i <= 100; i++) fields[`topmostSubform[0].Page1[0].f1_${i}[0]`] = String(1000 * i);
    const enc = await encodePayload({ v: 1, year: 2025, forms: [{ form: "f1040sc", fields }] });
    expect(enc.length).toBeLessThan(2500);
  });
});
