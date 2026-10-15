// Generated maps live in ./<year>/<form>.ts (see tools/gen-fieldmaps.ts). This index is hand-maintained.
import type { FieldMap, FormId, TaxYear } from "../types.ts";
import f1040_2024 from "./2024/f1040.ts";
import f1040s1_2024 from "./2024/f1040s1.ts";
import f1040s2_2024 from "./2024/f1040s2.ts";
import f1040s8_2024 from "./2024/f1040s8.ts";
import f1040sc_2024 from "./2024/f1040sc.ts";
import f1040sse_2024 from "./2024/f1040sse.ts";
import f1040_2025 from "./2025/f1040.ts";
import f1040s1_2025 from "./2025/f1040s1.ts";
import f1040s2_2025 from "./2025/f1040s2.ts";
import f1040s8_2025 from "./2025/f1040s8.ts";
import f1040sc_2025 from "./2025/f1040sc.ts";
import f1040sse_2025 from "./2025/f1040sse.ts";

export const FIELD_MAPS: Record<TaxYear, Record<FormId, FieldMap>> = {
  2024: { f1040: f1040_2024, f1040s1: f1040s1_2024, f1040s2: f1040s2_2024, f1040sc: f1040sc_2024, f1040sse: f1040sse_2024, f1040s8: f1040s8_2024 },
  2025: { f1040: f1040_2025, f1040s1: f1040s1_2025, f1040s2: f1040s2_2025, f1040sc: f1040sc_2025, f1040sse: f1040sse_2025, f1040s8: f1040s8_2025 },
};

export function getFieldMap(year: TaxYear, form: FormId): FieldMap {
  const m = FIELD_MAPS[year]?.[form];
  if (!m) throw new Error(`No field map for ${form} ${year}`);
  return m;
}
