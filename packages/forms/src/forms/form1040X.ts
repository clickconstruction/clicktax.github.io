import type { FormDef } from "../types.ts";
export const form1040X: FormDef = { id: "f1040x", title: "Form 1040-X, Amended U.S. Individual Income Tax Return", shortTitle: "Form 1040-X", description: "stub", years: [2024, 2025], fields: [], instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040x.pdf", notes: "", compute: (v) => ({ values: v, computations: [], warnings: [] }) };
