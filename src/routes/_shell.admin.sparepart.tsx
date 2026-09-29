import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  RotateCcw,
  RefreshCw,
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/number-input";
import { Label } from "@/components/ui/label";
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
import {
  useStore,
  rupiah,
  KATEGORI_PART,
  SATUAN_PART,
  statusStok,
  tanggalPanjang,
  generateNextKodeSparepart,
  type Sparepart,
} from "@/lib/store";

export const Route = createFileRoute("/_shell/admin/sparepart")({
  head: () => ({
    meta: [
      { title: "Sparepart & Pricelist — AppBenk" },
      {
        name: "description",
        content:
          "Kelola katalog sparepart bengkel, harga jual, stok, dan kategori komponen kendaraan.",
      },
      { property: "og:title", content: "Sparepart & Pricelist — AppBenk" },
      {
        property: "og:description",
        content: "Katalog sparepart dan pricelist bengkel yang selalu siap.",
      },
    ],
  }),
  component: SparepartAdmin,
  errorComponent: ({ error, reset }) => (
    <div className="p-6">
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <h2 className="text-lg font-bold text-destructive">Gagal Memuat Halaman Sparepart</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message || "Terjadi kesalahan saat memproses data sparepart."}
        </p>
        <Button className="mt-4 gap-2" variant="outline" onClick={reset}>
          <RotateCcw className="size-4" /> Coba Muat Ulang
        </Button>
      </div>
    </div>
  ),
});

const defaultKategori = KATEGORI_PART[0] || "Umum";
const defaultSatuan = SATUAN_PART[0] || "Pcs";

const kosong = {
  kode: "",
  nama: "",
  kategori: defaultKategori,
  satuan: defaultSatuan,
  harga: 0,
  stok: 0,
  stokMinimum: 5,
};

function SparepartAdmin() {
  const queryClient = useQueryClient();
  const {
    sparepart,
    simpanSparepart,
    hapusSparepart,
    refreshSparepart,
    sesuaikanStokSparepart,
  } = useStore();

  const [q, setQ] = useState("");
  const [kat, setKat] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("semua");
  // Default sorting strictly ascending by item code (SP-001, SP-002, ...)
  const [sortFilter, setSortFilter] = useState("kode_asc");

  // State Dialog Form Tambah / Edit Sparepart
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Sparepart | null>(null);
  const [form, setForm] = useState(kosong);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Dialog Hapus
  const [hapus, setHapus] = useState<Sparepart | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State Dialog Penyesuaian Stok (Tambah / Kurang / Set Stok Fisik)
  const [stokDialogPart, setStokDialogPart] = useState<Sparepart | null>(null);
  const [stokAksi, setStokAksi] = useState<"tambah" | "kurang" | "set">("tambah");
  const [stokQty, setStokQty] = useState<number>(5);
  const [stokAlasan, setStokAlasan] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // State Refresh Manual
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh data master sparepart dari Supabase saat halaman dibuka & subscribe event updates
  useEffect(() => {
    refreshSparepart?.().catch(() => {});

    const handleSync = () => {
      refreshSparepart?.().catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["sparepart"] });
      queryClient.invalidateQueries({ queryKey: ["stok"] });
    };

    window.addEventListener("appbenk_sparepart_updated", handleSync);
    const interval = setInterval(handleSync, 15000);

    return () => {
      window.removeEventListener("appbenk_sparepart_updated", handleSync);
      clearInterval(interval);
    };
  }, [refreshSparepart, queryClient]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSparepart?.();
      queryClient.invalidateQueries({ queryKey: ["sparepart"] });
      queryClient.invalidateQueries({ queryKey: ["stok"] });
      queryClient.invalidateQueries({ queryKey: ["riwayat_stok"] });
      toast.success("Data sparepart berhasil disinkronkan");
    } catch (err: any) {
      toast.error("Gagal menyinkronkan data: " + (err?.message || "Koneksi terganggu"));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Daftar opsi kategori yang menggabungkan daftar baku dan kategori kustom yang ada
  const kategoriOptions = useMemo(() => {
    const setKat = new Set(KATEGORI_PART);
    for (const p of sparepart || []) {
      if (p?.kategori?.trim()) {
        setKat.add(p.kategori.trim());
      }
    }
    return Array.from(setKat);
  }, [sparepart]);

  const isFiltered =
    q.trim() !== "" ||
    kat !== "semua" ||
    statusFilter !== "semua" ||
    sortFilter !== "kode_asc";

  const resetFilter = () => {
    setQ("");
    setKat("semua");
    setStatusFilter("semua");
    setSortFilter("kode_asc");
  };

  // Auto-generate code sequentially when opening new sparepart modal (e.g. SP-006 -> SP-007)
  const bukaBaru = () => {
    const nextKode = generateNextKodeSparepart(sparepart);
    setEdit(null);
    setForm({
      ...kosong,
      kategori: kategoriOptions[0] || defaultKategori,
      satuan: defaultSatuan,
      kode: nextKode,
    });
    setOpen(true);
  };

  const bukaEdit = (p: Sparepart) => {
    setEdit(p);
    setForm({
      kode: p.kode || p.id,
      nama: p.nama,
      kategori: p.kategori || defaultKategori,
      satuan: p.satuan || defaultSatuan,
      harga: Number(p.harga || 0),
      stok: Number(p.stok || 0),
      stokMinimum: Number(p.stokMinimum ?? 5),
    });
    setOpen(true);
  };

  const bukaDialogStok = (p: Sparepart) => {
    setStokDialogPart(p);
    setStokAksi("tambah");
    setStokQty(5);
    setStokAlasan("");
  };

  // Helper pembanding kode secara natural numerik (SP-001, SP-002, SP-010)
  const compareKode = (a: Sparepart, b: Sparepart, desc = false) => {
    const ka = (a.kode || a.id || "").trim();
    const kb = (b.kode || b.id || "").trim();
    const res = ka.localeCompare(kb, undefined, { numeric: true, sensitivity: "base" });
    return desc ? -res : res;
  };

  const data = useMemo(() => {
    const s = q.toLowerCase().trim();
    let res = (sparepart || []).filter((p) => {
      if (!p || typeof p !== "object") return false;

      // Filter Kategori
      if (kat !== "semua" && (p.kategori || "Umum") !== kat) return false;

      // Filter Status Stok
      if (statusFilter !== "semua") {
        const st = statusStok(p);
        if (statusFilter === "Aman" && st !== "Aman") return false;
        if (statusFilter === "Menipis" && st !== "Menipis") return false;
        if (statusFilter === "Habis" && st !== "Habis") return false;
      }

      // Filter Pencarian (Nama, Kode, atau Kategori)
      if (s) {
        const namaCocok = (p.nama ?? "").toLowerCase().includes(s);
        const kodeCocok = (p.kode ?? "").toLowerCase().includes(s);
        const katCocok = (p.kategori ?? "").toLowerCase().includes(s);
        if (!namaCocok && !kodeCocok && !katCocok) return false;
      }
      return true;
    });

    // Pengurutan / Sort (Default: kode_asc strictly SP-001, SP-002, SP-003, ...)
    res = [...res].sort((a, b) => {
      if (!a || !b) return 0;
      if (sortFilter === "kode_asc" || sortFilter === "default") return compareKode(a, b, false);
      if (sortFilter === "kode_desc") return compareKode(a, b, true);
      if (sortFilter === "nama_asc") return (a.nama ?? "").localeCompare(b.nama ?? "");
      if (sortFilter === "nama_desc") return (b.nama ?? "").localeCompare(a.nama ?? "");
      if (sortFilter === "harga_asc") return Number(a.harga || 0) - Number(b.harga || 0);
      if (sortFilter === "harga_desc") return Number(b.harga || 0) - Number(a.harga || 0);
      if (sortFilter === "stok_desc") return Number(b.stok || 0) - Number(a.stok || 0);
      if (sortFilter === "stok_asc") return Number(a.stok || 0) - Number(b.stok || 0);
      if (sortFilter === "terbaru")
        return (b.tanggalUpdate || "").localeCompare(a.tanggalUpdate || "");
      return compareKode(a, b, false);
    });

    return res;
  }, [sparepart, q, kat, statusFilter, sortFilter]);

  // Statistik Pricelist
  const statsPricelist = useMemo(() => {
    const list = (sparepart || []).filter((p) => p && typeof p === "object");
    if (list.length === 0) return { total: 0, minHarga: 0, maxHarga: 0, avgHarga: 0 };
    const hargas = list.map((p) => Number(p.harga || 0)).filter((h) => !isNaN(h) && h >= 0);
    const minHarga = hargas.length > 0 ? Math.min(...hargas) : 0;
    const maxHarga = hargas.length > 0 ? Math.max(...hargas) : 0;
    const avgHarga =
      hargas.length > 0 ? Math.round(hargas.reduce((a, b) => a + b, 0) / hargas.length) : 0;
    return {
      total: list.length,
      minHarga: Number.isFinite(minHarga) ? minHarga : 0,
      maxHarga: Number.isFinite(maxHarga) ? maxHarga : 0,
      avgHarga: Number.isFinite(avgHarga) ? avgHarga : 0,
    };
  }, [sparepart]);

  // Hitung target stok real-time untuk modal penyesuaian stok
  const stokSaatIni = stokDialogPart ? Number(stokDialogPart.stok || 0) : 0;
  const parsedStokQty = Math.max(0, Math.round(Number(stokQty || 0)));
  const targetStok = useMemo(() => {
    if (!stokDialogPart) return 0;
    if (stokAksi === "tambah") return stokSaatIni + parsedStokQty;
    if (stokAksi === "kurang") return Math.max(0, stokSaatIni - parsedStokQty);
    return parsedStokQty; // aksi "set"
  }, [stokDialogPart, stokAksi, stokSaatIni, parsedStokQty]);

  // Handler Submit Tambah / Ubah Sparepart
  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || Number(form.harga || 0) <= 0) {
      toast.error("Nama sparepart dan harga resmi wajib diisi dengan benar.");
      return;
    }

    const kodeOtomatis = generateNextKodeSparepart(sparepart);
    const kodeInput = (form.kode.trim() || kodeOtomatis).toUpperCase();

    // Validasi keunikan kode part (kecuali saat mengedit part yang sama)
    const kodeSudahAda = (sparepart || []).some(
      (x) =>
        x?.id !== edit?.id &&
        x?.kode &&
        x.kode.trim().toLowerCase() === kodeInput.trim().toLowerCase(),
    );

    if (kodeSudahAda) {
      toast.error(`Kode ${kodeInput} sudah digunakan oleh sparepart lain. Silakan gunakan kode unik.`);
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(edit ? "Menyimpan perubahan sparepart..." : "Menambahkan sparepart baru...");

    try {
      const res = await simpanSparepart({
        ...(edit ? { id: edit.id } : {}),
        kode: kodeInput,
        nama: form.nama.trim(),
        kategori: form.kategori,
        satuan: form.satuan,
        harga: Math.max(0, Math.round(Number(form.harga || 0))),
        stok: Math.max(0, Math.round(Number(form.stok || 0))),
        stokMinimum: Math.max(0, Math.round(Number(form.stokMinimum ?? 5))),
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal menyimpan sparepart.");
      }

      await refreshSparepart?.();
      queryClient.invalidateQueries({ queryKey: ["sparepart"] });
      queryClient.invalidateQueries({ queryKey: ["stok"] });
      queryClient.invalidateQueries({ queryKey: ["riwayat_stok"] });

      toast.success(edit ? "Sparepart berhasil diperbarui" : "Sparepart baru berhasil ditambahkan", {
        id: toastId,
      });
      setOpen(false);
    } catch (err: any) {
      console.error("Gagal simpan sparepart:", err);
      toast.error(err?.message || "Terjadi kesalahan saat menyimpan sparepart ke database.", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Submit Penyesuaian / Tambah Stok
  const submitPenyesuaianStok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stokDialogPart) return;

    if (stokAksi !== "set" && parsedStokQty <= 0) {
      toast.error("Jumlah penyesuaian stok harus lebih besar dari 0");
      return;
    }

    setIsAdjusting(true);
    const toastId = toast.loading("Memperbarui stok sparepart...");

    try {
      const labelAksi =
        stokAksi === "tambah"
          ? `Tambah stok (+${parsedStokQty} ${stokDialogPart.satuan || "Pcs"})`
          : stokAksi === "kurang"
            ? `Kurang stok (-${parsedStokQty} ${stokDialogPart.satuan || "Pcs"})`
            : `Set stok fisik (${stokSaatIni} -> ${parsedStokQty} ${stokDialogPart.satuan || "Pcs"})`;

      const ketFinal = stokAlasan.trim()
        ? `${stokAlasan.trim()} (${labelAksi})`
        : labelAksi;

      const res = await sesuaikanStokSparepart({
        idSparepart: stokDialogPart.id,
        newStok: targetStok,
        keterangan: ketFinal,
        tipeAksi: stokAksi === "tambah" ? "masuk" : stokAksi === "kurang" ? "keluar" : "penyesuaian",
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal memperbarui stok");
      }

      await refreshSparepart?.();
      queryClient.invalidateQueries({ queryKey: ["sparepart"] });
      queryClient.invalidateQueries({ queryKey: ["stok"] });
      queryClient.invalidateQueries({ queryKey: ["riwayat_stok"] });

      toast.success(
        `Stok ${stokDialogPart.nama} berhasil diperbarui menjadi ${targetStok} ${stokDialogPart.satuan || "Pcs"}`,
        { id: toastId },
      );
      setStokDialogPart(null);
    } catch (err: any) {
      console.error("Gagal menyesuaikan stok:", err);
      toast.error(err?.message || "Gagal memperbarui stok sparepart di database.", {
        id: toastId,
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  // Handler Hapus Sparepart dengan Graceful Foreign Key Protection
  const handleConfirmHapus = async () => {
    if (!hapus) return;
    setIsDeleting(true);
    const toastId = toast.loading(`Menghapus ${hapus.nama}...`);

    try {
      const res = await hapusSparepart(hapus.id);
      await refreshSparepart?.();
      queryClient.invalidateQueries({ queryKey: ["sparepart"] });
      queryClient.invalidateQueries({ queryKey: ["stok"] });
      queryClient.invalidateQueries({ queryKey: ["riwayat_stok"] });

      if (res.softDeleted) {
        toast.warning(
          res.message ||
            "Sparepart tidak dapat dihapus permanen karena masih tercatat dalam riwayat servis/transaksi. Status stok telah dinonaktifkan.",
          { id: toastId, duration: 6000 },
        );
      } else if (res.success) {
        toast.success(`Sparepart ${hapus.nama} berhasil dihapus`, { id: toastId });
      } else {
        toast.error(res.message || "Gagal menghapus sparepart", { id: toastId });
      }
      setHapus(null);
    } catch (err: any) {
      console.error("Gagal hapus sparepart:", err);
      toast.error(err?.message || "Terjadi kesalahan saat menghapus data sparepart.", {
        id: toastId,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Sparepart & Pricelist"
        description="Katalog komponen lengkap beserta harga jual, pergerakan stok, dan informasi ketersediaan."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button className="gap-2" onClick={bukaBaru}>
              <Plus className="size-4" /> Tambah Sparepart
            </Button>
          </div>
        }
      />

      {/* Ringkasan Harga & Katalog (Pricelist & Stok Insights) */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Item
            </span>
            <p className="mt-1 text-xl font-bold">{statsPricelist.total} sparepart</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Harga Terendah
            </span>
            <p className="mt-1 text-xl font-bold text-success">{rupiah(statsPricelist.minHarga)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rata-Rata Harga
            </span>
            <p className="mt-1 text-xl font-bold">{rupiah(statsPricelist.avgHarga)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Harga Tertinggi
            </span>
            <p className="mt-1 text-xl font-bold text-amber-600">{rupiah(statsPricelist.maxHarga)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              <h3 className="font-semibold text-base">Katalog & Pricelist Sparepart</h3>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {(sparepart || []).length} item
              </span>
            </div>
            {isFiltered && (
              <span className="text-xs text-muted-foreground">
                Menampilkan {data.length} dari {(sparepart || []).length} sparepart
              </span>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[240px] flex-1">
              <SearchBar
                value={q}
                onChange={setQ}
                placeholder="Cari nama, kode (misal SP-001), atau kategori..."
              />
            </div>

            {/* Filter Kategori */}
            <Select value={kat} onValueChange={setKat}>
              <SelectTrigger className="w-44 bg-card">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Kategori</SelectItem>
                {kategoriOptions.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Status Stok */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-card">
                <SelectValue placeholder="Status Stok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="Aman">Tersedia (Aman)</SelectItem>
                <SelectItem value="Menipis">Stok Menipis</SelectItem>
                <SelectItem value="Habis">Stok Habis</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Urutan / Sort Dropdown dengan Opsi Eksplisit */}
            <Select value={sortFilter} onValueChange={setSortFilter}>
              <SelectTrigger className="w-56 bg-card">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kode_asc">Kode (A - Z / 0 - 9) [Standar]</SelectItem>
                <SelectItem value="kode_desc">Kode (Z - A / 9 - 0)</SelectItem>
                <SelectItem value="nama_asc">Nama (A — Z)</SelectItem>
                <SelectItem value="nama_desc">Nama (Z — A)</SelectItem>
                <SelectItem value="harga_asc">Harga Terendah</SelectItem>
                <SelectItem value="harga_desc">Harga Tertinggi</SelectItem>
                <SelectItem value="stok_desc">Stok Terbanyak</SelectItem>
                <SelectItem value="stok_asc">Stok Tersedikit</SelectItem>
                <SelectItem value="terbaru">Update Terbaru</SelectItem>
              </SelectContent>
            </Select>

            {/* Tombol Reset Filter */}
            {isFiltered && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilter}
                className="gap-1.5 border-dashed text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" /> Reset Filter
              </Button>
            )}
          </div>

          {/* Tabel Katalog & Pricelist Terpadu */}
          {data.length === 0 ? (
            <EmptyState
              icon={<Package className="size-8" />}
              title="Sparepart tidak ditemukan"
              description={
                isFiltered
                  ? "Tidak ada sparepart yang sesuai dengan filter. Coba ubah atau reset filter."
                  : "Belum ada sparepart terdaftar. Silakan klik Tambah Sparepart."
              }
              action={
                isFiltered ? (
                  <Button variant="outline" size="sm" onClick={resetFilter} className="gap-2">
                    <RotateCcw className="size-3.5" /> Kembalikan Semua Data
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Header Kolom Kode Part dengan Fitur Klik Sorting */}
                    <TableHead
                      className="cursor-pointer select-none hover:text-foreground transition-colors group"
                      onClick={() => {
                        setSortFilter((prev) => (prev === "kode_asc" ? "kode_desc" : "kode_asc"));
                      }}
                      title="Klik untuk mengurutkan berdasarkan Kode Part"
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span>Kode Part</span>
                        {sortFilter === "kode_asc" ? (
                          <ArrowUp className="size-3.5 text-primary" />
                        ) : sortFilter === "kode_desc" ? (
                          <ArrowDown className="size-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground/60 group-hover:text-foreground" />
                        )}
                      </div>
                    </TableHead>

                    {/* Header Kolom Nama Sparepart dengan Fitur Klik Sorting */}
                    <TableHead
                      className="cursor-pointer select-none hover:text-foreground transition-colors group"
                      onClick={() => {
                        setSortFilter((prev) => (prev === "nama_asc" ? "nama_desc" : "nama_asc"));
                      }}
                      title="Klik untuk mengurutkan berdasarkan Nama Sparepart"
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span>Nama Sparepart / Komponen</span>
                        {sortFilter === "nama_asc" ? (
                          <ArrowUp className="size-3.5 text-primary" />
                        ) : sortFilter === "nama_desc" ? (
                          <ArrowDown className="size-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground/60 group-hover:text-foreground" />
                        )}
                      </div>
                    </TableHead>

                    <TableHead>Kategori</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead className="text-right">Harga Resmi (Pricelist)</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead>Status Stok</TableHead>
                    <TableHead>Update</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p, idx) => {
                    const partStok = Number(p.stok ?? 0);
                    const partMin = Number(p.stokMinimum ?? 5);
                    const isMenipis = partStok <= partMin;
                    const st = statusStok(p);
                    return (
                      <TableRow key={p.id || `sp-${idx}`}>
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          {p.kode || p.id || "—"}
                        </TableCell>
                        <TableCell className="font-medium">{p.nama || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{p.kategori || "Umum"}</TableCell>
                        <TableCell className="text-muted-foreground">{p.satuan || "Pcs"}</TableCell>
                        <TableCell className="text-right font-display text-base font-bold text-foreground">
                          {rupiah(Number(p.harga || 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={isMenipis ? "font-semibold text-destructive" : "font-medium"}>
                            {partStok} {p.satuan || "Pcs"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            min. {partMin}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              st === "Habis"
                                ? "inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive"
                                : st === "Menipis"
                                  ? "inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600"
                                  : "inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success"
                            }
                          >
                            {st}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tanggalPanjang(p.tanggalUpdate)}
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              title="Sesuaikan Stok / Tambah Stok"
                              aria-label="Sesuaikan Stok"
                              onClick={() => bukaDialogStok(p)}
                            >
                              <Boxes className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Ubah Sparepart"
                              aria-label="Ubah"
                              onClick={() => bukaEdit(p)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Hapus Sparepart"
                              aria-label="Hapus"
                              onClick={() => setHapus(p)}
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

      {/* MODAL 1: Tambah / Edit Sparepart */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit ? "Ubah Sparepart" : "Tambah Sparepart"}</DialogTitle>
            <DialogDescription>
              {edit
                ? "Perbarui informasi detail sparepart bengkel. Perubahan akan langsung tersinkron ke database."
                : "Tambahkan komponen sparepart baru ke katalog bengkel."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={simpan} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nama Sparepart <span className="text-destructive">*</span></Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Contoh: Oli Mesin AHM MPX2 0.8L"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select
                value={form.kategori}
                onValueChange={(v) => setForm({ ...form, kategori: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kategoriOptions.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sparepart-kode">Kode Sparepart</Label>
                <span className="text-[11px] text-muted-foreground font-medium">Otomatis (SP-xxx)</span>
              </div>
              <Input
                id="sparepart-kode"
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
                placeholder="SP-007"
              />
              <p className="text-[11px] text-muted-foreground">
                Kode berurutan otomatis (misal: SP-007). Dapat disesuaikan bila perlu.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Harga Resmi (Rp) <span className="text-destructive">*</span></Label>
              <NumberInput
                value={form.harga}
                onChange={(v) => setForm({ ...form, harga: v })}
                placeholder="0"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stok</Label>
              <NumberInput
                value={form.stok}
                onChange={(v) => setForm({ ...form, stok: v })}
                placeholder="0"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Satuan</Label>
              <Select value={form.satuan} onValueChange={(v) => setForm({ ...form, satuan: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SATUAN_PART.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stok Minimum</Label>
              <NumberInput
                value={form.stokMinimum}
                onChange={(v) => setForm({ ...form, stokMinimum: v })}
                placeholder="0"
                min={0}
              />
            </div>
            <DialogFooter className="sm:col-span-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {edit ? "Simpan Perubahan" : "Tambah Sparepart"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Sesuaikan Stok (Tambah / Kurang / Set Stok Fisik) */}
      <Dialog
        open={!!stokDialogPart}
        onOpenChange={(v) => {
          if (!v && !isAdjusting) setStokDialogPart(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="size-5 text-primary" />
              Sesuaikan Stok Sparepart
            </DialogTitle>
            <DialogDescription>
              Ubah kuantitas stok untuk komponen{" "}
              <span className="font-semibold text-foreground">{stokDialogPart?.nama}</span> (
              {stokDialogPart?.kode || stokDialogPart?.id}). Setiap perubahan akan otomatis tercatat
              ke audit riwayat stok.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitPenyesuaianStok} className="space-y-4 py-1">
            {/* Pilihan Mode Aksi */}
            <div className="space-y-1.5">
              <Label>Jenis Penyesuaian</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={stokAksi === "tambah" ? "default" : "outline"}
                  onClick={() => setStokAksi("tambah")}
                  className="gap-1.5 text-xs font-medium"
                >
                  <ArrowUpRight className="size-3.5" />
                  Tambah (+)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={stokAksi === "kurang" ? "default" : "outline"}
                  onClick={() => setStokAksi("kurang")}
                  className="gap-1.5 text-xs font-medium"
                >
                  <ArrowDownLeft className="size-3.5" />
                  Kurang (-)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={stokAksi === "set" ? "default" : "outline"}
                  onClick={() => setStokAksi("set")}
                  className="gap-1.5 text-xs font-medium"
                >
                  <SlidersHorizontal className="size-3.5" />
                  Set Fisik (=)
                </Button>
              </div>
            </div>

            {/* Input Kuantitas */}
            <div className="space-y-1.5">
              <Label htmlFor="stok-qty-input">
                {stokAksi === "tambah"
                  ? "Jumlah Penambahan Stok"
                  : stokAksi === "kurang"
                    ? "Jumlah Pengurangan Stok"
                    : "Jumlah Stok Fisik Aktual"}
              </Label>
              <div className="flex items-center gap-2">
                <NumberInput
                  id="stok-qty-input"
                  value={stokQty}
                  onChange={(v) => setStokQty(Math.max(0, Math.round(Number(v || 0))))}
                  min={stokAksi === "set" ? 0 : 1}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-muted-foreground w-12">
                  {stokDialogPart?.satuan || "Pcs"}
                </span>
              </div>
            </div>

            {/* Ringkasan & Preview Perubahan Stok */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1.5">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Stok Saat Ini:</span>
                <span className="font-semibold text-foreground">
                  {stokSaatIni} {stokDialogPart?.satuan || "Pcs"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Perubahan:</span>
                <span
                  className={
                    stokAksi === "tambah"
                      ? "font-semibold text-success"
                      : stokAksi === "kurang"
                        ? "font-semibold text-destructive"
                        : "font-semibold text-primary"
                  }
                >
                  {stokAksi === "tambah"
                    ? `+${parsedStokQty}`
                    : stokAksi === "kurang"
                      ? `-${parsedStokQty}`
                      : `Set ke ${parsedStokQty}`}
                </span>
              </div>
              <div className="border-t pt-1.5 flex justify-between items-center font-medium">
                <span className="text-xs">Hasil Stok Akhir:</span>
                <span className="text-sm font-bold text-foreground">
                  {targetStok} {stokDialogPart?.satuan || "Pcs"}
                </span>
              </div>
            </div>

            {/* Input Alasan / Keterangan Audit */}
            <div className="space-y-1.5">
              <Label htmlFor="stok-alasan-input">
                Catatan / Alasan Penyesuaian <span className="text-xs text-muted-foreground">(Opsional)</span>
              </Label>
              <Input
                id="stok-alasan-input"
                value={stokAlasan}
                onChange={(e) => setStokAlasan(e.target.value)}
                placeholder="Contoh: Stok masuk dari supplier, stok opname gudang, barang cacat..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStokDialogPart(null)}
                disabled={isAdjusting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isAdjusting} className="gap-2">
                {isAdjusting && <Loader2 className="size-4 animate-spin" />}
                Simpan Penyesuaian
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Konfirmasi Hapus Sparepart */}
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(v) => !v && !isDeleting && setHapus(null)}
        title={`Hapus Sparepart ${hapus?.nama}?`}
        description={
          hapus
            ? `Apakah Anda yakin ingin menghapus "${hapus.nama}" (${hapus.kode || hapus.id})? Jika komponen ini pernah digunakan pada riwayat servis atau transaksi, sistem akan menonaktifkannya secara aman.`
            : "Tindakan ini tidak dapat dibatalkan."
        }
        onConfirm={handleConfirmHapus}
      />
    </>
  );
}
