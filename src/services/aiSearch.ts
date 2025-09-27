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

  private fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => {
        const dataUrl = String(r.result || '');
        // نرجّع RAW base64 لأن الـ API يتعامل مع الاثنين
        resolve(dataUrl.split(',')[1] || '');
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // يرسل للصندوق الخلفي /api/vision (اللي صار يطلب WEB_DETECTION)
  async analyzeImage(imageFile: File): Promise<AISearchResponse> {
    const t0 = performance.now();
    const imageBase64 = await this.fileToBase64(imageFile);

    const resp = await fetch(`/api/vision?ts=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ imageBase64 }),
      cache: 'no-store',
    });

    const data = await resp.json();
    if (!resp.ok) {
      // نحاول إظهار رسالة مفهومة إن توفرت
      const msg = data?.message || data?.error || 'Vision API request failed';
      throw new Error(msg);
    }

    const resp0 = data?.responses?.[0] || {};
    const web = resp0?.webDetection || {};

    const bestGuess: string =
      web?.bestGuessLabels?.[0]?.label?.trim?.() ||
      'image';

    // صور من Google Vision
    const fullImgs: string[] = (web?.fullMatchingImages || []).map((i: any) => i?.url).filter(Boolean);
    const partialImgs: string[] = (web?.partialMatchingImages || []).map((i: any) => i?.url).filter(Boolean);
    const similarImgs: string[] = (web?.visuallySimilarImages || []).map((i: any) => i?.url).filter(Boolean);

    // صفحات فيها صور مطابقة/مشابهة
    const pages: Array<{ url: string; title?: string }> =
      (web?.pagesWithMatchingImages || [])
        .map((p: any) => ({ url: p?.url, title: p?.pageTitle }))
        .filter((p: any) => !!p.url);

    // نبني Products من الصور أولاً
    let imgProducts: SearchResult[] = [
      ...fullImgs.map((url, idx) => ({
        id: `img-full-${idx + 1}`,
        name: bestGuess,
        imageUrl: url,
        productUrl: undefined,
        store: hostnameOf(url),
        confidence: 95, // افتراضي أعلى للـ full match
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

    // ومن الروابط (صفحات) – غالبًا متاجر/مراجعات/منتديات
    let pageProducts: SearchResult[] = pages.map((p, idx) => ({
      id: `page-${idx + 1}`,
      name: p.title?.trim() || bestGuess,
      productUrl: p.url,
      store: hostnameOf(p.url),
      description: 'Page with matching images',
      // ما عندنا صورة من العنصر نفسه، نخليه فارغ
    }));

    // ندمج ونزيل التكرار حسب الـ URL (imageUrl أو productUrl)
    const combinedRaw: SearchResult[] = [...imgProducts, ...pageProducts];

    const combined = uniq(combinedRaw, (x) => String(x.imageUrl || x.productUrl || x.name));

    // نحد العدد (مثلاً 30) حتى ما نغرق الواجهة
    const products = combined.slice(0, 30);

    return {
      products,
      searchQuery: bestGuess,
      processingTime: Math.round((performance.now() - t0)) / 1000,
    };
  }

  // بحث نصي (مستقبلاً)
  async searchByText(query: string): Promise<AISearchResponse> {
    return { products: [], searchQuery: query, processingTime: 0.2 };
  }
}
