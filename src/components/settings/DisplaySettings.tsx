import { ColorPicker, Divider, Segmented, Slider } from 'antd';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '@/stores';
import {
  DEFAULT_SETTINGS_SIDEBAR_ITEMS,
  DEFAULT_TITLEBAR_QUICK_ACTIONS,
  normalizeSettingsSidebarItems,
  normalizeTitlebarQuickActions,
} from '@/stores/settingsStore';
import { invoke, isTauri } from '@/lib/invoke';
import { SHIKI_LIGHT_THEMES, SHIKI_DARK_THEMES, formatThemeName } from '@/constants/codeThemes';
import { SettingsGroup } from './SettingsGroup';
import { SettingsSelect } from './SettingsSelect';
import { EntryShelfEditor } from './EntryShelfEditor';
import type {
  BuiltinSettingsSidebarItemId,
  BuiltinTitlebarActionId,
  SettingsSidebarItemConfig,
  TitlebarQuickActionConfig,
} from '@/types';

type TitlebarShelfKey = `builtin:${BuiltinTitlebarActionId}` | `settings:${BuiltinSettingsSidebarItemId}`;

const SETTINGS_SECTION_KEYS = DEFAULT_SETTINGS_SIDEBAR_ITEMS.map((item) => item.id);

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

  const sidebarItems = normalizeSettingsSidebarItems(settings.settings_sidebar_items);
  const titlebarActions = normalizeTitlebarQuickActions(settings.titlebar_quick_actions);

  const titlebarCatalog = useMemo(() => {
    const builtinItems = DEFAULT_TITLEBAR_QUICK_ACTIONS.map((item) => ({
      key: `builtin:${item.id}` as TitlebarShelfKey,
      config: { kind: 'builtin-action', id: item.id, visible: false } as TitlebarQuickActionConfig,
      label: t(`settings.titlebarAction.${item.id}`),
      description: t('settings.entryShelf.builtinActionDescription'),
      badge: t('settings.entryShelf.builtinActionBadge'),
    }));

    const settingsItems = DEFAULT_SETTINGS_SIDEBAR_ITEMS.map((item) => ({
      key: `settings:${item.id}` as TitlebarShelfKey,
      config: { kind: 'settings-section', id: item.id, visible: false } as TitlebarQuickActionConfig,
      label: t([`settings.${item.id}.title`, `settings.${item.id}`]),
      description: t('settings.entryShelf.settingsShortcutDescription'),
      badge: t('settings.entryShelf.settingsShortcutBadge'),
    }));

    return [...builtinItems, ...settingsItems];
  }, [t]);

  const titlebarCatalogMap = useMemo(
    () => new Map(titlebarCatalog.map((item) => [item.key, item])),
    [titlebarCatalog],
  );

  const selectedTitlebarKeys = useMemo(
    () =>
      titlebarActions
        .filter((item) => item.visible)
        .map((item) =>
          item.kind === 'builtin-action'
            ? (`builtin:${item.id}` as TitlebarShelfKey)
            : (`settings:${item.id}` as TitlebarShelfKey),
        ),
    [titlebarActions],
  );

  const selectedTitlebarItems = selectedTitlebarKeys
    .map((key) => titlebarCatalogMap.get(key))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const availableTitlebarItems = titlebarCatalog.filter((item) => !selectedTitlebarKeys.includes(item.key));

  const buildTitlebarConfig = (selectedKeys: TitlebarShelfKey[]): TitlebarQuickActionConfig[] => {
    const selectedSet = new Set(selectedKeys);
    return [
      ...selectedKeys
        .map((key) => titlebarCatalogMap.get(key)?.config)
        .filter((item): item is TitlebarQuickActionConfig => Boolean(item))
        .map((item) => ({ ...item, visible: true })),
      ...titlebarCatalog
        .filter((item) => !selectedSet.has(item.key))
        .map((item) => ({ ...item.config, visible: false })),
    ];
  };

  const settingsCatalog = useMemo(
    () => DEFAULT_SETTINGS_SIDEBAR_ITEMS.map((item) => ({
      key: item.id,
      label: t([`settings.${item.id}.title`, `settings.${item.id}`]),
      description: t('settings.entryShelf.settingsSidebarDescription'),
    })),
    [t],
  );

  const settingsCatalogMap = useMemo(
    () => new Map(settingsCatalog.map((item) => [item.key, item])),
    [settingsCatalog],
  );

  const selectedSidebarKeys = sidebarItems.filter((item) => item.visible).map((item) => item.id);
  const selectedSidebarItems = selectedSidebarKeys
    .map((key) => settingsCatalogMap.get(key))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const availableSidebarItems = settingsCatalog.filter((item) => !selectedSidebarKeys.includes(item.key));

  const buildSidebarConfig = (selectedKeys: BuiltinSettingsSidebarItemId[]): SettingsSidebarItemConfig[] => {
    const selectedSet = new Set(selectedKeys);
    return [
      ...selectedKeys.map((id) => ({ id, visible: true })),
      ...SETTINGS_SECTION_KEYS.filter((id) => !selectedSet.has(id)).map((id) => ({ id, visible: false })),
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

      <SettingsGroup title={t('settings.customizeTitlebarActions')}>
        <EntryShelfEditor
          availableTitle={t('settings.entryShelf.available')}
          selectedTitle={t('settings.entryShelf.selected')}
          addLabel={t('settings.entryShelf.addToTitlebar')}
          removeLabel={t('settings.entryShelf.remove')}
          availableItems={availableTitlebarItems}
          selectedItems={selectedTitlebarItems}
          onAdd={(key) => saveSettings({ titlebar_quick_actions: buildTitlebarConfig([...selectedTitlebarKeys, key as TitlebarShelfKey]) })}
          onRemove={(key) => saveSettings({ titlebar_quick_actions: buildTitlebarConfig(selectedTitlebarKeys.filter((current) => current !== key)) })}
          onReorder={(keys) => saveSettings({ titlebar_quick_actions: buildTitlebarConfig(keys as TitlebarShelfKey[]) })}
        />
      </SettingsGroup>

      <SettingsGroup title={t('settings.customizeSettingsSidebar')}>
        <EntryShelfEditor
          availableTitle={t('settings.entryShelf.available')}
          selectedTitle={t('settings.entryShelf.selected')}
          addLabel={t('settings.entryShelf.addToSidebar')}
          removeLabel={t('settings.entryShelf.remove')}
          availableItems={availableSidebarItems}
          selectedItems={selectedSidebarItems}
          onAdd={(key) => saveSettings({ settings_sidebar_items: buildSidebarConfig([...selectedSidebarKeys, key as BuiltinSettingsSidebarItemId]) })}
          onRemove={(key) => saveSettings({ settings_sidebar_items: buildSidebarConfig(selectedSidebarKeys.filter((current) => current !== key)) })}
          onReorder={(keys) => saveSettings({ settings_sidebar_items: buildSidebarConfig(keys as BuiltinSettingsSidebarItemId[]) })}
        />
      </SettingsGroup>
    </div>
  );
}
