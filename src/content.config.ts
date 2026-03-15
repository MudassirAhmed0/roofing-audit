import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    lastModified: z.coerce.date().optional(),
    readTime: z.string(),
    cover: z.string(),
  }),
});

export const collections = { blog };
