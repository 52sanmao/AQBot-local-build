import {
  ArrowLeft,
  Bot,
  Cloud,
  CloudUpload,
  Database,
  Globe,
  HardDrive,
  Info,
  MessageSquare,
  Palette,
  Plug,
  Search,
  Settings,
  Zap,
} from 'lucide-react';
import type { SettingsSection } from '@/types';

export const SETTINGS_SECTION_ICONS: Record<SettingsSection, React.ReactNode> = {
  providers: <Cloud size={16} />,
  conversationSettings: <MessageSquare size={16} />,
  defaultModel: <Bot size={16} />,
  general: <Settings size={16} />,
  display: <Palette size={16} />,
  proxy: <Globe size={16} />,
  shortcuts: <Zap size={16} />,
  data: <Database size={16} />,
  storage: <HardDrive size={16} />,
  about: <Info size={16} />,
  searchProviders: <Search size={16} />,
  mcpServers: <Plug size={16} />,
  backup: <CloudUpload size={16} />,
};

export const SETTINGS_BACK_ICON = <ArrowLeft size={16} />;
