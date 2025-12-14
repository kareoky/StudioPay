
import React, { createContext, useState, useEffect, useCallback } from 'react';
import arTranslations from './ar.json';
import enTranslations from './en.json';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
    direction: Direction;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translationsMap = {
    ar: arTranslations,
    en: enTranslations
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize from localStorage, default to 'ar' if not set
    const [language, setLanguage] = useState<Language>(() => {
        const savedLang = localStorage.getItem('appLanguage');
        return (savedLang === 'en' || savedLang === 'ar') ? savedLang : 'ar';
    });
    
    const direction = language === 'ar' ? 'rtl' : 'ltr';

    useEffect(() => {
        // Save language preference whenever it changes
        localStorage.setItem('appLanguage', language);

        // Update document attributes
        document.documentElement.lang = language;
        document.documentElement.dir = direction;
        document.body.style.fontFamily = language === 'ar' ? 'var(--font-ar)' : 'var(--font-en)';

    }, [language, direction]);

    const t = useCallback((key: string, replacements?: { [key: string]: string | number }) => {
        const currentTranslations: any = translationsMap[language];
        let translation = currentTranslations[key] || key;
        
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                translation = translation.replace(new RegExp(`{{${rKey}}}`, 'g'), String(replacements[rKey]));
            });
        }
        return translation;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, direction }}>
            {children}
        </LanguageContext.Provider>
    );
};
