# Custom Entry And Provider Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add provider key remarks, failed-model cleanup, explicit model batch selection controls, and customizable built-in settings/titlebar entry visibility and ordering.

**Architecture:** Extend the existing settings JSON persistence with two new built-in entry config arrays, then teach the settings sidebar and title bar to render from those configs with safe fallbacks. In parallel, extend provider key data from database to UI with an optional `remark`, and enhance the existing provider detail model tooling using already-present local batch state and test result state.

**Tech Stack:** React 19, TypeScript, Zustand, Ant Design, Tauri 2, Rust, SeaORM, Vitest

---

## File Map

### Backend types, persistence, and migration

- Modify: `src-tauri/crates/core/src/types.rs`
- Modify: `src-tauri/crates/core/src/repo/settings.rs`
- Modify: `src-tauri/crates/core/src/entity/provider_keys.rs`
- Modify: `src-tauri/crates/core/src/repo/provider.rs`
- Modify: `src-tauri/src/commands/providers.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/crates/migration/src/lib.rs`
- Create: `src-tauri/crates/migration/src/m20260416_000001_add_provider_key_remark.rs`
- Modify: `src-tauri/crates/core/tests/repo_integration.rs`

### Frontend types and stores

- Modify: `src/types/index.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/providerStore.ts`
- Modify: `src/lib/browserMock.ts`

### Provider settings UI

- Modify: `src/components/settings/ProviderDetail.tsx`
- Modify: `src/components/settings/__tests__/ProviderDetail.test.tsx`

### Settings customization UI and renderers

- Modify: `src/components/settings/DisplaySettings.tsx`
- Modify: `src/components/settings/SettingsSidebar.tsx`
- Modify: `src/components/layout/TitleBar.tsx`
- Create: `src/components/settings/__tests__/SettingsSidebar.test.tsx`
- Create: `src/components/layout/__tests__/TitleBar.test.tsx`

## Task 1: Add Provider Key Remark To Backend Data Flow

**Files:**
- Create: `src-tauri/crates/migration/src/m20260416_000001_add_provider_key_remark.rs`
- Modify: `src-tauri/crates/migration/src/lib.rs`
- Modify: `src-tauri/crates/core/src/entity/provider_keys.rs`
- Modify: `src-tauri/crates/core/src/types.rs`
- Modify: `src-tauri/crates/core/src/repo/provider.rs`
- Modify: `src-tauri/src/commands/providers.rs`
- Test: `src-tauri/crates/core/tests/repo_integration.rs`

- [ ] **Step 1: Write the failing Rust repository test for provider key remarks**

Add a new assertion to `test_provider_key_operations` in `src-tauri/crates/core/tests/repo_integration.rs` so the created key stores and returns a remark:

```rust
let key = provider::add_provider_key(
    db,
    &prov.id,
    "enc_key_data",
    "sk-abc",
    Some("Primary key".to_string()),
)
.await
.unwrap();

assert_eq!(key.remark.as_deref(), Some("Primary key"));

let fetched = provider::get_provider_key(db, &key.id).await.unwrap();
assert_eq!(fetched.remark.as_deref(), Some("Primary key"));
```

- [ ] **Step 2: Run the Rust integration test to verify it fails**

Run:

```bash
cargo test -p aqbot-core test_provider_key_operations
```

Expected: FAIL because `ProviderKey` and `add_provider_key` do not expose `remark`.

- [ ] **Step 3: Add the migration and entity field**

Create `src-tauri/crates/migration/src/m20260416_000001_add_provider_key_remark.rs` with a nullable column addition:

```rust
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(ProviderKeys::Table)
                    .add_column(ColumnDef::new(ProviderKeys::Remark).string().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(ProviderKeys::Table)
                    .drop_column(ProviderKeys::Remark)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum ProviderKeys {
    Table,
    Remark,
}
```

Then register it in `src-tauri/crates/migration/src/lib.rs`:

```rust
mod m20260416_000001_add_provider_key_remark;
```

and append it to the migrator list:

```rust
Box::new(m20260416_000001_add_provider_key_remark::Migration),
```

Also add `pub remark: Option<String>,` to the SeaORM entity in `src-tauri/crates/core/src/entity/provider_keys.rs`.

- [ ] **Step 4: Extend Rust types, repo, and command signatures**

Update `src-tauri/crates/core/src/types.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderKey {
    pub id: String,
    pub provider_id: String,
    pub key_encrypted: String,
    pub key_prefix: String,
    pub enabled: bool,
    pub last_validated_at: Option<i64>,
    pub last_error: Option<String>,
    pub rotation_index: u32,
    pub remark: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddProviderKeyInput {
    pub provider_id: String,
    pub raw_key: String,
    pub remark: Option<String>,
}
```

Update `src-tauri/crates/core/src/repo/provider.rs`:

```rust
fn key_from_entity(m: provider_keys::Model) -> ProviderKey {
    ProviderKey {
        id: m.id,
        provider_id: m.provider_id,
        key_encrypted: m.key_encrypted,
        key_prefix: m.key_prefix,
        enabled: m.enabled,
        last_validated_at: m.last_validated_at,
        last_error: m.last_error,
        rotation_index: m.rotation_index as u32,
        remark: m.remark,
        created_at: m.created_at,
    }
}
```

and update the insert helper:

```rust
pub async fn add_provider_key(
    db: &DatabaseConnection,
    provider_id: &str,
    key_encrypted: &str,
    key_prefix: &str,
    remark: Option<String>,
) -> Result<ProviderKey> {
    // existing code...
    provider_keys::ActiveModel {
        id: Set(id.clone()),
        provider_id: Set(provider_id.to_string()),
        key_encrypted: Set(key_encrypted.to_string()),
        key_prefix: Set(key_prefix.to_string()),
        enabled: Set(true),
        last_validated_at: Set(None),
        last_error: Set(None),
        rotation_index: Set(rotation_index),
        remark: Set(remark),
        created_at: Set(now),
    }
    .insert(db)
    .await?;
    // existing fetch...
}
```

Update `src-tauri/src/commands/providers.rs` to accept the new input struct:

```rust
#[tauri::command]
pub async fn add_provider_key(
    state: State<'_, AppState>,
    input: AddProviderKeyInput,
) -> Result<ProviderKey, String> {
    let real_id = aqbot_core::repo::provider::resolve_provider_id(&state.sea_db, &input.provider_id)
        .await
        .map_err(|e| e.to_string())?;
    let encrypted = aqbot_core::crypto::encrypt_key(&input.raw_key, &state.master_key)
        .map_err(|e| e.to_string())?;
    let prefix = if input.raw_key.len() >= 8 {
        format!("{}...", &input.raw_key[..8])
    } else {
        input.raw_key.clone()
    };
    aqbot_core::repo::provider::add_provider_key(
        &state.sea_db,
        &real_id,
        &encrypted,
        &prefix,
        input.remark,
    )
    .await
    .map_err(|e| e.to_string())
}
```

- [ ] **Step 5: Run the Rust integration test to verify it passes**

Run:

```bash
cargo test -p aqbot-core test_provider_key_operations
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/crates/migration/src/lib.rs src-tauri/crates/migration/src/m20260416_000001_add_provider_key_remark.rs src-tauri/crates/core/src/entity/provider_keys.rs src-tauri/crates/core/src/types.rs src-tauri/crates/core/src/repo/provider.rs src-tauri/src/commands/providers.rs src-tauri/crates/core/tests/repo_integration.rs
git commit -m "feat: add provider key remarks"
```

## Task 2: Expose Provider Key Remark In Frontend Types And Store

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/stores/providerStore.ts`
- Modify: `src/lib/browserMock.ts`
- Test: `src/components/settings/__tests__/ProviderDetail.test.tsx`

- [ ] **Step 1: Write the failing frontend test for remark submission**

Add a test to `src/components/settings/__tests__/ProviderDetail.test.tsx`:

```tsx
it('submits an optional remark when adding a provider key', async () => {
  render(
    <App>
      <ProviderDetail providerId="provider-1" />
    </App>,
  );

  await userEvent.click(screen.getByRole('button', { name: 'settings.addKey' }));
  const dialog = await screen.findByRole('dialog');
  const inputs = within(dialog).getAllByRole('textbox');

  await userEvent.type(inputs[0], 'sk-live-key');
  await userEvent.type(inputs[1], 'Primary key');
  await userEvent.click(within(dialog).getByRole('button', { name: 'common.confirm' }));

  expect(addProviderKey).toHaveBeenCalledWith('provider-1', 'sk-live-key', 'Primary key');
});
```

- [ ] **Step 2: Run the ProviderDetail Vitest spec to verify it fails**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/ProviderDetail.test.tsx
```

Expected: FAIL because the store method signature only accepts two arguments.

- [ ] **Step 3: Update frontend types and store signature**

In `src/types/index.ts`, add the remark field:

```ts
export interface ProviderKey {
  id: string;
  provider_id: string;
  key_encrypted: string;
  key_prefix: string;
  enabled: boolean;
  last_validated_at: number | null;
  last_error: string | null;
  rotation_index: number;
  remark: string | null;
  created_at: number;
}
```

In `src/stores/providerStore.ts`, change the API shape:

```ts
addProviderKey: (providerId: string, rawKey: string, remark?: string | null) => Promise<void>;
```

and invoke the new command payload:

```ts
const key = await invoke<ProviderKey>('add_provider_key', {
  input: {
    provider_id: providerId,
    raw_key: rawKey,
    remark: remark?.trim() ? remark.trim() : null,
  },
});
```

In `src/lib/browserMock.ts`, return a mock provider key with `remark` so tests and browser mode stay aligned:

```ts
remark: input.remark ?? null,
```

- [ ] **Step 4: Run the ProviderDetail Vitest spec to verify the store contract passes**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/ProviderDetail.test.tsx
```

Expected: PASS for the new submission path or advance to the next UI failure if the modal still lacks the field.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/stores/providerStore.ts src/lib/browserMock.ts src/components/settings/__tests__/ProviderDetail.test.tsx
git commit -m "refactor: expose provider key remark in frontend types"
```

## Task 3: Add Provider Key Remark UI To Provider Detail

**Files:**
- Modify: `src/components/settings/ProviderDetail.tsx`
- Test: `src/components/settings/__tests__/ProviderDetail.test.tsx`

- [ ] **Step 1: Extend the failing ProviderDetail test to verify remark rendering**

Add a second test case:

```tsx
it('renders a saved provider key remark in the key list', () => {
  provider.keys = [
    {
      id: 'key-1',
      provider_id: 'provider-1',
      key_encrypted: 'enc',
      key_prefix: 'sk-1234...',
      enabled: true,
      last_validated_at: null,
      last_error: null,
      rotation_index: 0,
      remark: '备用 Key',
      created_at: 0,
    },
  ];

  render(
    <App>
      <ProviderDetail providerId="provider-1" />
    </App>,
  );

  expect(screen.getByText('备用 Key')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the ProviderDetail test file to verify it fails**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/ProviderDetail.test.tsx
```

Expected: FAIL because the modal and list do not expose `remark`.

- [ ] **Step 3: Add the optional remark field to the add-key modal and list rendering**

In `src/components/settings/ProviderDetail.tsx`, add state:

```tsx
const [keyRemark, setKeyRemark] = useState('');
```

Reset it when opening and closing the modal, and update submit:

```tsx
const handleAddKey = useCallback(async () => {
  if (!keyValue.trim()) return;
  try {
    await addProviderKey(providerId, keyValue, keyRemark);
    setKeyValue('');
    setKeyRemark('');
    setAddKeyModal(false);
  } catch {
    message.error(t('error.saveFailed'));
  }
}, [addProviderKey, keyRemark, keyValue, message, providerId, t]);
```

Add the second input inside the modal form:

```tsx
<Input
  value={keyRemark}
  onChange={(e) => setKeyRemark(e.target.value)}
  placeholder={t('settings.keyRemarkOptional') as string}
/>
```

Render the remark under the key prefix:

```tsx
{key.remark && (
  <Text type="secondary" style={{ fontSize: 12 }}>
    {key.remark}
  </Text>
)}
```

- [ ] **Step 4: Run the ProviderDetail test file to verify it passes**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/ProviderDetail.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/ProviderDetail.tsx src/components/settings/__tests__/ProviderDetail.test.tsx
git commit -m "feat: show provider key remarks in settings"
```

## Task 4: Add Batch Select-All, Clear Selection, And Delete Failed Models

**Files:**
- Modify: `src/components/settings/ProviderDetail.tsx`
- Test: `src/components/settings/__tests__/ProviderDetail.test.tsx`

- [ ] **Step 1: Write failing tests for batch selection and failed-model deletion**

Add tests to `src/components/settings/__tests__/ProviderDetail.test.tsx`:

```tsx
it('selects all filtered models in batch mode', async () => {
  provider.models = [
    { ...provider.models[0], model_id: 'gpt-5.4', name: 'GPT 5.4' },
    { ...provider.models[0], model_id: 'claude-3-7', name: 'Claude 3.7' },
  ];

  render(<App><ProviderDetail providerId="provider-1" /></App>);

  await userEvent.click(screen.getByRole('button', { name: 'settings.batchEditMode' }));
  await userEvent.click(screen.getByRole('button', { name: 'settings.searchModels' }));
  await userEvent.type(screen.getByRole('textbox'), 'gpt');
  await userEvent.click(screen.getByRole('button', { name: 'common.selectAll' }));

  expect(screen.getByText(/settings.batchSelected/)).toBeInTheDocument();
});
```

```tsx
it('deletes only models whose latest test result failed', async () => {
  provider.models = [
    { ...provider.models[0], model_id: 'gpt-5.4', name: 'GPT 5.4' },
    { ...provider.models[0], model_id: 'bad-model', name: 'Bad Model' },
  ];
  testModel
    .mockResolvedValueOnce(1000)
    .mockRejectedValueOnce(new Error('boom'));

  render(<App><ProviderDetail providerId="provider-1" /></App>);

  await userEvent.click(screen.getByRole('button', { name: 'settings.testAllModels' }));
  await screen.findByText('common.failed');
  await userEvent.click(screen.getByRole('button', { name: 'settings.deleteFailedModels' }));
  await userEvent.click(screen.getByRole('button', { name: 'common.confirm' }));

  expect(saveModels).toHaveBeenCalledWith(
    'provider-1',
    expect.not.arrayContaining([expect.objectContaining({ model_id: 'bad-model' })]),
  );
});
```

- [ ] **Step 2: Run the ProviderDetail test file to verify the new cases fail**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/ProviderDetail.test.tsx
```

Expected: FAIL because the batch toolbar does not expose `Select All`, `Clear Selection`, or `Delete Failed Models`.

- [ ] **Step 3: Implement filtered batch selection helpers and failed-model cleanup**

In `src/components/settings/ProviderDetail.tsx`, add derived helpers:

```tsx
const filteredModelIds = useMemo(
  () => new Set(filteredModels.map((model) => model.model_id)),
  [filteredModels],
);

const failedModelIds = useMemo(
  () =>
    new Set(
      Array.from(testResults.entries())
        .filter(([, result]) => Boolean(result.error))
        .map(([modelId]) => modelId),
    ),
  [testResults],
);
```

Add handlers:

```tsx
const handleBatchSelectAllFiltered = useCallback(() => {
  setBatchSelected(new Set(filteredModels.map((model) => model.model_id)));
}, [filteredModels]);

const handleBatchClearSelection = useCallback(() => {
  setBatchSelected(new Set());
}, []);

const handleDeleteFailedModels = useCallback(async () => {
  if (failedModelIds.size === 0) return;
  const updatedModels = (provider?.models ?? []).filter((model) => !failedModelIds.has(model.model_id));
  try {
    await saveModels(providerId, updatedModels);
    setTestResults((prev) => {
      const next = new Map(prev);
      for (const modelId of failedModelIds) next.delete(modelId);
      return next;
    });
    message.success(t('settings.deleteFailedModelsSuccess', { count: failedModelIds.size }));
  } catch {
    message.error(t('error.saveFailed'));
  }
}, [failedModelIds, message, provider?.models, providerId, saveModels, t]);
```

Add toolbar buttons in batch mode for `Select All` and `Clear Selection`, and add a non-batch toolbar button near the existing test controls for `Delete Failed Models`.

- [ ] **Step 4: Run the ProviderDetail test file to verify it passes**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/ProviderDetail.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/ProviderDetail.tsx src/components/settings/__tests__/ProviderDetail.test.tsx
git commit -m "feat: improve model batch tools in provider settings"
```

## Task 5: Add Settings Config Types And Defaults For Built-In Entries

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src-tauri/crates/core/src/types.rs`
- Test: `src/components/settings/__tests__/SettingsSidebar.test.tsx`

- [ ] **Step 1: Write a failing settings sidebar renderer test for default fallback**

Create `src/components/settings/__tests__/SettingsSidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsSidebar } from '../SettingsSidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/stores', () => ({
  useUIStore: (selector: any) =>
    selector({
      settingsSection: 'general',
      setSettingsSection: vi.fn(),
      exitSettings: vi.fn(),
    }),
  useSettingsStore: (selector: any) =>
    selector({
      settings: {
        settings_sidebar_items: undefined,
      },
    }),
}));

it('renders built-in settings sections when no custom config is saved', () => {
  render(<SettingsSidebar />);
  expect(screen.getByText('settings.general')).toBeInTheDocument();
  expect(screen.getByText('settings.backup')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the new SettingsSidebar test to verify it fails**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/SettingsSidebar.test.tsx
```

Expected: FAIL because `SettingsSidebar` does not consume `useSettingsStore`.

- [ ] **Step 3: Add shared config types and defaults in TypeScript and Rust**

Update `src/types/index.ts`:

```ts
export type BuiltinSettingsSidebarItemId =
  | 'general'
  | 'display'
  | 'providers'
  | 'conversationSettings'
  | 'defaultModel'
  | 'searchProviders'
  | 'mcpServers'
  | 'proxy'
  | 'shortcuts'
  | 'data'
  | 'storage'
  | 'backup'
  | 'about';

export type BuiltinTitlebarActionId =
  | 'pin'
  | 'theme'
  | 'language'
  | 'backup'
  | 'github'
  | 'update'
  | 'reload'
  | 'settings';

export interface SettingsSidebarItemConfig {
  id: BuiltinSettingsSidebarItemId;
  visible: boolean;
}

export interface TitlebarQuickActionConfig {
  id: BuiltinTitlebarActionId;
  visible: boolean;
}
```

Then add to `AppSettings`:

```ts
settings_sidebar_items?: SettingsSidebarItemConfig[];
titlebar_quick_actions?: TitlebarQuickActionConfig[];
```

In `src/stores/settingsStore.ts`, define defaults:

```ts
settings_sidebar_items: [
  { id: 'general', visible: true },
  { id: 'display', visible: true },
  { id: 'providers', visible: true },
  { id: 'conversationSettings', visible: true },
  { id: 'defaultModel', visible: true },
  { id: 'searchProviders', visible: true },
  { id: 'mcpServers', visible: true },
  { id: 'proxy', visible: true },
  { id: 'shortcuts', visible: true },
  { id: 'data', visible: true },
  { id: 'storage', visible: true },
  { id: 'backup', visible: true },
  { id: 'about', visible: true },
],
titlebar_quick_actions: [
  { id: 'pin', visible: true },
  { id: 'theme', visible: true },
  { id: 'language', visible: true },
  { id: 'backup', visible: true },
  { id: 'github', visible: true },
  { id: 'update', visible: true },
  { id: 'reload', visible: true },
  { id: 'settings', visible: true },
],
```

Mirror these structs and defaults in `src-tauri/crates/core/src/types.rs`.

- [ ] **Step 4: Run the new SettingsSidebar test to verify the type/default layer is ready**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/SettingsSidebar.test.tsx
```

Expected: still FAIL at render behavior until the sidebar renderer is updated, but type errors should be resolved.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/stores/settingsStore.ts src-tauri/crates/core/src/types.rs src/components/settings/__tests__/SettingsSidebar.test.tsx
git commit -m "feat: add built-in entry config settings types"
```

## Task 6: Render Settings Sidebar From Config With Safe Fallback

**Files:**
- Modify: `src/components/settings/SettingsSidebar.tsx`
- Test: `src/components/settings/__tests__/SettingsSidebar.test.tsx`

- [ ] **Step 1: Add a failing test for hidden and reordered sidebar items**

Append to `src/components/settings/__tests__/SettingsSidebar.test.tsx`:

```tsx
it('renders only visible configured items in configured order', () => {
  mockedSettings.settings_sidebar_items = [
    { id: 'storage', visible: true },
    { id: 'general', visible: true },
    { id: 'display', visible: false },
  ];

  render(<SettingsSidebar />);

  const labels = screen.getAllByRole('menuitem').map((node) => node.textContent);
  expect(labels[0]).toContain('settings.storage');
  expect(labels[1]).toContain('settings.general');
  expect(screen.queryByText('settings.display')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the SettingsSidebar test file to verify it fails**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/SettingsSidebar.test.tsx
```

Expected: FAIL because the sidebar still uses the hard-coded `SECTION_KEYS`.

- [ ] **Step 3: Implement sidebar config resolution with fallback**

In `src/components/settings/SettingsSidebar.tsx`, add built-in defaults and a resolver:

```tsx
const DEFAULT_SECTION_KEYS: SettingsSection[] = [
  'general',
  'display',
  'providers',
  'conversationSettings',
  'defaultModel',
  'searchProviders',
  'mcpServers',
  'proxy',
  'shortcuts',
  'data',
  'storage',
  'backup',
  'about',
];

function resolveSidebarSections(
  saved: AppSettings['settings_sidebar_items'],
): SettingsSection[] {
  const byId = new Map(saved?.map((item) => [item.id, item]) ?? []);
  const ordered: SettingsSection[] = [];

  for (const item of saved ?? []) {
    if (!DEFAULT_SECTION_KEYS.includes(item.id)) continue;
    if (item.visible) ordered.push(item.id);
  }

  for (const id of DEFAULT_SECTION_KEYS) {
    if (byId.has(id)) continue;
    ordered.push(id);
  }

  return ordered.length > 0 ? ordered : DEFAULT_SECTION_KEYS;
}
```

Then read settings from `useSettingsStore` and build menu items from the resolved list.

- [ ] **Step 4: Run the SettingsSidebar test file to verify it passes**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/SettingsSidebar.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SettingsSidebar.tsx src/components/settings/__tests__/SettingsSidebar.test.tsx
git commit -m "feat: make settings sidebar configurable"
```

## Task 7: Add Display Settings UI For Sidebar And Titlebar Entry Customization

**Files:**
- Modify: `src/components/settings/DisplaySettings.tsx`
- Modify: `src/stores/settingsStore.ts`

- [ ] **Step 1: Add the customization controls in DisplaySettings**

In `src/components/settings/DisplaySettings.tsx`, add two sections backed by `saveSettings`:

```tsx
<SettingsGroup title={t('settings.customizeSettingsSidebar')}>
  {settings.settings_sidebar_items?.map((item, index) => (
    <div key={item.id} className="flex items-center gap-2">
      <Switch
        checked={item.visible}
        onChange={(visible) => {
          const next = [...(settings.settings_sidebar_items ?? [])];
          next[index] = { ...next[index], visible };
          if (!next.some((entry) => entry.visible)) return;
          saveSettings({ settings_sidebar_items: next });
        }}
      />
      <span>{t(`settings.${item.id}`)}</span>
      <Button
        size="small"
        disabled={index === 0}
        onClick={() => moveSidebarItem(index, index - 1)}
      >
        ↑
      </Button>
      <Button
        size="small"
        disabled={index === settings.settings_sidebar_items!.length - 1}
        onClick={() => moveSidebarItem(index, index + 1)}
      >
        ↓
      </Button>
    </div>
  ))}
  <Button onClick={resetSidebarItems}>{t('common.reset')}</Button>
</SettingsGroup>
```

Mirror the same structure for `titlebar_quick_actions`.

- [ ] **Step 2: Add helper functions that preserve at least one visible item**

Inside `DisplaySettings.tsx`, add local helpers:

```tsx
const updateSidebarItems = (next: SettingsSidebarItemConfig[]) => {
  if (!next.some((item) => item.visible)) return;
  saveSettings({ settings_sidebar_items: next });
};

const updateTitlebarActions = (next: TitlebarQuickActionConfig[]) => {
  if (!next.some((item) => item.visible)) return;
  saveSettings({ titlebar_quick_actions: next });
};
```

Add `resetSidebarItems` and `resetTitlebarActions` using the default arrays from `settingsStore.ts`.

- [ ] **Step 3: Run a targeted type check**

Run:

```bash
pnpm tsc --noEmit
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/DisplaySettings.tsx src/stores/settingsStore.ts
git commit -m "feat: add entry customization controls to display settings"
```

## Task 8: Render Title Bar Quick Actions From Config With Safe Fallback

**Files:**
- Modify: `src/components/layout/TitleBar.tsx`
- Create: `src/components/layout/__tests__/TitleBar.test.tsx`

- [ ] **Step 1: Write a failing title bar test for configured visibility**

Create `src/components/layout/__tests__/TitleBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TitleBar } from '../TitleBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/stores', () => ({
  useUIStore: (selector: any) =>
    selector({
      activePage: 'chat',
      enterSettings: vi.fn(),
      exitSettings: vi.fn(),
    }),
  useSettingsStore: (selector: any) =>
    selector({
      settings: {
        theme_mode: 'system',
        always_on_top: false,
        titlebar_quick_actions: [
          { id: 'pin', visible: true },
          { id: 'reload', visible: false },
          { id: 'settings', visible: true },
        ],
      },
      saveSettings: vi.fn(),
    }),
}));

it('hides disabled configured titlebar actions', () => {
  render(<TitleBar />);
  expect(screen.queryByTitle('desktop.reloadPage')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the title bar test to verify it fails**

Run:

```bash
pnpm vitest run src/components/layout/__tests__/TitleBar.test.tsx
```

Expected: FAIL because `TitleBar` still renders all buttons unconditionally.

- [ ] **Step 3: Refactor TitleBar into a built-in action registry and filtered renderer**

Inside `src/components/layout/TitleBar.tsx`, create a resolver:

```tsx
const DEFAULT_TITLEBAR_ACTIONS: BuiltinTitlebarActionId[] = [
  'pin',
  'theme',
  'language',
  'backup',
  'github',
  'update',
  'reload',
  'settings',
];

function resolveTitlebarActions(
  saved: AppSettings['titlebar_quick_actions'],
): BuiltinTitlebarActionId[] {
  const known = new Set(DEFAULT_TITLEBAR_ACTIONS);
  const configured = saved ?? DEFAULT_TITLEBAR_ACTIONS.map((id) => ({ id, visible: true }));
  const ordered = configured
    .filter((item) => known.has(item.id) && item.visible)
    .map((item) => item.id);
  for (const id of DEFAULT_TITLEBAR_ACTIONS) {
    if (configured.some((item) => item.id === id)) continue;
    ordered.push(id);
  }
  return ordered.length > 0 ? ordered : DEFAULT_TITLEBAR_ACTIONS;
}
```

Then factor each current button block into an `actionRenderers` map keyed by id and render:

```tsx
{resolvedActions.map((actionId) => (
  <Fragment key={actionId}>{actionRenderers[actionId]()}</Fragment>
))}
```

Keep the Windows minimize/maximize/close controls outside this config so native window controls remain stable.

- [ ] **Step 4: Run the title bar test to verify it passes**

Run:

```bash
pnpm vitest run src/components/layout/__tests__/TitleBar.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/TitleBar.tsx src/components/layout/__tests__/TitleBar.test.tsx
git commit -m "feat: make titlebar quick actions configurable"
```

## Task 9: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run targeted frontend tests**

Run:

```bash
pnpm vitest run src/components/settings/__tests__/ProviderDetail.test.tsx src/components/settings/__tests__/SettingsSidebar.test.tsx src/components/layout/__tests__/TitleBar.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run TypeScript type checking**

Run:

```bash
pnpm tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Run targeted Rust integration tests**

Run:

```bash
cargo test -p aqbot-core test_provider_key_operations
```

Expected: PASS

- [ ] **Step 4: Commit the final integrated changes**

```bash
git add src src-tauri docs/superpowers/specs docs/superpowers/plans
git commit -m "feat: add configurable entries and provider key remarks"
```

## Self-Review

### Spec coverage

- Provider key remark: Tasks 1-3
- Delete failed models: Task 4
- Batch select all / clear selection: Task 4
- Settings sidebar configuration: Tasks 5-7
- Title bar quick-action configuration: Tasks 5, 7, 8
- Backward-compatible settings fallback: Tasks 5, 6, 8

No spec gaps remain.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every task lists exact files and commands.
- Every code-changing step includes concrete code snippets.

### Type consistency

- `remark` is the single provider key field name across frontend and backend.
- `settings_sidebar_items` and `titlebar_quick_actions` are the only new settings field names across TypeScript and Rust.
- Batch selection and failed-model cleanup both rely on `filteredModels` and `testResults`, matching the approved design.
