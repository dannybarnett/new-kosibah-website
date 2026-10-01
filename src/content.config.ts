import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content lives in src/content/<type>/<slug>.md with frontmatter.
 * Images are referenced relative to the markdown file and optimised by Astro.
 * Keystatic can be layered over these same files later.
 */

const gownCollections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/collections' }),
  schema: z.object({
    name: z.string(),
    /** Short label shown right-aligned in the collection list, e.g. "Couture · 20th year" */
    label: z.string(),
    kind: z.enum(['couture', 'ready-to-wear', 'made-to-measure', 'mother-of-the-bride']),
    order: z.number().default(99),
  }),
});

const gowns = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gowns' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      collection: reference('collections'),
      /** Gallery filter. Mother of the Bride gowns are couture but filtered separately. */
      line: z.enum(['couture', 'asheyori-eji', 'mother-of-the-bride']),
      /** Style number for Asheyori Eji, e.g. "2201" */
      styleNumber: z.string().optional(),
      fabric: z.string().optional(),
      silhouette: z.string().optional(),
      made: z.string().default('To order, to your measurements'),
      images: z
        .array(z.object({ src: image(), alt: z.string(), angle: z.string().optional() }))
        .min(1),
      featured: z.boolean().default(false),
      order: z.number().default(99),
    }),
});

const brides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/brides' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      venue: z.string(),
      /** Short place label for cards, e.g. "Lake Como" */
      place: z.string(),
      line: z.enum(['couture', 'asheyori-eji', 'mother-of-the-bride']).default('couture'),
      quote: z.string().optional(),
      photographer: z.string().optional(),
      year: z.number().optional(),
      images: z.array(z.object({ src: image(), alt: z.string() })).min(1),
      featured: z.boolean().default(false),
      order: z.number().default(99),
    }),
});

const press = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/press' }),
  schema: z.object({
    outlet: z.string(),
    title: z.string(),
    url: z.string().url().optional(),
    date: z.coerce.date().optional(),
    order: z.number().default(99),
  }),
});

export const collections = { collections: gownCollections, gowns, brides, press };
