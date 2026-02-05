"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface MeetingMapProps {
    year: string;
    data: any[];
}

const MeetingMap = ({ year, data }: MeetingMapProps) => {
    const [isMounted, setIsMounted] = useState(false);
    const [L, setL] = useState<any>(null);

    useEffect(() => {
        setIsMounted(true);
        import('leaflet').then(leaflet => {
            setL(leaflet);
            delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
            leaflet.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });
        });
    }, []);

    if (!isMounted || !L) return <div className="h-[400px] bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500">Loading Map Engine...</div>;

    // Calculate bounds from actual data
    const validLocations = data.filter(e => e.latitude && e.longitude);

    let center: [number, number] = [40.730610, -73.935242]; // Default to NY
    let zoom = 10;

    if (validLocations.length > 0) {
        // Calculate center from all points
        const avgLat = validLocations.reduce((sum, e) => sum + e.latitude, 0) / validLocations.length;
        const avgLng = validLocations.reduce((sum, e) => sum + e.longitude, 0) / validLocations.length;
        center = [avgLat, avgLng];

        // Calculate zoom based on spread
        if (validLocations.length > 1) {
            const lats = validLocations.map(e => e.latitude);
            const lngs = validLocations.map(e => e.longitude);
            const latSpread = Math.max(...lats) - Math.min(...lats);
            const lngSpread = Math.max(...lngs) - Math.min(...lngs);
            const maxSpread = Math.max(latSpread, lngSpread);

            // Adjust zoom based on spread (rough approximation)
            if (maxSpread > 10) zoom = 4;
            else if (maxSpread > 5) zoom = 6;
            else if (maxSpread > 1) zoom = 8;
            else if (maxSpread > 0.5) zoom = 10;
            else zoom = 12;
        } else {
            zoom = 12; // Single point, zoom in close
        }
    }

    return (
        <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative z-0">
            <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CARTO'
                />
                {data.map(event => event.latitude && event.longitude && (
                    <Marker key={event.id} position={[event.latitude, event.longitude]}>
                        <Popup>
                            <div className="p-2 min-w-[150px]">
                                <p className="text-[10px] font-black text-blue-500 uppercase mb-1 tracking-widest">{event.date}</p>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">{event.title}</h3>
                                <p className="text-[10px] text-slate-500">{event.location}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <div className="absolute top-4 right-4 z-[1000] bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700 text-[10px] font-bold text-white uppercase tracking-widest">
                {data.length} Real Pins
            </div>
        </div>
    );
};

export default MeetingMap;
