import Parser from "rss-parser";
import type { NewsSignal } from "../types";
import { enrichFromText } from "./enrich";

const FEEDS = [
  {
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US",
    label: "Yahoo Finance",
  },
  {
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    label: "CNBC Top News",
  },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function fetchRssSignals(limit = 8): Promise<NewsSignal[]> {
  const parser = new Parser({
    timeout: 8000,
    headers: { "User-Agent": "SherpasHackathonNewsTracker/1.0" },
  });

  const collected: NewsSignal[] = [];
  const seen = new Set<string>();

  for (const feed of FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);
      for (const item of result.items.slice(0, 6)) {
        const headline = item.title?.trim();
        if (!headline) continue;
        const key = headline.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const body =
          item.contentSnippet?.trim() ||
          item.content?.replace(/<[^>]+>/g, " ").trim() ||
          headline;
        const date = item.isoDate
          ? item.isoDate.slice(0, 10)
          : item.pubDate
            ? new Date(item.pubDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

        collected.push(
          enrichFromText(headline, body.slice(0, 600), {
            id: `rss-${slugify(headline)}-${date}`,
            date,
            source: "rss",
            sources: item.link ? [item.link, feed.label] : [feed.label],
          }),
        );
      }
    } catch {
      // Feed may be blocked; continue with others / replay fallback
    }
  }

  return collected.slice(0, limit);
}
