import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    // O PDFKit carrega as métricas das fontes padrão dinamicamente. A análise
    // estática do Next não detecta esses arquivos, então eles precisam entrar
    // explicitamente nas funções que geram diagnósticos na Vercel.
    outputFileTracingIncludes: {
      "/api/leads": [
        "./node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/standard-fonts/**/*",
      ],
      "/api/diagnosticos/*": [
        "./node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/standard-fonts/**/*",
      ],
    },
  },
  async redirects() {
    const articleSlugs = [
      "artigo-regularizar-inss-obra",
      "custo-regularizar-inss-obra",
      "afericao-indireta-receita",
      "cobranca-inss-obra-alta",
      "erro-cno-receita",
      "erro-sero",
      "erros-aumentam-inss-obra",
      "documentos-regularizacao-obra",
      "consultar-pendencias-obra",
    ];

    return [
      {
        source: "/artigos/artigo-notificacao-inss-obra.html",
        destination: "/artigos/aviso-regularizacao-obra-receita-federal",
        statusCode: 301,
      },
      {
        source: "/artigos/artigo-notificacao-inss-obra",
        destination: "/artigos/aviso-regularizacao-obra-receita-federal",
        statusCode: 301,
      },
      {
        source: "/politica/aviso-de-privacidade.html",
        destination: "/politica/aviso-de-privacidade",
        statusCode: 301,
      },
      ...articleSlugs.map((slug) => ({
        source: `/artigos/${slug}.html`,
        destination: `/artigos/${slug}`,
        statusCode: 301,
      })),
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
