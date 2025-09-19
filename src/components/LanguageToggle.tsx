import React, { useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  // أول مرة يفتح الموقع خليها عربي لو ما في قيمة مخزنة
  useEffect(() => {
    const savedLang = localStorage.getItem('lang');
    if (savedLang) {
      setLanguage(savedLang);
      document.documentElement.setAttribute('lang', savedLang);
      document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
    } else {
      setLanguage('ar'); // افتراضي عربي
      localStorage.setItem('lang', 'ar');
      document.documentElement.setAttribute('lang', 'ar');
      document.documentElement.setAttribute('dir', 'rtl');
    }
  }, [setLanguage]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLang = e.target.value;
    setLanguage(nextLang);
    localStorage.setItem('lang', nextLang);
    document.documentElement.setAttribute('lang', nextLang);
    document.documentElement.setAttribute('dir', nextLang === 'ar' ? 'rtl' : 'ltr');
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-white/70" />
      <select
        value={language}
        onChange={handleChange}
        className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1 text-sm focus:outline-none"
      >
        <option value="ar">العربية</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};

export default LanguageToggle;
