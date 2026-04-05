
/**
 * Utility to parse Google Maps links and extract coordinates.
 * Handles:
 * - Short links (goo.gl/maps/...)
 * - Full URLs with @lat,lng
 * - Search URLs with query params
 */

export const extractCoordsFromGoogleMapsUrl = async (url: string): Promise<{ lat: number; lng: number } | null> => {
  if (!url) return null;

  try {
    // 1. Handle full URLs with @lat,lng (e.g., https://www.google.com/maps/@30.0444,31.2357,15z)
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
      };
    }

    // 2. Handle search URLs (e.g., https://www.google.com/maps/search/?api=1&query=30.0444,31.2357)
    const queryMatch = url.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (queryMatch) {
      return {
        lat: parseFloat(queryMatch[1]),
        lng: parseFloat(queryMatch[2]),
      };
    }

    // 3. Handle short links (goo.gl/maps/...)
    // Short links need to be expanded to get the coordinates from the redirect URL.
    // Since we are in a browser, we can't easily follow redirects due to CORS.
    // However, we can try to fetch it or inform the user.
    // For now, we'll try a simple fetch, but it might fail.
    if (url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl')) {
      // We can't easily parse short links client-side without a proxy.
      // We'll return null and maybe show a message to the user to use the full URL if possible,
      // OR we can try to fetch it and see if the browser follows it.
      console.warn("Short links are hard to parse client-side due to CORS. Try using the full URL.");
      
      // Attempting to fetch (might fail due to CORS)
      try {
        const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        // With no-cors, we can't see the final URL.
      } catch (e) {
        console.error("Failed to fetch short link", e);
      }
    }

    return null;
  } catch (error) {
    console.error("Error parsing Google Maps URL", error);
    return null;
  }
};

export const openInGoogleMaps = (lat: number, lng: number, label?: string) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${label ? `&query_place_id=${label}` : ''}`;
  window.open(url, '_blank');
};

export const openGoogleMapsNavigation = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, '_blank');
};

export const getGoogleMapsSearchUrl = () => {
    return "https://www.google.com/maps";
};
