// Public base URL used to build absolute share links for blog posts. Overridable
// per environment; falls back to the production deployment.
export const BLOG_SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dhaga-web.vercel.app";
