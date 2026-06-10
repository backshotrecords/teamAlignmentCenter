const OPENAI_MODEL = "gpt-5.4";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const sectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["contentMarkdown", "assumptions"],
  properties: {
    contentMarkdown: {
      type: "string",
      description:
        "Markdown for the requested opportunity brief section. Do not include the top-level section heading.",
    },
    assumptions: {
      type: "array",
      description:
        "Short assumptions inferred from incomplete user input. Empty array if no assumptions were needed.",
      items: {
        type: "string",
      },
    },
  },
};

const finalSchema = {
  type: "object",
  additionalProperties: false,
  required: ["markdown"],
  properties: {
    markdown: {
      type: "string",
      description:
        "Complete polished Markdown opportunity brief with title metadata, executive summary at a glance, and all eight sections.",
    },
  },
};

const operatingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["markdown"],
  properties: {
    markdown: {
      type: "string",
      description:
        "Complete Markdown operations document with all required sections in order.",
    },
  },
};

function sendCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function collectOutputText(responseBody) {
  if (typeof responseBody.output_text === "string") {
    return responseBody.output_text;
  }

  const output = Array.isArray(responseBody.output) ? responseBody.output : [];

  return output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function variantInstruction(variant) {
  switch (variant) {
    case "regenerate":
      return "Regenerate the section with fresh phrasing while preserving the user's meaning and edited assumptions.";
    case "shorter":
      return "Make the section shorter, tighter, and easier for an executive to scan.";
    case "executive":
      return "Make the section more executive: sharper, decision-oriented, and lightly persuasive without buzzwords.";
    case "detail":
      return "Add practical operational detail while keeping the writing concise and plain.";
    default:
      return "Create the first polished section draft from the user's answers.";
  }
}

async function callOpenAI(apiKey, body) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      responseBody?.error?.message ||
      responseBody?.error ||
      "OpenAI returned an error while generating the brief.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return responseBody;
}

function buildSectionPayload(payload) {
  const {
    project,
    section,
    answers,
    previousSections,
    existingContent,
    editableAssumptions,
    variant,
  } = payload;

  return {
    model: OPENAI_MODEL,
    temperature: 1,
    store: false,
    instructions: [
      "You are an executive opportunity brief writer for product managers and product owners.",
      "Use plain operational language with a measured persuasive edge.",
      "Synthesize the user's questionnaire answers into the requested section of a business opportunity brief.",
      "You may infer missing business logic only when needed. Every inference must be listed in assumptions.",
      "Respect edited assumptions as source material. If an edited assumption conflicts with the answers, prefer the edited assumption and keep wording neutral.",
      "Use Markdown. Use bullets or tables when they make the section easier to evaluate. Avoid vague hype.",
      variantInstruction(variant),
    ].join("\n"),
    input: JSON.stringify(
      {
        project: {
          name: project?.name,
          opportunityName: project?.opportunityName,
          author: project?.author,
          version: project?.version,
        },
        section: {
          number: section?.number,
          title: section?.title,
          objective: section?.objective,
          questions: section?.questions,
        },
        answers,
        previousSections,
        existingContent,
        editableAssumptions,
      },
      null,
      2,
    ),
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "opportunity_brief_section",
        strict: true,
        schema: sectionSchema,
      },
    },
  };
}

function buildFinalPayload(payload) {
  const { project, sections } = payload;

  return {
    model: OPENAI_MODEL,
    temperature: 1,
    store: false,
    instructions: [
      "You are preparing the final executive summary for a business opportunity brief.",
      "Write for product leaders and senior business stakeholders who need to decide whether to green-light the work.",
      "Use plain operational language with a persuasive but grounded tone.",
      "Create a complete Markdown document with a title, metadata table, an Executive Summary at a Glance, and the eight detailed sections in order.",
      "Make the document concise and cohesive. Preserve the eight-section structure exactly.",
      "Use Markdown tables where they clarify ownership, timeline, risks, success measures, or decisions.",
      "Mermaid diagrams are allowed only if they make the operating flow or ownership model materially clearer.",
      "Do not hide inferred logic. Put assumptions in a visible assumptions section or under the relevant section.",
    ].join("\n"),
    input: JSON.stringify(
      {
        project: {
          name: project?.name,
          opportunityName: project?.opportunityName,
          author: project?.author,
          version: project?.version,
          date: new Date().toISOString(),
        },
        sections,
      },
      null,
      2,
    ),
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "opportunity_brief_final",
        strict: true,
        schema: finalSchema,
      },
    },
  };
}

function buildOperatingPayload(payload) {
  const { project, sections, finalMarkdown } = payload;

  return {
    model: OPENAI_MODEL,
    temperature: 1,
    store: false,
    instructions: [
      "You are creating an Operations Document that supports a business opportunity brief.",
      "Use the existing opportunity brief answers and generated section drafts as the source material.",
      "Write for product managers, product owners, delivery leads, and operators who need practical execution clarity after the brief is approved.",
      "Use plain operational language. Be specific, grounded, and structured.",
      "Create a complete Markdown document with this exact section order: Project Summary, Concept Note, Outcomes and Goals, Rationale, Scope, Team, Milestones and Key Activities, Resources, Current State, Unknowns, Blockers and Dependencies, Risk and Mitigation, Reporting Claims, Decision Log, Supporting Documents.",
      "Where the source material does not contain enough information, do not invent false facts. Add clearly labeled TBD rows, editable placeholders, or 'To confirm' bullets.",
      "Use tables for Team, Milestones and Key Activities, Resources, Unknowns, Blockers and Dependencies, Risk and Mitigation, Reporting Claims, Decision Log, and Supporting Documents.",
      "Include practical spaces for day-to-day operating goals, owners, status, evidence, decisions, dates, links, and follow-ups where useful.",
      "Preserve assumptions visibly when they affect operating decisions.",
      "Do not repeat the opportunity brief verbatim. Reformat it into an execution-oriented operating document.",
    ].join("\n"),
    input: JSON.stringify(
      {
        project: {
          name: project?.name,
          opportunityName: project?.opportunityName,
          author: project?.author,
          version: project?.version,
          date: new Date().toISOString(),
        },
        finalMarkdown,
        sections,
      },
      null,
      2,
    ),
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "operating_document",
        strict: true,
        schema: operatingSchema,
      },
    },
  };
}

export default async function handler(req, res) {
  sendCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const payload = req.body || {};
  const apiKey = typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";

  if (!apiKey) {
    return res.status(400).json({ error: "Add an OpenAI API key in settings." });
  }

  try {
    let openAiPayload;

    if (payload.action === "final") {
      openAiPayload = buildFinalPayload(payload);
    } else if (payload.action === "operating") {
      openAiPayload = buildOperatingPayload(payload);
    } else {
      openAiPayload = buildSectionPayload(payload);
    }
    const responseBody = await callOpenAI(apiKey, openAiPayload);
    const text = collectOutputText(responseBody);

    if (!text) {
      return res
        .status(502)
        .json({ error: "OpenAI returned no usable text output." });
    }

    const parsed = JSON.parse(text);

    return res.status(200).json(parsed);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;

    return res.status(status).json({
      error:
        error.message ||
        "The synthesis request failed before the brief could be updated.",
    });
  }
}
