import Link from "next/link";
import type { ReactNode } from "react";
import { TrackedPublicAnchor } from "@/components/analytics/tracked-anchor";

export function InstitutionalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main>
      <header className="border-b border-border bg-page py-14 sm:py-20">
        <div className="site-container grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Link
              className="text-sm font-semibold text-brandMuted hover:text-primary"
              href="/"
            >
              ← Página inicial
            </Link>
            <p className="editorial-label mt-8">{eyebrow}</p>
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-.045em] text-text sm:text-6xl lg:col-span-9">
            {title}
          </h1>
        </div>
      </header>
      <div className="site-container py-14 sm:py-20">
        <article className="institutional-content mx-auto max-w-[900px]">
          {children}
        </article>
      </div>
    </main>
  );
}

export function FinalCta({
  title,
  highlight,
  description,
  href,
  label,
  external = false,
  analyticsOrigin,
}: {
  title: string;
  highlight: string;
  description: string;
  href: string;
  label: string;
  external?: boolean;
  analyticsOrigin?: string;
}) {
  return (
    <section className="my-14 border-y border-border bg-page px-6 py-12 text-center sm:px-10">
      <p className="editorial-label">{highlight}</p>
      <h2 className="!mt-4 !text-3xl !font-extrabold">{title}</h2>
      <p className="!mx-auto !mb-7 !mt-3 max-w-xl !text-base">{description}</p>
      {analyticsOrigin ? (
        <TrackedPublicAnchor
          kind="whatsapp"
          origem={analyticsOrigin}
          className="btn-primary"
          href={href}
          rel={external ? "noopener noreferrer" : undefined}
          target={external ? "_blank" : undefined}
        >
          {label}
        </TrackedPublicAnchor>
      ) : (
        <a
          className="btn-primary"
          href={href}
          rel={external ? "noopener noreferrer" : undefined}
          target={external ? "_blank" : undefined}
        >
          {label}
        </a>
      )}
    </section>
  );
}
