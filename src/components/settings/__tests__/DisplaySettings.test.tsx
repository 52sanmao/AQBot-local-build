import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DisplaySettings } from '../DisplaySettings';

const saveSettings = vi.fn();

let mockedSettings: Record<string, unknown> = {
  theme_mode: 'system',
  primary_color: '#17A93D',
  font_size: 14,
  font_weight: 400,
  font_family: '',
  code_font_family: '',
  code_theme_light: 'github-light',
  code_theme: 'poimandres',
  border_radius: 8,
  settings_sidebar_items: [
    { id: 'general', visible: true },
    { id: 'display', visible: true },
    { id: 'providers', visible: false },
  ],
  titlebar_quick_actions: [
    { kind: 'builtin-action', id: 'settings', visible: true },
    { kind: 'settings-section', id: 'providers', visible: true },
  ],
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string | string[]) => (Array.isArray(key) ? key[0] : key),
  }),
}));

vi.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      settings: mockedSettings,
      saveSettings,
    }),
}));

vi.mock('@/lib/invoke', () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

describe('DisplaySettings', () => {
  beforeEach(() => {
    saveSettings.mockReset();
  });

  it('shows available and selected areas for the titlebar shelf editor', () => {
    render(<DisplaySettings />);

    expect(screen.getByText('settings.entryShelf.available')).toBeInTheDocument();
    expect(screen.getByText('settings.entryShelf.selected')).toBeInTheDocument();
    expect(screen.getByText('settings.entryShelf.addToTitlebar')).toBeInTheDocument();
    expect(screen.getByText('settings.providers.title')).toBeInTheDocument();
  });
});
