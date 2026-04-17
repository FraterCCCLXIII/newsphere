import { AppSettingsSection } from "@/components/settings/app-settings-section";

export function SettingsAppPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        App
      </h1>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <AppSettingsSection className="p-0" />
      </div>
    </div>
  );
}
