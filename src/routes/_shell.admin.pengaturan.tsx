import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  MessageSquare,
  Mail,
  MapPin,
  Save,
  TestTube,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Settings2,
  Wifi,
  WifiOff,
  ChevronRight,
  Phone,
  RefreshCw,
  Wallet,
  QrCode,
  Building2,
  UploadCloud,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Loader2,
  Crown,
  Construction,
  Clock,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { storagePaymentService } from "@/services/appbenk-service";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import {
  getWAConfig,
  saveWAConfig,
  formatNomorWA,
  type WAConfig,
  type WAProvider,
} from "@/lib/whatsapp";
import {
  BengkelMap,
  type BengkelLocation,
  DEMO_BENGKEL_LOCATION,
  parseCoordinate,
} from "@/components/bengkel-map";

export const Route = createFileRoute("/_shell/admin/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan Integrasi — AppBenk" },
      {
        name: "description",
        content: "Konfigurasi WhatsApp Gateway, Email SMTP, dan lokasi bengkel di Google Maps.",
      },
    ],
  }),
  component: PengaturanIntegrasi,
});

const BENGKEL_LOC_KEY = "appbenk_bengkel_location";

function saveBengkelLocation(loc: BengkelLocation, workshopId?: string) {
  if (workshopId) {
    localStorage.setItem(`appbenk_bengkel_location_${workshopId}`, JSON.stringify(loc));
  }
  localStorage.setItem(BENGKEL_LOC_KEY, JSON.stringify(loc));
}

function getBengkelLocation(workshopId?: string): BengkelLocation {
  try {
    if (workshopId) {
      const ws = localStorage.getItem(`appbenk_bengkel_location_${workshopId}`);
      if (ws) return JSON.parse(ws);
    }
    const raw = localStorage.getItem(BENGKEL_LOC_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_BENGKEL_LOCATION;
}

function PengaturanIntegrasi() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner" || user?.role === "super_admin";
  const { activeBengkel, activeBengkelId, updateBengkelInfo, refreshBengkel } = useStore();
  const workshopId =
    user?.bengkelId ||
    user?.workshopId ||
    activeBengkelId ||
    activeBengkel?.id ||
    "bengkel-2307";

  useEffect(() => {
    refreshBengkel?.();
  }, [refreshBengkel]);

  // ── WhatsApp State ──────────────────────────────────────────────
  const [waEnabled, setWaEnabled] = useState(false);
  const [waProvider, setWaProvider] = useState<WAProvider>("wablas");
  const [waToken, setWaToken] = useState("");
  const [waGatewayUrl, setWaGatewayUrl] = useState("");
  const [waSender, setWaSender] = useState("");
  const [waTwilioSid, setWaTwilioSid] = useState("");
  const [waTwilioToken, setWaTwilioToken] = useState("");
  const [waTwilioFrom, setWaTwilioFrom] = useState("");
  const [waTestNomor, setWaTestNomor] = useState("");
  const [waTestLoading, setWaTestLoading] = useState(false);
  const [waTestResult, setWaTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showWaToken, setShowWaToken] = useState(false);

  // ── Maps State ──────────────────────────────────────────────────
  const [bengkelLoc, setBengkelLoc] = useState<BengkelLocation>(DEMO_BENGKEL_LOCATION);
  const [latInput, setLatInput] = useState<string>(String(DEMO_BENGKEL_LOCATION.lat));
  const [lngInput, setLngInput] = useState<string>(String(DEMO_BENGKEL_LOCATION.lng));
  const [locEditing, setLocEditing] = useState(false);
  const [savingLoc, setSavingLoc] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [searchAlamat, setSearchAlamat] = useState("");

  // Load workshop location when component mounts or active workshop changes
  useEffect(() => {
    // 1. Prioritaskan activeBengkel dari database
    if (activeBengkel && (activeBengkel.lat || activeBengkel.alamat)) {
      const cleanAlamat = (activeBengkel.alamat || "").replace(/\[geo:[^\]]+\]/gi, "").trim();
      const current: BengkelLocation = {
        nama: activeBengkel.nama || DEMO_BENGKEL_LOCATION.nama,
        alamat: cleanAlamat || DEMO_BENGKEL_LOCATION.alamat,
        telepon: activeBengkel.telepon || DEMO_BENGKEL_LOCATION.telepon,
        jamOperasional: activeBengkel.jamOperasional || DEMO_BENGKEL_LOCATION.jamOperasional,
        lat: activeBengkel.lat ?? DEMO_BENGKEL_LOCATION.lat,
        lng: activeBengkel.lng ?? DEMO_BENGKEL_LOCATION.lng,
      };
      setBengkelLoc(current);
      setLatInput(String(current.lat));
      setLngInput(String(current.lng));
      return;
    }

    // 2. Cek localStorage spesifik workshop
    const wsKey = `appbenk_bengkel_location_${workshopId}`;
    const savedWs = localStorage.getItem(wsKey);
    if (savedWs) {
      try {
        const parsed = JSON.parse(savedWs);
        setBengkelLoc(parsed);
        setLatInput(String(parsed.lat));
        setLngInput(String(parsed.lng));
        return;
      } catch {}
    }

    // 3. Fallback: DEMO_BENGKEL_LOCATION
    setBengkelLoc(DEMO_BENGKEL_LOCATION);
    setLatInput(String(DEMO_BENGKEL_LOCATION.lat));
    setLngInput(String(DEMO_BENGKEL_LOCATION.lng));
  }, [
    workshopId,
    activeBengkel?.id,
    activeBengkel?.nama,
    activeBengkel?.alamat,
    activeBengkel?.telepon,
    activeBengkel?.lat,
    activeBengkel?.lng,
    activeBengkel?.jamOperasional,
  ]);

  useEffect(() => {
    const cfg = getWAConfig();
    if (cfg) {
      setWaEnabled(cfg.enabled);
      setWaProvider(cfg.provider);
      setWaToken(cfg.token);
      setWaGatewayUrl(cfg.gatewayUrl || "");
      setWaSender(cfg.senderNumber || "");
      setWaTwilioSid(cfg.twilioAccountSid || "");
      setWaTwilioToken(cfg.twilioAuthToken || "");
      setWaTwilioFrom(cfg.twilioFrom || "");
    }
  }, []);

  // ── WhatsApp (Dinonaktifkan Sementara — Tahap Pengembangan) ──────
  const simpanWA = () => {
    toast.info("Fitur WhatsApp Notifikasi sedang dalam tahap pengembangan dan belum dapat disimpan.");
  };

  const testWA = async () => {
    toast.info("Fitur WhatsApp Notifikasi sedang dalam tahap pengembangan.");
  };

  // ── Maps Handlers ────────────────────────────────────────────────
  const handleMapLocationChange = (lat: number, lng: number) => {
    if (!isOwner) {
      toast.error("Hanya Owner bengkel yang memiliki izin untuk memindahkan titik lokasi peta.");
      return;
    }
    setBengkelLoc((prev) => ({ ...prev, lat, lng }));
    setLatInput(lat.toFixed(6));
    setLngInput(lng.toFixed(6));
  };

  const handleLatChange = (val: string) => {
    if (!isOwner) return;
    setLatInput(val);
    const parsed = parseCoordinate(val);
    if (parsed !== 0 && parsed >= -90 && parsed <= 90) {
      setBengkelLoc((prev) => ({ ...prev, lat: parsed }));
    }
  };

  const handleLngChange = (val: string) => {
    if (!isOwner) return;
    setLngInput(val);
    const parsed = parseCoordinate(val);
    if (parsed !== 0 && parsed >= -180 && parsed <= 180) {
      setBengkelLoc((prev) => ({ ...prev, lng: parsed }));
    }
  };

  const cariAlamatDiPeta = async () => {
    if (!isOwner) {
      toast.error("Hanya Owner bengkel yang memiliki izin untuk mencari dan mengubah titik lokasi.");
      return;
    }
    const query = searchAlamat.trim() || bengkelLoc.alamat.trim();
    if (!query) {
      toast.error("Ketik nama alamat atau kota untuk mencari lokasi.");
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            "Accept-Language": "id,en",
          },
        },
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);
        setBengkelLoc((prev) => ({ ...prev, lat: newLat, lng: newLng }));
        setLatInput(newLat.toFixed(6));
        setLngInput(newLng.toFixed(6));
        toast.success(`Titik lokasi ditemukan: ${item.display_name.split(",")[0]}`);
      } else {
        toast.error("Lokasi tidak ditemukan. Coba ketik nama kota atau kecamatan.");
      }
    } catch {
      toast.error("Gagal mencari lokasi. Pastikan koneksi internet aktif.");
    } finally {
      setGeocoding(false);
    }
  };

  const simpanLokasi = async () => {
    if (!isOwner) {
      toast.error("Akses ditolak: Hanya Owner bengkel yang berhak menyimpan perubahan lokasi dan profil bengkel.");
      return;
    }
    const finalLat = parseCoordinate(latInput);
    const finalLng = parseCoordinate(lngInput);

    if (isNaN(finalLat) || isNaN(finalLng) || (finalLat === 0 && finalLng === 0)) {
      toast.error("Silakan tentukan koordinat lokasi bengkel di peta.");
      return;
    }

    if (finalLat < -90 || finalLat > 90 || finalLng < -180 || finalLng > 180) {
      toast.error("Koordinat tidak valid. Latitude harus antara -90 s/d 90, Longitude -180 s/d 180.");
      return;
    }

    setSavingLoc(true);
    try {
      const locData: BengkelLocation = {
        nama: bengkelLoc.nama.trim() || activeBengkel?.nama || "Bengkel",
        alamat: bengkelLoc.alamat.trim() || activeBengkel?.alamat || "",
        telepon: bengkelLoc.telepon?.trim() || activeBengkel?.telepon || "",
        jamOperasional: bengkelLoc.jamOperasional?.trim() || "Senin–Sabtu: 08.00–17.00 WIB",
        lat: finalLat,
        lng: finalLng,
      };

      // 1. Simpan ke localStorage spesifik workshop
      localStorage.setItem(`appbenk_bengkel_location_${workshopId}`, JSON.stringify(locData));
      // 2. Simpan ke localStorage global untuk fallback
      localStorage.setItem("appbenk_bengkel_location", JSON.stringify(locData));
      localStorage.setItem("appbenk_bengkel_location_bengkel-2307", JSON.stringify(locData));

      // 3. Update data bengkel di useStore dan Supabase
      await updateBengkelInfo(workshopId, {
        nama: locData.nama,
        alamat: locData.alamat,
        telepon: locData.telepon,
        lat: locData.lat,
        lng: locData.lng,
        jamOperasional: locData.jamOperasional,
      });

      // 4. Update state lokal
      setBengkelLoc(locData);
      setLatInput(String(locData.lat));
      setLngInput(String(locData.lng));
      setLocEditing(false);

      // 5. Broadcast custom event
      window.dispatchEvent(
        new CustomEvent("appbenk_bengkel_location_updated", {
          detail: { workshopId, location: locData },
        }),
      );

      toast.success("Lokasi bengkel dan informasi berhasil disimpan!");
    } catch (err) {
      console.error("Gagal simpan lokasi:", err);
      toast.error("Gagal menyimpan lokasi bengkel.");
    } finally {
      setSavingLoc(false);
    }
  };

  const batalEditLokasi = () => {
    const wsKey = `appbenk_bengkel_location_${workshopId}`;
    const savedWs = localStorage.getItem(wsKey) || localStorage.getItem("appbenk_bengkel_location");
    if (savedWs) {
      try {
        const parsed = JSON.parse(savedWs);
        setBengkelLoc(parsed);
        setLatInput(String(parsed.lat));
        setLngInput(String(parsed.lng));
        setLocEditing(false);
        return;
      } catch {}
    }
    const fallback: BengkelLocation = {
      nama: activeBengkel?.nama || DEMO_BENGKEL_LOCATION.nama,
      alamat: activeBengkel?.alamat || DEMO_BENGKEL_LOCATION.alamat,
      telepon: activeBengkel?.telepon || DEMO_BENGKEL_LOCATION.telepon,
      jamOperasional: DEMO_BENGKEL_LOCATION.jamOperasional,
      lat: DEMO_BENGKEL_LOCATION.lat,
      lng: DEMO_BENGKEL_LOCATION.lng,
    };
    setBengkelLoc(fallback);
    setLatInput(String(fallback.lat));
    setLngInput(String(fallback.lng));
    setLocEditing(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
      <PageHeader
        title={isOwner ? "Pengaturan Bengkel & Integrasi" : "Pengaturan Integrasi"}
        description={
          isOwner
            ? "Kelola profil bengkel, titik koordinat peta, dan konfigurasi integrasi sistem"
            : "Konfigurasi WhatsApp, Email, dan informasi sistem untuk AppBenk"
        }
      />

      <Tabs defaultValue="whatsapp">
        <TabsList className={cn("grid w-full", isOwner ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3")}>
          <TabsTrigger value="whatsapp" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp</span>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
              Tahap Pengembangan
            </span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="maps" className="gap-1.5">
              <MapPin className="h-4 w-4" />
              Lokasi Bengkel
            </TabsTrigger>
          )}
          <TabsTrigger value="pembayaran" className="gap-1.5">
            <Wallet className="h-4 w-4" />
            Pembayaran
          </TabsTrigger>
        </TabsList>

        {/* ── TAB WHATSAPP (DINONAKTIFKAN — TAHAP PENGEMBANGAN) ── */}
        <TabsContent value="whatsapp" className="mt-4 space-y-4">
          {/* BANNER INFORMASI TAHAP PENGEMBANGAN */}
          <div className="rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 p-5 shadow-sm dark:border-amber-900/60 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-950/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-600 dark:text-amber-400">
                <Construction className="size-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">
                    Fitur WhatsApp Notifikasi Sedang Dalam Tahap Pengembangan
                  </h3>
                  <Badge variant="outline" className="border-amber-400 bg-amber-100/90 text-amber-800 text-[10px] font-semibold dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                    <Clock className="mr-1 size-3" /> Segera Hadir
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fitur otomatisasi pesan WhatsApp pengingat servis dan tagihan ke pelanggan saat ini belum dapat digunakan dan sedang disiapkan oleh tim developer. Nantikan pembaruan sistem berikutnya.
                </p>
              </div>
            </div>
          </div>

          {/* FORM WHATSAPP (PREVIEW TERKUNCI DENGAN OVERLAY & SEMUA FIELD DISABLED) */}
          <div className="relative">
            {/* Backdrop Blur Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/55 backdrop-blur-[2px] p-6 text-center select-none pointer-events-none">
              <div className="rounded-full bg-background/95 p-3.5 shadow-md border border-amber-200/80 dark:border-amber-900/60 mb-2.5">
                <Lock className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="font-semibold text-sm text-foreground">Pengaturan WhatsApp Dinonaktifkan</p>
              <p className="text-xs text-muted-foreground max-w-md mt-1">
                Semua input dan tombol integrasi dikunci sementara agar tidak mengganggu transaksi operasional bengkel Anda.
              </p>
            </div>

            <Card className="opacity-60 pointer-events-none select-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      WhatsApp Reminder & Notifikasi
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Kirim otomatis notifikasi booking, status servis, tagihan, dan reminder berkala
                      ke pelanggan via WhatsApp.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <Lock className="mr-1 h-3 w-3" />
                      Terkunci
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Enable toggle (Disabled) */}
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                  <div>
                    <p className="font-medium text-sm">Aktifkan WhatsApp Notifikasi</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Kirim notifikasi otomatis ke pelanggan saat ada update servis
                    </p>
                  </div>
                  <Switch
                    id="wa-enabled"
                    checked={false}
                    disabled={true}
                  />
                </div>

                {/* Provider selection (Disabled) */}
                <div className="space-y-2">
                  <Label>Provider / Gateway WhatsApp</Label>
                  <Select value={waProvider} disabled={true}>
                    <SelectTrigger disabled>
                      <SelectValue placeholder="Twilio WhatsApp — Official Meta/Twilio Business Cloud API" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Twilio Configuration Fields (Disabled) */}
                <div className="space-y-2">
                  <Label htmlFor="wa-twilio-sid">Twilio Account SID</Label>
                  <Input
                    id="wa-twilio-sid"
                    placeholder="AC_sample_twilio_account_sid"
                    value={waTwilioSid}
                    disabled={true}
                  />
                  <p className="text-xs text-muted-foreground">
                    Temukan Account SID di Twilio Console
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-twilio-token">Twilio Auth Token</Label>
                  <Input
                    id="wa-twilio-token"
                    type="password"
                    value="••••••••••••••••••••••••••••"
                    disabled={true}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wa-twilio-from">Nomor Pengirim Twilio WhatsApp (From)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="wa-twilio-from"
                      placeholder="whatsapp:+14155238886"
                      value={waTwilioFrom}
                      disabled={true}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contoh untuk Twilio Sandbox: <span className="font-mono">whatsapp:+14155238886</span>
                  </p>
                </div>

                <Separator />

                {/* Test kirim (Disabled) */}
                <div className="space-y-3">
                  <Label>Test Kirim Pesan</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Nomor WA tujuan test (08xxxxxxxxxx)"
                        value={waTestNomor}
                        disabled={true}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      disabled={true}
                      className="gap-1.5 shrink-0"
                    >
                      <TestTube className="h-4 w-4" />
                      Kirim Test
                    </Button>
                  </div>
                </div>

                {/* Notifikasi yang dikirim otomatis */}
                <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Rencana Notifikasi Otomatis
                  </p>
                  {[
                    { icon: "📅", text: "Konfirmasi Booking — saat admin konfirmasi booking pelanggan" },
                    { icon: "🔧", text: "Servis Dimulai — saat status berubah ke 'Diproses'" },
                    { icon: "✅", text: "Servis Selesai — saat status berubah ke 'Selesai'" },
                    { icon: "💰", text: "Tagihan Siap — saat status 'Menunggu Pembayaran'" },
                    { icon: "🎉", text: "Pembayaran Diterima — setelah pembayaran terverifikasi" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>

                <Button disabled={true} className="w-full gap-1.5 opacity-60 cursor-not-allowed">
                  <Lock className="h-4 w-4" />
                  Konfigurasi Dinonaktifkan (Tahap Pengembangan)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB EMAIL ─────────────────────────────────────────── */}
        <TabsContent value="email" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Konfigurasi Email SMTP Kustom
              </CardTitle>
              <CardDescription>
                Kirim email dari domain bengkel Anda sendiri menggunakan SMTP kustom di Supabase.
                Email pelanggan (verifikasi, reset password, notifikasi) akan terkirim dari akun email bengkel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
                <p className="font-semibold text-sm text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Konfigurasi dilakukan di Supabase Dashboard
                </p>
                <p className="text-xs text-amber-700">
                  Email SMTP dikonfigurasi langsung di Supabase, bukan di kode aplikasi.
                  Ikuti langkah-langkah di bawah untuk mengaktifkan email dari domain bengkel Anda.
                </p>
              </div>

              {/* Langkah-langkah */}
              <div className="space-y-4">
                <p className="font-medium text-sm">Langkah Setup Email SMTP Kustom:</p>

                {[
                  {
                    no: 1,
                    judul: "Buka Supabase Dashboard",
                    desc: "Login ke supabase.com, buka project AppBenk Anda.",
                    link: "https://supabase.com/dashboard",
                    linkText: "Buka Supabase Dashboard",
                  },
                  {
                    no: 2,
                    judul: "Masuk ke Authentication → SMTP Settings",
                    desc: 'Di sidebar kiri: Authentication → Settings → SMTP Settings. Aktifkan "Custom SMTP".',
                  },
                  {
                    no: 3,
                    judul: "Pilih Provider Email",
                    desc: "Gunakan salah satu provider berikut:",
                    providers: [
                      { nama: "Resend", url: "https://resend.com", keterangan: "Gratis 100 email/hari, mudah setup" },
                      { nama: "Brevo (Sendinblue)", url: "https://brevo.com", keterangan: "Gratis 300 email/hari" },
                      { nama: "Mailgun", url: "https://mailgun.com", keterangan: "Gratis 1000 email/bulan (US only)" },
                      { nama: "Gmail SMTP", url: "https://gmail.com", keterangan: "Gratis, butuh App Password" },
                    ],
                  },
                  {
                    no: 4,
                    judul: "Masukkan Kredensial SMTP",
                    desc: "",
                    fields: [
                      { label: "SMTP Host", value: "smtp.resend.com (atau sesuai provider)" },
                      { label: "SMTP Port", value: "465 (SSL) atau 587 (TLS)" },
                      { label: "SMTP User", value: "apikey (untuk Resend/Mailgun)" },
                      { label: "SMTP Password", value: "API Key dari provider email Anda" },
                      { label: "Sender Email", value: "noreply@bengkel-anda.com" },
                      { label: "Sender Name", value: "Nama Bengkel Anda" },
                    ],
                  },
                  {
                    no: 5,
                    judul: "Kustomisasi Template Email",
                    desc: 'Di Authentication → Email Templates, Anda bisa kustomisasi tampilan email (logo bengkel, warna, teks) untuk: Confirm Email, Reset Password, Magic Link.',
                  },
                ].map((step) => (
                  <div key={step.no} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                      {step.no}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <p className="font-medium text-sm">{step.judul}</p>
                      {step.desc && <p className="text-xs text-muted-foreground">{step.desc}</p>}
                      {step.link && (
                        <a
                          href={step.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary underline"
                        >
                          {step.linkText}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {step.providers && (
                        <div className="space-y-1 mt-1">
                          {step.providers.map((p) => (
                            <div key={p.nama} className="flex items-center gap-2">
                              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary underline"
                              >
                                {p.nama}
                              </a>
                              <span className="text-xs text-muted-foreground">— {p.keterangan}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {step.fields && (
                        <div className="mt-1 rounded-lg border overflow-hidden">
                          {step.fields.map((f) => (
                            <div
                              key={f.label}
                              className="flex items-center justify-between px-3 py-2 text-xs border-b last:border-0 bg-muted/20"
                            >
                              <span className="font-mono text-muted-foreground">{f.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-foreground">{f.value}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard?.writeText(f.value);
                                    toast.success("Disalin!");
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Link langsung */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Link Langsung ke Supabase:</p>
                <div className="grid grid-cols-1 gap-2">
                  <a
                    href="https://supabase.com/dashboard/project/_/auth/smtp"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <Mail className="h-4 w-4" />
                      Buka SMTP Settings di Supabase
                      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </Button>
                  </a>
                  <a
                    href="https://supabase.com/dashboard/project/_/auth/templates"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <Mail className="h-4 w-4 text-blue-500" />
                      Kustomisasi Template Email
                      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB MAPS (KHUSUS OWNER) ────────────────────────────── */}
        {isOwner && (
          <TabsContent value="maps" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-500" />
                    Lokasi Bengkel di Peta
                  </CardTitle>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 font-medium">
                    <Crown className="h-3 w-3 text-amber-600" /> Akses Owner
                  </Badge>
                </div>
                <CardDescription>
                  Atur koordinat dan informasi lokasi bengkel yang akan ditampilkan kepada pelanggan
                  saat booking servis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Interactive Bengkel Map */}
                <BengkelMap
                  bengkel={bengkelLoc}
                  height={320}
                  editable={locEditing}
                  onLocationChange={handleMapLocationChange}
                />

                {/* Form edit lokasi */}
                {locEditing ? (
                  <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        Edit Informasi & Koordinat Bengkel
                      </p>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Mode Edit Interaktif
                      </Badge>
                    </div>

                    {/* Pencarian alamat cepat di peta */}
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <Label htmlFor="search-map-address" className="text-xs font-medium text-muted-foreground">
                        Cari Alamat / Kota di Peta (Otomatis geser pin):
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="search-map-address"
                            value={searchAlamat}
                            onChange={(e) => setSearchAlamat(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                cariAlamatDiPeta();
                              }
                            }}
                            placeholder="Contoh: Jl. Merdeka Rembang, Jawa Tengah"
                            className="pl-8 text-xs h-9"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={cariAlamatDiPeta}
                          disabled={geocoding}
                          className="gap-1 text-xs shrink-0 h-9"
                        >
                          {geocoding ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Search className="h-3.5 w-3.5" />
                          )}
                          Cari Titik
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="loc-nama">Nama Bengkel</Label>
                        <Input
                          id="loc-nama"
                          value={bengkelLoc.nama}
                          onChange={(e) => setBengkelLoc({ ...bengkelLoc, nama: e.target.value })}
                          placeholder="Nama Bengkel Anda"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="loc-telepon">Telepon / WhatsApp</Label>
                        <Input
                          id="loc-telepon"
                          value={bengkelLoc.telepon || ""}
                          onChange={(e) => setBengkelLoc({ ...bengkelLoc, telepon: e.target.value })}
                          placeholder="081234567890"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="loc-alamat">Alamat Lengkap</Label>
                        <Input
                          id="loc-alamat"
                          value={bengkelLoc.alamat}
                          onChange={(e) => setBengkelLoc({ ...bengkelLoc, alamat: e.target.value })}
                          placeholder="Jl. Nama Jalan No. X, Kecamatan, Kota"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="loc-lat">Latitude</Label>
                        <Input
                          id="loc-lat"
                          type="text"
                          inputMode="decimal"
                          value={latInput}
                          onChange={(e) => handleLatChange(e.target.value)}
                          placeholder="-7.751600"
                          className="font-mono text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Geser pin di peta atau masukkan angka desimal
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="loc-lng">Longitude</Label>
                        <Input
                          id="loc-lng"
                          type="text"
                          inputMode="decimal"
                          value={lngInput}
                          onChange={(e) => handleLngChange(e.target.value)}
                          placeholder="110.376100"
                          className="font-mono text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Mendukung titik desimal maupun koma
                        </p>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="loc-jam">Jam Operasional</Label>
                        <Input
                          id="loc-jam"
                          value={bengkelLoc.jamOperasional || ""}
                          onChange={(e) => setBengkelLoc({ ...bengkelLoc, jamOperasional: e.target.value })}
                          placeholder="Senin–Sabtu: 08.00–17.00 WIB"
                        />
                      </div>
                    </div>

                    {/* Panduan interaktif */}
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        💡 Cara Mengatur Posisi di Peta:
                      </p>
                      <p>• Klik langsung di mana saja pada peta untuk menaruh pin bengkel.</p>
                      <p>• Atau geser pin ikon kunci inggris 🔧 untuk memposisikan secara presisi.</p>
                      <p>• Anda juga dapat menyalin koordinat dari Google Maps dan menempelkannya di kotak Latitude & Longitude di atas.</p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button onClick={simpanLokasi} disabled={savingLoc} className="flex-1 gap-1.5">
                        {savingLoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Simpan Lokasi Bengkel
                      </Button>
                      <Button
                        variant="outline"
                        onClick={batalEditLokasi}
                        disabled={savingLoc}
                        className="flex-1"
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setLocEditing(true)}
                    className="w-full gap-1.5"
                  >
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Edit Lokasi Bengkel & Koordinat Peta
                  </Button>
                )}

                {/* Info */}
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Peta menggunakan OpenStreetMap:</p>
                  <p>✅ Gratis tanpa API key</p>
                  <p>✅ Data peta terus diperbarui oleh komunitas</p>
                  <p>✅ Tombol petunjuk arah Google Maps & Waze tersedia</p>
                  <p>✅ Deteksi lokasi pelanggan + estimasi jarak</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── TAB PEMBAYARAN BENGKEL ──────────────────────────────── */}
        <TabsContent value="pembayaran" className="mt-4 space-y-6">
          <PengaturanPembayaranBengkel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PengaturanPembayaranBengkel() {
  const { user } = useAuth();
  const {
    workshopPaymentAccounts,
    simpanPaymentAccount,
    togglePaymentAccountActive,
    hapusPaymentAccount,
    refreshPaymentAccounts,
  } = useStore();

  const workshopId = user?.bengkelId || user?.workshopId || "bengkel-001";

  // Filter accounts for active workshop
  const workshopAccounts = workshopPaymentAccounts.filter(
    (a) => a.workshop_id === workshopId || a.id_bengkel === workshopId,
  );
  const bankAccounts = workshopAccounts.filter((a) => a.account_type === "bank_transfer");
  const qrisCandidates = workshopAccounts
    .filter((a) => a.account_type === "qris")
    .sort((a, b) => {
      const tb = new Date(b.updated_at || b.created_at || 0).getTime();
      const ta = new Date(a.updated_at || a.created_at || 0).getTime();
      return tb - ta;
    });
  const qrisAccount =
    qrisCandidates.find((a) => Boolean(a.qr_image_url)) ||
    qrisCandidates[0] ||
    null;

  // Form State Bank Transfer
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankIsActive, setBankIsActive] = useState(true);
  const [bankSaving, setBankSaving] = useState(false);

  // Form State QRIS
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [qrisPreview, setQrisPreview] = useState<string>(qrisAccount?.qr_image_url || "");
  const [qrisIsActive, setQrisIsActive] = useState<boolean>(qrisAccount?.is_active ?? true);
  const [qrisSaving, setQrisSaving] = useState(false);

  useEffect(() => {
    let savedQrisImage = qrisAccount?.qr_image_url || "";
    let savedQrisActive = qrisAccount?.is_active ?? true;
    let savedTimestamp = qrisAccount ? new Date(qrisAccount.updated_at || qrisAccount.created_at || 0).getTime() : 0;

    if (typeof window !== "undefined") {
      try {
        const wsRaw = localStorage.getItem(`appbenk_qris_active_${workshopId}`);
        const wsImg = localStorage.getItem(`appbenk_qris_image_data_${workshopId}`);
        if (wsRaw) {
          const parsed = JSON.parse(wsRaw);
          const parsedTime = new Date(parsed.updated_at || parsed.created_at || 0).getTime();
          if (parsedTime >= savedTimestamp) {
            if (parsed.qr_image_url) {
              savedQrisImage = parsed.qr_image_url;
            }
            if (parsed.is_active !== undefined) {
              savedQrisActive = parsed.is_active;
            }
            savedTimestamp = parsedTime;
          }
        }
        if (wsImg && !savedQrisImage) {
          savedQrisImage = wsImg;
        }
      } catch {}
    }

    if (savedQrisImage && !qrisFile) {
      setQrisPreview(savedQrisImage);
    }
    setQrisIsActive(savedQrisActive);
  }, [qrisAccount, workshopId]);

  useEffect(() => {
    if (!workshopId) return;
    let isCancelled = false;
    fetch(`/api/workshop/qris?id_bengkel=${encodeURIComponent(workshopId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isCancelled && data?.ok && data?.qris_url) {
          setQrisPreview((prev) => (prev && !prev.startsWith("data:") ? prev : data.qris_url));
          if (data.is_active !== undefined) {
            setQrisIsActive(data.is_active);
          }
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [workshopId]);

  const handleEditBank = (acc: typeof bankAccounts[0]) => {
    setEditingBankId(acc.id);
    setBankName(acc.bank_name || "");
    setAccountNumber(acc.account_number || "");
    setAccountHolderName(acc.account_holder_name || "");
    setBankIsActive(acc.is_active);
  };

  const handleCancelEditBank = () => {
    setEditingBankId(null);
    setBankName("");
    setAccountNumber("");
    setAccountHolderName("");
    setBankIsActive(true);
  };

  const handleSimpanBank = async () => {
    if (!bankName.trim()) {
      toast.error("Nama Bank wajib diisi.");
      return;
    }
    if (!accountNumber.trim()) {
      toast.error("Nomor Rekening wajib diisi.");
      return;
    }
    if (!accountHolderName.trim()) {
      toast.error("Nama Pemilik Rekening wajib diisi.");
      return;
    }

    setBankSaving(true);
    try {
      await simpanPaymentAccount({
        ...(editingBankId ? { id: editingBankId } : {}),
        workshop_id: workshopId,
        id_bengkel: workshopId,
        account_type: "bank_transfer",
        provider: "MANUAL",
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_holder_name: accountHolderName.trim(),
        display_name: `${bankName.trim()} - ${accountNumber.trim()}`,
        is_active: bankIsActive,
      });

      toast.success(editingBankId ? "Rekening bank berhasil diperbarui." : "Rekening bank baru berhasil disimpan.");
      handleCancelEditBank();
    } catch (err: any) {
      toast.error(`Gagal menyimpan rekening: ${err.message}`);
    } finally {
      setBankSaving(false);
    }
  };

  const handleToggleBank = async (id: string, current: boolean) => {
    try {
      await togglePaymentAccountActive(id, !current);
      toast.success(`Status rekening berhasil ${!current ? "diaktifkan" : "dinonaktifkan"}.`);
    } catch {
      toast.error("Gagal mengubah status rekening.");
    }
  };

  const handleHapusBank = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus rekening bank ini?")) return;
    try {
      await hapusPaymentAccount(id);
      toast.success("Rekening bank berhasil dihapus.");
    } catch {
      toast.error("Gagal menghapus rekening bank.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file via mime atau extension
    const isImageMime = file.type ? file.type.startsWith("image/") : false;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImageExt = ["jpg", "jpeg", "png", "webp", "jfif", "gif", "bmp"].includes(ext);
    if (!isImageMime && !isImageExt) {
      toast.error("Format file harus berupa gambar (.jpg, .jpeg, .png, atau .webp).");
      return;
    }

    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar QRIS maksimal 5MB.");
      return;
    }

    setQrisFile(file);

    // Langsung buat preview instan seketika
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setQrisPreview(dataUrl);
        toast.info("Gambar QRIS siap disimpan. Silakan klik tombol 'Simpan QRIS'.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSimpanQRIS = async () => {
    if (!qrisPreview) {
      toast.error("Silakan pilih file gambar QRIS terlebih dahulu.");
      return;
    }

    setQrisSaving(true);
    try {
      let finalUrl = qrisPreview;

      // Jika ada file baru yang diunggah, coba upload
      if (qrisFile) {
        try {
          const uploadedUrl = await storagePaymentService.uploadQRIS(workshopId, qrisFile);
          if (uploadedUrl) {
            finalUrl = uploadedUrl;
          }
        } catch {
          finalUrl = qrisPreview;
        }
      }

      if (!finalUrl) {
        finalUrl = qrisPreview;
      }

      const basePayload: WorkshopPaymentAccountRow = {
        id: qrisAccount?.id || `qris-${workshopId}-${Date.now()}`,
        workshop_id: workshopId,
        id_bengkel: workshopId,
        account_type: "qris",
        provider: "MANUAL",
        provider_account_id: "qris-manual",
        bank_name: null,
        account_number: null,
        account_holder_name: null,
        qr_image_url: finalUrl,
        display_name: "QRIS Bengkel",
        is_active: qrisIsActive,
        status: "active",
        created_at: qrisAccount?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`appbenk_qris_active_${workshopId}`, JSON.stringify(basePayload));
          localStorage.setItem(`appbenk_qris_image_data_${workshopId}`, finalUrl);
          localStorage.setItem("appbenk_qris_active", JSON.stringify(basePayload));
          localStorage.setItem("appbenk_qris_image_data", finalUrl);
        } catch (e) {
          console.warn("Storage quota warning on qris save:", e);
        }
      }

      const savedAcc = await simpanPaymentAccount(basePayload);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("appbenk_payment_accounts_updated", { detail: savedAcc }),
        );
      }

      setQrisPreview(savedAcc.qr_image_url || finalUrl);
      setQrisFile(null);
      await refreshPaymentAccounts(workshopId);
      toast.success("Pengaturan QRIS berhasil disimpan.");
    } catch (err: any) {
      toast.error(`Gagal menyimpan QRIS: ${err.message}`);
    } finally {
      setQrisSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Workshop */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Wallet className="size-5 text-primary" />
            Konfigurasi Metode Pembayaran Bengkel
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola rekening bank dan QRIS bengkel Anda untuk pembayaran manual pelanggan. Terisolasi untuk bengkel ID: <span className="font-mono font-bold text-primary">{workshopId}</span>.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refreshPaymentAccounts(workshopId)} className="gap-1.5 shrink-0">
          <RefreshCw className="size-3.5" /> Segarkan
        </Button>
      </div>

      {/* ── BAGIAN A: REKENING TRANSFER BANK ─────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-blue-600" />
                BAGIAN A — Rekening Transfer Bank
              </CardTitle>
              <CardDescription>
                Daftar rekening bank bengkel yang akan ditampilkan ke pelanggan saat memilih metode Transfer Bank.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {bankAccounts.length} Rekening
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daftar Rekening yang Ada */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daftar Rekening Terdaftar
            </Label>
            {bankAccounts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Belum ada rekening bank yang ditambahkan. Silakan isi form di bawah untuk menambahkan rekening baru.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {bankAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border p-4 transition-all",
                      acc.is_active ? "bg-card border-border shadow-xs" : "bg-muted/40 border-dashed opacity-75",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-foreground">{acc.bank_name}</span>
                          <Badge variant={acc.is_active ? "default" : "secondary"} className="text-[10px]">
                            {acc.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                        <p className="font-mono text-sm font-semibold tracking-wider text-primary">
                          {acc.account_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          a.n. <span className="font-medium text-foreground">{acc.account_holder_name}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleEditBank(acc)}
                          title="Edit Rekening"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => handleHapusBank(acc.id)}
                          title="Hapus Rekening"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">Status Aktif untuk Pelanggan</span>
                      <Switch
                        checked={acc.is_active}
                        onCheckedChange={() => handleToggleBank(acc.id, acc.is_active)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Form Tambah / Edit Rekening */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-1.5">
                {editingBankId ? <Edit2 className="size-4 text-primary" /> : <Plus className="size-4 text-primary" />}
                {editingBankId ? "Edit Rekening Bank" : "Tambah Rekening Bank Baru"}
              </h4>
              {editingBankId && (
                <Button variant="ghost" size="sm" onClick={handleCancelEditBank} className="text-xs h-7">
                  Batal Edit
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="bank_name">Nama Bank *</Label>
                <Input
                  id="bank_name"
                  placeholder="Contoh: BCA, Mandiri, BRI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="account_number">Nomor Rekening *</Label>
                <Input
                  id="account_number"
                  placeholder="Contoh: 1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="account_holder">Nama Pemilik Rekening *</Label>
                <Input
                  id="account_holder"
                  placeholder="Contoh: PT Bengkel Contoh"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Switch id="bank_is_active" checked={bankIsActive} onCheckedChange={setBankIsActive} />
                <Label htmlFor="bank_is_active" className="cursor-pointer text-xs">
                  Aktifkan rekening ini agar langsung tampil pada pilihan pembayaran pelanggan
                </Label>
              </div>

              <Button onClick={handleSimpanBank} disabled={bankSaving} className="gap-1.5">
                <Save className="size-4" />
                {bankSaving ? "Menyimpan..." : editingBankId ? "Perbarui Rekening" : "Simpan Rekening"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── BAGIAN B: QRIS BENGKEL ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-5 w-5 text-emerald-600" />
                BAGIAN B — Pembayaran QRIS Bengkel
              </CardTitle>
              <CardDescription>
                Unggah dan kelola gambar kode QRIS bengkel Anda. Pelanggan akan melihat QRIS ini saat membayar tagihan.
              </CardDescription>
            </div>
            <Badge variant={qrisAccount?.is_active ? "default" : "secondary"} className="text-xs">
              {qrisAccount?.is_active ? "QRIS Aktif" : "QRIS Nonaktif"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Visual Preview */}
            <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 p-6 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Preview Gambar QRIS
              </span>
              {qrisPreview ? (
                <div className="relative group max-w-[240px] rounded-xl border bg-white p-3 shadow-md">
                  <img
                    src={qrisPreview}
                    alt="Preview QRIS Bengkel"
                    className="h-auto w-full object-contain rounded-lg aspect-square"
                  />
                  <div className="mt-2 text-center">
                    <p className="font-bold text-xs text-foreground">QRIS AppBenk</p>
                    <p className="text-[10px] text-muted-foreground">Scan menggunakan GoPay, OVO, DANA, BCA, dll</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 w-48 rounded-xl border border-dashed bg-muted/40 p-4 text-muted-foreground">
                  <QrCode className="size-12 stroke-[1.5] mb-2 opacity-50" />
                  <p className="text-xs font-medium">Belum ada gambar QRIS</p>
                  <p className="text-[10px]">Silakan unggah gambar di samping</p>
                </div>
              )}
            </div>

            {/* Form Upload & Pengaturan QRIS */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qris_file" className="text-sm font-semibold">
                    Upload Gambar QRIS Baru
                  </Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      id="qris_file"
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.jfif"
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = "";
                      }}
                      onChange={handleFileChange}
                      className="cursor-pointer file:cursor-pointer"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Mendukung format JPG, JPEG, PNG, dan WEBP. Ukuran file maksimal 5MB. Pastikan kode QR terlihat jelas.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="qris_active" className="cursor-pointer font-medium text-xs block">
                        Status Aktif QRIS
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Aktifkan opsi QRIS pada halaman pembayaran pelanggan
                      </span>
                    </div>
                    <Switch
                      id="qris_active"
                      checked={qrisIsActive}
                      onCheckedChange={setQrisIsActive}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button onClick={handleSimpanQRIS} disabled={qrisSaving} className="gap-1.5 w-full sm:w-auto">
                  <Save className="size-4" />
                  {qrisSaving ? "Menyimpan QRIS..." : "Simpan QRIS"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
