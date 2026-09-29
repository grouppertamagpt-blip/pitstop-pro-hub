import { useEffect, useState, useRef, useMemo } from "react";
import {
  LifeBuoy,
  MessageSquare,
  Send,
  AlertTriangle,
  Phone,
  Clock,
  CheckCircle2,
  HelpCircle,
  Eye,
  RefreshCw,
  Building2,
  ShieldAlert,
  Code2,
  Share2,
  Instagram,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth, LABEL_ROLE } from "@/lib/auth";
import { useStore, tanggalPanjang } from "@/lib/store";
import { customerServiceTicketService } from "@/services/appbenk-service";
import type { CSTicketRow, CSMessageRow, StatusCSTicket } from "@/types/database";

function TikTokIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.95-4.57V8.58a8.28 8.28 0 0 0 4.82 1.56V6.69z" />
    </svg>
  );
}

const STATUS_BADGES: Record<string, { class: string; label: string }> = {
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
  Menunggu: {
    class: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold",
    label: "Menunggu",
  },
  Selesai: {
    class: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold",
    label: "Selesai",
  },
};

const KATEGORI_TIKET = [
  "Bug / Error Aplikasi",
  "Kendala Transaksi / Pembayaran Sistem",
  "Kendala Booking Servis",
  "Permintaan Fitur / Integrasi",
  "Pertanyaan Operasional",
  "Lainnya",
];

export function CustomerServicePage() {
  const { user } = useAuth();
  const { activeBengkel } = useStore();

  const isAdminOrOwner =
    user?.role === "admin" || user?.role === "owner" || user?.role === "admin_bengkel";

  const resolvedRole = useMemo(() => {
    if (!user) return "pelanggan";
    const r = (user.role || "").toLowerCase();
    if (r.includes("admin")) return "admin_bengkel";
    if (r.includes("owner")) return "owner";
    return "pelanggan";
  }, [user]);

  const activeRoleBadge = useMemo(() => {
    if (resolvedRole === "admin_bengkel") {
      return {
        label: "Admin Bengkel",
        class: "border-purple-300/80 bg-purple-100/70 text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
      };
    }
    if (resolvedRole === "owner") {
      return {
        label: "Owner Bengkel",
        class: "border-amber-300/80 bg-amber-100/70 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
      };
    }
    return {
      label: "Pelanggan",
      class: "border-blue-300/80 bg-blue-100/70 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    };
  }, [resolvedRole]);

  const isAnzar =
    (user?.email && user.email.toLowerCase().includes("anzar")) ||
    (user?.nama && user.nama.toLowerCase().includes("anzar")) ||
    user?.id === "usr-demo-1";

  const activeWorkshopName = isAnzar
    ? "Bengkel Fandi Motor"
    : activeBengkel?.nama || "Bengkel Fandi Motor";
  const activeWorkshopId = isAnzar
    ? "bengkel-2307"
    : activeBengkel?.id || "bengkel-2307";

  const activeUserName =
    user?.nama ||
    (isAnzar
      ? "Anzar Amanah"
      : user?.email
        ? user.email.split("@")[0]
        : resolvedRole === "pelanggan"
          ? "Pelanggan"
          : "Admin Bengkel");
  const activeUserEmail = user?.email || (isAnzar ? "anzaramanah@gmail.com" : "");

  const getTicketBengkel = (t?: CSTicketRow | null) => {
    if (!t) return "Bengkel Fandi Motor";
    if (
      (t.user_email && t.user_email.toLowerCase().includes("anzar")) ||
      (t.user_name && t.user_name.toLowerCase().includes("anzar")) ||
      t.bengkel_id === "bengkel-2307"
    ) {
      return "Bengkel Fandi Motor";
    }
    return t.bengkel_nama || "Bengkel Fandi Motor";
  };

  const kategoriList = KATEGORI_TIKET;

  const [form, setForm] = useState({ subjek: "", kategori: "", pesan: "" });
  const [err, setErr] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const [myTickets, setMyTickets] = useState<CSTicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Dialog Detail Tiket & Chat
  const [selectedTicket, setSelectedTicket] = useState<CSTicketRow | null>(null);
  const [messages, setMessages] = useState<CSMessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const loadMyTickets = async () => {
    if (!user) return;
    try {
      const tickets = await customerServiceTicketService.getMyTickets(
        user.id,
        user.email,
        activeWorkshopId,
      );
      const cleaned = tickets.filter(
        (t) =>
          t.id !== "cs-mock-1" &&
          !t.pesan?.includes("upload bukti pembayaran QRIS tapi status masih menunggu"),
      );
      setMyTickets(cleaned);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadMyTickets();
  }, [user, activeWorkshopId]);

  const openTicketDetail = async (ticket: CSTicketRow) => {
    setSelectedTicket(ticket);
    setReplyText("");
    setLoadingMessages(true);
    try {
      const msgs = await customerServiceTicketService.getTicketMessages(ticket.id);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKirimPesan = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof err = {};
    if (!form.subjek.trim()) next.subjek = "Subjek wajib diisi.";
    if (!form.kategori) next.kategori = "Pilih tipe kendala.";
    if (!form.pesan.trim()) next.pesan = "Pesan wajib diisi.";
    setErr(next);
    if (Object.keys(next).length > 0) return;

    if (!user) {
      toast.error("Silakan login terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await customerServiceTicketService.createTicket({
        userId: user.id,
        userName: activeUserName,
        userEmail: activeUserEmail,
        userRole: resolvedRole,
        bengkelId: activeWorkshopId,
        bengkelNama: activeWorkshopName,
        subjek: form.subjek.trim(),
        kategori: form.kategori,
        pesan: form.pesan.trim(),
      });

      // Update state instan agar langsung muncul di "Tiket Saya" tanpa delay
      setMyTickets((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);

      toast.success(
        `Laporan kendala berhasil dikirim ke Tim Pengembang — Tiket ${created.ticket_number || "CS-Baru"}`
      );
      setForm({ subjek: "", kategori: "", pesan: "" });
      await loadMyTickets();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengirim tiket bantuan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!selectedTicket || !replyText.trim() || !user) return;

    setSendingReply(true);
    try {
      await customerServiceTicketService.sendMessage({
        ticketId: selectedTicket.id,
        senderUserId: user.id,
        senderRole: user.role as any,
        senderName: user.nama || "Pengguna",
        message: replyText.trim(),
        updateTicketStatusTo: "Diproses",
      });

      toast.success("Balasan terkirim ke tim AppBenk!");
      setReplyText("");

      const updatedMsgs = await customerServiceTicketService.getTicketMessages(selectedTicket.id);
      setMessages(updatedMsgs);
      loadMyTickets();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengirim pesan.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Hubungi Pengembang AppBenk (Developer Support)"
        description="Sampaikan kendala teknis sistem, bug aplikasi, atau pertanyaan integrasi langsung ke Tim Pengembang Platform AppBenk."
        action={
          <Button variant="outline" size="sm" onClick={loadMyTickets} className="gap-2 text-xs">
            <RefreshCw className="size-3.5" /> Segarkan
          </Button>
        }
      />

      {/* BANNER KONTEKS SESI PELAPOR & BENGKEL AKTIF */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-200/80 bg-purple-50/70 p-3.5 text-xs dark:border-purple-900/60 dark:bg-purple-950/30">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-muted-foreground">Sesi Pelapor:</span>
          <strong className="text-foreground">
            {activeUserName} {activeUserEmail && `(${activeUserEmail})`}
          </strong>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">Peran:</span>
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${activeRoleBadge.class}`}>
            {activeRoleBadge.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-foreground bg-background/80 dark:bg-muted/60 px-2.5 py-1 rounded border">
          <Building2 className="size-3.5 text-primary shrink-0" />
          <span>Bengkel Terkait: <strong>{activeWorkshopName}</strong></span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kanal Bantuan Pengembang</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {/* Hotline Pengembang AppBenk */}
              <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/10">
                <Phone className="mt-0.5 size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-semibold text-foreground">Hotline Pengembang AppBenk</p>
                  <p className="text-xs text-muted-foreground">
                    +62 823-2552-6299 · Senin–Sabtu, 08.00–17.00 WIB
                  </p>
                  <a
                    href="https://wa.me/6282325526299"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 pt-0.5"
                  >
                    <MessageCircle className="size-3.5" />
                    Chat WhatsApp Langsung (+62 823-2552-6299)
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>

              {/* Tiket Kendala Sistem & Bug */}
              <div className="flex items-start gap-3 rounded-md border p-3">
                <MessageSquare className="mt-0.5 size-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Tiket Kendala Sistem & Bug</p>
                  <p className="text-xs text-muted-foreground">
                    Sampaikan laporan teknis & bug sistem langsung ke Tim Pengembang Platform AppBenk
                  </p>
                </div>
              </div>

              {/* Dukungan Integrasi & Gateway */}
              <div className="flex items-start gap-3 rounded-md border p-3">
                <Code2 className="mt-0.5 size-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Dukungan Integrasi & Gateway</p>
                  <p className="text-xs text-muted-foreground">
                    Bantuan integrasi QRIS Midtrans, WhatsApp Bot, & printer thermal
                  </p>
                </div>
              </div>

              {/* Akun Sosial Media Resmi */}
              <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/10">
                <Share2 className="mt-0.5 size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <p className="text-sm font-semibold text-foreground">Akun Sosial Media Resmi</p>
                  <p className="text-xs text-muted-foreground">
                    Ikuti rilis update, panduan operasional, & berita terbaru AppBenk:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <a
                      href="https://instagram.com/group_pertamagpt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-pink-200 bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-700 hover:bg-pink-100 transition-colors dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-300"
                    >
                      <Instagram className="size-3.5 text-pink-600" />
                      @group_pertamagpt
                      <ExternalLink className="size-2.5 opacity-70" />
                    </a>
                    <a
                      href="https://www.tiktok.com/@Group_perTama.GPT"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-200 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <TikTokIcon className="size-3.5 text-black dark:text-white" />
                      @Group_perTama.GPT
                      <ExternalLink className="size-2.5 opacity-70" />
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kirim Tiket ke Pengembang</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleKirimPesan} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Subjek Kendala</Label>
                  <Input
                    value={form.subjek}
                    maxLength={100}
                    onChange={(e) => setForm({ ...form, subjek: e.target.value })}
                    placeholder="Contoh: Bug sinkronisasi stok / error integrasi QRIS"
                  />
                  {err.subjek && <p className="text-xs text-destructive">{err.subjek}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Tipe Kendala</Label>
                  <Select
                    value={form.kategori}
                    onValueChange={(v) => setForm({ ...form, kategori: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe kendala sistem" />
                    </SelectTrigger>
                    <SelectContent>
                      {kategoriList.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err.kategori && <p className="text-xs text-destructive">{err.kategori}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Deskripsi / Detail Kendala</Label>
                  <Textarea
                    rows={4}
                    maxLength={1000}
                    value={form.pesan}
                    onChange={(e) => setForm({ ...form, pesan: e.target.value })}
                    placeholder="Jelaskan secara detail kendala yang dialami, langkah yang dilakukan, atau pesan error yang muncul..."
                  />
                  {err.pesan && <p className="text-xs text-destructive">{err.pesan}</p>}
                </div>

                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  <Send className="size-4" />{" "}
                  {submitting ? "Mengirim ke Tim Pengembang..." : "Kirim ke Tim Pengembang"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* TIKET SAYA */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tiket Saya</CardTitle>
            <Badge variant="outline" className="text-xs">
              {myTickets.length} Tiket
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[680px]">
            {loadingTickets ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Memuat riwayat tiket...
              </div>
            ) : myTickets.length === 0 ? (
              <EmptyState
                title="Belum ada tiket bantuan"
                description="Tiket bantuan yang Anda kirim akan tersimpan di sini dan langsung ditinjau oleh tim pengelola AppBenk."
              />
            ) : (
              myTickets.map((t) => {
                const badgeInfo = STATUS_BADGES[t.status] || STATUS_BADGES.Baru;
                return (
                  <div
                    key={t.id}
                    onClick={() => openTicketDetail(t)}
                    className="cursor-pointer space-y-2 rounded-lg border p-3.5 transition-colors hover:border-primary/50 hover:bg-muted/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                          {t.ticket_number || "CS-0000"}
                        </span>
                        <p className="text-sm font-semibold line-clamp-1">{t.subjek}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 font-medium ${
                            t.user_role === "admin_bengkel" || t.user_role === "admin"
                              ? "border-purple-300/80 bg-purple-100/70 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                              : t.user_role === "owner"
                                ? "border-amber-300/80 bg-amber-100/70 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                : "border-blue-300/80 bg-blue-100/70 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          }`}
                        >
                          {t.user_role === "admin_bengkel" || t.user_role === "admin"
                            ? "Admin Bengkel"
                            : t.user_role === "owner"
                              ? "Owner Bengkel"
                              : "Pelanggan"}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${badgeInfo.class}`}>
                          {badgeInfo.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{t.kategori}</span>
                      <div className="flex items-center gap-2">
                        {getTicketBengkel(t) && (
                          <span className="flex items-center gap-1 font-medium text-foreground/80">
                            <Building2 className="size-3 text-primary" /> {getTicketBengkel(t)}
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {t.created_at
                            ? new Date(t.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-foreground/80 line-clamp-2 bg-muted/20 p-2 rounded">
                      {t.pesan}
                    </p>

                    <div className="flex items-center justify-end pt-1">
                      <span className="text-[11px] font-medium text-primary flex items-center gap-1 hover:underline">
                        Lihat Percakapan <Eye className="size-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL DETAIL TIKET & CHAT UNTUK PENGGUNA */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {selectedTicket && (
            <>
              <div className="border-b p-4 pb-3 bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                      {selectedTicket.ticket_number || "CS-0000"}
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      {selectedTicket.kategori}
                    </Badge>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      STATUS_BADGES[selectedTicket.status]?.class || STATUS_BADGES.Baru.class
                    }`}
                  >
                    {selectedTicket.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mt-2 text-foreground">{selectedTicket.subjek}</h3>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                  <span>
                    Pelapor: <strong className="text-foreground">{selectedTicket.user_name}</strong>
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 font-medium ${
                      selectedTicket.user_role === "admin_bengkel" || selectedTicket.user_role === "admin"
                        ? "border-purple-300/80 bg-purple-100/70 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                        : selectedTicket.user_role === "owner"
                          ? "border-amber-300/80 bg-amber-100/70 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "border-blue-300/80 bg-blue-100/70 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                    }`}
                  >
                    {selectedTicket.user_role === "admin_bengkel" || selectedTicket.user_role === "admin"
                      ? "Admin Bengkel"
                      : selectedTicket.user_role === "owner"
                        ? "Owner Bengkel"
                        : "Pelanggan"}
                  </Badge>
                  <span>•</span>
                  <span>Bengkel: <strong className="text-foreground">{getTicketBengkel(selectedTicket)}</strong></span>
                  <span>•</span>
                  <span>
                    {new Date(selectedTicket.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Chat Thread */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/30 max-h-[360px]"
              >
                {/* Pesan Awal */}
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">Anda</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(selectedTicket.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-primary/10 text-foreground border border-primary/20 p-3 text-xs leading-relaxed shadow-sm">
                    {selectedTicket.pesan}
                  </div>
                </div>

                {/* Riwayat Balasan */}
                {messages
                  .filter((m) => m.message !== selectedTicket.pesan)
                  .map((m) => {
                    const isMe = m.sender_user_id === user?.id;
                    const isSuperAdmin = m.sender_role === "super_admin";

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? "items-start" : "items-end"} max-w-[85%] ${
                          isMe ? "mr-auto" : "ml-auto"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {!isMe && (
                            <span className="text-xs font-semibold text-foreground">
                              {isSuperAdmin ? "Tim CS AppBenk" : m.sender_name}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 ${
                              isSuperAdmin
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : ""
                            }`}
                          >
                            {isSuperAdmin ? "Super Admin" : isMe ? "Anda" : m.sender_role}
                          </Badge>
                          {isMe && <span className="text-xs font-semibold text-foreground">Anda</span>}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? "rounded-tl-sm bg-primary/10 border border-primary/20 text-foreground"
                              : "rounded-tr-sm bg-white dark:bg-slate-900 border text-foreground"
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Form Balas */}
              <div className="border-t p-3 bg-background space-y-2">
                <Textarea
                  placeholder="Ketik pesan tambahan atau respon untuk CS AppBenk..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                  disabled={sendingReply}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5 px-3"
                    disabled={sendingReply || !replyText.trim()}
                    onClick={handleSendFollowUp}
                  >
                    <Send className="size-3" /> {sendingReply ? "Mengirim..." : "Kirim Respon"}
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
