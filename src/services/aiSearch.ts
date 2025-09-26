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

export class AIVisualSearchService {
  private static instance: AIVisualSearchService;
  static getInstance() {
    if (!AIVisualSearchService.instance) AIVisualSearchService.instance = new AIVisualSearchService();
    return AIVisualSearchService.instance;
  }

  private fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // يرسل للصندوق الخلفي /api/vision
  async analyzeImage(imageFile: File): Promise<AISearchResponse> {
    const t0 = performance.now();
    const imageBase64 = await this.fileToBase64(imageFile);

    const resp = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 })
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data?.message || 'Vision API request failed');
    }

    const labels = (data?.responses?.[0]?.labelAnnotations ?? []) as Array<any>;

    const products: SearchResult[] = labels.map((x: any, i: number) => ({
      id: String(i + 1),
      name: x.description,
      description: '', // نتركها فاضية الآن
      confidence: Number((x.score * 100).toFixed(2)), // كنسبة مئوية
      imageUrl: '',      // ما في صورة من Vision
      productUrl: ''     // ما في رابط شراء الآن
    }));

    return {
      products,
      searchQuery: labels?.[0]?.description ?? 'image',
      processingTime: Math.round(performance.now() - t0) / 1000
    };
  }

  // بحث نصي (مستقبلاً)
  async searchByText(query: string): Promise<AISearchResponse> {
    return { products: [], searchQuery: query, processingTime: 0.2 };
  }
}
