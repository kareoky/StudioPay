
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
        google: any;
    }
}

const MapPickerModal: React.FC<MapPickerModalProps> = ({ isOpen, onClose, onLocationSelect, initialLocation }) => {
    const { t, direction } = useLanguage();
    const mapRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [selectedLocation, setSelectedLocation] = useState(initialLocation);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

    // Load Google Maps Script
    useEffect(() => {
        if (!isOpen) return;

        if (window.google && window.google.maps) {
            setIsScriptLoaded(true);
            return;
        }

        const storedKey = localStorage.getItem('googleMapsApiKey');
        const apiKey = storedKey || 'AIzaSyCtOGcH3-cHuyQxG_FYx4Y1LYiuHZGYrKo';

        if (!apiKey) {
            setMapError(t('map_picker.no_api_key'));
            return;
        }

        if (!document.querySelector('#google-maps-script')) {
            const script = document.createElement('script');
            script.id = 'google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => setIsScriptLoaded(true);
            script.onerror = () => setMapError("Failed to load Google Maps script. Please check your API Key in Settings.");
            document.head.appendChild(script);
        } else {
             setIsScriptLoaded(true);
        }
    }, [isOpen, t]);

    // Initialize Map
    useEffect(() => {
        if (isOpen && isScriptLoaded && mapRef.current) {
            // Tiny timeout to ensure DOM is rendered/sized correctly before map init
            const timer = setTimeout(() => {
                initMap();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, isScriptLoaded]);

    // Auto-locate if no initial location is set (default coords)
    useEffect(() => {
        if (isOpen && map && (!initialLocation.addressText || (initialLocation.lat === 30.0444 && initialLocation.lng === 31.2357))) {
            handleCurrentLocation();
        }
    }, [isOpen, map]);

    const initMap = () => {
        if (!window.google) return;
        
        const defaultLocation = { lat: 30.0444, lng: 31.2357 }; // Cairo
        const startLocation = (initialLocation.lat && initialLocation.lng && (initialLocation.lat !== 0)) 
            ? { lat: initialLocation.lat, lng: initialLocation.lng } 
            : defaultLocation;

        try {
            const newMap = new window.google.maps.Map(mapRef.current, {
                center: startLocation,
                zoom: 15,
                disableDefaultUI: true, // We will build custom controls
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    {
                        featureType: "administrative.locality",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "poi",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "poi.park",
                        elementType: "geometry",
                        stylers: [{ color: "#263c3f" }],
                    },
                    {
                        featureType: "poi.park",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#6b9a76" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry",
                        stylers: [{ color: "#38414e" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#212a37" }],
                    },
                    {
                        featureType: "road",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#9ca5b3" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry",
                        stylers: [{ color: "#746855" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#1f2835" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#f3d19c" }],
                    },
                    {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [{ color: "#17263c" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#515c6d" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.stroke",
                        stylers: [{ color: "#17263c" }],
                    },
                ],
            });

            // Custom Marker Icon (SVG)
            const markerIcon = {
                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                fillColor: "#F7C873",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#0B132B",
                scale: 2,
                anchor: new window.google.maps.Point(12, 24),
            };

            const newMarker = new window.google.maps.Marker({
                position: startLocation,
                map: newMap,
                draggable: true,
                icon: markerIcon,
                animation: window.google.maps.Animation.DROP,
            });

            newMap.addListener('click', (e: any) => {
                const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                newMarker.setPosition(pos);
                updateSelectedLocation(pos.lat, pos.lng);
            });

            newMarker.addListener('dragend', () => {
                const pos = newMarker.getPosition();
                updateSelectedLocation(pos.lat(), pos.lng());
            });
            
            // Setup Autocomplete
            if (searchInputRef.current) {
                const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current);
                autocomplete.bindTo('bounds', newMap);
                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place.geometry || !place.geometry.location) return;

                    if (place.geometry.viewport) {
                        newMap.fitBounds(place.geometry.viewport);
                    } else {
                        newMap.setCenter(place.geometry.location);
                        newMap.setZoom(17);
                    }
                    newMarker.setPosition(place.geometry.location);
                    
                    setSelectedLocation({
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        addressText: place.formatted_address || place.name || ''
                    });
                });
            }

            setMap(newMap);
            setMarker(newMarker);
        } catch (error) {
            console.error("Error initializing map:", error);
            setMapError("Error initializing map.");
        }
    };

    const handleManualSearch = () => {
        if (!searchInputRef.current || !map || !marker) return;
        const query = searchInputRef.current.value.trim();
        
        if (!query) return;

        // Regex check for Lat, Lng format (e.g., 30.051048, 31.395290 or 30.05,31.39)
        const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
        const match = query.match(coordRegex);

        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[3]);

            if (!isNaN(lat) && !isNaN(lng)) {
                const pos = { lat, lng };
                map.setCenter(pos);
                map.setZoom(17);
                marker.setPosition(pos);
                updateSelectedLocation(lat, lng);
                return;
            }
        }

        // If not coordinates, standard geocoding fallback (for manual entry without autocomplete)
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: query }, (results: any, status: any) => {
             if (status === 'OK' && results[0]) {
                map.setCenter(results[0].geometry.location);
                map.setZoom(17);
                marker.setPosition(results[0].geometry.location);
                setSelectedLocation({
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                    addressText: results[0].formatted_address
                });
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleManualSearch();
        }
    };

    const updateSelectedLocation = (lat: number, lng: number) => {
        if (!window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
                setSelectedLocation({
                    lat,
                    lng,
                    addressText: results[0].formatted_address
                });
            } else {
                setSelectedLocation({
                    lat,
                    lng,
                    addressText: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                });
            }
        });
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLoadingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    
                    if (map && marker) {
                        map.setCenter(pos);
                        map.setZoom(17);
                        marker.setPosition(pos);
                        updateSelectedLocation(pos.lat, pos.lng);
                    }
                    setIsLoadingLocation(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    setIsLoadingLocation(false);
                    // alert(t('map_picker.geolocation_error')); // Optional: Show alert
                },
                { enableHighAccuracy: true }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    };

    const toggleMapType = () => {
        if (!map) return;
        const newType = mapType === 'roadmap' ? 'hybrid' : 'roadmap';
        setMapType(newType);
        map.setMapTypeId(newType);
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
                <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
                     <div className="relative flex-grow shadow-lg">
                        <input
                            ref={searchInputRef}
                            type="text"
                            onKeyDown={handleKeyDown}
                            placeholder={t('map_picker.search_placeholder')}
                            className="w-full h-12 pl-10 pr-4 rounded-full bg-[#0B132B] text-white border border-gray-600 focus:ring-2 focus:ring-[#F7C873] focus:border-transparent outline-none shadow-md"
                        />
                        <button 
                            onClick={handleManualSearch}
                            className="absolute left-1 top-1 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-white rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Close Button (Mobile friendly) */}
                    <button 
                        onClick={onClose}
                        className="h-12 w-12 rounded-full bg-[#0B132B] text-white flex items-center justify-center shadow-lg border border-gray-600 hover:bg-gray-800"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Map Container */}
                <div className="flex-grow relative bg-gray-900 w-full h-full">
                    {mapError ? (
                        <div className="flex items-center justify-center h-full text-red-400 p-4 text-center">
                            {mapError}
                        </div>
                    ) : (
                        <div ref={mapRef} className="w-full h-full" />
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute top-20 right-4 flex flex-col gap-3">
                         {/* Layer Switcher */}
                         <button
                            onClick={toggleMapType}
                            className="w-10 h-10 rounded-full bg-[#0B132B] text-[#F7C873] shadow-lg flex items-center justify-center hover:bg-gray-800 border border-gray-600"
                            title={mapType === 'roadmap' ? t('map_picker.satellite') : t('map_picker.roadmap')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7" />
                            </svg>
                        </button>
                    </div>

                     {/* My Location FAB */}
                     <button
                        onClick={handleCurrentLocation}
                        className="absolute bottom-48 sm:bottom-40 right-4 w-12 h-12 rounded-full bg-[#F7C873] text-[#0B132B] shadow-lg flex items-center justify-center hover:bg-yellow-400 z-10"
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
