import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  LifeBuoy,
  Search,
  Eye,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Building2,
  User,
  ShieldAlert,
  ArrowRight,
  Filter,
  RefreshCw,
  Sparkles,
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { customerServiceTicketService } from "@/services/appbenk-service";
import type { CSTicketRow, CSMessageRow, StatusCSTicket, KategoriCSTicket } from "@/types/database";

export const Route = createFileRoute("/_shell/superadmin/cs")({
  head: () => ({
    meta: [
      { title: "Manajemen Tiket CS — Super Admin AppBenk" },
      {
        name: "description",
        content:
          "Pusat layanan bantuan Customer Service terpadu platform AppBenk untuk merespon tiket dari admin, owner, dan pelanggan.",
      },
    ],
  }),
  component: SuperAdminCSPage,
});

const STATUS_BADGE: Record<StatusCSTicket, { class: string; label: string }> = {
  Baru: {
    class: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold",
    label: "Baru",
  },
  Diproses: {
    class: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold",
    label: "Diproses",
  },
  "Menunggu Balasan": {
    class: "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold",
    label: "Menunggu Balasan",
  },
  Selesai: {
    class: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold",
    label: "Selesai",
  },
};

const normalizeRole = (
  role?: string | null,
): "admin_bengkel" | "owner" | "pelanggan" | "super_admin" => {
  const r = (role || "").toLowerCase();
  if (r.includes("super")) return "super_admin";
  if (r.includes("admin")) return "admin_bengkel";
  if (r.includes("owner")) return "owner";
  return "pelanggan";
};

const ROLE_BADGE: Record<string, { class: string; label: string }> = {
  pelanggan: {
    class: "border-blue-300/80 bg-blue-100/70 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    label: "Pelanggan",
  },
  admin: {
    class: "border-purple-300/80 bg-purple-100/70 text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    label: "Admin Bengkel",
  },
  admin_bengkel: {
    class: "border-purple-300/80 bg-purple-100/70 text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    label: "Admin Bengkel",
  },
  owner: {
    class: "border-amber-300/80 bg-amber-100/70 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    label: "Owner Bengkel",
  },
  super_admin: {
    class: "border-rose-300/80 bg-rose-100/70 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    label: "Super Admin",
  },
};

function SuperAdminCSPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<CSTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | StatusCSTicket>("semua");
  const [filterKategori, setFilterKategori] = useState<string>("semua");
  const [filterSenderRole, setFilterSenderRole] = useState<
    "semua" | "admin_bengkel" | "owner" | "pelanggan"
  >("semua");

  // Dialog percakapan tiket
  const [selectedTicket, setSelectedTicket] = useState<CSTicketRow | null>(null);
  const [messages, setMessages] = useState<CSMessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const getBengkelDisplay = (t?: CSTicketRow | null): string => {
    if (!t) return "Bengkel Fandi Motor";
    const isAnzar =
      (t.user_email && t.user_email.toLowerCase().includes("anzar")) ||
      (t.user_name && t.user_name.toLowerCase().includes("anzar")) ||
      t.bengkel_id === "bengkel-2307";
    if (isAnzar) return "Bengkel Fandi Motor";
    if (t.bengkel_nama && !t.bengkel_nama.toLowerCase().includes("pusat")) {
      return t.bengkel_nama;
    }
    return t.bengkel_nama || "Bengkel Fandi Motor";
  };

  const loadTickets = async () => {
    try {
      const data = await customerServiceTicketService.getAllTickets();
      const cleaned = data.filter(
        (t) =>
          t.id !== "cs-mock-1" &&
          !t.pesan?.includes("upload bukti pembayaran QRIS tapi status masih menunggu"),
      );
      setTickets(cleaned);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const openTicketDetail = async (ticket: CSTicketRow) => {
    setSelectedTicket(ticket);
    setReplyText("");
    setLoadingMessages(true);
    try {
      const msgs = await customerServiceTicketService.getTicketMessages(ticket.id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendReply = async (nextStatus?: StatusCSTicket) => {
    if (!selectedTicket || !replyText.trim() || !user) return;

    setSendingReply(true);
    try {
      const statusToSet = nextStatus || "Diproses";
      await customerServiceTicketService.sendMessage({
        ticketId: selectedTicket.id,
        senderUserId: user.id,
        senderRole: "super_admin",
        senderName: user.nama || "Super Admin AppBenk",
        message: replyText.trim(),
        updateTicketStatusTo: statusToSet,
      });

      toast.success("Balasan terkirim ke pelapor!");
      setReplyText("");

      // Refresh tiket dan pesan
      const updatedMessages = await customerServiceTicketService.getTicketMessages(selectedTicket.id);
      setMessages(updatedMessages);

      const all = await customerServiceTicketService.getAllTickets();
      const cleaned = all.filter(
        (t) =>
          t.id !== "cs-mock-1" &&
          !t.pesan?.includes("upload bukti pembayaran QRIS tapi status masih menunggu"),
      );
      setTickets(cleaned);
      const updatedSelected = cleaned.find((t) => t.id === selectedTicket.id);
      if (updatedSelected) setSelectedTicket(updatedSelected);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengirim balasan");
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: StatusCSTicket) => {
    if (!selectedTicket) return;
    try {
      await customerServiceTicketService.updateTicketStatus(selectedTicket.id, newStatus);
      toast.success(`Status tiket diubah menjadi ${newStatus}`);
      loadTickets();
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: any) {
      toast.error("Gagal mengubah status tiket");
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const bNama = getBengkelDisplay(t);
      const matchSearch =
        (t.ticket_number && t.ticket_number.toLowerCase().includes(search.toLowerCase())) ||
        t.subjek.toLowerCase().includes(search.toLowerCase()) ||
        t.user_name.toLowerCase().includes(search.toLowerCase()) ||
        (t.user_email && t.user_email.toLowerCase().includes(search.toLowerCase())) ||
        bNama.toLowerCase().includes(search.toLowerCase());

      const matchStatus = filterStatus === "semua" || t.status === filterStatus;
      const matchKategori = filterKategori === "semua" || t.kategori === filterKategori;
      const matchSenderRole =
        filterSenderRole === "semua" || normalizeRole(t.user_role) === filterSenderRole;

      return matchSearch && matchStatus && matchKategori && matchSenderRole;
    });
  }, [tickets, search, filterStatus, filterKategori, filterSenderRole]);

  const totalBaru = tickets.filter((t) => t.status === "Baru").length;
  const totalDiproses = tickets.filter((t) => t.status === "Diproses" || t.status === "Menunggu Balasan").length;
  const totalSelesai = tickets.filter((t) => t.status === "Selesai").length;

  const countAdmin = useMemo(
    () => tickets.filter((t) => normalizeRole(t.user_role) === "admin_bengkel").length,
    [tickets],
  );
  const countOwner = useMemo(
    () => tickets.filter((t) => normalizeRole(t.user_role) === "owner").length,
    [tickets],
  );
  const countPelanggan = useMemo(
    () => tickets.filter((t) => normalizeRole(t.user_role) === "pelanggan").length,
    [tickets],
  );

  return (
    <>
      <PageHeader
        title="Pusat Layanan Customer Service"
        description="Kelola dan tanggapi tiket kendala teknis, pertanyaan operasional, dan permintaan bantuan dari pelanggan, admin bengkel, serta pemilik bengkel di platform AppBenk."
        action={
          <Button variant="outline" size="sm" onClick={loadTickets} className="gap-2 text-xs">
            <RefreshCw className="size-3.5" /> Segarkan Data
          </Button>
        }
      />

      {/* STATS SUMMARY TILES */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-3.5">
          <p className="text-[11px] text-muted-foreground font-medium">Total Tiket Masuk</p>
          <p className="text-xl font-bold mt-1">{tickets.length}</p>
        </Card>
        <Card className="p-3.5 border-blue-500/20 bg-blue-500/5">
          <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Tiket Baru (Belum Ditangani)</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{totalBaru}</p>
        </Card>
        <Card className="p-3.5 border-amber-500/20 bg-amber-500/5">
          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Sedang Diproses / Respon</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{totalDiproses}</p>
        </Card>
        <Card className="p-3.5 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Tiket Terselesaikan</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{totalSelesai}</p>
        </Card>
      </div>

      {/* QUICK FILTER ROLE PENGIRIM */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-muted/40 rounded-xl border">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground px-2">Filter Pengirim:</span>
          <Button
            type="button"
            size="sm"
            variant={filterSenderRole === "semua" ? "default" : "ghost"}
            className="h-7 text-xs px-3 font-medium rounded-lg"
            onClick={() => setFilterSenderRole("semua")}
          >
            Semua Tiket ({tickets.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterSenderRole === "admin_bengkel" ? "default" : "ghost"}
            className={`h-7 text-xs px-3 font-medium rounded-lg ${
              filterSenderRole === "admin_bengkel"
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
            }`}
            onClick={() => setFilterSenderRole("admin_bengkel")}
          >
            Dari Admin Bengkel ({countAdmin})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterSenderRole === "owner" ? "default" : "ghost"}
            className={`h-7 text-xs px-3 font-medium rounded-lg ${
              filterSenderRole === "owner"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50"
            }`}
            onClick={() => setFilterSenderRole("owner")}
          >
            Dari Owner ({countOwner})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterSenderRole === "pelanggan" ? "default" : "ghost"}
            className={`h-7 text-xs px-3 font-medium rounded-lg ${
              filterSenderRole === "pelanggan"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
            }`}
            onClick={() => setFilterSenderRole("pelanggan")}
          >
            Dari Pelanggan ({countPelanggan})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor tiket, pelapor, bengkel, subjek..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="w-36 text-xs">
                  <SelectValue placeholder="Status Tiket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Status</SelectItem>
                  <SelectItem value="Baru">Baru</SelectItem>
                  <SelectItem value="Diproses">Diproses</SelectItem>
                  <SelectItem value="Menunggu Balasan">Menunggu Balasan</SelectItem>
                  <SelectItem value="Selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterKategori} onValueChange={(v) => setFilterKategori(v)}>
                <SelectTrigger className="w-36 text-xs">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Kategori</SelectItem>
                  <SelectItem value="Bug/Error">Bug / Error</SelectItem>
                  <SelectItem value="Pembayaran">Pembayaran</SelectItem>
                  <SelectItem value="Login">Login / Akun</SelectItem>
                  <SelectItem value="Booking">Booking Servis</SelectItem>
                  <SelectItem value="Maps">Google Maps</SelectItem>
                  <SelectItem value="Fitur">Fitur &amp; Layanan</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead className="font-semibold">No. Tiket & Subjek</TableHead>
                <TableHead className="font-semibold">Pelapor & Peran</TableHead>
                <TableHead className="font-semibold">Bengkel Terkait</TableHead>
                <TableHead className="font-semibold">Kategori</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Waktu Masuk</TableHead>
                <TableHead className="text-right font-semibold">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada tiket bantuan yang sesuai dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((t) => {
                  const roleStyle = ROLE_BADGE[normalizeRole(t.user_role)] || ROLE_BADGE.pelanggan;
                  const statusStyle = STATUS_BADGE[t.status] || STATUS_BADGE.Baru;

                  return (
                    <TableRow key={t.id} className="text-xs hover:bg-muted/30">
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-[11px] text-primary">
                            {t.ticket_number || "CS-0000"}
                          </span>
                          <p className="font-medium text-foreground line-clamp-1">{t.subjek}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground text-xs">{t.user_name}</p>
                          {t.user_email && (
                            <p className="text-[11px] text-muted-foreground font-normal">{t.user_email}</p>
                          )}
                          <div className="pt-0.5">
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 font-medium ${roleStyle.class}`}
                            >
                              {roleStyle.label}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="size-3 shrink-0" />
                          <span className="truncate max-w-[150px] font-medium text-foreground/90">
                            {getBengkelDisplay(t)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {t.kategori}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusStyle.class}`}>
                          {statusStyle.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {t.created_at
                          ? new Date(t.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={t.status === "Baru" ? "default" : "outline"}
                          className="h-7 px-2.5 text-xs gap-1.5"
                          onClick={() => openTicketDetail(t)}
                        >
                          <MessageSquare className="size-3" /> Tanggapi
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL PERCAKAPAN TIKET DUA ARAH */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedTicket && (
            <>
              {/* Header Tiket */}
              <div className="border-b p-4 pb-3 bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                        {selectedTicket.ticket_number || "CS-0000"}
                      </span>
                      <Badge variant="secondary" className="text-[11px]">
                        {selectedTicket.kategori}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          STATUS_BADGE[selectedTicket.status]?.class || STATUS_BADGE.Baru.class
                        }`}
                      >
                        {selectedTicket.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mt-1.5 text-foreground">{selectedTicket.subjek}</h3>
                  </div>

                  {/* Status Dropdown */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Ubah Status:</span>
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(v) => handleUpdateStatus(v as StatusCSTicket)}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baru">Baru</SelectItem>
                        <SelectItem value="Diproses">Diproses</SelectItem>
                        <SelectItem value="Menunggu Balasan">Menunggu Balasan</SelectItem>
                        <SelectItem value="Selesai">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    Pelapor: <strong className="text-foreground">{selectedTicket.user_name}</strong>
                    {selectedTicket.user_email && <span>({selectedTicket.user_email})</span>}
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 font-medium ml-1 ${
                        ROLE_BADGE[normalizeRole(selectedTicket.user_role)]?.class
                      }`}
                    >
                      {ROLE_BADGE[normalizeRole(selectedTicket.user_role)]?.label}
                    </Badge>
                  </span>
                  <span>•</span>
                  <span>
                    Bengkel Terkait: <strong className="text-foreground">{getBengkelDisplay(selectedTicket)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Dibuat:{" "}
                    {new Date(selectedTicket.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Chat Thread */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/30 max-h-[380px]"
              >
                {/* Pesan Awal Tiket */}
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">{selectedTicket.user_name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 font-medium ${
                        ROLE_BADGE[normalizeRole(selectedTicket.user_role)]?.class
                      }`}
                    >
                      {ROLE_BADGE[normalizeRole(selectedTicket.user_role)]?.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(selectedTicket.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-slate-900 border p-3 text-xs leading-relaxed text-foreground shadow-sm">
                    {selectedTicket.pesan}
                  </div>
                </div>

                {/* Percakapan Pesan Balasan */}
                {messages
                  .filter((m) => m.message !== selectedTicket.pesan || m.sender_role === "super_admin")
                  .map((m) => {
                    const isSuperAdmin = m.sender_role === "super_admin";

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isSuperAdmin ? "items-end" : "items-start"} max-w-[85%] ${
                          isSuperAdmin ? "ml-auto" : "mr-auto"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {!isSuperAdmin && (
                            <span className="text-xs font-semibold text-foreground">{m.sender_name}</span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 ${
                              isSuperAdmin
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : ""
                            }`}
                          >
                            {isSuperAdmin ? "Super Admin (Anda)" : m.sender_role}
                          </Badge>
                          {isSuperAdmin && (
                            <span className="text-xs font-semibold text-foreground">{m.sender_name}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                            isSuperAdmin
                              ? "rounded-tr-sm bg-primary text-primary-foreground font-normal"
                              : "rounded-tl-sm bg-white dark:bg-slate-900 border text-foreground"
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Input Form Balasan */}
              <div className="border-t p-3 bg-background space-y-2">
                <Textarea
                  placeholder="Ketik balasan untuk pelapor tiket ini..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  disabled={sendingReply}
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1"
                      disabled={sendingReply || !replyText.trim()}
                      onClick={() => handleSendReply("Menunggu Balasan")}
                    >
                      Balas & Minta Klarifikasi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700"
                      disabled={sendingReply || !replyText.trim()}
                      onClick={() => handleSendReply("Selesai")}
                    >
                      <CheckCircle2 className="size-3" /> Balas & Selesaikan
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5 px-3"
                    disabled={sendingReply || !replyText.trim()}
                    onClick={() => handleSendReply("Diproses")}
                  >
                    <Send className="size-3" /> {sendingReply ? "Mengirim..." : "Kirim Balasan"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

