
import React, { useEffect, useRef, useState } from 'react';
import type { Package, User } from '../../types';
import { IconX, IconRoute, IconCheckCircle, IconUsers, IconMap, IconClock } from '../Icon';
import { optimizeMultiDriverRoute, calculateRouteStats, RouteStats } from '../../services/routeOptimizer';
import { cityCoordinates } from '../../services/api';

declare const L: any;

interface MultiDriverOptimizerModalProps {
    packages: Package[];
    drivers: User[];
    onClose: () => void;
    onConfirmAssignment: (assignments: { driverId: string, packages: Package[] }[]) => void;
    userLocation: { lat: number, lng: number };
}

const DRIVER_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const MultiDriverOptimizerModal: React.FC<MultiDriverOptimizerModalProps> = ({
    packages,
    drivers,
    onClose,
    onConfirmAssignment,
    userLocation
}) => {
    const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set());
    const [optimizedResults, setOptimizedResults] = useState<{ driverId: string, packages: Package[], stats: RouteStats }[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);

    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const routingControlsRef = useRef<any[]>([]);

    // Initialize Map
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([userLocation.lat, userLocation.lng], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapRef.current);

            // Add start marker
            L.marker([userLocation.lat, userLocation.lng], {
                icon: L.divIcon({
                    html: `<div style="background-color: #000; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                    className: ''
                })
            }).addTo(mapRef.current).bindPopup("<b>Centro de Distribución</b>");
        }
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        }
    }, [userLocation]);

    const handleToggleDriver = (driverId: string) => {
        setSelectedDriverIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(driverId)) newSet.delete(driverId);
            else newSet.add(driverId);
            return newSet;
        });
    };

    const handleRunOptimization = () => {
        if (selectedDriverIds.size === 0) return;
        setIsOptimizing(true);

        setTimeout(() => {
            const driverCount = selectedDriverIds.size;
            const driverIds = Array.from(selectedDriverIds);

            const routes = optimizeMultiDriverRoute(packages, driverCount, userLocation);

            const results = routes.map((route, index) => ({
                driverId: driverIds[index] || 'unassigned',
                packages: route,
                stats: calculateRouteStats(route, userLocation)
            }));

            setOptimizedResults(results);
            setIsOptimizing(false);
        }, 500);
    };

    // Draw Routes on Map
    useEffect(() => {
        if (!mapRef.current || optimizedResults.length === 0) return;

        // Clear existing routes
        routingControlsRef.current.forEach(ctrl => mapRef.current.removeControl(ctrl));
        routingControlsRef.current = [];

        optimizedResults.forEach((result: any, driverIndex: number) => {
            const color = DRIVER_COLORS[driverIndex % DRIVER_COLORS.length];
            const waypoints = [
                L.latLng(userLocation.lat, userLocation.lng),
                ...result.packages.map((pkg: Package) => {
                    let lat = pkg.destLatitude;
                    let lng = pkg.destLongitude;
                    if ((!lat || !lng) && pkg.recipientCity && cityCoordinates[pkg.recipientCity]) {
                        const coords = cityCoordinates[pkg.recipientCity];
                        lat = coords[0]; lng = coords[1];
                    }
                    return lat && lng ? L.latLng(lat, lng) : null;
                }).filter((wl: any): wl is any => wl !== null)
            ];

            if (waypoints.length < 2) return;

            const control = L.Routing.control({
                waypoints: waypoints,
                lineOptions: {
                    styles: [{ color: color, weight: 6, opacity: 0.7 }]
                },
                createMarker: () => null, // Hide markers for multi-route to avoid clutter
                show: false,
                addWaypoints: false,
                fitSelectedRoutes: driverIndex === 0 // Fit only for the first one initially
            }).addTo(mapRef.current);

            routingControlsRef.current.push(control);
        });

        // Fit map to all routes
        if (routingControlsRef.current.length > 0) {
            const bounds = L.latLngBounds([L.latLng(userLocation.lat, userLocation.lng)]);
            optimizedResults.forEach((r: any) => {
                r.packages.forEach((p: Package) => {
                    if (p.destLatitude && p.destLongitude) {
                        bounds.extend([p.destLatitude, p.destLongitude]);
                    }
                });
            });
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }

    }, [optimizedResults, userLocation]);

    const handleConfirm = () => {
        onConfirmAssignment(optimizedResults.map((r: any) => ({
            driverId: r.driverId,
            packages: r.packages
        })));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-[var(--background-secondary)] rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                            <IconRoute className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Asignación Inteligente (VRP)</h3>
                            <p className="text-xs text-[var(--text-secondary)]">Optimiza la distribución de {packages.length} paquetes entre varios conductores.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--background-hover)]"><IconX className="w-6 h-6" /></button>
                </header>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Sidebar: Driver Selection */}
                    <div className="w-full md:w-1/4 border-r border-[var(--border-primary)] flex flex-col bg-[var(--background-muted)]">
                        <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--background-secondary)]">
                            <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                                <IconUsers className="w-4 h-4 text-indigo-600" />
                                Selecciona Conductores
                            </h4>
                            <p className="text-[10px] text-[var(--text-muted)] italic">A mayor número de conductores, menor tiempo por ruta.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {drivers.map((driver: User) => (
                                <button
                                    key={driver.id}
                                    onClick={() => handleToggleDriver(driver.id)}
                                    className={`w-full flex items-center p-3 rounded-lg border transition-all ${selectedDriverIds.has(driver.id)
                                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                        : 'border-transparent bg-white hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${selectedDriverIds.has(driver.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                                        }`}>
                                        {selectedDriverIds.has(driver.id) && <IconCheckCircle className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-slate-800">{driver.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase">{driver.email.split('@')[0]}</p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="p-4 bg-[var(--background-secondary)] border-t border-[var(--border-primary)]">
                            <button
                                onClick={handleRunOptimization}
                                disabled={selectedDriverIds.size === 0 || isOptimizing}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isOptimizing ? 'Optimizando...' : 'Calcular Distribución'}
                            </button>
                        </div>
                    </div>

                    {/* Main: Map and Results */}
                    <div className="flex-1 flex flex-col relative">
                        {/* Map */}
                        <div className="flex-1 bg-slate-100">
                            <div ref={mapContainerRef} className="h-full w-full" />
                        </div>

                        {/* Distribution Results (Overlay or Bottom Panel) */}
                        {optimizedResults.length > 0 && (
                            <div className="h-1/3 border-t border-[var(--border-primary)] bg-[var(--background-secondary)] overflow-x-auto flex p-4 gap-4 custom-scrollbar">
                                {optimizedResults.map((result: any, idx: number) => {
                                    const driver = drivers.find((d: User) => d.id === result.driverId);
                                    const color = DRIVER_COLORS[idx % DRIVER_COLORS.length];
                                    return (
                                        <div key={idx} className="min-w-[280px] border border-slate-200 rounded-xl p-3 flex flex-col shadow-sm bg-white">
                                            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-100">
                                                <div className="w-3 h-10 rounded-full" style={{ backgroundColor: color }}></div>
                                                <div className="flex-1">
                                                    <h5 className="font-bold text-sm text-slate-800">{driver?.name || 'Carga Desconocida'}</h5>
                                                    <span className="text-xs text-indigo-600 font-medium">{result.packages.length} paquetes</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-2">
                                                    <IconMap className="w-4 h-4 text-slate-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Distancia</span>
                                                        <span className="text-sm font-bold text-slate-700">{result.stats.totalDistanceKm} km</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <IconClock className="w-4 h-4 text-slate-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Tiempo</span>
                                                        <span className="text-sm font-bold text-slate-700">{Math.floor(result.stats.estimatedDurationMinutes / 60)}h {result.stats.estimatedDurationMinutes % 60}m</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex-1 overflow-y-auto custom-scrollbar">
                                                <div className="space-y-1">
                                                    {result.packages.slice(0, 3).map((p: Package) => (
                                                        <div key={p.id} className="text-[10px] text-slate-500 truncate">• {p.recipientAddress}</div>
                                                    ))}
                                                    {result.packages.length > 3 && <div className="text-[10px] text-slate-400 italic">+{result.packages.length - 3} más...</div>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <footer className="p-4 border-t border-[var(--border-primary)] bg-[var(--background-muted)] rounded-b-xl flex justify-end gap-3 shadow-inner">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-md hover:bg-[var(--background-hover)]">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={optimizedResults.length === 0}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-lg disabled:opacity-50 transition-all transform active:scale-95"
                    >
                        <IconCheckCircle className="w-5 h-5" />
                        Confirmar y Asignar Todo
                    </button>
                </footer>
            </div>
            <style>{`
                .leaflet-routing-container { display: none !important; }
            `}</style>
        </div>
    );
};

export default MultiDriverOptimizerModal;
