import type { BriefProject } from "../types";

export function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createBlankProject(
  overrides: Partial<BriefProject> = {},
): BriefProject {
  const now = new Date().toISOString();

  return {
    id: makeId("brief"),
    name: "New Opportunity Brief",
    opportunityName: "",
    author: "",
    version: "v0.1",
    createdAt: now,
    updatedAt: now,
    currentSectionIndex: 0,
    answers: {},
    sectionDrafts: {},
    ...overrides,
  };
}
