"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "./brand";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/guia-inss-de-obra", label: "Guia INSS de Obra" },
  { href: "/artigos", label: "Artigos" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export function HeaderNavigation({ whatsAppUrl }: { whatsAppUrl: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="site-container flex min-h-[75px] items-center justify-between gap-5 py-3">
        <Brand />

        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="Principal"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-sm font-medium text-foreground transition-colors hover:text-primary hover:no-underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hidden rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground shadow-soft transition hover:no-underline hover:brightness-95 lg:inline-flex"
        >
          Fale conosco
        </a>

        <button
          type="button"
          className="grid size-11 place-items-center rounded-lg text-foreground lg:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
          <span aria-hidden="true" className="relative block h-5 w-6">
            <span
              className={`absolute left-0 top-0 h-0.5 w-6 bg-current transition ${open ? "translate-y-[9px] rotate-45" : ""}`}
            />
            <span
              className={`absolute left-0 top-[9px] h-0.5 w-6 bg-current transition ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute bottom-0 left-0 h-0.5 w-6 bg-current transition ${open ? "-translate-y-[9px] -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-x-0 top-[75px] z-50 min-h-[calc(100vh-75px)] bg-slate-950/25 lg:hidden">
          <nav
            id="mobile-navigation"
            aria-label="Principal para dispositivos móveis"
            className="ml-auto flex min-h-[calc(100vh-75px)] w-[min(88vw,360px)] flex-col gap-1 border-l border-border bg-white p-6 shadow-2xl"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold text-foreground hover:bg-secondary hover:no-underline"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 rounded-full bg-accent px-5 py-3 text-center font-bold text-accent-foreground shadow-soft hover:no-underline hover:brightness-95"
              onClick={() => setOpen(false)}
            >
              Fale conosco
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
