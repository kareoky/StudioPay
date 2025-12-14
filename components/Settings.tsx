
import React, { useRef, useState } from 'react';
import { useLanguage } from '../useLanguage';
import { Order } from '../types';
import PinLockScreen from './PinLockScreen';

interface SettingsProps {
    orders: Order[];
    onUnlock: (pin: string) => boolean;
    deviceId: string;
    notifyLeadTime: number;
    onSetNotifyLeadTime: (hours: number) => void;
}

const Settings: React.FC<SettingsProps> = ({ orders, onUnlock, deviceId, notifyLeadTime, onSetNotifyLeadTime }) => {
    const { t, language, setLanguage } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showActivateModal, setShowActivateModal] = useState(false);
    
    // Updated Links
    const FACEBOOK_PAGE_LINK = "https://www.facebook.com/share/19xnqWbbxh/?mibextid=wwXIfr"; 
    const WHATSAPP_LINK = "https://wa.me/201273044202";

    const handleExport = () => {
        // SECURITY UPDATE: We only export content data (Clients, Orders, Name).
        // We DO NOT export 'activationDate', 'firstUseTimestamp', or 'deviceId'.
        // This prevents users from sharing a backup file to activate the app on other devices for free.
        const dataToExport = {
            clients: localStorage.getItem('clients'),
            orders: localStorage.getItem('orders'),
            userName: localStorage.getItem('userName'),
            googleMapsApiKey: localStorage.getItem('googleMapsApiKey'), // Optional: keep for convenience
            version: '1.2'
        };

        const blob = new Blob([JSON.stringify(dataToExport)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `StudioPay_Backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result === 'string') {
                    const importedData = JSON.parse(result);
                    
                    // SECURITY UPDATE: Only import content. Never overwrite subscription status.
                    if (importedData.clients) localStorage.setItem('clients', importedData.clients);
                    if (importedData.orders) localStorage.setItem('orders', importedData.orders);
                    if (importedData.userName) localStorage.setItem('userName', importedData.userName);
                    if (importedData.googleMapsApiKey) localStorage.setItem('googleMapsApiKey', importedData.googleMapsApiKey);

                    // Note: We intentionally do NOT import 'activationDate' or 'isActivated'.
                    
                    alert(t('settings.success_import'));
                    window.location.reload();
                }
            } catch (error) {
                console.error("Import error", error);
                alert(t('settings.error_import'));
            }
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        if (window.confirm(t('settings.reset_confirm'))) {
            // Only clear content data, preserve subscription and settings
            localStorage.setItem('clients', '[]');
            localStorage.setItem('orders', '[]');
            // Force reload to reflect empty state
            window.location.reload();
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }).format(amount);
    }
    
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    const getMonthlyRevenue = () => {
        const revenueMap: Record<string, number> = {};
        orders.filter(o => o.status === 'completed').forEach(order => {
            const date = new Date(order.dateTime);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            revenueMap[key] = (revenueMap[key] || 0) + order.priceAmount;
        });

        return Object.entries(revenueMap).map(([key, amount]) => {
            const [year, month] = key.split('-').map(Number);
            return {
                date: new Date(year, month, 1),
                amount
            };
        }).sort((a, b) => b.date.getTime() - a.date.getTime()); 
    };

    const monthlyRevenueHistory = getMonthlyRevenue();

    const activationDateStr = localStorage.getItem('activationDate');
    const firstUseStr = localStorage.getItem('firstUseTimestamp');
    
    let subscriptionStatus = 'trial';
    let daysLeft = 0;
    let startDateStr = '';
    let endDateStr = '';
    let progressPercent = 0;

    if (activationDateStr) {
        subscriptionStatus = 'active';
        const startDate = new Date(activationDateStr);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 365);
        
        const now = new Date();
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        
        daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) daysLeft = 0;

        progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

        startDateStr = formatDate(activationDateStr);
        endDateStr = formatDate(endDate.toISOString());

    } else if (firstUseStr) {
        subscriptionStatus = 'trial';
        const daysPassed = (new Date().getTime() - new Date(firstUseStr).getTime()) / (1000 * 60 * 60 * 24);
        daysLeft = Math.max(0, 7 - Math.ceil(daysPassed)); // 7 Days Trial
        progressPercent = ((7 - daysLeft) / 7) * 100;
    }

    const notificationOptions = [1, 2, 3, 4, 5, 6, 8, 10, 12, 24, 48];

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <h1 className="text-3xl font-bold text-white mb-6">{t('settings.title')}</h1>
            
            <div className="space-y-6">
                
                {/* Subscription Status */}
                <div className={`p-6 rounded-xl shadow-lg border-s-4 ${subscriptionStatus === 'active' ? 'bg-[#1C2541] border-green-500' : 'bg-[#1C2541] border-yellow-500'}`}>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
                        <span>{subscriptionStatus === 'active' ? t('settings.sub_title') : t('settings.trial_title')}</span>
                        {subscriptionStatus === 'active' && (
                             <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50">
                                {t('settings.active_badge')}
                             </span>
                        )}
                    </h2>

                    {subscriptionStatus === 'active' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider">{t('settings.start_date')}</p>
                                    <p className="text-white font-medium">{startDateStr}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider">{t('settings.end_date')}</p>
                                    <p className="text-white font-medium">{endDateStr}</p>
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-gray-300 text-sm">{t('settings.days_left')}</span>
                                    <span className="text-[#F7C873] font-bold text-xl">{daysLeft}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-green-500 to-[#F7C873]" 
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                             <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-300">{t('settings.days_remaining')}</span>
                                <span className={`text-2xl font-bold ${daysLeft > 0 ? 'text-[#F7C873]' : 'text-red-500'}`}>
                                    {daysLeft} {language === 'ar' ? 'أيام' : 'Days'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">
                                {t('settings.trial_desc')}
                            </p>
                            
                            <button 
                                onClick={() => setShowActivateModal(true)}
                                className="w-full bg-[#F7C873] text-[#0B132B] font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition-colors shadow-md"
                            >
                                {t('settings.activate_now')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Notification Settings */}
                <div className="bg-[#1C2541] p-6 rounded-xl shadow-lg border-s-4 border-purple-500">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {t('settings.notification_title')}
                    </h2>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">{t('settings.notification_lead_time')}</label>
                        <div className="flex items-center gap-2">
                            <select
                                value={notifyLeadTime}
                                onChange={(e) => onSetNotifyLeadTime(Number(e.target.value))}
                                className="bg-[#0B132B] border border-gray-600 text-white rounded-md p-3 focus:ring-[#F7C873] focus:border-[#F7C873] cursor-pointer min-w-[120px]"
                            >
                                {notificationOptions.map(hours => (
                                    <option key={hours} value={hours}>
                                        {hours} {t('settings.hours')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{t('settings.notification_desc')}</p>
                    </div>
                </div>

                {/* Language Settings */}
                <div className="bg-[#1C2541] p-6 rounded-xl shadow-lg border-s-4 border-[#F7C873]">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-2 text-[#F7C873]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m4.25 16l-4.25-4.25M19.5 19.5l-4.25-4.25M19.5 19.5h-4.25M19.5 19.5v-4.25" />
                        </svg>
                        {t('settings.language_title')}
                    </h2>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setLanguage('ar')}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${language === 'ar' ? 'bg-[#F7C873] text-[#0B132B]' : 'bg-[#0B132B] text-gray-400 hover:text-white'}`}
                        >
                            العربية
                        </button>
                        <button 
                            onClick={() => setLanguage('en')}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${language === 'en' ? 'bg-[#F7C873] text-[#0B132B]' : 'bg-[#0B132B] text-gray-400 hover:text-white'}`}
                        >
                            English
                        </button>
                    </div>
                </div>

                {/* Monthly Revenue History */}
                <div className="bg-[#1C2541] p-6 rounded-xl shadow-lg border-s-4 border-green-400">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {t('dashboard.monthly_revenue_history')}
                    </h2>
                    <div className="overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-start">
                            <thead className="bg-[#0B132B] sticky top-0">
                                <tr>
                                    <th className="p-3 text-start text-gray-400 text-sm">{t('dashboard.month')}</th>
                                    <th className="p-3 text-start text-gray-400 text-sm">{t('dashboard.revenue')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {monthlyRevenueHistory.length > 0 ? (
                                    monthlyRevenueHistory.map((item, index) => (
                                        <tr key={index} className="hover:bg-[#2A3450] transition-colors">
                                            <td className="p-3 text-white font-medium">
                                                {item.date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="p-3 text-green-400 font-bold">
                                                {formatCurrency(item.amount)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="p-4 text-center text-gray-500 text-sm">
                                            {t('dashboard.no_revenue_data')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Backup & Restore */}
                <div className="bg-[#1C2541] p-6 rounded-xl shadow-lg border-s-4 border-blue-400">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        {t('settings.backup_restore')}
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#0B132B] p-4 rounded-lg">
                            <h3 className="font-semibold text-white mb-2">{t('settings.export')}</h3>
                            <p className="text-sm text-gray-400 mb-4 h-12">{t('settings.export_desc')}</p>
                            <button 
                                onClick={handleExport}
                                className="w-full bg-[#F7C873] text-[#0B132B] font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition-colors"
                            >
                                {t('settings.export')}
                            </button>
                        </div>

                        <div className="bg-[#0B132B] p-4 rounded-lg">
                            <h3 className="font-semibold text-white mb-2">{t('settings.import')}</h3>
                            <p className="text-sm text-gray-400 mb-4 h-12">{t('settings.import_desc')}</p>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="application/json" 
                                className="hidden" 
                            />
                            <button 
                                onClick={handleImportClick}
                                className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                {t('settings.import')}
                            </button>
                        </div>
                    </div>
                </div>

                 {/* Danger Zone */}
                 <div className="bg-[#1C2541] p-6 rounded-xl shadow-lg border-s-4 border-red-500">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {t('settings.danger_zone')}
                    </h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-white">{t('settings.reset')}</h3>
                                <p className="text-gray-400 text-sm">{t('settings.reset_desc')}</p>
                            </div>
                             <button 
                                onClick={handleReset}
                                className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                                {t('settings.reset')}
                            </button>
                        </div>
                    </div>
                 </div>

                 {/* Help & Support */}
                 <div className="bg-[#1C2541] p-6 rounded-xl shadow-lg border-s-4 border-gray-400">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {t('settings.support_title')}
                    </h2>
                    <p className="text-gray-400 text-sm mb-4">{t('settings.support_desc')}</p>
                    <div className="grid grid-cols-2 gap-4">
                        <a 
                            href={FACEBOOK_PAGE_LINK} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-[#0084FF] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#0078e7] transition-colors text-center flex items-center justify-center gap-2"
                        >
                            {/* Facebook Logo */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
                                <path d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256c0 120 82.7 220.8 194.2 248.5V334.2h-52.8V256h52.8v-49.8c0-54.4 32.5-84.1 81.8-84.1 23.6 0 48.3 4.2 48.3 4.2v53h-27.2c-27 0-35.4 16.7-35.4 33.9V256h59.7l-9.5 78.2h-50.2v170.3C429.3 476.8 512 376 512 256z"/>
                            </svg>
                            <span>{t('pin_lock.messenger')}</span>
                        </a>

                        <a 
                            href={WHATSAPP_LINK} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-[#25D366] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#20bd5a] transition-colors text-center flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                            </svg>
                            <span>{t('pin_lock.whatsapp')}</span>
                        </a>
                    </div>
                 </div>

            </div>

             {/* Activate Modal */}
             {showActivateModal && (
                <PinLockScreen 
                    onUnlock={(pin) => {
                        const success = onUnlock(pin);
                        if (success) setShowActivateModal(false);
                        return success;
                    }} 
                    deviceId={deviceId} 
                    onCancel={() => setShowActivateModal(false)}
                />
            )}
        </div>
    );
};

export default Settings;
