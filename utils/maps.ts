/**
 * Utility to parse Google Maps links and extract coordinates.
 * Handles:
 * - Direct coordinate inputs (30.0444, 31.2357)
 * - Full URLs with @lat,lng
 * - URLs with query params (query=lat,lng or q=lat,lng)
 * - URLs with protobuf coordinate params (!3dLAT!4dLNG)
 */

export const extractCoordsFromGoogleMapsUrl = async (url: string): Promise<{ lat: number; lng: number } | null> => {
  if (!url) return null;
  const trimmed = url.trim();

  try {
    // 0. Direct coordinates format like "30.0444, 31.2357" or "30.0444 31.2357"
    const directMatch = trimmed.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/);
    if (directMatch) {
      const parts = trimmed.split(/[,\s]+/).filter(Boolean);
      if (parts.length >= 2) {
        return {
          lat: parseFloat(parts[0]),
          lng: parseFloat(parts[1]),
        };
      }
    }

    // 1. Handle URLs with protobuf markers: !3d30.0444!4d31.2357
    const protoMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (protoMatch) {
      return {
        lat: parseFloat(protoMatch[1]),
        lng: parseFloat(protoMatch[2]),
      };
    }

    // 2. Handle full URLs with @lat,lng (e.g., https://www.google.com/maps/@30.0444,31.2357,15z)
    const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
      };
    }

    // 3. Handle search / query URLs (e.g., query=30.0444,31.2357 or q=30.0444,31.2357)
    const queryMatch = trimmed.match(/[?&](?:query|q)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (queryMatch) {
      return {
        lat: parseFloat(queryMatch[1]),
        lng: parseFloat(queryMatch[2]),
      };
    }

    // 4. Handle ll=lat,lng
    const llMatch = trimmed.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatch) {
      return {
        lat: parseFloat(llMatch[1]),
        lng: parseFloat(llMatch[2]),
      };
    }

    return null;
  } catch (error) {
    console.error("Error parsing Google Maps URL", error);
    return null;
  }
};

export const openInGoogleMaps = (lat: number, lng: number, label?: string) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${label ? `&query_place_id=${encodeURIComponent(label)}` : ''}`;
  window.open(url, '_blank');
};

export const openGoogleMapsNavigation = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, '_blank');
};

export const getGoogleMapsSearchUrl = (query?: string) => {
  if (query && query.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
  }
  return "https://www.google.com/maps";
};
