import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

type ExtractRequest = { type: 'EXTRACT_CONTENT' };
type LinkItem = { text: string; url: string };
type ExtractResult = {
  title: string;
  content: string;
  excerpt: string | null;
  byline: string | null;
  selection: string;
  links: LinkItem[];
  extractor: 'readability' | 'body-fallback';
};

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});

turndown.addRule('strip-empty-anchors', {
  filter: (node) => node.nodeName === 'A' && !node.textContent?.trim(),
  replacement: () => '',
});

const NOISE_SELECTOR =
  'nav, footer, header, script, style, noscript, iframe, form[role="search"], ' +
  '[aria-hidden="true"], .cookie-banner, .cookie-consent, [class*="cookie"]';

function extractLinks(): LinkItem[] {
  const seen = new Set<string>();
  const out: LinkItem[] = [];
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const url = a.href;
    if (!url || url.startsWith('javascript:') || url.startsWith('#')) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const text = a.textContent?.trim().replace(/\s+/g, ' ') ?? '';
    out.push({ text, url });
  }
  return out;
}

function cleanMarkdown(md: string): string {
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

function readabilityExtract(): {
  content: string;
  title: string | null;
  excerpt: string | null;
  byline: string | null;
} {
  try {
    const docClone = document.cloneNode(true) as Document;
    const article = new Readability(docClone).parse();
    if (!article?.content) return { content: '', title: null, excerpt: null, byline: null };
    return {
      content: cleanMarkdown(turndown.turndown(article.content)),
      title: article.title ?? null,
      excerpt: article.excerpt ?? null,
      byline: article.byline ?? null,
    };
  } catch {
    return { content: '', title: null, excerpt: null, byline: null };
  }
}

function bodyFallbackExtract(): string {
  try {
    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    bodyClone.querySelectorAll(NOISE_SELECTOR).forEach((el) => el.remove());
    return cleanMarkdown(turndown.turndown(bodyClone.innerHTML));
  } catch {
    return document.body.innerText.trim();
  }
}

function extract(): ExtractResult {
  const readability = readabilityExtract();
  const fallback = bodyFallbackExtract();

  // Prefer Readability unless fallback is significantly longer (e.g. resource pages,
  // lists, dashboards — anything that's not article-shaped)
  const useReadability =
    readability.content.length >= 500 && readability.content.length >= fallback.length * 0.6;

  const chosen = useReadability ? readability.content : fallback;

  return {
    title: readability.title ?? document.title,
    content: chosen,
    excerpt: readability.excerpt,
    byline: readability.byline,
    selection: window.getSelection()?.toString().trim() ?? '',
    links: extractLinks(),
    extractor: useReadability ? 'readability' : 'body-fallback',
  };
}

chrome.runtime.onMessage.addListener(
  (msg: ExtractRequest, _sender, respond: (r: unknown) => void) => {
    if (msg?.type === 'EXTRACT_CONTENT') {
      try {
        const data = extract();
        respond({ ok: true, data });
      } catch (err) {
        respond({ ok: false, error: String(err) });
      }
      return true;
    }
    return false;
  },
);
