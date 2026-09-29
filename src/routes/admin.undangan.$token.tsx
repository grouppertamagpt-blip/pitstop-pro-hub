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
  Phone,
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

export const Route = createFileRoute("/admin/undangan/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Penerimaan Undangan Staf Admin — AppBenk" },
      {
        name: "description",
        content: "Terima undangan bergabung sebagai staf administrator bengkel di platform AppBenk.",
      },
    ],
  }),
  component: PenerimaanUndanganAdminPage,
});

function PenerimaanUndanganAdminPage() {
  const { token } = Route.useParams();
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

  // Claim State
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  // Tab Auth jika belum login: "login" | "register"
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  // Form State Login Cepat
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form State Register Cepat
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Load Undangan berdasarkan Token
  useEffect(() => {
    let active = true;
    setLoadingInv(true);
    setInvError("");

    adminInvitationService
      .getInvitationByToken(token)
      .then((res) => {
        if (!active) return;
        if (!res.ok || !res.data) {
          setInvError(res.error || "Tautan undangan tidak valid atau sudah kedaluwarsa.");
        } else {
          setInvitation(res.data);
        }
      })
      .catch((err) => {
        if (!active) return;
        setInvError(err?.message || "Gagal memverifikasi tautan undangan.");
      })
      .finally(() => {
        if (active) setLoadingInv(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  // Handle Quick Login
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || authSubmitting) return;
    setAuthError("");

    if (!loginPassword) {
      setAuthError("Kata sandi wajib diisi.");
      return;
    }

    setAuthSubmitting(true);
    const res = await masuk(invitation.email.toLowerCase(), loginPassword);
    setAuthSubmitting(false);

    if (!res.user) {
      setAuthError(res.error || "Gagal masuk. Periksa kembali kata sandi Anda.");
      return;
    }

    toast.success("Berhasil masuk! Silakan klik tombol Terima Undangan.");
  };

  // Handle Quick Register
  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || authSubmitting) return;
    setAuthError("");

    if (!regPhone.trim()) {
      setAuthError("Nomor handphone wajib diisi.");
      return;
    }
    if (!regPassword) {
      setAuthError("Kata sandi wajib diisi.");
      return;
    }
    if (regPassword.length < 8) {
      setAuthError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (regPassword !== regConfirm) {
      setAuthError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setAuthSubmitting(true);
    const res = await daftar({
      nama: invitation.nama,
      email: invitation.email.toLowerCase(),
      telepon: regPhone.trim(),
      gender: "Laki-laki",
      password: regPassword,
    });

    if (!res.ok) {
      setAuthSubmitting(false);
      setAuthError(res.error || "Gagal mendaftarkan akun.");
      return;
    }

    // Auto login setelah daftar
    const loginRes = await masuk(invitation.email.toLowerCase(), regPassword);
    setAuthSubmitting(false);

    if (!loginRes.user) {
      if (res.unconfirmed) {
        toast.info("Akun berhasil dibuat. Silakan konfirmasi email Anda terlebih dahulu.");
        return;
      }
      setAuthTab("login");
      toast.success("Akun berhasil dibuat. Silakan masuk untuk mengklaim undangan.");
      return;
    }

    toast.success("Akun berhasil dibuat dan masuk! Silakan klik tombol Terima Undangan.");
  };

  // Handle Claim Invitation
  const handleClaimInvitation = async () => {
    if (claiming || !invitation) return;
    setClaimError("");

    setClaiming(true);
    const res = await adminInvitationService.claimInvitation(token);
    setClaiming(false);

    if (!res.ok) {
      setClaimError(res.error || "Gagal menerima undangan staf admin.");
      toast.error(res.error || "Gagal menerima undangan.");
      return;
    }

    toast.success(`Selamat! Anda resmi menjadi Staf Admin untuk ${invitation.nama_bengkel}.`);
    // Full redirect agar loadProfile membaca role 'admin' terbaru dari database
    if (typeof window !== "undefined") {
      window.location.href = "/admin/dashboard";
    }
  };

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

  if (authLoading || loadingInv) {
    return (
      <AuthLayout aksi="masuk">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Memverifikasi tautan undangan...</p>
        </div>
      </AuthLayout>
    );
  }

  // JIKA TAUTAN TIDAK VALID ATAU KEDALUWARSA
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
            {invError || "Tautan undangan yang Anda buka tidak valid, sudah pernah digunakan, atau masa berlakunya (48 jam) telah habis."}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button asChild className="h-11 w-full text-base font-semibold">
              <Link to="/login">Masuk ke AppBenk</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Hubungi pemilik bengkel jika Anda membutuhkan tautan undangan yang baru.
            </p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Cek apakah email user yang sedang login cocok dengan email undangan
  const isEmailMatch = user ? user.email.toLowerCase() === invitation.email.toLowerCase() : false;

  return (
    <AuthLayout aksi="masuk">
      <div className="w-full max-w-lg space-y-6">
        {/* Kartu Detail Undangan */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-7" />
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Undangan Staf Administrator
            </h1>
            <p className="text-xs text-muted-foreground">
              Anda telah diundang untuk bergabung mengelola operasional bengkel mitra di platform AppBenk.
            </p>
          </div>

          {/* Rincian Undangan */}
          <div className="rounded-xl border bg-muted/40 p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> Bengkel Mitra:
              </span>
              <span className="font-bold text-foreground text-sm">{invitation.nama_bengkel}</span>
            </div>

            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-primary" /> Nama Staf:
              </span>
              <span className="font-semibold text-foreground">{invitation.nama}</span>
            </div>

            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Mail className="size-3.5 text-primary" /> Email Terdaftar:
              </span>
              <span className="font-semibold text-foreground font-mono">{invitation.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" /> Berlaku Hingga:
              </span>
              <span className="font-medium text-foreground">{formatTanggal(invitation.expires_at)}</span>
            </div>
          </div>

          {/* ========================================================
              KONDISI A: PENGGUNA SUDAH LOGIN DENGAN EMAIL SESUAI
              ======================================================== */}
          {user && isEmailMatch && (
            <div className="space-y-4 pt-2 border-t">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Akun Anda terverifikasi sesuai dengan email undangan (
                  <span className="font-bold">{user.email}</span>).
                </span>
              </div>

              {claimError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{claimError}</span>
                </div>
              )}

              <Button
                type="button"
                onClick={handleClaimInvitation}
                disabled={claiming}
                className="h-12 w-full text-base font-semibold shadow-sm"
              >
                {claiming && <Loader2 className="mr-2 size-5 animate-spin" />}
                {claiming ? "Mengaktifkan Hak Akses..." : "Terima Undangan & Masuk ke Dashboard"}
                {!claiming && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </div>
          )}

          {/* ========================================================
              KONDISI B: PENGGUNA LOGIN DENGAN EMAIL BERBEDA
              ======================================================== */}
          {user && !isEmailMatch && (
            <div className="space-y-4 pt-2 border-t">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Alamat Email Akun Tidak Sesuai</span>
                </div>
                <p className="leading-relaxed">
                  Anda saat ini sedang masuk sebagai <span className="font-bold underline">{user.email}</span>, sedangkan undangan ini ditujukan khusus untuk email <span className="font-bold underline">{invitation.email}</span>.
                </p>
                <p className="leading-relaxed">
                  Silakan keluar terlebih dahulu, kemudian masuk menggunakan alamat email yang tertera pada undangan.
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

          {/* ========================================================
              KONDISI C: PENGGUNA BELUM LOGIN
              ======================================================== */}
          {!user && (
            <div className="space-y-5 pt-2 border-t">
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Masuk atau buat akun menggunakan email undangan:
                </p>
                <p className="text-xs text-primary font-mono font-bold">{invitation.email}</p>
              </div>

              {/* Tabs Toggle: Masuk vs Daftar */}
              <div className="flex rounded-xl bg-muted p-1 border">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("login");
                    setAuthError("");
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                    authTab === "login"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  1. Masuk ke Akun
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("register");
                    setAuthError("");
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                    authTab === "register"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  2. Buat Akun Baru
                </button>
              </div>

              {/* FORM LOGIN CEPAT */}
              {authTab === "login" && (
                <form onSubmit={handleQuickLogin} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Akun (Terkunci)</Label>
                    <Input
                      disabled
                      value={invitation.email}
                      className="h-10 text-xs bg-muted font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inv_login_password" className="text-xs">
                      Kata Sandi
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="inv_login_password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Masukkan kata sandi Anda"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-9 pr-10 h-10 text-xs"
                        disabled={authSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full h-11 text-xs font-semibold"
                  >
                    {authSubmitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                    {authSubmitting ? "Memverifikasi..." : "Masuk & Lanjutkan Klaim"}
                  </Button>
                </form>
              )}

              {/* FORM REGISTER CEPAT */}
              {authTab === "register" && (
                <form onSubmit={handleQuickRegister} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nama Lengkap (Sesuai Undangan)</Label>
                    <Input
                      disabled
                      value={invitation.nama}
                      className="h-10 text-xs bg-muted"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Akun (Sesuai Undangan)</Label>
                    <Input
                      disabled
                      value={invitation.email}
                      className="h-10 text-xs bg-muted font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inv_reg_phone" className="text-xs">
                      Nomor Handphone / WA *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="inv_reg_phone"
                        placeholder="Contoh: 081234567890"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="pl-9 h-10 text-xs"
                        disabled={authSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inv_reg_password" className="text-xs">
                      Kata Sandi (Minimal 8 Karakter) *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="inv_reg_password"
                        type={showRegPassword ? "text" : "password"}
                        placeholder="Buat kata sandi aman"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="pl-9 pr-10 h-10 text-xs"
                        disabled={authSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inv_reg_confirm" className="text-xs">
                      Konfirmasi Kata Sandi *
                    </Label>
                    <Input
                      id="inv_reg_confirm"
                      type={showRegPassword ? "text" : "password"}
                      placeholder="Ulangi kata sandi"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      className="h-10 text-xs"
                      disabled={authSubmitting}
                    />
                  </div>

                  {authError && (
                    <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full h-11 text-xs font-semibold"
                  >
                    {authSubmitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                    {authSubmitting ? "Mendaftarkan Akun..." : "Buat Akun & Lanjutkan Klaim"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

