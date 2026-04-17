import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows the single-box titlebar shortcut editor', () => {
    render(<DisplaySettings />);

    expect(screen.getByText('settings.entryShelf.allSettingsEntries')).toBeInTheDocument();
    expect(screen.getByText('settings.entryShelf.selectedOrder')).toBeInTheDocument();
    expect(screen.getAllByText('settings.providers.title').length).toBeGreaterThan(0);
  });

  it('toggles a settings shortcut when clicking its chip', async () => {
    render(<DisplaySettings />);

    await userEvent.click(screen.getByRole('button', { name: /settings.general.title/i }));

    const [{ titlebar_quick_actions }] = saveSettings.mock.calls[0];

    expect(titlebar_quick_actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'builtin-action', id: 'settings', visible: true }),
        expect.objectContaining({ kind: 'settings-section', id: 'providers', visible: true }),
        expect.objectContaining({ kind: 'settings-section', id: 'general', visible: true }),
      ]),
    );
  });
});
