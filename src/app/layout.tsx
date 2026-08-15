import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            gtag('config', '${ga4Id}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
