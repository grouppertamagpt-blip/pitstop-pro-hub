import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  AlertCircle,
  Loader2,
  RotateCw,
  Eye,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { workshopApplicationService } from "@/services/appbenk-service";
import type { WorkshopApplicationRow, StatusWorkshopApplication } from "@/types/database";

export const Route = createFileRoute("/_shell/superadmin/pengajuan-bengkel")({
  head: () => ({
    meta: [
      { title: "Pengajuan Bengkel — Super Admin AppBenk" },
      {
        name: "description",
        content: "Kelola, tinjau, setujui, dan tolak pengajuan kemitraan calon pemilik bengkel AppBenk.",
      },
    ],
  }),
  component: SuperAdminPengajuanBengkelPage,
});

function SuperAdminPengajuanBengkelPage() {
  const [applications, setApplications] = useState<WorkshopApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | StatusWorkshopApplication>("semua");

  // Modal Detail State
  const [selectedApp, setSelectedApp] = useState<WorkshopApplicationRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Modal Approve Confirmation
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  // Modal Reject Dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Load Data dari Supabase
  const loadApplications = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await workshopApplicationService.getAllApplications();
      setApplications(data);
    } catch (err: any) {
      console.error("Gagal memuat daftar pengajuan bengkel:", err);
      setErrorMsg(err?.message || "Gagal memuat data pengajuan dari Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Filter & Search Logic
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchSearch =
        search.trim() === "" ||
        app.nama_bengkel.toLowerCase().includes(search.toLowerCase()) ||
        app.owner_nama.toLowerCase().includes(search.toLowerCase()) ||
        app.owner_email.toLowerCase().includes(search.toLowerCase()) ||
        (app.bengkel_id_result && app.bengkel_id_result.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = filterStatus === "semua" || app.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [applications, search, filterStatus]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter((a) => a.status === "PENDING").length,
      approved: applications.filter((a) => a.status === "APPROVED").length,
      rejected: applications.filter((a) => a.status === "REJECTED").length,
    };
  }, [applications]);

  // Handle Approve Application
  const handleApprove = async () => {
    if (!selectedApp || approving) return;

    setApproving(true);
    const res = await workshopApplicationService.approveApplication(selectedApp.id);
    setApproving(false);

    if (!res.ok) {
      toast.error(res.error || "Gagal menyetujui pengajuan bengkel.");
      return;
    }

    toast.success(
      `Bengkel ${selectedApp.nama_bengkel} berhasil disetujui! ID Bengkel Resmi: ${res.id_bengkel || "Baru"}`,
    );
    setConfirmApproveOpen(false);
    setDetailOpen(false);
    setSelectedApp(null);
    await loadApplications();
  };

  // Handle Reject Application
  const handleReject = async () => {
    if (!selectedApp || rejecting) return;
    if (!rejectReason.trim()) {
      toast.error("Alasan penolakan wajib diisi.");
      return;
    }

    setRejecting(true);
    const res = await workshopApplicationService.rejectApplication(
      selectedApp.id,
      rejectReason.trim(),
    );
    setRejecting(false);

    if (!res.ok) {
      toast.error(res.error || "Gagal menolak pengajuan bengkel.");
      return;
    }

    toast.success(`Pengajuan bengkel ${selectedApp.nama_bengkel} telah ditolak.`);
    setRejectOpen(false);
    setRejectReason("");
    setDetailOpen(false);
    setSelectedApp(null);
    await loadApplications();
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

  // Badge Status Renderer
  const renderStatusBadge = (status: StatusWorkshopApplication) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px]"
          >
            <Clock className="size-3 text-amber-600 dark:text-amber-400" />
            PENDING
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px]"
          >
            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
            APPROVED
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-destructive/40 bg-destructive/10 text-destructive text-[11px]"
          >
            <XCircle className="size-3 text-destructive" />
            REJECTED
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Pengajuan Pendaftaran Bengkel"
        description="Verifikasi, setujui, dan tolak pendaftaran calon mitra bengkel baru secara terpusat."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={loadApplications}
          disabled={loading}
          className="gap-1.5 text-xs"
        >
          <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang
        </Button>
      </PageHeader>

      {/* Ringkasan Status Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card
          onClick={() => setFilterStatus("semua")}
          className={`cursor-pointer transition-all ${
            filterStatus === "semua" ? "border-primary ring-1 ring-primary/30" : "hover:border-muted-foreground/30"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Semua Pengajuan</p>
              <p className="font-display text-2xl font-bold text-foreground mt-0.5">{stats.total}</p>
            </div>
            <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <ClipboardCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterStatus("PENDING")}
          className={`cursor-pointer transition-all ${
            filterStatus === "PENDING" ? "border-amber-500 ring-1 ring-amber-500/30" : "hover:border-muted-foreground/30"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Menunggu Verifikasi</p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {stats.pending}
              </p>
            </div>
            <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterStatus("APPROVED")}
          className={`cursor-pointer transition-all ${
            filterStatus === "APPROVED" ? "border-emerald-500 ring-1 ring-emerald-500/30" : "hover:border-muted-foreground/30"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Disetujui (Mitra)</p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.approved}
              </p>
            </div>
            <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterStatus("REJECTED")}
          className={`cursor-pointer transition-all ${
            filterStatus === "REJECTED" ? "border-destructive ring-1 ring-destructive/30" : "hover:border-muted-foreground/30"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-destructive font-medium">Ditolak</p>
              <p className="font-display text-2xl font-bold text-destructive mt-0.5">{stats.rejected}</p>
            </div>
            <div className="size-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
              <XCircle className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Pengajuan */}
      <Card>
        <CardHeader className="p-4 sm:p-5 border-b space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari bengkel, owner, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Memuat data pengajuan dari Supabase...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3">
              <AlertCircle className="size-8 text-destructive" />
              <p className="text-sm font-medium text-destructive">{errorMsg}</p>
              <Button size="sm" variant="outline" onClick={loadApplications} className="text-xs">
                Coba Lagi
              </Button>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-2">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <ClipboardCheck className="size-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">Belum ada pengajuan bengkel.</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {filterStatus !== "semua" || search
                  ? "Tidak ada data yang sesuai dengan filter atau kata kunci pencarian Anda."
                  : "Belum ada calon owner yang mengirimkan pengajuan pendaftaran bengkel mitra."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead className="font-semibold">Nama Bengkel</TableHead>
                  <TableHead className="font-semibold">Nama Owner</TableHead>
                  <TableHead className="font-semibold">Email &amp; Kontak</TableHead>
                  <TableHead className="font-semibold">Paket</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Tanggal Pengajuan</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app, idx) => {
                  return (
                    <TableRow key={app.id} className="text-xs">
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{app.nama_bengkel}</p>
                            {app.bengkel_id_result && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                ID: {app.bengkel_id_result}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {app.owner_nama}
                      </TableCell>
                      <TableCell>
                        <p className="text-foreground">{app.owner_email}</p>
                        <p className="text-[11px] text-muted-foreground">{app.no_telepon}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="gap-1 text-[10px] border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <ShieldCheck className="size-3 text-slate-500" />
                          {app.paket || "Basic"}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTanggal(app.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setDetailOpen(true);
                          }}
                          className="h-8 gap-1 text-xs"
                        >
                          <Eye className="size-3.5" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ========================================================
          MODAL DETAIL PENGAJUAN
          ======================================================== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center justify-between gap-3">
              <span>Detail Pengajuan Bengkel</span>
              {selectedApp && renderStatusBadge(selectedApp.status)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rincian lengkap data formulir kemitraan yang dikirimkan calon pemilik bengkel.
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-5 text-xs">
              {/* Bagian 1: Data Bengkel */}
              <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <Building2 className="size-4 text-primary" />
                  Data Bengkel
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Nama Bengkel:</span>
                    <p className="font-semibold text-foreground text-sm">{selectedApp.nama_bengkel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pilihan Paket:</span>
                    <p className="font-semibold text-foreground text-sm">Paket {selectedApp.paket}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nomor Telepon Bengkel:</span>
                    <p className="font-medium text-foreground">{selectedApp.no_telepon}</p>
                  </div>
                  {selectedApp.bengkel_id_result && (
                    <div>
                      <span className="text-muted-foreground">ID Bengkel Terdaftar:</span>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedApp.bengkel_id_result}
                      </p>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Alamat Lengkap:</span>
                    <p className="font-medium text-foreground leading-relaxed mt-0.5">
                      {selectedApp.alamat}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Data Owner */}
              <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <User className="size-4 text-primary" />
                  Data Pemilik (Calon Owner)
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Nama Lengkap Owner:</span>
                    <p className="font-semibold text-foreground text-sm">{selectedApp.owner_nama}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email Akun:</span>
                    <p className="font-medium text-foreground">{selectedApp.owner_email}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">User ID (Auth ID):</span>
                    <p className="font-mono text-[11px] text-muted-foreground break-all">
                      {selectedApp.user_id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Status & Riwayat Peninjauan */}
              <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <Calendar className="size-4 text-primary" />
                  Riwayat &amp; Status Peninjauan
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Waktu Pengajuan:</span>
                    <p className="font-medium text-foreground">{formatTanggal(selectedApp.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Waktu Terakhir Diperbarui:</span>
                    <p className="font-medium text-foreground">{formatTanggal(selectedApp.updated_at)}</p>
                  </div>
                  {selectedApp.reviewed_at && (
                    <div>
                      <span className="text-muted-foreground">Waktu Peninjauan:</span>
                      <p className="font-medium text-foreground">{formatTanggal(selectedApp.reviewed_at)}</p>
                    </div>
                  )}
                  {selectedApp.catatan_review && (
                    <div className="sm:col-span-2 pt-1">
                      <span className="text-muted-foreground">Catatan Peninjauan / Alasan:</span>
                      <p className="font-medium text-destructive mt-0.5 bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 whitespace-pre-wrap">
                        {selectedApp.catatan_review}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetailOpen(false)}
              className="w-full sm:w-auto text-xs"
            >
              Tutup
            </Button>

            {/* AKSI HANYA MUNCUL JIKA STATUS PENDING */}
            {selectedApp?.status === "PENDING" && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setRejectReason("");
                    setRejectOpen(true);
                  }}
                  className="w-full sm:w-auto text-xs font-semibold"
                >
                  <XCircle className="size-3.5 mr-1" />
                  Tolak Pengajuan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setConfirmApproveOpen(true)}
                  className="w-full sm:w-auto text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="size-3.5 mr-1" />
                  Setujui Pengajuan
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL KONFIRMASI APPROVAL
          ======================================================== */}
      <Dialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="size-5" />
              Konfirmasi Persetujuan Bengkel
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Apakah Anda yakin ingin menyetujui pendaftaran bengkel ini?
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="rounded-xl border bg-muted/40 p-3.5 text-xs space-y-1.5 my-2">
              <p>
                <span className="text-muted-foreground">Nama Bengkel:</span>{" "}
                <span className="font-semibold text-foreground">{selectedApp.nama_bengkel}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Nama Owner:</span>{" "}
                <span className="font-semibold text-foreground">{selectedApp.owner_nama}</span> (
                {selectedApp.owner_email})
              </p>
              <p>
                <span className="text-muted-foreground">Paket Sistem:</span>{" "}
                <span className="font-semibold text-foreground">Paket {selectedApp.paket}</span>
              </p>
              <div className="pt-2 text-[11px] text-muted-foreground border-t">
                Sistem akan secara otomatis:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Membuat ID bengkel baru dan entri resmi di tabel bengkel.</li>
                  <li>Mendaftarkan data owner ke tabel owner.</li>
                  <li>Meningkatkan hak akses user menjadi Owner Bengkel.</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmApproveOpen(false)}
              disabled={approving}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApprove}
              disabled={approving}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {approving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {approving ? "Memproses..." : "Ya, Setujui Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL TOLAK PENGAJUAN (DENGAN ALASAN WAJIB)
          ======================================================== */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              Tolak Pengajuan Bengkel
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Berikan alasan penolakan yang jelas untuk dicatat pada data pengajuan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="space-y-1.5">
              <Label htmlFor="alasan_penolakan" className="text-xs font-semibold">
                Alasan Penolakan *
              </Label>
              <Textarea
                id="alasan_penolakan"
                rows={3}
                placeholder="Contoh: Nomor telepon operasional bengkel tidak dapat dihubungi, atau alamat bengkel tidak terverifikasi..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Alasan ini akan disimpan di database dan dapat dilihat oleh calon owner saat memeriksa status pendaftaran mereka.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectOpen(false)}
              disabled={rejecting}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
              className="text-xs font-semibold"
            >
              {rejecting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {rejecting ? "Memproses..." : "Konfirmasi Penolakan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

