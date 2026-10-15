import { FORM_ID_LIST, type FormDef, type FormId } from "../types.ts";
import { form1040 } from "./form1040.ts";
import { schedule1 } from "./schedule1.ts";
import { schedule2 } from "./schedule2.ts";
import { schedule8812 } from "./schedule8812.ts";
import { form8995 } from "./form8995.ts";
import { schedule3 } from "./schedule3.ts";
import { schedule1A } from "./schedule1A.ts";
import { form8889 } from "./form8889.ts";
import { form8959 } from "./form8959.ts";
import { form8829 } from "./form8829.ts";
import { form4868 } from "./form4868.ts";
import { formW9 } from "./formW9.ts";
import { form1040ES } from "./form1040ES.ts";
import { form4562 } from "./form4562.ts";
import { form1099NEC } from "./form1099NEC.ts";
import { scheduleC } from "./scheduleC.ts";
import { scheduleSE } from "./scheduleSE.ts";

/** Forms implemented so far; FORMS below is the same map typed as complete once every id is implemented. */
const FORMS_PARTIAL: Partial<Record<FormId, FormDef>> = {
  f1040: form1040,
  f1040s1: schedule1,
  f1040s2: schedule2,
  f1040s3: schedule3,
  f1040s1a: schedule1A,
  f1040s8: schedule8812,
  f8995: form8995,
  f8889: form8889,
  f8959: form8959,
  f8829: form8829,
  f4868: form4868,
  fw9: formW9,
  f1040es: form1040ES,
  f4562: form4562,
  f1099nec: form1099NEC,
  f1040sc: scheduleC,
  f1040sse: scheduleSE,
};

export const FORMS = FORMS_PARTIAL as Record<FormId, FormDef>;

export const FORM_IDS: readonly FormId[] = FORM_ID_LIST.filter((id) => id in FORMS_PARTIAL);

export function getForm(id: string): FormDef | undefined {
  return (FORMS as Record<string, FormDef>)[id];
}
