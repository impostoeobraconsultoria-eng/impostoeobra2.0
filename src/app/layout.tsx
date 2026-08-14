import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://impostoeobra.com.br"),
  title: "Imposto & Obra Consultoria",
  description:
    "Consultoria especializada em regularização de INSS de obras de construção civil.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
