// api/vision.ts — طباعة تفاصيل خطأ Vision لسهولة التشخيص

export default async function handler(req: any, res: any) {
  try {
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
    } catch {}
    const { imageBase64 } = parsed || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const gRes = await fetch('https://vision.googleapis.com/v1/images:annotate?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'LABEL_DETECTION', maxResults: 5 }]
          }
        ]
      })
    });

    const text = await gRes.text();

    if (!gRes.ok) {
      // 🔴 اطبع نص ردّ Google بالكامل في Runtime Logs
      console.error('[VisionAPIError]', text);
      let j: any = {};
      try { j = JSON.parse(text); } catch { j = { raw: text }; }
      // أعد الكود والرسالة للواجهة لتظهر بوضوح
      const err = j?.error || {};
      return res.status(500).json({
        error: 'VisionAPIError',
        code: err.code,
        status: err.status,
        message: err.message,
        details: err.details || j.raw || null
      });
    }

    // نجاح
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return res.status(200).json(data);

  } catch (e: any) {
    console.error('[VisionAPI_Internal]', e?.message || e);
    return res.status(500).json({ error: 'Internal', message: e?.message || 'unknown' });
  }
}
