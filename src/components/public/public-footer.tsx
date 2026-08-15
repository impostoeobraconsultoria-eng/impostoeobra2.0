import Image from "next/image";
import Link from "next/link";

import { getSiteConfig } from "@/lib/site-config";

export async function PublicFooter() {
  const config = await getSiteConfig();

  return (
    <footer className="bg-text text-white">
      <div className="site-container">
        <div className="flex flex-col justify-between gap-8 border-b border-white/20 py-9 md:flex-row md:items-center">
          <Image
            alt="Imposto & Obra Consultoria"
            height={44}
            src="/logo/logo-horizontal-negativo.svg"
            width={164}
          />
          <nav
            aria-label="Links do rodapé"
            className="flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold"
          >
            <Link className="hover:text-[#7EC0F0]" href="/guia-inss-de-obra">
              Guia INSS de obra
            </Link>
            <Link className="hover:text-[#7EC0F0]" href="/artigos">
              Artigos
            </Link>
            <Link className="hover:text-[#7EC0F0]" href="/sobre">
              Sobre
            </Link>
            <Link
              className="hover:text-[#7EC0F0]"
              href="/politica/aviso-de-privacidade"
            >
              Aviso de privacidade
            </Link>
          </nav>
        </div>
        <div className="flex flex-col justify-between gap-2 py-5 text-[11px] text-white/70 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Imposto &amp; Obra Consultoria. Todos
            os direitos reservados.
          </p>
          {config.empresa_cnpj && <p>CNPJ {config.empresa_cnpj}</p>}
        </div>
      </div>
    </footer>
  );
}
