import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { site } from '~/lib/data';

export async function GET(context: APIContext) {
  const posts = (await getCollection('news', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const siteUrl = context.site ?? new URL('https://michaelides.github.io');

  return rss({
    title: `${site.name} · News`,
    description: `News, talks, press, awards, and brief reflections from ${site.name}.`,
    site: siteUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary || post.data.title,
      link: `/news/${post.id}/`,
      categories: [post.data.type],
    })),
    customData: `<language>en-gb</language>`,
  });
}
