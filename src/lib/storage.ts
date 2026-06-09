import { createBlankProject } from "../data/defaultProject";
import type { AppSettings, AppState } from "../types";

const APP_STORAGE_KEY = "team-alignment-center-state-v1";
const SETTINGS_STORAGE_KEY = "team-alignment-center-settings-v1";

const defaultSettings: AppSettings = {
  apiKey: "",
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadAppState(): AppState {
  const firstProject = createBlankProject();

  if (!canUseStorage()) {
    return {
      projects: [firstProject],
      activeProjectId: firstProject.id,
    };
  }

  try {
    const stored = window.localStorage.getItem(APP_STORAGE_KEY);

    if (!stored) {
      return {
        projects: [firstProject],
        activeProjectId: firstProject.id,
      };
    }

    const parsed = JSON.parse(stored) as AppState;
    const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
    const activeProject = projects.find(
      (project) => project.id === parsed.activeProjectId,
    );

    if (!projects.length || !activeProject) {
      return {
        projects: [firstProject],
        activeProjectId: firstProject.id,
      };
    }

    return {
      projects,
      activeProjectId: activeProject.id,
    };
  } catch {
    return {
      projects: [firstProject],
      activeProjectId: firstProject.id,
    };
  }
}

export function saveAppState(state: AppState): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
}

export function loadSettings(): AppSettings {
  if (!canUseStorage()) {
    return defaultSettings;
  }

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
