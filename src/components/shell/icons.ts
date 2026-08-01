import {
  Bell,
  Bot,
  ClipboardList,
  FileText,
  Gauge,
  Github,
  Home,
  Layers,
  Package,
  Shield,
  Sparkles,
  Store,
  Target,
  Wand2,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon registry. Navigation data references icons by key so it stays
 * serialisable (and servable from `/api/navigation`).
 */
const ICONS: Record<string, LucideIcon> = {
  home: Home,
  layers: Layers,
  package: Package,
  clipboard: ClipboardList,
  gauge: Gauge,
  "file-text": FileText,
  bell: Bell,
  target: Target,
  bot: Bot,
  store: Store,
  wand: Wand2,
  shield: Shield,
  github: Github,
};

export function navIcon(key: string): LucideIcon {
  return ICONS[key] ?? Sparkles;
}
