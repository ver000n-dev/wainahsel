// src/components/SearchResults.tsx
import React from 'react';
import { X, Tag, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { SearchResult } from '../services/aiSearch';
import { buildAffiliateUrl } from './SearchSection';

interface Props {
  results: SearchResult[];
  searchQuery: string;
  processingTime: number;
  onClose: () => void;
  imagePreview?: string | null;
}

const fmtPercent = (v?: number) =>
  typeof v === 'number' ? `${Math.round(v * 100)}%` : '—';

const fmtPrice = (price?: string, val?: number, cur?: string) =>
  price
    ? price
    : val != null && cur
    ? `${val.toFixed(2)} ${cur}`
    : '—';

const SearchResults: React.FC<Props> = ({
  results,
  searchQuery,
  processingTime,
  onClose,
  imagePreview,
}) => {
  const { isRTL, t } = useLanguage();

  // 🔒 اقفل تمرير الصفحة الخلفية
  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // ⌨️ إغلاق بزر Esc
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // إغلاق عند الضغط على الخلفية
  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const aff = (url?: string | null) =>
    url ? buildAffiliateUrl(url) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="h-full w-full flex items-start justify-center p-4 md:p-6 overflow-hidden">
        <div
          className="w-full max-w-5xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600">
            <div className="text-white">
              <div className="font-bold">{t('searchResults') ?? 'نتائج البحث'}</div>
              <div className="text-white/90 text-sm">
                {searchQuery} · {processingTime}s · {(t('products') ?? 'المنتجات')} {results.length}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/90 hover:text-white p-2 rounded-lg hover:bg-white/10"
              aria-label={t('close') ?? 'إغلاق'}
            >
              <X size={18} />
            </button>
          </div>

          {/* المحتوى */}
          <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 96px)' }}>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="preview"
                className="w-full max-h-72 object-contain rounded-xl my-6 bg-white/5"
              />
            )}

            {results.length === 0 ? (
              <div className="text-center text-white/70 py-10">
                {t('noResults') ?? 'ما في نتائج واضحة للصورة.'}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((r) => {
                  const cardHref = aff(r.productUrl || r.imageUrl);
                  const buttonHref = aff(r.productUrl ?? undefined);

                  return (
                    <div
                      key={r.id}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                    >
                      {/* الصورة */}
                      {r.imageUrl ? (
                        cardHref ? (
                          <a
                            href={cardHref}
                            target="_blank"
                            rel="nofollow sponsored noopener noreferrer"
                            title={r.name}
                          >
                            <img
                              src={r.imageUrl}
                              alt={r.name}
                              className="w-full h-40 object-cover"
                              loading="lazy"
                            />
                          </a>
                        ) : (
                          <img
                            src={r.imageUrl}
                            alt={r.name}
                            className="w-full h-40 object-cover"
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="w-full h-40 bg-slate-800 flex items-center justify-center text-white/50 text-sm">
                          {t('noImage') ?? 'لا توجد صورة'}
                        </div>
                      )}

                      {/* التفاصيل */}
                      <div className="p-4 space-y-2 grow">
                        <div className="flex items-center gap-2 text-white font-medium">
                          <Tag size={16} />
                          <span className="line-clamp-2">{r.name}</span>
                        </div>

                        {/* اسم الموقع */}
                        {r.storeDomain && (
                          <div className="text-xs text-white/70">
                            🏪 {t('store') ?? 'المتجر'}: {r.storeDomain}
                          </div>
                        )}

                        {/* نسبة التشابه */}
                        {typeof r.similarity === 'number' && (
                          <div className="text-xs text-emerald-400">
                            🎯 {(t('similarity') ?? 'نسبة التطابق')}: {fmtPercent(r.similarity)}
                          </div>
                        )}

                        {/* السعر */}
                        {(r.price || r.priceValue) && (
                          <div className="text-sm text-white/90">
                            💰 {(t('price') ?? 'السعر')}: {fmtPrice(r.price, r.priceValue, r.currency)}
                          </div>
                        )}

                        {/* الدولة */}
                        {r.countryCode && (
                          <div className="text-xs text-white/60">
                            🌍 {(t('country') ?? 'الدولة')}: {r.countryCode}
                          </div>
                        )}
                      </div>

                      {/* الزر */}
                      <div className="p-4 pt-0 flex items-center gap-2">
                        {buttonHref && (
                          <a
                            href={buttonHref}
                            target="_blank"
                            rel="nofollow sponsored noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
                          >
                            <ExternalLink size={14} />
                            {t('visitLink') ?? 'زيارة الرابط'}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-xs text-white/40 mt-4">
              ⏱ {(t('processingTime') ?? 'زمن المعالجة')}: {processingTime}s
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
