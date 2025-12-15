
import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { useLanguage } from '../useLanguage';

interface MapPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (location: Order['location']) => void;
    initialLocation: Order['location'];
}

declare global {
    interface Window {
        L: any; // Leaflet Global
    }
}

const MapPickerModal: React.FC<MapPickerModalProps> = ({ isOpen, onClose, onLocationSelect, initialLocation }) => {
    const { t, language } = useLanguage();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [selectedLocation, setSelectedLocation] = useState(initialLocation);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Search & Autocomplete State
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Initialize Map
    useEffect(() => {
        if (!isOpen) return;
        
        // Wait for DOM to be ready
        const timer = setTimeout(() => {
            if (mapContainerRef.current && !map && window.L) {
                initMap();
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            if (map) {
                map.remove();
                setMap(null);
                setMarker(null);
                setSuggestions([]);
                setSearchQuery('');
            }
        };
    }, [isOpen]);

    // Debounced Search for Autocomplete
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim().length > 2) {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5&accept-language=${language}`);
                    const data = await response.json();
                    setSuggestions(data || []);
                    setShowSuggestions(true);
                } catch (error) {
                    console.error("Autocomplete error:", error);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 800); // 800ms delay to avoid too many requests

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, language]);


    const initMap = () => {
        if (!window.L || !mapContainerRef.current) return;

        const defaultLocation = { lat: 30.0444, lng: 31.2357 }; // Cairo
        const startLocation = (initialLocation.lat && initialLocation.lng && (initialLocation.lat !== 0)) 
            ? { lat: initialLocation.lat, lng: initialLocation.lng } 
            : defaultLocation;

        const newMap = window.L.map(mapContainerRef.current).setView([startLocation.lat, startLocation.lng], 15);

        // Add OpenStreetMap Tile Layer (Free)
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(newMap);

        // Custom Icon
        const customIcon = window.L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const newMarker = window.L.marker([startLocation.lat, startLocation.lng], {
            icon: customIcon,
            draggable: true
        }).addTo(newMap);

        // Click to move marker
        newMap.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            newMarker.setLatLng([lat, lng]);
            handleLocationUpdate(lat, lng);
        });

        // Drag end listener
        newMarker.on('dragend', (e: any) => {
            const { lat, lng } = newMarker.getLatLng();
            handleLocationUpdate(lat, lng);
        });

        setMap(newMap);
        setMarker(newMarker);
        
        // If initial location was valid, reverse geocode it to get text if missing
        if (!initialLocation.addressText && startLocation.lat !== 0) {
            handleLocationUpdate(startLocation.lat, startLocation.lng);
        }
    };

    // Reverse Geocoding using Nominatim (Free)
    const handleLocationUpdate = async (lat: number, lng: number) => {
        // Update state immediately with coords
        setSelectedLocation(prev => ({ ...prev, lat, lng, addressText: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${language}`);
            const data = await response.json();
            
            if (data && data.display_name) {
                // Simplify the address a bit
                const addressParts = data.display_name.split(',');
                // Take first 3-4 parts for better readability
                const shortAddress = addressParts.slice(0, 4).join(', '); 
                
                setSelectedLocation({
                    lat,
                    lng,
                    addressText: shortAddress
                });
            }
        } catch (error) {
            console.error("Reverse geocoding error:", error);
        }
    };

    // Manual Search (Button Press or Enter)
    const handleManualSearch = async () => {
        if (!searchQuery.trim() || !map || !marker) return;

        setIsSearching(true);
        setShowSuggestions(false); // Hide dropdown

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&accept-language=${language}`);
            const data = await response.json();

            if (data && data.length > 0) {
                selectLocationFromData(data[0]);
            } else {
                alert(t('map_picker.no_results'));
            }
        } catch (error) {
            console.error("Search error:", error);
            alert(t('map_picker.search_error'));
        } finally {
            setIsSearching(false);
        }
    };

    const handleSuggestionClick = (item: any) => {
        selectLocationFromData(item);
        setShowSuggestions(false);
        setSearchQuery(item.display_name.split(',')[0]); // Just put the main name in input
    };

    const selectLocationFromData = (data: any) => {
        if (!map || !marker) return;

        const lat = parseFloat(data.lat);
        const lng = parseFloat(data.lon);
        const displayName = data.display_name;

        map.setView([lat, lng], 16);
        marker.setLatLng([lat, lng]);
        
        setSelectedLocation({
            lat: lat,
            lng: lng,
            addressText: displayName.split(',').slice(0, 4).join(', ')
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleManualSearch();
        }
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLoadingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    if (map && marker) {
                        map.setView([lat, lng], 16);
                        marker.setLatLng([lat, lng]);
                        handleLocationUpdate(lat, lng);
                    }
                    setIsLoadingLocation(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    setIsLoadingLocation(false);
                    alert(t('map_picker.geolocation_error'));
                },
                { enableHighAccuracy: true }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    };

    const handleConfirm = () => {
        onLocationSelect(selectedLocation);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center pointer-events-none">
             {/* Backdrop */}
             <div 
                className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full h-[90vh] sm:h-[80vh] sm:max-w-md md:max-w-xl lg:max-w-2xl bg-[#1C2541] sm:rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto transition-transform duration-300 transform translate-y-0">
                
                {/* Floating Search Bar */}
                <div className="absolute top-4 left-4 right-4 z-[500] flex flex-col gap-2">
                     <div className="relative flex-grow shadow-lg group">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                            placeholder={t('map_picker.search_placeholder')}
                            className="w-full h-12 pl-10 pr-4 rounded-full bg-[#0B132B] text-white border border-gray-600 focus:ring-2 focus:ring-[#F7C873] focus:border-transparent outline-none shadow-md"
                        />
                        <button 
                            onClick={handleManualSearch}
                            className="absolute left-1 top-1 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-white rounded-full"
                        >
                             {isSearching ? (
                                <div className="animate-spin h-4 w-4 border-2 border-[#F7C873] border-t-transparent rounded-full"></div>
                             ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                             )}
                        </button>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-14 left-0 right-0 bg-[#0B132B] border border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                {suggestions.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(item)}
                                        className="w-full text-start p-3 hover:bg-[#1C2541] border-b border-gray-700 last:border-0 transition-colors flex items-center gap-3"
                                    >
                                        <div className="text-gray-400">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium text-white truncate">{item.display_name.split(',')[0]}</p>
                                            <p className="text-xs text-gray-400 truncate">{item.display_name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Close Button */}
                    <div className="absolute right-0 -bottom-16">
                         <button 
                            onClick={onClose}
                            className="h-12 w-12 rounded-full bg-[#0B132B] text-white flex items-center justify-center shadow-lg border border-gray-600 hover:bg-gray-800"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Map Container */}
                <div className="flex-grow relative bg-gray-900 w-full h-full">
                    <div ref={mapContainerRef} className="w-full h-full" />
                    
                    {/* Controls Overlay */}
                    <div className="absolute bottom-48 sm:bottom-40 right-4 z-[400]">
                        <button
                            onClick={handleCurrentLocation}
                            className="w-12 h-12 rounded-full bg-[#F7C873] text-[#0B132B] shadow-lg flex items-center justify-center hover:bg-yellow-400"
                            title={t('map_picker.current_location')}
                        >
                            {isLoadingLocation ? (
                                <div className="animate-spin h-6 w-6 border-2 border-[#0B132B] border-t-transparent rounded-full"></div>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Bottom Sheet Panel */}
                <div className="bg-[#1C2541] p-4 sm:p-6 rounded-t-2xl sm:rounded-none shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-20 border-t border-gray-700">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-[#F7C873]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">{t('map_picker.selected')}</p>
                                <p className="text-white font-medium text-sm sm:text-base leading-snug">
                                    {selectedLocation.addressText || t('map_picker.marker_title')}
                                </p>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleConfirm}
                            className="w-full bg-[#F7C873] text-[#0B132B] font-bold py-3.5 px-6 rounded-lg hover:bg-yellow-400 transition-colors shadow-md text-lg active:scale-95 transform duration-150"
                        >
                            {t('map_picker.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapPickerModal;
