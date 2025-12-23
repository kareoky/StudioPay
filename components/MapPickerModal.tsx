
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
        initGoogleMaps: () => void;
    }
}

// The API Key provided by the user
const GOOGLE_MAPS_API_KEY = "AIzaSyCtOGcH3-cHuyQxG_FYx4Y1LYiuHZGYrKo";

const MapPickerModal: React.FC<MapPickerModalProps> = ({ isOpen, onClose, onLocationSelect, initialLocation }) => {
    const { t, language } = useLanguage();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Google Maps Instances
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const autocompleteRef = useRef<any>(null);
    const geocoderRef = useRef<any>(null);

    const [selectedLocation, setSelectedLocation] = useState(initialLocation);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
    const [hasAutoLocated, setHasAutoLocated] = useState(false);

    // 1. Load Google Maps Script dynamically if not present
    useEffect(() => {
        if (!isOpen) return;

        const loadScript = () => {
            if (window.google && window.google.maps) {
                initMap();
                return;
            }

            if (!document.getElementById('google-maps-script')) {
                const script = document.createElement('script');
                // Added region=EG to bias the map application towards Egypt
                script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=${language === 'ar' ? 'ar' : 'en'}&region=EG`;
                script.id = 'google-maps-script';
                script.async = true;
                script.defer = true;
                script.onload = () => initMap();
                document.head.appendChild(script);
            } else {
                // If script exists but maybe not fully loaded, wait a bit
                const checkGoogle = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkGoogle);
                        initMap();
                    }
                }, 100);
            }
        };

        loadScript();

        return () => {
            // Cleanup not strictly necessary for Google Maps single instance, 
            // but good to clear refs if unmounting
        };
    }, [isOpen, language]);

    // 2. Initialize Map
    const initMap = () => {
        if (!mapContainerRef.current || !window.google) return;

        // Default: Cairo
        const defaultLocation = { lat: 30.0444, lng: 31.2357 };
        
        // Determine start location
        const hasRealLocation = initialLocation.lat && initialLocation.lng && (initialLocation.lat !== 0);
        const startPos = hasRealLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : defaultLocation;

        // Create Map
        if (!mapRef.current) {
            mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
                center: startPos,
                zoom: 15,
                disableDefaultUI: true, // We build our own UI
                mapTypeId: mapType,
                styles: [
                     // Dark theme for map (Optional, matches app theme)
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
                    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
                    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
                    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
                    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
                ]
            });
        } else {
            // If map exists (re-opening modal), just reset center
            mapRef.current.setCenter(startPos);
        }

        // Create Geocoder
        geocoderRef.current = new window.google.maps.Geocoder();

        // Create Marker
        if (!markerRef.current) {
            markerRef.current = new window.google.maps.Marker({
                position: startPos,
                map: mapRef.current,
                draggable: true,
                animation: window.google.maps.Animation.DROP,
            });

            // Listen for drag end
            markerRef.current.addListener('dragend', () => {
                const position = markerRef.current.getPosition();
                const lat = position.lat();
                const lng = position.lng();
                handleLocationUpdate(lat, lng);
            });
            
             // Click map to move marker
            mapRef.current.addListener('click', (e: any) => {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                markerRef.current.setPosition({ lat, lng });
                handleLocationUpdate(lat, lng);
            });
        } else {
             markerRef.current.setPosition(startPos);
        }

        // Initialize Autocomplete
        if (searchInputRef.current && !autocompleteRef.current) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInputRef.current, {
                componentRestrictions: { country: "eg" }, // Restrict to Egypt
                fields: ["formatted_address", "geometry", "name"],
            });
            
            // Bind autocomplete to map
            autocompleteRef.current.bindTo("bounds", mapRef.current);

            autocompleteRef.current.addListener("place_changed", () => {
                const place = autocompleteRef.current.getPlace();

                if (!place.geometry || !place.geometry.location) {
                    alert(t('map_picker.no_results'));
                    return;
                }

                // If the place has a geometry, then present it on a map.
                if (place.geometry.viewport) {
                    mapRef.current.fitBounds(place.geometry.viewport);
                } else {
                    mapRef.current.setCenter(place.geometry.location);
                    mapRef.current.setZoom(17);
                }

                markerRef.current.setPosition(place.geometry.location);
                
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const address = place.formatted_address || place.name;

                setSelectedLocation({ lat, lng, addressText: address });
            });
        }

        // If it's a new order (no address), trigger auto-locate
        if (!hasRealLocation && !hasAutoLocated) {
            handleCurrentLocation();
        }
    };

    // 3. Handle Location Update (Reverse Geocoding)
    const handleLocationUpdate = (lat: number, lng: number) => {
        // Optimistic update
        setSelectedLocation(prev => ({ ...prev, lat, lng }));

        if (geocoderRef.current) {
            geocoderRef.current.geocode({ location: { lat, lng } }, (results: any, status: any) => {
                if (status === "OK" && results[0]) {
                    setSelectedLocation(prev => ({
                        ...prev,
                        lat,
                        lng,
                        addressText: results[0].formatted_address
                    }));
                     // Update search box text without triggering search
                    if(searchInputRef.current) {
                        searchInputRef.current.value = results[0].formatted_address;
                    }
                } else {
                    setSelectedLocation(prev => ({
                        ...prev,
                        lat,
                        lng,
                        addressText: `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                    }));
                }
            });
        }
    };

    // 4. Handle Current Location (GPS)
    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLoadingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    if(mapRef.current && markerRef.current) {
                        mapRef.current.setCenter(pos);
                        mapRef.current.setZoom(17);
                        markerRef.current.setPosition(pos);
                        handleLocationUpdate(pos.lat, pos.lng);
                    }
                    setIsLoadingLocation(false);
                    setHasAutoLocated(true);
                },
                () => {
                    // alert(t('map_picker.geolocation_error'));
                    setIsLoadingLocation(false);
                }
            );
        }
    };

    // 5. Toggle Map Type
    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.setMapTypeId(mapType);
        }
    }, [mapType]);

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
                <div className="absolute top-4 left-4 right-4 z-[500]">
                     <div className="relative shadow-lg group">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={t('map_picker.search_placeholder')}
                            className="w-full h-12 pl-10 pr-4 rounded-full bg-[#0B132B] text-white border border-gray-600 focus:ring-2 focus:ring-[#F7C873] focus:border-transparent outline-none shadow-md"
                        />
                        <div className="absolute left-3 top-3.5 text-gray-400">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Map Layer Controls */}
                <div className="absolute top-20 left-4 z-[400] flex flex-col gap-2">
                    <button 
                        onClick={() => setMapType('roadmap')}
                        className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center border transition-all ${mapType === 'roadmap' ? 'bg-[#F7C873] border-[#F7C873] text-[#0B132B]' : 'bg-[#0B132B] border-gray-600 text-white'}`}
                        title={t('map_picker.roadmap')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                    </button>
                    <button 
                        onClick={() => setMapType('satellite')}
                        className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center border transition-all ${mapType === 'satellite' ? 'bg-[#F7C873] border-[#F7C873] text-[#0B132B]' : 'bg-[#0B132B] border-gray-600 text-white'}`}
                        title={t('map_picker.satellite')}
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    
                     {/* Close Button Mobile Position */}
                    <div className="sm:hidden absolute top-[-70px] right-[-10px] z-[600]">
                         <button 
                            onClick={onClose}
                            className="h-10 w-10 rounded-full bg-[#0B132B] text-white flex items-center justify-center shadow-lg border border-gray-600 hover:bg-gray-800"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
