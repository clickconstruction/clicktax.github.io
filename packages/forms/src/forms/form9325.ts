import type { FieldDef, FormDef } from "../types.ts";

/** Continuous-use form (Rev. January 2017); the same PDF serves every tax year. */
const N = {
  "taxpayer_name": "Page1[0].Taxpayer_Name[0]",
  "taxpayer_address": "Page1[0].Taxpayer_Address_optional[0].Taxpayer_Address_optional[0]",
  "item1": "Page1[0].item_1[0].Your_federal_income_tax_return_for1[0]",
  "item1_year": "Page1[0].item_1[0].Your_federal_income_tax_return_for[0]",
  "item1_center": "Page1[0].item_1[0].was_filed_electronically_with_the[0]",
  "item1_provider": "Page1[0].item_1[0].Submission_Processing_Center_The_electronic_filing[0]",
  "item2": "Page1[0].item_2[0].Your_return_was_accepted_on1[0]",
  "item2_date": "Page1[0].item_2[0].Your_return_was_accepted_on[0]",
  "item2_submission_id": "Page1[0].item_2[0].for_you_The_Declaration_Control_Number_DCN_assigne[0]",
  "item3": "Page1[0].item_3[0].Your_return_was_accepted_on3[0]",
  "item3_date": "Page1[0].item_3[0].Your_return_was_accepted_on2[0]",
  "item4": "Page1[0].item_4[0].Your_electronic_funds_withdrawal_payment_was_accep[0]",
  "item5": "Page1[0].item_5[0].Your_electronic_funds_withdrawal_payment_was_not_a[0]",
  "item6": "Page1[0].item_6[0].Your_Form_4868_Application_for_Automatic_Extension[0]",
  "item6_date": "Page1[0].item_6[0].accepted_on[0]",
  "item6_submission_id": "Page1[0].item_6[0].is[0]"
} as const;
const text = (id: keyof typeof N, label: string, line?: string): FieldDef => ({ id, label, type: "text", locate: { name: N[id] }, ...(line ? { line } : {}) });
const box = (id: keyof typeof N, label: string, line: string): FieldDef => ({ id, label, type: "checkbox", line, locate: { name: N[id] } });

const fields: FieldDef[] = [
  text("taxpayer_name", "Taxpayer name"),
  text("taxpayer_address", "Taxpayer address (optional)"),
  box("item1", "Your federal income tax return was filed electronically", "1"),
  text("item1_year", "Tax year of the return filed", "1"),
  text("item1_center", "IRS Submission Processing Center the return was filed with", "1"),
  text("item1_provider", "Electronic filing services were provided by (ERO or transmitter)", "1"),
  box("item2", "Your return was accepted using a PIN as your electronic signature", "2"),
  text("item2_date", "Date the return was accepted", "2"),
  text("item2_submission_id", "Submission ID assigned to your return", "2"),
  box("item3", "Your return was accepted; allow 4 to 6 weeks for processing (EIC or dependent name/SSN mismatch)", "3"),
  text("item3_date", "Date the return was accepted (item 3)", "3"),
  box("item4", "Your electronic funds withdrawal payment request was accepted for processing", "4"),
  box("item5", "Your electronic funds withdrawal payment request was not accepted for processing", "5"),
  box("item6", "Your Form 4868 extension was accepted", "6"),
  text("item6_date", "Date the extension was accepted", "6"),
  text("item6_submission_id", "Submission ID assigned to your extension", "6"),
];

export const form9325: FormDef = {
  id: "f9325",
  title: "Form 9325, Acknowledgement and General Information for Taxpayers Who File Returns Electronically",
  shortTitle: "Form 9325",
  description: "The acknowledgement an Electronic Return Originator gives a taxpayer after the IRS accepts an e-filed return or extension: what was filed, when it was accepted, and the submission ID. Fill-only; nothing is computed.",
  years: [2024, 2025],
  fields,
  instructionsUrl: "https://www.irs.gov/pub/irs-pdf/f9325.pdf",
  notes: `**What this form is for.** An ERO (the person or firm that e-files on your behalf) completes Form 9325 and gives it to you as proof that the IRS accepted the return or extension. It is not filed with the IRS.

**What the engine does.** Places the values you supply; it does not e-file and does not know your submission ID or acceptance date. ClickTax prepares paper-ready PDFs; if an ERO files them for you, they issue this form.`,
  compute(values) {
    const warnings: string[] = [];
    if (values["item2"] === true && !values["item2_submission_id"]) warnings.push("Item 2 is checked: supply item2_submission_id from the IRS acknowledgement.");
    if (values["item6"] === true && !values["item6_submission_id"]) warnings.push("Item 6 is checked: supply item6_submission_id from the IRS acknowledgement.");
    return { values, computations: [], warnings };
  },
};
