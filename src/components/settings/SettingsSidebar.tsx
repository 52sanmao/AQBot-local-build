import { Menu, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, useUIStore } from '@/stores';
import { DEFAULT_SETTINGS_SIDEBAR_ITEMS, normalizeSettingsSidebarItems } from '@/stores/settingsStore';
import type { SettingsSection, SettingsSidebarItemConfig } from '@/types';
import { SETTINGS_BACK_ICON, SETTINGS_SECTION_ICONS } from './settingsSectionMeta';

const SECTION_KEYS: SettingsSection[] = DEFAULT_SETTINGS_SIDEBAR_ITEMS.map((item) => item.id);

function resolveSidebarSections(saved?: SettingsSidebarItemConfig[]): SettingsSection[] {
  const seen = new Set<SettingsSection>();
  const resolved: SettingsSection[] = [];

  for (const item of normalizeSettingsSidebarItems(saved)) {
    seen.add(item.id);
    if (item.visible) resolved.push(item.id);
  }

  for (const id of SECTION_KEYS) {
    if (seen.has(id)) continue;
    resolved.push(id);
  }

  return resolved.length > 0 ? resolved : SECTION_KEYS;
}

export function SettingsSidebar() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const settingsSection = useUIStore((s) => s.settingsSection);
  const setSettingsSection = useUIStore((s) => s.setSettingsSection);
  const exitSettings = useUIStore((s) => s.exitSettings);
  const sidebarItems = useSettingsStore((s) => s.settings.settings_sidebar_items);

  const items = resolveSidebarSections(sidebarItems).map((key) => ({
    key,
    icon: SETTINGS_SECTION_ICONS[key],
    label: t([`settings.${key}.title`, `settings.${key}`]),
  }));

  return (
    <div className="h-full flex flex-col" data-os-scrollbar style={{ backgroundColor: token.colorBgContainer, overflowY: 'auto' }}>
      {/* Back button */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        style={{
          color: token.colorTextSecondary,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
          paddingLeft: 26,
          paddingRight: 16,
          paddingTop: 12,
          paddingBottom: 12,
        }}
        onClick={exitSettings}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = token.colorText;
          e.currentTarget.style.backgroundColor = token.colorFillSecondary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = token.colorTextSecondary;
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {SETTINGS_BACK_ICON}
        <span style={{ fontSize: 14 }}>{t('common.back')}</span>
        <span
          style={{
            fontSize: 11,
            color: token.colorTextQuaternary,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 4,
            padding: '1px 6px',
            marginLeft: 4,
            lineHeight: '16px',
          }}
        >
          Esc
        </span>
      </div>
      <div className="flex-1 pt-1" style={{ overflowY: 'auto' }}>
        <Menu
          mode="inline"
          selectedKeys={[settingsSection]}
          items={items}
          style={{ borderInlineEnd: 'none' }}
          onClick={({ key }) => setSettingsSection(key as SettingsSection)}
        />
      </div>
    </div>
  );
}
