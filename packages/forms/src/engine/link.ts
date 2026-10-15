import type { FormId, TaxYear } from "../types.ts";

/**
 * The render payload travels in the URL fragment (#...), which browsers never send to the server.
 * The web renderer decodes it and fills the blank IRS PDF locally with pdf-lib.
 */
export interface RenderForm {
  form: FormId;
  /** Full PDF field name → value. Strings for text boxes; true/false for checkboxes. */
  fields: Record<string, string | boolean>;
  /** Optional human summary lines shown next to the preview. */
  summary?: Array<{ line?: string; label: string; value: string }>;
  /** Optional computed-line explanations and warnings, shown on the render page. */
  notes?: { computations: Array<{ line?: string; label: string; value: string | number | boolean; formula: string }>; warnings: string[] };
}

export interface RenderPayload {
  v: 1;
  year: TaxYear;
  title?: string;
  /** True when the figures are invented sample data (the website's Test buttons). */
  sample?: boolean;
  forms: RenderForm[];
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const src = new Blob([bytes as BlobPart]).stream().pipeThrough(stream as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  const buf = await new Response(src).arrayBuffer();
  return new Uint8Array(buf);
}

export async function encodePayload(payload: RenderPayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const deflated = await pipe(json, new CompressionStream("deflate-raw"));
  return "v1." + bytesToBase64Url(deflated);
}

export async function decodePayload(fragment: string): Promise<RenderPayload> {
  const s = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!s.startsWith("v1.")) throw new Error("Unrecognized link format");
  const inflated = await pipe(base64UrlToBytes(s.slice(3)), new DecompressionStream("deflate-raw"));
  const payload = JSON.parse(new TextDecoder().decode(inflated)) as RenderPayload;
  if (payload.v !== 1 || !Array.isArray(payload.forms)) throw new Error("Malformed payload");
  return payload;
}

export function renderUrl(base: string, encoded: string): string {
  return `${base.replace(/\/$/, "")}/fill#${encoded}`;
}
