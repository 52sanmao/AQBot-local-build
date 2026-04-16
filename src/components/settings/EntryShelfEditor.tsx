import { useMemo, useState } from 'react';
import { Button, Empty, Space, theme } from 'antd';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export interface EntryShelfItem {
  key: string;
  label: string;
  description?: string;
  badge?: string;
}

interface EntryShelfEditorProps {
  availableTitle: string;
  selectedTitle: string;
  addLabel: string;
  removeLabel: string;
  availableItems: EntryShelfItem[];
  selectedItems: EntryShelfItem[];
  onAdd: (key: string) => void;
  onRemove: (key: string) => void;
  onReorder: (keys: string[]) => void;
}

function SortableShelfRow({
  item,
  selected,
  onClick,
}: {
  item: EntryShelfItem;
  selected: boolean;
  onClick: () => void;
}) {
  const { token } = theme.useToken();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        border: `1px solid ${selected ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
        backgroundColor: selected ? token.colorPrimaryBg : token.colorBgContainer,
        cursor: 'pointer',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
      }}
    >
      <button
        type="button"
        aria-label={`drag-${item.key}`}
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          border: 'none',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: token.colorFillTertiary,
          color: token.colorTextSecondary,
          cursor: 'grab',
          flex: 'none',
        }}
      >
        <GripVertical size={16} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
        {item.description ? (
          <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 2 }}>{item.description}</div>
        ) : null}
      </div>
      {item.badge ? (
        <span
          style={{
            fontSize: 12,
            color: token.colorPrimary,
            backgroundColor: token.colorPrimaryBg,
            borderRadius: 999,
            padding: '4px 8px',
            flex: 'none',
          }}
        >
          {item.badge}
        </span>
      ) : null}
    </div>
  );
}

function ShelfRow({
  item,
  selected,
  onClick,
}: {
  item: EntryShelfItem;
  selected: boolean;
  onClick: () => void;
}) {
  const { token } = theme.useToken();

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: 12,
        borderRadius: 14,
        border: `1px solid ${selected ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
        backgroundColor: selected ? token.colorPrimaryBg : token.colorBgContainer,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
          {item.description ? (
            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 2 }}>{item.description}</div>
          ) : null}
        </div>
        {item.badge ? (
          <span
            style={{
              fontSize: 12,
              color: token.colorPrimary,
              backgroundColor: token.colorPrimaryBg,
              borderRadius: 999,
              padding: '4px 8px',
              flex: 'none',
              alignSelf: 'start',
            }}
          >
            {item.badge}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function EntryShelfEditor({
  availableTitle,
  selectedTitle,
  addLabel,
  removeLabel,
  availableItems,
  selectedItems,
  onAdd,
  onRemove,
  onReorder,
}: EntryShelfEditorProps) {
  const { token } = theme.useToken();
  const [activeAvailableKey, setActiveAvailableKey] = useState<string | null>(null);
  const [activeSelectedKey, setActiveSelectedKey] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const selectedKeys = useMemo(() => selectedItems.map((item) => item.key), [selectedItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = selectedKeys.indexOf(String(active.id));
    const newIndex = selectedKeys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(selectedKeys, oldIndex, newIndex));
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 120px minmax(0, 1fr)',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: token.colorTextSecondary, marginBottom: 8 }}>
          {availableTitle}
        </div>
        <div
          style={{
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 16,
            padding: 12,
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            backgroundColor: token.colorBgLayout,
          }}
        >
          {availableItems.length > 0 ? availableItems.map((item) => (
            <ShelfRow
              key={item.key}
              item={item}
              selected={activeAvailableKey === item.key}
              onClick={() => {
                setActiveAvailableKey(item.key);
                setActiveSelectedKey(null);
              }}
            />
          )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />}
        </div>
      </div>

      <Space direction="vertical" style={{ width: '100%', justifyContent: 'center' }}>
        <Button
          type="primary"
          disabled={!activeAvailableKey}
          onClick={() => {
            if (!activeAvailableKey) return;
            onAdd(activeAvailableKey);
            setActiveAvailableKey(null);
          }}
        >
          {addLabel}
        </Button>
        <Button
          disabled={!activeSelectedKey}
          onClick={() => {
            if (!activeSelectedKey) return;
            onRemove(activeSelectedKey);
            setActiveSelectedKey(null);
          }}
        >
          {removeLabel}
        </Button>
      </Space>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: token.colorTextSecondary, marginBottom: 8 }}>
          {selectedTitle}
        </div>
        <div
          style={{
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 16,
            padding: 12,
            minHeight: 280,
            backgroundColor: token.colorBgContainer,
          }}
        >
          {selectedItems.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={selectedKeys} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedItems.map((item) => (
                    <SortableShelfRow
                      key={item.key}
                      item={item}
                      selected={activeSelectedKey === item.key}
                      onClick={() => {
                        setActiveSelectedKey(item.key);
                        setActiveAvailableKey(null);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />}
        </div>
      </div>
    </div>
  );
}
