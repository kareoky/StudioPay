
import React, { useState } from 'react';
import { useLanguage } from '../useLanguage';

interface LoginScreenProps {
    onLogin: (name: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const { t, setLanguage } = useLanguage();
    const [step, setStep] = useState<'language' | 'name'>('language');
    const [name, setName] = useState('');

    const handleLanguageSelect = (lang: 'ar' | 'en') => {
        setLanguage(lang);
        setStep('name');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onLogin(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[100] p-4">
            <div className="bg-[#1C2541] rounded-xl shadow-lg w-full max-w-md p-8 text-center transition-all duration-300">
                 <div className="mx-auto mb-6 w-20 h-20 text-[#F7C873]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-[#F7C873]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>

                {step === 'language' ? (
                    <>
                        <h1 className="text-3xl font-bold text-white mb-6">{t('login.select_language')}</h1>
                        <div className="space-y-4">
                            <button
                                onClick={() => handleLanguageSelect('ar')}
                                className="w-full bg-[#2A3450] hover:bg-[#F7C873] hover:text-[#0B132B] text-white font-bold py-4 px-6 rounded-lg transition-colors border-2 border-transparent hover:border-[#F7C873] flex items-center justify-between group"
                            >
                                <span className="text-xl">العربية</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </button>
                            <button
                                onClick={() => handleLanguageSelect('en')}
                                className="w-full bg-[#2A3450] hover:bg-[#F7C873] hover:text-[#0B132B] text-white font-bold py-4 px-6 rounded-lg transition-colors border-2 border-transparent hover:border-[#F7C873] flex items-center justify-between group"
                            >
                                <span className="text-xl">English</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold text-white mb-2">{t('login.title')}</h1>
                        <p className="text-gray-400 mb-8">{t('login.description')}</p>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('login.name_placeholder')}
                                className="w-full bg-[#2A3450] border border-gray-600 text-white text-center text-lg rounded-md p-3 focus:ring-[#F7C873] focus:border-[#F7C873]"
                                autoFocus
                                required
                            />
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setStep('language')}
                                    className="px-4 py-3 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <button
                                    type="submit"
                                    className="flex-grow bg-[#F7C873] text-[#0B132B] font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-colors"
                                >
                                    {t('login.button')}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default LoginScreen;
