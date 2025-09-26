// api/vision.ts — Vercel Serverless Function بدون استيراد @vercel/node

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.VISION_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'VISION_API_KEY is not configured' });
    }

    // الجسم يُفترض أنه JSON لأننا نرسل Content-Type: application/json من الواجهة
    const { imageBase64 } = (req.body || {}) as { imageBase64?: string };
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const r = await fetch(
      'https://vision.googleapis.com/v1/images:annotate?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: 'LABEL_DETECTION', maxResults: 5 }],
            },
          ],
        }),
      }
    );

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({ error: 'VisionAPIError', details: data });
    }

    return res.status(200).json(data);
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: 'Internal', message: e?.message || 'unknown' });
  }
}
