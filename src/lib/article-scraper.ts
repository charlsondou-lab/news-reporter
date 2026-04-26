import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';

/**
 * Firecrawl response payload (minimal fields we use)
 */
interface FirecrawlResponse {
  success?: boolean;
  data?: {
    markdown?: string;
  };
}

function isVideoLikeUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    return (
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('vimeo.com') ||
      host.includes('bilibili.com')
    );
  } catch {
    return false;
  }
}

/**
 * Try Firecrawl first and return markdown when available.
 */
async function scrapeWithFirecrawl(url: string, timeoutMs: number): Promise<string | null> {
  const isEnabled = process.env.FIRECRAWL_ON === 'true';
  const apiUrl = process.env.FIRECRAWL_API_URL;
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!isEnabled || !apiUrl) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/v1/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || ''}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Scraper] Firecrawl failed for ${url} - ${response.status}`);
      return null;
    }

    const result = (await response.json()) as FirecrawlResponse;
    const markdown = result?.data?.markdown?.trim();
    if (!markdown) return null;

    return markdown;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Scraper] Firecrawl error for ${url}:`, msg);
    return null;
  }
}

/**
 * Fetch and extract main article content.
 * Priority:
 * 1) Firecrawl markdown
 * 2) Readability HTML fallback
 */
export async function scrapeArticle(
  url: string,
  timeoutMs: number = 10000
): Promise<{ content: string; type: 'markdown' | 'html' } | null> {
  if (isVideoLikeUrl(url)) {
    console.info(`[Scraper] Skip readability for video URL: ${url}`);
    return null;
  }

  const firecrawlMarkdown = await scrapeWithFirecrawl(url, timeoutMs);
  if (firecrawlMarkdown) {
    return { content: firecrawlMarkdown, type: 'markdown' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        console.info(`[Scraper] Access blocked for ${url} - Status: ${response.status}`);
      } else {
        console.warn(`[Scraper] Failed to fetch ${url} - Status: ${response.status}`);
      }
      return null;
    }

    const html = await response.text();

    // Silence noisy stylesheet parse errors from third-party pages.
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (err) => {
      if (err.message.includes('Could not parse CSS stylesheet')) {
        return;
      }
      console.warn(`[Scraper] JSDOM warning for ${url}: ${err.message}`);
    });

    // Parse using JSDOM
    const dom = new JSDOM(html, { url, virtualConsole });
    
    // Clean up potential problematic scripts or iframes before Readability
    const doc = dom.window.document;
    const scripts = doc.querySelectorAll('script, noscript, style, link, iframe, object, embed');
    scripts.forEach(s => s.remove());

    // Run Mozilla Readability
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article || !article.content) {
      console.warn(`[Scraper] Readability could not extract content from ${url}`);
      return null;
    }

    return { content: article.content, type: 'html' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('aborted') || msg.includes('timeout')) {
       console.warn(`[Scraper] Timeout fetching ${url}`);
    } else {
       console.error(`[Scraper] Error scraping ${url}:`, msg);
    }
    return null;
  }
}
