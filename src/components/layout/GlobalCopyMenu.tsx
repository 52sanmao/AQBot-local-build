import { useState, useEffect, useCallback } from 'react';
import { Dropdown } from 'antd';
import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Global right-click context menu (production only).
 * - When text is selected: shows a "Copy" menu at the cursor position.
 * - When no text is selected: suppresses the native context menu.
 * - Skips when a component-specific context menu already handled the event
 *   (detected via `e.defaultPrevented`, e.g. ChatSidebar's conversation menu).
 * - In dev mode, native context menu is preserved for browser DevTools access.
 */
export function GlobalCopyMenu() {
  const { t } = useTranslation();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // In dev mode, preserve native context menu for browser DevTools
    if (import.meta.env.DEV) return;

    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      e.preventDefault();

      const sel = window.getSelection()?.toString().trim();
      if (sel) {
        setMenuPos({ x: e.clientX, y: e.clientY });
      }
    };

    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  const handleCopy = useCallback(() => {
    const sel = window.getSelection()?.toString();
    if (sel) void navigator.clipboard.writeText(sel);
    setMenuPos(null);
  }, []);

  if (!menuPos) return null;

  return (
    <Dropdown
      open
      onOpenChange={(open) => { if (!open) setMenuPos(null); }}
      menu={{
        items: [{ key: 'copy', label: t('common.copy', '复制'), icon: <Copy size={14} /> }],
        onClick: handleCopy,
      }}
    >
      <div
        style={{
          position: 'fixed',
          left: menuPos.x,
          top: menuPos.y,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      />
    </Dropdown>
  );
}
