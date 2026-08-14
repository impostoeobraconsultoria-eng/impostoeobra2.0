import Link from "next/link";
import type { ReactNode } from "react";

type InstitutionalPageProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function InstitutionalPage({
  eyebrow,
  title,
  children,
}: InstitutionalPageProps) {
  return (
    <main className="py-14 sm:py-16">
      <div className="site-container">
        <article className="institutional-content mx-auto max-w-[800px]">
          <Link
            className="mb-6 inline-block text-sm font-medium text-slate-500 hover:text-primary"
            href="/"
          >
            ← Página inicial
          </Link>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {eyebrow}
          </p>
          <h1 className="mb-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[42px]">
            {title}
          </h1>
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
}: {
  title: string;
  highlight: string;
  description: string;
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <section className="my-10 rounded-[14px] bg-slate-50 px-6 py-10 text-center sm:px-8 sm:py-12">
      <h2 className="!mt-0 !text-[28px] !font-extrabold">{title}</h2>
      <p className="!mb-1 !font-semibold !text-primary">{highlight}</p>
      <p className="!mb-6 !text-base">{description}</p>
      <a
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 py-3 text-[15px] font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:brightness-105"
        href={href}
        rel={external ? "noopener noreferrer" : undefined}
        target={external ? "_blank" : undefined}
      >
        {label}
      </a>
    </section>
  );
}
