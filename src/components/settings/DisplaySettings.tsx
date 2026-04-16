import { Button, ColorPicker, Divider, Segmented, Slider, Space, Switch } from 'antd';
import { Sun, Moon, Monitor, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '@/stores';
import { DEFAULT_SETTINGS_SIDEBAR_ITEMS, DEFAULT_TITLEBAR_QUICK_ACTIONS } from '@/stores/settingsStore';
import { invoke, isTauri } from '@/lib/invoke';
import { SHIKI_LIGHT_THEMES, SHIKI_DARK_THEMES, formatThemeName } from '@/constants/codeThemes';
import { SettingsGroup } from './SettingsGroup';
import { SettingsSelect } from './SettingsSelect';
import type { SettingsSidebarItemConfig, TitlebarQuickActionConfig } from '@/types';

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

  const sidebarItems = settings.settings_sidebar_items ?? DEFAULT_SETTINGS_SIDEBAR_ITEMS;
  const titlebarActions = settings.titlebar_quick_actions ?? DEFAULT_TITLEBAR_QUICK_ACTIONS;

  function moveItem<T>(items: T[], from: number, to: number) {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  const updateSidebarItems = (next: SettingsSidebarItemConfig[]) => {
    if (!next.some((item) => item.visible)) return;
    saveSettings({ settings_sidebar_items: next });
  };

  const updateTitlebarActions = (next: TitlebarQuickActionConfig[]) => {
    if (!next.some((item) => item.visible)) return;
    saveSettings({ titlebar_quick_actions: next });
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
                  border: settings.primary_color === color
                    ? '2px solid currentColor'
                    : '2px solid transparent',
                  boxShadow: settings.primary_color === color
                    ? `0 0 0 1px ${color}`
                    : 'none',
                  transition: 'all 0.2s',
                }}
              />
            ))}
            <ColorPicker
              value={settings.primary_color}
              onChangeComplete={(color) =>
                saveSettings({ primary_color: color.toHexString() })
              }
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
            options={[
              { label: t('settings.fontDefault'), value: '' },
              ...systemFonts.map((f) => ({ label: f, value: f })),
            ]}
          />
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div style={rowStyle} className="flex items-center justify-between">
          <span>{t('settings.codeFontFamily')}</span>
          <SettingsSelect
            searchable
            value={settings.code_font_family || ''}
            onChange={(val) => saveSettings({ code_font_family: val })}
            options={[
              { label: t('settings.fontDefault'), value: '' },
              ...systemFonts.map((f) => ({ label: f, value: f })),
            ]}
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
      <SettingsGroup title={t('settings.customizeSettingsSidebar')}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {sidebarItems.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between gap-3" style={rowStyle}>
              <Space size="small">
                <Switch
                  checked={item.visible}
                  onChange={(visible) => {
                    const next = sidebarItems.map((current) =>
                      current.id === item.id ? { ...current, visible } : current,
                    );
                    updateSidebarItems(next);
                  }}
                />
                <span>{t([`settings.${item.id}.title`, `settings.${item.id}`])}</span>
              </Space>
              <Space size="small">
                <Button
                  size="small"
                  icon={<ArrowUp size={14} />}
                  disabled={index === 0}
                  onClick={() => updateSidebarItems(moveItem(sidebarItems, index, index - 1))}
                />
                <Button
                  size="small"
                  icon={<ArrowDown size={14} />}
                  disabled={index === sidebarItems.length - 1}
                  onClick={() => updateSidebarItems(moveItem(sidebarItems, index, index + 1))}
                />
              </Space>
            </div>
          ))}
          <Button onClick={() => saveSettings({ settings_sidebar_items: DEFAULT_SETTINGS_SIDEBAR_ITEMS })}>
            {t('common.reset')}
          </Button>
        </Space>
      </SettingsGroup>
      <SettingsGroup title={t('settings.customizeTitlebarActions')}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {titlebarActions.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between gap-3" style={rowStyle}>
              <Space size="small">
                <Switch
                  checked={item.visible}
                  onChange={(visible) => {
                    const next = titlebarActions.map((current) =>
                      current.id === item.id ? { ...current, visible } : current,
                    );
                    updateTitlebarActions(next);
                  }}
                />
                <span>{t(`settings.titlebarAction.${item.id}`)}</span>
              </Space>
              <Space size="small">
                <Button
                  size="small"
                  icon={<ArrowUp size={14} />}
                  disabled={index === 0}
                  onClick={() => updateTitlebarActions(moveItem(titlebarActions, index, index - 1))}
                />
                <Button
                  size="small"
                  icon={<ArrowDown size={14} />}
                  disabled={index === titlebarActions.length - 1}
                  onClick={() => updateTitlebarActions(moveItem(titlebarActions, index, index + 1))}
                />
              </Space>
            </div>
          ))}
          <Button onClick={() => saveSettings({ titlebar_quick_actions: DEFAULT_TITLEBAR_QUICK_ACTIONS })}>
            {t('common.reset')}
          </Button>
        </Space>
      </SettingsGroup>
    </div>
  );
}
