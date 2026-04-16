import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TitleBar } from '../TitleBar';

const enterSettings = vi.fn();
const exitSettings = vi.fn();
const setSettingsSection = vi.fn();
const saveSettings = vi.fn();
const loadBackupSettings = vi.fn();
const checkForUpdate = vi.fn();

let mockedSettings = {
  theme_mode: 'system',
  always_on_top: false,
  titlebar_quick_actions: [
    { kind: 'builtin-action', id: 'pin', visible: true },
    { kind: 'builtin-action', id: 'reload', visible: false },
    { kind: 'builtin-action', id: 'settings', visible: true },
  ],
  webdav_sync_enabled: false,
  webdav_sync_interval_minutes: 60,
  shortcut_open_settings: 'Ctrl+,',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string | string[]) => (Array.isArray(key) ? key[0] : key),
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/stores', () => ({
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activePage: 'chat',
      enterSettings,
      exitSettings,
      setSettingsSection,
    }),
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      settings: mockedSettings,
      saveSettings,
    }),
}));

vi.mock('@/stores/backupStore', () => ({
  useBackupStore: () => ({
    backupSettings: null,
    loadBackupSettings,
  }),
}));

vi.mock('@/lib/invoke', () => ({
  isTauri: () => false,
  invoke: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/hooks/useUpdateChecker', () => ({
  useUpdateChecker: () => ({
    checkForUpdate,
  }),
}));

describe('TitleBar', () => {
  beforeEach(() => {
    enterSettings.mockReset();
    exitSettings.mockReset();
    saveSettings.mockReset();
    setSettingsSection.mockReset();
    loadBackupSettings.mockReset();
    checkForUpdate.mockReset();
    mockedSettings = {
      theme_mode: 'system',
      always_on_top: false,
      titlebar_quick_actions: [
        { kind: 'builtin-action', id: 'pin', visible: true },
        { kind: 'builtin-action', id: 'reload', visible: false },
        { kind: 'builtin-action', id: 'settings', visible: true },
      ],
      webdav_sync_enabled: false,
      webdav_sync_interval_minutes: 60,
      shortcut_open_settings: 'Ctrl+,',
    };
  });

  it('hides disabled configured titlebar actions', () => {
    render(
      <App>
        <TitleBar />
      </App>,
    );

    expect(screen.queryByRole('button', { name: 'desktop.reloadPage' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'desktop.alwaysOnTop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'settings.openSettings' })).toBeInTheDocument();
  });

  it('renders configured settings shortcuts in the titlebar', () => {
    mockedSettings.titlebar_quick_actions = [
      { kind: 'settings-section', id: 'providers', visible: true },
      { kind: 'builtin-action', id: 'settings', visible: true },
    ];

    render(
      <App>
        <TitleBar />
      </App>,
    );

    expect(screen.getByRole('button', { name: 'settings.providers.title' })).toBeInTheDocument();
  });

  it('opens the target settings section when clicking a titlebar settings shortcut', async () => {
    mockedSettings.titlebar_quick_actions = [
      { kind: 'settings-section', id: 'providers', visible: true },
    ];

    render(
      <App>
        <TitleBar />
      </App>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'settings.providers.title' }));

    expect(enterSettings).toHaveBeenCalled();
    expect(setSettingsSection).toHaveBeenCalledWith('providers');
  });
});
