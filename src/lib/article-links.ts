const SITE_HOSTNAME = "impostoeobra.com.br";

export function isInternalArticleLink(href: string) {
  const value = href.trim();
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.startsWith("#") || value.startsWith("?")) return true;

  try {
    const url = new URL(value, `https://${SITE_HOSTNAME}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return true;
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    return hostname === SITE_HOSTNAME || hostname.endsWith(`.${SITE_HOSTNAME}`);
  } catch {
    return true;
  }
}

export function articleLinkAttributes(href: string) {
  return isInternalArticleLink(href)
    ? { target: null, rel: null }
    : { target: "_blank", rel: "noopener noreferrer" };
}
