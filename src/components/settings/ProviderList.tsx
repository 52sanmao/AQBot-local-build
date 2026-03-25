import { Button, Input, Modal, Form, Select, Switch, App, theme } from 'antd';
import { Plus, Search, GripVertical, RotateCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useMemo, useState } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProviderStore, useUIStore } from '@/stores';
import { SmartProviderIcon } from '@/lib/providerIcons';
import type { ProviderConfig, ProviderType } from '@/types';

const PROVIDER_TYPE_OPTIONS: { label: string; value: ProviderType }[] = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenAI Responses', value: 'openai_responses' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Gemini', value: 'gemini' },
];

const DEFAULT_HOSTS: Record<ProviderType, string> = {
  openai: 'https://api.openai.com',
  openai_responses: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  custom: '',
};

function SortableProviderItem({
  provider,
  isSelected,
  token,
  onSelect,
  onToggle,
}: {
  provider: ProviderConfig;
  isSelected: boolean;
  token: any;
  onSelect: () => void;
  onToggle: (checked: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: provider.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderRadius: token.borderRadius,
    backgroundColor: isSelected ? token.colorPrimaryBg : undefined,
  };

  const disabled = !provider.enabled;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center cursor-pointer px-3 py-2.5 transition-colors"
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = token.colorFillQuaternary;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '';
        }
      }}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center mr-2 cursor-grab"
        style={{ color: token.colorTextQuaternary }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>
      <div
        className="min-w-0 flex-1 flex items-center gap-2"
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <SmartProviderIcon provider={provider} size={22} type="color" />
        <span style={{ color: isSelected ? token.colorPrimary : undefined }}>{provider.name}</span>
      </div>
      <Switch
        size="small"
        checked={provider.enabled}
        onClick={(_, e) => e.stopPropagation()}
        onChange={onToggle}
      />
    </div>
  );
}

export function ProviderList() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const providers = useProviderStore((s) => s.providers);
  const createProvider = useProviderStore((s) => s.createProvider);
  const toggleProvider = useProviderStore((s) => s.toggleProvider);
  const reorderProviders = useProviderStore((s) => s.reorderProviders);
  const selectedProviderId = useUIStore((s) => s.selectedProviderId);
  const setSelectedProviderId = useUIStore((s) => s.setSelectedProviderId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Auto-select first provider if none selected
  React.useEffect(() => {
    if (!selectedProviderId && providers.length > 0) {
      setSelectedProviderId(providers[0].id);
    }
  }, [selectedProviderId, providers, setSelectedProviderId]);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [form] = Form.useForm();
  const fetchProviders = useProviderStore((s) => s.fetchProviders);

  const filteredProviders = useMemo(
    () =>
      providers.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [providers, search],
  );

  const handleAddProvider = async () => {
    try {
      const values = await form.validateFields();
      const provider = await createProvider({
        name: values.name,
        provider_type: values.provider_type,
        api_host: values.api_host || DEFAULT_HOSTS[values.provider_type as ProviderType],
        enabled: true,
      });
      setSelectedProviderId(provider.id);
      setModalOpen(false);
      form.resetFields();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      message.error(t('error.saveFailed'));
    }
  };

  const handleTypeChange = (type: ProviderType) => {
    form.setFieldValue('api_host', DEFAULT_HOSTS[type]);
  };

  const [initModalOpen, setInitModalOpen] = useState(false);

  const handleInitProviders = async (overwrite: boolean) => {
    setInitLoading(true);
    setInitModalOpen(false);
    try {
      const result = await invoke<{ added: string[]; updated: string[]; skipped: string[] }>(
        'initialize_providers',
        { overwrite },
      );
      await fetchProviders();
      const parts: string[] = [];
      if (result.added.length) parts.push(t('settings.initAdded', { names: result.added.join(', ') }));
      if (result.updated.length) parts.push(t('settings.initUpdated', { names: result.updated.join(', ') }));
      if (result.skipped.length) parts.push(t('settings.initSkipped', { names: result.skipped.join(', ') }));
      message.success(parts.join('；') || t('settings.initNone'));
    } catch (e) {
      message.error(String(e));
    } finally {
      setInitLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 flex items-center gap-2">
        <Input
          prefix={<Search size={14} />}
          placeholder={t('settings.filterProviders')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ flex: 1 }}
        />
        <Button
          type="default"
          icon={<RotateCcw size={16} />}
          onClick={() => setInitModalOpen(true)}
          loading={initLoading}
          style={{ flexShrink: 0 }}
        />
        <Button
          type="default"
          icon={<Plus size={16} />}
          onClick={() => setModalOpen(true)}
          style={{ flexShrink: 0 }}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              const ids = filteredProviders.map((p) => p.id);
              const oldIndex = ids.indexOf(String(active.id));
              const newIndex = ids.indexOf(String(over.id));
              if (oldIndex !== -1 && newIndex !== -1) {
                const newIds = [...ids];
                newIds.splice(oldIndex, 1);
                newIds.splice(newIndex, 0, String(active.id));
                reorderProviders(newIds);
              }
            }
          }}
        >
          <SortableContext
            items={filteredProviders.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredProviders.map((provider) => (
              <SortableProviderItem
                key={provider.id}
                provider={provider}
                isSelected={selectedProviderId === provider.id}
                token={token}
                onSelect={() => setSelectedProviderId(provider.id)}
                onToggle={(checked) => toggleProvider(provider.id, checked)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>


      <Modal
        title={t('settings.addProvider')}
        open={modalOpen}
        mask={{ enabled: true, blur: true }}
        onOk={handleAddProvider}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('settings.providerName')}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="provider_type"
            label={t('settings.providerType')}
            rules={[{ required: true }]}
          >
            <Select options={PROVIDER_TYPE_OPTIONS} onChange={handleTypeChange} />
          </Form.Item>
          <Form.Item name="api_host" label={t('settings.apiHost')}>
            <Input placeholder="https://api.openai.com" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('settings.initProviders')}
        open={initModalOpen}
        onCancel={() => setInitModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setInitModalOpen(false)}>
            {t('common.cancel')}
          </Button>,
          <Button key="add" type="default" onClick={() => handleInitProviders(false)}>
            {t('settings.initAddOnly')}
          </Button>,
          <Button key="overwrite" type="primary" danger onClick={() => handleInitProviders(true)}>
            {t('settings.initOverwrite')}
          </Button>,
        ]}
      >
        <p>{t('settings.initProvidersDesc')}</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>{t('settings.initOverwriteHint')}</p>
      </Modal>
    </div>
  );
}
