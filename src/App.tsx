import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DictationTextarea } from "./components/DictationTextarea";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { BRIEF_SECTIONS, getVideoEmbedUrl } from "./config/briefSections";
import { createBlankProject, makeId } from "./data/defaultProject";
import { finalizeBrief, synthesizeSection } from "./lib/api";
import {
  downloadMarkdown,
  getExportMarkdown,
} from "./lib/briefMarkdown";
import { downloadPdfFromMarkdownElement } from "./lib/pdfExport";
import {
  loadAppState,
  loadSettings,
  saveAppState,
  saveSettings,
} from "./lib/storage";
import type {
  AppSettings,
  AppState,
  BriefProject,
  SectionDraft,
  SynthesisVariant,
} from "./types";

const emptyDraft: SectionDraft = {
  contentMarkdown: "",
  assumptions: [],
};

function getProjectTitle(project: BriefProject): string {
  return project.opportunityName.trim() || project.name;
}

function normalizeAssumptions(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatSavedTime(value: string | null): string {
  if (!value) {
    return "Ready";
  }

  return `Saved ${new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<"section" | "final">(
    "section",
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState<{
    kind: "section" | "final";
    variant?: SynthesisVariant;
  } | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);
  const finalPreviewRef = useRef<HTMLDivElement>(null);

  const activeProject = useMemo(() => {
    return (
      state.projects.find((project) => project.id === state.activeProjectId) ||
      state.projects[0]
    );
  }, [state.activeProjectId, state.projects]);

  const currentSectionIndex = Math.min(
    activeProject.currentSectionIndex,
    BRIEF_SECTIONS.length - 1,
  );
  const currentSection = BRIEF_SECTIONS[currentSectionIndex];
  const currentDraft =
    activeProject.sectionDrafts[currentSection.id] || emptyDraft;
  const currentAnswers = activeProject.answers[currentSection.id] || {};
  const enabledQuestions = currentSection.questions.filter(
    (question) => question.enabled,
  );
  const completedSections = BRIEF_SECTIONS.filter((section) =>
    activeProject.sectionDrafts[section.id]?.contentMarkdown?.trim(),
  ).length;
  const firstIncompleteIndex = BRIEF_SECTIONS.findIndex(
    (section) =>
      !activeProject.sectionDrafts[section.id]?.contentMarkdown?.trim(),
  );
  const maxUnlockedIndex =
    firstIncompleteIndex === -1
      ? BRIEF_SECTIONS.length - 1
      : firstIncompleteIndex;
  const canReviewFinal = completedSections === BRIEF_SECTIONS.length;
  const progressPercent = Math.round(
    (completedSections / BRIEF_SECTIONS.length) * 100,
  );
  const exportMarkdown = useMemo(
    () => getExportMarkdown(activeProject),
    [activeProject],
  );
  const videoUrl = getVideoEmbedUrl();

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      saveAppState(state);
      setLastSavedAt(new Date().toISOString());
    }, 300);

    return () => window.clearTimeout(saveTimer);
  }, [state]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  function updateActiveProject(
    updater: (project: BriefProject) => BriefProject,
  ): void {
    setState((previous) => {
      const now = new Date().toISOString();
      const projects = previous.projects.map((project) => {
        if (project.id !== previous.activeProjectId) {
          return project;
        }

        return {
          ...updater(project),
          updatedAt: now,
        };
      });

      return {
        ...previous,
        projects,
      };
    });
  }

  function updateProjectField(
    field: "name" | "opportunityName" | "author" | "version",
    value: string,
  ): void {
    updateActiveProject((project) => ({
      ...project,
      [field]: value,
    }));
  }

  function updateAnswer(questionId: string, value: string): void {
    updateActiveProject((project) => ({
      ...project,
      answers: {
        ...project.answers,
        [currentSection.id]: {
          ...(project.answers[currentSection.id] || {}),
          [questionId]: value,
        },
      },
      finalMarkdown: undefined,
      finalUpdatedAt: undefined,
    }));
  }

  function updateCurrentDraft(patch: Partial<SectionDraft>): void {
    updateActiveProject((project) => ({
      ...project,
      sectionDrafts: {
        ...project.sectionDrafts,
        [currentSection.id]: {
          ...(project.sectionDrafts[currentSection.id] || emptyDraft),
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      },
      finalMarkdown: undefined,
      finalUpdatedAt: undefined,
    }));
  }

  function createProject(): void {
    const project = createBlankProject({
      name: `Opportunity Brief ${state.projects.length + 1}`,
    });

    setState((previous) => ({
      projects: [project, ...previous.projects],
      activeProjectId: project.id,
    }));
    setWorkspaceView("section");
    setError("");
  }

  function duplicateProject(): void {
    const now = new Date().toISOString();
    const duplicate: BriefProject = {
      ...JSON.parse(JSON.stringify(activeProject)),
      id: makeId("brief"),
      name: `${activeProject.name} Copy`,
      opportunityName: activeProject.opportunityName
        ? `${activeProject.opportunityName} Copy`
        : "",
      createdAt: now,
      updatedAt: now,
      finalUpdatedAt: activeProject.finalMarkdown ? now : undefined,
    };

    setState((previous) => ({
      projects: [duplicate, ...previous.projects],
      activeProjectId: duplicate.id,
    }));
    setWorkspaceView("section");
    setError("");
  }

  function deleteProject(): void {
    const confirmed = window.confirm(
      `Delete "${getProjectTitle(activeProject)}"? This only removes the local browser copy.`,
    );

    if (!confirmed) {
      return;
    }

    setState((previous) => {
      const remaining = previous.projects.filter(
        (project) => project.id !== activeProject.id,
      );

      if (!remaining.length) {
        const replacement = createBlankProject();

        return {
          projects: [replacement],
          activeProjectId: replacement.id,
        };
      }

      return {
        projects: remaining,
        activeProjectId: remaining[0].id,
      };
    });
    setWorkspaceView("section");
    setError("");
  }

  function selectProject(projectId: string): void {
    setState((previous) => ({
      ...previous,
      activeProjectId: projectId,
    }));
    setWorkspaceView("section");
    setError("");
  }

  function selectSection(index: number): void {
    if (index > maxUnlockedIndex) {
      return;
    }

    updateActiveProject((project) => ({
      ...project,
      currentSectionIndex: index,
    }));
    setWorkspaceView("section");
    setError("");
  }

  function continueToNextSection(): void {
    if (!currentDraft.contentMarkdown.trim()) {
      return;
    }

    if (currentSectionIndex === BRIEF_SECTIONS.length - 1) {
      setWorkspaceView("final");
      return;
    }

    updateActiveProject((project) => ({
      ...project,
      currentSectionIndex: currentSectionIndex + 1,
    }));
    setError("");
  }

  async function handleSectionSynthesis(variant: SynthesisVariant): Promise<void> {
    if (!settings.apiKey.trim()) {
      setSettingsOpen(true);
      setError("Add an OpenAI API key in settings before generating.");
      return;
    }

    setGeneration({ kind: "section", variant });
    setError("");

    try {
      const previousSections = BRIEF_SECTIONS.slice(0, currentSectionIndex).map(
        (section) => ({
          title: section.title,
          contentMarkdown:
            activeProject.sectionDrafts[section.id]?.contentMarkdown || "",
          assumptions: activeProject.sectionDrafts[section.id]?.assumptions || [],
        }),
      );
      const result = await synthesizeSection({
        apiKey: settings.apiKey,
        project: activeProject,
        section: currentSection,
        answers: currentAnswers,
        previousSections,
        existingContent: currentDraft.contentMarkdown,
        editableAssumptions: currentDraft.assumptions,
        variant,
      });

      updateCurrentDraft({
        contentMarkdown: result.contentMarkdown.trim(),
        assumptions: result.assumptions,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Section synthesis failed.",
      );
    } finally {
      setGeneration(null);
    }
  }

  async function handleFinalSynthesis(): Promise<void> {
    if (!settings.apiKey.trim()) {
      setSettingsOpen(true);
      setError("Add an OpenAI API key in settings before generating the final brief.");
      return;
    }

    if (!canReviewFinal) {
      setError("Complete all eight sections before creating the final brief.");
      return;
    }

    setGeneration({ kind: "final" });
    setError("");

    try {
      const sections = BRIEF_SECTIONS.map((section) => ({
        number: section.number,
        title: section.title,
        contentMarkdown:
          activeProject.sectionDrafts[section.id]?.contentMarkdown || "",
        assumptions: activeProject.sectionDrafts[section.id]?.assumptions || [],
      }));
      const result = await finalizeBrief({
        apiKey: settings.apiKey,
        project: activeProject,
        sections,
      });

      updateActiveProject((project) => ({
        ...project,
        finalMarkdown: result.markdown.trim(),
        finalUpdatedAt: new Date().toISOString(),
      }));
      setWorkspaceView("final");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Final brief synthesis failed.",
      );
    } finally {
      setGeneration(null);
    }
  }

  async function exportPdf(): Promise<void> {
    const previewElement =
      finalPreviewRef.current?.querySelector<HTMLElement>(".markdown-preview");

    if (!previewElement) {
      setError("The final preview is not ready to export yet.");
      return;
    }

    setPdfExporting(true);
    setError("");

    try {
      await downloadPdfFromMarkdownElement(
        previewElement,
        getProjectTitle(activeProject),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The PDF export failed.",
      );
    } finally {
      setPdfExporting(false);
    }
  }

  function handleMissingApiKeyForVoice(): void {
    setSettingsOpen(true);
    setError("Add an OpenAI API key in settings before using voice input.");
  }

  const isGeneratingSection = generation?.kind === "section";
  const isGeneratingFinal = generation?.kind === "final";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <BriefcaseBusiness size={24} />
          </div>
          <div>
            <p className="brand-kicker">Team Alignment Center</p>
            <h1>Opportunity Briefs</h1>
          </div>
        </div>

        <button className="sidebar-action" type="button" onClick={createProject}>
          <Plus size={18} />
          New brief
        </button>

        <div className="project-list" aria-label="Saved opportunity briefs">
          {state.projects.map((project) => {
            const isActive = project.id === activeProject.id;
            const completedCount = BRIEF_SECTIONS.filter((section) =>
              project.sectionDrafts[section.id]?.contentMarkdown?.trim(),
            ).length;

            return (
              <button
                className={`project-item ${isActive ? "project-item--active" : ""}`}
                key={project.id}
                type="button"
                onClick={() => selectProject(project.id)}
              >
                <span>{getProjectTitle(project)}</span>
                <small>{completedCount}/8 sections</small>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Executive workbench</p>
            <h2>{getProjectTitle(activeProject)}</h2>
          </div>
          <div className="header-actions">
            <span className="save-indicator">
              <CheckCircle2 size={16} />
              {formatSavedTime(lastSavedAt)}
            </span>
            <button
              className="icon-button"
              type="button"
              title="Duplicate brief"
              aria-label="Duplicate brief"
              onClick={duplicateProject}
            >
              <FileText size={18} />
            </button>
            <button
              className="icon-button danger"
              type="button"
              title="Delete brief"
              aria-label="Delete brief"
              onClick={deleteProject}
            >
              <Trash2 size={18} />
            </button>
            <button
              className="icon-button"
              type="button"
              title="Settings"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        <section className="metadata-strip" aria-label="Brief metadata">
          <label>
            Brief name
            <input
              value={activeProject.name}
              onChange={(event) => updateProjectField("name", event.target.value)}
            />
          </label>
          <label>
            Opportunity
            <input
              value={activeProject.opportunityName}
              placeholder="Opportunity name"
              onChange={(event) =>
                updateProjectField("opportunityName", event.target.value)
              }
            />
          </label>
          <label>
            Author
            <input
              value={activeProject.author}
              placeholder="Product owner"
              onChange={(event) =>
                updateProjectField("author", event.target.value)
              }
            />
          </label>
          <label>
            Version
            <input
              value={activeProject.version}
              onChange={(event) =>
                updateProjectField("version", event.target.value)
              }
            />
          </label>
        </section>

        <section className="phase-overview">
          <div className="video-panel">
            {videoUrl ? (
              <iframe
                src={videoUrl}
                title="Opportunity brief explainer video"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="video-placeholder">
                <Sparkles size={28} />
                <strong>Explainer video placeholder</strong>
                <span>Phase 1 overview will appear here.</span>
              </div>
            )}
          </div>

          <div className="progress-panel">
            <div className="progress-copy">
              <span>{completedSections} of 8 sections complete</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="view-toggle" role="tablist" aria-label="Workspace view">
              <button
                className={workspaceView === "section" ? "is-selected" : ""}
                type="button"
                onClick={() => setWorkspaceView("section")}
              >
                Section draft
              </button>
              <button
                className={workspaceView === "final" ? "is-selected" : ""}
                type="button"
                disabled={!canReviewFinal}
                onClick={() => setWorkspaceView("final")}
              >
                Final brief
              </button>
            </div>
          </div>
        </section>

        <nav className="section-rail" aria-label="Brief sections">
          {BRIEF_SECTIONS.map((section, index) => {
            const isComplete = Boolean(
              activeProject.sectionDrafts[section.id]?.contentMarkdown?.trim(),
            );
            const isCurrent =
              workspaceView === "section" && index === currentSectionIndex;
            const locked = index > maxUnlockedIndex;

            return (
              <button
                className={`section-step ${isCurrent ? "is-current" : ""} ${
                  isComplete ? "is-complete" : ""
                }`}
                key={section.id}
                type="button"
                disabled={locked}
                onClick={() => selectSection(index)}
              >
                <span>{section.number}</span>
                <strong>{section.title}</strong>
                {locked ? <Lock size={14} /> : null}
              </button>
            );
          })}
        </nav>

        {workspaceView === "section" ? (
          <div className="section-workspace">
            <section className="question-panel">
              <div className="section-heading">
                <p className="eyebrow">
                  Section {currentSection.number} of {BRIEF_SECTIONS.length}
                </p>
                <h3>{currentSection.title}</h3>
                <p>{currentSection.objective}</p>
              </div>

              <div className="question-list">
                {enabledQuestions.map((question) => (
                  <label className="question-card" key={question.id}>
                    <span>{question.prompt}</span>
                    <small>Example: {question.example}</small>
                    <DictationTextarea
                      apiKey={settings.apiKey}
                      onDictationError={setError}
                      onMissingApiKey={handleMissingApiKeyForVoice}
                      value={currentAnswers[question.id] || ""}
                      onChangeText={(value) => updateAnswer(question.id, value)}
                      rows={5}
                    />
                  </label>
                ))}
              </div>
            </section>

            <aside className="synthesis-panel">
              <div className="synthesis-header">
                <div>
                  <p className="eyebrow">LLM synthesis</p>
                  <h3>Section output</h3>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  disabled={isGeneratingSection}
                  onClick={() =>
                    handleSectionSynthesis(
                      currentDraft.contentMarkdown ? "regenerate" : "draft",
                    )
                  }
                >
                  {isGeneratingSection ? (
                    <Loader2 className="spin" size={18} />
                  ) : currentDraft.contentMarkdown ? (
                    <RefreshCw size={18} />
                  ) : (
                    <Wand2 size={18} />
                  )}
                  {currentDraft.contentMarkdown ? "Regenerate" : "Generate"}
                </button>
              </div>

              <div className="synthesis-actions">
                <button
                  type="button"
                  disabled={isGeneratingSection || !currentDraft.contentMarkdown}
                  onClick={() => handleSectionSynthesis("shorter")}
                >
                  Make shorter
                </button>
                <button
                  type="button"
                  disabled={isGeneratingSection || !currentDraft.contentMarkdown}
                  onClick={() => handleSectionSynthesis("executive")}
                >
                  More executive
                </button>
                <button
                  type="button"
                  disabled={isGeneratingSection || !currentDraft.contentMarkdown}
                  onClick={() => handleSectionSynthesis("detail")}
                >
                  Add detail
                </button>
              </div>

              <label className="editor-label">
                Generated section Markdown
                <DictationTextarea
                  apiKey={settings.apiKey}
                  className="markdown-editor"
                  onDictationError={setError}
                  onMissingApiKey={handleMissingApiKeyForVoice}
                  value={currentDraft.contentMarkdown}
                  placeholder="Generated section text will appear here. You can also draft directly."
                  onChangeText={(value) =>
                    updateCurrentDraft({
                      contentMarkdown: value,
                    })
                  }
                  rows={12}
                />
              </label>

              <label className="editor-label">
                Assumptions
                <DictationTextarea
                  apiKey={settings.apiKey}
                  className="assumption-editor"
                  onDictationError={setError}
                  onMissingApiKey={handleMissingApiKeyForVoice}
                  value={currentDraft.assumptions.join("\n")}
                  placeholder="One assumption per line."
                  onChangeText={(value) =>
                    updateCurrentDraft({
                      assumptions: normalizeAssumptions(value),
                    })
                  }
                  rows={4}
                />
              </label>

              <div className="preview-block">
                <div className="preview-heading">
                  <span>Preview</span>
                </div>
                <MarkdownPreview
                  markdown={currentDraft.contentMarkdown}
                  label="Current section preview"
                />
              </div>

              <button
                className="continue-button"
                type="button"
                disabled={!currentDraft.contentMarkdown.trim()}
                onClick={continueToNextSection}
              >
                {currentSectionIndex === BRIEF_SECTIONS.length - 1
                  ? "Review final brief"
                  : "Save and continue"}
                <ArrowRight size={18} />
              </button>
            </aside>
          </div>
        ) : (
          <section className="final-workspace">
            <div className="final-toolbar">
              <div>
                <p className="eyebrow">Complete opportunity brief</p>
                <h3>Final executive summary</h3>
              </div>
              <div className="final-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={isGeneratingFinal || !canReviewFinal}
                  onClick={handleFinalSynthesis}
                >
                  {isGeneratingFinal ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Wand2 size={18} />
                  )}
                  Generate final
                </button>
                <button type="button" onClick={() => downloadMarkdown(activeProject)}>
                  <Download size={18} />
                  Markdown
                </button>
                <button
                  type="button"
                  disabled={pdfExporting}
                  onClick={() => void exportPdf()}
                >
                  {pdfExporting ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Printer size={18} />
                  )}
                  {pdfExporting ? "Exporting" : "PDF"}
                </button>
              </div>
            </div>

            <div className="final-grid">
              <label className="editor-label final-editor">
                Final Markdown
                <DictationTextarea
                  apiKey={settings.apiKey}
                  className="markdown-editor"
                  onDictationError={setError}
                  onMissingApiKey={handleMissingApiKeyForVoice}
                  value={activeProject.finalMarkdown ?? exportMarkdown}
                  onChangeText={(value) =>
                    updateActiveProject((project) => ({
                      ...project,
                      finalMarkdown: value,
                      finalUpdatedAt: new Date().toISOString(),
                    }))
                  }
                  rows={24}
                />
              </label>

              <div className="preview-block final-preview" ref={finalPreviewRef}>
                <div className="preview-heading">
                  <span>Rendered document</span>
                </div>
                <MarkdownPreview
                  markdown={activeProject.finalMarkdown ?? exportMarkdown}
                  label="Final brief preview"
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {settingsOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="settings-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Settings</p>
                <h3>OpenAI API key</h3>
              </div>
              <button
                className="icon-button"
                type="button"
                title="Close settings"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <label className="settings-key">
              <KeyRound size={18} />
              <input
                value={settings.apiKey}
                type="password"
                placeholder="sk-..."
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,
                    apiKey: event.target.value,
                  }))
                }
              />
            </label>

            <div className="modal-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => setSettingsOpen(false)}
              >
                Save key
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
