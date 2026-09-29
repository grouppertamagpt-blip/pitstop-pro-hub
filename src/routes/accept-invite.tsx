import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Building2,
  User,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { adminInvitationService } from "@/services/appbenk-service";

export const Route = createFileRoute("/accept-invite")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search["token"] === "string" ? (search["token"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Aktivasi Akun Staf Administrator — AppBenk" },
      {
        name: "description",
        content: "Aktivasi akun dan buat kata sandi untuk bergabung sebagai staf administrator bengkel di platform AppBenk.",
      },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const searchParams = Route.useSearch();
  // Ambil parameter token dari query string (?token=...)
  const token =
    searchParams?.token ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") || ""
      : "");

  const { user, loading: authLoading, masuk, daftar, keluar } = useAuth();

  const [loadingInv, setLoadingInv] = useState(true);
  const [invError, setInvError] = useState("");
  const [invitation, setInvitation] = useState<{
    email: string;
    nama: string;
    id_bengkel: string;
    nama_bengkel: string;
    expires_at: string;
  } | null>(null);

  // Form input data calon admin
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // 1. Verifikasi keabsahan token saat halaman dimuat
  useEffect(() => {
    let active = true;

    if (!token || !token.trim()) {
      setInvError("Tautan aktivasi tidak memiliki token undangan yang valid.");
      setLoadingInv(false);
      return;
    }

    setLoadingInv(true);
    setInvError("");

    adminInvitationService
      .getInvitationByToken(token.trim())
      .then((res) => {
        if (!active) return;
        if (!res.ok || !res.data) {
          setInvError(
            res.error ||
              "Tautan undangan tidak valid, sudah pernah digunakan, atau masa berlakunya (48 jam) telah berakhir.",
          );
        } else {
          setInvitation(res.data);
        }
      })
      .catch((err) => {
        if (!active) return;
        setInvError(err?.message || "Gagal memverifikasi keabsahan tautan undangan.");
      })
      .finally(() => {
        if (active) setLoadingInv(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  // Format Tanggal
  const formatTanggal = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  // 3. Handler Submit Formulir Aktivasi
  const handleAktivasiAkun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !invitation) return;
    setFormError("");

    const targetNama = invitation.nama.trim();
    const targetEmail = invitation.email.toLowerCase().trim();

    // Validasi Password
    if (!password) {
      setFormError("Kata sandi baru wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setFormError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Konfirmasi kata sandi tidak cocok. Pastikan kedua kolom sama.");
      return;
    }

    setSubmitting(true);

    try {
      // Panggil endpoint backend /api/accept-invite jika tersedia
      try {
        await fetch("/api/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.trim(), password }),
        });
      } catch {
        // Lanjutkan ke auth registration & claiming
      }

      // Daftar atau perbarui akun di Supabase Auth
      const regRes = await daftar({
        nama: targetNama,
        email: targetEmail,
        telepon: "-",
        gender: "Laki-laki",
        password: password,
      });

      // Jika pendaftaran gagal karena email sudah terdaftar sebelumnya, lakukan login
      if (!regRes.ok) {
        const isAlreadyRegistered =
          regRes.error?.toLowerCase().includes("already registered") ||
          regRes.error?.toLowerCase().includes("sudah terdaftar");

        if (isAlreadyRegistered) {
          const loginAttempt = await masuk(targetEmail, password);
          if (!loginAttempt.user) {
            setSubmitting(false);
            setFormError(
              "Email ini sudah memiliki akun di AppBenk. Pastikan kata sandi yang Anda masukkan sesuai dengan akun Anda sebelumnya.",
            );
            return;
          }
        } else {
          setSubmitting(false);
          setFormError(regRes.error || "Gagal membuat akun staf admin.");
          return;
        }
      } else {
        // Otomatis login dengan akun yang baru didaftarkan
        const loginRes = await masuk(targetEmail, password);
        if (!loginRes.user && regRes.unconfirmed) {
          setSubmitting(false);
          setFormError(
            "Akun berhasil dibuat. Silakan periksa inbox email Anda untuk verifikasi akun terlebih dahulu.",
          );
          return;
        }
      }

      // Klaim hak akses staf admin via stored procedure di database
      const claimRes = await adminInvitationService.claimInvitation(token.trim());

      if (!claimRes.ok) {
        setSubmitting(false);
        setFormError(claimRes.error || "Gagal mengklaim hak akses staf administrator.");
        toast.error(claimRes.error || "Gagal mengaktifkan undangan.");
        return;
      }

      // Notifikasi sukses dan alihkan langsung ke dashboard operasional bengkel
      toast.success(
        `Selamat! Akun Anda aktif sebagai Staf Administrator untuk ${invitation.nama_bengkel}.`,
      );

      if (typeof window !== "undefined") {
        window.location.href = "/admin/dashboard";
      }
    } catch (err: any) {
      setSubmitting(false);
      setFormError(err?.message || "Terjadi kesalahan saat memproses aktivasi akun.");
    }
  };

  // Handler Klaim Langsung jika User Sedang Login dengan Email yang Sama
  const handleKlaimLangsung = async () => {
    if (submitting || !invitation) return;
    setFormError("");
    setSubmitting(true);

    const claimRes = await adminInvitationService.claimInvitation(token.trim());
    setSubmitting(false);

    if (!claimRes.ok) {
      setFormError(claimRes.error || "Gagal mengklaim hak akses staf admin.");
      toast.error(claimRes.error || "Gagal mengaktifkan undangan.");
      return;
    }

    toast.success(
      `Selamat! Akun Anda resmi menjadi Staf Administrator untuk ${invitation.nama_bengkel}.`,
    );

    if (typeof window !== "undefined") {
      window.location.href = "/admin/dashboard";
    }
  };

  // State: Loading Verifikasi
  if (authLoading || loadingInv) {
    return (
      <AuthLayout aksi="masuk">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium text-foreground">
            Memverifikasi tautan aktivasi...
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Memeriksa validitas token dan status undangan bengkel
          </p>
        </div>
      </AuthLayout>
    );
  }

  // State: Token Tidak Valid / Kedaluwarsa
  if (invError || !invitation) {
    return (
      <AuthLayout aksi="masuk">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8 text-center space-y-4">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="size-8" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Tautan Undangan Tidak Berlaku
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {invError ||
              "Tautan undangan yang Anda buka tidak valid, sudah pernah digunakan, atau masa berlakunya (48 jam) telah berakhir."}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button asChild className="h-11 w-full text-sm font-semibold">
              <Link to="/login">Masuk ke AppBenk</Link>
            </Button>
            <p className="text-xs text-muted-foreground pt-1">
              Hubungi pemilik bengkel jika Anda membutuhkan tautan aktivasi yang baru.
            </p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const isEmailMatch = user ? user.email.toLowerCase() === invitation.email.toLowerCase() : false;

  return (
    <AuthLayout aksi="masuk">
      <div className="w-full max-w-lg space-y-6">
        {/* Kartu Utama Formulir Aktivasi */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-7" />
            </span>
            {/* Judul: Aktivasi Akun Staf Admin - [Nama Bengkel] */}
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Aktivasi Akun Staf Admin - {invitation.nama_bengkel}
            </h1>
            <p className="text-xs text-muted-foreground">
              Lengkapi kata sandi untuk mengaktifkan akun operasional staf admin Anda.
            </p>
          </div>

          {/* Rincian Bengkel & Masa Berlaku */}
          <div className="rounded-xl border bg-muted/40 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> Bengkel Mitra:
              </span>
              <span className="font-bold text-foreground text-sm">{invitation.nama_bengkel}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" /> Masa Berlaku Tautan:
              </span>
              <span className="font-medium text-foreground">{formatTanggal(invitation.expires_at)}</span>
            </div>
          </div>

          {/* Kondisi A: User sudah login dengan email sesuai */}
          {user && isEmailMatch && (
            <div className="space-y-4 pt-2 border-t">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Anda sedang masuk menggunakan akun terverifikasi (
                  <span className="font-bold">{user.email}</span>). Klik tombol di bawah untuk langsung mengaktifkan hak akses staf admin.
                </span>
              </div>

              {formError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <Button
                type="button"
                onClick={handleKlaimLangsung}
                disabled={submitting}
                className="h-12 w-full text-base font-semibold shadow-sm"
              >
                {submitting && <Loader2 className="mr-2 size-5 animate-spin" />}
                {submitting ? "Mengaktifkan Hak Akses..." : "Aktifkan Akun & Masuk"}
                {!submitting && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </div>
          )}

          {/* Kondisi B: User login dengan email berbeda */}
          {user && !isEmailMatch && (
            <div className="space-y-4 pt-2 border-t">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Alamat Email Akun Tidak Sesuai</span>
                </div>
                <p className="leading-relaxed">
                  Anda saat ini sedang masuk sebagai <span className="font-bold underline">{user.email}</span>, sedangkan tautan ini ditujukan untuk email <span className="font-bold underline">{invitation.email}</span>.
                </p>
                <p className="leading-relaxed">
                  Silakan keluar terlebih dahulu untuk mengaktifkan akun staf dengan email undangan yang sesuai.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => keluar()}
                className="w-full text-xs font-semibold gap-1.5"
              >
                <LogOut className="size-4" />
                Keluar dari Akun ({user.email})
              </Button>
            </div>
          )}

          {/* Kondisi C: Formulir Aktivasi Calon Admin */}
          {!user && (
            <form onSubmit={handleAktivasiAkun} className="space-y-4 pt-2 border-t">
              {formError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Informasi Nama Calon Admin (Read-Only / Disabled) */}
              <div className="space-y-1.5">
                <Label htmlFor="inv_nama_display" className="text-xs font-semibold text-foreground">
                  Nama Calon Admin
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="inv_nama_display"
                    disabled
                    readOnly
                    value={invitation.nama}
                    className="pl-9 h-10 text-xs bg-muted font-medium cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Informasi Email Calon Admin (Read-Only / Disabled) */}
              <div className="space-y-1.5">
                <Label htmlFor="inv_email_display" className="text-xs font-semibold text-foreground">
                  Email Calon Admin (Terkunci)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="inv_email_display"
                    disabled
                    readOnly
                    value={invitation.email}
                    className="pl-9 h-10 text-xs bg-muted font-mono cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Akun staf admin Anda akan dibuat dan terhubung ke alamat email ini.
                </p>
              </div>

              {/* Input: Password Baru */}
              <div className="space-y-1.5">
                <Label htmlFor="inv_password" className="text-xs font-semibold text-foreground">
                  Password Baru *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="inv_password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 h-10 text-xs"
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Input: Konfirmasi Password Baru */}
              <div className="space-y-1.5">
                <Label htmlFor="inv_confirm_password" className="text-xs font-semibold text-foreground">
                  Konfirmasi Password Baru *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="inv_confirm_password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 pr-10 h-10 text-xs"
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showConfirm ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Tombol Aksi: Aktifkan Akun & Masuk */}
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full text-sm font-semibold shadow-sm mt-3"
              >
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {submitting ? "Mengaktifkan Akun..." : "Aktifkan Akun & Masuk"}
                {!submitting && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </form>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
