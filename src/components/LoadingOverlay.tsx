import React from 'react';
import { Loader2, Brain, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message }) => {
  const { t, isRTL } = useLanguage();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className={`bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -top-2 -right-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
              <Search className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">{t('analyzingImage')}</h3>
          <p className="text-gray-600">{message || t('aiProcessing')}</p>
          
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <span className="text-sm text-gray-500">{t('pleaseWait')}</span>
          </div>
        </div>
        
        <div className="mt-6 bg-gray-50 rounded-lg p-3">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-center gap-2 text-xs text-gray-500`}>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>{t('aiPowered')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;