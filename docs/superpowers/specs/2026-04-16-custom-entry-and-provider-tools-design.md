# Custom Entry And Provider Tools Design

## Summary

This spec covers five related improvements in AQBot:

1. Add a remark field for provider API keys in provider management.
2. Add one-click deletion for models that failed model testing.
3. Add explicit select-all and clear-selection actions for models in batch mode.
4. Add customizable visibility and ordering for the settings sidebar entries.
5. Add customizable visibility and ordering for the title bar quick-action buttons.

The first release focuses on stable built-in entries only. It will not allow arbitrary user-defined actions or pages yet, but it will introduce a reusable configuration structure that can support richer extensibility later.

## Goals

- Let users distinguish provider keys with a human-readable remark.
- Make model cleanup easier after batch testing.
- Make model batch operations more discoverable and efficient.
- Let users choose which built-in settings pages appear in the settings sidebar.
- Let users choose which built-in quick actions appear in the title bar.
- Keep all new customization backward compatible for existing users.

## Non-Goals

- No arbitrary custom scripts, commands, or external links in the first release.
- No direct registration of unfinished settings pages such as `KnowledgeSettings` or `MemorySettings`.
- No per-workspace or per-profile customization scope; settings remain app-wide.
- No behavior change to provider key encryption or key rotation logic.
- No server-side persistence for temporary model test results.

## Existing Context

### Settings Sidebar

The settings sidebar is currently driven by a hard-coded ordered list in `SettingsSidebar.tsx`, and the active page component is resolved in `SettingsPage.tsx`.

The currently registered settings sections are:

- `general`
- `display`
- `providers`
- `conversationSettings`
- `defaultModel`
- `searchProviders`
- `mcpServers`
- `proxy`
- `shortcuts`
- `data`
- `storage`
- `backup`
- `about`

`KnowledgeSettings` and `MemorySettings` components exist in the codebase but are not registered in the current settings section type or sidebar, so they are out of scope for this release.

### Title Bar

The title bar currently renders a fixed set of built-in quick actions in `TitleBar.tsx`. Users cannot hide or reorder them.

### Provider Keys

Provider keys already support encrypted storage, enable/disable state, validation status, last error, and rotation order. There is currently no remark field in the frontend type, backend type, repository layer, or database schema.

### Model Tools

The provider detail page already supports:

- per-model test
- test all models
- batch mode
- batch enable/disable/delete
- grouped model selection
- remote model picker select-all

The missing parts are a clearer select-all control in batch mode and a one-click way to remove models that failed testing.

## Proposed Approach

### 1. Unified Built-In Entry Customization

Introduce a shared configuration model in app settings for built-in entries.

Two settings fields will be added:

- `settings_sidebar_items`
- `titlebar_quick_actions`

Each field stores an ordered array of items. Each item contains:

- stable built-in `id`
- `visible` boolean

The arrays only accept known built-in ids. Unknown ids are ignored at render time.

If a setting is missing, empty, malformed, or incomplete, the UI falls back to the current built-in default order and visibility. This ensures older user data keeps working and prevents blank navigation or empty title bars.

### 2. Provider Key Remark

Add a nullable `remark` field to provider keys.

Frontend behavior:

- The add-key modal gets a remark input.
- The key list displays the remark near the key prefix.
- Existing keys without a remark continue to display normally.

Backend behavior:

- Add `remark` to the provider key type.
- Extend add-key creation to accept an optional remark.
- Keep encryption logic unchanged; only the new plaintext remark is stored separately.

Database behavior:

- Add a nullable `remark` column to `provider_keys`.
- Existing rows default to `NULL`.

### 3. Failed Model Cleanup

Use the existing `testResults` map in `ProviderDetail.tsx` as the source of truth for the current page session.

Add a toolbar action:

- `Delete Failed Models`

Behavior:

- Identify models whose latest test result contains an error.
- Remove only those models from the current provider model list.
- Show a confirmation dialog with the count.
- If there are no failed models in the current in-memory results, disable the action.

This action is intentionally session-scoped. It only acts on failures recorded in the current UI session after testing.

### 4. Explicit Batch Select-All Controls

Extend batch mode toolbar in the model list with:

- `Select All`
- `Clear Selection`

Selection should operate on the currently filtered list, not the full unfiltered model list. This makes the behavior consistent with the search box and supports efficient targeted edits.

### 5. Settings UI For Customization

Add configuration controls under display-related settings for:

- settings sidebar entries
- title bar quick actions

Each list should support:

- visibility toggle
- drag-to-reorder or equivalent move up/down ordering
- reset to default

The first release does not need a generic “add arbitrary entry” button. The configuration UI is still considered “extensible” because it is built on a generic entry model and can support more entry types later.

## Data Model

### Frontend Types

Add new app settings types similar to:

- `BuiltinSettingsSidebarItemId`
- `BuiltinTitlebarActionId`
- `SettingsSidebarItemConfig`
- `TitlebarQuickActionConfig`

Add new optional fields to `AppSettings`:

- `settings_sidebar_items?: SettingsSidebarItemConfig[]`
- `titlebar_quick_actions?: TitlebarQuickActionConfig[]`

Add to `ProviderKey`:

- `remark: string | null`

### Backend Types

Mirror the same structures in Rust settings and provider key types.

Provider key command input should accept:

- `raw_key`
- optional `remark`

## Rendering Rules

### Settings Sidebar

The sidebar should render only known registered built-in sections. It should:

1. Start from the built-in default list.
2. Apply saved ordering and visibility for recognized ids.
3. Append any built-in ids missing from persisted config using default visibility and default relative order.

This protects against partial config from older versions.

### Title Bar

The title bar should use the same fallback strategy:

1. Start from the built-in default quick-action list.
2. Apply saved ordering and visibility.
3. Append any new built-in actions not present in old saved config.

### Safety Guard

If all sidebar items or all title bar actions are hidden, the app should still allow it only if at least one entry remains visible after save. The UI should prevent saving a completely empty list for either area.

## UX Details

### Provider Key Remark UX

- Remark placeholder should make it clear that the field is optional.
- The remark should be plain text only.
- Long remarks should truncate in list view with tooltip or wrapped secondary text.

### Failed Model Deletion UX

- The delete-failed action should be placed near test-related actions.
- The disabled state should clearly indicate there are no failed models to delete.

### Batch Selection UX

- `Select All` acts on the filtered results.
- `Clear Selection` clears the current batch selection state.
- The selected count remains visible.

### Entry Customization UX

- The customization UI should use user-facing translated labels for each built-in item.
- Reset restores both order and visibility.
- Reordering should feel deterministic and not depend on translated labels.

## Error Handling

- Invalid or unknown persisted entry ids are ignored and do not break rendering.
- Missing translation keys fall back to current existing translation behavior.
- Adding a provider key without a remark behaves exactly like today.
- Deleting failed models with zero current failures becomes a no-op with a disabled action.
- If a settings save fails, optimistic UI should either recover on next fetch or display the existing store error pattern.

## Testing Strategy

### Frontend

- Settings sidebar renders default order with no custom config.
- Settings sidebar respects saved visibility and ordering.
- Missing built-in ids in saved config are appended safely.
- Title bar respects saved visibility and ordering.
- Batch select-all selects only filtered models.
- Clear selection clears batch state.
- Delete failed models removes only models marked failed in `testResults`.
- Provider key remark input flows through add-key UI and renders in the list.

### Backend

- Provider key creation persists remark correctly.
- Provider key fetch/list returns remark.
- Migration adds nullable remark column without breaking existing rows.
- Settings serialization/deserialization supports new entry config arrays.

## Implementation Order

1. Add provider key remark type, schema, repository, and command support.
2. Wire provider key remark into store and provider detail UI.
3. Add batch select-all and clear-selection controls.
4. Add delete-failed-models action on the provider detail page.
5. Add settings types and defaults for built-in entry configuration.
6. Update settings persistence and UI for editing sidebar/title bar entry config.
7. Update `SettingsSidebar.tsx` and `TitleBar.tsx` to render from config with fallbacks.
8. Add or update tests around the new behaviors.

## Open Choices Resolved

- Scope of settings sidebar customization: only the 13 currently registered settings sections.
- Scope of title bar customization: only existing built-in title bar quick actions.
- Scope of first release extensibility: built-in entries only, not arbitrary user-defined actions.
- Failed model cleanup source of truth: current page session `testResults`, not persisted backend state.
- Batch select-all scope: current filtered model list.

## Acceptance Criteria

- Users can add a provider key with an optional remark and see it later.
- Users can remove all currently failed tested models with one action.
- Users can explicitly select all filtered models and clear selection in batch mode.
- Users can control visibility and order of built-in settings sidebar entries.
- Users can control visibility and order of built-in title bar quick actions.
- Existing installations without the new settings fields continue to render usable default UI.
