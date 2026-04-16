import { App } from 'antd';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderDetail } from '../ProviderDetail';

const toggleProvider = vi.fn();
const updateProvider = vi.fn();
const deleteProvider = vi.fn();
const addProviderKey = vi.fn();
const deleteProviderKey = vi.fn();
const toggleProviderKey = vi.fn();
const validateProviderKey = vi.fn();
const toggleModel = vi.fn();
const updateModelParams = vi.fn();
const fetchRemoteModels = vi.fn();
const saveModels = vi.fn();
const testModel = vi.fn();
const setSelectedProviderId = vi.fn();

let provider = {
  id: 'provider-1',
  name: 'OpenAI',
  provider_type: 'openai',
  api_host: 'https://api.openai.com',
  api_path: '/v1/chat/completions',
  enabled: true,
  models: [
    {
      provider_id: 'provider-1',
      model_id: 'gpt-5.4',
      name: 'GPT 5.4',
      group_name: 'gpt-5.4',
      model_type: 'Chat',
      capabilities: ['TextChat'],
      max_tokens: null,
      enabled: true,
      param_overrides: null,
    },
  ],
  keys: [],
  proxy_config: null,
  sort_order: 0,
  created_at: 0,
  updated_at: 0,
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

vi.mock('@lobehub/icons', () => ({
  ProviderIcon: () => <div>provider-icon</div>,
  ModelIcon: () => <div>model-icon</div>,
}));

vi.mock('../IconPickerModal', () => ({
  default: () => null,
}));

vi.mock('@/stores', () => ({
  useProviderStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      providers: [provider],
      toggleProvider,
      updateProvider,
      deleteProvider,
      addProviderKey,
      deleteProviderKey,
      toggleProviderKey,
      validateProviderKey,
      toggleModel,
      updateModelParams,
      fetchRemoteModels,
      saveModels,
      testModel,
    }),
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      setSelectedProviderId,
    }),
}));

describe('ProviderDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    provider = {
      id: 'provider-1',
      name: 'OpenAI',
      provider_type: 'openai',
      api_host: 'https://api.openai.com',
      api_path: '/v1/chat/completions',
      enabled: true,
      models: [
        {
          provider_id: 'provider-1',
          model_id: 'gpt-5.4',
          name: 'GPT 5.4',
          group_name: 'gpt-5.4',
          model_type: 'Chat',
          capabilities: ['TextChat'],
          max_tokens: null,
          enabled: true,
          param_overrides: null,
        },
      ],
      keys: [],
      proxy_config: null,
      sort_order: 0,
      created_at: 0,
      updated_at: 0,
    };
    saveModels.mockResolvedValue(undefined);
    testModel.mockReset();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('adds a model from the card-level action and derives the default group from the model id', async () => {
    render(
      <App>
        <ProviderDetail providerId="provider-1" />
      </App>,
    );

    await userEvent.click(screen.getByRole('button', { name: '添加模型' }));

    const dialog = await screen.findByRole('dialog');
    const inputs = within(dialog).getAllByRole('textbox');
    await userEvent.type(inputs[0], 'gpt-5.4-think');
    await userEvent.type(inputs[1], 'GPT 5.4 Think');

    await userEvent.click(within(dialog).getByRole('button', { name: '添加模型' }));

    expect(saveModels).toHaveBeenCalledWith(
      'provider-1',
      expect.arrayContaining([
        expect.objectContaining({
          model_id: 'gpt-5.4-think',
          name: 'GPT 5.4 Think',
          group_name: 'gpt-5.4',
          model_type: 'Chat',
        }),
      ]),
    );
  });

  it('prefills the current group when adding a model from a group header', async () => {
    render(
      <App>
        <ProviderDetail providerId="provider-1" />
      </App>,
    );

    await userEvent.click(screen.getByRole('button', { name: '添加到当前分组' }));

    const dialog = await screen.findByRole('dialog');
    const inputs = within(dialog).getAllByRole('textbox');
    expect(inputs[2]).toHaveValue('gpt-5.4');
  });

  it('submits an optional remark when adding a provider key', async () => {
    render(
      <App>
        <ProviderDetail providerId="provider-1" />
      </App>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'settings.addKey' }));

    const dialog = await screen.findByRole('dialog');
    const inputs = within(dialog).getAllByRole('textbox');
    await userEvent.type(inputs[0], 'sk-live-key');
    await userEvent.type(inputs[1], 'Primary key');

    await userEvent.click(within(dialog).getByRole('button', { name: 'common.confirm' }));

    expect(addProviderKey).toHaveBeenCalledWith('provider-1', 'sk-live-key', 'Primary key');
  });

  it('renders a saved provider key remark in the key list', () => {
    provider.keys = [
      {
        id: 'key-1',
        provider_id: 'provider-1',
        key_encrypted: 'enc',
        key_prefix: 'sk-1234...',
        enabled: true,
        last_validated_at: null,
        last_error: null,
        rotation_index: 0,
        remark: '备用 Key',
        created_at: 0,
      },
    ];

    render(
      <App>
        <ProviderDetail providerId="provider-1" />
      </App>,
    );

    expect(screen.getByText('备用 Key')).toBeInTheDocument();
  });

  it('selects all filtered models in batch mode', async () => {
    provider.models = [
      {
        provider_id: 'provider-1',
        model_id: 'gpt-5.4',
        name: 'GPT 5.4',
        group_name: 'gpt',
        model_type: 'Chat',
        capabilities: ['TextChat'],
        max_tokens: null,
        enabled: true,
        param_overrides: null,
      },
      {
        provider_id: 'provider-1',
        model_id: 'claude-3-7',
        name: 'Claude 3.7',
        group_name: 'claude',
        model_type: 'Chat',
        capabilities: ['TextChat'],
        max_tokens: null,
        enabled: true,
        param_overrides: null,
      },
    ];

    render(
      <App>
        <ProviderDetail providerId="provider-1" />
      </App>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'settings.batchEditMode' }));
    await userEvent.click(screen.getByRole('button', { name: 'settings.searchModels' }));
    await userEvent.type(screen.getByRole('textbox'), 'gpt');
    await userEvent.click(screen.getByRole('button', { name: 'common.selectAll' }));

    expect(screen.getByText('settings.batchSelected')).toBeInTheDocument();
  });

  it('deletes only models whose latest test result failed', async () => {
    provider.models = [
      {
        provider_id: 'provider-1',
        model_id: 'gpt-5.4',
        name: 'GPT 5.4',
        group_name: 'gpt',
        model_type: 'Chat',
        capabilities: ['TextChat'],
        max_tokens: null,
        enabled: true,
        param_overrides: null,
      },
      {
        provider_id: 'provider-1',
        model_id: 'bad-model',
        name: 'Bad Model',
        group_name: 'bad',
        model_type: 'Chat',
        capabilities: ['TextChat'],
        max_tokens: null,
        enabled: true,
        param_overrides: null,
      },
    ];
    testModel.mockResolvedValueOnce(1000).mockRejectedValueOnce(new Error('boom'));

    render(
      <App>
        <ProviderDetail providerId="provider-1" />
      </App>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'settings.testModels' }));
    await userEvent.click(await screen.findByText('settings.testAllModels'));
    await screen.findByText('common.failed');
    await userEvent.click(screen.getByRole('button', { name: 'settings.deleteFailedModels' }));
    await userEvent.click(screen.getByRole('button', { name: 'common.confirm' }));

    expect(saveModels).toHaveBeenCalledWith(
      'provider-1',
      expect.not.arrayContaining([
        expect.objectContaining({
          model_id: 'bad-model',
        }),
      ]),
    );
  });
});
