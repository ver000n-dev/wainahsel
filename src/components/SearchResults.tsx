// src/components/SearchResults.tsx
import React from 'react';
import { X, Tag } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { SearchResult } from '../services/aiSearch';

interface Props {
  results: SearchResult[];
  searchQuery: string;
  processingTime: number;
  onClose: () => void;
  imagePreview?: string | null;
}

const SearchResults: React.FC<Props> = ({
  results,
  searchQuery,
  processingTime,
  onClose,
  imagePreview
}) => {
  const { isRTL, t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden bg-slate-900 border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="text-white">
            <div className="font-bold">{t('searchResults') ?? 'نتائج البحث'}</div>
            <div className="text-white/80 text-sm">
              {searchQuery} · {processingTime}s · {t('products') ?? 'المنتجات'} {results.length}
            </div>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white p-2"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="p-6">
          {imagePreview && (
            <img src={imagePreview} alt="preview" className="w-full max-h-72 object-contain rounded-xl mb-6 bg-white/5" />
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r) => (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Tag size={16} /> {r.name}
                </div>
                <div className="mt-2 text-white/70 text-sm">
                  {(r.confidence ?? 0) > 0 ? `ثقة ${r.confidence}%` : t('noDetails') ?? ''}
                </div>
              </div>
            ))}
          </div>

          {results.length === 0 && (
            <div className="text-center text-white/70 py-10">ما في نتائج واضحة للصورة.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
