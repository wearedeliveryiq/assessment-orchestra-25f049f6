import { createFileRoute } from "@tanstack/react-router";

import { PlatformShell } from "@/components/shell/platform-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePreferences } from "@/hooks/use-preferences";
import { formatDate, formatNumber } from "@/lib/shell/preferences";
import type { UserPreferences } from "@/lib/shell/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Preferences — DeliveryIQ" },
      {
        name: "description",
        content: "Set your DeliveryIQ theme, language, timezone, formats and accessibility preferences.",
      },
      { property: "og:title", content: "Preferences — DeliveryIQ" },
      {
        property: "og:description",
        content: "Theme, language, timezone, formats and accessibility preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

const OPTIONS = {
  theme: [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "system", label: "Match system" },
  ],
  language: [
    { value: "en-GB", label: "English (UK)" },
    { value: "en-US", label: "English (US)" },
    { value: "fr-FR", label: "Français" },
    { value: "de-DE", label: "Deutsch" },
  ],
  timezone: [
    { value: "Europe/London", label: "London" },
    { value: "Europe/Paris", label: "Paris" },
    { value: "America/New_York", label: "New York" },
    { value: "Asia/Singapore", label: "Singapore" },
    { value: "Australia/Sydney", label: "Sydney" },
  ],
  dateFormat: [
    { value: "dd MMM yyyy", label: "05 Mar 2026" },
    { value: "dd/MM/yyyy", label: "05/03/2026" },
    { value: "MM/dd/yyyy", label: "03/05/2026" },
    { value: "yyyy-MM-dd", label: "2026-03-05" },
  ],
  numberFormat: [
    { value: "en-GB", label: "1,234.56" },
    { value: "de-DE", label: "1.234,56" },
    { value: "fr-FR", label: "1 234,56" },
  ],
  density: [
    { value: "comfortable", label: "Comfortable" },
    { value: "compact", label: "Compact" },
  ],
};

function SettingsPage() {
  const { preferences, update, isSaving } = usePreferences();

  const field = (
    key: keyof UserPreferences,
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pref-${key}`}>{label}</Label>
      <Select
        value={String(preferences[key] ?? "")}
        onValueChange={(value) => void update({ [key]: value } as Partial<UserPreferences>)}
      >
        <SelectTrigger id={`pref-${key}`} className="min-h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const toggle = (key: keyof UserPreferences, label: string, description: string) => (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <Label htmlFor={`pref-${key}`} className="text-sm">
          {label}
        </Label>
        <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={`pref-${key}`}
        checked={Boolean(preferences[key])}
        onCheckedChange={(checked) => void update({ [key]: checked } as Partial<UserPreferences>)}
      />
    </div>
  );

  return (
    <PlatformShell
      title="Preferences"
      description={isSaving ? "Saving…" : "Applied across every DeliveryIQ module"}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-h3">Appearance</CardTitle>
            <CardDescription>Theme and layout density for this account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {field("theme", "Theme", OPTIONS.theme)}
            {field("density", "Density", OPTIONS.density)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-h3">Locale & formats</CardTitle>
            <CardDescription>
              Preview: {formatDate(new Date(), preferences)} · {formatNumber(1234.56, preferences, {
                minimumFractionDigits: 2,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {field("language", "Language", OPTIONS.language)}
            {field("timezone", "Timezone", OPTIONS.timezone)}
            {field("dateFormat", "Date format", OPTIONS.dateFormat)}
            {field("numberFormat", "Number format", OPTIONS.numberFormat)}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-h3">Accessibility</CardTitle>
            <CardDescription>These settings apply immediately across the shell.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 py-0">
            {toggle("reducedMotion", "Reduce motion", "Disable non-essential animation and transitions.")}
            {toggle("highContrast", "High contrast", "Increase border and text contrast throughout the UI.")}
            {toggle("sidebarCollapsed", "Collapse navigation", "Start with the left navigation in icon mode.")}
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}
