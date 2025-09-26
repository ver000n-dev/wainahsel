// src/services/aiSearch.ts
export interface SearchResult {
  id: string; name: string; description: string;
  price?: string; currency?: string; store?: string;
  imageUrl?: string; productUrl?: string; confidence?: number;
}
export interface AISearchResponse {
  products: SearchResult[]; searchQuery: string; processingTime: number;
}

export class AIVisualSearchService {
  private static instance: AIVisualSearchService;
  static getInstance() {
    if (!AIVisualSearchService.instance) AIVisualSearchService.instance = new AIVisualSearchService();
    return AIVisualSearchService.instance;
  }

  private get apiKey(): string {
    const k = import.meta.env.VITE_VISION_API_KEY as string | undefined;
    if (!k) throw new Error('VITE_VISION_API_KEY is missing');
    return k;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve((r.result as string).split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // تحليل الصورة عبر Google Vision
  async analyzeImage(imageFile: File): Promise<AISearchResponse> {
    console.log('🔎 Vision API LIVE: analyzeImage()');
    const t0 = performance.now();
    const imageBase64 = await this.fileToBase64(imageFile);

    const resp = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
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
    if (!resp.ok) { console.error('Vision API error:', data); throw new Error('Vision API request failed'); }

    const labels = (data?.responses?.[0]?.labelAnnotations ?? []) as Array<any>;
    const products: SearchResult[] = labels.map((x: any, i: number) => ({
      id: `label-${i}`,
      name: x.description,
      description: `Confidence ${(x.score * 100).toFixed(1)}%`,
      confidence: x.score,
      productUrl: '#'
    }));

    return {
      products,
      searchQuery: products[0]?.name ?? 'image',
      processingTime: Math.round(performance.now() - t0)
    };
  }

  // (اختياري) بحث نصي بسيط
  async searchByText(query: string): Promise<AISearchResponse> {
    return { products: [{ id:'q-1', name: query, description: 'Text search stub' }], searchQuery: query, processingTime: 200 };
  }
}
