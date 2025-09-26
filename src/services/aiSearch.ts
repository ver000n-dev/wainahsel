// src/services/aiSearch.ts

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  price?: string;
  currency?: string;
  store?: string;
  imageUrl?: string;
  productUrl?: string;
  confidence?: number;
}

export interface AISearchResponse {
  products: SearchResult[];
  searchQuery: string;
  processingTime: number;
}

export class AIVisualSearchService {
  private static instance: AIVisualSearchService;
  static getInstance() {
    if (!AIVisualSearchService.instance) {
      AIVisualSearchService.instance = new AIVisualSearchService();
    }
    return AIVisualSearchService.instance;
  }

  private get apiKey(): string {
    const key = import.meta.env.VITE_VISION_API_KEY as string | undefined;
    if (!key) throw new Error('VITE_VISION_API_KEY is missing');
    return key;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => {
        try {
          const base64 = (r.result as string).split(',')[1];
          resolve(base64);
        } catch (e) { reject(e); }
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // تحليل الصورة عبر Google Vision (LABEL_DETECTION)
  async analyzeImage(imageFile: File): Promise<AISearchResponse> {
    const t0 = performance.now();
    const imageBase64 = await this.fileToBase64(imageFile);

    const resp = await fetch(
      `https://nam10.safelinks.protection.outlook.com/?url=https%3A%2F%2Fvision.googleapis.com%2Fv1%2Fimages%3Aannotate%3Fkey%3D%24&data=05%7C02%7Caqnk%40chevron.com%7C6f3c6451b9b24665532608ddfcc7e3ec%7Cfd799da1bfc14234a91c72b3a1cb9e26%7C0%7C0%7C638944657667284331%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=8G4sONMNrzNgBEB95I3z%2FLM70Cuv79jMJ4m2YsWi8Bo%3D&reserved=0{this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'LABEL_DETECTION', maxResults: 5 }]
          }]
        })
      }
    );

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Vision API error:', data);
      throw new Error('Vision API request failed');
    }

    const labels = (data?.responses?.[0]?.labelAnnotations ?? []) as Array<any>;

    // نحول الليبلات إلى شكل المنتجات المتوقَّع من SearchResults
    const products: SearchResult[] = labels.map((x: any, i: number) => ({
      id: `label-${i}`,
      name: x.description,
      description: `Confidence ${(x.score * 100).toFixed(1)}%`,
      confidence: x.score,
      // الحقول التالية اختيارية لعدم توفرها من Vision مباشرة:
      price: undefined, currency: undefined, store: undefined, imageUrl: undefined, productUrl: '#'
    }));

    const processingTime = Math.round(performance.now() - t0);

    return {
      products,
      searchQuery: products[0]?.name ?? 'image',
      processingTime
    };
  }

  // (اختياري) بحث نصي بسيط للاستخدام لاحقاً
  async searchByText(query: string): Promise<AISearchResponse> {
    return {
      products: [{ id: 'q-1', name: query, description: 'Text search stub' }],
      searchQuery: query,
      processingTime: 200
    };
  }
}
