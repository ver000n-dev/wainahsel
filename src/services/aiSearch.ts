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

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ✅ يرسل الصورة إلى /api/vision (سيرفر Vercel) ويرجع ليبلات Vision
  async analyzeImage(imageFile: File): Promise<AISearchResponse> {
    console.log('🔎 analyzeImage(): sending to /api/vision');
    const t0 = performance.now();

    const imageBase64 = await this.fileToBase64(imageFile);

    const resp = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('❌ Vision API error via /api/vision:', data);
      throw new Error('Vision API request failed');
    }

    const labels = (data?.responses?.[0]?.labelAnnotations ?? []) as Array<any>;

    const products: SearchResult[] = labels.map((x: any, i: number) => ({
      id: `label-${i}`,
      name: x.description,
      description: `Confidence ${(x.score * 100).toFixed(1)}%`,
      confidence: x.score,
      productUrl: '#',
    }));

    return {
      products,
      searchQuery: products[0]?.name ?? 'image',
      processingTime: Math.round(performance.now() - t0),
    };
  }

  // (اختياري) بحث نصي مستقبلاً
  async searchByText(query: string): Promise<AISearchResponse> {
    return {
      products: [{ id: 'q-1', name: query, description: 'Text search stub' }],
      searchQuery: query,
      processingTime: 200,
    };
  }
}
