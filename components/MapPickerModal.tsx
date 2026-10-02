import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useLanguage } from '../useLanguage';
import { openGoogleMapsNavigation } from '../utils/maps';

interface MapPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (location: { lat: number; lng: number; addressText: string }) => void;
    initialLocation?: { lat: number; lng: number; addressText?: string };
}

const customMarkerIcon = L.divIcon({
    className: 'custom-map-marker',
    html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: grab;">
            <div style="background: linear-gradient(135deg, #F7C873 0%, #E5A93C 100%); color: #0B132B; width: 42px; height: 42px; border-radius: 50%; box-shadow: 0 8px 20px rgba(0,0,0,0.6); border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
            </div>
            <div style="width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-top: 11px solid #E5A93C; margin-top: -1px;"></div>
        </div>
    `,
    iconSize: [42, 53],
    iconAnchor: [21, 53],
});

const MapPickerModal: React.FC<MapPickerModalProps> = ({ isOpen, onClose, onLocationSelect, initialLocation }) => {
    const { t, language } = useLanguage();

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerInstanceRef = useRef<L.Marker | null>(null);

    const defaultLat = 30.0444;
    const defaultLng = 31.2357;

    const startLat = (initialLocation && initialLocation.lat && initialLocation.lat !== 0) ? initialLocation.lat : defaultLat;
    const startLng = (initialLocation && initialLocation.lng && initialLocation.lng !== 0) ? initialLocation.lng : defaultLng;

    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: startLat, lng: startLng });
    const [addressText, setAddressText] = useState<string>(initialLocation?.addressText || '');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Reset when modal opens with fresh initialLocation
    useEffect(() => {
        if (isOpen) {
            const lat = (initialLocation && initialLocation.lat && initialLocation.lat !== 0) ? initialLocation.lat : defaultLat;
            const lng = (initialLocation && initialLocation.lng && initialLocation.lng !== 0) ? initialLocation.lng : defaultLng;
            setCurrentCoords({ lat, lng });
            setAddressText(initialLocation?.addressText || '');
            setSearchResults([]);
            setSearchQuery('');
        }
    }, [isOpen, initialLocation]);

    // Reverse geocode via Nominatim (Free, no billing, no API key needed)
    const reverseGeocode = async (lat: number, lng: number) => {
        setIsLoadingAddress(true);
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=${language === 'ar' ? 'ar,en' : 'en'}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data.display_name) {
                    setAddressText(data.display_name);
                }
            }
        } catch (e) {
            console.warn("Reverse geocode failed", e);
        } finally {
            setIsLoadingAddress(false);
        }
    };

    // Forward Search via Nominatim
    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&accept-language=${language === 'ar' ? 'ar,en' : 'en'}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data || []);
            }
        } catch (e) {
            console.warn("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSearchResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        setCurrentCoords({ lat, lng });
        setAddressText(result.display_name || searchQuery);
        setSearchResults([]);
        setSearchQuery('');

        if (mapInstanceRef.current && markerInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 16);
            markerInstanceRef.current.setLatLng([lat, lng]);
        }
    };

    // Geolocation: GPS My Location
    const handleGetMyLocation = () => {
        if (!navigator.geolocation) {
            alert(language === 'ar' ? 'متصفحك لا يدعم تحديد الموقع الجغرافي' : 'Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setCurrentCoords({ lat, lng });

                if (mapInstanceRef.current && markerInstanceRef.current) {
                    mapInstanceRef.current.setView([lat, lng], 16);
                    markerInstanceRef.current.setLatLng([lat, lng]);
                }
                reverseGeocode(lat, lng);
                setIsLocating(false);
            },
            (err) => {
                console.warn(err);
                setIsLocating(false);
                alert(language === 'ar' ? 'تعذر تحديد موقعك الحالي. يرجى التأكد من تفعيل إذن الموقع في المتصفح' : 'Could not get your current location. Please allow location permissions.');
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    // Initialize Leaflet Map
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            if (!mapContainerRef.current) return;

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const map = L.map(mapContainerRef.current, {
                center: [currentCoords.lat, currentCoords.lng],
                zoom: 15,
                zoomControl: false,
            });

            // Fast, high-resolution tile layer (100% free)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(map);

            L.control.zoom({ position: 'bottomright' }).addTo(map);

            const marker = L.marker([currentCoords.lat, currentCoords.lng], {
                icon: customMarkerIcon,
                draggable: true,
            }).addTo(map);

            marker.on('dragend', () => {
                const pos = marker.getLatLng();
                setCurrentCoords({ lat: pos.lat, lng: pos.lng });
                reverseGeocode(pos.lat, pos.lng);
            });

            map.on('click', (e: L.LeafletMouseEvent) => {
                marker.setLatLng(e.latlng);
                setCurrentCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
                reverseGeocode(e.latlng.lat, e.latlng.lng);
            });

            mapInstanceRef.current = map;
            markerInstanceRef.current = marker;

            setTimeout(() => {
                map.invalidateSize();
            }, 200);

            if (!addressText && currentCoords.lat) {
                reverseGeocode(currentCoords.lat, currentCoords.lng);
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen]);

    const handleConfirm = () => {
        onLocationSelect({
            lat: currentCoords.lat,
            lng: currentCoords.lng,
            addressText: addressText.trim() || `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`
        });
        onClose();
    };

    const handleOpenInGoogleMaps = () => {
        openGoogleMapsNavigation(currentCoords.lat, currentCoords.lng);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[250] p-2 sm:p-4 md:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="bg-[#1C2541] rounded-2xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col border border-gray-700 overflow-hidden relative animate-fade-in">
                
                {/* Header */}
                <div className="p-3 sm:p-4 bg-[#0B132B] flex items-center justify-between border-b border-gray-700 gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-[#F7C873]/20 text-[#F7C873]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                {language === 'ar' ? 'تحديد الموقع على الخريطة' : 'Select Location on Map'}
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    {language === 'ar' ? 'مجاني 100%' : '100% Free'}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400">
                                {language === 'ar' ? 'اسحب العلامة الذهبية أو اضغط على أي مكان لتحديده بدقة' : 'Drag the gold pin or click anywhere to select'}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#141D33] transition-colors"
                        title={t('common.cancel')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search Bar & GPS Locate */}
                <div className="p-3 bg-[#141d33] border-b border-gray-700/80 flex flex-wrap gap-2 items-center justify-between z-10 relative">
                    <form onSubmit={handleSearch} className="flex-grow flex gap-2 max-w-lg relative">
                        <div className="relative flex-grow">
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={language === 'ar' ? 'ابحث عن منطقة، شارع، قاعة، فندق، معلم...' : 'Search area, street, venue, hotel, landmark...'}
                                className="w-full bg-[#0B132B] border border-gray-600 rounded-lg py-2 px-3 ps-9 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#F7C873]"
                            />
                            <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="bg-[#2A3450] hover:bg-[#344265] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 shrink-0"
                        >
                            {isSearching ? (
                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <span>{language === 'ar' ? 'بحث' : 'Search'}</span>
                            )}
                        </button>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full mt-1 start-0 end-0 bg-[#0B132B] border border-gray-600 rounded-lg shadow-2xl z-30 max-h-56 overflow-y-auto">
                                {searchResults.map((res, i) => (
                                    <div 
                                        key={i}
                                        onClick={() => handleSelectSearchResult(res)}
                                        className="p-2.5 text-xs text-gray-200 hover:bg-[#1C2541] hover:text-[#F7C873] cursor-pointer border-b border-gray-800 last:border-0 transition-colors"
                                    >
                                        📍 {res.display_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </form>

                    <div className="flex items-center gap-2">
                        {/* My Location GPS Button */}
                        <button
                            type="button"
                            onClick={handleGetMyLocation}
                            disabled={isLocating}
                            className="bg-[#2A3450] hover:bg-[#344265] text-[#F7C873] p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                            title={language === 'ar' ? 'تحديد موقعي الحالي' : 'Get My Location'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLocating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="hidden sm:inline text-xs">{language === 'ar' ? 'موقعي الحالي' : 'My Location'}</span>
                        </button>
                    </div>
                </div>

                {/* Map View Area */}
                <div className="flex-grow w-full h-full relative z-0">
                    <div ref={mapContainerRef} className="w-full h-full min-h-[350px]"></div>

                    {/* Coordinates Overlay Badge */}
                    <div className="absolute top-3 end-3 z-[400] bg-[#0B132B]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 text-[11px] font-mono text-gray-300 shadow-md pointer-events-none">
                        📍 {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                    </div>
                </div>

                {/* Bottom Bar: Address display & Confirmation */}
                <div className="p-3 sm:p-4 bg-[#0B132B] border-t border-gray-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="flex-grow w-full sm:w-auto">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                            <span>{language === 'ar' ? 'العنوان المختار:' : 'Selected Address:'}</span>
                            {isLoadingAddress && (
                                <span className="text-[#F7C873] animate-pulse">
                                    {language === 'ar' ? 'جاري جلب اسم المكان...' : 'Fetching address name...'}
                                </span>
                            )}
                        </div>
                        <input 
                            type="text"
                            value={addressText}
                            onChange={(e) => setAddressText(e.target.value)}
                            placeholder={language === 'ar' ? 'اكتب اسم المكان أو القاعة أو الوصف...' : 'Enter location title or description here...'}
                            className="w-full bg-[#1C2541] border border-gray-600 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[#F7C873]"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {/* Open in Google Maps for Navigation */}
                        <button
                            type="button"
                            onClick={handleOpenInGoogleMaps}
                            className="px-3 py-2 rounded-lg bg-[#2A3450] hover:bg-[#344265] text-blue-400 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                            title={language === 'ar' ? 'فتح الموقع في تطبيق Google Maps للملاحة' : 'Open in Google Maps for navigation'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>{language === 'ar' ? 'ملاحة في Google Maps' : 'Google Maps'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="px-5 py-2 rounded-lg bg-[#F7C873] hover:bg-yellow-400 text-[#0B132B] text-sm font-bold shadow-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{language === 'ar' ? 'تأكيد الموقع' : 'Confirm Location'}</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MapPickerModal;
