import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TitleBar } from '../TitleBar';

const enterSettings = vi.fn();
const exitSettings = vi.fn();
const saveSettings = vi.fn();
const loadBackupSettings = vi.fn();
const checkForUpdate = vi.fn();

let mockedSettings = {
  theme_mode: 'system',
  always_on_top: false,
  titlebar_quick_actions: [
    { id: 'pin', visible: true },
    { id: 'reload', visible: false },
    { id: 'settings', visible: true },
  ],
  webdav_sync_enabled: false,
  webdav_sync_interval_minutes: 60,
  shortcut_open_settings: 'Ctrl+,',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/stores', () => ({
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activePage: 'chat',
      enterSettings,
      exitSettings,
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
    loadBackupSettings.mockReset();
    checkForUpdate.mockReset();
    mockedSettings = {
      theme_mode: 'system',
      always_on_top: false,
      titlebar_quick_actions: [
        { id: 'pin', visible: true },
        { id: 'reload', visible: false },
        { id: 'settings', visible: true },
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
});
