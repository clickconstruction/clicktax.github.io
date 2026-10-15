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

const VERSION = "0.1.0";
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
ClickTax fills IRS forms for tax years ${SUPPORTED_YEARS.join(" and ")}: Form 1040, Schedule 1, Schedule 2, Schedule C, and Schedule SE.
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
      const forms = FORM_IDS.map((id) => ({ id, shortTitle: FORMS[id].shortTitle, title: FORMS[id].title, years: FORMS[id].years, description: FORMS[id].description }));
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
        structuredContent: { disclaimer: DISCLAIMER, form: { ...stripPdfFields(prepared), link: prepared.link }, notes: { ...notes, computations: prepared.computations, warnings: prepared.warnings, issues: prepared.issues } },
      };
    },
  );

  server.registerTool(
    "prepare_return",
    {
      title: "Prepare a sole-proprietor return",
      description: "Assembles a whole return: each Schedule C feeds Schedule SE, Schedule 1, Schedule 2, and Form 1040 automatically (business profit → self-employment tax → deductions → AGI → taxable income → tax → refund or amount owed). Returns one link that renders every form, plus per-form computations, warnings, and notes. Supply form1040 values (names, SSN, filing status, address, W-2 wages, withholding, payments...), scheduleC as an array (add owner: \"spouse\" for a spouse's business on a joint return), and optional scheduleSE/scheduleSESpouse (e.g. line8a W-2 social security wages), schedule1, schedule2 values.",
      inputSchema: z.object({
        year: yearSchema,
        form1040: valuesSchema,
        scheduleC: z.array(valuesSchema).optional(),
        scheduleSE: valuesSchema.optional(),
        scheduleSESpouse: valuesSchema.optional(),
        schedule1: valuesSchema.optional(),
        schedule2: valuesSchema.optional(),
        rounding: roundingSchema,
        title: z.string().optional(),
      }),
      annotations: readOnly,
    },
    async (input) => {
      const { year, rounding, title, ...rest } = input;
      const result = await prepareReturn(
        { year: year as TaxYear, form1040: rest.form1040 as Values, ...(rest.scheduleC ? { scheduleC: rest.scheduleC as Values[] } : {}), ...(rest.scheduleSE ? { scheduleSE: rest.scheduleSE as Values } : {}), ...(rest.scheduleSESpouse ? { scheduleSESpouse: rest.scheduleSESpouse as Values } : {}), ...(rest.schedule1 ? { schedule1: rest.schedule1 as Values } : {}), ...(rest.schedule2 ? { schedule2: rest.schedule2 as Values } : {}), ...(rounding ? { rounding } : {}) },
        { renderBase, ...(title ? { title } : {}) },
      );
      const totals = Object.entries(result.totals).map(([k, v]) => `- ${k.replace(/_/g, " ")}: **${money(v)}**`).join("\n");
      const text = [`**${DISCLAIMER}**`, "", `Open this link to render and download all ${result.forms.length} forms (${year}):`, result.link, "", "Totals:", totals, "", ...(result.warnings.length ? ["Return-level warnings:", ...result.warnings.map((w) => `- ${w}`), ""] : []), ...result.forms.map(formBlock)].join("\n");
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          disclaimer: DISCLAIMER,
          year,
          link: result.link,
          totals: result.totals,
          warnings: result.warnings,
          forms: result.forms.map((f) => ({ ...stripPdfFields(f), notes: formNotes(f.form, year as TaxYear) })),
        },
      };
    },
  );

  return server;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") {
      const handler = createMcpHandler(() => createServer(env), { route: "/mcp" });
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
