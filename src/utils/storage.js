const DRAFT_STORAGE_KEY = "whatsTheMoveDraft";

export function getSavedDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Could not load saved draft:", error);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

export function saveDraft(draft) {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearSavedDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}