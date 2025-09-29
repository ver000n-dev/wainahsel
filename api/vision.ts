// /api/vision.ts (Vercel Edge)
// يستقبل صورة Base64 ويستدعي Google Vision ثم يرجّع { ok, webDetection, ocrText, processingTime }

export const config = { runtime: "edge" };

type Json = Record<string, unknown>;

function json(data: Json, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function stripDataUrl(b64: string): string {
  if (!b64) return "";
  const trimmed = b64.trim();
  return trimmed.startsWith("data:") ? trimmed.split(",").pop() || "" : trimmed;
}

// تقدير حجم الـBase64 بدون فك الترميز
function base64Bytes(b64: string): number {
  const s = b64.replace(/\s/g, "");
  const padding = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return (s.length * 3) / 4 - padding;
}

export default async function handler(req: Request): Promise<Response> {
  const t0 = Date.now();

  try {
    if (req.method !== "POST") {
      return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }

    const apiKey = process.env.VISION_API_KEY;
    if (!apiKey) {
      return json({ ok: false, error: "VISION_API_KEY missing in production" }, 500);
    }

    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      return json({ ok: false, error: "UNSUPPORTED_MEDIA_TYPE: send JSON { imageBase64 }" }, 415);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "INVALID_JSON" }, 400);
    }

    const raw = body?.imageBase64;
    if (!raw || typeof raw !== "string") {
      return json({ ok: false, error: "NO_IMAGE: send { imageBase64 }" }, 400);
    }

    const content = stripDataUrl(raw);
    if (!content) return json({ ok: false, error: "EMPTY_IMAGE" }, 400);

    // حد الحجم ~3MB
    const sizeMB = base64Bytes(content) / (1024 * 1024);
    if (sizeMB > 3.1) return json({ ok: false, error: "IMAGE_TOO_LARGE: max 3MB" }, 413);

    const payload = {
      requests: [
        {
          image: { content },
          features: [
            { type: "WEB_DETECTION",  maxResults: 10 },
            { type: "TEXT_DETECTION", maxResults: 10 },
            // يمكن إبقاؤهما لتحسين التسمية، أو حذفهما لتقليل الاستهلاك:
            { type: "LABEL_DETECTION", maxResults: 10 },
            { type: "LOGO_DETECTION",  maxResults: 5  },
          ],
          imageContext: {
            languageHints: ["ar", "en"],
            webDetectionParams: { includeGeoResults: true },
          },
        },
      ],
    };

    const gRes = await fetch(
      "https://vision.googleapis.com/v1/images:annotate?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const rawText = await gRes.text();
    if (!gRes.ok) {
      return json({ ok: false, error: `VISION_FAIL ${gRes.status}: ${rawText.slice(0, 300)}` }, 502);
    }

    const data = JSON.parse(rawText) as any;
    const resp0 = data?.responses?.[0] ?? {};
    const web = resp0?.webDetection ?? {};
    const ocr = resp0?.textAnnotations?.[0]?.description ?? "";

    return json({
      ok: true,
      processingTime: Date.now() - t0,
      webDetection: web,
      ocrText: ocr,
    });
  } catch (e: any) {
    const msg = (e?.message || "UNKNOWN_ERROR").slice(0, 400);
    return json({ ok: false, error: msg }, 500);
  }
}
