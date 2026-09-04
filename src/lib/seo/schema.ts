import { absoluteUrl, SITE_URL, type SeoConfig } from "@/lib/seo/config";

export type SchemaArticle = {
  slug: string;
  titulo: string;
  description: string | null;
  image: string | null;
  datePublished: string | null;
  dateModified: string;
  schemaType: string;
};

export function getSchemaLocalBusiness(config: SeoConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": `${SITE_URL}/#organization`,
    name: config.orgNome,
    description: config.orgDescricao,
    url: `${SITE_URL}/`,
    telephone: config.orgTelefone,
    email: config.orgEmail,
    address: {
      "@type": "PostalAddress",
      addressLocality: config.orgCidade,
      addressRegion: config.orgUf,
      addressCountry: config.orgPais,
    },
    areaServed: config.orgArea,
    openingHours: config.orgHorario,
    image: absoluteUrl(config.ogImagePadrao),
  };
}

export function getSchemaOrganization(config: SeoConfig) {
  const { openingHours: _openingHours, ...organization } =
    getSchemaLocalBusiness(config);
  return { ...organization, "@type": "Organization" };
}

export function getSchemaArticle(article: SchemaArticle, config: SeoConfig) {
  const url = `${SITE_URL}/artigos/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": article.schemaType,
    headline: article.titulo,
    description: article.description,
    image: absoluteUrl(article.image || config.ogImagePadrao),
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: url,
    inLanguage: "pt-BR",
  };
}

export function getSchemaFAQPage(
  faqs: Array<{ pergunta: string; resposta: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: { "@type": "Answer", text: item.resposta },
    })),
  };
}

export function getSchemaBreadcrumb(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function getSchemaWebApplication(
  config: SeoConfig,
  input: { name: string; description: string; url: string },
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    url: absoluteUrl(input.url),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
    description: input.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    provider: { "@id": `${SITE_URL}/#organization` },
  };
}

export function getSchemaCollectionPage(input: {
  name: string;
  description: string;
  url: string;
  numberOfItems?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.url),
    ...(input.numberOfItems == null
      ? {}
      : { numberOfItems: input.numberOfItems }),
  };
}
