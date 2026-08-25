import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['talk', 'podcast', 'press', 'reflection', 'award', 'publication', 'note']),
    summary: z.string().optional(),
    external: z.string().url().optional(),
    venue: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
