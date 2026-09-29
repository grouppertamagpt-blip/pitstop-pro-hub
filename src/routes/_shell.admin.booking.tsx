import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Check, X, Eye, Inbox, RefreshCw, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { BookingBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { useStore, tanggalPanjang, type Booking, type StatusBooking } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { notifikasiEvent } from "@/lib/whatsapp";

const STATUS: StatusBooking[] = ["Menunggu Konfirmasi", "Diterima", "Ditolak"];

export const Route = createFileRoute("/_shell/admin/booking")({
  head: () => ({
    meta: [
      { title: "Booking Masuk — AppBenk" },
      {
        name: "description",
        content:
          "Kelola booking servis dari pelanggan: lihat detail, terima, tolak dengan alasan, dan tugaskan mekanik.",
      },
      { property: "og:title", content: "Booking Masuk — AppBenk" },
      { property: "og:description", content: "Konfirmasi booking pelanggan dengan cepat." },
    ],
  }),
  component: BookingAdmin,
});

function BookingAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const bengkelAktifId = user?.bengkelId || "bengkel-001";
  const { booking, mekanik, pelanggan, ubahStatusBooking, tugaskanMekanikBooking, aturEstimasiBooking, refreshBooking } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"semua" | StatusBooking>("semua");
  const [detail, setDetail] = useState<Booking | null>(null);
  const [tolak, setTolak] = useState<Booking | null>(null);
  const [alasan, setAlasan] = useState("");
  const [errAlasan, setErrAlasan] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const terimaBooking = (b: Booking) => {
    ubahStatusBooking(b.id, "Diterima");
    toast.success(`Booking ${b.nomor} diterima — otomatis masuk ke Operasional Servis`, {
      action: {
        label: "Buka Servis",
        onClick: () => navigate({ to: "/admin/servis" }),
      },
    });

    const targetPelanggan = pelanggan.find(
      (p) => (b.customerId && p.id === b.customerId) || p.nama.toLowerCase() === b.pelanggan.toLowerCase(),
    );
    if (targetPelanggan?.telepon) {
      notifikasiEvent("booking_confirmed", targetPelanggan.telepon, {
        namaPelanggan: b.pelanggan,
        namaKendaraan: b.kendaraan,
        platNomor: b.plat,
        namaBengkel: "AppBenk",
        tanggalBooking: `${tanggalPanjang(b.tanggal)} (${b.waktu})`,
      }).catch(() => {});
    }
  };

  useEffect(() => {
    refreshBooking().catch(() => {});

    const handleSync = () => {
      refreshBooking().catch(() => {});
    };

    window.addEventListener("appbenk_booking_updated", handleSync);

    const interval = setInterval(handleSync, 8000);
    return () => {
      window.removeEventListener("appbenk_booking_updated", handleSync);
      clearInterval(interval);
    };
  }, [refreshBooking]);

  const mekanikBengkelAktif = useMemo(() => {
    return mekanik.filter((m) => m.bengkelId === bengkelAktifId && m.status === "Aktif");
  }, [mekanik, bengkelAktifId]);

  const data = useMemo(() => {
    const s = q.toLowerCase();
    return booking
      .filter((b) => !b.bengkelId || b.bengkelId === bengkelAktifId)
      .filter((b) => filter === "semua" || b.status === filter)
      .filter((b) =>
        [b.nomor, b.pelanggan, b.kendaraan, b.plat, b.jenis].some((v) =>
          v.toLowerCase().includes(s),
        ),
      );
  }, [booking, q, filter, bengkelAktifId]);

  const bukaTolak = (b: Booking) => {
    setTolak(b);
    setAlasan(b.alasanTolak ?? "");
    setErrAlasan("");
  };

  const konfirmasiTolak = () => {
    if (!tolak) return;
    const alasanTrimmed = alasan.trim();
    if (!alasanTrimmed) {
      setErrAlasan("Alasan penolakan wajib diisi.");
      return;
    }
    ubahStatusBooking(tolak.id, "Ditolak", alasanTrimmed);
    if (detail?.id === tolak.id)
      setDetail({ ...detail, status: "Ditolak", alasanTolak: alasanTrimmed });
    toast.info(`Booking ${tolak.nomor} ditolak`);

    const targetPelanggan = pelanggan.find(
      (p) => (tolak.customerId && p.id === tolak.customerId) || p.nama.toLowerCase() === tolak.pelanggan.toLowerCase(),
    );
    if (targetPelanggan?.telepon) {
      notifikasiEvent("booking_rejected", targetPelanggan.telepon, {
        namaPelanggan: tolak.pelanggan,
        namaKendaraan: tolak.kendaraan,
        platNomor: tolak.plat,
        namaBengkel: "AppBenk",
        tanggalBooking: `${tanggalPanjang(tolak.tanggal)} (${tolak.waktu})`,
        alasanPenolakan: alasanTrimmed,
      }).catch(() => {});
    }

    setTolak(null);
    setAlasan("");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBooking();
      toast.success("Daftar booking berhasil diperbarui");
    } catch {
      toast.error("Gagal menyegarkan data booking");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Booking Masuk"
        description="Konfirmasi permintaan booking servis dari pelanggan."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar
              value={q}
              onChange={setQ}
              placeholder="Cari nomor booking, pelanggan, atau plat..."
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-52 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua status</SelectItem>
                {STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-8" />}
              title="Tidak ada booking"
              description="Coba ubah filter atau kata kunci."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Booking</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead>Jenis Servis</TableHead>
                    <TableHead>Mekanik Diinginkan</TableHead>
                    <TableHead>Jadwal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.nomor}</TableCell>
                      <TableCell>{b.pelanggan}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.kendaraan} · {b.plat}
                      </TableCell>
                      <TableCell>{b.jenis}</TableCell>
                      <TableCell className={b.mekanikDiinginkan ? "" : "text-muted-foreground"}>
                        {b.mekanikDiinginkan || "Tidak ada preferensi"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {tanggalPanjang(b.tanggal)} · {b.waktu}
                      </TableCell>
                      <TableCell>
                        <BookingBadge status={b.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Detail"
                            onClick={() => setDetail(b)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Terima booking"
                            disabled={b.status === "Diterima"}
                            onClick={() => terimaBooking(b)}
                          >
                            <Check className="size-4 text-success" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Tolak booking"
                            disabled={b.status === "Ditolak"}
                            onClick={() => bukaTolak(b)}
                          >
                            <X className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detail Booking {detail?.nomor}</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="space-y-4 px-4 pb-6 text-sm">
              {[
                ["Pelanggan", detail.pelanggan],
                ["Kendaraan", `${detail.kendaraan} · ${detail.plat}`],
                ["Jenis Servis", detail.jenis],
                ["Keluhan", detail.keluhan],
                ["Tanggal", tanggalPanjang(detail.tanggal)],
                ["Waktu", detail.waktu],
                ["Mekanik yang Diinginkan", detail.mekanikDiinginkan || "Tidak ada preferensi"],
                ["Mekanik Ditugaskan", detail.mekanikDitugaskan || "Belum ditentukan"],
                ["Catatan", detail.catatan || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
                  <p className="mt-0.5">{v}</p>
                </div>
              ))}

              {detail.status === "Ditolak" && detail.alasanTolak && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Alasan Penolakan
                  </p>
                  <p className="mt-1 text-sm">{detail.alasanTolak}</p>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  Tugaskan Mekanik (Penugasan Resmi Bengkel)
                </p>
                <Select
                  value={detail.mekanikDitugaskan ?? ""}
                  onValueChange={(v) => {
                    tugaskanMekanikBooking(detail.id, v);
                    setDetail({ ...detail, mekanikDitugaskan: v });
                    toast.success(`Mekanik ${v} ditugaskan`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih mekanik bengkel" />
                  </SelectTrigger>
                  <SelectContent>
                    {mekanikBengkelAktif.length === 0 ? (
                      <SelectItem value="_empty" disabled>
                        Tidak ada mekanik aktif di bengkel ini
                      </SelectItem>
                    ) : (
                      mekanikBengkelAktif.map((m) => (
                        <SelectItem key={m.id} value={m.nama}>
                          {m.nama} — {m.spesialisasi}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {detail.mekanikDiinginkan &&
                  detail.mekanikDitugaskan &&
                  detail.mekanikDiinginkan !== detail.mekanikDitugaskan && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      ℹ️ Mekanik yang ditugaskan berbeda dengan preferensi awal pelanggan ({detail.mekanikDiinginkan}).
                    </p>
                  )}
              </div>

              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  Ubah Status
                </p>
                <Select
                  value={detail.status}
                  onValueChange={(v) => {
                    const status = v as StatusBooking;
                    if (status === "Ditolak") {
                      bukaTolak(detail);
                      return;
                    }
                    ubahStatusBooking(detail.id, status);
                    setDetail({ ...detail, status });
                    toast.success(
                      status === "Diterima"
                        ? `Booking ${detail.nomor} diterima — otomatis masuk ke Operasional Servis`
                        : `Status booking diperbarui: ${status}`,
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {detail.status === "Diterima" && (
                <div>
                  <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    Estimasi Selesai Pengerjaan
                  </p>
                  <Input
                    type="datetime-local"
                    value={detail.estimasiSelesai ?? ""}
                    onChange={(e) => {
                      aturEstimasiBooking(detail.id, e.target.value);
                      setDetail({ ...detail, estimasiSelesai: e.target.value });
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Estimasi ini langsung terlihat pada status booking pelanggan.
                  </p>
                </div>
              )}

              {detail.status !== "Diterima" && detail.status !== "Ditolak" && (
                <div className="pt-2">
                  <Button
                    type="button"
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={() => {
                      terimaBooking(detail);
                      setDetail({ ...detail, status: "Diterima" });
                    }}
                  >
                    <Check className="size-4" /> Terima Booking Masuk
                  </Button>
                </div>
              )}

              {detail.status === "Diterima" && (
                <div className="pt-2">
                  <Button asChild className="w-full gap-2 bg-primary text-primary-foreground font-semibold">
                    <Link to="/admin/servis">
                      <Wrench className="size-4" /> Buka di Operasional Servis
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!tolak} onOpenChange={(v) => !v && setTolak(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tolak Permintaan Booking</DialogTitle>
            <DialogDescription>
              Berikan alasan agar pelanggan memahami penolakan ini.
            </DialogDescription>
          </DialogHeader>
          {tolak && (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-2">
                {[
                  ["Pelanggan", tolak.pelanggan],
                  ["Kendaraan", `${tolak.kendaraan} · ${tolak.plat}`],
                  ["Tanggal", tanggalPanjang(tolak.tanggal)],
                  ["Waktu", tolak.waktu],
                  ["Jenis Servis", tolak.jenis],
                  ["Keluhan", tolak.keluhan || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
                    <p>{v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Alasan Penolakan</Label>
                <Textarea
                  rows={4}
                  maxLength={500}
                  value={alasan}
                  onChange={(e) => {
                    setAlasan(e.target.value);
                    if (e.target.value.trim()) setErrAlasan("");
                  }}
                  placeholder="Masukkan alasan mengapa booking ini ditolak..."
                />
                {errAlasan && <p className="text-xs text-destructive">{errAlasan}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTolak(null)}>
              Batal
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={konfirmasiTolak}
            >
              Konfirmasi Penolakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
