import type { ReactNode } from "react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { BackgroundLines } from "@/components/background-lines";

export function LegalPage({

  title,
  intro,
  children,
  jsonLd,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <BackgroundLines />
      {jsonLd && (

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <LandingNav />
      <main className="px-5 sm:px-6 py-14">
        <article className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>
          {intro && (
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">{intro}</p>
          )}
          <div className="mt-10 space-y-6 text-sm leading-7 text-foreground/90 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-2 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:text-muted-foreground [&_li]:my-1">
            {children}
          </div>
          <p className="mt-12 text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
