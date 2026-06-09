import type { BriefSectionDefinition } from "../types";

// Replace this with a public embed/preview URL when the explainer video is ready.
// Google Drive share URLs are converted to /preview automatically by getVideoEmbedUrl().
export const VIDEO_EMBED_URL = "";

export function getVideoEmbedUrl(): string | null {
  const rawUrl = VIDEO_EMBED_URL.trim();

  if (!rawUrl) {
    return null;
  }

  const driveFileMatch = rawUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/i);

  if (driveFileMatch?.[1]) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  }

  const driveIdMatch = rawUrl.match(/[?&]id=([^&]+)/i);

  if (rawUrl.includes("drive.google.com") && driveIdMatch?.[1]) {
    return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
  }

  return rawUrl;
}

export const BRIEF_SECTIONS: BriefSectionDefinition[] = [
  {
    id: "problem",
    number: 1,
    title: "What problem are we solving?",
    objective:
      "Define the business pain clearly enough that leaders understand why this opportunity deserves attention.",
    questions: [
      {
        id: "affected-audience",
        prompt: "Who feels this problem most directly?",
        example:
          "Regional operations managers, sales coordinators, and customer onboarding teams feel it every week when intake data arrives late or incomplete.",
        enabled: true,
      },
      {
        id: "trigger",
        prompt: "What triggered the need to address it now?",
        example:
          "Volume increased by 35%, and the manual workaround that used to be manageable now causes missed handoffs and avoidable escalations.",
        enabled: true,
      },
      {
        id: "evidence",
        prompt: "What evidence shows this is worth solving?",
        example:
          "The team logged 42 exception cases last month, average resolution time is 5 days, and two enterprise opportunities stalled during onboarding.",
        enabled: true,
      },
    ],
  },
  {
    id: "broken-today",
    number: 2,
    title: "What is broken today?",
    objective:
      "Describe the current operating breakdowns, not just the desired solution.",
    questions: [
      {
        id: "current-workflow",
        prompt: "How does the current workflow operate today?",
        example:
          "Requests start in email, move into a spreadsheet, then depend on manual follow-ups across product, finance, and customer success.",
        enabled: true,
      },
      {
        id: "failure-points",
        prompt: "Where do delays, errors, rework, or confusion show up?",
        example:
          "The biggest breakdown is ownership. Nobody knows when a request is ready for pricing review, so tasks wait in inboxes.",
        enabled: true,
      },
      {
        id: "disconnected-parts",
        prompt: "Which teams, systems, data, or decisions do not connect well?",
        example:
          "CRM data, product constraints, contract terms, and delivery capacity are managed separately, so leaders see the risk too late.",
        enabled: true,
      },
    ],
  },
  {
    id: "success",
    number: 3,
    title: "What does success look like?",
    objective:
      "Translate the opportunity into measurable outcomes and visible business change.",
    questions: [
      {
        id: "outcomes",
        prompt: "What outcomes should improve in the first 30, 90, and 180 days?",
        example:
          "Within 90 days, intake cycle time should fall from 5 days to 48 hours, and leaders should have a weekly risk view.",
        enabled: true,
      },
      {
        id: "customer-team-change",
        prompt: "What should customers, users, or internal teams experience differently?",
        example:
          "Teams should know the status of each opportunity without asking for updates, and customers should receive clearer timelines.",
        enabled: true,
      },
      {
        id: "greenlight-criteria",
        prompt: "What must leadership believe to green-light the work?",
        example:
          "Leadership needs confidence that the initiative protects revenue, reduces manual control risk, and can be delivered without a large platform rebuild.",
        enabled: true,
      },
    ],
  },
  {
    id: "building",
    number: 4,
    title: "What are we building?",
    objective:
      "Name the product, process, or operational capability in terms leaders can evaluate.",
    questions: [
      {
        id: "solution",
        prompt: "What is the proposed solution or capability?",
        example:
          "A guided opportunity intake workspace that captures required context, routes reviews, and produces a clear readiness summary.",
        enabled: true,
      },
      {
        id: "must-have",
        prompt: "What is must-have versus nice-to-have?",
        example:
          "Must-have: intake questions, approval status, owner tracking, and summary export. Nice-to-have: automated CRM updates and analytics dashboards.",
        enabled: true,
      },
      {
        id: "experience",
        prompt: "What should the user experience or handoff look like?",
        example:
          "A product owner completes the intake, reviewers add comments, and executives receive one decision-ready brief.",
        enabled: true,
      },
    ],
  },
  {
    id: "build-plan",
    number: 5,
    title: "How will we build it?",
    objective:
      "Explain the delivery approach, constraints, and practical path to launch.",
    questions: [
      {
        id: "delivery-approach",
        prompt: "What delivery approach or phases make the most sense?",
        example:
          "Start with a browser-based MVP for two teams, validate the intake questions, then add workflow automation after the first pilot.",
        enabled: true,
      },
      {
        id: "needed-inputs",
        prompt: "Which teams, data, tools, vendors, or approvals are required?",
        example:
          "Product, revenue operations, legal, and delivery leads need to agree on required intake fields and approval checkpoints.",
        enabled: true,
      },
      {
        id: "reuse-buy-build",
        prompt: "What should we reuse, buy, or build ourselves?",
        example:
          "Reuse the existing CRM opportunity ID, build the summary workflow internally, and avoid buying a workflow suite until the pilot proves demand.",
        enabled: true,
      },
    ],
  },
  {
    id: "ownership",
    number: 6,
    title: "Who owns each part?",
    objective:
      "Make sponsorship, delivery ownership, decision rights, and operating ownership explicit.",
    questions: [
      {
        id: "owners",
        prompt: "Who owns strategy, product delivery, technical delivery, and operations?",
        example:
          "The VP of Product sponsors it, the product owner manages scope, engineering owns implementation, and revenue ops owns ongoing governance.",
        enabled: true,
      },
      {
        id: "decisions",
        prompt: "Where are the key decision rights and approvals?",
        example:
          "Scope tradeoffs go to the product owner, budget decisions go to the sponsor, and launch readiness requires operations signoff.",
        enabled: true,
      },
      {
        id: "handoffs",
        prompt: "Which handoffs need clear ownership?",
        example:
          "The highest-risk handoff is from sales qualification to product review because missing context creates rework later.",
        enabled: true,
      },
    ],
  },
  {
    id: "timeline",
    number: 7,
    title: "When will it be done?",
    objective:
      "Give leaders a credible timeline with milestones and timing dependencies.",
    questions: [
      {
        id: "target-date",
        prompt: "What target date or business moment matters most?",
        example:
          "The pilot should be ready before the Q4 enterprise planning cycle so new opportunities can use the process from the start.",
        enabled: true,
      },
      {
        id: "milestones",
        prompt: "What are the major milestones from kickoff to adoption?",
        example:
          "Confirm intake fields, build the MVP, run a two-week pilot, revise the workflow, then launch with product and revenue teams.",
        enabled: true,
      },
      {
        id: "timing-dependencies",
        prompt: "What timing constraints or dependencies could move the date?",
        example:
          "Legal review and CRM field mapping could move the launch date if they are not confirmed during discovery.",
        enabled: true,
      },
    ],
  },
  {
    id: "risks",
    number: 8,
    title: "What is blocked or at risk?",
    objective:
      "Surface risks, blockers, open decisions, and mitigation options before the green-light conversation.",
    questions: [
      {
        id: "risks",
        prompt: "What are the biggest delivery, adoption, financial, or operational risks?",
        example:
          "The biggest risk is adoption. If managers treat the workflow as extra admin work, the data will stay incomplete.",
        enabled: true,
      },
      {
        id: "open-decisions",
        prompt: "What decisions are still open?",
        example:
          "The team still needs to decide whether approval routing happens inside the new workspace or remains in the current CRM process.",
        enabled: true,
      },
      {
        id: "mitigations",
        prompt: "How can the team reduce or manage those risks?",
        example:
          "Start with one high-volume team, keep required fields limited, and measure whether the workflow reduces follow-up messages.",
        enabled: true,
      },
    ],
  },
];
