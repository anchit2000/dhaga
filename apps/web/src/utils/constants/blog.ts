import { SITE_URL } from "@/utils/constants/site";

// Public base URL used to build absolute share links for blog posts. Kept as a
// named export for the blog route; delegates to the site-wide canonical const
// so there's a single source of truth for the production URL.
export const BLOG_SITE_URL: string = SITE_URL;
