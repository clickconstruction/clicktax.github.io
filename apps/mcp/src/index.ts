/**
 * ClickTax MCP server: a stateless Cloudflare Worker that validates form values, computes the
 * arithmetic lines, and returns a link that renders the official IRS PDF in the person's browser.
 * It never touches a PDF, stores nothing, and logs nothing.
 */
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import {
  DISCLAIMER,
  FORMS,
  FORM_IDS,
  SUPPORTED_YEARS,
  formNotes,
  formSchema,
  prepareForm,
  prepareReturn,
  type Computation,
  type FormId,
  type PreparedForm,
  type TaxYear,
  type ValidationIssue,
  type Values,
} from "@clicktax/forms";

interface Env {
  RENDER_BASE?: string;
}

const VERSION = "0.2.0";
const formIdSchema = z.enum(FORM_IDS as [FormId, ...FormId[]]).describe("Form id: f1040, f1040sc (Schedule C), f1040sse (Schedule SE), f1040s1 (Schedule 1), f1040s2 (Schedule 2)");
const yearSchema = z.union([z.literal(2024), z.literal(2025)]).describe("Tax year (the year the income was earned): 2024 or 2025");
const valuesSchema = z.record(z.string(), z.unknown()).describe("Semantic field id → value, per get_form_schema. Money as numbers; checkboxes as true/false; yes/no questions as true/false; lists as arrays of row objects.");
const roundingSchema = z.enum(["whole", "cents"]).optional().describe("whole (default, IRS whole-dollar rounding) or cents");

function money(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  const s = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n < 0 ? `(${s})` : s;
}

function fmtComputations(cs: Computation[]): string {
  return cs.map((c) => `- ${c.line ? `line ${c.line} ` : ""}${c.label} = **${typeof c.value === "number" ? money(c.value) : String(c.value)}**  (${c.formula})`).join("\n");
}

function fmtIssues(issues: ValidationIssue[]): string {
  return issues.map((i) => `- ${i.severity}: ${i.message}`).join("\n");
}

function formBlock(p: PreparedForm): string {
  const lines = [`### ${p.title}`];
  if (p.computations.length) lines.push("Computed lines:", fmtComputations(p.computations));
  if (p.warnings.length) lines.push("Warnings:", p.warnings.map((w) => `- ${w}`).join("\n"));
  if (p.issues.length) lines.push("Input issues:", fmtIssues(p.issues));
  return lines.join("\n");
}

function stripPdfFields(p: PreparedForm) {
  const { pdfFields: _omit, ...rest } = p;
  return rest;
}

function createServer(env: Env): McpServer {
  const renderBase = env.RENDER_BASE ?? "https://clicktax.org";
  const server = new McpServer(
    { name: "clicktax", version: VERSION, title: "ClickTax" },
    {
      instructions: `${DISCLAIMER}
ClickTax fills IRS forms for tax years ${SUPPORTED_YEARS.join(" and ")}: ${FORM_IDS.map((id) => FORMS[id].shortTitle).join(", ")}.
Workflow: call list_forms, then get_form_schema and get_form_notes for each form, collect the person's figures using the semantic field ids, then call fill_form (one form) or prepare_return (a whole sole-proprietor return). Every result has two parts: the form (computed values and a link that renders the PDF locally in the person's browser) and the notes (plain-language guidance and what to verify). Give the person the link; the server stores nothing and the link's data never reaches it. Never invent figures; ask the person. The engine computes arithmetic lines only; credits, itemized deductions, QBI, and capital-gain tax need other IRS forms or worksheets. It does not e-file.`,
    },
  );
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

  server.registerTool(
    "list_forms",
    {
      title: "List supported forms",
      description: "Lists the IRS forms ClickTax can fill, the supported tax years, and the disclaimer. Call this first.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => {
      const forms = FORM_IDS.map((id) => ({ id, shortTitle: FORMS[id].shortTitle, title: FORMS[id].title, years: FORMS[id].years, description: FORMS[id].description, instructions: FORMS[id].instructionsUrl }));
      const text = [`**${DISCLAIMER}**`, "", ...forms.map((f) => `- \`${f.id}\` ${f.shortTitle} (${f.years.join(", ")}): ${f.description}`), "", `Renderer: ${renderBase}/fill`].join("\n");
      return { content: [{ type: "text", text }], structuredContent: { disclaimer: DISCLAIMER, years: SUPPORTED_YEARS, forms, renderBase } };
    },
  );

  server.registerTool(
    "get_form_schema",
    {
      title: "Get a form's fields",
      description: "Returns the semantic field ids, labels, types, line numbers, and which lines the engine computes for one form and tax year. Use these ids as keys in fill_form values.",
      inputSchema: z.object({ form: formIdSchema, year: yearSchema }),
      annotations: readOnly,
    },
    async ({ form, year }) => {
      const schema = formSchema(form, year as TaxYear);
      const text = [`**${schema.title}** (${year})`, schema.description, "", ...schema.fields.map((f) => `- \`${f.id}\`${f.line ? ` (line ${f.line})` : ""}: ${f.label} [${f.type}${f.computed ? ", computed" : ""}${f.choices ? `: ${f.choices.join("|")}` : ""}]${f.notes ? ` — ${f.notes}` : ""}`)].join("\n");
      return { content: [{ type: "text", text }], structuredContent: schema };
    },
  );

  server.registerTool(
    "get_form_notes",
    {
      title: "Get a form's notes",
      description: "The form notes: plain-language guidance on what the form is for, what the engine computes, and what to verify before filing. Kept separate from the filled form so you can show it to the person.",
      inputSchema: z.object({ form: formIdSchema, year: yearSchema }),
      annotations: readOnly,
    },
    async ({ form, year }) => {
      const notes = formNotes(form, year as TaxYear);
      const text = [`## ${notes.title} (${year})`, notes.notes, "", "Line notes:", ...notes.lineNotes.map((n) => `- ${n.line ? `line ${n.line} ` : ""}\`${n.id}\`: ${n.notes}`)].join("\n");
      return { content: [{ type: "text", text }], structuredContent: notes };
    },
  );

  server.registerTool(
    "fill_form",
    {
      title: "Fill one form",
      description: "Validates the supplied values for one form, computes its arithmetic lines, and returns (1) the form: computed values plus a link that renders the filled official IRS PDF in the person's browser, and (2) the notes: computations with formulas, warnings, input issues, and guidance. Nothing is stored.",
      inputSchema: z.object({ form: formIdSchema, year: yearSchema, values: valuesSchema, rounding: roundingSchema, title: z.string().optional().describe("Optional title shown on the render page") }),
      annotations: readOnly,
    },
    async ({ form, year, values, rounding, title }) => {
      const prepared = await prepareForm(form, year as TaxYear, values as Values, { renderBase, ...(rounding ? { rounding } : {}), ...(title ? { title } : {}) });
      const notes = formNotes(form, year as TaxYear);
      const text = [`**${DISCLAIMER}**`, "", `Open this link to render and download the filled ${FORMS[form].shortTitle} (${year}):`, prepared.link, "", formBlock(prepared), "", "Notes: see structuredContent.notes (or call get_form_notes)."].join("\n");
      return {
        content: [{ type: "text", text }],
        structuredContent: { disclaimer: DISCLAIMER, form: { ...stripPdfFields(prepared), link: prepared.link }, statements: prepared.statements, notes: { ...notes, computations: prepared.computations, warnings: prepared.warnings, issues: prepared.issues } },
      };
    },
  );

  server.registerTool(
    "prepare_return",
    {
      title: "Prepare a sole-proprietor return",
      description: "Assembles a whole return: each Schedule C (and Schedule F farm) feeds Schedule SE, Schedule 1, Schedule 2, Form 8995 (QBI deduction), Schedule 8812 (when dependents are marked for the child tax credit), Form 8959 (when income crosses the Additional Medicare Tax threshold), Schedule 1-A (2025 seniors and supplied tips/overtime/car-loan figures), Form 8889 (when HSA figures are supplied), Schedule 3 (when supplied or when Form 2441, 8863, or 8880 credits apply), Schedule A (when itemizing beats the standard deduction), Schedule B, Schedule D with Forms 8949, Schedule E, the earned income credit from Schedule EIC, Form 8829 (home office → Schedule C line 30) and Form 4562 (depreciation → Schedule C line 13) for one business, and Form 1040 automatically (business profit → self-employment tax → deductions → AGI → taxable income → tax → credits → refund or amount owed); afterwards Form 4868 (extension voucher) and Form 1040-ES (next year's estimated-tax vouchers) when requested. Returns one link that renders every form, plus per-form computations, warnings, and notes. Supply form1040 values (names, SSN, filing status, address, dependents, W-2 wages, withholding, payments...), scheduleC as an array (add owner: \"spouse\" for a spouse's business on a joint return), and optional scheduleSE/scheduleSESpouse (e.g. line8a W-2 social security wages), schedule1, schedule2, schedule3, scheduleA (itemized deductions), scheduleB (interest/dividend payers), scheduleD and form8949 (an array; capital gains), scheduleE (rentals and K-1s), scheduleF (farms; one per farm, owner: \"spouse\" for the spouse's; → Schedule 1 line 6 and Schedule SE), scheduleEIC (earned income credit), form2441, form8863, form8880 (credits), form4952 (investment interest → Schedule A line 9), form6781 (section 1256 contracts and straddles → Schedule D), form8936 (clean vehicle credits → Schedule 3 lines 6f/6m), form3800 (general business credit: credits rows such as {line: \"4b\", nonpassive: 2400} for Form 5884 → Schedule 3 line 6a), form8862 and form8938 (attached as supplied), schedule1A, schedule8812, form8995, form8889, form8959, form8829 and form4562 (one per business, each with business: N), form8889 (one per spouse), form4868, form1040es values (see each form's get_form_schema). Form 8582 (passive losses) and Form 8960 (net investment income tax) are prepared automatically when they apply; supply form8582/form8960 to add inputs or { skip: true } to suppress them. Form 4562 accepts an assets list (every asset, any year) and the result includes supporting statements (Depreciation and Amortization Report, QBI computation) that render with the forms. Set form1040.use_1040sr: true to render the main return on Form 1040-SR. W-9, 1099-NEC, 9325, and 1040-X are standalone: use fill_form. Example: {year: 2025, form1040: {first_name: \"Ann\", last_name: \"Lee\", ssn: \"123456789\", filing_status: \"single\", digital_assets: false, line1a: 50000, line25a: 6000}, scheduleC: [{principal_business: \"Consulting\", accounting_method: \"cash\", material_participation: true, line1: 80000, line18: 1200}]}",
      inputSchema: z.object({
        year: yearSchema,
        form1040: valuesSchema,
        scheduleC: z.array(valuesSchema).optional(),
        scheduleSE: valuesSchema.optional(),
        scheduleSESpouse: valuesSchema.optional(),
        schedule1: valuesSchema.optional(),
        schedule2: valuesSchema.optional(),
        schedule8812: valuesSchema.optional(),
        schedule3: valuesSchema.optional(),
        scheduleE: valuesSchema.optional().describe("Rental, royalty, and K-1 income; line 41 → Schedule 1 line 5"),
        scheduleEIC: valuesSchema.optional().describe("Qualifying children for the earned income credit (or no_qualifying_children: true); the computed credit → 1040 line 27"),
        scheduleD: valuesSchema.optional().describe("Capital gains and losses; line 16 (or the allowed loss) goes to 1040 line 7"),
        form8949: z.array(valuesSchema).optional().describe("One Form 8949 per box combination; totals flow to Schedule D by box"),
        form2441: valuesSchema.optional().describe("Child and dependent care credit → Schedule 3 line 2; taxable benefits → 1040 line 1e"),
        form8863: valuesSchema.optional().describe("Education credits → Schedule 3 line 3 and 1040 line 29 (refundable part)"),
        form8880: valuesSchema.optional().describe("Saver's credit → Schedule 3 line 4"),
        form2210: valuesSchema.optional().describe("Underpayment penalty inputs (prior_year_tax, prior_year_agi, estimated_payments with dates, Part II boxes, ai_periods) or { skip: true }; figured automatically when $1,000 or more is owed"),
        form4797: valuesSchema.optional().describe("Sales of business property; line 9 → Schedule D line 11, line 18b → Schedule 1 line 4"),
        form5695: valuesSchema.optional().describe("Residential energy credits; lines 15/32 → Schedule 3 lines 5a/5b"),
        form8962: valuesSchema.optional().describe("Premium tax credit from Form 1095-A (line11a/b/f annual totals or monthly rows); net credit → Schedule 3 line 9, repayment → Schedule 2 line 1a"),
        form1116: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("Foreign tax credit, one per category (passive, general...); → Schedule 3 line 1"),
        form8606: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("Nondeductible IRAs / Roth conversions, one per spouse (owner: \"spouse\"); taxable amounts → 1040 line 4b"),
        form5329: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("Additional taxes on retirement accounts, one per spouse; total → Schedule 2 line 8"),
        form6251: valuesSchema.optional().describe("AMT adjustments (2c-2t, line 8) or { skip: true }; the AMT is figured automatically"),
        form8283: valuesSchema.optional().describe("Noncash charitable contributions, attached when supplied"),
        scheduleF: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("Farm income (Schedule F), one per farm (owner: \"spouse\" for the spouse's); line 34 → Schedule 1 line 6 and Schedule SE line 1a"),
        form4952: valuesSchema.optional().describe("Investment interest expense; line 8 → Schedule A line 9"),
        form3800: valuesSchema.optional().describe("General business credit: credits rows ({ line: \"4b\", nonpassive: ... }) and carryovers rows; line 38 → Schedule 3 line 6a"),
        form6781: valuesSchema.optional().describe("Section 1256 contracts and straddles; the 40%/60% split → Schedule D lines 4 and 11"),
        form8936: valuesSchema.optional().describe("Clean vehicle credits from the Schedule A (Form 8936) totals (line6, line9, line14, line19); → Schedule 3 lines 6f/6m and Form 3800"),
        form8862: valuesSchema.optional().describe("Information to claim credits after disallowance, attached as supplied"),
        form8938: valuesSchema.optional().describe("Specified foreign financial assets (FATCA), attached as supplied"),
        form8888: valuesSchema.optional().describe("Split the refund among up to three accounts (accounts rows: amount, routing, type, account); line 5 is checked against Form 1040 line 35a"),
        form1310: valuesSchema.optional().describe("Person claiming a refund for a deceased taxpayer, attached as supplied"),
        form6252: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("Installment sale income, one per sale; line 26 → Schedule D line 11 (long_term: false → line 4; business_property: true keeps it for Form 4797)"),
        form2555: valuesSchema.optional().describe("Foreign earned income exclusion and housing amounts; line 45 → Schedule 1 line 8d, line 50 → line 24j, and Form 1040 line 16 uses the Foreign Earned Income Tax Worksheet"),
        form4835: valuesSchema.optional().describe("Farm rental income; net → Schedule E line 40"),
        form2106: valuesSchema.optional().describe("Employee business expenses (reservists, performing artists, fee-basis officials); line 10 → Schedule 1 line 12"),
        form8958: valuesSchema.optional().describe("Community property allocation (items rows with line, description, total, spouse_a, spouse_b), attached with the names and SSNs from Form 1040"),
        form8615: valuesSchema.optional().describe("Kiddie tax (parent's name, SSN, filing status, taxable income line6, tax line10); line 18 replaces Form 1040 line 16"),
        scheduleH: valuesSchema.optional().describe("Household employment taxes (cash wages line1, withholding line7, FUTA line13-15 or states rows); line 26 → Schedule 2 line 9"),
        form8801: valuesSchema.optional().describe("Credit for prior-year minimum tax (last year's Form 6251 figures); line 25 → Schedule 3 line 6b"),
        form8990: valuesSchema.optional().describe("Section 163(j) business interest limitation with Schedule A/B rows, attached as supplied"),
        form8853: valuesSchema.optional().describe("Archer MSAs and LTC contracts; deduction → Schedule 1 line 23, taxable amounts → line 8e, additional taxes → Schedule 2 line 17z"),
        form3903: valuesSchema.optional().describe("Moving expenses (Armed Forces); line 5 → Schedule 1 line 14"),
        form8911: valuesSchema.optional().describe("Alternative fuel vehicle refueling property credit from the Schedule A (Form 8911) totals; line 10 → Schedule 3 line 6j, line 3 → Form 3800"),
        form8396: valuesSchema.optional().describe("Mortgage interest credit (MCC); line 9 → Schedule 3 line 6g"),
        form8814: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("Parents' election to report a child's interest and dividends, one per child; → Schedule 1 line 8z, Form 1040 lines 3a/7, and the line 15 tax added to line 16"),
        form982: valuesSchema.optional().describe("Reduction of tax attributes for excluded canceled debt, attached as supplied"),
        form5405: valuesSchema.optional().describe("Repayment of the 2008 first-time homebuyer credit on disposition; line 8 → Schedule 2 line 10"),
        form461: valuesSchema.optional().describe("Limitation on business losses (lines 2-6 default from the return); excess loss → Schedule 1 line 8p"),
        scheduleR: valuesSchema.optional().describe("Credit for the elderly or the disabled (box 1-9, disability income); line 22 → Schedule 3 line 6d"),
        form8824: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("Like-kind exchanges, one per exchange; recognized gain → Schedule D line 11 (or 4); business_property keeps it for Form 4797"),
        form8839: valuesSchema.optional().describe("Adoption credit and employer benefits (children rows); line 18 → Schedule 3 line 6c, line 31 → Form 1040 line 1f, 2025 refundable line 13 → line 30"),
        form4684: valuesSchema.optional().describe("Casualties and thefts (properties and business_properties rows); line 18 → Schedule A line 15, lines 32/38b → Schedule A line 16, gain → Schedule D"),
        form8582: valuesSchema.optional().describe("Passive activity loss inputs (other_activities, line6 MAGI override, mfs_lived_apart) or { skip: true }; built automatically from Schedule E rental losses"),
        form8960: valuesSchema.optional().describe("Net investment income tax inputs (line4b, line5b, line9b...) or { skip: true }; built automatically when AGI exceeds the threshold"),
        scheduleA: valuesSchema.optional().describe("Itemized deductions; used on 1040 line 12 only when larger than the standard deduction, elected, or required"),
        scheduleB: valuesSchema.optional().describe("Interest and dividend payers; line 4 → 1040 line 2b, line 6 → line 3b"),
        schedule1A: valuesSchema.optional(),
        form8995: valuesSchema.optional(),
        form8889: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("HSA; one per account holder, add owner: \"spouse\" for the spouse's"),
        form8959: valuesSchema.optional(),
        form8829: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("Home office (actual expenses); one per business, each with business: N for the Nth Schedule C"),
        form4562: z.union([valuesSchema, z.array(valuesSchema)]).optional().describe("Depreciation and section 179; one per business, each with business: N for the Nth Schedule C"),
        form4868: valuesSchema.optional().describe("Extension voucher; line 7 is the payment you are sending"),
        form1040es: valuesSchema.optional().describe("Estimated-tax worksheet and vouchers for the following year"),
        rounding: roundingSchema,
        title: z.string().optional(),
      }),
      annotations: readOnly,
    },
    async (input) => {
      const { year, rounding, title, ...rest } = input;
      const result = await prepareReturn(
        { year: year as TaxYear, form1040: rest.form1040 as Values, ...(rest.scheduleC ? { scheduleC: rest.scheduleC as Values[] } : {}), ...(rest.scheduleSE ? { scheduleSE: rest.scheduleSE as Values } : {}), ...(rest.scheduleSESpouse ? { scheduleSESpouse: rest.scheduleSESpouse as Values } : {}), ...(rest.schedule1 ? { schedule1: rest.schedule1 as Values } : {}), ...(rest.schedule2 ? { schedule2: rest.schedule2 as Values } : {}), ...(rest.schedule8812 ? { schedule8812: rest.schedule8812 as Values } : {}), ...(rest.schedule3 ? { schedule3: rest.schedule3 as Values } : {}), ...(rest.scheduleB ? { scheduleB: rest.scheduleB as Values } : {}), ...(rest.scheduleA ? { scheduleA: rest.scheduleA as Values } : {}), ...(rest.scheduleD ? { scheduleD: rest.scheduleD as Values } : {}), ...(rest.scheduleE ? { scheduleE: rest.scheduleE as Values } : {}), ...(rest.scheduleEIC ? { scheduleEIC: rest.scheduleEIC as Values } : {}), ...(rest.form8949 ? { form8949: rest.form8949 as Values[] } : {}), ...(rest.form2441 ? { form2441: rest.form2441 as Values } : {}), ...(rest.form8863 ? { form8863: rest.form8863 as Values } : {}), ...(rest.form8880 ? { form8880: rest.form8880 as Values } : {}), ...(rest.form8582 ? { form8582: rest.form8582 as Values } : {}), ...(rest.form8606 ? { form8606: rest.form8606 as Values | Values[] } : {}), ...(rest.form8962 ? { form8962: rest.form8962 as Values } : {}), ...(rest.form4797 ? { form4797: rest.form4797 as Values } : {}), ...(rest.form2210 ? { form2210: rest.form2210 as Values } : {}), ...(rest.form5695 ? { form5695: rest.form5695 as Values } : {}), ...(rest.form1116 ? { form1116: rest.form1116 as Values | Values[] } : {}), ...(rest.form5329 ? { form5329: rest.form5329 as Values | Values[] } : {}), ...(rest.form6251 ? { form6251: rest.form6251 as Values } : {}), ...(rest.form8283 ? { form8283: rest.form8283 as Values } : {}), ...(rest.scheduleF ? { scheduleF: rest.scheduleF as Values | Values[] } : {}), ...(rest.form4952 ? { form4952: rest.form4952 as Values } : {}), ...(rest.form3800 ? { form3800: rest.form3800 as Values } : {}), ...(rest.form6781 ? { form6781: rest.form6781 as Values } : {}), ...(rest.form8936 ? { form8936: rest.form8936 as Values } : {}), ...(rest.form8862 ? { form8862: rest.form8862 as Values } : {}), ...(rest.form8938 ? { form8938: rest.form8938 as Values } : {}), ...(rest.form8888 ? { form8888: rest.form8888 as Values } : {}), ...(rest.form1310 ? { form1310: rest.form1310 as Values } : {}), ...(rest.form6252 ? { form6252: rest.form6252 as Values | Values[] } : {}), ...(rest.form2555 ? { form2555: rest.form2555 as Values } : {}), ...(rest.form4835 ? { form4835: rest.form4835 as Values } : {}), ...(rest.form2106 ? { form2106: rest.form2106 as Values } : {}), ...(rest.form8958 ? { form8958: rest.form8958 as Values } : {}), ...(rest.form8615 ? { form8615: rest.form8615 as Values } : {}), ...(rest.scheduleH ? { scheduleH: rest.scheduleH as Values } : {}), ...(rest.form8801 ? { form8801: rest.form8801 as Values } : {}), ...(rest.form8990 ? { form8990: rest.form8990 as Values } : {}), ...(rest.form8853 ? { form8853: rest.form8853 as Values } : {}), ...(rest.form3903 ? { form3903: rest.form3903 as Values } : {}), ...(rest.form8911 ? { form8911: rest.form8911 as Values } : {}), ...(rest.form8396 ? { form8396: rest.form8396 as Values } : {}), ...(rest.form8814 ? { form8814: rest.form8814 as Values | Values[] } : {}), ...(rest.form982 ? { form982: rest.form982 as Values } : {}), ...(rest.form5405 ? { form5405: rest.form5405 as Values } : {}), ...(rest.form461 ? { form461: rest.form461 as Values } : {}), ...(rest.scheduleR ? { scheduleR: rest.scheduleR as Values } : {}), ...(rest.form8824 ? { form8824: rest.form8824 as Values | Values[] } : {}), ...(rest.form8839 ? { form8839: rest.form8839 as Values } : {}), ...(rest.form4684 ? { form4684: rest.form4684 as Values } : {}), ...(rest.form8960 ? { form8960: rest.form8960 as Values } : {}), ...(rest.schedule1A ? { schedule1A: rest.schedule1A as Values } : {}), ...(rest.form8995 ? { form8995: rest.form8995 as Values } : {}), ...(rest.form8889 ? { form8889: rest.form8889 as Values | Values[] } : {}), ...(rest.form8959 ? { form8959: rest.form8959 as Values } : {}), ...(rest.form8829 ? { form8829: rest.form8829 as Values | Values[] } : {}), ...(rest.form4562 ? { form4562: rest.form4562 as Values | Values[] } : {}), ...(rest.form4868 ? { form4868: rest.form4868 as Values } : {}), ...(rest.form1040es ? { form1040es: rest.form1040es as Values } : {}), ...(rounding ? { rounding } : {}) },
        { renderBase, ...(title ? { title } : {}) },
      );
      const totals = Object.entries(result.totals).map(([k, v]) => `- ${k.replace(/_/g, " ")}: **${money(v)}**`).join("\n");
      const text = [`**${DISCLAIMER}**`, "", `Open this link to render and download all ${result.forms.length} forms (${year}):`, result.link, "", "Totals:", totals, "", ...(result.warnings.length ? ["Return-level warnings:", ...result.warnings.map((w) => `- ${w}`), ""] : []), ...result.forms.map(formBlock), ...(result.statements.length ? ["", "Supporting statements (rendered as plain pages on the link):", ...result.statements.map((st) => `- ${st.title}`)] : [])].join("\n");
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          disclaimer: DISCLAIMER,
          year,
          link: result.link,
          statements: result.statements,
          totals: result.totals,
          warnings: result.warnings,
          forms: result.forms.map((f) => ({ ...stripPdfFields(f), notes: formNotes(f.form, year as TaxYear) })),
        },
      };
    },
  );

  server.registerPrompt(
    "prepare_return_interview",
    {
      title: "Interview for a sole-proprietor return",
      description: "A step-by-step interview the agent runs with the person before calling prepare_return.",
      argsSchema: z.object({ year: z.string().optional().describe("Tax year, 2024 or 2025") }),
    },
    ({ year }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Help me prepare my ${year ?? "2025"} federal return with the ClickTax tools. Start by telling me: ${DISCLAIMER}
Then interview me in this order, one topic at a time, and do not invent any figure:
1. Who is filing: names, SSNs, address, filing status, whether anyone can claim me, age 65+ or blind boxes, dependents (name, SSN, relationship, whether each qualifies for the child tax credit), and the digital-assets yes/no question.
2. W-2 wages and withholding (Form 1040 lines 1a, 25a), interest and dividends (2b, 3a, 3b), any other income, estimated payments (line 26).
3. Each business: call get_form_schema for f1040sc and ask for gross receipts, each expense category by line, vehicle information if a vehicle is used, home office, accounting method, and the 1099 questions. Add owner: "spouse" for my spouse's business.
4. Adjustments on Schedule 1 (self-employed health insurance, retirement plan contributions, HSA, student loan interest).
When you have everything, call prepare_return, give me the link, and walk me through the computed lines and every warning. Remind me that I must review, sign, and mail the return myself; nothing is e-filed.`,
          },
        },
      ],
    }),
  );

  return server;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") {
      const handler = createMcpHandler(() => createServer(env), { route: "/mcp", corsOptions: { origin: "*" }, allowedOriginHostnames: "*" });
      const res = await handler(request, env, ctx);
      const headers = new Headers(res.headers);
      headers.set("cache-control", "no-store");
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }
    if (url.pathname === "/health") return new Response("ok", { headers: { "cache-control": "no-store" } });
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(
        JSON.stringify({ name: "clicktax", version: VERSION, disclaimer: DISCLAIMER, mcp: `${url.origin}/mcp`, transport: "streamable-http", docs: env.RENDER_BASE ?? "https://clicktax.org", years: SUPPORTED_YEARS, forms: FORM_IDS }, null, 2),
        { headers: JSON_HEADERS },
      );
    }
    return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  },
} satisfies ExportedHandler<Env>;
