export interface SearchResult {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  store: string;
  imageUrl: string;
  productUrl: string;
  confidence: number;
}

export interface AISearchResponse {
  products: SearchResult[];
  searchQuery: string;
  processingTime: number;
}

// Mock AI visual search service
export class AIVisualSearchService {
  private static instance: AIVisualSearchService;
  
  public static getInstance(): AIVisualSearchService {
    if (!AIVisualSearchService.instance) {
      AIVisualSearchService.instance = new AIVisualSearchService();
    }
    return AIVisualSearchService.instance;
  }

  async analyzeImage(imageFile: File): Promise<AISearchResponse> {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock AI analysis results
    const mockProducts: SearchResult[] = [
      {
        id: '1',
        name: 'Wireless Bluetooth Headphones',
        description: 'Premium noise-cancelling wireless headphones with 30-hour battery life',
        price: '299.99',
        currency: 'SAR',
        store: 'Amazon',
        imageUrl: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=300',
        productUrl: '#',
        confidence: 0.95
      },
      {
        id: '2',
        name: 'Sony WH-1000XM4',
        description: 'Industry-leading noise canceling with Dual Noise Sensor technology',
        price: '449.99',
        currency: 'SAR',
        store: 'Jarir',
        imageUrl: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=300',
        productUrl: '#',
        confidence: 0.88
      },
      {
        id: '3',
        name: 'Apple AirPods Pro',
        description: 'Active Noise Cancellation for immersive sound',
        price: '899.99',
        currency: 'SAR',
        store: 'iStyle',
        imageUrl: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=300',
        productUrl: '#',
        confidence: 0.82
      }
    ];

    return {
      products: mockProducts,
      searchQuery: 'Wireless headphones',
      processingTime: 2.1
    };
  }

  async searchByText(query: string): Promise<AISearchResponse> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockProducts: SearchResult[] = [
      {
        id: '4',
        name: query,
        description: `High-quality ${query} with excellent features`,
        price: '199.99',
        currency: 'SAR',
        store: 'Noon',
        imageUrl: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=300',
        productUrl: '#',
        confidence: 0.90
      }
    ];

    return {
      products: mockProducts,
      searchQuery: query,
      processingTime: 1.2
    };
  }
}