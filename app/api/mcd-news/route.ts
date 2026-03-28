import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const revalidate = 1800;

const RSS_URL =
  'https://news.google.com/rss/search?q=Municipal+Corporation+of+Delhi+OR+MCD+Delhi+OR+Delhi+civic&hl=en-IN&gl=IN&ceid=IN:en';

const MAX_ITEMS = 6;

function textFromItem(contentSnippet?: string, content?: string): string {
  const raw = (contentSnippet || content || '').trim();
  if (!raw) return '';
  const noTags = raw.replace(/<[^>]+>/g, ' ');
  return noTags.replace(/\s+/g, ' ').trim().slice(0, 800);
}

function hashId(link: string, index: number): string {
  let h = 0;
  for (let i = 0; i < link.length; i += 1) {
    h = (h << 5) - h + link.charCodeAt(i);
    h |= 0;
  }
  return `mcd-${Math.abs(h)}-${index}`;
}

export async function GET() {
  try {
    const res = await fetch(RSS_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return NextResponse.json({ items: [], error: `News feed HTTP ${res.status}` });
    }

    const xml = await res.text();
    const parser = new Parser();
    const feed = await parser.parseString(xml);

    const items = (feed.items || []).slice(0, MAX_ITEMS).map((item, index) => {
      const link = item.link?.trim() || '';
      const title = (item.title || 'Untitled').trim();
      const description = textFromItem(item.contentSnippet, item.content);
      const pub = item.pubDate ? new Date(item.pubDate) : new Date();
      return {
        id: hashId(link || title, index),
        title,
        description: description || title,
        category: 'MCD / Delhi',
        createdAt: Number.isNaN(pub.getTime()) ? new Date().toISOString() : pub.toISOString(),
        sourceUrl: link,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'RSS parse failed';
    return NextResponse.json({ items: [], error: message });
  }
}
