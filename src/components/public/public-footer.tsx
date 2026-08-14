import Link from "next/link";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export function PublicFooter() {
  return (
    <footer className="border-t border-border py-7 text-[13px] text-muted-foreground">
      <div className="site-container flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <p>
          © {new Date().getFullYear()} – Imposto&amp;Obra Consultoria. Todos os
          direitos reservados.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href="/politica/aviso-de-privacidade"
            className="text-muted-foreground hover:text-primary"
          >
            Aviso de Privacidade
          </Link>
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent px-4 py-2 font-bold text-accent-foreground hover:no-underline hover:brightness-95"
          >
            Fale conosco
          </a>
        </div>
      </div>
    </footer>
  );
}
