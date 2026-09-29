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
} from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HOME_ROLE, LABEL_ROLE, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
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

  // Proteksi Keamanan Brute Force (Lockout setelah 5x kesalahan berturut-turut)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Inisialisasi status lockout dari sessionStorage jika ada
  useEffect(() => {
    if (typeof window === "undefined") return;
    const lockoutUntil = Number(sessionStorage.getItem("appbenk_lockout_until") || 0);
    const now = Date.now();
    if (lockoutUntil > now) {
      setLockoutSeconds(Math.ceil((lockoutUntil - now) / 1000));
    }
    const savedAttempts = Number(sessionStorage.getItem("appbenk_failed_attempts") || 0);
    setFailedAttempts(savedAttempts);
  }, []);

  // Timer hitung mundur lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("appbenk_lockout_until");
            sessionStorage.removeItem("appbenk_failed_attempts");
          }
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  useEffect(() => {
    if (user) navigate({ to: HOME_ROLE[user.role], replace: true });
  }, [user, navigate]);

  const recordFailedAttempt = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("appbenk_failed_attempts", String(nextAttempts));
    }
    if (nextAttempts >= 5) {
      const lockDuration = 60; // 60 detik lockout proteksi
      setLockoutSeconds(lockDuration);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("appbenk_lockout_until", String(Date.now() + lockDuration * 1000));
      }
    }
  };

  const resetFailedAttempts = () => {
    setFailedAttempts(0);
    setLockoutSeconds(0);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("appbenk_failed_attempts");
      sessionStorage.removeItem("appbenk_lockout_until");
    }
  };

  // Validasi data email wajib diisi terlebih dahulu sebelum meminta kode lupa password
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
    if (!cleanEmail.endsWith("@gmail.com")) {
      setErrEmail("Hanya alamat email @gmail.com yang diperbolehkan.");
      setError("Email harus menggunakan domain @gmail.com.");
      const el = document.getElementById("login_email_field");
      el?.focus();
      return;
    }
    setErrEmail("");
    setError("");

    // Langsung kirim kode verifikasi ke email pengguna lalu pindah ke halaman verifikasi kode
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

    // Blokir jika sedang lockout
    if (lockoutSeconds > 0) {
      setError(`Terlalu banyak percobaan gagal. Silakan tunggu ${lockoutSeconds} detik demi keamanan akun.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    const ee = !cleanEmail
      ? "Email wajib diisi."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ? "Format email tidak valid."
        : !cleanEmail.endsWith("@gmail.com")
          ? "Hanya alamat email @gmail.com yang diperbolehkan."
          : "";
    const ep = !cleanPassword ? "Password wajib diisi." : "";
    setErrEmail(ee);
    setErrPassword(ep);
    setError("");
    setIsWrongPassword(false);
    if (ee || ep) return;

    setLoading(true);
    const hasil = await masuk(cleanEmail, cleanPassword);
    setLoading(false);
    if (!hasil.user) {
      let pesan = hasil.error ?? "Email atau password salah. Silakan coba lagi.";
      if (
        pesan.toLowerCase().includes("email not confirmed") ||
        pesan.toLowerCase().includes("email not verified")
      ) {
        pesan =
          "Email belum dikonfirmasi. Silakan periksa inbox email Anda atau kirim ulang tautan verifikasi.";
        setIsUnconfirmed(true);
        setIsWrongPassword(false);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("appbenk_pending_email", cleanEmail);
        }
      } else if (
        pesan.toLowerCase().includes("invalid login credentials") ||
        pesan.toLowerCase().includes("invalid_credentials") ||
        pesan.toLowerCase().includes("password salah") ||
        pesan.toLowerCase().includes("email atau kata sandi salah") ||
        pesan.toLowerCase().includes("email atau password salah")
      ) {
        setIsWrongPassword(true);
        setIsUnconfirmed(false);
        recordFailedAttempt();
        pesan = "Anda salah memasukkan password.";
      } else {
        setIsUnconfirmed(false);
        setIsWrongPassword(false);
      }
      setError(pesan);
      return;
    }

    resetFailedAttempts();
    toast.success(`Berhasil masuk sebagai ${LABEL_ROLE[hasil.user.role]}`);
    navigate({ to: HOME_ROLE[hasil.user.role], replace: true });
  };

  return (
    <AuthLayout aksi="daftar">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-full border-2 border-primary/25 text-primary">
              <UserRoundCheck className="size-8" />
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Login</h1>
            <p className="mt-1 text-sm text-muted-foreground">Masuk untuk mengakses sistem Anda</p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-5" autoComplete="off">
            <div className="space-y-1.5">
              <Label htmlFor="login_email_field">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login_email_field"
                  name="login_email_field"
                  type="email"
                  autoComplete="off"
                  className="h-11 pl-9"
                  placeholder="Masukkan email Anda"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errEmail && <p className="text-xs text-destructive">{errEmail}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login_password_field">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login_password_field"
                  name="login_password_field"
                  type={lihat ? "text" : "password"}
                  autoComplete="new-password"
                  className="h-11 pl-9 pr-10"
                  placeholder="Masukkan password Anda"
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

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={ingat}
                  onChange={(e) => setIngat(e.target.checked)}
                  className="size-4 rounded border-input accent-primary"
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

            {lockoutSeconds > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  Proteksi Keamanan Aktif
                </p>
                <p>
                  Terlalu banyak percobaan login yang salah (5x berturut-turut). Akun dikunci sementara selama {lockoutSeconds} detik untuk mencegah pembobolan kata sandi.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive space-y-1">
                <p>{error}</p>
                {isUnconfirmed && (
                  <Link
                    to="/verify-email"
                    className="inline-block text-xs font-semibold text-primary underline hover:text-primary/80"
                  >
                    Buka Halaman Verifikasi Email &rarr;
                  </Link>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full text-base font-semibold"
              disabled={loading || lockoutSeconds > 0}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading
                ? "Memproses..."
                : lockoutSeconds > 0
                  ? `Terkunci (${lockoutSeconds}s)`
                  : "Login"}
            </Button>

            <p className="text-center text-sm text-muted-foreground pt-1">
              Belum punya akun?{" "}
              <Link
                to="/register"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Daftar sekarang
              </Link>
            </p>

            <div className="pt-3 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Punya usaha bengkel motor?
              </p>
              <Link
                to="/daftar-bengkel"
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline underline-offset-4"
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
