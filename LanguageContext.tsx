
import React, { createContext, useState, useEffect, useCallback } from 'react';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
    direction: Direction;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize from localStorage, default to 'ar' if not set
    const [language, setLanguage] = useState<Language>(() => {
        const savedLang = localStorage.getItem('appLanguage');
        return (savedLang === 'en' || savedLang === 'ar') ? savedLang : 'ar';
    });
    
    const [translations, setTranslations] = useState<{ [key: string]: string }>({});

    const direction = language === 'ar' ? 'rtl' : 'ltr';

    useEffect(() => {
        // Save language preference whenever it changes
        localStorage.setItem('appLanguage', language);

        const fetchTranslations = async () => {
            try {
                const response = await fetch(`/${language}.json`);
                if (!response.ok) {
                    throw new Error(`Could not load ${language}.json`);
                }
                const data = await response.json();
                setTranslations(data);
            } catch (error) {
                console.error("Failed to fetch translations:", error);
                try {
                    const fallbackLang = language === 'ar' ? 'en' : 'ar';
                    const fallbackResponse = await fetch(`/${fallbackLang}.json`);
                    const fallbackData = await fallbackResponse.json();
                    setTranslations(fallbackData);
                } catch (fallbackError) {
                    console.error("Failed to fetch fallback translations:", fallbackError);
                }
            }
        };

        fetchTranslations();

        document.documentElement.lang = language;
        document.documentElement.dir = direction;
        document.body.style.fontFamily = language === 'ar' ? 'var(--font-ar)' : 'var(--font-en)';

    }, [language, direction]);

    const t = useCallback((key: string, replacements?: { [key: string]: string | number }) => {
        let translation = translations[key] || key;
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                translation = translation.replace(new RegExp(`{{${rKey}}}`, 'g'), String(replacements[rKey]));
            });
        }
        return translation;
    }, [translations]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, direction }}>
            {children}
        </LanguageContext.Provider>
    );
};
