import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Script from "next/script";
import { getSiteConfig } from "@/lib/site-config";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://impostoeobra.com.br";
const ga4Id = "G-8CYR5J0Z3L";

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Imposto & Obra Consultoria",
      template: "%s | Imposto & Obra Consultoria",
    },
    description:
      "Consultoria especializada em regularização de INSS de obras de construção civil.",
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Imposto & Obra Consultoria",
      title: "Imposto & Obra Consultoria",
      description:
        "Consultoria especializada em regularização de INSS de obras de construção civil.",
      images: [
        {
          url: "/og-cover.png",
          width: 1200,
          height: 630,
          alt: "Imposto & Obra Consultoria",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Imposto & Obra Consultoria",
      description:
        "Consultoria especializada em regularização de INSS de obras de construção civil.",
      images: ["/og-cover.png"],
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    },
    manifest: "/site.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();
  const configuredInternalTraffic = config.ga4_traffic_type_internal;
  const internalTraffic = /^[a-zA-Z0-9_-]{1,50}$/.test(
    configuredInternalTraffic,
  )
    ? configuredInternalTraffic
    : "internal";
  return (
    <html className={montserrat.variable} lang="pt-BR">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga4Id}', {
              traffic_type: document.cookie.includes('imposto_obra_internal=true')
                ? ${JSON.stringify(internalTraffic)}
                : 'external'
            });
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
