import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCw,
  ArrowRight,
  Store,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { workshopApplicationService } from "@/services/appbenk-service";
import type { WorkshopApplicationRow } from "@/types/database";

export const Route = createFileRoute("/daftar-bengkel/status")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Status Pengajuan Bengkel — Kemitraan AppBenk" },
      {
        name: "description",
        content: "Pantau status pengajuan pendaftaran bengkel Anda di AppBenk secara langsung dan transparan.",
      },
      { property: "og:title", content: "Status Pengajuan Bengkel — Kemitraan AppBenk" },
    ],
  }),
  component: StatusPengajuanBengkelPage,
});

function StatusPengajuanBengkelPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [app, setApp] = useState<WorkshopApplicationRow | null>(null);

  const fetchStatus = async (isManualRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await workshopApplicationService.getLatestApplication(user.id);
      setApp(data);
      if (isManualRefresh) {
        toast.success("Status pengajuan berhasil diperbarui.");
      }
    } catch (err) {
      console.error("Gagal mengambil status pengajuan:", err);
      if (isManualRefresh) {
        toast.error("Gagal memuat status pengajuan terbaru.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchStatus();
    }
  }, [user, authLoading]);

  // Format tanggal ramah pengguna
  const formatTanggal = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  // State Memuat Akun
  if (authLoading || loading) {
    return (
      <AuthLayout aksi="masuk">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Memuat status pendaftaran bengkel...</p>
        </div>
      </AuthLayout>
    );
  }

  // State Pengguna Belum Login
  if (!user) {
    return (
      <AuthLayout aksi="masuk">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8 text-center space-y-4">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="size-8" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Periksa Status Pengajuan Bengkel
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Silakan masuk ke akun AppBenk yang Anda gunakan saat mendaftarkan bengkel untuk memantau status pengajuannya.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Button asChild className="h-11 w-full text-base font-semibold">
              <Link to="/login">Masuk ke Akun</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/daftar-bengkel">Formulir Pendaftaran Bengkel</Link>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // State Pengguna Tidak Memiliki Riwayat Pengajuan
  if (!app) {
    return (
      <AuthLayout aksi="masuk">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm sm:p-8 text-center space-y-4">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Building2 className="size-8" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Belum Ada Pengajuan Bengkel
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Akun Anda (<span className="font-semibold text-foreground">{user.email}</span>) belum memiliki riwayat pengajuan kemitraan bengkel.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Button asChild className="h-11 w-full text-base font-semibold">
              <Link to="/daftar-bengkel">Daftarkan Bengkel Sekarang</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/pelanggan/dashboard">Kembali ke Dashboard</Link>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout aksi="masuk">
      <div className="w-full max-w-2xl space-y-6">
        {/* Tombol Navigasi Kembali */}
        <div className="flex items-center justify-between">
          <Link
            to={user.role === "owner" ? "/owner/dashboard" : "/pelanggan/dashboard"}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Kembali ke Dashboard
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Perbarui Status
          </Button>
        </div>

        {/* ========================================================
            KONDISI 1: STATUS PENDING (MENUNGGU PERSETUJUAN)
            ======================================================== */}
        {app.status === "PENDING" && (
          <div className="rounded-2xl border border-amber-500/30 bg-card p-6 shadow-sm sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
              <div className="flex items-center gap-3.5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="size-7" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                      Menunggu Persetujuan
                    </Badge>
                    <span className="text-xs text-muted-foreground">Paket {app.paket}</span>
                  </div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                    {app.nama_bengkel}
                  </h1>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs text-muted-foreground">
                <p>Diajukan pada:</p>
                <p className="font-medium text-foreground">{formatTanggal(app.created_at)}</p>
              </div>
            </div>

            {/* Visual Stepper / Progress Timeline */}
            <div className="rounded-xl bg-muted/50 p-4 border space-y-3">
              <p className="text-xs font-semibold text-foreground">Proses Verifikasi Kemitraan:</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="size-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <span className="font-medium text-foreground">Formulir Terkirim</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="size-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs animate-pulse">
                    2
                  </div>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Peninjauan Tim
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="size-7 rounded-full bg-muted border text-muted-foreground flex items-center justify-center font-semibold text-xs">
                    3
                  </div>
                  <span className="text-muted-foreground">Aktivasi Bengkel</span>
                </div>
              </div>
            </div>

            {/* Rincian Data Pengajuan */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-lg bg-card border p-3 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Store className="size-3.5 text-primary" /> Nama Bengkel
                </span>
                <p className="font-semibold text-foreground text-sm">{app.nama_bengkel}</p>
              </div>

              <div className="rounded-lg bg-card border p-3 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" /> Paket Sistem
                </span>
                <p className="font-semibold text-foreground text-sm">Paket {app.paket}</p>
              </div>

              <div className="rounded-lg bg-card border p-3 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-primary" /> Pemilik &amp; Email
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {app.owner_nama} ({app.owner_email})
                </p>
              </div>

              <div className="rounded-lg bg-card border p-3 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Phone className="size-3.5 text-primary" /> Kontak Telepon Bengkel
                </span>
                <p className="font-semibold text-foreground text-sm">{app.no_telepon}</p>
              </div>

              <div className="rounded-lg bg-card border p-3 space-y-1 sm:col-span-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" /> Alamat Lengkap
                </span>
                <p className="font-medium text-foreground text-xs leading-relaxed">{app.alamat}</p>
              </div>
            </div>

            {/* Informasi Penjelasan */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Pengajuan Anda Dalam Proses Peninjauan</span>
              </div>
              <p className="leading-relaxed">
                Tim Super Admin AppBenk sedang meninjau kelayakan data bengkel Anda. Proses verifikasi biasanya memerlukan waktu maksimal 1x24 jam kerja. Anda tidak perlu mengirimkan formulir ulang. Halaman ini akan diperbarui otomatis saat status berubah.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================
            KONDISI 2: STATUS APPROVED (DISETUJUI)
            ======================================================== */}
        {app.status === "APPROVED" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-card p-6 shadow-sm sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
              <div className="flex items-center gap-3.5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-7" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      Disetujui
                    </Badge>
                    <span className="text-xs text-muted-foreground">Mitra Aktif</span>
                  </div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                    {app.nama_bengkel}
                  </h1>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs text-muted-foreground">
                <p>Disetujui pada:</p>
                <p className="font-medium text-foreground">{formatTanggal(app.reviewed_at || app.updated_at)}</p>
              </div>
            </div>

            {/* Banner Sukses */}
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-800 dark:text-emerald-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Selamat! Bengkel Anda Telah Resmi Terdaftar</span>
              </div>
              <p className="leading-relaxed">
                Pengajuan bengkel Anda telah disetujui oleh Super Admin. Bengkel telah didaftarkan dengan ID{" "}
                <span className="font-bold underline">{app.bengkel_id_result || "bengkel-mitra"}</span> dan akun Anda kini memiliki hak akses penuh sebagai Owner Bengkel.
              </p>
            </div>

            {/* Rincian Data Bengkel yang Aktif */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-lg bg-card border p-3 space-y-1">
                <span className="text-muted-foreground">ID Bengkel Resmi</span>
                <p className="font-mono font-bold text-foreground text-sm">
                  {app.bengkel_id_result || "-"}
                </p>
              </div>

              <div className="rounded-lg bg-card border p-3 space-y-1">
                <span className="text-muted-foreground">Paket Kemitraan</span>
                <p className="font-semibold text-foreground text-sm">Paket {app.paket}</p>
              </div>

              <div className="rounded-lg bg-card border p-3 space-y-1">
                <span className="text-muted-foreground">Nama Owner</span>
                <p className="font-semibold text-foreground text-sm">{app.owner_nama}</p>
              </div>

              <div className="rounded-lg bg-card border p-3 space-y-1">
                <span className="text-muted-foreground">Kontak Bengkel</span>
                <p className="font-semibold text-foreground text-sm">{app.no_telepon}</p>
              </div>
            </div>

            {/* Tombol Aksi Langsung ke Dashboard Owner */}
            <div className="pt-2">
              <Button asChild className="h-12 w-full text-base font-semibold shadow-sm">
                <Link to="/owner/dashboard">
                  Buka Dashboard Owner <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            KONDISI 3: STATUS REJECTED (DITOLAK)
            ======================================================== */}
        {app.status === "REJECTED" && (
          <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
              <div className="flex items-center gap-3.5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <XCircle className="size-7" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Pengajuan Belum Disetujui</Badge>
                  </div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                    {app.nama_bengkel}
                  </h1>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs text-muted-foreground">
                <p>Waktu Peninjauan:</p>
                <p className="font-medium text-foreground">{formatTanggal(app.reviewed_at || app.updated_at)}</p>
              </div>
            </div>

            {/* Catatan Review Penolakan */}
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="size-4 shrink-0" />
                <span>Catatan Peninjauan dari Tim Super Admin:</span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap font-medium">
                {app.catatan_review ||
                  "Data yang diajukan belum memenuhi kriteria kemitraan atau informasi kontak tidak dapat diverifikasi."}
              </p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Anda dapat memperbaiki data atau mengajukan kembali permohonan kemitraan bengkel baru setelah melengkapi persyaratan yang diminta.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button asChild className="h-11 flex-1 font-semibold">
                <Link to="/daftar-bengkel">Ajukan Ulang Pendaftaran Bengkel</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 flex-1">
                <Link to="/pelanggan/dashboard">Kembali ke Dashboard</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

