// src/services/cse.ts
const TRUSTED_DOMAINS = [
  'amazon.sa','amazon.ae','amazon.com',
  'noon.com','xcite.com','x-cite.com',
  'jarir.com','extra.com',
  'carrefourksa.com','carrefouruae.com',
  'luluhypermarket.com','ikea.com','shein.com','namshi.com'
];

const GL: Record<string,string> = { KW:'kw', SA:'sa', AE:'ae', QA:'qa', OM:'om', BH:'bh' };

function siteFilter() {
  return TRUSTED_DOMAINS.map(d => `site:${d}`).join(' OR ');
}

// ⚠️ مفاتيح الواجهة (للتجربة). للإنتاج انقل النداء للسيرفر.
const API_KEY = import.meta.env.VITE_CSE_API_KEY as string;
const CX      = import.meta.env.VITE_CSE_CX as string;

export interface CSEItem {
  link?: string;
  displayLink?: string;
  title?: string;
  snippet?: string;
}

export async function searchShopsViaCSE(query: string, countryCode = 'KW', num = 10): Promise<CSEItem[]> {
  if (!API_KEY || !CX) throw new Error('VITE_CSE_API_KEY / VITE_CSE_CX not set');

  const fullQ = `${query} ${siteFilter()}`;
  const params = new URLSearchParams({
    key: API_KEY,
    cx: CX,
    q: fullQ,
    num: String(num),
    gl: GL[countryCode] || 'sa',
    lr: 'lang_ar|lang_en',
    safe: 'off',
  });

  const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
  const r = await fetch(url);
  const json = await r.json();
  return (json?.items || []) as CSEItem[];
}
