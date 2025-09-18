import React from 'react';
import { ExternalLink, Star, Clock, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { SearchResult } from '../services/aiSearch';

interface SearchResultsProps {
  results: SearchResult[];
  searchQuery: string;
  processingTime: number;
  onClose: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ 
  results, 
  searchQuery, 
  processingTime, 
  onClose 
}) => {
  const { t, isRTL } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between mb-4`}>
            <h2 className="text-2xl font-bold">{t('searchResults')}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              ×
            </button>
          </div>
          
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-4 text-sm text-white/80`}>
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2`}>
              <Zap className="w-4 h-4" />
              <span>{t('query')}: {searchQuery}</span>
            </div>
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2`}>
              <Clock className="w-4 h-4" />
              <span>{processingTime}s</span>
            </div>
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2`}>
              <Star className="w-4 h-4" />
              <span>{results.length} {t('products')}</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((product) => (
              <div key={product.id} className="bg-gray-50 rounded-xl p-4 hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-white rounded-lg mb-4 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  
                  <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between`}>
                    <div className="text-lg font-bold text-purple-600">
                      {product.price} {product.currency}
                    </div>
                    <div className="text-sm text-gray-500">{product.store}</div>
                  </div>
                  
                  <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between pt-2`}>
                    <div className="text-xs text-green-600">
                      {Math.round(product.confidence * 100)}% {t('match')}
                    </div>
                    <button className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-1 text-blue-600 hover:text-blue-700 text-sm`}>
                      <ExternalLink className="w-4 h-4" />
                      <span>{t('viewProduct')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;