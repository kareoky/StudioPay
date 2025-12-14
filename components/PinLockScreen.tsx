
import React, { useState } from 'react';
import { useLanguage } from '../useLanguage';

interface PinLockScreenProps {
    onUnlock: (pin: string) => boolean;
    deviceId: string;
    onCancel?: () => void;
}

const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock, deviceId, onCancel }) => {
    const { t, language } = useLanguage();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    // Updated Facebook Page Username/ID
    const FACEBOOK_PAGE_LINK = "https://m.me/812690071937991"; 

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const success = onUnlock(pin);
        if (!success) {
            setError(t('pin_lock.incorrect_pin'));
            setPin('');
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(deviceId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getWhatsAppUrl = () => {
        const message = language === 'ar' 
            ? `مرحباً، أرغب في تفعيل اشتراك تطبيق StudioPay.\nرقم جهازي هو: ${deviceId}`
            : `Hello, I would like to activate my StudioPay subscription.\nMy Device ID is: ${deviceId}`;
        return `https://wa.me/201273044202?text=${encodeURIComponent(message)}`;
    };

    const handleFacebookClick = () => {
        // Copy message automatically before opening Messenger
        const message = language === 'ar' 
            ? `مرحباً، أرغب في تفعيل اشتراك تطبيق StudioPay.\nرقم جهازي هو: ${deviceId}`
            : `Hello, I would like to activate my StudioPay subscription.\nMy Device ID is: ${deviceId}`;
            
        navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        window.open(FACEBOOK_PAGE_LINK, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex items-center justify-center z-[200] p-4" aria-modal="true" role="dialog">
            <div className="bg-[#1C2541] rounded-xl shadow-2xl w-full max-w-sm p-6 sm:p-8 text-center border border-gray-700 max-h-[90vh] overflow-y-auto relative">
                {onCancel && (
                    <button 
                        onClick={onCancel}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                <div className="mx-auto mb-4 w-16 h-16 text-[#F7C873]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('pin_lock.title')}</h2>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">{t('pin_lock.description')}</p>
                
                {/* Device ID Display Card - Styled for Screenshots */}
                <div className="bg-gradient-to-b from-[#0B132B] to-[#141b2d] p-5 rounded-xl mb-6 border border-gray-600 shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#F7C873]"></div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-semibold">{t('pin_lock.device_id')}</p>
                    
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-3xl font-mono font-bold text-[#F7C873] tracking-widest drop-shadow-md select-all">{deviceId}</span>
                    </div>

                    <button 
                        onClick={handleCopy}
                        className="text-xs text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                        {copied ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span>{t('pin_lock.copied')}</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>{t('common.copy')}</span>
                            </>
                        )}
                    </button>
                    
                    <div className="mt-3 pt-3 border-t border-gray-700">
                         <p className="text-[10px] text-gray-500">{t('pin_lock.screenshot_hint')}</p>
                    </div>
                </div>

                {/* Contact Buttons */}
                <div className="mb-6 space-y-3">
                    <p className="text-gray-300 text-sm font-medium">{t('pin_lock.contact_msg')}</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {/* WhatsApp */}
                        <a
                            href={getWhatsAppUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center gap-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-2 rounded-lg transition-colors shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                            </svg>
                            <span className="text-xs font-semibold">{t('pin_lock.whatsapp')}</span>
                        </a>

                        {/* Facebook Messenger */}
                        <button
                            onClick={handleFacebookClick}
                            className="flex flex-col items-center justify-center gap-1 bg-[#0084FF] hover:bg-[#0078e7] text-white font-bold py-3 px-2 rounded-lg transition-colors shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                             <span className="text-xs font-semibold">{t('pin_lock.messenger')}</span>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pin}
                        onChange={(e) => {
                            setPin(e.target.value);
                            setError('');
                        }}
                        placeholder="••••"
                        maxLength={4}
                        className="w-full bg-[#2A3450] border border-gray-600 text-white text-center tracking-[1em] text-2xl rounded-md p-3 focus:ring-[#F7C873] focus:border-[#F7C873] outline-none transition-shadow"
                    />
                    {error && <p className="text-red-400 mt-2 text-sm font-medium">{error}</p>}
                    <button
                        type="submit"
                        className="w-full mt-6 bg-[#F7C873] text-[#0B132B] font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-colors shadow-lg"
                    >
                        {t('pin_lock.unlock_button')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PinLockScreen;
