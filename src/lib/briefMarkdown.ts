import { BRIEF_SECTIONS } from "../config/briefSections";
import type { BriefProject } from "../types";

function formatDisplayDate(value?: string): string {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString();
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function tableCell(value: string | undefined): string {
  const safeValue = value?.trim() || "Not provided";
  return safeValue.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function fileSafeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildMarkdownFromProject(project: BriefProject): string {
  const title = project.opportunityName.trim() || project.name;
  const lines: string[] = [
    `# ${title}`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Opportunity | ${tableCell(project.opportunityName || project.name)} |`,
    `| Author | ${tableCell(project.author)} |`,
    `| Version | ${tableCell(project.version)} |`,
    `| Date | ${tableCell(formatDisplayDate(project.updatedAt))} |`,
    "",
    "## Executive Summary at a Glance",
    "",
    project.finalMarkdown
      ? "This brief has a generated final version below."
      : "A final concise executive summary has not been generated yet. The current section drafts are included below.",
    "",
  ];

  BRIEF_SECTIONS.forEach((section) => {
    const draft = project.sectionDrafts[section.id];

    lines.push(`## ${section.number}. ${section.title}`, "");
    lines.push(draft?.contentMarkdown?.trim() || "_Section not completed yet._", "");

    if (draft?.assumptions?.length) {
      lines.push("### Assumptions", "");
      draft.assumptions.forEach((assumption) => {
        lines.push(`- ${assumption}`);
      });
      lines.push("");
    }
  });

  return lines.join("\n");
}

export function getExportMarkdown(project: BriefProject): string {
  return project.finalMarkdown?.trim() || buildMarkdownFromProject(project);
}

export function downloadMarkdown(project: BriefProject): void {
  const markdown = getExportMarkdown(project);
  const baseName = fileSafeName(project.opportunityName || project.name) || "brief";
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${baseName}-opportunity-brief.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
