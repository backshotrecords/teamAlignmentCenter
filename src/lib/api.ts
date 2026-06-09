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

export interface TranscriptionResult {
  text: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
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

export async function transcribeAudio(
  apiKey: string,
  audioFile: File,
): Promise<TranscriptionResult> {
  const audioBase64 = arrayBufferToBase64(await audioFile.arrayBuffer());

  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey,
      audioBase64,
      mimeType: audioFile.type,
      fileName: audioFile.name,
    }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error || "The voice transcription request failed.",
    );
  }

  return payload as TranscriptionResult;
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
