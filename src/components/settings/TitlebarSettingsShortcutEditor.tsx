import { useMemo } from 'react';
import { Empty, theme } from 'antd';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { BuiltinSettingsSidebarItemId } from '@/types';
import { SETTINGS_SECTION_ICONS } from './settingsSectionMeta';

interface ShortcutOption {
  id: BuiltinSettingsSidebarItemId;
  label: string;
}

interface TitlebarSettingsShortcutEditorProps {
  description: string;
  allTitle: string;
  orderTitle: string;
  selectedLabel: string;
  allOptions: ShortcutOption[];
  selectedIds: BuiltinSettingsSidebarItemId[];
  onToggle: (id: BuiltinSettingsSidebarItemId) => void;
  onReorder: (ids: BuiltinSettingsSidebarItemId[]) => void;
}

function SortableSelectedChip({
  id,
  label,
}: {
  id: BuiltinSettingsSidebarItemId;
  label: string;
}) {
  const { token } = theme.useToken();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        borderRadius: 999,
        backgroundColor: token.colorPrimaryBg,
        border: `1px solid ${token.colorPrimaryBorder}`,
        color: token.colorText,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          backgroundColor: token.colorBgContainer,
          color: token.colorPrimary,
          flex: 'none',
        }}
      >
        {SETTINGS_SECTION_ICONS[id]}
      </span>
      <span style={{ fontSize: 13 }}>{label}</span>
      <button
        type="button"
        aria-label={`drag-${id}`}
        {...attributes}
        {...listeners}
        style={{
          width: 20,
          height: 20,
          border: 'none',
          background: 'transparent',
          color: token.colorTextTertiary,
          cursor: 'grab',
          padding: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <GripVertical size={14} />
      </button>
    </div>
  );
}

export function TitlebarSettingsShortcutEditor({
  description,
  allTitle,
  orderTitle,
  selectedLabel,
  allOptions,
  selectedIds,
  onToggle,
  onReorder,
}: TitlebarSettingsShortcutEditorProps) {
  const { token } = theme.useToken();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedOptions = allOptions.filter((option) => selectedSet.has(option.id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = selectedIds.indexOf(active.id as BuiltinSettingsSidebarItemId);
    const newIndex = selectedIds.indexOf(over.id as BuiltinSettingsSidebarItemId);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(selectedIds, oldIndex, newIndex));
  };

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 18,
        padding: 16,
        backgroundColor: token.colorBgContainer,
      }}
    >
      <div style={{ fontSize: 13, color: token.colorTextSecondary }}>{description}</div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: token.colorTextSecondary, marginBottom: 10 }}>
          {allTitle}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {allOptions.map((option) => {
            const selected = selectedSet.has(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: `1px solid ${selected ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                  backgroundColor: selected ? token.colorPrimaryBg : token.colorBgLayout,
                  color: selected ? token.colorText : token.colorTextSecondary,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: token.colorBgContainer,
                    color: selected ? token.colorPrimary : token.colorTextSecondary,
                    flex: 'none',
                  }}
                >
                  {SETTINGS_SECTION_ICONS[option.id]}
                </span>
                <span style={{ fontSize: 13 }}>{option.label}</span>
                {selected ? (
                  <span style={{ fontSize: 11, color: token.colorPrimary }}>{selectedLabel}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px dashed ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: token.colorTextSecondary, marginBottom: 10 }}>
          {orderTitle}
        </div>
        {selectedOptions.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={selectedIds} strategy={horizontalListSortingStrategy}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {selectedOptions.map((option) => (
                  <SortableSelectedChip key={option.id} id={option.id} label={option.label} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
        )}
      </div>
    </div>
  );
}
