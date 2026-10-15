import type { FormDef } from "../types.ts";
export const scheduleA: FormDef = { id: "f1040sa", title: "Schedule A (Form 1040), Itemized Deductions", shortTitle: "Schedule A", description: "stub", years: [2024, 2025], fields: [], instructionsUrl: "https://www.irs.gov/pub/irs-pdf/i1040sca.pdf", notes: "", compute: (v) => ({ values: v, computations: [], warnings: [] }) };
