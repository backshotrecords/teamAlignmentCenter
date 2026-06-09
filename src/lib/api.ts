import type {
  BriefProject,
  BriefSectionDefinition,
  FinalBriefResult,
  SectionSynthesisResult,
  SynthesisVariant,
} from "../types";

interface SynthesizeSectionArgs {
  apiKey: string;
  project: BriefProject;
  section: BriefSectionDefinition;
  answers: Record<string, string>;
  previousSections: Array<{
    title: string;
    contentMarkdown: string;
    assumptions: string[];
  }>;
  existingContent: string;
  editableAssumptions: string[];
  variant: SynthesisVariant;
}

interface FinalizeBriefArgs {
  apiKey: string;
  project: BriefProject;
  sections: Array<{
    number: number;
    title: string;
    contentMarkdown: string;
    assumptions: string[];
  }>;
}

async function postSynthesis<T>(body: unknown): Promise<T> {
  const response = await fetch("/api/synthesize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error || "The synthesis request failed. Please try again.",
    );
  }

  return payload as T;
}

export function synthesizeSection(
  args: SynthesizeSectionArgs,
): Promise<SectionSynthesisResult> {
  return postSynthesis<SectionSynthesisResult>({
    action: "section",
    ...args,
  });
}

export function finalizeBrief(args: FinalizeBriefArgs): Promise<FinalBriefResult> {
  return postSynthesis<FinalBriefResult>({
    action: "final",
    ...args,
  });
}
