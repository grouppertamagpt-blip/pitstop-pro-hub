import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HOME_ROLE, LABEL_ROLE, useAuth } from "@/lib/auth";

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
  const { user, masuk, kirimKodeResetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihat, setLihat] = useState(false);
  const [ingat, setIngat] = useState(true);
  const [loading, setLoading] = useState(false);
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
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/5 text-primary">
              <UserRoundCheck className="size-7" />
            </span>
            <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Masuk ke AppBenk
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Masukkan email dan password untuk mengakses akun Anda
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" autoComplete="off">
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

