import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  UserPlus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HOME_ROLE, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Daftar Akun — AppBenk Solusi Servis Kendaraan" },
      {
        name: "description",
        content:
          "Buat akun pelanggan AppBenk untuk booking servis, memantau status kendaraan, dan melihat riwayat pembayaran bengkel.",
      },
      { property: "og:title", content: "Daftar Akun — AppBenk Solusi Servis Kendaraan" },
      { property: "og:description", content: "Buat akun untuk mengakses semua layanan AppBenk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

type Err = Partial<
  Record<"nama" | "email" | "telepon" | "gender" | "password" | "konfirmasi" | "setuju", string>
>;

function RegisterPage() {
  const navigate = useNavigate();
  const { user, daftar } = useAuth();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [telepon, setTelepon] = useState("");
  const [gender, setGender] = useState<"Laki-laki" | "Perempuan" | "">("Laki-laki");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [lihat1, setLihat1] = useState(false);
  const [lihat2, setLihat2] = useState(false);
  const [setuju, setSetuju] = useState(false);
  const [err, setErr] = useState<Err>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: HOME_ROLE[user.role], replace: true });
    // Reset state on mount to prevent browser autofill
    setNama("");
    setEmail("");
    setTelepon("");
    setPassword("");
    setKonfirmasi("");
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Err = {};
    if (!nama.trim()) next.nama = "Nama lengkap wajib diisi.";
    if (!email.trim()) next.email = "Email wajib diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Format email tidak valid.";
    else if (!email.trim().toLowerCase().endsWith("@gmail.com"))
      next.email = "Hanya alamat email @gmail.com yang diperbolehkan.";
    if (!telepon.trim()) next.telepon = "No. handphone wajib diisi.";
    if (!gender) next.gender = "Jenis kelamin wajib dipilih.";
    if (!password) next.password = "Kata sandi wajib diisi.";
    else if (password.length < 8) next.password = "Kata sandi minimal 8 karakter.";
    if (konfirmasi !== password) next.konfirmasi = "Konfirmasi kata sandi tidak sama.";
    if (!setuju) next.setuju = "Anda harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi.";
    setErr(next);
    setError("");
    if (Object.keys(next).length) return;

    setLoading(true);
    const hasil = await daftar({ nama, email, telepon, gender, password });
    setLoading(false);
    if (!hasil.ok) {
      let pesan = hasil.error ?? "Pendaftaran gagal.";
      if (pesan.toLowerCase().includes("user already registered")) {
        pesan = "Email ini sudah terdaftar. Silakan gunakan email lain atau login.";
      } else if (
        pesan.toLowerCase().includes("email address") &&
        pesan.toLowerCase().includes("invalid")
      ) {
        pesan =
          "Format alamat email tidak diterima oleh penyedia auth. Gunakan domain email umum (misal: @gmail.com).";
      }
      setError(pesan);
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("appbenk_pending_email", email.trim());
    }

    if (hasil.unconfirmed) {
      toast.success("Akun berhasil dibuat! Silakan verifikasi email Anda.");
      navigate({ to: "/verify-email", replace: true });
      return;
    }

    setSukses(true);
    toast.success("Akun berhasil dibuat! Silakan masuk dengan akun Anda.");
  };

  if (sukses) {
    return (
      <AuthLayout aksi="masuk">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-8" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
            Akun Berhasil Dibuat
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Akun pelanggan Anda telah berhasil terdaftar. Silakan login untuk mulai menjadwalkan
            servis dan mengelola kendaraan.
          </p>
          <Button asChild className="mt-6 h-11 w-full text-base font-semibold">
            <Link to="/login">Masuk ke Akun</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout aksi="masuk">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-primary/25 text-primary">
            <UserPlus className="size-8" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Daftar Akun</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar sebagai pelanggan untuk memesan servis dan memantau kendaraan
          </p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4" autoComplete="off">
          {/* Decoy inputs to prevent aggressive password manager autofill */}
          <input
            type="text"
            name="fake_user_remembered"
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />
          <input
            type="password"
            name="fake_pass_remembered"
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="new-password"
          />

          <Field
            id="reg_nama"
            name="reg_nama"
            label="Nama Lengkap"
            icon={<UserRound className="size-4" />}
            placeholder="Masukkan nama lengkap Anda"
            value={nama}
            onChange={setNama}
            error={err.nama}
            autoComplete="off"
          />

          <Field
            id="reg_email"
            name="reg_email"
            label="Email"
            type="email"
            icon={<Mail className="size-4" />}
            placeholder="nama@email.com"
            value={email}
            onChange={setEmail}
            error={err.email}
            autoComplete="new-password"
          />

          <Field
            id="reg_telepon"
            name="reg_telepon"
            label="No. Handphone / WhatsApp"
            type="tel"
            icon={<Phone className="size-4" />}
            placeholder="081234567890"
            value={telepon}
            onChange={setTelepon}
            error={err.telepon}
            autoComplete="off"
          />

          {/* Jenis Kelamin Radio Group */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Jenis Kelamin</Label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-colors",
                  gender === "Laki-laki"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-input hover:bg-muted/40 text-muted-foreground",
                )}
              >
                <input
                  type="radio"
                  name="reg_gender"
                  value="Laki-laki"
                  checked={gender === "Laki-laki"}
                  onChange={() => setGender("Laki-laki")}
                  className="sr-only"
                />
                <span>Laki-laki</span>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-colors",
                  gender === "Perempuan"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-input hover:bg-muted/40 text-muted-foreground",
                )}
              >
                <input
                  type="radio"
                  name="reg_gender"
                  value="Perempuan"
                  checked={gender === "Perempuan"}
                  onChange={() => setGender("Perempuan")}
                  className="sr-only"
                />
                <span>Perempuan</span>
              </label>
            </div>
            {err.gender && <p className="text-xs text-destructive">{err.gender}</p>}
          </div>

          <Field
            id="reg_password"
            name="reg_password"
            label="Kata Sandi"
            type={lihat1 ? "text" : "password"}
            icon={<Lock className="size-4" />}
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={setPassword}
            error={err.password}
            autoComplete="new-password"
            toggle={{ on: lihat1, set: () => setLihat1((v) => !v) }}
          />

          <Field
            id="reg_konfirmasi"
            name="reg_konfirmasi"
            label="Konfirmasi Kata Sandi"
            type={lihat2 ? "text" : "password"}
            icon={<Lock className="size-4" />}
            placeholder="Ulangi kata sandi"
            value={konfirmasi}
            onChange={setKonfirmasi}
            error={err.konfirmasi}
            autoComplete="new-password"
            toggle={{ on: lihat2, set: () => setLihat2((v) => !v) }}
          />

          <div className="space-y-1 pt-1">
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={setuju}
                onChange={(e) => setSetuju(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
              />
              <span>
                Saya setuju dengan{" "}
                <span className="font-medium text-foreground underline">
                  Syarat &amp; Ketentuan
                </span>{" "}
                dan <span className="font-medium text-foreground underline">Kebijakan Privasi</span>{" "}
                AppBenk.
              </span>
            </label>
            {err.setuju && <p className="text-xs text-destructive">{err.setuju}</p>}
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-11 w-full text-base font-semibold"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {loading ? "Membuat Akun..." : "Daftar"}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-1">
            Registrasi publik otomatis terdaftar sebagai{" "}
            <span className="font-semibold text-foreground">Pelanggan</span>.
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Login
            </Link>
          </p>

          <div className="pt-3 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Pemilik bengkel? Kembangkan usaha bengkel Anda bersama kami.
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
    </AuthLayout>
  );
}

function Field({
  id,
  name,
  label,
  icon,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  autoComplete = "off",
  toggle,
}: {
  id: string;
  name?: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: string;
  autoComplete?: string;
  toggle?: { on: boolean; set: () => void } | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          name={name || id}
          type={type}
          autoComplete={autoComplete}
          className={cn("h-11 pl-9", toggle && "pr-10")}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {toggle && (
          <button
            type="button"
            onClick={toggle.set}
            aria-label={toggle.on ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {toggle.on ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
