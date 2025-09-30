// /api/cse.ts (Vercel Serverless)
// يبحث عبر Google Custom Search JSON API مع فلترة مواقع موثوقة اختيارياً

import type { VercelRequest, VercelResponse } from '@vercel/node';

const TRUSTED_DOMAINS = [
  'amazon.sa','amazon.ae','amazon.com',
  'noon.com','xcite.com','x-cite.com',
  'jarir.com','extra.com',
  'carrefourksa.com','carrefouruae.com',
  'luluhypermarket.com','ikea.com','shein.com','namshi.com'
];

function siteFilter() {
  return TRUSTED_DOMAINS.map(d => `site:${d}`).join(' OR ');
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok:false, error:'METHOD_NOT_ALLOWED' });
    }

    const key = process.env.CSE_API_KEY;
    const cx  = process.env.CSE_CX;
    if (!key || !cx) {
      return res.status(500).json({ ok:false, error:'CSE keys missing on server' });
    }

    const qRaw = String(req.query.q || '').trim();
    if (!qRaw) return res.status(400).json({ ok:false, error:'q is required' });

    const num = clamp(parseInt(String(req.query.num || '10'), 10) || 10, 1, 30);
    const gl  = String(req.query.gl || 'sa').toLowerCase();
    const trustedOnly = String(req.query.trustedOnly || '1') === '1';

    const baseQ = qRaw;
    const q = trustedOnly ? `${baseQ} ${siteFilter()}` : baseQ;

    const items: any[] = [];
    // CSE يرجّع حتى 10 بالصفحة → نجزئ حتى نصل num
    for (let start = 1; start <= num; start += 10) {
      const pageSize = Math.min(10, num - (start - 1));
      const params = new URLSearchParams({
        key, cx, q,
        num: String(pageSize),
        start: String(start),
        gl,
        lr: 'lang_ar|lang_en',
        safe: 'off',
        fields: 'items(link,displayLink,title,snippet,pagemap)'
      });

      const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
      const r = await fetch(url, { headers: { 'Accept':'application/json' }, cache: 'no-store' as RequestCache });
      if (!r.ok) break;
      const j = await r.json();
      const page: any[] = j?.items || [];
      if (page.length === 0) break;
      items.push(...page);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok:true, items });
  } catch (e: any) {
    return res.status(500).json({ ok:false, error: String(e?.message || 'CSE_ERROR') });
  }
}
