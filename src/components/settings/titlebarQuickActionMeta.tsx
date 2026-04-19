import {
  ArrowDownCircle,
  CloudUpload,
  Globe,
  Github,
  Monitor,
  Pin,
  RotateCcw,
  Settings,
} from 'lucide-react';
import type { BuiltinTitlebarActionId } from '@/types';

export const TITLEBAR_ACTION_ICONS: Record<BuiltinTitlebarActionId, React.ReactNode> = {
  pin: <Pin size={16} />,
  theme: <Monitor size={16} />,
  language: <Globe size={16} />,
  backup: <CloudUpload size={16} />,
  github: <Github size={16} />,
  update: <ArrowDownCircle size={16} />,
  reload: <RotateCcw size={16} />,
  settings: <Settings size={16} />,
};

export const TITLEBAR_ACTION_LABEL_KEYS: Record<BuiltinTitlebarActionId, string> = {
  pin: 'desktop.alwaysOnTop',
  theme: 'settings.theme',
  language: 'settings.language',
  backup: 'titlebar.quickBackup',
  github: 'GitHub',
  update: 'settings.checkUpdate',
  reload: 'desktop.reloadPage',
  settings: 'settings.openSettings',
};
