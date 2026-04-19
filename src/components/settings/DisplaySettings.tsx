import { ColorPicker, Divider, Segmented, Slider } from 'antd';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '@/stores';
import {
  DEFAULT_SETTINGS_SECTION_IDS,
  normalizeTitlebarQuickActions,
} from '@/stores/settingsStore';
import { invoke, isTauri } from '@/lib/invoke';
import { SHIKI_LIGHT_THEMES, SHIKI_DARK_THEMES, formatThemeName } from '@/constants/codeThemes';
import { SettingsGroup } from './SettingsGroup';
import { SettingsSelect } from './SettingsSelect';
import { TitlebarSettingsShortcutEditor } from './TitlebarSettingsShortcutEditor';
import { TITLEBAR_ACTION_LABEL_KEYS } from './titlebarQuickActionMeta';
import type {
  BuiltinTitlebarActionId,
  TitlebarQuickActionConfig,
} from '@/types';

export function DisplaySettings() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);

  useEffect(() => {
    if (!isTauri()) return;
    invoke<string[]>('list_system_fonts').then(setSystemFonts).catch(() => {});
  }, []);

  const rowStyle = { padding: '4px 0' };

  const lightThemeOptions = useMemo(
    () => SHIKI_LIGHT_THEMES.map((id) => ({ label: formatThemeName(id), value: id })),
    [],
  );
  const darkThemeOptions = useMemo(
    () => SHIKI_DARK_THEMES.map((id) => ({ label: formatThemeName(id), value: id })),
    [],
  );

  const titlebarActions = normalizeTitlebarQuickActions(settings.titlebar_quick_actions);

  const titlebarEditorOptions = useMemo(
    () =>
      [
        ...normalizeTitlebarQuickActions([])
          .filter((item): item is Extract<TitlebarQuickActionConfig, { kind: 'builtin-action' }> => item.kind === 'builtin-action')
          .map((item) => ({
            key: `${item.kind}:${item.id}`,
            kind: item.kind,
            id: item.id,
            config: { ...item, visible: false } as TitlebarQuickActionConfig,
            label: t(TITLEBAR_ACTION_LABEL_KEYS[item.id as BuiltinTitlebarActionId]),
          })),
        ...DEFAULT_SETTINGS_SECTION_IDS.map((id) => ({
          key: `settings-section:${id}`,
          kind: 'settings-section' as const,
          id,
          config: { kind: 'settings-section', id, visible: false } as TitlebarQuickActionConfig,
          label: t([`settings.${id}.title`, `settings.${id}`]),
        })),
      ],
    [t],
  );

  const selectedTitlebarKeys = useMemo(
    () =>
      titlebarActions
        .filter((item) => item.visible)
        .map((item) => `${item.kind}:${item.id}`),
    [titlebarActions],
  );

  const buildTitlebarConfig = (selectedKeys: string[]): TitlebarQuickActionConfig[] => {
    const selectedSet = new Set(selectedKeys);
    const optionMap = new Map(titlebarEditorOptions.map((option) => [option.key, option]));
    return [
      ...selectedKeys
        .map((key) => optionMap.get(key))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => ({ ...item.config, visible: true })),
      ...titlebarEditorOptions
        .filter((item) => !selectedSet.has(item.key))
        .map((item) => ({ ...item.config, visible: false })),
    ];
  };

  return (
    <div className="p-6 pb-12">
      <SettingsGroup title={t('settings.groupTheme')}>
        <div style={rowStyle} className="flex items-center justify-between">
          <span>{t('settings.theme')}</span>
          <Segmented
            value={settings.theme_mode}
            onChange={(val) => saveSettings({ theme_mode: val as string })}
            options={[
              { label: t('settings.themeSystem'), value: 'system', icon: <Monitor size={14} /> },
              { label: t('settings.themeLight'), value: 'light', icon: <Sun size={14} /> },
              { label: t('settings.themeDark'), value: 'dark', icon: <Moon size={14} /> },
            ]}
          />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={rowStyle} className="flex items-center justify-between">
          <span>{t('settings.primaryColor')}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              '#17A93D', '#1677ff', '#1890ff', '#13c2c2', '#2f54eb',
              '#722ed1', '#eb2f96', '#fa541c', '#faad14', '#fadb14',
              '#a0d911', '#000000',
            ].map((color) => (
              <div
                key={color}
                onClick={() => saveSettings({ primary_color: color })}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: settings.primary_color === color ? '2px solid currentColor' : '2px solid transparent',
                  boxShadow: settings.primary_color === color ? `0 0 0 1px ${color}` : 'none',
                  transition: 'all 0.2s',
                }}
              />
            ))}
            <ColorPicker
              value={settings.primary_color}
              onChangeComplete={(color) => saveSettings({ primary_color: color.toHexString() })}
              size="small"
            />
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t('settings.groupFontRadius')}>
        <div style={{ padding: '4px 0' }}>
          <span>{t('settings.fontSize')}</span>
          <Slider
            min={12}
            max={20}
            value={settings.font_size}
            onChange={(val) => saveSettings({ font_size: val })}
            marks={{ 12: '12', 14: '14', 16: '16', 18: '18', 20: '20' }}
          />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={{ padding: '4px 0' }}>
          <span>{t('settings.fontWeight')}</span>
          <Slider
            min={100}
            max={900}
            step={100}
            value={settings.font_weight}
            onChange={(val) => saveSettings({ font_weight: val })}
            marks={{ 100: '100', 300: '300', 400: '400', 500: '500', 700: '700', 900: '900' }}
          />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={rowStyle} className="flex items-center justify-between">
          <span>{t('settings.fontFamily')}</span>
          <SettingsSelect
            searchable
            value={settings.font_family || ''}
            onChange={(val) => saveSettings({ font_family: val })}
            options={[{ label: t('settings.fontDefault'), value: '' }, ...systemFonts.map((f) => ({ label: f, value: f }))]}
          />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={rowStyle} className="flex items-center justify-between">
          <span>{t('settings.codeFontFamily')}</span>
          <SettingsSelect
            searchable
            value={settings.code_font_family || ''}
            onChange={(val) => saveSettings({ code_font_family: val })}
            options={[{ label: t('settings.fontDefault'), value: '' }, ...systemFonts.map((f) => ({ label: f, value: f }))]}
          />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={rowStyle} className="flex items-center justify-between">
          <span>{t('settings.codeThemeLight')}</span>
          <SettingsSelect
            searchable
            value={settings.code_theme_light || 'github-light'}
            onChange={(val) => saveSettings({ code_theme_light: val })}
            options={lightThemeOptions}
          />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={rowStyle} className="flex items-center justify-between">
          <span>{t('settings.codeThemeDark')}</span>
          <SettingsSelect
            searchable
            value={settings.code_theme || 'poimandres'}
            onChange={(val) => saveSettings({ code_theme: val })}
            options={darkThemeOptions}
          />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={{ padding: '4px 0' }}>
          <span>{t('settings.borderRadius')}</span>
          <Slider
            min={0}
            max={20}
            value={settings.border_radius}
            onChange={(val) => saveSettings({ border_radius: val })}
            marks={{ 0: '0', 4: '4', 8: '8', 12: '12', 16: '16', 20: '20' }}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title={t('settings.titlebarSettingsShortcuts')}>
        <TitlebarSettingsShortcutEditor
          description={t('settings.entryShelf.settingsShortcutDescription')}
          allTitle={t('settings.entryShelf.allSettingsEntries')}
          orderTitle={t('settings.entryShelf.selectedOrder')}
          selectedLabel={t('settings.entryShelf.selectedBadge')}
          allOptions={titlebarEditorOptions.map(({ key, kind, id, label }) => ({ key, kind, id, label }))}
          selectedKeys={selectedTitlebarKeys}
          onToggle={(key) => {
            const next = selectedTitlebarKeys.includes(key)
              ? selectedTitlebarKeys.filter((current) => current !== key)
              : [...selectedTitlebarKeys, key];
            saveSettings({ titlebar_quick_actions: buildTitlebarConfig(next) });
          }}
          onReorder={(keys) => saveSettings({ titlebar_quick_actions: buildTitlebarConfig(keys) })}
        />
      </SettingsGroup>
    </div>
  );
}
