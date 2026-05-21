import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

export type ScrapeResult = {
  type: 'Seller' | 'Buyer';
  company: string;
  product: string;
  priceRaw: string;
  price: number;
  unit: string;
  city: string;
  url: string;
  source: 'IndiaMart';
};

function parsePrice(text: string): { price: number; unit: string } {
  if (!text || text.toLowerCase().includes('latest') || text.toLowerCase().includes('call')) {
    return { price: 0, unit: 'unit' };
  }
  const nums = text.replace(/[₹,\s]/g, '').match(/[\d.]+/g);
  const price = nums ? parseFloat(nums[0]) : 0;
  const u = text.match(/\/(kg|tonne|mt|quintal|litre|ltr|piece|pcs|unit|bag|drum)/i);
  const unit = u ? u[1].toLowerCase().replace('ltr', 'litre').replace('mt', 'tonne') : 'unit';
  return { price, unit };
}

function cleanText(t: string | undefined): string {
  return (t || '').replace(/\s+/g, ' ').trim();
}

async function fetchPage(url: string): Promise<{ html: string; status: number }> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(12000),
  });
  const html = await res.text();
  return { html, status: res.status };
}

async function scrapeSellers(query: string): Promise<ScrapeResult[]> {
  const url = `https://www.indiamart.com/search.mp?ss=${encodeURIComponent(query)}`;
  const { html, status } = await fetchPage(url);
  if (status !== 200) throw new Error(`IndiaMart returned HTTP ${status}`);

  const $ = cheerio.load(html);
  const results: ScrapeResult[] = [];

  // Strategy 1 — standard product listing cards
  const cardSelectors = [
    '.lcPrduct', '.product-unit-vertical', '.prod-detail', '.prd-detail',
    '[data-prdid]', '[data-product]', '.sp-wrap', '.srp-item',
  ];
  for (const sel of cardSelectors) {
    $(sel).each((_, el) => {
      const company = cleanText(
        $(el).find('.sup-name a, .companyName a, .comp-name a, .supplier-name a, [class*="company"] a').first().text() ||
        $(el).find('.sup-name, .companyName, .comp-name').first().text()
      );
      const product = cleanText(
        $(el).find('.prd-name a, .prod-name a, .product-name a, h3 a, h2 a').first().text() ||
        $(el).find('.prd-name, .prod-name, h3, h2').first().text()
      );
      const priceRaw = cleanText(
        $(el).find('.price, .prd-price, .prod-price, [class*="price"]').first().text()
      ) || 'Get Latest Price';
      const city = cleanText(
        $(el).find('.city, .loc, .location, [class*="city"], [class*="location"]').first().text()
      );
      const href = $(el).find('a[href*="/proddetail/"], a[href*="/catalog/"]').first().attr('href') || url;
      const { price, unit } = parsePrice(priceRaw);
      if (company && company.length > 1) {
        results.push({ type: 'Seller', company, product: product || query, priceRaw, price, unit, city, url: href.startsWith('http') ? href : `https://www.indiamart.com${href}`, source: 'IndiaMart' });
      }
    });
    if (results.length > 0) break;
  }

  // Strategy 2 — JSON-LD structured data
  if (results.length === 0) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '{}');
        const items = data.itemListElement || (data['@type'] === 'Product' ? [data] : []);
        items.forEach((item: Record<string, any>) => {
          const priceRaw = item.offers?.price ? `₹${item.offers.price}` : '';
          const { price, unit } = parsePrice(priceRaw);
          results.push({
            type: 'Seller',
            company: item.brand?.name || item.seller?.name || '',
            product: item.name || query,
            priceRaw: priceRaw || 'Get Latest Price',
            price, unit,
            city: item.seller?.address?.addressLocality || item.offers?.availableAtOrFrom || '',
            url: item.url || url,
            source: 'IndiaMart',
          });
        });
      } catch {/* ignore malformed JSON-LD */}
    });
  }

  // Strategy 3 — window.__INITIAL_STATE__ or similar embedded JSON
  if (results.length === 0) {
    const scriptText = $('script:not([src])').map((_, el) => $(el).html()).get().join('\n');
    const match = scriptText.match(/window\.__(?:INITIAL_STATE|__STATE|DATA)__\s*=\s*(\{[\s\S]+?\});/);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const products = data?.search?.products || data?.products || [];
        products.slice(0, 15).forEach((p: Record<string, any>) => {
          const priceRaw = p.price || p.minPrice || '';
          const { price, unit } = parsePrice(String(priceRaw));
          results.push({
            type: 'Seller',
            company: p.companyName || p.sellerName || '',
            product: p.productName || p.name || query,
            priceRaw: priceRaw ? `₹${priceRaw}` : 'Get Latest Price',
            price, unit,
            city: p.city || p.location || '',
            url: p.url || url,
            source: 'IndiaMart',
          });
        });
      } catch {/* ignore */}
    }
  }

  return results.slice(0, 20);
}

async function scrapeBuyers(query: string): Promise<ScrapeResult[]> {
  const url = `https://www.indiamart.com/search.mp?ss=${encodeURIComponent(query)}&prodtype=buyer`;
  const { html, status } = await fetchPage(url);
  if (status !== 200) return [];

  const $ = cheerio.load(html);
  const results: ScrapeResult[] = [];

  const cardSelectors = [
    '.buy-req', '.buyer-unit', '.byr-req', '.buy-requirement',
    '[data-buyid]', '[data-buy]', '.buy-lead',
  ];

  for (const sel of cardSelectors) {
    $(sel).each((_, el) => {
      const company = cleanText(
        $(el).find('.buyer-name a, .comp-name a, .company a').first().text() ||
        $(el).find('.buyer-name, .comp-name').first().text()
      );
      const product = cleanText($(el).find('.req-name, .prod-name, h3, h2').first().text());
      const priceRaw = cleanText($(el).find('.price, .buy-price, [class*="price"]').first().text()) || '';
      const city = cleanText($(el).find('.city, .loc, .location').first().text());
      const { price, unit } = parsePrice(priceRaw);
      if (company && company.length > 1) {
        results.push({ type: 'Buyer', company, product: product || query, priceRaw: priceRaw || 'Quoted Price', price, unit, city, url, source: 'IndiaMart' });
      }
    });
    if (results.length > 0) break;
  }

  return results.slice(0, 20);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'Missing ?q=commodity parameter' }, { status: 400 });
  }

  const [sellerRes, buyerRes] = await Promise.allSettled([
    scrapeSellers(q),
    scrapeBuyers(q),
  ]);

  const sellers = sellerRes.status === 'fulfilled' ? sellerRes.value : [];
  const buyers = buyerRes.status === 'fulfilled' ? buyerRes.value : [];
  const error = sellerRes.status === 'rejected' ? String((sellerRes as PromiseRejectedResult).reason) : null;

  return NextResponse.json({
    query: q,
    timestamp: new Date().toISOString(),
    sellers,
    buyers,
    total: sellers.length + buyers.length,
    error: sellers.length === 0 ? (error ?? 'No results found — IndiaMart may be blocking this IP. Run the app locally on your home network.') : null,
  });
}
