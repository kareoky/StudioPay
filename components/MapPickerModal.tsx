import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useLanguage } from '../useLanguage';
import { openGoogleMapsNavigation, extractCoordsFromGoogleMapsUrl, openInGoogleMaps } from '../utils/maps';

interface MapPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (location: { lat: number; lng: number; addressText: string }) => void;
    initialLocation?: { lat: number; lng: number; addressText?: string };
}

type GoogleMapType = 'roadmap' | 'satellite' | 'terrain';
type LocationStatus = 'idle' | 'locating' | 'success' | 'error';

// Google Maps Styled Pin Icon
const googleMarkerIcon = L.divIcon({
    className: 'google-maps-marker',
    html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: grab; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));">
            <div style="background: radial-gradient(circle at 35% 35%, #EA4335, #C5221F); width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 4px rgba(255,255,255,0.4);">
                <div style="width: 14px; height: 14px; background: #FFFFFF; border-radius: 50%; transform: rotate(45deg); box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
            </div>
            <div style="width: 12px; height: 5px; background: rgba(0,0,0,0.35); border-radius: 50%; margin-top: 2px;"></div>
        </div>
    `,
    iconSize: [38, 48],
    iconAnchor: [19, 48],
});

const MapPickerModal: React.FC<MapPickerModalProps> = ({ isOpen, onClose, onLocationSelect, initialLocation }) => {
    const { t, language } = useLanguage();

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerInstanceRef = useRef<L.Marker | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);

    const defaultLat = 30.0444; // Cairo
    const defaultLng = 31.2357;

    const startLat = (initialLocation && initialLocation.lat && initialLocation.lat !== 0) ? initialLocation.lat : defaultLat;
    const startLng = (initialLocation && initialLocation.lng && initialLocation.lng !== 0) ? initialLocation.lng : defaultLng;

    const currentCoordsRef = useRef<{ lat: number; lng: number }>({ lat: startLat, lng: startLng });
    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: startLat, lng: startLng });
    const [addressText, setAddressText] = useState<string>(initialLocation?.addressText || '');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
    const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [mapType, setMapType] = useState<GoogleMapType>('roadmap');

    // Google Maps Tile URL Generator with language support
    const getGoogleTileUrl = (type: GoogleMapType, lang: string) => {
        const langCode = lang === 'ar' ? 'ar' : 'en';
        switch (type) {
            case 'satellite':
                // Google Hybrid (Satellite imagery with roads and labels)
                return `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=${langCode}`;
            case 'terrain':
                // Google Terrain with labels
                return `https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=${langCode}`;
            case 'roadmap':
            default:
                // Official Google Maps Standard Vector-Rendered Roads
                return `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=${langCode}`;
        }
    };

    // Reverse geocode to get readable Arabic / English address text
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

    // Geolocation: GPS My Location
    const handleGetMyLocation = (isAuto: boolean = false) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            if (!isAuto) {
                setLocationStatus('error');
                setTimeout(() => setLocationStatus('idle'), 4000);
            }
            return;
        }

        setIsLocating(true);
        setLocationStatus('locating');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const newCoords = { lat, lng };

                currentCoordsRef.current = newCoords;
                setCurrentCoords(newCoords);
                setIsLocating(false);
                setLocationStatus('success');

                if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
                }
                if (markerInstanceRef.current) {
                    markerInstanceRef.current.setLatLng([lat, lng]);
                }
                reverseGeocode(lat, lng);

                setTimeout(() => {
                    setLocationStatus('idle');
                }, 3500);
            },
            (err) => {
                console.warn("Geolocation failed", err);
                setIsLocating(false);
                setLocationStatus('error');
                setTimeout(() => {
                    setLocationStatus('idle');
                }, 4500);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000 // 1 minute cached position for instant response
            }
        );
    };

    // When modal opens: initialize coords and automatically trigger current location detection
    useEffect(() => {
        if (isOpen) {
            const hasSavedCustomLocation = Boolean(
                initialLocation &&
                initialLocation.addressText &&
                initialLocation.addressText.trim().length > 0 &&
                (initialLocation.lat !== defaultLat || initialLocation.lng !== defaultLng)
            );

            const lat = (initialLocation && initialLocation.lat && initialLocation.lat !== 0) ? initialLocation.lat : defaultLat;
            const lng = (initialLocation && initialLocation.lng && initialLocation.lng !== 0) ? initialLocation.lng : defaultLng;
            
            const initialCoords = { lat, lng };
            currentCoordsRef.current = initialCoords;
            setCurrentCoords(initialCoords);
            setAddressText(initialLocation?.addressText || '');
            setSearchResults([]);
            setSearchQuery('');

            // Automatically determine user's current GPS location if no previous custom address was saved
            if (!hasSavedCustomLocation) {
                handleGetMyLocation(true);
            }
        } else {
            setLocationStatus('idle');
            setIsLocating(false);
        }
    }, [isOpen, initialLocation]);

    // Forward Search or Google Maps Link / Coordinates Parser
    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;

        // 1. Check if user pasted a Google Maps URL or coordinates
        const parsedCoords = await extractCoordsFromGoogleMapsUrl(query);
        if (parsedCoords) {
            currentCoordsRef.current = parsedCoords;
            setCurrentCoords(parsedCoords);
            setSearchResults([]);
            setSearchQuery('');
            if (mapInstanceRef.current && markerInstanceRef.current) {
                mapInstanceRef.current.flyTo([parsedCoords.lat, parsedCoords.lng], 17);
                markerInstanceRef.current.setLatLng([parsedCoords.lat, parsedCoords.lng]);
            }
            reverseGeocode(parsedCoords.lat, parsedCoords.lng);
            return;
        }

        // 2. Normal text query search
        setIsSearching(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=${language === 'ar' ? 'ar,en' : 'en'}`;
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
        const newCoords = { lat, lng };
        
        currentCoordsRef.current = newCoords;
        setCurrentCoords(newCoords);
        setAddressText(result.display_name || searchQuery);
        setSearchResults([]);
        setSearchQuery('');

        if (mapInstanceRef.current && markerInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 16);
            markerInstanceRef.current.setLatLng([lat, lng]);
        }
    };

    // Initialize Map with Google Maps Tiles
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            if (!mapContainerRef.current) return;

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const initialCenter = currentCoordsRef.current;

            const map = L.map(mapContainerRef.current, {
                center: [initialCenter.lat, initialCenter.lng],
                zoom: 15,
                zoomControl: false,
            });

            // Add Google Maps Layer
            const tileLayer = L.tileLayer(getGoogleTileUrl(mapType, language), {
                attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>',
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            }).addTo(map);

            tileLayerRef.current = tileLayer;

            // Zoom controls bottom-right
            L.control.zoom({ position: 'bottomright' }).addTo(map);

            // Google Maps Styled Marker
            const marker = L.marker([initialCenter.lat, initialCenter.lng], {
                icon: googleMarkerIcon,
                draggable: true,
            }).addTo(map);

            marker.on('dragend', () => {
                const pos = marker.getLatLng();
                const coords = { lat: pos.lat, lng: pos.lng };
                currentCoordsRef.current = coords;
                setCurrentCoords(coords);
                reverseGeocode(pos.lat, pos.lng);
            });

            map.on('click', (e: L.LeafletMouseEvent) => {
                marker.setLatLng(e.latlng);
                const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
                currentCoordsRef.current = coords;
                setCurrentCoords(coords);
                reverseGeocode(e.latlng.lat, e.latlng.lng);
            });

            mapInstanceRef.current = map;
            markerInstanceRef.current = marker;

            setTimeout(() => {
                map.invalidateSize();
            }, 200);

            if (!addressText && initialCenter.lat) {
                reverseGeocode(initialCenter.lat, initialCenter.lng);
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

    // Handle Map Type Switching (Roadmap vs Satellite vs Terrain)
    const handleSwitchMapType = (newType: GoogleMapType) => {
        setMapType(newType);
        if (mapInstanceRef.current && tileLayerRef.current) {
            mapInstanceRef.current.removeLayer(tileLayerRef.current);
            const newLayer = L.tileLayer(getGoogleTileUrl(newType, language), {
                attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>',
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            }).addTo(mapInstanceRef.current);
            tileLayerRef.current = newLayer;
        }
    };

    const handleConfirm = () => {
        onLocationSelect({
            lat: currentCoords.lat,
            lng: currentCoords.lng,
            addressText: addressText.trim() || `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`
        });
        onClose();
    };

    const handleOpenInGoogleMapsApp = () => {
        openInGoogleMaps(currentCoords.lat, currentCoords.lng, addressText);
    };

    const handleOpenGoogleNavigation = () => {
        openGoogleMapsNavigation(currentCoords.lat, currentCoords.lng);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md flex items-center justify-center z-[250] p-2 sm:p-4 md:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="bg-[#1C2541] rounded-2xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col border border-gray-700 overflow-hidden relative animate-fade-in">
                
                {/* Header */}
                <div className="p-3 sm:p-4 bg-[#0B132B] flex items-center justify-between border-b border-gray-700 gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
                            {/* Google Maps Pin SVG */}
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                <span>{language === 'ar' ? 'خرائط Google Maps' : 'Google Maps'}</span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                                    {language === 'ar' ? 'تحديد الموقع GPS' : 'Live GPS'}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400">
                                {language === 'ar' ? 'يتم تحديد موقعك الحالي تلقائياً، أو ابحث عن قاعة ومكان الجلسة' : 'Automatically locates your current position, or search for venue'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Open in Native Google Maps App Button */}
                        <button
                            type="button"
                            onClick={handleOpenInGoogleMapsApp}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A3450] hover:bg-[#344265] text-blue-400 text-xs font-medium border border-blue-400/30 transition-colors"
                            title={language === 'ar' ? 'فتح في تطبيق خرائط Google الرسمي' : 'Open in Google Maps App'}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span>{language === 'ar' ? 'فتح تطبيق Google Maps' : 'Google Maps App'}</span>
                        </button>

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
                </div>

                {/* Search Bar & Top Controls */}
                <div className="p-2.5 sm:p-3 bg-[#141d33] border-b border-gray-700/80 flex flex-wrap gap-2 items-center justify-between z-10 relative">
                    <form onSubmit={handleSearch} className="flex-grow flex gap-2 max-w-xl relative">
                        <div className="relative flex-grow">
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={language === 'ar' ? 'ابحث باسم المكان، أو الصق رابط Google Maps...' : 'Search place name, or paste a Google Maps link...'}
                                className="w-full bg-[#0B132B] border border-gray-600 rounded-lg py-2 px-3 ps-9 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#F7C873]"
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
                            className="bg-[#2A3450] hover:bg-[#344265] text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1 shrink-0"
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
                        {/* My Location GPS Button in Header */}
                        <button
                            type="button"
                            onClick={() => handleGetMyLocation(false)}
                            disabled={isLocating}
                            className="bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                            title={language === 'ar' ? 'تحديد موقعي الحالي الآن' : 'Locate my current position'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-blue-400 ${isLocating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle cx="12" cy="12" r="3" fill="currentColor" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                            </svg>
                            <span>{language === 'ar' ? 'تحديد موقعي الحالي' : 'My Current Location'}</span>
                        </button>
                    </div>
                </div>

                {/* Map View Area */}
                <div className="flex-grow w-full h-full relative z-0">
                    <div ref={mapContainerRef} className="w-full h-full min-h-[350px]"></div>

                    {/* Floating Geolocation Status Toast / Alert Banner */}
                    {locationStatus === 'locating' && (
                        <div className="absolute top-4 start-1/2 -translate-x-1/2 z-[400] bg-[#0B132B]/95 border border-[#F7C873]/70 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 backdrop-blur-md">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#F7C873] animate-ping shrink-0"></span>
                            <span className="text-xs sm:text-sm font-bold text-[#F7C873]">
                                {language === 'ar' ? 'جاري تحديد موقعك الحالي بدقة عبر GPS...' : 'Detecting your current location via GPS...'}
                            </span>
                        </div>
                    )}

                    {locationStatus === 'success' && (
                        <div className="absolute top-4 start-1/2 -translate-x-1/2 z-[400] bg-emerald-950/95 border border-emerald-500/80 text-emerald-300 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md">
                            <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs sm:text-sm font-bold">
                                {language === 'ar' ? 'تم تحديد موقعك الحالي بنجاح ✓' : 'Current location determined successfully ✓'}
                            </span>
                        </div>
                    )}

                    {locationStatus === 'error' && (
                        <div className="absolute top-4 start-1/2 -translate-x-1/2 z-[400] bg-amber-950/95 border border-amber-500/80 text-amber-200 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md max-w-sm text-center">
                            <span className="text-sm">📍</span>
                            <span className="text-xs font-medium">
                                {language === 'ar' 
                                    ? 'تعذر الوصول التلقائي للـ GPS (تأكد من السماح بالوصول للموقع في متصفحك). يمكنك تحريك الدبوس يدوياً.' 
                                    : 'Could not access GPS. Please allow location permissions in your browser, or drag the pin.'}
                            </span>
                        </div>
                    )}

                    {/* Google Map Layer Switcher Floating Pill */}
                    <div className="absolute top-3 start-3 z-[400] bg-[#0B132B]/90 backdrop-blur-md p-1 rounded-xl border border-gray-700 shadow-xl flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => handleSwitchMapType('roadmap')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                mapType === 'roadmap'
                                    ? 'bg-[#F7C873] text-[#0B132B] shadow-md'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                            <span>🗺️</span>
                            <span>{language === 'ar' ? 'خريطة جوجل' : 'Google Map'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSwitchMapType('satellite')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                mapType === 'satellite'
                                    ? 'bg-[#F7C873] text-[#0B132B] shadow-md'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                            <span>🛰️</span>
                            <span>{language === 'ar' ? 'قمر صناعي' : 'Satellite'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSwitchMapType('terrain')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 hidden sm:flex ${
                                mapType === 'terrain'
                                    ? 'bg-[#F7C873] text-[#0B132B] shadow-md'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                            <span>⛰️</span>
                            <span>{language === 'ar' ? 'تضاريس' : 'Terrain'}</span>
                        </button>
                    </div>

                    {/* Coordinates Overlay Badge */}
                    <div className="absolute top-3 end-3 z-[400] bg-[#0B132B]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 text-[11px] font-mono text-gray-300 shadow-md pointer-events-none">
                        📍 {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                    </div>

                    {/* Floating Native Google Maps Style GPS Locate FAB Button */}
                    <div className="absolute bottom-6 end-4 z-[400] flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => handleGetMyLocation(false)}
                            disabled={isLocating}
                            className="w-12 h-12 rounded-full bg-[#0B132B] hover:bg-[#1C2541] text-blue-400 border border-blue-500/40 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group focus:outline-none"
                            title={language === 'ar' ? 'موقعي الحالي (GPS)' : 'My Location (GPS)'}
                        >
                            <svg className={`w-6 h-6 transition-transform group-hover:rotate-45 ${isLocating ? 'animate-spin text-[#F7C873]' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="3.5" />
                                <path fillRule="evenodd" d="M12 2a1 1 0 011 1v1.055a8.002 8.002 0 016.945 6.945H21a1 1 0 110 2h-1.055A8.002 8.002 0 0113 19.945V21a1 1 0 11-2 0v-1.055A8.002 8.002 0 014.055 13H3a1 1 0 110-2h1.055A8.002 8.002 0 0111 4.055V3a1 1 0 011-1zm0 4a6 6 0 100 12 6 6 0 000-12z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Quick Hint Tooltip */}
                    <div className="absolute bottom-3 start-3 z-[400] bg-[#0B132B]/85 backdrop-blur-md px-3 py-1 rounded-md border border-gray-700 text-[11px] text-gray-300 shadow-md hidden sm:block">
                        {language === 'ar' ? '💡 اضغط في أي مكان أو اسحب الدبوس الأحمر لتحديد موقع التصوير بدقة' : '💡 Click anywhere or drag the red pin to set location'}
                    </div>
                </div>

                {/* Bottom Bar: Address display & Confirmation */}
                <div className="p-3 sm:p-4 bg-[#0B132B] border-t border-gray-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="flex-grow w-full sm:w-auto">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                            <span>{language === 'ar' ? 'العنوان أو اسم المكان:' : 'Selected Address:'}</span>
                            {isLoadingAddress && (
                                <span className="text-[#F7C873] animate-pulse">
                                    {language === 'ar' ? 'جاري جلب اسم المكان من خرائط Google...' : 'Fetching address from Google Maps...'}
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
                            onClick={handleOpenGoogleNavigation}
                            className="px-3 py-2 rounded-lg bg-[#2A3450] hover:bg-[#344265] text-blue-400 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                            title={language === 'ar' ? 'بدء مسار القيادة في Google Maps' : 'Open in Google Maps for driving'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>{language === 'ar' ? 'ملاحة Google Maps' : 'Navigation'}</span>
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
