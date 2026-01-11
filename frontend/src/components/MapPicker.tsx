import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLoadScript, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';

type LatLng = { lat: number; lng: number };

export type PlaceSelection = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: LatLng;
};

interface MapPickerProps {
  value?: PlaceSelection;
  onChange: (next: PlaceSelection) => void;
  height?: number | string;
  defaultCenter?: LatLng;
  disabled?: boolean;
}

const libraries: ("places")[] = ["places"];

function extractAddress(place: google.maps.places.PlaceResult): PlaceSelection {
  const comps = place.address_components || [];
  const get = (type: string) => comps.find(c => (c.types || []).includes(type))?.long_name || '';
  return {
    name: place.name || undefined,
    address: place.formatted_address || undefined,
    city: get('locality') || get('sublocality') || get('administrative_area_level_2') || undefined,
    state: get('administrative_area_level_1') || undefined,
    country: get('country') || undefined,
    coordinates: place.geometry?.location ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() } : undefined,
  };
}

export default function MapPicker({ value, onChange, height = 260, defaultCenter, disabled }: MapPickerProps) {
  const apiKey = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey || '', libraries });
  const [center, setCenter] = useState<LatLng>(
    value?.coordinates || defaultCenter || { lat: -1.286389, lng: 36.817223 } // Nairobi default
  );
  const [marker, setMarker] = useState<LatLng | undefined>(value?.coordinates);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (value?.coordinates) {
      setCenter(value.coordinates);
      setMarker(value.coordinates);
    }
  }, [value?.coordinates?.lat, value?.coordinates?.lng]);

  const onPlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place || !place.geometry || !place.geometry.location) return;
    const info = extractAddress(place);
    const coords = info.coordinates!;
    setCenter(coords);
    setMarker(coords);
    onChange({ ...value, ...info });
  }, [onChange, value]);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarker(coords);
    setCenter(coords);
    // Reverse geocode minimal
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: coords }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const info = extractAddress(results[0] as any);
        onChange({ ...value, ...info, coordinates: coords });
      } else {
        onChange({ ...value, coordinates: coords });
      }
    });
  }, [onChange, value]);

  const mapOptions = useMemo<google.maps.MapOptions>(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    streetViewControl: false,
  }), []);

  if (!apiKey) {
    return (
      <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm text-theme-secondary">Google Maps API key missing. Set VITE_GOOGLE_MAPS_API_KEY.</p>
      </div>
    );
  }
  if (loadError) {
    return <div className="text-red-600 text-sm">Failed to load Google Maps</div>;
  }
  if (!isLoaded) {
    return <div className="text-sm text-theme-secondary">Loading map…</div>;
  }

  return (
    <div className="space-y-2">
      <Autocomplete onLoad={(a) => (autocompleteRef.current = a)} onPlaceChanged={onPlaceChanged}>
        <input
          type="text"
          placeholder="Search a place"
          className="input w-full"
          disabled={disabled}
        />
      </Autocomplete>
      <div style={{ height, width: '100%' }}>
        <GoogleMap
          center={center}
          zoom={marker ? 15 : 12}
          mapContainerStyle={{ height: '100%', width: '100%', borderRadius: 12 }}
          options={mapOptions}
          onClick={disabled ? undefined : onMapClick}
        >
          {marker && <Marker position={marker} />}
        </GoogleMap>
      </div>
    </div>
  );
}
