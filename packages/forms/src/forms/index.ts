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
import { scheduleB } from "./scheduleB.ts";
import { scheduleD } from "./scheduleD.ts";
import { form8949 } from "./form8949.ts";
import { scheduleA } from "./scheduleA.ts";
import { form2441 } from "./form2441.ts";
import { form8863 } from "./form8863.ts";
import { form8880 } from "./form8880.ts";
import { scheduleE } from "./scheduleE.ts";
import { scheduleEIC } from "./scheduleEIC.ts";
import { form8582 } from "./form8582.ts";
import { form8960 } from "./form8960.ts";
import { form9325 } from "./form9325.ts";
import { form8962 } from "./form8962.ts";
import { form1040SR } from "./form1040SR.ts";
import { form6251 } from "./form6251.ts";
import { form5695 } from "./form5695.ts";
import { form1040X } from "./form1040X.ts";
import { form8606 } from "./form8606.ts";
import { form1116 } from "./form1116.ts";
import { form2210 } from "./form2210.ts";
import { form4797 } from "./form4797.ts";
import { form5329 } from "./form5329.ts";
import { form8283 } from "./form8283.ts";
import { scheduleF } from "./scheduleF.ts";
import { form4952 } from "./form4952.ts";
import { form8862 } from "./form8862.ts";
import { form3800 } from "./form3800.ts";
import { form8938 } from "./form8938.ts";
import { form8936 } from "./form8936.ts";
import { form6781 } from "./form6781.ts";
import { form8888 } from "./form8888.ts";
import { form1310 } from "./form1310.ts";
import { form6252 } from "./form6252.ts";
import { form2555 } from "./form2555.ts";
import { form4835 } from "./form4835.ts";
import { form2106 } from "./form2106.ts";
import { form8958 } from "./form8958.ts";
import { form8615 } from "./form8615.ts";
import { scheduleH } from "./scheduleH.ts";
import { form8801 } from "./form8801.ts";
import { form8990 } from "./form8990.ts";
import { form8853 } from "./form8853.ts";
import { form3903 } from "./form3903.ts";
import { form8911 } from "./form8911.ts";
import { form8396 } from "./form8396.ts";
import { form8814 } from "./form8814.ts";
import { form982 } from "./form982.ts";
import { form5405 } from "./form5405.ts";
import { form461 } from "./form461.ts";
import { scheduleR } from "./scheduleR.ts";
import { form8824 } from "./form8824.ts";
import { form8839 } from "./form8839.ts";
import { form4684 } from "./form4684.ts";
import { form5884 } from "./form5884.ts";
import { form8846 } from "./form8846.ts";
import { form8994 } from "./form8994.ts";
import { form8586 } from "./form8586.ts";
import { form8992 } from "./form8992.ts";
import { form2439 } from "./form2439.ts";
import { form8997 } from "./form8997.ts";
import { form6765 } from "./form6765.ts";
import { form4136 } from "./form4136.ts";
import { form965a } from "./form965a.ts";
import { form3468 } from "./form3468.ts";
import { form1040nr } from "./form1040nr.ts";
import { form8995a } from "./form8995a.ts";
import { form8995aa } from "./form8995aa.ts";
import { form8995ab } from "./form8995ab.ts";
import { form8995ac } from "./form8995ac.ts";
import { form8995ad } from "./form8995ad.ts";
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
  f1040sb: scheduleB,
  f1040sd: scheduleD,
  f8949: form8949,
  f1040sa: scheduleA,
  f2441: form2441,
  f8863: form8863,
  f8880: form8880,
  f1040se: scheduleE,
  f1040sei: scheduleEIC,
  f8582: form8582,
  f8960: form8960,
  f9325: form9325,
  f8962: form8962,
  f1040sr: form1040SR,
  f6251: form6251,
  f5695: form5695,
  f1040x: form1040X,
  f8606: form8606,
  f1116: form1116,
  f2210: form2210,
  f4797: form4797,
  f5329: form5329,
  f8283: form8283,
  f1040sf: scheduleF,
  f4952: form4952,
  f8862: form8862,
  f3800: form3800,
  f8938: form8938,
  f8936: form8936,
  f6781: form6781,
  f8888: form8888,
  f1310: form1310,
  f6252: form6252,
  f2555: form2555,
  f4835: form4835,
  f2106: form2106,
  f8958: form8958,
  f8615: form8615,
  f1040sh: scheduleH,
  f8801: form8801,
  f8990: form8990,
  f8853: form8853,
  f3903: form3903,
  f8911: form8911,
  f8396: form8396,
  f8814: form8814,
  f982: form982,
  f5405: form5405,
  f461: form461,
  f1040r: scheduleR,
  f8824: form8824,
  f8839: form8839,
  f4684: form4684,
  f5884: form5884,
  f8846: form8846,
  f8994: form8994,
  f8586: form8586,
  f8992: form8992,
  f2439: form2439,
  f8997: form8997,
  f6765: form6765,
  f4136: form4136,
  f965a: form965a,
  f3468: form3468,
  f1040nr: form1040nr,
  f8995a: form8995a,
  f8995aa: form8995aa,
  f8995ab: form8995ab,
  f8995ac: form8995ac,
  f8995ad: form8995ad,
  f1040sc: scheduleC,
  f1040sse: scheduleSE,
};

export const FORMS = FORMS_PARTIAL as Record<FormId, FormDef>;

export const FORM_IDS: readonly FormId[] = FORM_ID_LIST.filter((id) => id in FORMS_PARTIAL);

export function getForm(id: string): FormDef | undefined {
  return (FORMS as Record<string, FormDef>)[id];
}
