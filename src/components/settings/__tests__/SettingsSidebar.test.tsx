import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsSidebar } from '../SettingsSidebar';

const setSettingsSection = vi.fn();
const exitSettings = vi.fn();

let mockedSettings: { settings_sidebar_items?: Array<{ id: string; visible: boolean }> } = {};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string | string[]) => (Array.isArray(key) ? key[0] : key),
  }),
}));

vi.mock('@/stores', () => ({
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      settingsSection: 'general',
      setSettingsSection,
      exitSettings,
    }),
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      settings: mockedSettings,
    }),
}));

describe('SettingsSidebar', () => {
  beforeEach(() => {
    mockedSettings = {};
    setSettingsSection.mockReset();
    exitSettings.mockReset();
  });

  it('renders built-in settings sections when no custom config is saved', () => {
    render(<SettingsSidebar />);

    expect(screen.getByText('settings.general.title')).toBeInTheDocument();
    expect(screen.getByText('settings.backup.title')).toBeInTheDocument();
  });

  it('renders only visible configured items in configured order', () => {
    mockedSettings = {
      settings_sidebar_items: [
        { id: 'storage', visible: true },
        { id: 'general', visible: true },
        { id: 'display', visible: false },
      ],
    };

    render(<SettingsSidebar />);

    const labels = screen
      .getAllByRole('menuitem')
      .map((node) => node.textContent ?? '')
      .filter(Boolean);

    expect(labels[0]).toContain('settings.storage.title');
    expect(labels[1]).toContain('settings.general.title');
    expect(screen.queryByText('settings.display.title')).not.toBeInTheDocument();
  });
});
