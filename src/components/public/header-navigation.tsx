"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

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
    <header className="sticky top-0 z-50 border-b border-border bg-page/95 backdrop-blur-sm">
      <div className="site-container flex min-h-[80px] items-center justify-between gap-7 py-4">
        <Link href="/" aria-label="Imposto & Obra Consultoria - início">
          <Image
            alt="Imposto & Obra Consultoria"
            height={42}
            priority
            src="/logo/logo-horizontal.svg"
            width={154}
          />
        </Link>

        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="Principal"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[13px] font-semibold text-text transition-colors hover:text-primary hover:no-underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hidden bg-primary px-5 py-3 text-[13px] font-bold text-white transition hover:bg-primary-hover hover:no-underline lg:inline-flex"
        >
          Falar no WhatsApp
        </a>

        <button
          type="button"
          className="grid size-11 place-items-center text-text lg:hidden"
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
            className="ml-auto flex min-h-[calc(100vh-75px)] w-[min(88vw,360px)] flex-col gap-1 border-l border-border bg-page p-6"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-border-light px-3 py-3 text-base font-semibold text-text hover:text-primary hover:no-underline"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 bg-primary px-5 py-3 text-center font-bold text-white hover:bg-primary-hover hover:no-underline"
              onClick={() => setOpen(false)}
            >
              Falar no WhatsApp
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
