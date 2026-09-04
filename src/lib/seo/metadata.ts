import type { Metadata } from "next";
import { absoluteUrl, type SeoConfig } from "@/lib/seo/config";

export function pageMetadata(
  config: SeoConfig,
  input: {
    title: string;
    description?: string | null;
    canonical: string;
    image?: string | null;
    type?: "website" | "article";
    publishedTime?: string | null;
    modifiedTime?: string | null;
  },
): Metadata {
  const description = input.description || config.descriptionPadrao;
  const image = absoluteUrl(input.image || config.ogImagePadrao);
  return {
    title: input.title,
    description,
    alternates: { canonical: input.canonical },
    openGraph: {
      type: input.type ?? "website",
      locale: "pt_BR",
      siteName: config.orgNome,
      url: input.canonical,
      title: input.title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      ...(input.type === "article"
        ? {
            publishedTime: input.publishedTime ?? undefined,
            modifiedTime: input.modifiedTime ?? undefined,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: config.twitterHandle || undefined,
      title: input.title,
      description,
      images: [image],
    },
  };
}
