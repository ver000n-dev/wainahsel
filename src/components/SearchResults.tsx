// src/components/SearchResults.tsx
import React from 'react';
import { X, Tag, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { SearchResult } from '../services/aiSearch';

interface Props {
  results: SearchResult[];
  searchQuery: string;
  processingTime: number;
  onClose: () => void;
  imagePreview?: string | null;
}

const badgeColor = (desc?: string) => {
  if (!desc) return 'bg-slate-700 text-white/90';
  const d = desc.toLowerCase();
  if (d.includes('full')) return 'bg-emerald-600 text-white';
  if (d.includes('partial')) return 'bg-amber-600 text-white';
  if (d.includes('similar')) return 'bg-indigo-600 text-white';
  return 'bg-slate-700 text-white/90';
};

const fmtPct = (v?: number) =>
  typeof v === 'number' ? `${Math.round(v)}%` : '';

const SearchResults: React.FC<Props> = ({
  results,
  searchQuery,
  processingTime,
  onClose,
  imagePreview
}) => {
  const { isRTL, t } = useLanguage();

  // 🔒 اقفل تمرير الصفحة الخلفية عند فتح النافذة
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-5xl rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">

        {/* Header — ثابت داخل المودال */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 sticky top-0 z-10">
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

        {/* Body — يتمرّج داخل المودال */}
        <div className="p-6 overflow-y-auto max-h-[85vh]">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="preview"
              className="w-full max-h-72 object-contain rounded-xl mb-6 bg-white/5"
            />
          )}

          {results.length === 0 ? (
            <div className="text-center text-white/70 py-10">
              {t('noResults') ?? 'ما في نتائج واضحة للصورة.'}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                >
                  {/* صورة النتيجة */}
                  {r.imageUrl ? (
                    <a
                      href={r.productUrl || r.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
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
                    <div className="w-full h-40 bg-slate-800 flex items-center justify-center text-white/50 text-sm">
                      {t('noImage') ?? 'لا توجد صورة'}
                    </div>
                  )}

                  {/* معلومات النتيجة */}
                  <div className="p-4 space-y-2 grow">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Tag size={16} />
                      <span className="line-clamp-2">{r.name}</span>
                    </div>

                    {/* نوع المطابقة */}
                    {r.description && (
                      <div
                        className={`inline-block text-xs px-2 py-1 rounded-full ${badgeColor(r.description)}`}
                      >
                        {r.description}
                      </div>
                    )}

                    {/* المتجر / الموقع */}
                    {r.store && (
                      <div className="text-xs text-white/70">
                        {t('store') ?? 'المتجر'}: {r.store}
                      </div>
                    )}

                    {/* الثقة */}
                    {typeof r.confidence === 'number' && (
                      <div className="text-xs text-emerald-400">
                        {(t('confidence') ?? 'الثقة')}: {fmtPct(r.confidence)}
                      </div>
                    )}

                    {/* السعر (إن وُجد مستقبلًا من OCR) */}
                    {(r.price || r.currency) && (
                      <div className="text-sm text-white/90">
                        {(t('price') ?? 'السعر')}: {r.price} {r.currency || ''}
                      </div>
                    )}
                  </div>

                  {/* أزرار الحركة */}
                  <div className="p-4 pt-0 flex items-center gap-2">
                    {r.productUrl && (
                      <a
                        href={r.productUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
                      >
                        <ExternalLink size={14} />
                        {t('visitLink') ?? 'زيارة الرابط'}
                      </a>
                    )}
                    {r.imageUrl && !r.productUrl && (
                      <a
                        href={r.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
                      >
                        <ExternalLink size={14} />
                        {t('openImage') ?? 'فتح الصورة'}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-white/40 mt-4">
            ⏱ {(t('processingTime') ?? 'زمن المعالجة')}: {processingTime}s
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
