import Parser from "rss-parser";
import type { NewsSignal } from "../types";
import { enrichFromText } from "./enrich";

/** Public feeds. This is the live scrape: we pull headlines, then keep only the ones that touch a holding or a tax rule. */
const FEEDS = [
  {
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US",
    label: "Yahoo Finance · S&P 500",
  },
  {
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    label: "CNBC",
  },
  {
    url: "https://news.google.com/rss/search?q=Federal+Reserve+interest+rates+OR+Treasury+yields&hl=en-US&gl=US&ceid=US:en",
    label: "Rates",
  },
  {
    url: "https://news.google.com/rss/search?q=Nvidia+OR+semiconductor+OR+%22technology+stocks%22&hl=en-US&gl=US&ceid=US:en",
    label: "Technology",
  },
  {
    url: "https://news.google.com/rss/search?q=tariff+OR+%22high+yield%22+OR+%22emerging+markets%22+OR+oil+price&hl=en-US&gl=US&ceid=US:en",
    label: "Trade, credit, energy",
  },
  {
    url: "https://news.google.com/rss/search?q=IRS+tax+brackets+OR+%22Social+Security%22+wage+base&hl=en-US&gl=US&ceid=US:en",
    label: "Tax and Social Security",
  },
];

export interface FeedResult {
  label: string;
  ok: boolean;
  count: number;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function readFeed(feed: (typeof FEEDS)[number]): Promise<{ feed: FeedResult; signals: NewsSignal[] }> {
  const parser = new Parser({
    timeout: 1800,
    headers: { "User-Agent": "SherpasHackathonNewsTracker/1.0" },
  });
  try {
    const result = await withTimeout(parser.parseURL(feed.url), 2000);
    const signals: NewsSignal[] = [];
    for (const item of result.items.slice(0, 5)) {
      const headline = item.title?.trim();
      if (!headline) continue;
      const body =
        item.contentSnippet?.trim() ||
        item.content?.replace(/<[^>]+>/g, " ").trim() ||
        headline;
      const date = item.isoDate
        ? item.isoDate.slice(0, 10)
        : item.pubDate
          ? new Date(item.pubDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
      signals.push(
        enrichFromText(headline, body.slice(0, 600), {
          id: `rss-${slugify(headline)}-${date}`,
          date,
          source: "rss",
          sources: item.link ? [item.link, feed.label] : [feed.label],
        }),
      );
    }
    return { feed: { label: feed.label, ok: true, count: signals.length }, signals };
  } catch {
    return { feed: { label: feed.label, ok: false, count: 0 }, signals: [] };
  }
}

export async function fetchRssSignals(limit = 24): Promise<{
  signals: NewsSignal[];
  feeds: FeedResult[];
}> {
  const batches = await Promise.all(FEEDS.map((feed) => readFeed(feed)));
  const collected: NewsSignal[] = [];
  const feeds: FeedResult[] = [];
  const seen = new Set<string>();

  for (const batch of batches) {
    feeds.push(batch.feed);
    for (const signal of batch.signals) {
      const key = signal.headline.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(signal);
    }
  }

  return { signals: collected.slice(0, limit), feeds };
}
