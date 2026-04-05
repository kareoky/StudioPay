import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { useLanguage } from '../useLanguage';
import MapPickerModal from './MapPickerModal';
import { extractCoordsFromGoogleMapsUrl, openGoogleMapsNavigation, getGoogleMapsSearchUrl } from '../utils/maps';

interface AddEditClientProps {
    client: Client | null;
    onSave: (client: Client) => void;
    onCancel: () => void;
}

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
            className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 focus:ring-[#F7C873] focus:border-[#F7C873]"
            {...props}
        />
    </div>
);

const AddEditClient: React.FC<AddEditClientProps> = ({ client, onSave, onCancel }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<Client | null>(null);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isParsingUrl, setIsParsingUrl] = useState(false);
    const [mapsUrl, setMapsUrl] = useState('');

    useEffect(() => {
        if (client) {
            setFormData({
                ...client,
                location: client.location || { lat: 0, lng: 0, addressText: '' }
            });
        }
    }, [client]);

    if (!formData) return <div>{t('add_order.loading')}</div>;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleLocationSelect = (location: Client['location']) => {
        setFormData(prev => prev ? { ...prev, location } : null);
    };

    const handleParseMapsUrl = async () => {
        if (!mapsUrl) return;
        
        setIsParsingUrl(true);
        const coords = await extractCoordsFromGoogleMapsUrl(mapsUrl);
        setIsParsingUrl(false);

        if (coords) {
            setFormData(prev => prev ? {
                ...prev,
                location: {
                    ...prev.location!,
                    lat: coords.lat,
                    lng: coords.lng,
                    addressText: prev.location?.addressText || "Location from Google Maps"
                }
            } : null);
        } else {
            alert("Could not extract coordinates from this link. Try sharing the full URL from Google Maps.");
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    return (
        <div className="max-w-lg mx-auto pb-20">
            <h1 className="text-3xl font-bold text-white mb-6">
                {client?.id.startsWith('new-') ? t('add_client.title.new') : t('add_client.title.edit')}
            </h1>
            
            <form onSubmit={handleSubmit} className="bg-[#1C2541] p-8 rounded-xl shadow-lg space-y-6">
                <InputField
                    label={t('add_client.form.name')}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                <InputField
                    label={t('add_client.form.phone')}
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                />
                <InputField
                    label={t('add_client.form.email')}
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                />

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('add_order.form.location')}</label>
                    
                    <div className="relative">
                        <input 
                            type="text"
                            name="addressText"
                            value={formData.location?.addressText || ''}
                            onChange={(e) => setFormData(prev => prev ? {...prev, location: {...prev.location!, addressText: e.target.value}} : null)}
                            className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 pl-10 focus:ring-[#F7C873] focus:border-[#F7C873]"
                            placeholder="Enter address manually"
                        />
                        <div className="absolute left-3 top-2.5 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-grow">
                            <input 
                                type="text"
                                value={mapsUrl}
                                onChange={(e) => setMapsUrl(e.target.value)}
                                className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 pl-10 focus:ring-[#F7C873] focus:border-[#F7C873]"
                                placeholder="Paste Google Maps link"
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={handleParseMapsUrl}
                            disabled={isParsingUrl || !mapsUrl}
                            className="bg-[#F7C873] text-[#0B132B] px-4 rounded-md font-bold hover:bg-yellow-400 disabled:opacity-50"
                        >
                            {isParsingUrl ? "..." : "Parse"}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            type="button"
                            onClick={() => setIsMapOpen(true)}
                            className="flex-grow bg-[#0B132B] text-[#F7C873] border border-[#F7C873] py-2 px-4 rounded-md hover:bg-[#F7C873] hover:text-[#0B132B] transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span>Pick from Map</span>
                        </button>

                        <button 
                            type="button"
                            onClick={() => window.open(getGoogleMapsSearchUrl(), '_blank')}
                            className="bg-[#2A3450] text-[#F7C873] border border-gray-600 py-2 px-4 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center"
                            title="Open Google Maps"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4a1 1 0 10-2 0v4H5V7h4a1 1 0 000-2H5z" />
                            </svg>
                        </button>

                        {formData.location?.lat !== 0 && (
                             <button 
                                type="button"
                                onClick={() => openGoogleMapsNavigation(formData.location!.lat, formData.location!.lng)}
                                className="bg-blue-600 text-white border border-blue-600 py-2 px-4 rounded-md hover:bg-blue-500 transition-colors flex items-center justify-center"
                                title="Navigate"
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform -rotate-45" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-500 transition-colors">
                        {t('common.cancel')}
                    </button>
                    <button type="submit" className="bg-[#F7C873] text-[#0B132B] font-bold py-2 px-6 rounded-lg hover:bg-yellow-400 transition-colors">
                        {t('common.save')}
                    </button>
                </div>
            </form>

            <MapPickerModal
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onLocationSelect={handleLocationSelect}
                initialLocation={formData.location || { lat: 0, lng: 0, addressText: '' }}
            />
        </div>
    );
};

export default AddEditClient;
