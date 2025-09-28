// src/services/aiSearch.ts

export interface SearchResult {
  id: string;
  name: string;
  description?: string;

  // الأسعار
  price?: string;         // نص خام مثل "12.50 KWD" أو "ر.س 99"
  currency?: string;      // "KWD" | "SAR" | "AED" | "USD" ...
  priceValue?: number;    // 12.5 (للفرز)

  // المتجر
  store?: string;         // اسم/دومين للعرض
  storeDomain?: string;   // hostname صافي مثل "amazon.sa"

  // الروابط والصور
  imageUrl?: string;
  productUrl?: string;

  // التشابه
  confidence?: number;    // % إن وصلتنا من المصدر (متوافق مع كودك القديم)
  similarity?: number;    // 0..1 (يُشتق من confidence إن وُجد)

  // الموقع (اختياري)
  countryCode?: string;   // "KW" | "SA" | "AE" | ...

  // داخلي للفرز
  _rankScore?: number;
}

export interface AISearchResponse {
  products: SearchResult[];
  searchQuery: string;
  processingTime: number;
  userCountry?: string;
}

function hostnameOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return undefined; }
}

function uniq<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const k = keyFn(it);
    if (!k) continue;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

// ----------------- إضافات الموثوقية/الأسعار/الموقع -----------------

// متاجر موثوقة (زِد عليها ما تشاء)
const TRUSTED_DOMAINS = [
  'amazon.sa','amazon.ae','amazon.com',
  'noon.com',
  'xcite.com','x-cite.com',
  'jarir.com','extra.com',
  'carrefourksa.com','carrefouruae.com',
  'luluhypermarket.com','ikea.com','shein.com','namshi.com'
];

function isTrustedStore(domain?: string) {
  if (!domain) return false;
  return TRUSTED_DOMAINS.some(t => domain.endsWith(t));
}

// ربط دومين → بلد (تقريبي)
const DOMAIN_TO_COUNTRY: Record<string,string> = {
  'amazon.sa':'SA',
  'amazon.ae':'AE',
  'xcite.com':'KW','x-cite.com':'KW',
  'jarir.com':'SA','extra.com':'SA',
  'carrefourksa.com':'SA','carrefouruae.com':'AE',
  'luluhypermarket.com':'AE',
};

function inferCountryFromDomain(d?: string) {
  if (!d) return undefined;
  const key = Object.keys(DOMAIN_TO_COUNTRY).find(k => d.endsWith(k));
  return key ? DOMAIN_TO_COUNTRY[key] : undefined;
}

// استخراج قيمة رقمية وعملة من نص السعر
function parsePrice(raw?: string): { currency?: string; value?: number } {
  if (!raw) return {};
  const MAP: Record<string,string> = {
    'KWD':'KWD','د.ك':'KWD','KD':'KWD',
    'SAR':'SAR','ر.س':'SAR','ريال':'SAR',
    'AED':'AED','د.إ':'AED',
    'USD':'USD','$':'USD'
  };
  // يدعم "12.50 KWD" أو "KWD 12.50" أو "ر.س 99"
  const m = raw.match(/([\d.,]+)\s*(KWD|د\.ك|KD|SAR|ر\.س|ريال|AED|د\.إ|USD|\$)/i)
        || raw.match(/(KWD|د\.ك|KD|SAR|ر\.س|ريال|AED|د\.إ|USD|\$)\s*([\d.,]+)/i);
  if (!m) return {};
  const num = parseFloat((m[1]||m[2]).replace(/,/g,''));
  const curKey = (m[2]||m[1]||'').toUpperCase();
  const cur = MAP[curKey];
  return { currency: cur, value: isNaN(num) ? undefined : num };
}

// توحيد/تنظيف نتيجة واحدة
function normalizeResult(r: SearchResult): SearchResult {
  // استنتاج الدومين إن لم يوجد
  if (!r.storeDomain) {
    const src = r.productUrl || r.imageUrl;
    const d = hostnameOf(src);
    if (d) {
      r.storeDomain = d;
      if (!r.store) r.store = d;
    }
  }

  // تحويل confidence% → similarity 0..1
  if (r.similarity == null && r.confidence != null && !isNaN(r.confidence)) {
    r.similarity = Math.max(0, Math.min(1, r.confidence / 100));
  }

  // السعر الرقمي
  if (r.price && (r.priceValue == null || !r.currency)) {
    const {currency, value} = parsePrice(r.price);
    if (currency) r.currency = currency;
    if (value != null) r.priceValue = value;
  }

  // البلد التقريبي
  if (!r.countryCode) r.countryCode = inferCountryFromDomain(r.storeDomain);

  return r;
}

// ترتيب + فلترة (90% فأعلى أولًا، ثم التشابه، ثم بلد المستخدم، ثم الأرخص)
export function rankAndFilter(
  items: SearchResult[],
  opts?: { userCountry?: string; minSimilarity?: number; onlyTrusted?: boolean; allowCrossBorder?: boolean }
) {
  const {
    userCountry = 'KW',
    minSimilarity = 0.60,
    onlyTrusted = false,     // افتراضيًا لا نحصر حتى لا تختفي النتائج لو كلها صور
    allowCrossBorder = true,
  } = opts || {};

  const cleaned = items.map(normalizeResult).filter(r => {
    if (r.similarity == null || r.similarity < minSimilarity) return false;
    if (onlyTrusted && !isTrustedStore(r.storeDomain)) return false;
    return true;
  });

  cleaned.sort((a,b) => {
    // 1) ≥90% أولًا
    const a90 = (a.similarity ?? 0) >= 0.90 ? 1 : 0;
    const b90 = (b.similarity ?? 0) >= 0.90 ? 1 : 0;
    if (a90 !== b90) return b90 - a90;

    // 2) التشابه نزولياً
    const sim = (b.similarity ?? 0) - (a.similarity ?? 0);
    if (Math.abs(sim) > 1e-6) return sim;

    // 3) بلد المستخدم أولاً
    const aLoc = a.countryCode === userCountry ? 1 : 0;
    const bLoc = b.countryCode === userCountry ? 1 : 0;
    if (aLoc !== bLoc) return bLoc - aLoc;

    // 4) السعر تصاعدياً
    const ap = a.priceValue ?? Number.POSITIVE_INFINITY;
    const bp = b.priceValue ?? Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;

    // 5) ثبات: اسم الدومين
    return (a.storeDomain||'').localeCompare(b.storeDomain||'');
  });

  return allowCrossBorder ? cleaned : cleaned.filter(r => r.countryCode === userCountry);
}

// ===================================================================

export class AIVisualSearchService {
  private static instance: AIVisualSearchService;
  static getInstance() {
    if (!AIVisualSearchService.instance) AIVisualSearchService.instance = new AIVisualSearchService();
    return AIVisualSearchService.instance;
  }

  // -------- Helpers --------

  private fileToDataURL(file: File) {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // تحويل HEIC/HEIF إلى JPEG (إن وُجد) ثم إرجاع DataURL
  private async toJpegDataURL(file: File): Promise<string> {
    const isHeic =
      /heic|heif/i.test(file.type) ||
      /\.hei[c|f]$/i.test(file.name);

    if (!isHeic) {
      // ليست HEIC: نرجّع الصورة كما هي
      return await this.fileToDataURL(file);
    }

    try {
      const { default: heic2any } = await import('heic2any');
      const jpegBlob = (await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92,
      })) as Blob;

      // حوّل الـ Blob الناتج إلى DataURL
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = reject;
        r.readAsDataURL(jpegBlob);
      });
    } catch {
      // لو failed لأي سبب، نرجع الملف كما هو بدل ما نكسر التدفق
      return await this.fileToDataURL(file);
    }
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // يقصّ أهم كائن حسب /api/localize ويعيد DataURL للصورة المقصوصة
  private async cropToPrimaryObject(originalDataUrl: string): Promise<string | null> {
    const locRes = await fetch('/api/localize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ imageBase64: originalDataUrl }),
      cache: 'no-store',
    });
    const loc = await locRes.json();
    if (!locRes.ok || !loc?.primary?.vertices) return null;

    const img = await this.loadImage(originalDataUrl);
    const v: Array<{ x: number; y: number }> = loc.primary.vertices;

    // احسب المستطيل (بنسب 0..1) مع هامش صغير
    let minX = Math.min(...v.map((p) => p.x));
    let maxX = Math.max(...v.map((p) => p.x));
    let minY = Math.min(...v.map((p) => p.y));
    let maxY = Math.max(...v.map((p) => p.y));

    const pad = 0.08; // 8% هامش
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(1, maxX + pad);
    maxY = Math.min(1, maxY + pad);

    const sx = Math.round(minX * img.naturalWidth);
    const sy = Math.round(minY * img.naturalHeight);
    const sw = Math.round((maxX - minX) * img.naturalWidth);
    const sh = Math.round((maxY - minY) * img.naturalHeight);

    if (sw <= 0 || sh <= 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    // @ts-ignore
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    // JPEG يقلّل الحجم ويكفي للبحث
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return croppedDataUrl;
  }

  // -------- Main --------

  /**
   * يرسل القصاصة (إن وُجدت) إلى /api/vision الذي يطلب WEB_DETECTION
   * ثم يُطبِّق الترتيب المطلوب:
   *  - ≥90% أولًا
   *  - ثم التشابه
   *  - ثم بلد المستخدم
   *  - ثم الأرخص
   */
  async analyzeImage(
    imageFile: File,
    opts?: { userCountry?: string; minSimilarity?: number; onlyTrusted?: boolean; allowCrossBorder?: boolean }
  ): Promise<AISearchResponse> {
    const t0 = performance.now();

    // 1) اقرأ الصورة كـ DataURL — مع تحويل HEIC → JPEG إن لزم
    const originalDataUrl = await this.toJpegDataURL(imageFile);

    // 2) جرّب قصّ الكائن الأساسي
    let toSend = originalDataUrl;
    try {
      const cropped = await this.cropToPrimaryObject(originalDataUrl);
      if (cropped) toSend = cropped;
    } catch {
      // لا شيء: نتابع بالصورة الأصلية
    }

    // 3) اطلب WEB_DETECTION (وملفاتنا الخلفية قد ترجع OCR أيضًا)
    const resp = await fetch(`/api/vision?ts=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ imageBase64: toSend }),
      cache: 'no-store',
    });

    const data = await resp.json();
    if (!resp.ok) {
      const msg = data?.message || data?.error || 'Vision API request failed';
      throw new Error(msg);
    }

    const resp0 = data?.responses?.[0] || {};
    const web = resp0?.webDetection || {};
    const bestGuess: string = web?.bestGuessLabels?.[0]?.label?.trim?.() || 'image';

    const fullImgs: string[] = (web?.fullMatchingImages || []).map((i: any) => i?.url).filter(Boolean);
    const partialImgs: string[] = (web?.partialMatchingImages || []).map((i: any) => i?.url).filter(Boolean);
    const similarImgs: string[] = (web?.visuallySimilarImages || []).map((i: any) => i?.url).filter(Boolean);

    const pages: Array<{ url: string; title?: string }> =
      (web?.pagesWithMatchingImages || [])
        .map((p: any) => ({ url: p?.url, title: p?.pageTitle }))
        .filter((p: any) => !!p.url);

    // نبني Products (صور مطابقة/مشابهة + صفحات)
    let imgProducts: SearchResult[] = [
      ...fullImgs.map((url, idx) => ({
        id: `img-full-${idx + 1}`,
        name: bestGuess,
        imageUrl: url,
        productUrl: undefined,
        store: hostnameOf(url),
        storeDomain: hostnameOf(url),
        confidence: 95,
        similarity: 0.95,
        description: 'Full matching image',
      })),
      ...partialImgs.map((url, idx) => ({
        id: `img-partial-${idx + 1}`,
        name: bestGuess,
        imageUrl: url,
        productUrl: undefined,
        store: hostnameOf(url),
        storeDomain: hostnameOf(url),
        confidence: 85,
        similarity: 0.85,
        description: 'Partial matching image',
      })),
      ...similarImgs.map((url, idx) => ({
        id: `img-similar-${idx + 1}`,
        name: bestGuess,
        imageUrl: url,
        productUrl: undefined,
        store: hostnameOf(url),
        storeDomain: hostnameOf(url),
        confidence: 70,
        similarity: 0.70,
        description: 'Visually similar image',
      })),
    ];

    let pageProducts: SearchResult[] = pages.map((p, idx) => ({
      id: `page-${idx + 1}`,
      name: p.title?.trim() || bestGuess,
      productUrl: p.url,
      store: hostnameOf(p.url),
      storeDomain: hostnameOf(p.url),
      description: 'Page with matching images',
      // مبدئيًا بدون سعر — ممكن لاحقًا استخراج schema.org/Offer
    }));

    const combinedRaw: SearchResult[] = [...imgProducts, ...pageProducts];

    // تنظيف + إزالة التكرار
    const normalized = combinedRaw.map(normalizeResult);
    const deduped = uniq(normalized, (x) => String(x.imageUrl || x.productUrl || x.name));

    // ترتيب حسب المطلوب
    const ranked = rankAndFilter(deduped, {
      userCountry: opts?.userCountry ?? 'KW',
      minSimilarity: opts?.minSimilarity ?? 0.60,
      onlyTrusted: opts?.onlyTrusted ?? false,      // يمكنك تمرير true من الواجهة لعرض متاجر فقط
      allowCrossBorder: opts?.allowCrossBorder ?? true,
    }).slice(0, 30);

    return {
      products: ranked,
      searchQuery: bestGuess + (toSend !== originalDataUrl ? ' · cropped' : ''),
      processingTime: Math.round((performance.now() - t0)) / 1000,
      userCountry: opts?.userCountry ?? 'KW',
    };
  }

  // بحث نصي (مستقبلاً)
  async searchByText(query: string): Promise<AISearchResponse> {
    return { products: [], searchQuery: query, processingTime: 0.2 };
  }
}
