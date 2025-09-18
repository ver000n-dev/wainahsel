import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    title: 'Wainahsel',
    subtitle: 'Visual Product Search & Price Comparison',
    photoSearch: 'Photo Search',
    instantResults: 'Instant Results',
    bestPrices: 'Best Prices',
    findProducts: 'Find Products',
    findProductsDesc: 'Take a photo or upload a screenshot to discover products and compare prices',
    readyToSearch: 'Ready to Search',
    readyToSearchDesc: 'Take a photo or upload an image to find products, compare prices, and discover the best deals',
    takePhoto: 'Take Photo',
    uploadImage: 'Upload Image',
    supportedFormats: 'Supports JPG, PNG • Works with product photos, screenshots, or catalog images',
    language: 'Language',
    searchResults: 'Search Results',
    query: 'Query',
    products: 'Products',
    match: 'Match',
    viewProduct: 'View Product',
    analyzingImage: 'Analyzing Image',
    aiProcessing: 'AI is processing your image to find matching products...',
    pleaseWait: 'Please wait',
    aiPowered: 'AI Powered Search',
    searchError: 'Search Error',
    searchErrorDesc: 'Unable to process the image. Please try again with a different image.',
    tryAgain: 'Try Again'
  },
  ar: {
    title: 'وين أحصل',
    subtitle: 'البحث المرئي عن المنتجات ومقارنة الأسعار',
    photoSearch: 'البحث بالصورة',
    instantResults: 'نتائج فورية',
    bestPrices: 'أفضل الأسعار',
    findProducts: 'البحث عن المنتجات',
    findProductsDesc: 'التقط صورة أو ارفع لقطة شاشة لاكتشاف المنتجات ومقارنة الأسعار',
    readyToSearch: 'جاهز للبحث',
    readyToSearchDesc: 'التقط صورة أو ارفع صورة للعثور على المنتجات ومقارنة الأسعار واكتشاف أفضل الصفقات',
    takePhoto: 'التقاط صورة',
    uploadImage: 'رفع صورة',
    supportedFormats: 'يدعم JPG، PNG • يعمل مع صور المنتجات ولقطات الشاشة أو صور الكتالوج',
    language: 'اللغة',
    searchResults: 'نتائج البحث',
    query: 'الاستعلام',
    products: 'المنتجات',
    match: 'تطابق',
    viewProduct: 'عرض المنتج',
    analyzingImage: 'تحليل الصورة',
    aiProcessing: 'الذكاء الاصطناعي يعالج صورتك للعثور على المنتجات المطابقة...',
    pleaseWait: 'يرجى الانتظار',
    aiPowered: 'بحث مدعوم بالذكاء الاصطناعي',
    searchError: 'خطأ في البحث',
    searchErrorDesc: 'تعذر معالجة الصورة. يرجى المحاولة مرة أخرى بصورة مختلفة.',
    tryAgain: 'حاول مرة أخرى'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};