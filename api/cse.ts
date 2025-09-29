// /api/cse.ts (Vercel Edge)
// يستدعي Google Custom Search JSON API بمفاتيح السيرفر ويُرجع { ok, items: [...] }

export const config = { runtime: "edge" };

const TRUSTED_DOMAINS = [
  "amazon.sa","amazon.ae","amazon.com",
  "noon.com","xcite.com","x-cite.com",
  "jarir.com","extra.com",
  "carrefourksa.com","carrefouruae.com",
  "luluhypermarket.com","ikea.com","shein.com","namshi.com"
];

function siteFilter() {
  return TRUSTED_DOMAINS.map(d => `site:${d}`).join(" OR ");
}
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "GET") return json({ ok:false, error:"METHOD_NOT_ALLOWED" }, 405);

    const key = process.env.CSE_API_KEY;
    const cx  = process.env.CSE_CX;
    if (!key || !cx) return json({ ok:false, error:"CSE keys missing" }, 500);

    const { searchParams } = new URL(req.url);
    const qRaw = (searchParams.get("q") || "").trim();
    const num  = Math.min(Math.max(parseInt(searchParams.get("num") || "10", 10), 1), 30);
    const gl   = (searchParams.get("gl") || "sa").toLowerCase();
    const trustedOnly = (searchParams.get("trustedOnly") || "1") === "1";

    if (!qRaw) return json({ ok:true, items: [] });

    const q = trustedOnly ? `${qRaw} ${siteFilter()}` : qRaw;

    const results: any[] = [];
    for (let start = 1; results.length < num; start += 10) {
      const pageSize = Math.min(10, num - results.length);
      const params = new URLSearchParams({
        key, cx, q, gl,
        lr: "lang_ar|lang_en",
        safe: "off",
        num: String(pageSize),
        start: String(start),
        fields: "items(link,displayLink,title,snippet,pagemap/cse_image,pagemap/metatags)"
      });

      const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
      const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!r.ok) break;
      const j = await r.json();
      const items = j?.items || [];
      if (!items.length) break;
      results.push(...items);
    }

    return json({ ok:true, items: results.slice(0, num) });
  } catch (e: any) {
    return json({ ok:false, error: e?.message || "CSE_ERROR" }, 500);
  }
}
