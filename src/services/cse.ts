// src/services/cse.ts
// بحث Google Programmable Search (CSE) مع تهيئة النتائج لتناسب كرت المنتج
// يدعم النداء السيرفري (/api/cse) كخيار أول، مع fallback للمفاتيح الطرفية عند عدم توفر الراوت.

// ——— متاجر موثوقة
const TRUSTED_DOMAINS = [
  'amazon.sa','amazon.ae','amazon.com',
  'noon.com','xcite.com','x-cite.com',
  'jarir.com','extra.com',
  'carrefourksa.com','carrefouruae.com',
  'luluhypermarket.com','ikea.com','shein.com','namshi.com'
];

// ——— تلميح الدولة لنتائج CSE
const GL: Record<string,string> = { KW:'kw', SA:'sa', AE:'ae', QA:'qa', OM:'om', BH:'bh' };

// ——— ربط دومين → بلد (تقريبي)
const DOMAIN_TO_COUNTRY: Record<string,string> = {
  'amazon.sa':'SA','amazon.ae':'AE',
  'xcite.com':'KW','x-cite.com':'KW',
  'jarir.com':'SA','extra.com':'SA',
  'carrefourksa.com':'SA','carrefouruae.com':'AE',
  'luluhypermarket.com':'AE',
};

// ——— Helpers
function siteFilter() {
  return TRUSTED_DOMAINS.map(d => `site:${d}`).join(' OR ');
}
function hostnameOf(url?: string) {
  if (!url) return '';
  try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ''; }
}
function inferCountryFromDomain(d?: string) {
  if (!d) return undefined;
  const key = Object.keys(DOMAIN_TO_COUNTRY).find(k => d.endsWith(k));
  return key ? DOMAIN_TO_COUNTRY[key] : undefined;
}
function parsePrice(raw?: string): { currency?: string; value?: number } {
  if (!raw) return {};
  const MAP: Record<string,string> = {
    'KWD':'KWD','د.ك':'KWD','KD':'KWD',
    'SAR':'SAR','ر.س':'SAR','ريال':'SAR',
    'AED':'AED','د.إ':'AED',
    'USD':'USD','$':'USD'
  };
  const m =
    raw.match(/([\d.,]+)\s*(KWD|د\.ك|KD|SAR|ر\.س|ريال|AED|د\.إ|USD|\$)/i) ||
    raw.match(/(KWD|د\.ك|KD|SAR|ر\.س|ريال|AED|د\.إ|USD|\$)\s*([\d.,]+)/i);
  if (!m) return {};
  const num = parseFloat((m[1]||m[2]).replace(/,/g,''));
  const curKey = (m[2]||m[1]||'').toUpperCase();
  const cur = MAP[curKey];
  return { currency: cur, value: isNaN(num) ? undefined : num };
}

function dedup<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const k = keyFn(it)?.toLowerCase?.() || '';
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

// ⚠️ مفاتيح الواجهة (للتجربة). في الإنتاج استخدم /api/cse لحماية المفاتيح.
const API_KEY = import.meta.env.VITE_CSE_API_KEY as string | undefined;
const CX      = import.meta.env.VITE_CSE_CX as string | undefined;

// نفضّل النداء السيرفري عندما:
// - نحن في PROD أو على نطاق الموقع، أو لا توجد مفاتيح طرفية.
function shouldUseServerRoute(): boolean {
  try {
    const noClientKeys = !API_KEY || !CX;
    const isProd = (import.meta as any).env?.PROD === true;
    const h = typeof window !== 'undefined' ? window.location.hostname : '';
    const isOurHost = /wainahsel\.com$/i.test(h);
    return noClientKeys || isProd || isOurHost;
  } catch {
    return true;
  }
}

async function fetchWithTimeout(url: string, opts: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 8000, ...rest } = opts;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...rest, signal: ctrl.signal });
    return r;
  } finally {
    clearTimeout(id);
  }
}

export interface CSEItem {
  link?: string;
  displayLink?: string;
  title?: string;
  snippet?: string;
  pagemap?: any;
}
export interface CSEProduct {
  id: string;
  name: string;
  productUrl: string;
  store: string;
  storeDomain: string;
  imageUrl?: string;
  price?: string;
  currency?: string;
  priceValue?: number;
  countryCode?: string;
  similarity: number; // قيمة افتراضية عالية لأن البحث نصي على bestGuess
}

// ——— التطبيع من بند Google item → منتج
function mapItemToProduct(it: CSEItem, baseQ: string, idx: number): CSEProduct | null {
  const link = it.link || '';
  if (!link) return null;

  const storeDomain = hostnameOf(link);
  const store = storeDomain || (it.displayLink || '').replace(/^www\./,'');
  const title = (it.title || baseQ).trim();

  // صورة مصغّرة من pagemap إن وُجدت
  const imageUrl =
    it.pagemap?.cse_image?.[0]?.src ||
    it.pagemap?.metatags?.[0]?.['og:image'] ||
    undefined;

  // محاولة التقاط سعر من العنوان/الوصف
  const priceRaw = [it.title, it.snippet].filter(Boolean).join(' ');
  const { currency, value } = parsePrice(priceRaw);

  return {
    id: `cse-${idx}-${link}`,
    name: title,
    productUrl: link,
    store,
    storeDomain,
    imageUrl,
    price: currency && value != null ? `${value} ${currency}` : undefined,
    currency,
    priceValue: value,
    countryCode: inferCountryFromDomain(storeDomain),
    similarity: 0.93,
  };
}

// ——— استدعاء عبر السيرفر (/api/cse) ———
async function searchViaServer(
  baseQ: string,
  gl: string,
  num: number,
  trustedOnly: boolean
): Promise<CSEItem[]> {
  const params = new URLSearchParams({
    q: baseQ,
    num: String(num),
    gl,
    trustedOnly: trustedOnly ? '1' : '0',
  });
  const r = await fetchWithTimeout(`/api/cse?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'Accept': 'application/json' },
    timeoutMs: 8000,
  });
  if (!r.ok) throw new Error(`/api/cse ${r.status}`);
  const j = await r.json();
  // نتسامح مع شكلين: {ok, items: []} أو {items: []} أو {products: []}
  const items: CSEItem[] = j?.items || j?.products || [];
  return items;
}

// ——— استدعاء مباشر إلى Google (مفاتيح واجهة) ———
async function searchViaClientKeys(
  baseQ: string,
  gl: string,
  num: number,
  trustedOnly: boolean
): Promise<CSEItem[]> {
  if (!API_KEY || !CX) return [];
  const q = trustedOnly ? `${baseQ} ${siteFilter()}` : baseQ;

  const results: CSEItem[] = [];
  // CSE يرجّع حتى 10 في الصفحة — نجزّئ حتى نبلغ num
  for (let start = 1; start <= num; start += 10) {
    const pageSize = Math.min(10, num - (start - 1));
    const params = new URLSearchParams({
      key: API_KEY!,
      cx: CX!,
      q,
      num: String(pageSize),
      start: String(start),
      gl,
      lr: 'lang_ar|lang_en',
      safe: 'off',
      // fields لتخفيف الحمولة (اختياري): 'items(link,displayLink,title,snippet,pagemap)'
    });

    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
    const r = await fetchWithTimeout(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      timeoutMs: 8000,
    });
    if (!r.ok) {
      console.warn('[CSE] HTTP', r.status, 'for start=', start);
      break; // نوقف بدل الرمي
    }
    const json = await r.json();
    const items: CSEItem[] = json?.items || [];
    if (items.length === 0) break;
    results.push(...items);
  }

  return results;
}

/**
 * يجري بحث CSE؛ افتراضيًا يقيّد النتائج على المتاجر الموثوقة.
 * لو مفقود الراوت السيرفري، يحاول استخدام مفاتيح الواجهة كخيار أخير.
 * لو تعذّر كل شيء، يُرجع [] بدون رمي.
 */
export async function searchShopsViaCSE(
  query: string,
  countryCode: string = 'KW',
  num: number = 10,
  trustedOnly: boolean = true
): Promise<CSEProduct[]> {
  try {
    if (!query?.trim()) return [];
    const baseQ = `"${query.trim()}"`; // اقتباس لتحسين الدقة
    const gl = GL[countryCode] || 'sa';

    // 1) جرّب السيرفر أولاً
    let items: CSEItem[] = [];
    if (shouldUseServerRoute()) {
      try {
        items = await searchViaServer(baseQ, gl, Math.min(Math.max(num, 1), 30), trustedOnly);
      } catch (e) {
        console.warn('[CSE] server route fallback → client keys:', e);
      }
    }

    // 2) إن فشل السيرفر أو رجع صفر، جرّب مفاتيح الواجهة (للتجربة)
    if ((!items || items.length === 0) && API_KEY && CX) {
      items = await searchViaClientKeys(baseQ, gl, Math.min(Math.max(num, 1), 30), trustedOnly);
    }

    if (!items || items.length === 0) return [];

    // 3) طبع النتائج إلى شكل منتج موحّد + dedupe
    const mapped = items
      .map((it, idx) => mapItemToProduct(it, query, idx))
      .filter(Boolean) as CSEProduct[];

    const deduped = dedup(mapped, (x) => x.productUrl || x.name);

    // 4) نُفضّل الموثوق ثم الدولة (الفرز النهائي يتم لاحقًا في rankAndFilter)
    deduped.sort((a, b) => {
      const at = TRUSTED_DOMAINS.some(d => a.storeDomain.endsWith(d)) ? 1 : 0;
      const bt = TRUSTED_DOMAINS.some(d => b.storeDomain.endsWith(d)) ? 1 : 0;
      if (at !== bt) return bt - at;
      const ac = a.countryCode ? 1 : 0;
      const bc = b.countryCode ? 1 : 0;
      if (ac !== bc) return bc - ac;
      return 0;
    });

    return deduped.slice(0, Math.min(Math.max(num, 1), 30));
  } catch (e) {
    console.warn('[CSE] error:', e);
    return [];
  }
}

export type { CSEItem as _CSEItemInternal };
