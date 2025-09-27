// /pages/api/localize.ts
// يطلب OBJECT_LOCALIZATION من Google Vision ويعيد المربعات (Bounding Boxes)
// يستخدم نفس متغيّر البيئة عندك: VISION_API_KEY

import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

type Vertex = { x?: number; y?: number };
type NormalizedVertex = { x: number; y: number };

function toNormalized(vertices: Vertex[] = []): NormalizedVertex[] {
  // Google يرجّع إحداثيات [0..1] أحياناً، وأحياناً نسبية للصورة
  // نطبّعها إلى [0..1] مع ضمان 4 نقاط
  const v = (vertices || []).slice(0, 4).map(({ x, y }) => ({
    x: Math.max(0, Math.min(1, Number(x ?? 0))),
    y: Math.max(0, Math.min(1, Number(y ?? 0))),
  }));
  while (v.length < 4) v.push({ x: 0, y: 0 });
  return v as NormalizedVertex[];
}

function areaOfBox(v: NormalizedVertex[]): number {
  // تقريبًا: مربع محيط (نفترض مستطيل محورّي)
  const xs = v.map(p => p.x);
  const ys = v.map(p => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return Math.max(0, w) * Math.max(0, h);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.VISION_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'VISION_API_KEY is not configured' });

    // يدعم dataURL أو raw base64
    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let { imageBase64 } = parsed as { imageBase64?: string };
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

    const content = imageBase64.startsWith('data:')
      ? imageBase64.split(',').pop()
      : imageBase64;

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
      console.error('[Vision-LOCALIZE]', text);
      let j: any = {};
      try { j = JSON.parse(text); } catch { j = { raw: text }; }
      const err = j?.error || {};
      return res.status(gRes.status || 500).json({
        error: 'VisionAPIError',
        code: err.code, status: err.status, message: err.message, details: err.details || j.raw || null,
      });
    }

    const data = JSON.parse(text);
    const ann = data?.responses?.[0]?.localizedObjectAnnotations || [];

    // نعيد قائمة مختصرة + اختيار "أفضل" صندوق
    const boxes = (ann as any[]).map((o, i) => {
      const verts = toNormalized(o?.boundingPoly?.normalizedVertices || o?.boundingPoly?.vertices || []);
      return {
        id: String(i + 1),
        name: o?.name || '',
        score: Number(o?.score || 0),
        vertices: verts,           // أربع نقاط [0..1]
        area: areaOfBox(verts),    // مفيدة للاختيار
      };
    });

    // استبعاد عناصر غير مفيدة لو ظهرت (اختياري)
    const blacklist = new Set(['Person', 'Hand', 'Arm']);
    const candidates = boxes.filter(b => !blacklist.has(b.name));

    // أفضل صندوق: أعلى (score * area)
    const primary = candidates
      .slice()
      .sort((a, b) => (b.score * b.area) - (a.score * a.area))[0] || null;

    return res.status(200).json({
      boxes,
      primary, // قد يكون null إذا ما وجد شيء
    });
  } catch (e: any) {
    console.error('[LOCALIZE_Internal]', e?.message || e);
    return res.status(500).json({ error: 'Internal', message: e?.message || 'unknown' });
  }
}
