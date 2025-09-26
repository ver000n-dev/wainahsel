// api/vision.ts — Serverless function on Vercel
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.VISION_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'VISION_API_KEY is not configured' });

    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

    const r = await fetch('https://nam10.safelinks.protection.outlook.com/?url=https%3A%2F%2Fvision.googleapis.com%2Fv1%2Fimages%3Aannotate%3Fkey%3D&data=05%7C02%7Caqnk%40chevron.com%7C310d2566c7404f1e3f9c08ddfce716e0%7Cfd799da1bfc14234a91c72b3a1cb9e26%7C0%7C0%7C638944791659482873%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=LlNPoWbyoGDjCPVMa0%2FkqaBMRC0aJhIzxQSbKQ41H4I%3D&reserved=0' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { content: imageBase64 }, features: [{ type: 'LABEL_DETECTION', maxResults: 5 }] }]
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: 'VisionAPIError', details: data });

    return res.status(200).json(data);
  } catch (e:any) {
    return res.status(500).json({ error: 'Internal', message: e?.message || 'unknown' });
  }
}
