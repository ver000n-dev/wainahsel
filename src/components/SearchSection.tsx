// src/components/SearchSection.tsx

import React from 'react';
import { Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AIVisualSearchService, rankAndFilter } from '../services/aiSearch';
import SearchResults from './SearchResults';
import LoadingOverlay from './LoadingOverlay';

// 🟣 دالة تجهيز رابط الأفلييت
function buildAffiliateUrl(originalUrl: string) {
  if (!originalUrl) return originalUrl;

  const affId = "wainahsel-1"; // ← غيّرها لاحقاً إذا صار عندك Affiliate ID حقيقي
  const url = new URL(originalUrl);

  url.searchParams.set("utm_source", "wainahsel");
  url.searchParams.set("utm_medium", "visual_search");
  url.searchParams.set("utm_campaign", "affiliate");
  url.searchParams.set("aff_id", affId);

  return url.toString();
}

interface SearchSectionProps {
  onSearchStart?: () => void;
  onSearchComplete?: () => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ onSearchStart, onSearchComplete }) => {
  const { t, isRTL } = useLanguage();

  const [isLoading, setIsLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const userCountry = 'KW';

  const aiSearchService = React.useMemo(
    () => AIVisualSearchService.getInstance(),
    []
  );

  const start = () => {
    setIsLoading(true);
    setError(null);
    onSearchStart?.();
  };

  const finish = () => {
    setIsLoading(false);
    onSearchComplete?.();
  };

  const handleImageSearch = async (file: File) => {
    start();
    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const resp = await aiSearchService.analyzeImage(file, {
        userCountry,
        minSimilarity: 0.60,
        onlyTrusted: true,
        allowCrossBorder: true
      });

      // 🔥 فلترة وترتيب النتائج
      const ranked = rankAndFilter(resp.products, {
        userCountry,
        minSimilarity: 0.60,
        onlyTrusted: true,
        allowCrossBorder: true,
      });

      // 🔥 تعديل كل رابط وإضافة أفلييت
      const affiliateReady = ranked.map((item: any) => ({
        ...item,
        productUrl: buildAffiliateUrl(item.productUrl),
      }));

      // 🔥 حفظ النتائج الجديدة
      setSearchResults({
        ...resp,
        products: affiliateReady,
        userCountry
      });

    } catch (err) {
      console.error(err);
      setError(t('searchErrorDesc'));
    } finally {
      finish();
    }
  };

  const openPicker = (opts?: { capture?: 'environment' | 'user' }) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (opts?.capture) input.setAttribute('capture', opts.capture);
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImageSearch(file);
    };
    input.click();
  };

  const handleCloseResults = () => {
    setSearchResults(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="space-y-8">
      <div
        className={`grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto ${isRTL ? 'font-arabic' : ''}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* ... باقي الأكواد كما هي بدون أي تغيير ... */}

      </div>

      <LoadingOverlay isVisible={isLoading} />

      {searchResults && (
        <SearchResults
          results={searchResults.products}
          searchQuery={searchResults.searchQuery}
          processingTime={searchResults.processingTime}
          onClose={handleCloseResults}
          imagePreview={previewUrl}
        />
      )}

      {error && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`bg-white rounded-2xl p-8 max-w-sm w-full text-center ${
              isRTL ? 'font-arabic' : ''
            }`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('searchError')}</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => setError(null)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2 px-6 transition-colors"
            >
              {t('tryAgain')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchSection;
