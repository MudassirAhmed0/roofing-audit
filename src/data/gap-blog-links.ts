export interface BlogLink {
  slug: string;
  title: string;
}

/** Maps gap slugs to relevant blog posts — populate as blog content is created */
export const gapBlogLinks: Record<string, BlogLink[]> = {};
