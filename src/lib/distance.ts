import { useEffect, useRef, useState } from "react";

// Haversine distance in km
function haversineKm(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function useDistanceTracker(active: boolean) {
  const [km, setKm] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastRef = useRef<GeolocationCoordinates | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (watchRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation unsupported on this device.");
      return;
    }
    lastRef.current = null;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;
        if (lastRef.current) {
          const d = haversineKm(lastRef.current, c);
          // Filter GPS jitter: ignore <2m jumps and >50m/sec teleports
          if (d > 0.002 && d < 0.05) setKm((k) => k + d);
        }
        lastRef.current = c;
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    };
  }, [active]);

  return { km, error, reset: () => { setKm(0); lastRef.current = null; } };
}
