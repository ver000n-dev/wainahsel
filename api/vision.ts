// /api/vision.ts
// يستقبل صورة Base64 ويستدعي Google Vision API ثم يرجع النتيجة

export const config = {
  runtime: 'edge', // ✅ تشغيل على Vercel Edge
};

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.VISION_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'VISION_API_KEY missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const imageBase64 = body.imageBase64;
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const content = imageBase64.startsWith('data:')
      ? imageBase64.split(',').pop()
      : imageBase64;

    const payload = {
      requests: [
        {
          image: { content },
          features: [{ type: 'WEB_DETECTION', maxResults: 10 }],
          imageContext: { webDetectionParams: { includeGeoResults: true } },
        },
      ],
    };

    const gRes = await fetch(
      'https://vision.googleapis.com/v1/images:annotate?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const text = await gRes.text();
    const data = JSON.parse(text);
    return new Response(JSON.stringify(data), {
      status: gRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
