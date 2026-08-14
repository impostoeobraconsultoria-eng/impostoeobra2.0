import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  async redirects() {
    const articleSlugs = [
      "artigo-notificacao-inss-obra",
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
