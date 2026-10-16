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
  f1040es: { first_name: "Jane Q", last_name: "Sample", ssn: SSN, spouse_first_name: "John", spouse_last_name: "Sample", spouse_ssn: "987654321", address: "123 Main Street", city: "Austin", state: "TX", zip: "78701", filing_status: "mfj", line1: 110000, line2a: 31500, line2b: 2000, line9: 8500, line11b: 0, prior_year_tax: 14000, prior_year_agi: 110000, line13: 4100 },
  f9325: { taxpayer_name: NAME, taxpayer_address: "123 Sample St, Springfield, IL 62701", item1: true, item1_year: "2025", item1_center: "Ogden", item1_provider: "Sample Tax Service LLC", item2: true, item2_date: "02/14/2026", item2_submission_id: "12345620260451234567", item4: true },
  f1040se: { name: NAME, ssn: SSN, lineA: false, properties: [{ address: "412 Maple Ave, Springfield, IL 62701", type: "1", fair_rental_days: 365, personal_use_days: 0, line3: 24000, line9: 1400, line12: 7800, line14: 2200, line16: 3900, line17: 600, line18: 5450 }, { address: "Mineral rights, Weld County, CO", type: "6", line4: 3100, line16: 180 }], line27: false },
  f1040sei: { name: NAME, ssn: SSN, filing_status: "hoh", earned_income: 31000, agi: 31400, investment_income: 120, children: [{ name: "Avery Sample", ssn: "987654321", year_of_birth: "2017", relationship: "daughter", months_lived: 12 }, { name: "Blake Sample", ssn: "876543210", year_of_birth: "2020", relationship: "son", months_lived: 12 }] },
  f8949: { name: NAME, ssn: SSN, short_term_box: "A", short_term: [{ description: "100 sh. XYZ Corp", date_acquired: "02/10/2025", date_sold: "08/15/2025", proceeds: 5400, cost: 4800 }, { description: "0.5 BTC", date_acquired: "01/05/2025", date_sold: "11/20/2025", proceeds: 31000, cost: 34500 }], long_term_box: "D", long_term: [{ description: "50 sh. ABC Fund", date_acquired: "03/01/2019", date_sold: "06/30/2025", proceeds: 12000, cost: 7000 }] },
  f1040sd: { name: NAME, ssn: SSN, filing_status: "single", qof_disposal: false, line1b_d: 36400, line1b_e: 39300, line1b_g: 0, line8b_d: 12000, line8b_e: 7000, line8b_g: 0, line13: 850, line14: -1200 },
  f2441: { name: NAME, ssn: SSN, filing_status: "hoh", providers: [{ name: "Sunny Days Child Care LLC", address: "88 Elm St, Springfield, IL 62701", id_number: "36-1234567", household_employee: false, amount_paid: 7200 }], persons: [{ first_name: "Avery", last_name: "Sample", ssn: "987654321", expenses: 7200 }], line4: 58000, line7: 58000, line10: 4100 },
  f8863: { name: NAME, ssn: SSN, filing_status: "single", line3: 52000, credit_limit: 3900, student_name: "Jane Q Sample", student_ssn: SSN, institution_1_name: "State University", institution_1_address: "1 College Way, Springfield, IL 62701", institution_1_1098t: true, institution_1_1098t_prior_box7: false, institution_1_ein: "371234567", line23: false, line24: true, line25: false, line26: false, line27: 6200 },
  f1040sa: { name: NAME, ssn: SSN, filing_status: "single", line1: 9800, line2: 85000, line5a: 4200, line5b: 6100, line5c: 350, line8a: 11200, line11: 2400, line12: 300 },
  f8880: { name: NAME, ssn: SSN, filing_status: "single", line1a: 3000, line2a: 1500, line8: 23500, ws_line1: 1800, ws_line2: 0 },
  f1040sb: { name: NAME, ssn: SSN, interest: [{ payer: "First Community Bank", amount: 1240 }, { payer: "US Treasury I bonds", amount: 610 }], line3: 0, dividends: [{ payer: "Vanguard Total Stock Market", amount: 2180 }, { payer: "Schwab brokerage", amount: 455 }], line7a_foreign_account: false, line8_foreign_trust: false },
  f4562: { name: NAME, business_activity: "Plumbing contractor", identifying_number: "123456789", section179_property: [{ description: "Pipe threading machine", cost: 14000, elected: 14000 }], line11: 60000, macrs_7yr_b: "03/2025", macrs_7yr_c: 9800, listed_property: [{ type: "2025 pickup truck", date: "06/01/2025", business_pct: 80, cost: 52000, recovery: 5 }], vehicles: [{ business_miles: 9200, commuting_miles: 1500, other_miles: 4100, available_off_duty: true, used_by_owner: true, another_vehicle: true }], line24a_evidence: true, line24b_written: true },
  f1099nec: { payer_name: "Big General Contractor LLC", payer_address: "500 Congress Ave", payer_city_state_zip: "Austin, TX 78701", payer_phone: "512-555-0199", payer_tin: "123456789", recipient_tin: SSN, recipient_name: "Jane Q Sample", recipient_street: "123 Main Street", recipient_city_state_zip: "Austin, TX 78701", box1: 48500, states: [{ state_tax_withheld: 0, state_number: "TX", state_income: 48500 }] },
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
