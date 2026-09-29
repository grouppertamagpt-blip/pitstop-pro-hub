import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  Store,
  Phone,
  Mail,
  MapPin,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  workshopApplicationService,
} from "@/services/appbenk-service";
import type { WorkshopApplicationRow } from "@/types/database";

export const Route = createFileRoute("/daftar-bengkel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Daftarkan Bengkel Anda — Kemitraan AppBenk" },
      {
        name: "description",
        content:
          "Daftarkan bengkel motor Anda menjadi mitra resmi AppBenk. Kelola servis, pelanggan, sparepart, dan laporan keuangan dalam satu aplikasi terpadu.",
      },
      { property: "og:title", content: "Daftarkan Bengkel Anda — Kemitraan AppBenk" },
      {
        property: "og:description",
        content: "Daftarkan bengkel Anda dan tingkatkan efisiensi operasional bengkel bersama AppBenk.",
      },
    ],
  }),
  component: DaftarBengkelPage,
});

function DaftarBengkelPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, masuk, daftar } = useAuth();

  // Mode untuk calon owner yang belum login: 'daftar-baru' | 'login'
  const [authMode, setAuthMode] = useState<"daftar-baru" | "login">("daftar-baru");

  // State Pendaftaran Bengkel
  const [namaBengkel, setNamaBengkel] = useState("");
  const [alamatBengkel, setAlamatBengkel] = useState("");
  const [teleponBengkel, setTeleponBengkel] = useState("");
  const [paket] = useState<"Basic">("Basic");
  const [setujuSyarat, setSetujuSyarat] = useState(false);

  // State Calon Akun Pemilik (jika belum login)
  const [namaOwner, setNamaOwner] = useState("");
  const [emailOwner, setEmailOwner] = useState("");
  const [teleponOwner, setTeleponOwner] = useState("");
  const [passwordOwner, setPasswordOwner] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // State Login Cepat (jika calon owner sudah punya akun)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Existing application check
  const [existingApp, setExistingApp] = useState<WorkshopApplicationRow | null>(null);
  const [checkingApp, setCheckingApp] = useState(false);

  // Status submit
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Cek apakah user yang login sudah punya pengajuan
  useEffect(() => {
    if (!user) {
      setExistingApp(null);
      return;
    }

    // Prefill data owner jika sudah login
    setNamaOwner(user.nama || "");
    setEmailOwner(user.email || "");
    setTeleponOwner(user.telepon || "");

    let active = true;
    setCheckingApp(true);
    workshopApplicationService
      .getLatestApplication(user.id)
      .then((app) => {
        if (active) {
          setExistingApp(app);
          setCheckingApp(false);
        }
      })
      .catch(() => {
        if (active) setCheckingApp(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  // Handle Login Cepat
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg("Email dan kata sandi wajib diisi.");
      return;
    }

    setSubmitting(true);
    const res = await masuk(loginEmail.trim(), loginPassword);
    setSubmitting(false);

    if (!res.user) {
      setErrorMsg(res.error || "Gagal masuk. Periksa kembali email dan kata sandi Anda.");
      return;
    }

    toast.success("Berhasil masuk! Silakan lanjutkan pengisian data bengkel.");
  };

  // Handle Submit Pendaftaran Bengkel (Untuk user yang sudah login)
  const handleSubmitLoggedIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg("");

    if (!namaBengkel.trim()) {
      setErrorMsg("Nama bengkel wajib diisi.");
      return;
    }
    if (!alamatBengkel.trim()) {
      setErrorMsg("Alamat lengkap bengkel wajib diisi.");
      return;
    }
    if (!teleponBengkel.trim()) {
      setErrorMsg("Nomor telepon bengkel wajib diisi.");
      return;
    }
    if (!setujuSyarat) {
      setErrorMsg("Anda harus menyetujui Ketentuan Kemitraan AppBenk.");
      return;
    }

    setSubmitting(true);
    const res = await workshopApplicationService.createApplication({
      userId: user.id,
      namaBengkel: namaBengkel.trim(),
      alamat: alamatBengkel.trim(),
      noTelepon: teleponBengkel.trim(),
      ownerNama: user.nama || namaOwner.trim(),
      ownerEmail: user.email || emailOwner.trim(),
      paket,
    });
    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    toast.success("Pengajuan pendaftaran bengkel berhasil dikirim!");
    navigate({ to: "/daftar-bengkel/status" });
  };

  // Handle Submit Pendaftaran Sekaligus Akun Pemilik (Untuk calon owner belum punya akun)
  const handleSubmitWithNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Validasi Akun Pemilik
    if (!namaOwner.trim()) {
      setErrorMsg("Nama lengkap pemilik wajib diisi.");
      return;
    }
    if (!emailOwner.trim()) {
      setErrorMsg("Email pemilik wajib diisi.");
      return;
    }
    if (!emailOwner.trim().toLowerCase().endsWith("@gmail.com")) {
      setErrorMsg("Alamat email harus menggunakan domain @gmail.com.");
      return;
    }
    if (!teleponOwner.trim()) {
      setErrorMsg("Nomor handphone pemilik wajib diisi.");
      return;
    }
    if (!passwordOwner) {
      setErrorMsg("Kata sandi wajib diisi.");
      return;
    }
    if (passwordOwner.length < 8) {
      setErrorMsg("Kata sandi minimal 8 karakter.");
      return;
    }
    if (passwordOwner !== konfirmasiPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    // Validasi Data Bengkel
    if (!namaBengkel.trim()) {
      setErrorMsg("Nama bengkel wajib diisi.");
      return;
    }
    if (!alamatBengkel.trim()) {
      setErrorMsg("Alamat lengkap bengkel wajib diisi.");
      return;
    }
    if (!teleponBengkel.trim()) {
      setErrorMsg("Nomor telepon bengkel wajib diisi.");
      return;
    }
    if (!setujuSyarat) {
      setErrorMsg("Anda harus menyetujui Ketentuan Kemitraan AppBenk.");
      return;
    }

    setSubmitting(true);

    // 1. Buat akun auth baru
    const authRes = await daftar({
      nama: namaOwner.trim(),
      email: emailOwner.trim().toLowerCase(),
      telepon: teleponOwner.trim(),
      gender: "Laki-laki",
      password: passwordOwner,
    });

    if (!authRes.ok) {
      setSubmitting(false);
      let pesan = authRes.error || "Pendaftaran akun gagal.";
      if (pesan.toLowerCase().includes("user already registered")) {
        pesan = "Email ini sudah terdaftar. Silakan pilih tab 'Sudah Punya Akun' untuk masuk terlebih dahulu.";
      }
      setErrorMsg(pesan);
      return;
    }

    // 2. Login untuk mendapatkan sesi aktif jika tidak langsung masuk
    const loginRes = await masuk(emailOwner.trim().toLowerCase(), passwordOwner);
    const activeUserId = loginRes.user?.id;

    if (!activeUserId) {
      setSubmitting(false);
      if (authRes.unconfirmed) {
        toast.info("Akun berhasil dibuat. Silakan konfirmasi email Anda terlebih dahulu.");
        navigate({ to: "/verify-email" });
        return;
      }
      toast.success("Akun berhasil dibuat. Silakan masuk untuk menyelesaikan pendaftaran bengkel.");
      setAuthMode("login");
      setLoginEmail(emailOwner.trim());
      return;
    }

    // 3. Simpan pengajuan pendaftaran bengkel
    const appRes = await workshopApplicationService.createApplication({
      userId: activeUserId,
      namaBengkel: namaBengkel.trim(),
      alamat: alamatBengkel.trim(),
      noTelepon: teleponBengkel.trim(),
      ownerNama: namaOwner.trim(),
      ownerEmail: emailOwner.trim().toLowerCase(),
      paket,
    });
    setSubmitting(false);

    if (appRes.error) {
      setErrorMsg(appRes.error);
      return;
    }

    toast.success("Akun dan pengajuan pendaftaran bengkel berhasil dibuat!");
    navigate({ to: "/daftar-bengkel/status" });
  };

  if (authLoading || checkingApp) {
    return (
      <AuthLayout aksi="masuk">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Memuat data kemitraan AppBenk...</p>
        </div>
      </AuthLayout>
    );
  }

  // JIKA USER SUDAH OWNER: Berikan pesan dan tombol langsung ke Dashboard Owner
  if (user && user.role === "owner") {
    return (
      <AuthLayout aksi="masuk">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm sm:p-8 text-center space-y-4">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-8" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Anda Sudah Terdaftar Sebagai Owner
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Akun Anda (<span className="font-semibold text-foreground">{user.email}</span>) telah
            memiliki hak akses sebagai <span className="font-semibold text-primary">Owner Bengkel</span>.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Button asChild className="h-11 w-full text-base font-semibold">
              <Link to="/owner/dashboard">Buka Dashboard Owner</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/daftar-bengkel/status">Lihat Detail Status Pengajuan</Link>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // JIKA USER MEMILIKI PENGAJUAN PENDING: Arahkan untuk melihat status
  if (user && existingApp && existingApp.status === "PENDING") {
    return (
      <AuthLayout aksi="masuk">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm sm:p-8 text-center space-y-4">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Clock className="size-8" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Pengajuan Sedang Ditinjau
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Anda telah mengajukan pendaftaran untuk bengkel{" "}
            <span className="font-semibold text-foreground">{existingApp.nama_bengkel}</span> (Paket {existingApp.paket}).
            Saat ini pengajuan Anda masih menunggu verifikasi dari tim Super Admin AppBenk.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Button asChild className="h-11 w-full text-base font-semibold">
              <Link to="/daftar-bengkel/status">Lihat Status Pengajuan &rarr;</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/pelanggan/dashboard">Kembali ke Beranda</Link>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout aksi="masuk">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> Program Kemitraan Bengkel Modern AppBenk
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Daftarkan Bengkel Anda
          </h1>
          <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Tingkatkan efisiensi operasional bengkel Anda dengan sistem manajemen otomatis, booking online,
            kasir terpadu, stok suku cadang, dan analisis keuntungan real-time.
          </p>
        </div>

        {/* Notifikasi jika user login sebagai pelanggan */}
        {user && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-sm">
            <User className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">
                Terhubung sebagai: <span className="font-semibold">{user.nama}</span> ({user.email})
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pengajuan bengkel akan otomatis dikaitkan dengan akun ini. Setelah disetujui, akun Anda akan ditingkatkan menjadi hak akses Owner.
              </p>
            </div>
          </div>
        )}

        {/* Tab Toggle untuk Calon Owner Belum Login */}
        {!user && (
          <div className="flex rounded-xl bg-muted p-1 border">
            <button
              type="button"
              onClick={() => {
                setAuthMode("daftar-baru");
                setErrorMsg("");
              }}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition-all",
                authMode === "daftar-baru"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              1. Pendaftaran Mitra Baru
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setErrorMsg("");
              }}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition-all",
                authMode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              2. Sudah Punya Akun? Masuk
            </button>
          </div>
        )}

        {/* KONTEN JIKA MEMILIH TAB LOGIN (BELUM LOGIN TAPI SUDAH ADA AKUN) */}
        {!user && authMode === "login" && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <h2 className="font-display text-xl font-bold">Masuk ke Akun AppBenk</h2>
              <p className="text-xs text-muted-foreground">
                Masuk terlebih dahulu agar bengkel baru dapat dikaitkan dengan akun Anda.
              </p>
            </div>

            <form onSubmit={handleQuickLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login_email">Email (@gmail.com)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="login_email"
                    type="email"
                    className="pl-9 h-11"
                    placeholder="nama@gmail.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login_password">Kata Sandi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="login_password"
                    type="password"
                    className="pl-9 h-11"
                    placeholder="Masukkan kata sandi Anda"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full text-base font-semibold"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {submitting ? "Memproses..." : "Masuk & Lanjutkan Pendaftaran Bengkel"}
              </Button>
            </form>
          </div>
        )}

        {/* FORMULIR UTAMA: USER SUDAH LOGIN ATAU CALON OWNER MEMILIH DAFTAR BARU */}
        {(user || authMode === "daftar-baru") && (
          <form
            onSubmit={user ? handleSubmitLoggedIn : handleSubmitWithNewAccount}
            className="space-y-8"
          >
            {/* Bagian 1: Data Pemilik Bengkel (Hanya diisi jika belum login) */}
            {!user && (
              <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-6">
                <div className="border-b pb-4">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                    <User className="size-5 text-primary" />
                    Langkah 1: Informasi Pemilik Akun Bengkel
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Akun ini akan menjadi akun utama (Owner) yang memiliki kontrol penuh terhadap sistem bengkel.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="owner_nama">Nama Lengkap Pemilik *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="owner_nama"
                        placeholder="Contoh: Budi Santoso"
                        className="pl-9 h-11"
                        value={namaOwner}
                        onChange={(e) => setNamaOwner(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="owner_email">Email Pemilik (@gmail.com) *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="owner_email"
                        type="email"
                        placeholder="pemilik.bengkel@gmail.com"
                        className="pl-9 h-11"
                        value={emailOwner}
                        onChange={(e) => setEmailOwner(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="owner_telepon">Nomor Handphone / WhatsApp Pemilik *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="owner_telepon"
                        placeholder="Contoh: 081234567890"
                        className="pl-9 h-11"
                        value={teleponOwner}
                        onChange={(e) => setTeleponOwner(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="owner_password">Kata Sandi (Minimal 8 Karakter) *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="owner_password"
                        type={showPassword ? "text" : "password"}
                        className="pl-9 pr-10 h-11"
                        placeholder="Buat kata sandi aman"
                        value={passwordOwner}
                        onChange={(e) => setPasswordOwner(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="owner_konfirmasi">Konfirmasi Kata Sandi *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="owner_konfirmasi"
                        type={showPassword ? "text" : "password"}
                        className="pl-9 pr-10 h-11"
                        placeholder="Ulangi kata sandi"
                        value={konfirmasiPassword}
                        onChange={(e) => setKonfirmasiPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bagian 2: Profil & Informasi Bengkel */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b pb-4">
                <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                  <Store className="size-5 text-primary" />
                  {user ? "Informasi Profil Bengkel" : "Langkah 2: Informasi Profil Bengkel"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Masukkan identitas resmi bengkel Anda yang akan diverifikasi oleh tim AppBenk.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nama_bengkel">Nama Bengkel *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="nama_bengkel"
                      placeholder="Contoh: Bengkel Motor Jaya Mandiri"
                      className="pl-9 h-11"
                      value={namaBengkel}
                      onChange={(e) => setNamaBengkel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telepon_bengkel">Nomor Telepon Operasional Bengkel *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="telepon_bengkel"
                      placeholder="Contoh: 081298765432 atau (031) 8765432"
                      className="pl-9 h-11"
                      value={teleponBengkel}
                      onChange={(e) => setTeleponBengkel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="alamat_bengkel">Alamat Lengkap Bengkel *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Textarea
                      id="alamat_bengkel"
                      rows={3}
                      placeholder="Contoh: Jl. Raya Wonokromo No. 128, Kel. Darmo, Kec. Wonokromo, Kota Surabaya, Jawa Timur 60241"
                      className="pl-9 resize-none"
                      value={alamatBengkel}
                      onChange={(e) => setAlamatBengkel(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 3: Pilihan Paket Kemitraan */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-6">
              <div className="border-b pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                    <Sparkles className="size-5 text-primary" />
                    Paket Kemitraan Bengkel
                  </h2>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Standar Kemitraan Aktif
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pendaftaran kemitraan bengkel saat ini menggunakan Paket Basic standar lengkap untuk seluruh mitra bengkel baru.
                </p>
              </div>

              {/* Opsi Paket Basic — Tunggal & Terpilih Otomatis */}
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 shadow-sm text-left flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/15 border border-primary/25 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      Paket Terpilih (Standard Free Tier)
                    </span>
                    <div className="size-6 rounded-full border border-primary bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">Paket Basic</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Paket digitalisasi operasional bengkel terpadu tanpa biaya pendaftaran, siap digunakan langsung oleh tim operasional Anda.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Sistem Booking & Antrean Servis Pelanggan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Kasir & Pembayaran Tunai, Transfer & QRIS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Kelola Mekanik & Manajemen Stok Suku Cadang</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Laporan Operasional Servis, Sparepart & Pelanggan</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkbox Ketentuan & Error Alert */}
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={setujuSyarat}
                  onChange={(e) => setSetujuSyarat(e.target.checked)}
                  className="mt-1 size-4 rounded border-input accent-primary"
                />
                <span className="text-xs sm:text-sm text-muted-foreground leading-snug">
                  Saya menyatakan bahwa seluruh informasi bengkel dan pemilik yang diberikan adalah benar.
                  Saya menyetujui Ketentuan Layanan Kemitraan AppBenk dan bersedia diverifikasi oleh tim Super Admin.
                </span>
              </label>

              {errorMsg && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2.5">
                  <AlertCircle className="size-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Tombol Submit */}
            <div className="space-y-3">
              <Button
                type="submit"
                className="h-12 w-full text-base font-semibold shadow-sm"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 size-5 animate-spin" />}
                {submitting ? "Mengirimkan Pengajuan..." : "Kirim Pengajuan Pendaftaran Bengkel"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Sudah pernah mengajukan pendaftaran?{" "}
                <Link
                  to="/daftar-bengkel/status"
                  className="font-medium text-primary hover:underline underline-offset-4"
                >
                  Cek Status Pengajuan Anda
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}

