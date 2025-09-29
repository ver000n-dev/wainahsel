// /api/localize.ts
// يطلب OBJECT_LOCALIZATION من Google Vision ويعيد المربعات + primary
// متوافق مع Vercel Edge (لا يعتمد على next)

export const config = { runtime: 'edge' };

type Vertex = { x?: number; y?: number };
type NormalizedVertex = { x: number; y: number };

function toNormalized(vertices: Vertex[] = []): NormalizedVertex[] {
  const v = (vertices || []).slice(0, 4).map(({ x, y }) => ({
    x: Math.max(0, Math.min(1, Number(x ?? 0))),
    y: Math.max(0, Math.min(1, Number(y ?? 0))),
  }));
  while (v.length < 4) v.push({ x: 0, y: 0 });
  return v as NormalizedVertex[];
}

function areaOfBox(v: NormalizedVertex[]): number {
  const xs = v.map((p) => p.x);
  const ys = v.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return Math.max(0, w) * Math.max(0, h);
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.VISION_API_KEY || process.env.VITE_VISION_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'VISION_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // يدعم body كنص/JSON
    const body = await req.json().catch(() => ({} as any));
    let { imageBase64 } = (body || {}) as { imageBase64?: string };
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // dataURL أو raw base64
    const content = String(imageBase64).startsWith('data:')
      ? String(imageBase64).split(',').pop()
      : String(imageBase64);

    const payload = {
      requests: [
        {
          image: { content },
          features: [{ type: 'OBJECT_LOCALIZATION', maxResults: 10 }],
        },
      ],
    };

    const gRes = await fetch(
      'https://vision.googleapis.com/v1/images:annotate?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(payload),
      }
    );

    const text = await gRes.text();

    if (!gRes.ok) {
      // نعيد رسالة الخطأ كاملة للتشخيص
      let j: any = {};
      try { j = JSON.parse(text); } catch { j = { raw: text }; }
      const err = j?.error || {};
      return new Response(
        JSON.stringify({
          error: 'VisionAPIError',
          code: err.code,
          status: err.status,
          message: err.message,
          details: err.details || j.raw || null,
        }),
        { status: gRes.status || 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = JSON.parse(text);
    const ann = data?.responses?.[0]?.localizedObjectAnnotations || [];

    const boxes = (ann as any[]).map((o, i) => {
      const verts =
        toNormalized(
          o?.boundingPoly?.normalizedVertices || o?.boundingPoly?.vertices || []
        );
      return {
        id: String(i + 1),
        name: o?.name || '',
        score: Number(o?.score || 0),
        vertices: verts,        // أربع نقاط [0..1]
        area: areaOfBox(verts), // مفيدة للاختيار
      };
    });

    const blacklist = new Set(['Person', 'Hand', 'Arm']);
    const candidates = boxes.filter((b) => !blacklist.has(b.name));

    const primary =
      candidates
        .slice()
        .sort((a, b) => b.score * b.area - a.score * a.area)[0] || null;

    return new Response(JSON.stringify({ boxes, primary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal', message: e?.message || 'unknown' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
