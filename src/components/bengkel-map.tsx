/**
 * AppBenk — Bengkel Map Component (OpenStreetMap + Leaflet.js)
 *
 * Menampilkan lokasi bengkel di peta interaktif menggunakan OpenStreetMap
 * (gratis, tanpa API key). Dilengkapi fitur:
 * - Marker posisi bengkel dengan popup info interaktif
 * - Mode Edit: Drag pin & klik peta untuk menentukan lokasi bengkel secara langsung
 * - Tombol petunjuk arah (Google Maps / Waze)
 * - Deteksi lokasi pengguna (Geolocation API)
 * - Estimasi jarak ke bengkel
 * - Tombol pusatkan ke titik bengkel
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, ExternalLink, Locate, Phone, Clock, Loader2, Crosshair } from "lucide-react";
import { toast } from "sonner";

export type BengkelLocation = {
  nama: string;
  alamat: string;
  telepon?: string | undefined;
  jamOperasional?: string | undefined;
  lat: number;
  lng: number;
};

type Props = {
  bengkel: BengkelLocation;
  /** Tinggi peta (default 300px) */
  height?: number;
  /** Tampilkan info card di bawah peta */
  showInfo?: boolean;
  className?: string;
  /** Opsional: Google Maps API Key */
  apiKey?: string;
  /** Aktifkan mode edit interaktif (draggable pin & map click) */
  editable?: boolean;
  /** Callback saat posisi marker digeser atau peta diklik dalam mode edit */
  onLocationChange?: (lat: number, lng: number) => void;
};

/** Hitung jarak antara 2 koordinat (Haversine formula) dalam km */
function hitungJarak(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Parse string atau number koordinat dengan dukungan tanda koma lokal Indonesia */
export function parseCoordinate(val: string | number | null | undefined): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = String(val).trim().replace(/,/g, ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function BengkelMap({
  bengkel,
  height = 300,
  showInfo = true,
  className = "",
  apiKey,
  editable = false,
  onLocationChange,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{
    map: any;
    marker: any;
    L: any;
    renderPopup: (loc: BengkelLocation) => string;
  } | null>(null);

  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

  const editableRef = useRef(editable);
  editableRef.current = editable;

  const bengkelRef = useRef(bengkel);
  bengkelRef.current = bengkel;

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [jarak, setJarak] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Inisialisasi peta Leaflet sekali saat komponen di-mount
  useEffect(() => {
    let isMounted = true;
    let mapObj: any = null;

    const initMap = async () => {
      if (!mapRef.current) return;
      if (mapInstanceRef.current) return;

      try {
        // Inject Leaflet CSS jika belum ada
        if (!document.querySelector("#leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        // Import Leaflet
        const L = await import("leaflet");
        if (!isMounted || !mapRef.current) return;

        // Cegah double initialization jika container sudah diinisialisasi
        if ((mapRef.current as any)._leaflet_id) {
          return;
        }

        // Fix default marker icon Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        const initialLat = bengkelRef.current.lat || DEMO_BENGKEL_LOCATION.lat;
        const initialLng = bengkelRef.current.lng || DEMO_BENGKEL_LOCATION.lng;

        // Inisialisasi map
        const map = L.map(mapRef.current, {
          center: [initialLat, initialLng],
          zoom: 16,
          zoomControl: true,
          scrollWheelZoom: true,
        });
        mapObj = map;

        // Tile layer: Google Maps jika API Key tersedia, fallback ke OpenStreetMap
        const gMapsKey = apiKey || ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || "";
        if (gMapsKey) {
          L.tileLayer(`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${gMapsKey}`, {
            attribution: '© <a href="https://maps.google.com">Google Maps</a>',
            maxZoom: 20,
          }).addTo(map);
        } else {
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(map);
        }

        // Custom marker icon untuk bengkel
        const bengkelIcon = L.divIcon({
          className: "bengkel-marker-pin",
          html: `
            <div style="
              width: 42px; height: 42px;
              background: linear-gradient(135deg, #2563eb, #7c3aed);
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 4px 14px rgba(37,99,235,0.45);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer;
            ">
              <span style="
                transform: rotate(45deg);
                font-size: 19px;
                display: block;
                margin-top: 2px;
              ">🔧</span>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 42],
          popupAnchor: [0, -45],
        });

        // Marker bengkel (draggable jika dalam mode editable)
        const marker = L.marker([initialLat, initialLng], {
          icon: bengkelIcon,
          draggable: !!editableRef.current,
        }).addTo(map);

        const renderPopup = (loc: BengkelLocation) => `
          <div style="min-width: 210px; font-family: system-ui, sans-serif;">
            <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 4px;">
              🏪 ${loc.nama || "Bengkel"}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 6px; line-height: 1.4;">
              📍 ${loc.alamat || "Alamat bengkel"}
            </div>
            ${loc.telepon ? `<div style="font-size: 12px; color: #64748b;">📞 ${loc.telepon}</div>` : ""}
            ${loc.jamOperasional ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">🕐 ${loc.jamOperasional}</div>` : ""}
            ${
              editableRef.current
                ? `<div style="margin-top: 8px; padding: 4px 8px; background: #eff6ff; border-radius: 6px; font-size: 11px; color: #1d4ed8; font-weight: 600;">
                    💡 Geser pin ini atau klik peta untuk memindahkan titik bengkel.
                  </div>`
                : ""
            }
          </div>
        `;

        marker.bindPopup(renderPopup(bengkelRef.current), { maxWidth: 260 }).openPopup();

        // Event listener marker drag
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onLocationChangeRef.current?.(pos.lat, pos.lng);
        });

        // Event listener klik peta (mode edit)
        map.on("click", (e: any) => {
          if (!editableRef.current) return;
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          map.panTo([lat, lng]);
          onLocationChangeRef.current?.(lat, lng);
        });

        mapInstanceRef.current = { map, marker, L, renderPopup };
        setMapReady(true);
      } catch (err) {
        console.error("Failed to init map:", err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current?.map) {
        try {
          mapInstanceRef.current.map.remove();
        } catch {}
        mapInstanceRef.current = null;
      } else if (mapObj) {
        try {
          mapObj.remove();
        } catch {}
      }
    };
  }, []);

  // Update posisi marker, popup, dan mode dragging tanpa destroy map
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map, marker, renderPopup } = mapInstanceRef.current;

    const currentPos = marker.getLatLng();
    const latDiff = Math.abs(currentPos.lat - bengkel.lat);
    const lngDiff = Math.abs(currentPos.lng - bengkel.lng);

    if (latDiff > 0.000001 || lngDiff > 0.000001) {
      marker.setLatLng([bengkel.lat, bengkel.lng]);
      map.panTo([bengkel.lat, bengkel.lng]);
    }

    if (renderPopup) {
      marker.setPopupContent(renderPopup(bengkel));
    }

    if (editable) {
      marker.dragging?.enable();
    } else {
      marker.dragging?.disable();
    }
  }, [
    bengkel.lat,
    bengkel.lng,
    bengkel.nama,
    bengkel.alamat,
    bengkel.telepon,
    bengkel.jamOperasional,
    editable,
  ]);

  // Pusatkan peta ke lokasi bengkel saat ini
  const pusatkanKeBengkel = () => {
    if (!mapInstanceRef.current) return;
    const { map, marker } = mapInstanceRef.current;
    map.setView([bengkel.lat, bengkel.lng], 16);
    marker.openPopup();
  };

  // Tampilkan lokasi user di peta
  const deteksiLokasi = () => {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung Geolocation.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        const dist = hitungJarak(userLat, userLng, bengkel.lat, bengkel.lng);
        setJarak(dist);

        if (mapInstanceRef.current) {
          const { map, L } = mapInstanceRef.current;

          // Marker lokasi user
          const userIcon = L.divIcon({
            className: "",
            html: `
              <div style="
                width: 20px; height: 20px;
                background: #22c55e;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 0 4px rgba(34,197,94,0.3);
                animation: pulse 2s infinite;
              "></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          L.marker([userLat, userLng], { icon: userIcon })
            .addTo(map)
            .bindPopup("📍 Lokasi Anda")
            .openPopup();

          // Gambar garis rute
          L.polyline([[userLat, userLng], [bengkel.lat, bengkel.lng]], {
            color: "#3b82f6",
            weight: 3,
            dashArray: "8,6",
            opacity: 0.7,
          }).addTo(map);

          // Fit bounds agar keduanya terlihat
          map.fitBounds([[userLat, userLng], [bengkel.lat, bengkel.lng]], {
            padding: [40, 40],
          });
        }

        setLocating(false);
        toast.success(`Jarak ke ${bengkel.nama}: ±${dist.toFixed(1)} km`);
      },
      (err) => {
        setLocating(false);
        toast.error("Tidak dapat mendeteksi lokasi. Pastikan izin lokasi diaktifkan.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const bukaGoogleMaps = () => {
    const dest = `${bengkel.lat},${bengkel.lng}`;
    const url = userLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bengkel.nama + " " + bengkel.alamat)}`;
    window.open(url, "_blank");
  };

  const bukaWaze = () => {
    window.open(
      `https://waze.com/ul?ll=${bengkel.lat},${bengkel.lng}&navigate=yes`,
      "_blank",
    );
  };

  return (
    <div className={`rounded-xl overflow-hidden border border-border shadow-sm ${className}`}>
      {/* Map container */}
      <div className="relative" style={{ height }}>
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

        {/* Loading overlay */}
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat peta...
            </div>
          </div>
        )}

        {/* Floating edit mode banner */}
        {editable && mapReady && (
          <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
            <Badge className="bg-blue-600/95 text-white border-0 shadow-md backdrop-blur px-2.5 py-1 text-xs flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Mode Ubah Posisi: Geser pin atau klik di peta
            </Badge>
          </div>
        )}

        {/* Floating controls */}
        {mapReady && (
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg gap-1.5 bg-white/95 hover:bg-white text-foreground"
              onClick={pusatkanKeBengkel}
              title="Pusatkan ke titik bengkel"
            >
              <Crosshair className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs">Titik Bengkel</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg gap-1.5 bg-white/95 hover:bg-white text-foreground"
              onClick={deteksiLokasi}
              disabled={locating}
              title="Deteksi lokasi Anda saat ini"
            >
              {locating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Locate className="h-3.5 w-3.5 text-blue-600" />
              )}
              <span className="text-xs">Lokasi Saya</span>
            </Button>
          </div>
        )}
      </div>

      {/* Info card */}
      {showInfo && (
        <div className="bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                {bengkel.nama}
              </h3>
              <p className="text-xs text-muted-foreground ml-5.5">{bengkel.alamat}</p>
              {bengkel.telepon && (
                <p className="text-xs text-muted-foreground ml-5.5 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {bengkel.telepon}
                </p>
              )}
              {bengkel.jamOperasional && (
                <p className="text-xs text-muted-foreground ml-5.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {bengkel.jamOperasional}
                </p>
              )}
            </div>
            {jarak && (
              <Badge variant="secondary" className="shrink-0 text-blue-700 bg-blue-50">
                ±{jarak.toFixed(1)} km
              </Badge>
            )}
          </div>

          {/* Tombol navigasi */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={bukaGoogleMaps}
            >
              <Navigation className="h-3.5 w-3.5" />
              Google Maps
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 border-cyan-300 text-cyan-700 hover:bg-cyan-50"
              onClick={bukaWaze}
            >
              🗺️ Waze
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Default koordinat bengkel (Bengkel Fandi Motor, Purbalingga)
 */
export const DEMO_BENGKEL_LOCATION: BengkelLocation = {
  nama: "Bengkel Fandi Motor",
  alamat: "Jl. Merdeka No. 12, Purbalingga, Jawa Tengah",
  telepon: "081234567890",
  jamOperasional: "Senin–Sabtu: 08.00–17.00 WIB",
  lat: -7.3245975,
  lng: 109.352647,
};
