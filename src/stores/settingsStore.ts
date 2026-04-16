import { create } from 'zustand';
import { invoke } from '@/lib/invoke';
import type {
  AppSettings,
  BuiltinSettingsSidebarItemId,
  BuiltinTitlebarActionId,
  SettingsSidebarItemConfig,
  TitlebarQuickActionConfig,
} from '@/types';
import { DEFAULT_SHORTCUT_BINDINGS } from '@/lib/shortcuts';

export const DEFAULT_SETTINGS_SIDEBAR_ITEMS: SettingsSidebarItemConfig[] = [
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
];

export const DEFAULT_TITLEBAR_QUICK_ACTIONS: TitlebarQuickActionConfig[] = [
  { kind: 'builtin-action', id: 'pin', visible: true },
  { kind: 'builtin-action', id: 'theme', visible: true },
  { kind: 'builtin-action', id: 'language', visible: true },
  { kind: 'builtin-action', id: 'backup', visible: true },
  { kind: 'builtin-action', id: 'github', visible: true },
  { kind: 'builtin-action', id: 'update', visible: true },
  { kind: 'builtin-action', id: 'reload', visible: true },
  { kind: 'builtin-action', id: 'settings', visible: true },
];

const DEFAULT_SIDEBAR_IDS = new Set<BuiltinSettingsSidebarItemId>(
  DEFAULT_SETTINGS_SIDEBAR_ITEMS.map((item) => item.id),
);

const DEFAULT_TITLEBAR_KEYS = new Set<string>(
  DEFAULT_TITLEBAR_QUICK_ACTIONS.map((item) => `${item.kind}:${item.id}`),
);

export function normalizeSettingsSidebarItems(
  saved?: SettingsSidebarItemConfig[],
): SettingsSidebarItemConfig[] {
  const source = saved ?? DEFAULT_SETTINGS_SIDEBAR_ITEMS;
  const resolved: SettingsSidebarItemConfig[] = [];
  const seen = new Set<BuiltinSettingsSidebarItemId>();

  for (const item of source) {
    if (!DEFAULT_SIDEBAR_IDS.has(item.id)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    resolved.push({ id: item.id, visible: item.visible !== false });
  }

  for (const fallback of DEFAULT_SETTINGS_SIDEBAR_ITEMS) {
    if (seen.has(fallback.id)) continue;
    resolved.push(fallback);
  }

  return resolved;
}

export function normalizeTitlebarQuickActions(
  saved?: TitlebarQuickActionConfig[],
): TitlebarQuickActionConfig[] {
  const source = saved ?? DEFAULT_TITLEBAR_QUICK_ACTIONS;
  const resolved: TitlebarQuickActionConfig[] = [];
  const seen = new Set<string>();

  for (const raw of source as Array<TitlebarQuickActionConfig & { kind?: string }>) {
    const normalized: TitlebarQuickActionConfig =
      raw.kind === 'settings-section'
        ? {
            kind: 'settings-section',
            id: raw.id as BuiltinSettingsSidebarItemId,
            visible: raw.visible !== false,
          }
        : {
            kind: 'builtin-action',
            id: raw.id as BuiltinTitlebarActionId,
            visible: raw.visible !== false,
          };

    const key = `${normalized.kind}:${normalized.id}`;
    if (
      (normalized.kind === 'builtin-action' && !DEFAULT_TITLEBAR_KEYS.has(key)) ||
      (normalized.kind === 'settings-section' && !DEFAULT_SIDEBAR_IDS.has(normalized.id))
    ) {
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(normalized);
  }

  for (const fallback of DEFAULT_TITLEBAR_QUICK_ACTIONS) {
    const key = `${fallback.kind}:${fallback.id}`;
    if (seen.has(key)) continue;
    resolved.push(fallback);
  }

  return resolved;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh-CN',
  theme_mode: 'system',
  primary_color: '#17A93D',
  border_radius: 8,
  auto_start: false,
  show_on_start: true,
  minimize_to_tray: true,
  font_size: 14,
  font_weight: 400,
  font_family: '',
  code_font_family: '',
  bubble_style: 'minimal',
  code_theme: 'poimandres',
  code_theme_light: 'github-light',
  default_provider_id: null,
  default_model_id: null,
  default_temperature: null,
  default_max_tokens: null,
  default_top_p: null,
  default_frequency_penalty: null,
  default_context_count: null,
  title_summary_provider_id: null,
  title_summary_model_id: null,
  title_summary_temperature: null,
  title_summary_max_tokens: null,
  title_summary_top_p: null,
  title_summary_frequency_penalty: null,
  title_summary_context_count: null,
  title_summary_prompt: null,
  compression_provider_id: null,
  compression_model_id: null,
  compression_temperature: null,
  compression_max_tokens: null,
  compression_top_p: null,
  compression_frequency_penalty: null,
  compression_prompt: null,
  proxy_type: null,
  proxy_address: null,
  proxy_port: null,
  global_shortcut: DEFAULT_SHORTCUT_BINDINGS.toggleCurrentWindow,
  shortcut_toggle_current_window: DEFAULT_SHORTCUT_BINDINGS.toggleCurrentWindow,
  shortcut_toggle_all_windows: DEFAULT_SHORTCUT_BINDINGS.toggleAllWindows,
  shortcut_close_window: DEFAULT_SHORTCUT_BINDINGS.closeWindow,
  shortcut_new_conversation: DEFAULT_SHORTCUT_BINDINGS.newConversation,
  shortcut_open_settings: DEFAULT_SHORTCUT_BINDINGS.openSettings,
  shortcut_toggle_model_selector: DEFAULT_SHORTCUT_BINDINGS.toggleModelSelector,
  shortcut_fill_last_message: DEFAULT_SHORTCUT_BINDINGS.fillLastMessage,
  shortcut_clear_context: DEFAULT_SHORTCUT_BINDINGS.clearContext,
  shortcut_clear_conversation_messages: DEFAULT_SHORTCUT_BINDINGS.clearConversationMessages,
  shortcut_toggle_gateway: DEFAULT_SHORTCUT_BINDINGS.toggleGateway,
  shortcut_toggle_mode: DEFAULT_SHORTCUT_BINDINGS.toggleMode,
  gateway_auto_start: false,
  gateway_listen_address: '127.0.0.1',
  gateway_port: 8080,
  gateway_ssl_enabled: false,
  gateway_ssl_mode: 'upload',
  gateway_ssl_cert_path: null,
  gateway_ssl_key_path: null,
  gateway_ssl_port: 8443,
  gateway_force_ssl: false,
  always_on_top: false,
  tray_enabled: true,
  global_shortcuts_enabled: true,
  shortcut_registration_logs_enabled: false,
  shortcut_trigger_toast_enabled: false,
  notifications_enabled: true,
  mini_window_enabled: false,
  start_minimized: false,
  close_to_tray: true,
  notify_backup: true,
  notify_import: true,
  notify_errors: true,
  last_selected_conversation_id: null,
  documents_root_override: null,
  update_check_interval: 60,
  default_system_prompt: null,
  chat_minimap_enabled: false,
  chat_minimap_style: 'faq',
  multi_model_display_mode: 'tabs',
  render_user_markdown: false,
  settings_sidebar_items: DEFAULT_SETTINGS_SIDEBAR_ITEMS,
  titlebar_quick_actions: DEFAULT_TITLEBAR_QUICK_ACTIONS,
  // WebDAV sync settings — must be present so stale saves never omit them
  webdav_host: null,
  webdav_username: null,
  webdav_path: null,
  webdav_accept_invalid_certs: false,
  webdav_sync_enabled: false,
  webdav_sync_interval_minutes: 60,
  webdav_max_remote_backups: 10,
  webdav_include_documents: false,
};

export interface GlobalShortcutDiagnostic {
  timestamp: string;
  phase: 'env' | 'register' | 'cleanup';
  level: 'info' | 'warn' | 'error';
  message: string;
  action?: string;
  shortcut?: string;
  reason?: string;
}

export interface GlobalShortcutStatus {
  enabled: boolean;
  registered: string[];
  failed: Array<{ shortcut: string; reason: string }>;
  diagnostics: GlobalShortcutDiagnostic[];
}

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  /** Set once after the first successful fetchSettings; guards saveSettings from writing stale data. */
  _loaded: boolean;
  error: string | null;
  globalShortcutStatus: GlobalShortcutStatus;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  setGlobalShortcutStatus: (status: GlobalShortcutStatus) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loading: true,
  _loaded: false,
  error: null,
  globalShortcutStatus: {
    enabled: false,
    registered: [],
    failed: [],
    diagnostics: [],
  },

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const fetched = await invoke<Partial<AppSettings>>('get_settings');
      set({
        settings: {
          ...DEFAULT_SETTINGS,
          ...fetched,
          settings_sidebar_items: normalizeSettingsSidebarItems(fetched.settings_sidebar_items),
          titlebar_quick_actions: normalizeTitlebarQuickActions(fetched.titlebar_quick_actions),
        },
        loading: false,
        _loaded: true,
        error: null,
      });
    } catch (e) {
      set({ error: String(e), loading: false, _loaded: true });
    }
  },

  saveSettings: async (partial) => {
    if (!get()._loaded) {
      console.warn('[settingsStore] saveSettings skipped: settings not loaded yet');
      return;
    }
    const merged = {
      ...get().settings,
      ...partial,
      settings_sidebar_items: normalizeSettingsSidebarItems(
        partial.settings_sidebar_items ?? get().settings.settings_sidebar_items,
      ),
      titlebar_quick_actions: normalizeTitlebarQuickActions(
        partial.titlebar_quick_actions ?? get().settings.titlebar_quick_actions,
      ),
    };
    set({ settings: merged, error: null });
    try {
      await invoke('save_settings', { settings: merged });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setGlobalShortcutStatus: (status) => {
    set({ globalShortcutStatus: status });
  },
}));
