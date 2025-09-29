// src/services/cse.ts
// بحث Google Programmable Search (CSE) مع تهيئة النتائج لتناسب كرت المنتج

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

// ⚠️ مفاتيح الواجهة (للتجربة). يفضَّل في الإنتاج استخدام مسار سيرفر /api/cse لحماية المفاتيح.
const API_KEY = import.meta.env.VITE_CSE_API_KEY as string | undefined;
const CX      = import.meta.env.VITE_CSE_CX as string | undefined;

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

/**
 * يجري بحث CSE؛ افتراضيًا يقيّد النتائج على المتاجر الموثوقة.
 * لو مفقودة مفاتيح البيئة، يُرجع [] بدل الرمي.
 */
export async function searchShopsViaCSE(
  query: string,
  countryCode: string = 'KW',
  num: number = 10,
  trustedOnly: boolean = true
): Promise<CSEProduct[]> {
  if (!query?.trim()) return [];
  if (!API_KEY || !CX) {
    console.warn('[CSE] Missing VITE_CSE_API_KEY or VITE_CSE_CX');
    return [];
  }

  const baseQ = query.trim();
  const q = trustedOnly ? `${baseQ} ${siteFilter()}` : baseQ;

  const params = new URLSearchParams({
    key: API_KEY,
    cx: CX,
    q,
    num: String(num),
    gl: GL[countryCode] || 'sa',
    lr: 'lang_ar|lang_en',
    safe: 'off',
  });

  const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
  const r = await fetch(url);
  if (!r.ok) {
    console.warn('[CSE] HTTP', r.status);
    return [];
  }
  const json = await r.json();
  const items: CSEItem[] = json?.items || [];

  return items.map((it, idx) => {
    const link = it.link || '';
    const storeDomain = hostnameOf(link);
    const store = storeDomain || (it.displayLink || '').replace(/^www\./,'');
    const title = it.title || baseQ;

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
  });
}
