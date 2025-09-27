// src/services/aiSearch.ts

export interface SearchResult {
  id: string;
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  store?: string;
  imageUrl?: string;
  productUrl?: string;
  confidence?: number; // %
}

export interface AISearchResponse {
  products: SearchResult[];
  searchQuery: string;
  processingTime: number;
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

    // احسب المستطيل (بنسب 0..1) + هامش صغير
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

  // يرسل القصاصة (إن وُجدت) إلى /api/vision الذي يطلب WEB_DETECTION
  async analyzeImage(imageFile: File): Promise<AISearchResponse> {
    const t0 = performance.now();

    // 1) اقرأ الصورة كـ DataURL
    const originalDataUrl = await this.fileToDataURL(imageFile);

    // 2) جرّب قصّ الكائن الأساسي
    let toSend = originalDataUrl;
    try {
      const cropped = await this.cropToPrimaryObject(originalDataUrl);
      if (cropped) toSend = cropped;
    } catch {
      // لا شيء: نتابع بالصورة الأصلية
    }

    // 3) اطلب WEB_DETECTION
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

    // نبني Products
    let imgProducts: SearchResult[] = [
      ...fullImgs.map((url, idx) => ({
        id: `img-full-${idx + 1}`,
        name: bestGuess,
        imageUrl: url,
        productUrl: undefined,
        store: hostnameOf(url),
        confidence: 95,
        description: 'Full matching image',
      })),
      ...partialImgs.map((url, idx) => ({
        id: `img-partial-${idx + 1}`,
        name: bestGuess,
        imageUrl: url,
        productUrl: undefined,
        store: hostnameOf(url),
        confidence: 85,
        description: 'Partial matching image',
      })),
      ...similarImgs.map((url, idx) => ({
        id: `img-similar-${idx + 1}`,
        name: bestGuess,
        imageUrl: url,
        productUrl: undefined,
        store: hostnameOf(url),
        confidence: 70,
        description: 'Visually similar image',
      })),
    ];

    let pageProducts: SearchResult[] = pages.map((p, idx) => ({
      id: `page-${idx + 1}`,
      name: p.title?.trim() || bestGuess,
      productUrl: p.url,
      store: hostnameOf(p.url),
      description: 'Page with matching images',
    }));

    const combinedRaw: SearchResult[] = [...imgProducts, ...pageProducts];
    const products = uniq(combinedRaw, (x) => String(x.imageUrl || x.productUrl || x.name)).slice(0, 30);

    return {
      products,
      searchQuery: bestGuess + (toSend !== originalDataUrl ? ' · cropped' : ''),
      processingTime: Math.round((performance.now() - t0)) / 1000,
    };
  }

  // بحث نصي (مستقبلاً)
  async searchByText(query: string): Promise<AISearchResponse> {
    return { products: [], searchQuery: query, processingTime: 0.2 };
  }
}
