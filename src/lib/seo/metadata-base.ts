const PRODUCTION_URL = "https://impostoeobra.com.br";
const LOCAL_URL = "http://localhost:3000";

export function getMetadataBase() {
  if (process.env.VERCEL_ENV === "production") {
    return new URL(PRODUCTION_URL);
  }

  if (
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_BRANCH_URL
  ) {
    return new URL(`https://${process.env.VERCEL_BRANCH_URL}`);
  }

  return new URL(LOCAL_URL);
}
