"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L, { type Marker as LeafletMarker } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import dynamic from "next/dynamic";
import { Activity, AlertTriangle, CheckCircle2, MapPin, Radio, Truck } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

const MarkerClusterGroup = dynamic(() => import("react-leaflet-cluster"), { ssr: false });

type VehicleLocation = {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  fuelLevel?: number;
  engineTemp?: number;
  riskScore?: number;
  prediction?: number;
  timestamp?: string;
};

type MapState = "loading" | "ready" | "error";

function markerColor(vehicle: VehicleLocation) {
  if (vehicle.prediction === 1) return "#ff4d6d";
  if ((vehicle.riskScore || 0) > 0.3) return "#ff9f43";
  return "#61e6a8";
}
function markerIcon(vehicle: VehicleLocation) {
  const color = markerColor(vehicle);
  return L.divIcon({
    className: "fleet-marker-wrapper",
    html: `<span class="fleet-marker" style="--marker-color:${color}"><i></i></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}
function formatValue(value: number | string | undefined, suffix = "") {
  return value === undefined ? "N/A" : `${value}${suffix}`;
}
function formatTime(timestamp?: string) {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
}
function MapViewport({ vehicles }: { vehicles: VehicleLocation[] }) {
  const map = useMap();
  const hasFitted = useRef(false);
  useEffect(() => {
    if (!vehicles.length || hasFitted.current) return;
    const bounds = L.latLngBounds(vehicles.map((vehicle) => [vehicle.latitude, vehicle.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
    hasFitted.current = true;
  }, [map, vehicles]);
  return null;
}

function AnimatedVehicleMarker({ vehicle }: { vehicle: VehicleLocation }) {
  const markerRef = useRef<LeafletMarker | null>(null);
  const initialPosition = useRef<[number, number]>([vehicle.latitude, vehicle.longitude]);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const start = marker.getLatLng();
    const target = L.latLng(vehicle.latitude, vehicle.longitude);
    if (start.lat === target.lat && start.lng === target.lng) return;
    const startedAt = performance.now();
    const duration = 900;
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      marker.setLatLng([
        start.lat + (target.lat - start.lat) * progress,
        start.lng + (target.lng - start.lng) * progress,
      ]);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [vehicle.latitude, vehicle.longitude]);

  return <Marker ref={markerRef} position={initialPosition.current} icon={markerIcon(vehicle)}>
    <Popup><div className="vehicle-popup"><strong>{vehicle.vehicleId}</strong><span>Speed <b>{formatValue(vehicle.speed, " km/h")}</b></span><span>Fuel level <b>{formatValue(vehicle.fuelLevel, "%")}</b></span><span>Engine temperature <b>{formatValue(vehicle.engineTemp, "°C")}</b></span><span>Risk score <b>{formatValue(typeof vehicle.riskScore === "number" ? `${(vehicle.riskScore * 100).toFixed(1)}%` : undefined)}</b></span><span>AI verdict <b className={vehicle.prediction === 1 ? "popup-risk" : "popup-healthy"}>{vehicle.prediction === 1 ? "HIGH RISK" : vehicle.prediction === 0 ? "HEALTHY" : "N/A"}</b></span><small>Last updated {formatTime(vehicle.timestamp)}</small></div></Popup>
  </Marker>;
}

export default function LeafletVehicleMap() {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [state, setState] = useState<MapState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let refreshing = false;
    const refresh = async () => {
      if (disposed || refreshing) return;
      refreshing = true;
      try {
        const response = await fetch("/api/dashboard/locations", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Location API returned an error.");
        const locations = await response.json() as VehicleLocation[];
        if (disposed) return;
        setVehicles(locations);
        setState("ready");
        setError("");
      } catch (loadError) {
        if (disposed || (loadError instanceof DOMException && loadError.name === "AbortError")) return;
        setState("error");
        setError(loadError instanceof Error ? loadError.message : "Unable to load vehicle locations.");
      } finally {
        refreshing = false;
      }
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => { disposed = true; controller.abort(); clearInterval(interval); };
  }, []);

  const activeVehicles = vehicles.length;
  const highRiskVehicles = vehicles.filter((vehicle) => vehicle.prediction === 1).length;
  const healthyVehicles = vehicles.filter((vehicle) => vehicle.prediction === 0).length;
  const center = useMemo<[number, number]>(() => vehicles.length ? [vehicles[0].latitude, vehicles[0].longitude] : [0, 0], [vehicles]);

  return <section className="live-map-panel panel">
    <div className="panel-heading"><div><span className="eyebrow">OPERATIONS MAP / REAL-TIME GPS</span><h2>Fleet in motion</h2></div><span className="live-pill"><Activity size={11} /> MONITORING</span></div>
    <div className="map-stats"><div><span><Truck size={11} /> TOTAL ACTIVE VEHICLES</span><b>{activeVehicles}</b></div><div><span><AlertTriangle size={11} /> HIGH RISK VEHICLES</span><b className="map-risk-number">{highRiskVehicles}</b></div><div><span><CheckCircle2 size={11} /> HEALTHY VEHICLES</span><b className="map-healthy-number">{healthyVehicles}</b></div></div>
    <div className="leaflet-map-shell">
      {state === "loading" && <div className="map-overlay"><Radio size={18} /> Loading live vehicle positions...</div>}
      {state === "error" && <div className="map-overlay map-error"><AlertTriangle size={18} /><b>Location stream unavailable</b><span>{error}</span></div>}
      {state === "ready" && !vehicles.length && <div className="map-overlay"><MapPin size={18} /> No telemetry records with GPS coordinates.</div>}
      <MapContainer center={center} zoom={5} scrollWheelZoom className="leaflet-map">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapViewport vehicles={vehicles} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={45}>
          {vehicles.map((vehicle) => <AnimatedVehicleMarker key={vehicle.vehicleId} vehicle={vehicle} />)}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
    <div className="map-legend"><span><CheckCircle2 size={13} className="legend-icon healthy" /> Healthy</span><span><Activity size={13} className="legend-icon monitor" /> Monitor</span><span><AlertTriangle size={13} className="legend-icon high-risk" /> High Risk</span><span className="map-refresh">Auto-refresh 5s</span></div>
  </section>;
}
