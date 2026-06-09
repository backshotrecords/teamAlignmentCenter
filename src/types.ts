export type SynthesisVariant =
  | "draft"
  | "regenerate"
  | "shorter"
  | "executive"
  | "detail";

export interface BriefQuestion {
  id: string;
  prompt: string;
  example: string;
  enabled: boolean;
}

export interface BriefSectionDefinition {
  id: string;
  number: number;
  title: string;
  objective: string;
  questions: BriefQuestion[];
}

export interface SectionDraft {
  contentMarkdown: string;
  assumptions: string[];
  updatedAt?: string;
}

export interface BriefProject {
  id: string;
  name: string;
  opportunityName: string;
  author: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  currentSectionIndex: number;
  answers: Record<string, Record<string, string>>;
  sectionDrafts: Record<string, SectionDraft>;
  finalMarkdown?: string;
  finalUpdatedAt?: string;
}

export interface AppState {
  projects: BriefProject[];
  activeProjectId: string;
}

export interface AppSettings {
  apiKey: string;
}

export interface SectionSynthesisResult {
  contentMarkdown: string;
  assumptions: string[];
}

export interface FinalBriefResult {
  markdown: string;
}
