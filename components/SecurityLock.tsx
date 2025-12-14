
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../useLanguage';
import { verifyBiometrics } from '../utils/biometrics';

interface SecurityLockProps {
    onUnlock: () => void;
}

const SecurityLock: React.FC<SecurityLockProps> = ({ onUnlock }) => {
    const { t } = useLanguage();
    const [error, setError] = useState(false);

    const handleBiometricUnlock = async () => {
        setError(false);
        const success = await verifyBiometrics();
        if (success) {
            onUnlock();
        } else {
            setError(true);
        }
    };

    // Auto-trigger on mount
    useEffect(() => {
        handleBiometricUnlock();
    }, []);

    return (
        <div className="fixed inset-0 bg-[#0B132B] z-[300] flex flex-col items-center justify-center p-4">
             <div className="bg-[#1C2541] p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center border border-gray-700">
                <div className="w-20 h-20 rounded-full bg-[#0B132B] flex items-center justify-center mb-6 text-[#F7C873] shadow-inner border border-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.131A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">{t('security.lock_title')}</h2>
                <p className="text-gray-400 mb-8 text-sm">{t('security.desc_device')}</p>
                
                {error && (
                    <p className="text-red-500 text-sm mb-4 font-semibold animate-pulse">{t('security.failed_retry')}</p>
                )}

                <button 
                    onClick={handleBiometricUnlock}
                    className="w-full bg-[#F7C873] text-[#0B132B] font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {t('security.unlock_button')}
                </button>
             </div>
        </div>
    );
};

export default SecurityLock;
