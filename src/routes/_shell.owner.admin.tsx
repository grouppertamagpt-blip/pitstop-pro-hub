import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Mail,
  User,
  Copy,
  Check,
  RotateCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Building2,
  Calendar,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { adminInvitationService } from "@/services/appbenk-service";
import type { AdminRow, AdminInvitationRow, StatusAdminInvitation } from "@/types/database";

export const Route = createFileRoute("/_shell/owner/admin")({
  head: () => ({
    meta: [
      { title: "Kelola Admin Bengkel — AppBenk Owner" },
      {
        name: "description",
        content: "Kelola staf administrator dan kirimkan tautan undangan staf admin baru untuk bengkel Anda.",
      },
    ],
  }),
  component: OwnerKelolaAdminPage,
});

function getAppBaseUrl(): string {
  const envUrl = (
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_APP_URL"]) ||
    ""
  ) as string;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return envUrl ? envUrl.replace(/\/$/, "") : "http://localhost:8080";
}

function OwnerKelolaAdminPage() {
  const { user } = useAuth();
  const bengkelId = user?.bengkelId || user?.workshopId || "";

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal Undang Admin
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [namaInput, setNamaInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Hasil Undangan Berhasil (Token & Link)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [invitedName, setInvitedName] = useState<string>("");
  const [invitedEmail, setInvitedEmail] = useState<string>("");
  const [copiedToken, setCopiedToken] = useState(false);

  // Load Data Staf & Undangan
  const loadData = async (isManual = false) => {
    if (!bengkelId) {
      setLoading(false);
      return;
    }
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg("");

    try {
      const [adminList, invList] = await Promise.all([
        adminInvitationService.getWorkshopAdmins(bengkelId),
        adminInvitationService.getWorkshopInvitations(bengkelId),
      ]);
      setAdmins(adminList);
      setInvitations(invList);
      if (isManual) toast.success("Data staf dan undangan berhasil diperbarui.");
    } catch (err: any) {
      console.error("Gagal memuat data admin:", err);
      setErrorMsg(err?.message || "Gagal memuat data dari Supabase.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [bengkelId]);

  // Handle Submit Buat Undangan
  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const nama = namaInput.trim();
    const email = emailInput.trim().toLowerCase();

    if (!nama) {
      toast.error("Nama lengkap admin wajib diisi.");
      return;
    }
    if (!email) {
      toast.error("Email calon admin wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Format alamat email tidak valid.");
      return;
    }

    setSubmitting(true);
    const res = await adminInvitationService.createInvitation(nama, email, bengkelId);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error || "Gagal membuat undangan staf admin.");
      return;
    }

    const origin = getAppBaseUrl();
    const fullLink = res.activation_link || `${origin}/accept-invite?token=${res.token}`;

    toast.success("Tautan undangan staf admin berhasil dibuat!");
    setGeneratedToken(res.token || null);
    setGeneratedLink(fullLink);
    setInvitedName(nama);
    setInvitedEmail(email);
    await loadData(false);
  };

  // Salin Link Undangan
  const handleCopyLink = (tokenOrLink?: string | null) => {
    const target = tokenOrLink || generatedLink || (generatedToken ? `/accept-invite?token=${generatedToken}` : "");
    if (!target) return;

    const origin = getAppBaseUrl();
    const link = target.startsWith("http") ? target : `${origin}/accept-invite?token=${target}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(link)
        .then(() => {
          setCopiedToken(true);
          toast.success("Tautan aktivasi berhasil disalin ke clipboard!");
          setTimeout(() => setCopiedToken(false), 3000);
        })
        .catch(() => {
          toast.error("Gagal menyalin tautan. Silakan salin secara manual.");
        });
    }
  };

  // Kirim via WhatsApp
  const handleShareWhatsApp = () => {
    const origin = getAppBaseUrl();
    const link = generatedLink || (generatedToken ? `${origin}/accept-invite?token=${generatedToken}` : "");
    if (!link) return;

    const targetNama = invitedName || namaInput || "Rekan";
    const workshopName = user?.bengkelId ? `Bengkel Mitra (${user.bengkelId})` : "Bengkel Mitra";
    const msg = `Halo ${targetNama},\n\nAnda telah diundang untuk bergabung sebagai Staf Administrator di ${workshopName} pada platform AppBenk.\n\nSilakan klik tautan berikut untuk melengkapi data dan mengaktifkan akun Anda:\n${link}\n\n*Catatan: Tautan aktivasi ini berlaku selama 48 jam.*`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Reset form dialog saat ditutup dan refresh data
  const handleCloseDialog = (open: boolean) => {
    setInviteModalOpen(open);
    if (!open) {
      setNamaInput("");
      setEmailInput("");
      setGeneratedToken(null);
      setGeneratedLink(null);
      setInvitedName("");
      setInvitedEmail("");
      setCopiedToken(false);
      loadData(false);
    }
  };

  // Format Tanggal
  const formatTanggal = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  // Render Status Undangan
  const renderInvitationBadge = (status: StatusAdminInvitation) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]"
          >
            <Clock className="size-3 text-amber-600 dark:text-amber-400" />
            Menunggu Klaim
          </Badge>
        );
      case "accepted":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]"
          >
            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
            Diterima
          </Badge>
        );
      case "expired":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-muted-foreground/30 bg-muted text-muted-foreground text-[10px]"
          >
            <Clock className="size-3" />
            Kedaluwarsa
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-destructive/30 bg-destructive/10 text-destructive text-[10px]"
          >
            <XCircle className="size-3" />
            Dibatalkan
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Staf Administrator"
        description="Daftar admin bengkel dan kelola undangan staf baru yang terikat pada bengkel Anda."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="h-9 gap-1.5 text-xs"
            >
              <RotateCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Perbarui
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setGeneratedToken(null);
                setNamaInput("");
                setEmailInput("");
                setInviteModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <UserPlus className="size-4" />
              Undang Admin Baru
            </Button>
          </div>
        }
      />

      {/* Info Bengkel Aktif */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="size-4" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Bengkel Terdaftar: {user?.bengkelId || "Bengkel Mitra"}</p>
            <p className="text-muted-foreground">Undangan admin akan otomatis terikat ke bengkel ini secara aman di server.</p>
          </div>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="font-mono text-[11px] font-bold">
            {admins.length} Admin Aktif
          </Badge>
        </div>
      </div>

      {/* ========================================================
          BAGIAN 1: DAFTAR STAF ADMIN AKTIF
          ======================================================== */}
      <Card>
        <CardHeader className="p-4 sm:p-5 border-b">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Users className="size-4 text-primary" />
            Daftar Staf Admin Aktif
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Memuat daftar staf admin...</p>
            </div>
          ) : errorMsg ? (
            <div className="py-8 text-center text-xs text-destructive space-y-2">
              <AlertCircle className="size-6 mx-auto text-destructive" />
              <p>{errorMsg}</p>
              <Button size="sm" variant="outline" onClick={() => loadData(true)}>
                Coba Lagi
              </Button>
            </div>
          ) : admins.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Users className="size-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">Belum ada staf Admin di bengkel Anda.</p>
              <p>Klik tombol &ldquo;Undang Admin Baru&rdquo; untuk menambahkan staf pertama Anda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead className="font-semibold">Nama Lengkap</TableHead>
                  <TableHead className="font-semibold">Email Akun</TableHead>
                  <TableHead className="font-semibold">No. Handphone</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Tanggal Bergabung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((adm, idx) => (
                  <TableRow key={adm.id_admin} className="text-xs">
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {adm.nama}
                    </TableCell>
                    <TableCell className="text-foreground">{adm.email}</TableCell>
                    <TableCell className="text-muted-foreground">{adm.no_hp || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      >
                        {adm.status === "aktif" ? "Aktif" : adm.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTanggal(adm.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ========================================================
          BAGIAN 2: RIWAYAT UNDANGAN ADMIN
          ======================================================== */}
      <Card>
        <CardHeader className="p-4 sm:p-5 border-b flex flex-row items-center justify-between">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            Riwayat Undangan Staf Admin
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Masa berlaku undangan adalah 48 jam sejak dibuat.
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Memuat riwayat undangan...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Belum ada riwayat undangan yang dikirimkan.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead className="font-semibold">Nama Calon Admin</TableHead>
                  <TableHead className="font-semibold">Email Penerima</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Berlaku Sampai</TableHead>
                  <TableHead className="text-right font-semibold">Tautan Undangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv, idx) => (
                  <TableRow key={inv.id} className="text-xs">
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{inv.nama}</TableCell>
                    <TableCell className="text-foreground">{inv.email}</TableCell>
                    <TableCell>{renderInvitationBadge(inv.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTanggal(inv.expires_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "pending" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(inv.token)}
                          className="h-7 text-xs gap-1"
                        >
                          <Copy className="size-3" />
                          Salin Link
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ========================================================
          MODAL FORM UNDANG ADMIN
          ======================================================== */}
      <Dialog open={inviteModalOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Undang Staf Administrator Baru
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Buat tautan undangan khusus untuk calon staf yang akan membantu mengelola operasional bengkel Anda.
            </DialogDescription>
          </DialogHeader>

          {/* JIKA UNDANGAN SUDAH BERHASIL DIBUAT: TAMPILKAN LINK UNTUK DISALIN & DIBAGIKAN */}
          {generatedToken ? (
            <div className="space-y-4 my-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tautan Undangan Berhasil Dibuat!</span>
                </div>
                <p className="leading-relaxed">
                  Tautan aktivasi untuk calon staf{" "}
                  <span className="font-semibold text-foreground">
                    {invitedName || namaInput}
                  </span>{" "}
                  ({invitedEmail || emailInput}) telah aktif dan berlaku selama 48 jam.
                </p>
              </div>

              {/* Box Berisi Tautan Lengkap yang Baru Dibuat */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Tautan Aktivasi Staf Administrator
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={
                      generatedLink ||
                      (generatedToken
                        ? `${getAppBaseUrl()}/accept-invite?token=${generatedToken}`
                        : "")
                    }
                    className="h-10 text-xs font-mono bg-muted/80 border select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              </div>

              {/* Tombol Aksi: Salin Tautan & Kirim via WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Tombol Salin Tautan dengan Indikator Visual */}
                <Button
                  type="button"
                  variant={copiedToken ? "default" : "outline"}
                  onClick={() => handleCopyLink(generatedLink || generatedToken)}
                  className={`h-10 gap-2 text-xs font-semibold transition-all ${
                    copiedToken ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                  }`}
                >
                  {copiedToken ? (
                    <>
                      <Check className="size-4 animate-in zoom-in-50" />
                      Tautan Disalin!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Salin Tautan
                    </>
                  )}
                </Button>

                {/* Tombol Kirim via WhatsApp */}
                <Button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="h-10 gap-2 text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm"
                >
                  <MessageCircle className="size-4" />
                  Kirim via WhatsApp
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                Calon admin cukup mengklik tautan tersebut untuk melengkapi profil dan membuat kata sandi baru. Tidak diperlukan pengiriman email manual.
              </p>

              {/* Tombol Selesai untuk Menutup Modal dan Me-refresh Riwayat */}
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  onClick={() => handleCloseDialog(false)}
                  className="w-full h-10 text-xs font-semibold"
                >
                  Selesai
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* FORM INPUT DATA CALON ADMIN */
            <form onSubmit={handleCreateInvitation} className="space-y-4 my-2">
              <div className="space-y-1.5">
                <Label htmlFor="admin_nama" className="text-xs font-semibold">
                  Nama Lengkap Calon Admin *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="admin_nama"
                    placeholder="Contoh: Rian Pratama"
                    value={namaInput}
                    onChange={(e) => setNamaInput(e.target.value)}
                    className="pl-9 h-10 text-xs"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin_email" className="text-xs font-semibold">
                  Alamat Email Calon Admin *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="admin_email"
                    type="email"
                    placeholder="nama.admin@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="pl-9 h-10 text-xs"
                    disabled={submitting}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Gunakan email aktif. Calon admin hanya dapat mengklaim hak akses jika masuk dengan email ini.
                </p>
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloseDialog(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  {submitting ? "Membuat Undangan..." : "Buat Tautan Undangan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

