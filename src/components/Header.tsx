import React from 'react';
import { ShoppingBag, Camera, Zap, DollarSign } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

const Header: React.FC = () => {
  const { t, isRTL } = useLanguage();

  const features = [
    { icon: Camera, text: t('photoSearch') },
    { icon: Zap, text: t('instantResults') },
    { icon: DollarSign, text: t('bestPrices') }
  ];

  return (
    <div className={`text-center space-y-8 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute top-6 right-6">
        <LanguageToggle />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white">{t('title')}</h1>
        </div>
        <p className="text-xl text-white/80 max-w-md mx-auto">
          {t('subtitle')}
        </p>
      </div>

      <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-center gap-8`}>
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2 text-white/70">
            <feature.icon className="w-5 h-5" />
            <span className="text-sm">{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Header;