# Issue: "Deleting..." Shown on Delete Button When Opening a New Entry

**Status:** Resolved
**Opened:** 2026-02-21
**Resolved:** 2026-02-21

## Info
- **Symptom:** After deleting an entry and then opening a newly created entry, the delete button shows "Deleting..." instead of "Delete"
- **Affected area:** `app.js` — `openDetail()` and `confirmDelete()`

### Root cause investigation

`deleteEntryBtn` is a single shared DOM element (`#delete-entry-btn`).

In `confirmDelete()` (app.js:289–303):
- On **delete start**: `disabled = true`, `textContent = 'Deleting...'` (lines 291–292)
- On **error**: button is reset to `disabled = false`, `textContent = 'Delete'` (lines 300–301)
- On **success**: button is **never reset** — the view closes and `loadEntries()` is called, but the button state persists

In `openDetail()` (app.js:249–268):
- The button's `onclick` is reassigned (line 266)
- But `disabled` and `textContent` are **never reset**

So: delete entry → button → "Deleting..." → success → modal closes → open any new/other entry → delete button still says "Deleting..." with `disabled = true`.

## Experiments

### H1: `openDetail` does not reset `deleteEntryBtn` state after a successful delete
- **Rationale:** `confirmDelete` only resets the button on error. `openDetail` never resets it.
- **Experiment:** Search for any reset of `deleteEntryBtn.textContent` or `.disabled` on the success path.
- **Result:** Confirmed — lines 300–301 only execute in the `catch` block. No reset on success path. `openDetail` (lines 249–268) does not touch `.textContent` or `.disabled`.
- **Verdict:** Confirmed

## Resolution

- **Root cause:** `confirmDelete` resets `deleteEntryBtn` only on failure; `openDetail` never resets the button's text/disabled state before showing the detail panel.
- **Fix:** Reset `deleteEntryBtn.textContent = 'Delete'` and `deleteEntryBtn.disabled = false` at the top of `openDetail`.
- **Files changed:** `app.js` (line ~249)
- **Lessons:** Shared DOM elements used for actions (delete, save) should always be reset to their default state when the view that contains them is opened, not just on the error path of the action.
