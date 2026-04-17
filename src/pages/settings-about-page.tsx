import { AppMark } from "@/components/icons/app-mark";

export function SettingsAboutPage() {
  const repoUrl = "https://github.com/FraterCCCLXIII/newsphere";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        About
      </h1>

      <section
        className="rounded-lg border border-border bg-card p-6 shadow-sm"
        aria-labelledby="about-app-heading"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-background p-3 shadow-sm"
            aria-hidden
          >
            <AppMark className="size-full max-h-full max-w-full" />
          </div>
          <div className="min-w-0 space-y-3">
            <h2
              id="about-app-heading"
              className="text-lg font-semibold text-foreground"
            >
              Newsphere
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A desktop news reader for RSS and Atom feeds. Organize sources in
              a multi-column grid, switch between pages of topics, and read
              articles in a focused layout.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Built with React, Tauri, and Rust. Feed content and availability
              depend on each publisher&apos;s servers and policies.
            </p>
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border border-border bg-card p-6 shadow-sm"
        aria-labelledby="about-source-heading"
      >
        <h2
          id="about-source-heading"
          className="text-sm font-medium text-foreground"
        >
          Source code
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Report issues, suggest features, or build from source on GitHub.
        </p>
        <p className="mt-4">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex break-all text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {repoUrl}
          </a>
        </p>
      </section>
    </div>
  );
}
