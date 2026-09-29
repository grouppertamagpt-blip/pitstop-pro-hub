import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Wrench,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Eye,
  Clock,
  Image as ImageIcon,
  Maximize2,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/number-input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import {
  useStore,
  rupiah,
  tanggalPanjang,
  totalItem,
  JENIS_SERVIS,
  URUTAN_STATUS,
  type Servis,
  type StatusServis,
  type ItemPart,
} from "@/lib/store";

export const Route = createFileRoute("/_shell/admin/servis")({
  validateSearch: (search: Record<string, unknown>): { trx?: string } =>
    typeof search["trx"] === "string" ? { trx: search["trx"] } : {},
  head: () => ({
    meta: [
      { title: "Operasional Servis — AppBenk" },
      {
        name: "description",
        content:
          "Kelola proses servis: mekanik, sparepart, estimasi biaya, dan pembaruan status pengerjaan.",
      },
      { property: "og:title", content: "Operasional Servis — AppBenk" },
      {
        property: "og:description",
        content: "Kendalikan seluruh proses pengerjaan servis bengkel.",
      },
    ],
  }),
  component: ServisAdmin,
});

function toDateTimeLocal(isoStr?: string | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

const kosong = {
  pelanggan: "",
  telepon: "",
  kendaraan: "",
  plat: "",
  jenis: JENIS_SERVIS[0]!,
  keluhan: "",
  pekerjaan: "",
  mekanik: "Andi",
  tanggal: new Date().toISOString().slice(0, 10),
  status: "Menunggu" as StatusServis,
  catatan: "",
  biayaJasa: 0,
  items: [] as ItemPart[],
  estimasiSelesai: "",
  estimasiWaktu: "45 - 60 Menit",
};

function ServisAdmin() {
  const { user } = useAuth();
  const { trx } = Route.useSearch();
  const bengkelAktifId = user?.bengkelId || "bengkel-001";
  const {
    servis,
    pelanggan,
    sparepart,
    mekanik,
    simpanServis,
    hapusServis,
    ubahStatusServis,
    refreshServis,
    refreshMekanik,
    pembayaran,
    verifikasiPembayaran,
  } = useStore();

  useEffect(() => {
    refreshServis?.();
    refreshMekanik?.();

    const handleSync = () => {
      refreshServis?.();
      refreshMekanik?.();
    };

    window.addEventListener("appbenk_servis_updated", handleSync);
    window.addEventListener("appbenk_pembayaran_updated", handleSync);
    window.addEventListener("appbenk_sparepart_updated", handleSync);

    const interval = setInterval(handleSync, 12000);

    return () => {
      window.removeEventListener("appbenk_servis_updated", handleSync);
      window.removeEventListener("appbenk_pembayaran_updated", handleSync);
      window.removeEventListener("appbenk_sparepart_updated", handleSync);
      clearInterval(interval);
    };
  }, [refreshServis, refreshMekanik]);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"semua" | StatusServis>("semua");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Servis | null>(null);
  const [form, setForm] = useState(kosong);
  const [modePelanggan, setModePelanggan] = useState<"pilih" | "manual">("pilih");
  const [hapus, setHapus] = useState<Servis | null>(null);
  const [pilihPart, setPilihPart] = useState("");
  const [loadingSimpan, setLoadingSimpan] = useState(false);

  // Modal Verifikasi Pembayaran
  const [verifModalOpen, setVerifModalOpen] = useState(false);
  const [verifServis, setVerifServis] = useState<Servis | null>(null);
  const [alasanTolak, setAlasanTolak] = useState("");
  const [modeTolak, setModeTolak] = useState(false);
  const [zoomBukti, setZoomBukti] = useState(false);

  const bukaVerifikasiModal = (s: Servis) => {
    setVerifServis(s);
    setAlasanTolak("");
    setModeTolak(false);
    setZoomBukti(false);
    setVerifModalOpen(true);
  };

  useEffect(() => {
    if (trx) {
      const target = servis.find((s) => s.noTransaksi === trx || s.nomor === trx || s.id === trx);
      if (target) {
        setQ(target.noTransaksi);
        bukaVerifikasiModal(target);
      }
    }
  }, [trx, servis]);

  // Mekanik aktif bengkel ini, tetap menyertakan mekanik historis jika sedang edit servis lama
  const mekanikOpsi = useMemo(() => {
    const aktif = mekanik.filter((m) => m.bengkelId === bengkelAktifId && m.status === "Aktif");
    if (edit && edit.mekanik && !aktif.some((m) => m.nama === edit.mekanik)) {
      return [
        { id: "hist", nama: edit.mekanik, spesialisasi: "Historis", status: "Tidak Aktif" as const },
        ...aktif,
      ];
    }
    return aktif;
  }, [mekanik, bengkelAktifId, edit]);

  const data = useMemo(() => {
    const s = q.toLowerCase();
    return servis
      .filter((x) => !x.bengkelId || x.bengkelId === bengkelAktifId)
      .filter((x) => filter === "semua" || x.status === filter)
      .filter((x) =>
        [x.nomor, x.pelanggan, x.kendaraan, x.plat, x.mekanik].some((v) =>
          v.toLowerCase().includes(s),
        ),
      );
  }, [servis, q, filter, bengkelAktifId]);

  const bukaBaru = () => {
    setEdit(null);
    setForm({
      ...kosong,
      mekanik: mekanikOpsi[0]?.nama || "Andi",
      tanggal: new Date().toISOString().slice(0, 10),
      estimasiSelesai: "",
      estimasiWaktu: "45 - 60 Menit",
    });
    setModePelanggan(pelanggan.length > 0 ? "pilih" : "manual");
    setOpen(true);
  };

  const bukaEdit = (s: Servis) => {
    setEdit(s);
    const p = pelanggan.find(
      (x) => x.nama.trim().toLowerCase() === s.pelanggan.trim().toLowerCase(),
    );
    setForm({
      pelanggan: p?.nama || s.pelanggan,
      telepon: p?.telepon ?? "",
      kendaraan: s.kendaraan || p?.kendaraan || "",
      plat: s.plat || p?.plat || "",
      jenis: s.jenis,
      keluhan: s.keluhan,
      pekerjaan: s.pekerjaan,
      mekanik: s.mekanik,
      tanggal: s.tanggal,
      status: s.status,
      catatan: s.catatan,
      biayaJasa: s.biayaJasa,
      items: s.items.map((i) => ({ ...i })),
      estimasiSelesai: toDateTimeLocal(s.estimasiSelesai),
      estimasiWaktu: s.estimasiWaktu || (s as any).estimasiDurasi || "45 - 60 Menit",
    });
    setModePelanggan(p ? "pilih" : "manual");
    setPilihPart("");
    setOpen(true);
  };

  const totalPart = totalItem(form.items);

  const tambahPart = (id: string) => {
    const sp = sparepart.find((x) => x.id === id);
    if (!sp) return;
    setForm((f) => {
      const ada = f.items.find((i) => i.sparepartId === id);
      if (ada) {
        return {
          ...f,
          items: f.items.map((i) => (i.sparepartId === id ? { ...i, jumlah: i.jumlah + 1 } : i)),
        };
      }
      return {
        ...f,
        items: [
          ...f.items,
          { sparepartId: sp.id, kode: sp.kode, nama: sp.nama, harga: sp.harga, jumlah: 1 },
        ],
      };
    });
    setPilihPart("");
  };

  const ubahJumlah = (id: string, jumlah: number) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((i) =>
        i.sparepartId === id ? { ...i, jumlah: Math.max(1, jumlah || 1) } : i,
      ),
    }));

  const hapusPart = (id: string) =>
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.sparepartId !== id) }));

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pelanggan.trim() || !form.kendaraan.trim() || !form.keluhan.trim()) {
      toast.error("Pelanggan, kendaraan, dan keluhan wajib diisi.");
      return;
    }
    setLoadingSimpan(true);
    try {
      const estimasiSelesaiIso = form.estimasiSelesai
        ? new Date(form.estimasiSelesai).toISOString()
        : undefined;

      await simpanServis(
        edit
          ? {
              ...form,
              id: edit.id,
              nomor: edit.nomor,
              bengkelId: edit.bengkelId || bengkelAktifId,
              bookingId: edit.bookingId,
              estimasiSelesai: estimasiSelesaiIso,
              estimasiWaktu: form.estimasiWaktu,
              estimasiDurasi: form.estimasiWaktu,
            }
          : {
              ...form,
              bengkelId: bengkelAktifId,
              estimasiSelesai: estimasiSelesaiIso,
              estimasiWaktu: form.estimasiWaktu,
              estimasiDurasi: form.estimasiWaktu,
            },
      );
      toast.success(edit ? "Data servis berhasil diperbarui" : "Servis baru berhasil dibuat");
      setOpen(false);
    } catch (err: any) {
      console.error("Gagal simpan servis:", err);
      toast.error("Gagal menyimpan data servis: " + (err?.message || "Terjadi kesalahan"));
    } finally {
      setLoadingSimpan(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Operasional Servis"
        description="Catat, kerjakan, dan perbarui status servis kendaraan."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                refreshServis?.();
                refreshMekanik?.();
                toast.success("Data operasional servis diperbarui dari Supabase");
              }}
              className="gap-2"
            >
              <RefreshCw className="size-4" /> Segarkan
            </Button>
            <Button onClick={bukaBaru} className="gap-2">
              <Plus className="size-4" /> Servis Baru
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar
              value={q}
              onChange={setQ}
              placeholder="Cari nomor servis, pelanggan, atau mekanik..."
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-56 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua status</SelectItem>
                {URUTAN_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data.length === 0 ? (
            <EmptyState
              icon={<Wrench className="size-8" />}
              title="Belum ada servis"
              description="Tambahkan servis baru untuk memulai."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Servis</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead>Keluhan</TableHead>
                    <TableHead>Mekanik</TableHead>
                    <TableHead>Sparepart</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-52">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((s) => {
                    const pmb = pembayaran.find(
                      (p) => p.servisId === s.id || p.noTransaksi === s.noTransaksi,
                    );
                    const isCashMethod = (pmb?.metode === "Cash" || s.metodeBayar === "Cash");
                    const isPending = pmb?.status === "Menunggu Verifikasi";
                    const isTarget = trx && (s.noTransaksi === trx || s.nomor === trx || s.id === trx);

                    return (
                      <TableRow
                        key={s.id}
                        className={isTarget ? "bg-amber-500/10 border-l-4 border-l-amber-500" : undefined}
                      >
                        <TableCell className="font-medium">
                          {s.nomor}
                          <span className="block text-xs text-muted-foreground">
                            {tanggalPanjang(s.tanggal)}
                          </span>
                          {s.estimasiSelesai && (
                            <span className="block text-[11px] text-primary font-normal">
                              Target: {new Date(s.estimasiSelesai).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}, {new Date(s.estimasiSelesai).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":")} WIB
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{s.pelanggan}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.kendaraan} · {s.plat}
                        </TableCell>
                        <TableCell className="max-w-40 truncate">{s.keluhan}</TableCell>
                        <TableCell>{s.mekanik}</TableCell>
                        <TableCell className="max-w-40 truncate text-muted-foreground">
                          {s.sparepart || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {rupiah(s.total)}
                          <span className="block text-xs text-muted-foreground">
                            Jasa {rupiah(s.biayaJasa)} · Part {rupiah(s.biayaPart)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={s.status}
                            onValueChange={(v) => {
                              ubahStatusServis(s.id, v as StatusServis);
                              toast.success(`Status ${s.nomor}: ${v}`);
                            }}
                          >
                            <SelectTrigger className="h-8 w-48 bg-card text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {URUTAN_STATUS.map((st) => (
                                <SelectItem key={st} value={st}>
                                  {st}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={s.status} />
                            {isPending && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => bukaVerifikasiModal(s)}
                                className={`h-5 px-1.5 text-[10px] font-bold animate-pulse gap-1 ${
                                  isCashMethod
                                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
                                    : "border-amber-500/50 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
                                }`}
                              >
                                {isCashMethod ? (
                                  <>
                                    <Banknote className="size-3" /> Kasir (Cash) Menunggu
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="size-3" /> Bukti QRIS Menunggu
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {pmb && (
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Verifikasi Pembayaran"
                                title={
                                  isPending
                                    ? isCashMethod
                                      ? "Terima Pembayaran Kasir (Cash)"
                                      : "Periksa Bukti Pembayaran QRIS / Transfer"
                                    : "Lihat Status Pembayaran"
                                }
                                onClick={() => bukaVerifikasiModal(s)}
                                className={
                                  isPending
                                    ? isCashMethod
                                      ? "text-emerald-600 hover:bg-emerald-100/50 dark:text-emerald-400"
                                      : "text-amber-600 hover:bg-amber-100/50 dark:text-amber-400"
                                    : "text-muted-foreground"
                                }
                              >
                                {isCashMethod ? (
                                  <Banknote className="size-4" />
                                ) : (
                                  <ShieldCheck className="size-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Ubah"
                              onClick={() => bukaEdit(s)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Hapus"
                              onClick={() => setHapus(s)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{edit ? `Ubah ${edit.nomor}` : "Servis Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={simpan} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Pelanggan</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary/80"
                  onClick={() => {
                    setModePelanggan((m) => (m === "pilih" ? "manual" : "pilih"));
                  }}
                >
                  {modePelanggan === "pilih"
                    ? "+ Ketik Pelanggan Baru Manual"
                    : "← Pilih dari Pelanggan Terdaftar"}
                </Button>
              </div>

              {modePelanggan === "pilih" && pelanggan.length > 0 ? (
                <Select
                  value={form.pelanggan}
                  onValueChange={(v) => {
                    if (v === "__ketik_manual__") {
                      setModePelanggan("manual");
                      setForm({ ...form, pelanggan: "" });
                      return;
                    }
                    const p = pelanggan.find((x) => x.nama === v);
                    setForm({
                      ...form,
                      pelanggan: v,
                      telepon: p?.telepon ?? form.telepon,
                      kendaraan: p?.kendaraan ?? form.kendaraan,
                      plat: p?.plat ?? form.plat,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pelanggan terdaftar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ketik_manual__" className="font-medium text-primary">
                      + Ketik Pelanggan Baru Manual
                    </SelectItem>
                    {pelanggan.map((p) => (
                      <SelectItem key={p.id} value={p.nama}>
                        {p.nama} {p.telepon ? `· ${p.telepon}` : ""} {p.kendaraan ? `(${p.kendaraan})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Input
                      value={form.pelanggan}
                      onChange={(e) => {
                        const nama = e.target.value;
                        const match = pelanggan.find(
                          (x) => x.nama.toLowerCase() === nama.trim().toLowerCase(),
                        );
                        setForm({
                          ...form,
                          pelanggan: nama,
                          kendaraan: match?.kendaraan ?? form.kendaraan,
                          plat: match?.plat ?? form.plat,
                          telepon: match?.telepon ?? form.telepon,
                        });
                      }}
                      placeholder="Ketik nama pelanggan baru..."
                      autoFocus
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Bisa mengetik nama pelanggan walk-in secara langsung.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Input
                      value={form.telepon}
                      onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                      placeholder="No. HP / WhatsApp (opsional)"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Servis</Label>
              <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_SERVIS.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kendaraan</Label>
              <Input
                value={form.kendaraan}
                onChange={(e) => setForm({ ...form, kendaraan: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Plat</Label>
              <Input
                value={form.plat}
                onChange={(e) => setForm({ ...form, plat: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Keluhan</Label>
              <Textarea
                value={form.keluhan}
                onChange={(e) => setForm({ ...form, keluhan: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Pekerjaan</Label>
              <Input
                value={form.pekerjaan}
                onChange={(e) => setForm({ ...form, pekerjaan: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mekanik *</Label>
              <Select value={form.mekanik} onValueChange={(v) => setForm({ ...form, mekanik: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mekanik bertugas" />
                </SelectTrigger>
                <SelectContent>
                  {mekanikOpsi.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      Tidak ada mekanik aktif di bengkel ini
                    </SelectItem>
                  ) : (
                    mekanikOpsi.map((m) => (
                      <SelectItem key={m.id} value={m.nama}>
                        {m.nama} — {m.spesialisasi} {m.status === "Tidak Aktif" ? "(Tidak Aktif)" : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              />
            </div>
            <div className="space-y-2 rounded-lg border p-3 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-semibold">Sparepart yang Digunakan</Label>
                <span className="text-xs text-muted-foreground">Sumber data: Kelola Sparepart</span>
              </div>

              <Select value={pilihPart} onValueChange={tambahPart}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sparepart untuk ditambahkan" />
                </SelectTrigger>
                <SelectContent>
                  {sparepart.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.kode} · {sp.nama} — {rupiah(sp.harga)} (stok {sp.stok})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {form.items.length === 0 ? (
                <p className="rounded-md bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">
                  Belum ada sparepart dipilih.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sparepart</TableHead>
                        <TableHead className="text-right">Harga</TableHead>
                        <TableHead className="w-24">Jumlah</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map((i) => {
                        const sp = sparepart.find((x) => x.id === i.sparepartId);
                        const dipakaiAwal =
                          edit?.items.find((o) => o.sparepartId === i.sparepartId)?.jumlah ?? 0;
                        const stokSetelah = sp
                          ? Math.max(0, sp.stok - (i.jumlah - dipakaiAwal))
                          : 0;
                        return (
                          <TableRow key={i.sparepartId}>
                            <TableCell>
                              <span className="block text-sm font-medium">{i.nama}</span>
                              <span className="block text-xs text-muted-foreground">
                                {i.kode} · stok {sp?.stok ?? 0} → {stokSetelah}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              {rupiah(i.harga)}
                            </TableCell>
                            <TableCell>
                              <NumberInput
                                aria-label={`Jumlah ${i.nama}`}
                                min={1}
                                className="h-8"
                                value={i.jumlah}
                                onChange={(v) => ubahJumlah(i.sparepartId, v)}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-semibold">
                              {rupiah(i.harga * i.jumlah)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Hapus ${i.nama}`}
                                onClick={() => hapusPart(i.sparepartId)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Biaya Jasa</Label>
              <NumberInput
                value={form.biayaJasa}
                onChange={(v) => setForm({ ...form, biayaJasa: v })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as StatusServis })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URUTAN_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimasi Selesai</Label>
              <Input
                type="datetime-local"
                value={form.estimasiSelesai}
                onChange={(e) => setForm({ ...form, estimasiSelesai: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estimasi Durasi</Label>
              <Select
                value={form.estimasiWaktu}
                onValueChange={(v) => setForm({ ...form, estimasiWaktu: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih durasi pengerjaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30 Menit">30 Menit</SelectItem>
                  <SelectItem value="45 - 60 Menit">45 - 60 Menit</SelectItem>
                  <SelectItem value="1 - 2 Jam">1 - 2 Jam</SelectItem>
                  <SelectItem value="2 - 4 Jam">2 - 4 Jam</SelectItem>
                  <SelectItem value="> 4 Jam">&gt; 4 Jam</SelectItem>
                  <SelectItem value="1 Hari Kerja">1 Hari Kerja</SelectItem>
                  <SelectItem value="> 1 Hari Kerja">&gt; 1 Hari Kerja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-2">
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Biaya Jasa</span>
                <span className="font-medium">{rupiah(form.biayaJasa)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Total Sparepart</span>
                <span className="font-medium">{rupiah(totalPart)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 font-display text-base font-bold">
                <span>Total Biaya</span>
                <span>{rupiah(form.biayaJasa + totalPart)}</span>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Catatan</Label>
              <Textarea
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={loadingSimpan}>
                {loadingSimpan ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(v) => !v && setHapus(null)}
        title={`Hapus servis ${hapus?.nomor}?`}
        onConfirm={() => {
          if (hapus) hapusServis(hapus.id);
          setHapus(null);
          toast.success("Data servis dihapus");
        }}
      />

      {/* -------------------------------------------------------------------- */}
      {/* MODAL VERIFIKASI PEMBAYARAN & BUKTI SCREENSHOT E-WALLET ADMIN */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={verifModalOpen} onOpenChange={setVerifModalOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {verifServis && (verifServis.metodeBayar === "Cash" || pembayaran.find((p) => p.servisId === verifServis.id)?.metode === "Cash") ? (
                <>
                  <Banknote className="size-5 text-emerald-600" /> Penerimaan Pembayaran Tunai (Cash)
                </>
              ) : (
                <>
                  <ShieldCheck className="size-5 text-primary" /> Verifikasi Pembayaran Pelanggan
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {verifServis && (() => {
            const pmb = pembayaran.find(
              (p) => p.servisId === verifServis.id || p.noTransaksi === verifServis.noTransaksi,
            );
            const metode = pmb?.metode || verifServis.metodeBayar || "QRIS";
            const isCash = (metode as string) === "Cash" || (metode as string) === "Tunai";
            const isPending = pmb?.status === "Menunggu Verifikasi";
            const isLunas = pmb?.status === "Lunas" || verifServis.status === "Selesai Dibayar";
            const isDitolak = pmb?.status === "Bukti Ditolak";

            const handleSetujui = () => {
              verifikasiPembayaran(verifServis.id, true, undefined, user?.nama || "Admin");
              toast.success(
                isCash
                  ? `Pembayaran tunai kasir ${verifServis.noTransaksi} berhasil diterima (Lunas)!`
                  : `Pembayaran ${verifServis.noTransaksi} berhasil disetujui (Lunas)!`,
              );
              setVerifModalOpen(false);
            };

            const handleTolak = () => {
              if (!alasanTolak.trim()) {
                toast.error("Alasan penolakan bukti pembayaran wajib diisi.");
                return;
              }
              verifikasiPembayaran(verifServis.id, false, alasanTolak.trim(), user?.nama || "Admin");
              toast.info(`Bukti pembayaran ${verifServis.noTransaksi} ditolak.`);
              setVerifModalOpen(false);
            };

            return (
              <div className="space-y-4 py-1 text-sm">
                {/* Status Pembayaran Banner */}
                <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/30">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Status Transaksi
                    </span>
                    <span className="font-bold text-base text-foreground">
                      {pmb?.status || (isLunas ? "Lunas" : "Belum Mengajukan")}
                    </span>
                  </div>
                  <div>
                    {isPending && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border ${
                          isCash
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        <Clock className="size-3.5" /> {isCash ? "Menunggu Kasir" : "Menunggu Verifikasi"}
                      </span>
                    )}
                    {isLunas && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="size-3.5" /> Lunas
                      </span>
                    )}
                    {isDitolak && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive border border-destructive/30">
                        <XCircle className="size-3.5" /> Bukti Ditolak
                      </span>
                    )}
                  </div>
                </div>

                {/* Rincian Transaksi */}
                <div className="grid grid-cols-2 gap-2 text-xs rounded-xl border bg-card p-3">
                  <div>
                    <span className="text-muted-foreground block">No. Transaksi:</span>
                    <span className="font-mono font-bold text-foreground">{verifServis.noTransaksi}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">No. Servis:</span>
                    <span className="font-mono font-bold text-foreground">{verifServis.nomor}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Pelanggan:</span>
                    <span className="font-bold text-foreground">{verifServis.pelanggan}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Kendaraan:</span>
                    <span className="font-semibold text-foreground">{verifServis.kendaraan} ({verifServis.plat})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Metode Pembayaran:</span>
                    <span className="font-bold text-primary">{metode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Total Tagihan:</span>
                    <span className="font-display font-bold text-sm text-primary">{rupiah(verifServis.total)}</span>
                  </div>
                </div>

                {/* TAMPILAN KHUSUS CASH VS TAMPILAN SCREENSHOT QRIS/TRANSFER */}
                {isCash ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <Banknote className="size-5 text-emerald-600 dark:text-emerald-400" /> Pembayaran Tunai (Cash) di Meja Kasir Bengkel
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pelanggan memilih metode pembayaran tunai langsung di kasir bengkel.{" "}
                      <strong className="text-foreground">Tidak memerlukan unggahan screenshot atau bukti transfer</strong>.
                    </p>
                    <div className="rounded-lg border bg-background/80 p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total yang harus diterima kasir:</span>
                      <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {rupiah(verifServis.total)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      *Setelah menerima uang fisik di kasir secara lengkap, silakan klik tombol konfirmasi di bawah untuk mengubah status transaksi menjadi <strong>Lunas</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl border bg-card p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="size-4 text-primary" /> Tangkap Layar (Screenshot) Bukti Transfer:
                      </span>
                      {pmb?.buktiUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setZoomBukti(!zoomBukti)}
                          className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
                        >
                          <Maximize2 className="size-3" /> {zoomBukti ? "Perkecil" : "Perbesar"}
                        </Button>
                      )}
                    </div>

                    {pmb?.buktiUrl ? (
                      <div className="rounded-xl border bg-muted/20 p-2 text-center overflow-hidden">
                        <img
                          src={pmb.buktiUrl}
                          alt="Bukti Transfer E-Wallet Pelanggan"
                          className={`mx-auto rounded-lg border object-contain shadow-sm transition-all duration-200 cursor-pointer ${
                            zoomBukti ? "max-h-[520px] w-full" : "max-h-[280px] w-auto"
                          }`}
                          onClick={() => setZoomBukti(!zoomBukti)}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          *Klik gambar untuk memperbesar / melihat resolusi penuh
                        </p>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                        <ImageIcon className="mx-auto size-8 text-muted-foreground/40 mb-1" />
                        <p>Pelanggan belum mengunggah screenshot bukti transfer.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Alasan Tolak (Hanya untuk non-Cash) */}
                {!isCash && modeTolak ? (
                  <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <Label className="text-xs font-bold text-destructive">
                      Alasan Penolakan Bukti Pembayaran:
                    </Label>
                    <Textarea
                      rows={2}
                      value={alasanTolak}
                      onChange={(e) => setAlasanTolak(e.target.value)}
                      placeholder="Contoh: Nominal transfer kurang Rp 50.000, atau screenshot tidak terbaca / buram..."
                      className="text-xs bg-background"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModeTolak(false)}
                        className="h-8 text-xs"
                      >
                        Batal Tolak
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleTolak}
                        className="h-8 text-xs font-bold gap-1"
                      >
                        <XCircle className="size-3.5" /> Konfirmasi Penolakan
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Info Jika Sudah Ditolak Sebelumnya */}
                {isDitolak && pmb?.alasanTolak && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                    <span className="font-bold">Alasan Penolakan Sebelumnya:</span> {pmb.alasanTolak}
                  </div>
                )}

                {/* Dialog Footer Actions */}
                <DialogFooter className="flex-row flex-wrap justify-between gap-2 sm:justify-between pt-2">
                  <Button variant="outline" onClick={() => setVerifModalOpen(false)}>
                    Tutup
                  </Button>

                  {!modeTolak && (
                    <div className="flex items-center gap-2">
                      {!isLunas && !isCash && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setModeTolak(true)}
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs gap-1"
                        >
                          <XCircle className="size-3.5" /> Tolak Bukti
                        </Button>
                      )}
                      {!isLunas ? (
                        <Button
                          type="button"
                          onClick={handleSetujui}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
                        >
                          {isCash ? (
                            <>
                              <CheckCircle2 className="size-4" /> Terima Uang Tunai & Konfirmasi Lunas
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-4" /> Setujui Pembayaran (Lunas)
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-4" /> Pembayaran Terverifikasi
                        </span>
                      )}
                    </div>
                  )}
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
