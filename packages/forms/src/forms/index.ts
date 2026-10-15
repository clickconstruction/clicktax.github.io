import { FORM_ID_LIST, type FormDef, type FormId } from "../types.ts";
import { form1040 } from "./form1040.ts";
import { schedule1 } from "./schedule1.ts";
import { schedule2 } from "./schedule2.ts";
import { schedule8812 } from "./schedule8812.ts";
import { form8995 } from "./form8995.ts";
import { schedule3 } from "./schedule3.ts";
import { scheduleC } from "./scheduleC.ts";
import { scheduleSE } from "./scheduleSE.ts";

/** Forms implemented so far; FORMS below is the same map typed as complete once every id is implemented. */
const FORMS_PARTIAL: Partial<Record<FormId, FormDef>> = {
  f1040: form1040,
  f1040s1: schedule1,
  f1040s2: schedule2,
  f1040s3: schedule3,
  f1040s8: schedule8812,
  f8995: form8995,
  f1040sc: scheduleC,
  f1040sse: scheduleSE,
};

export const FORMS = FORMS_PARTIAL as Record<FormId, FormDef>;

export const FORM_IDS: readonly FormId[] = FORM_ID_LIST.filter((id) => id in FORMS_PARTIAL);

export function getForm(id: string): FormDef | undefined {
  return (FORMS as Record<string, FormDef>)[id];
}
