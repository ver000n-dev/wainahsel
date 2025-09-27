// /pages/api/vision.ts
// - يفعّل WEB_DETECTION (يرجع fullMatchingImages / partialMatchingImages / visuallySimilarImages)
// - يدعم dataURL أو raw base64
// - يطبع أخطاء Google بالكامل للتشخيص
// - يضبط حجم البودي ويمنع الكاش

import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.VISION_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'VISION_API_KEY is not configured' });
    }

    // تحمّل كلا الحالتين: body نصّي أو JSON
    let parsed: any = {};
    try {
      parsed = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch {
      parsed = req.body || {};
    }

    let { imageBase64 } = parsed as { imageBase64?: string };
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // يقبل dataURL أو raw base64
    const content =
      imageBase64.startsWith('data:') ? imageBase64.split(',').pop() : imageBase64;

    const payload = {
      requests: [
        {
          image: { content },
          // 🎯 المهم الآن: WEB_DETECTION للحصول على الصور المطابقة/المشابهة وروابط الصفحات
          features: [{ type: 'WEB_DETECTION', maxResults: 10 }],
          imageContext: {
            webDetectionParams: { includeGeoResults: true },
          },
        },
      ],
    };

    const gRes = await fetch(
      'https://vision.googleapis.com/v1/images:annotate?key=' + apiKey,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await gRes.text();

    if (!gRes.ok) {
      // 🔴 اطبع نص ردّ Google بالكامل في Runtime Logs
      console.error('[VisionAPIError]', text);
      let j: any = {};
      try {
        j = JSON.parse(text);
      } catch {
        j = { raw: text };
      }
      const err = j?.error || {};
      return res.status(gRes.status || 500).json({
        error: 'VisionAPIError',
        code: err.code,
        status: err.status,
        message: err.message,
        details: err.details || j.raw || null,
      });
    }

    // ✅ نجاح
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return res.status(200).json(data);
  } catch (e: any) {
    console.error('[VisionAPI_Internal]', e?.message || e);
    return res
      .status(500)
      .json({ error: 'Internal', message: e?.message || 'unknown' });
  }
}
