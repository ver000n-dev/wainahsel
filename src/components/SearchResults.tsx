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
