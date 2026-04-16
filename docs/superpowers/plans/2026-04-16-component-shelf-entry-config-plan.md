# Component Shelf Entry Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the titlebar/sidebar toggle editor with a component-shelf editor that supports add/remove and drag ordering, and allow settings sections to be placed in the titlebar.

**Architecture:** Extend titlebar config types to support both built-in actions and settings-section shortcuts, keep sidebar config scoped to settings sections, and introduce a shared shelf editor component in display settings. Rendering stays data-driven from persisted settings.

**Tech Stack:** React 19, Zustand, Ant Design, dnd-kit, Vitest, Testing Library

---

### Task 1: Extend settings config types

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/stores/settingsStore.ts`

- [ ] Add discriminated titlebar config item types for built-in actions vs settings-section shortcuts.
- [ ] Add default titlebar config that keeps existing built-in buttons and permits settings shortcuts later.
- [ ] Keep sidebar config compatible with existing persisted data.

### Task 2: Write failing UI tests for new behavior

**Files:**
- Modify: `src/components/layout/__tests__/TitleBar.test.tsx`
- Modify: `src/components/settings/__tests__/SettingsSidebar.test.tsx`
- Create: `src/components/settings/__tests__/DisplaySettings.test.tsx`

- [ ] Add a titlebar test that expects a configured settings shortcut to render in the titlebar.
- [ ] Add a titlebar test that clicking the settings shortcut enters settings and targets the right section.
- [ ] Add a display-settings test that verifies the shelf editor shows available items separately from selected items.

### Task 3: Implement titlebar settings shortcuts

**Files:**
- Modify: `src/components/layout/TitleBar.tsx`

- [ ] Resolve mixed titlebar config items in persisted order.
- [ ] Render built-in actions as before.
- [ ] Render settings-section shortcuts as text buttons.
- [ ] Wire shortcut clicks to `enterSettings` and `setSettingsSection`.

### Task 4: Implement shared shelf editor UI

**Files:**
- Create: `src/components/settings/EntryShelfEditor.tsx`
- Modify: `src/components/settings/DisplaySettings.tsx`

- [ ] Build a reusable shelf editor with “available” and “selected” columns.
- [ ] Add add/remove actions and drag-sort within the selected list using dnd-kit.
- [ ] Use the shared editor for titlebar config and settings sidebar config.

### Task 5: Update labels and compatibility behavior

**Files:**
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/en-US.json`
- Modify: `src/i18n/locales/zh-TW.json`

- [ ] Add labels for the new shelf editor, built-in actions, and settings shortcuts in the titlebar.
- [ ] Keep existing reset behavior working with the new config shape.

### Task 6: Verify and package

**Files:**
- Modify: `.github/workflows/test-windows-build.yml` if needed only for packaging continuity

- [ ] Run targeted Vitest coverage for titlebar/sidebar/display settings.
- [ ] Run typecheck.
- [ ] Sync local changes into the build repo, push, and trigger the Windows test build tag.
- [ ] Confirm release assets exist before reporting success.
