/**
 * Realistic sample figures for every form, used by the website's Test buttons and by tests.
 * The people and numbers are invented; the SSNs are the classic placeholder values.
 */
import type { FormId, TaxYear, Values } from "./types.ts";
import type { ReturnInput } from "./engine/return.ts";

const NAME = "Jane Q Sample";
const SSN = "123456789";

const taxpayer: Values = {
  first_name: "Jane Q",
  last_name: "Sample",
  ssn: SSN,
  spouse_first_name: "John",
  spouse_last_name: "Sample",
  spouse_ssn: "987654321",
  address: "123 Main Street",
  city: "Austin",
  state: "TX",
  zip: "78701",
  filing_status: "mfj",
  digital_assets: false,
  occupation: "Plumber",
  spouse_occupation: "Bookkeeper",
  phone: "512-555-0100",
  dependents: [
    { name: "Sam Sample", ssn: "111223333", relationship: "Son", child_tax_credit: true },
    { name: "Ava Sample", ssn: "111224444", relationship: "Daughter", child_tax_credit: true },
  ],
  line1a: 48000,
  line2b: 320,
  line3a: 150,
  line3b: 150,
  line25a: 4100,
  line26: 9000,
};

const scheduleC: Values = {
  name: NAME,
  ssn: SSN,
  principal_business: "Plumbing contractor",
  business_code: "238220",
  business_name: "Sample Plumbing",
  ein: "123456789",
  address: "123 Main Street",
  city_state_zip: "Austin, TX 78701",
  accounting_method: "cash",
  material_participation: true,
  started_or_acquired: false,
  payments_require_1099: true,
  filed_required_1099: true,
  line1: 186500,
  line2: 1200,
  line6: 350,
  line8: 2400,
  line9: 6180,
  line11: 22500,
  line13: 7300,
  line15: 3900,
  line17: 1800,
  line18: 1250,
  line20a: 4800,
  line20b: 14400,
  line21: 2200,
  line22: 9800,
  line23: 1650,
  line24a: 1100,
  line24b: 640,
  line25: 3100,
  line26: 36000,
  line33_inventory_method: "cost",
  line34_inventory_change: false,
  line35: 4200,
  line36: 41000,
  line38: 3600,
  line41: 5100,
  line30_home_sqft: 2400,
  line30_business_sqft: 200,
  line43_vehicle_date: "06/01/2022",
  line44a_business_miles: 9200,
  line44b_commuting_miles: 1500,
  line44c_other_miles: 4100,
  line45_personal_use: true,
  line46_another_vehicle: true,
  line47a_evidence: true,
  line47b_written_evidence: true,
  other_expenses: [
    { description: "Software subscriptions", amount: 1440 },
    { description: "Trade licenses and permits", amount: 620 },
    { description: "Bank and merchant fees", amount: 910 },
  ],
};

const samples: Partial<Record<FormId, Values>> = {
  f1040: { ...taxpayer, line8: 60000, line10: 11439, line19: 4000, line23: 8478 },
  f1040sc: scheduleC,
  f1040sse: { name: NAME, ssn: SSN, line2: 60000, line8a: 48000 },
  f1040s1: { name: NAME, ssn: SSN, line3: 60000, line13: 3500, line15: 4239, line17: 7200, line21: 900 },
  f1040s2: { name: NAME, ssn: SSN, line4: 8478, line8: 600 },
  f1040s8: { name: NAME, ssn: SSN, filing_status: "mfj", line1: 110000, line4: 2, line6: 0, line13: 9000, line18a: 100000 },
  f1040s1a: { name: NAME, ssn: SSN, filing_status: "mfj", you_65_or_older: true, line1: 110000, line4a: 8000, line14a: 6000, vehicles: [{ vin: "1HGCM82633A004352", description: "2025 pickup, assembled in U.S.", interest: 2400 }] },
  f1040s3: { name: NAME, ssn: SSN, line1: 120, line2: 600, line3: 1500, line4: 200, line10: 1000, line11: 300 },
  f8829: { name: NAME, ssn: SSN, line1: 200, line2: 2400, line8: 19960, line10b: 9600, line11b: 5400, line18b: 1800, line21b: 3600, line37: 320000, line38: 80000, first_business_use_month: 1, first_business_use_year: 2021 },
  f4868: { name: "Jane Q and John Sample", address: "123 Main Street", city: "Austin", state: "TX", zip: "78701", ssn: SSN, spouse_ssn: "987654321", line4: 33436, line5: 18000, line7: 15436 },
  fw9: { name: "Jane Q Sample", business_name: "Sample Plumbing", classification: "individual", address: "123 Main Street", city_state_zip: "Austin, TX 78701", requester: "Big General Contractor LLC, 500 Congress Ave, Austin, TX 78701", ssn: SSN },
  f8889: { name: NAME, ssn: SSN, coverage: "family", line2: 6000, line9: 1500, line14a: 2200, line15: 2200 },
  f8959: { name: NAME, ssn: SSN, filing_status: "mfj", line1: 230000, line8: 60000, line19: 3335 },
  f8995: { name: NAME, ssn: SSN, filing_status: "mfj", businesses: [{ name: "Sample Plumbing", tin: "123456789", qbi: 10420 }], line11: 22990, line12: 150 },
};

/** Sample values for one form. The same for every supported year unless a field is year-specific. */
export function sampleValues(formId: FormId, _year: TaxYear): Values {
  const v = samples[formId];
  if (!v) throw new Error(`No sample for ${formId}`);
  return structuredClone(v);
}

/** A whole sample return: a married couple, one plumbing business, two children. */
export function sampleReturn(year: TaxYear): ReturnInput {
  const sc = structuredClone(scheduleC);
  delete sc["name"];
  delete sc["ssn"];
  return {
    year,
    form1040: structuredClone(taxpayer),
    scheduleC: [sc],
    scheduleSE: { line8a: 48000 },
    schedule1: { line13: 3500, line17: 7200, line21: 900 },
  };
}
