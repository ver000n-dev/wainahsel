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
    if (!key) {
      throw new Error('❌ API key is missing. Add VITE_VISION_API_KEY in Vercel settings.');
    }
    return key;
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async analyzeImage(imageFile: File): Promise<AISearchResponse> {
    const started = performance.now();

    // 1. نحول الصورة إلى Base64
    const imageBase64 = await this.fileToBase64(imageFile);

    // 2. نرسلها إلى Google Vision API
    const response = await fetch(
      `https://nam10.safelinks.protection.outlook.com/?url=https%3A%2F%2Fvision.googleapis.com%2Fv1%2Fimages%3Aannotate%3Fkey%3D%24&data=05%7C02%7Caqnk%40chevron.com%7Cb1b4bf616a924e392c8b08ddfcc6f71d%7Cfd799da1bfc14234a91c72b3a1cb9e26%7C0%7C0%7C638944653677533301%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=1Ke5XwtOLnfZRWgKVXgTeWGnOg3vszRt8%2FC4BaRbil0%3D&reserved=0{this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: 'LABEL_DETECTION', maxResults: 5 }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Vision API Error:', data);
      throw new Error('Vision API request failed');
    }

    const labels =
      data?.responses?.[0]?.labelAnnotations?.map((label: any, index: number) => ({
        id: `label-${index}`,
        name: label.description,
        description: `Confidence: ${(label.score * 100).toFixed(1)}%`,
        confidence: label.score,
      })) ?? [];

    const ms = Math.round(performance.now() - started);

    return {
      products: labels,
      searchQuery: labels[0]?.name ?? 'unknown',
      processingTime: ms,
    };
  }

  // يمكن استخدامه مستقبلاً للبحث النصي
  async searchByText(query: string): Promise<AISearchResponse> {
    return {
      products: [
        {
          id: '1',
          name: query,
          description: 'نتيجة تجريبية للبحث النصي',
        },
      ],
      searchQuery: query,
      processingTime: 500,
    };
  }
}
