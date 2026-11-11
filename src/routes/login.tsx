import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  UserRoundCheck,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Wrench,
  Car,
  ShieldCheck,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HOME_ROLE, LABEL_ROLE, ROLE_DEMO_ACCOUNTS, Role, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  errorComponent: ({ reset }) => (
    <AuthLayout aksi="daftar">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card p-6 shadow-sm text-center">
          <h2 className="font-display text-xl font-bold">Terjadi Kendala Memuat Halaman</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sesi atau koneksi sedang dipersiapkan. Silakan coba muat ulang.
          </p>
          <Button onClick={() => reset()} className="mt-5">
            Coba Lagi
          </Button>
        </div>
      </div>
    </AuthLayout>
  ),
  head: () => ({
    meta: [
      { title: "Login — AppBenk Solusi Servis Kendaraan" },
      {
        name: "description",
        content:
          "Masuk ke AppBenk untuk mengelola booking servis, status kendaraan, sparepart, dan laporan bengkel sesuai peran Anda.",
      },
      { property: "og:title", content: "Login — AppBenk Solusi Servis Kendaraan" },
      { property: "og:description", content: "Masuk untuk mengakses sistem AppBenk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, masuk, masukSebagaiRole, kirimKodeResetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihat, setLihat] = useState(false);
  const [ingat, setIngat] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [errEmail, setErrEmail] = useState("");
  const [errPassword, setErrPassword] = useState("");
  const [error, setError] = useState("");
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [isWrongPassword, setIsWrongPassword] = useState(false);
  const [isConnectionError, setIsConnectionError] = useState(false);

  // Jika user sudah memiliki sesi login, langsung arahkan ke dashboard
  useEffect(() => {
    if (user?.role && HOME_ROLE[user.role]) {
      navigate({ to: HOME_ROLE[user.role], replace: true });
    }
  }, [user, navigate]);

  // Fungsi 1-Klik Masuk Langsung Berdasarkan Role (Khusus Presentasi - Bebas Eror & Seketika)
  const handleQuickLogin = (role: Role) => {
    try {
      setLoading(true);
      setError("");
      setSelectedRole(role);
      const sessionUser = masukSebagaiRole(role);
      toast.success(`Berhasil masuk sebagai ${LABEL_ROLE[role]}`);
      navigate({ to: HOME_ROLE[role], replace: true });
    } catch (err: any) {
      console.error("[QuickLogin] error:", err);
      toast.error("Gagal berpindah peran.");
    } finally {
      setLoading(false);
    }
  };

  // Fungsi Isi Form Otomatis sesuai Role agar bisa didemokan lewat form manual
  const handleFillDemo = (role: Role) => {
    const demo = ROLE_DEMO_ACCOUNTS[role];
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
      setSelectedRole(role);
      setErrEmail("");
      setErrPassword("");
      setError("");
      setIsWrongPassword(false);
      setIsConnectionError(false);
      toast.info(`Form diisi dengan kredensial ${demo.label}`);
    }
  };

  // Validasi data email sebelum meminta kode lupa password
  const handleKlikLupaPassword = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrEmail("Silakan isi alamat email @gmail.com Anda pada form login terlebih dahulu.");
      setError("Silakan isi data email @gmail.com terlebih dahulu sebelum meminta kode verifikasi.");
      const el = document.getElementById("login_email_field");
      el?.focus();
      return;
    }
    setErrEmail("");
    setError("");

    setLoading(true);
    const res = await kirimKodeResetPassword(cleanEmail);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Gagal mengirim kode verifikasi. Periksa kembali email Anda.");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("appbenk_reset_email", cleanEmail);
    }
    toast.success("Kode verifikasi telah dikirim ke email Gmail Anda! Periksa inbox atau spam.");
    navigate({ to: "/reset-password" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    const ee = !cleanEmail
      ? "Email wajib diisi."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ? "Format email tidak valid."
        : "";
    const ep = !cleanPassword ? "Password wajib diisi." : "";
    setErrEmail(ee);
    setErrPassword(ep);
    setError("");
    setIsWrongPassword(false);
    if (ee || ep) return;

    setLoading(true);
    try {
      const hasil = await masuk(cleanEmail, cleanPassword);
      if (!hasil.user) {
        let pesan = hasil.error ?? "Email atau password salah. Silakan coba lagi.";
        setError(pesan);
        return;
      }

      toast.success(`Berhasil masuk sebagai ${LABEL_ROLE[hasil.user.role]}`);
      navigate({ to: HOME_ROLE[hasil.user.role], replace: true });
    } catch (err: any) {
      console.error("[Login] submit error:", err);
      setError(err?.message || "Terjadi kesalahan saat memproses login. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout aksi="daftar">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border bg-card p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/5 text-primary">
              <UserRoundCheck className="size-7" />
            </span>
            <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Masuk ke AppBenk
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Akses sistem multi-tenant sesuai peran Anda
            </p>
          </div>

          {/* PANEL AKSES CEPAT PRESENTASI (1-KLIK SEMUA ROLE) */}
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-primary/10">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wide">
                <Sparkles className="size-3.5 shrink-0" />
                Mode Presentasi Cepat (1-Klik Masuk)
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border">
                Pilih Role Langsung
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* ROLE 1: PELANGGAN */}
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  selectedRole === "pelanggan"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-xs"
                    : "border-border bg-card/60 hover:border-emerald-500/50"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Car className="size-3.5" />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="font-bold text-foreground truncate">1. Pelanggan</p>
                      <p className="text-[10px] text-muted-foreground truncate">wiliesalim</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-none"
                    onClick={() => handleQuickLogin("pelanggan")}
                    disabled={loading}
                  >
                    Masuk Langsung
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => handleFillDemo("pelanggan")}
                    title="Isi kredensial ke form"
                  >
                    Isi Form
                  </Button>
                </div>
              </div>

              {/* ROLE 2: ADMIN BENGKEL */}
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  selectedRole === "admin"
                    ? "border-blue-500 bg-blue-500/10 shadow-xs"
                    : "border-border bg-card/60 hover:border-blue-500/50"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Wrench className="size-3.5" />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="font-bold text-foreground truncate">2. Admin Bengkel</p>
                      <p className="text-[10px] text-muted-foreground truncate">Anzar Amanah</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-none"
                    onClick={() => handleQuickLogin("admin")}
                    disabled={loading}
                  >
                    Masuk Langsung
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => handleFillDemo("admin")}
                    title="Isi kredensial ke form"
                  >
                    Isi Form
                  </Button>
                </div>
              </div>

              {/* ROLE 3: OWNER BENGKEL */}
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  selectedRole === "owner"
                    ? "border-amber-500 bg-amber-500/10 shadow-xs"
                    : "border-border bg-card/60 hover:border-amber-500/50"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Building2 className="size-3.5" />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="font-bold text-foreground truncate">3. Owner Bengkel</p>
                      <p className="text-[10px] text-muted-foreground truncate">Fandi Nasir</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-none"
                    onClick={() => handleQuickLogin("owner")}
                    disabled={loading}
                  >
                    Masuk Langsung
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => handleFillDemo("owner")}
                    title="Isi kredensial ke form"
                  >
                    Isi Form
                  </Button>
                </div>
              </div>

              {/* ROLE 4: SUPER ADMIN */}
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  selectedRole === "super_admin"
                    ? "border-purple-500 bg-purple-500/10 shadow-xs"
                    : "border-border bg-card/60 hover:border-purple-500/50"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <ShieldCheck className="size-3.5" />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="font-bold text-foreground truncate">4. Super Admin</p>
                      <p className="text-[10px] text-muted-foreground truncate">Pusat Multi-Tenant</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-none"
                    onClick={() => handleQuickLogin("super_admin")}
                    disabled={loading}
                  >
                    Masuk Langsung
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => handleFillDemo("super_admin")}
                    title="Isi kredensial ke form"
                  >
                    Isi Form
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Atau Masuk Manual Form
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4" autoComplete="off">
            <div className="space-y-1.5">
              <Label htmlFor="login_email_field" className="text-xs font-semibold">
                Alamat Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login_email_field"
                  name="login_email_field"
                  type="email"
                  autoComplete="off"
                  className="h-10 pl-9 text-sm"
                  placeholder="Masukkan email terdaftar..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errEmail && <p className="text-xs text-destructive">{errEmail}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login_password_field" className="text-xs font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login_password_field"
                  name="login_password_field"
                  type={lihat ? "text" : "password"}
                  autoComplete="new-password"
                  className="h-10 pl-9 pr-10 text-sm"
                  placeholder="Masukkan password akun..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setLihat((v) => !v)}
                  aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {lihat ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errPassword && <p className="text-xs text-destructive">{errPassword}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={ingat}
                  onChange={(e) => setIngat(e.target.checked)}
                  className="size-3.5 rounded border-input accent-primary"
                />
                Ingat saya
              </label>
              <button
                type="button"
                onClick={handleKlikLupaPassword}
                className="font-medium text-primary underline-offset-4 hover:underline cursor-pointer"
              >
                Lupa password?
              </button>
            </div>

            {error && (
              <div className="rounded-lg p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 space-y-1">
                <p className="font-semibold">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="h-10 w-full text-sm font-semibold"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "Memproses Autentikasi..." : "Login Akun"}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Belum punya akun?{" "}
              <Link
                to="/register"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Daftar sekarang
              </Link>
            </p>

            <div className="pt-2.5 border-t text-center">
              <p className="text-[11px] text-muted-foreground">
                Punya usaha bengkel motor?
              </p>
              <Link
                to="/daftar-bengkel"
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline underline-offset-4"
              >
                <Building2 className="size-3.5" /> Daftarkan Bengkel Anda sebagai Mitra
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}

