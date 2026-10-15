import type { FormDef, FormId } from "../types.ts";
import { form1040 } from "./form1040.ts";
import { schedule1 } from "./schedule1.ts";
import { schedule2 } from "./schedule2.ts";
import { scheduleC } from "./scheduleC.ts";
import { scheduleSE } from "./scheduleSE.ts";

export const FORMS: Record<FormId, FormDef> = {
  f1040: form1040,
  f1040s1: schedule1,
  f1040s2: schedule2,
  f1040sc: scheduleC,
  f1040sse: scheduleSE,
};

export const FORM_IDS: readonly FormId[] = ["f1040", "f1040s1", "f1040s2", "f1040sc", "f1040sse"];

export function getForm(id: string): FormDef | undefined {
  return (FORMS as Record<string, FormDef>)[id];
}
