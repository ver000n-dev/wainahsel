import React from 'react';
import { Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AIVisualSearchService } from '../services/aiSearch';
import SearchResults from './SearchResults';
import LoadingOverlay from './LoadingOverlay';

interface SearchSectionProps {
  onSearchStart?: () => void;
  onSearchComplete?: () => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ onSearchStart, onSearchComplete }) => {
  const { t, isRTL } = useLanguage();

  const [isLoading, setIsLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  // ✅ خدمة التحليل (تشوفها تحت في services/aiSearch.ts)
  const aiSearchService = React.useMemo(() => AIVisualSearchService.getInstance(), []);

  // 🔐 تأكد من وجود المفتاح قبل البدء
  const visionKey = import.meta.env.VITE_VISION_API_KEY as string | undefined;

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
      if (!visionKey) {
        // المفتاح غير موجود – لا نكسر الصفحة
        setError('مفتاح خدمة الرؤية مفقود. تأكد من ضبط VITE_VISION_API_KEY في Vercel ثم أعد النشر.');
        return;
      }
      // استدعاء الخدمة
      const results = await aiSearchService.analyzeImage(file);
      setSearchResults(results);
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
    if (opts?.capture) (input as any).capture = opts.capture;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImageSearch(file);
    };
    input.click();
  };

  return (
    <div className="space-y-8">
      <div className={`grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Find Products Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('findProducts')}</h2>
              <p className="text-white/70 leading-relaxed">{t('findProductsDesc')}</p>
            </div>
          </div>

          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
            <button
              disabled={isLoading}
              onClick={() => openPicker({ capture: 'environment' })}
              className={`flex-1 ${isLoading ? 'opacity-60 cursor-not-allowed' : ''} bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400`}
            >
              <Camera className="w-5 h-5" />
              <span className="font-medium">{t('takePhoto')}</span>
            </button>

            <button
              disabled={isLoading}
              onClick={() => openPicker()}
              className={`flex-1 ${isLoading ? 'opacity-60 cursor-not-allowed' : ''} bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400 border border-white/20`}
            >
              <Upload className="w-5 h-5" />
              <span className="font-medium">{t('uploadImage')}</span>
            </button>
          </div>

          {/* وواتساب التجريبي يبقى كما هو */}
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <p style={{ fontWeight: "bold", marginBottom: "10px" }}>
              🚀 إطلاق تجريبي
              <br />
              إذا ودك نبحث لك عن المنتج، أرسل لنا صورة ونرد عليك بأسرع وقت إن شاء الله
            </p>
            <a
              href="https://nam10.safelinks.protection.outlook.com/?url=https%3A%2F%2Fwa.me%2F96560089181&data=05%7C02%7Caqnk%40chevron.com%7Cd723f4a08ed34ceeb46308ddfcc6524e%7Cfd799da1bfc14234a91c72b3a1cb9e26%7C0%7C0%7C638944650891718872%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=fMF9%2BRsT%2Br6qFB60YEKtloyzcSSqeQ%2BcP9zwn8QamB0%3D&reserved=0"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "12px 20px",
                borderRadius: "8px",
                backgroundColor: "#25D366",
                color: "#fff",
                fontWeight: "bold",
                textDecoration: "none",
              }}
            >
              📷 أرسل صورة على واتساب
            </a>
          </div>

          <p className="text-xs text-white/50 text-center leading-relaxed">{t('supportedFormats')}</p>
        </div>

        {/* Ready to Search Card */}
        <div className="bg-gradient-to-br from-purple-500/20 to-blue-600/20 backdrop-blur-sm border border-white/20 rounded-3xl p-8 flex flex-col justify-center">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto border border-white/20">
              <div className="w-12 h-12 border-2 border-white/50 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">{t('readyToSearch')}</h2>
              <p className="text-white/80 leading-relaxed text-lg">{t('readyToSearchDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      <LoadingOverlay isVisible={isLoading} />

      {searchResults && (
        <SearchResults
          results={searchResults.products}
          searchQuery={searchResults.searchQuery}
          processingTime={searchResults.processingTime}
          onClose={() => setSearchResults(null)}
        />
      )}

      {error && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl p-8 max-w-sm w-full text-center ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
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
