/** Core types shared by the schema, the compute engine, the MCP server, and the web renderer. */

export type TaxYear = 2024 | 2025;
export const SUPPORTED_YEARS: readonly TaxYear[] = [2024, 2025];

export type FilingStatus = "single" | "mfj" | "mfs" | "hoh" | "qss";
export const FILING_STATUSES: readonly FilingStatus[] = ["single", "mfj", "mfs", "hoh", "qss"];

/** Every supported form id, in catalog order. Adding a form: add it here, write its FormDef, run gen:fieldmaps. */
export const FORM_ID_LIST = ["f1040", "f1040s1", "f1040s2", "f1040s3", "f1040s1a", "f1040sc", "f1040sse", "f1040s8", "f8995", "f8889", "f8959", "f8829", "f4868", "fw9", "f1040es", "f4562", "f1099nec"] as const;
export type FormId = (typeof FORM_ID_LIST)[number];

/**
 * Field types. `money` and `integer` are numbers; `checkbox` is a boolean that maps to one PDF
 * checkbox; `yesno` is a boolean that maps to a Yes box and a No box; `choice` maps to one of
 * several PDF checkboxes; `date_mdy` maps to three comb boxes (MM / DD / YYYY); `list` is an
 * array of row objects (for example Schedule C Part V).
 */
export type FieldType =
  | "text"
  | "money"
  | "integer"
  | "checkbox"
  | "yesno"
  | "choice"
  | "ssn"
  | "ein"
  | "date_mdy"
  | "percent"
  | "list";

/**
 * How to find this field's PDF widget in a given year's IRS PDF. Rules are resolved offline by
 * tools/gen-fieldmaps.ts against the draft labels, never at runtime.
 *  - `tok`: the printed line token immediately left of the box (e.g. "27a"); amount boxes.
 *  - `above`: substring of the printed label just above the box (header boxes).
 *  - `row`: substring of the printed text on the same row left of the box.
 *  - `name`: explicit short PDF field name (fallback; may differ per year via `names`).
 */
export interface Locate {
  tok?: string | Partial<Record<TaxYear, string>>;
  above?: string;
  row?: string;
  name?: string | string[];
  /** Per-year explicit names when the PDF changed between years. A year without an entry is skipped (field absent that year). */
  names?: Partial<Record<TaxYear, string | string[]>>;
  page?: number | Partial<Record<TaxYear, number>>;
  kind?: "text" | "check";
  /** When several widgets match: "rightmost" (default for tok), "leftmost", or a 0-based index by x. */
  pick?: "rightmost" | "leftmost" | number;
  /** Optional x window [min, max] to disambiguate. */
  x?: [number, number];
}

export interface ListItemDef {
  id: string;
  label: string;
  type: "text" | "money" | "checkbox" | "ssn" | "yesno" | "percent" | "integer";
  maxLen?: number;
  /** True when the engine computes this item. */
  computed?: boolean;
  /** Years in which this item exists (defaults to all years of the form). */
  years?: readonly TaxYear[];
}

export interface FieldDef {
  /** Stable semantic id (stays the same across tax years), e.g. "line1" or "business_name". */
  id: string;
  label: string;
  /** Printed line number, when the field is a numbered line. */
  line?: string;
  type: FieldType;
  /** True when the engine computes this value; agent-supplied values are ignored with a warning. */
  computed?: boolean;
  /** Short guidance, written in plain language. */
  notes?: string;
  maxLen?: number;
  choices?: readonly string[];
  /** Years in which this field exists (defaults to all supported years). */
  years?: readonly TaxYear[];
  /** PDF location rule. For yesno: {yes, no}. For choice: one rule per choice. For date_mdy: {month, day, year}. For ssn/ein split across comb boxes: {p1, p2, p3} / {p1, p2}. */
  locate?: Locate | Record<string, Locate>;
  /** For `list` fields. */
  items?: readonly ListItemDef[];
  rows?: number;
  /** For list fields: per year, per item id, the short PDF field name of each row (index = row); an array per row names copies. */
  listLocate?: Partial<Record<TaxYear, Record<string, readonly (string | readonly string[])[]>>>;
  /** Mark lines that should be written even when zero (totals a reviewer expects to see). */
  alwaysShow?: boolean;
}

export type Scalar = string | number | boolean;
export type ListRow = Record<string, Scalar | undefined>;
export type Values = Record<string, Scalar | ListRow[] | undefined>;

export type Rounding = "whole" | "cents";

export interface ComputeContext {
  year: TaxYear;
  rounding: Rounding;
}

export interface Computation {
  id: string;
  line?: string;
  label: string;
  value: Scalar;
  /** Human-readable formula, e.g. "line 3 = line 1 - line 2 = 120,000 - 2,000". */
  formula: string;
}

export interface ComputeResult {
  /** All values: agent-supplied, normalized, plus computed. */
  values: Values;
  computations: Computation[];
  warnings: string[];
}

export interface FormDef {
  id: FormId;
  title: string;
  shortTitle: string;
  description: string;
  years: readonly TaxYear[];
  fields: readonly FieldDef[];
  /** Form-level notes shown to the agent and the person (plain Markdown). */
  notes: string;
  /** Official IRS instructions for this form. */
  instructionsUrl: string;
  /** IRS PDF file stem on irs.gov (defaults to the form id), e.g. "f1040s1a". */
  pdf?: string;
  compute: (values: Values, ctx: ComputeContext) => ComputeResult;
}

/** Map of semantic field id (or "id.part" / "listId[row].col") to full PDF field name for one year. */
export type FieldMap = Record<string, string>;

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}
