import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ShoppingCart,
  ClipboardList,
  ArrowDownUp,
  PackageCheck,
  RotateCcw,
  Pencil,
  Trash2,
  Building2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  AlertTriangle,
  FileText,
  Info,
  Check,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Boxes,
  TrendingDown,
  TrendingUp,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ComboboxInput } from "@/components/combobox-input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import {
  useStore,
  rupiah,
  tanggalPanjang,
  ALASAN_RETUR_OPTIONS,
  STATUS_RETUR_OPTIONS,
  type StatusRetur,
  type ReturSparepart,
  type PembelianSparepart,
} from "@/lib/store";

export const Route = createFileRoute("/_shell/admin/stok")({
  head: () => ({
    meta: [
      { title: "Catatan Stok — AppBenk" },
      {
        name: "description",
        content:
          "Catat pembelian sparepart dari supplier, pantau riwayat pergerakan stok masuk/keluar, dan penggunaan sparepart per servis.",
      },
      { property: "og:title", content: "Catatan Stok — AppBenk" },
      {
        property: "og:description",
        content: "Kelola pembelian supplier, riwayat stok, dan penggunaan sparepart bengkel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StokAdmin,
});

function StokAdmin() {
  const { user } = useAuth();
  const {
    sparepart,
    pembelian,
    riwayatStok,
    penggunaan,
    returSparepart,
    supplier,
    servis,
    catatPembelian,
    catatReturSparepart,
    ubahStatusRetur,
    ubahPembelian,
    hapusPembelian,
    refreshSupplier,
    refreshRetur,
    refreshStok,
    refreshPembelian,
    refreshRiwayatStok,
    refreshPenggunaan,
    refreshSparepart,
  } = useStore();

  useEffect(() => {
    refreshSupplier().catch(() => {});
    refreshRetur().catch(() => {});
    refreshStok().catch(() => {});
    refreshSparepart().catch(() => {});

    const handleSync = () => {
      refreshRetur().catch(() => {});
      refreshStok().catch(() => {});
      refreshSparepart().catch(() => {});
    };

    window.addEventListener("appbenk_sparepart_updated", handleSync);

    const interval = setInterval(handleSync, 10000);
    return () => {
      window.removeEventListener("appbenk_sparepart_updated", handleSync);
      clearInterval(interval);
    };
  }, []);

  const [editPembelian, setEditPembelian] = useState<PembelianSparepart | null>(null);
  const [formEdit, setFormEdit] = useState({
    sparepartId: "",
    supplier: "",
    tanggal: "",
    jumlah: 1,
    harga: 0,
  });
  const [hapusId, setHapusId] = useState<string | null>(null);

  const bukaEditPembelian = (p: PembelianSparepart) => {
    setEditPembelian(p);
    setFormEdit({
      sparepartId: p.sparepartId,
      supplier: p.supplier,
      tanggal: p.tanggal,
      jumlah: p.jumlah,
      harga: p.harga,
    });
  };

  const handleSimpanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPembelian) return;
    if (!formEdit.sparepartId.trim() || !formEdit.supplier.trim() || formEdit.jumlah <= 0 || formEdit.harga <= 0) {
      toast.error("Lengkapi sparepart, supplier, jumlah, dan harga beli.");
      return;
    }
    try {
      await ubahPembelian(editPembelian.id, formEdit);
      await refreshPembelian().catch(() => {});
      await refreshSparepart().catch(() => {});
      await refreshRiwayatStok().catch(() => {});
      toast.success("Pembelian berhasil diperbarui dan stok telah disesuaikan");
      setEditPembelian(null);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui data pembelian.");
    }
  };

  const handleKonfirmasiHapus = async () => {
    if (!hapusId) return;
    try {
      await hapusPembelian(hapusId);
      await refreshPembelian().catch(() => {});
      await refreshSparepart().catch(() => {});
      await refreshRiwayatStok().catch(() => {});
      toast.success("Data pembelian berhasil dihapus dan stok telah dikembalikan");
      setHapusId(null);
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus pembelian.");
    }
  };

  const namaPart = useMemo(
    () => new Map(sparepart.map((s) => [s.id, `${s.kode} · ${s.nama}`])),
    [sparepart],
  );

  const nomorPembelian = useMemo(
    () => new Map(pembelian.map((p) => [p.id, p.nomor])),
    [pembelian],
  );

  const sparepartOptions = useMemo(
    () =>
      sparepart.map((s) => ({
        id: s.id,
        value: s.id,
        label: `${s.kode} · ${s.nama}`,
        sublabel: `Stok: ${s.stok} ${s.satuan} | ${rupiah(s.harga)}`,
      })),
    [sparepart],
  );

  const supplierOptions = useMemo(
    () =>
      supplier.map((s) => ({
        id: s.id,
        value: s.nama,
        label: s.nama,
        sublabel: s.kontak ? `Kontak: ${s.kontak}` : undefined,
      })),
    [supplier],
  );

  const defaultPart = sparepart[0];
  const kosong = {
    sparepartId: defaultPart?.id ?? "",
    supplier: supplier[0]?.nama ?? "",
    tanggal: new Date().toISOString().slice(0, 10),
    jumlah: 1,
    harga: defaultPart?.harga ?? 0,
  };
  const [form, setForm] = useState(kosong);

  useEffect(() => {
    if ((!form.sparepartId || form.harga === 0) && sparepart.length > 0) {
      const sp = sparepart[0];
      setForm((prev) => ({
        ...prev,
        sparepartId: prev.sparepartId || sp.id,
        harga: prev.harga > 0 ? prev.harga : sp.harga,
      }));
    }
    if (!form.supplier && supplier.length > 0) {
      setForm((prev) => ({
        ...prev,
        supplier: prev.supplier || supplier[0].nama,
      }));
    }
  }, [sparepart, supplier]);

  // ==========================================================================
  // RETUR PEMBELIAN (RELASIONAL SUPPLIER -> PEMBELIAN -> BARANG -> RETUR)
  // ==========================================================================
  const [returSupplierId, setReturSupplierId] = useState<string>("");
  const [returPembelianId, setReturPembelianId] = useState<string>("");
  const [returSelectedPartId, setReturSelectedPartId] = useState<string>("");
  const [returJumlah, setReturJumlah] = useState<number>(1);
  const [returAlasan, setReturAlasan] = useState<string>(ALASAN_RETUR_OPTIONS[0]);
  const [returAlasanDetail, setReturAlasanDetail] = useState<string>("");
  const [returKeterangan, setReturKeterangan] = useState<string>("");
  const [returTanggal, setReturTanggal] = useState<string>(new Date().toISOString().slice(0, 10));

  // Dialog detail retur & dialog tolak
  const [detailRetur, setDetailRetur] = useState<ReturSparepart | null>(null);
  const [dialogTolak, setDialogTolak] = useState<ReturSparepart | null>(null);
  const [alasanPenolakan, setAlasanPenolakan] = useState<string>("");
  const [errPenolakan, setErrPenolakan] = useState<string>("");
  const [statusReturFilter, setStatusReturFilter] = useState<string>("semua");

  // Filter transaksi pembelian berdasarkan Supplier terpilih
  const purchasesBySupplier = useMemo(() => {
    if (!returSupplierId) return [];
    const supObj = supplier.find((s) => s.id === returSupplierId);
    const supNama = supObj?.nama?.trim().toLowerCase() || "";

    return pembelian.filter((p) => {
      if (p.supplierId && p.supplierId === returSupplierId) return true;
      if (p.supplier && supNama && p.supplier.toLowerCase().includes(supNama)) return true;
      if (p.supplier && supObj?.nama && p.supplier.toLowerCase() === supObj.nama.toLowerCase()) return true;
      return false;
    });
  }, [pembelian, returSupplierId, supplier]);

  // Daftar nomor pembelian unik untuk dropdown pilihan pembelian
  const uniquePembelianOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; nomor: string; tanggal: string; itemCount: number; total: number }[] = [];
    for (const p of purchasesBySupplier) {
      if (!seen.has(p.nomor)) {
        seen.add(p.nomor);
        const allItems = purchasesBySupplier.filter((x) => x.nomor === p.nomor);
        const sumTotal = allItems.reduce((acc, it) => acc + it.total, 0);
        list.push({
          id: p.id,
          nomor: p.nomor,
          tanggal: p.tanggal,
          itemCount: allItems.length,
          total: sumTotal,
        });
      }
    }
    return list;
  }, [purchasesBySupplier]);

  // Daftar item barang dari transaksi pembelian yang dipilih beserta kuota retur
  const purchaseItems = useMemo(() => {
    if (!returPembelianId) return [];
    const target = purchasesBySupplier.find(
      (p) => p.id === returPembelianId || p.nomor === returPembelianId,
    );
    if (!target) return [];

    const matchingRows = purchasesBySupplier.filter((p) => p.nomor === target.nomor);

    return matchingRows.map((pb) => {
      const sp = sparepart.find(
        (s) => s.id.toLowerCase() === pb.sparepartId.toLowerCase(),
      );

      // Hitung akumulasi jumlah yang sudah pernah diretur untuk item ini (kecuali yang ditolak)
      const sudahDiretur = returSparepart
        .filter(
          (r) =>
            (r.pembelianId === pb.id || r.nomorPembelian === pb.nomor) &&
            r.sparepartId.toLowerCase() === pb.sparepartId.toLowerCase() &&
            r.status !== "Ditolak",
        )
        .reduce((sum, r) => sum + r.jumlah, 0);

      const maxRetur = Math.max(0, pb.jumlah - sudahDiretur);

      return {
        pembelianId: pb.id,
        nomorPembelian: pb.nomor,
        sparepartId: pb.sparepartId,
        kode: sp?.kode || pb.sparepartId,
        nama: sp?.nama || pb.sparepartId,
        satuan: sp?.satuan || "Pcs",
        jumlahDibeli: pb.jumlah,
        sudahDiretur,
        maxRetur,
        hargaBeli: pb.harga,
        total: pb.total,
        stokGudang: sp?.stok ?? 0,
      };
    });
  }, [purchasesBySupplier, returPembelianId, sparepart, returSparepart]);

  // Detail sparepart yang sedang dipilih di form retur
  const selectedItemInfo = useMemo(() => {
    if (!returSelectedPartId) return null;
    return purchaseItems.find((it) => it.sparepartId === returSelectedPartId) || null;
  }, [purchaseItems, returSelectedPartId]);

  const handleSupplierChange = (supId: string) => {
    setReturSupplierId(supId);
    setReturPembelianId("");
    setReturSelectedPartId("");
    setReturJumlah(1);
  };

  const handlePembelianChange = (pembId: string) => {
    setReturPembelianId(pembId);
    setReturSelectedPartId("");
    setReturJumlah(1);
  };

  const handleSelectItemForRetur = (partId: string) => {
    setReturSelectedPartId(partId);
    const it = purchaseItems.find((x) => x.sparepartId === partId);
    if (it && it.maxRetur > 0) {
      setReturJumlah(1);
    } else {
      setReturJumlah(0);
    }
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sparepartId.trim()) {
      toast.error("Pilih atau masukkan sparepart yang dibeli.");
      return;
    }
    if (!form.supplier.trim()) {
      toast.error("Pilih atau masukkan nama supplier.");
      return;
    }
    if (form.jumlah <= 0) {
      toast.error("Jumlah pembelian minimal 1 unit.");
      return;
    }
    if (form.harga <= 0) {
      toast.error("Harga beli satuan harus lebih dari Rp 0.");
      return;
    }
    try {
      await catatPembelian({
        ...form,
        bengkelId: user?.bengkelId || "bengkel-001",
      });
      await refreshPembelian().catch(() => {});
      await refreshSparepart().catch(() => {});
      await refreshRiwayatStok().catch(() => {});
      toast.success("Catatan pembelian berhasil disimpan");
      const currentPart = sparepart.find((s) => s.id === form.sparepartId) || sparepart[0];
      setForm({
        sparepartId: currentPart?.id ?? "",
        supplier: form.supplier,
        tanggal: form.tanggal,
        jumlah: 1,
        harga: currentPart?.harga ?? 0,
      });
    } catch (err: any) {
      toast.error(err?.message || "Gagal mencatat pembelian.");
    }
  };

  const simpanRetur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returSupplierId) {
      toast.error("Pilih Supplier / PT tujuan retur.");
      return;
    }
    if (!returPembelianId) {
      toast.error("Pilih Referensi Transaksi Pembelian asalnya (Wajib).");
      return;
    }
    if (!returSelectedPartId || !selectedItemInfo) {
      toast.error("Pilih sparepart yang akan diretur dari tabel barang pembelian.");
      return;
    }
    if (selectedItemInfo.maxRetur <= 0) {
      toast.error("Seluruh kuota barang dari pembelian ini telah diretur.");
      return;
    }
    if (returJumlah <= 0) {
      toast.error("Jumlah retur harus minimal 1 unit.");
      return;
    }
    if (returJumlah > selectedItemInfo.maxRetur) {
      toast.error(
        `Jumlah retur (${returJumlah}) melebihi kuota maksimal yang boleh diretur (${selectedItemInfo.maxRetur} ${selectedItemInfo.satuan}).`,
      );
      return;
    }
    if (returAlasan === "Lainnya" && !returAlasanDetail.trim()) {
      toast.error("Penjelasan alasan retur wajib diisi jika memilih opsi 'Lainnya'.");
      return;
    }

    const supObj = supplier.find((s) => s.id === returSupplierId);
    try {
      const created = await catatReturSparepart({
        bengkelId: user?.bengkelId || "bengkel-001",
        supplierId: returSupplierId,
        supplier: supObj?.nama || "Supplier",
        pembelianId: selectedItemInfo.pembelianId,
        nomorPembelian: selectedItemInfo.nomorPembelian,
        sparepartId: selectedItemInfo.sparepartId,
        namaSparepart: selectedItemInfo.nama,
        jumlah: returJumlah,
        hargaSatuan: selectedItemInfo.hargaBeli,
        totalNilai: returJumlah * selectedItemInfo.hargaBeli,
        tanggal: returTanggal,
        alasan: returAlasan,
        alasanDetail: returAlasan === "Lainnya" ? returAlasanDetail.trim() : undefined,
        keterangan: returKeterangan.trim() || undefined,
        status: "Diajukan",
      });

      toast.success(`Pengajuan retur ${created.nomorRetur} berhasil dibuat dengan status Diajukan`);
      await refreshRetur().catch(() => {});
      setReturSelectedPartId("");
      setReturJumlah(1);
      setReturAlasan(ALASAN_RETUR_OPTIONS[0]);
      setReturAlasanDetail("");
      setReturKeterangan("");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mencatat pengajuan retur.");
    }
  };

  const handleUbahStatus = async (returId: string, statusBaru: StatusRetur, alasanTolak?: string) => {
    try {
      await ubahStatusRetur(returId, statusBaru, alasanTolak);
      await refreshRetur().catch(() => {});
      await refreshSparepart().catch(() => {});
      await refreshRiwayatStok().catch(() => {});
      toast.success(`Status retur berhasil diubah ke "${statusBaru}"`);
      if (detailRetur?.id === returId) {
        setDetailRetur((prev) =>
          prev
            ? {
                ...prev,
                status: statusBaru,
                alasanPenolakan: alasanTolak ?? prev.alasanPenolakan,
                stokDikurangi:
                  statusBaru === "Disetujui" || statusBaru === "Selesai" || statusBaru === "Barang Dikirim"
                    ? true
                    : prev.stokDikurangi,
              }
            : null,
        );
      }
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengubah status retur");
    }
  };

  const konfirmasiTolakRetur = async () => {
    if (!dialogTolak) return;
    if (!alasanPenolakan.trim()) {
      setErrPenolakan("Alasan penolakan retur wajib diisi.");
      return;
    }
    await handleUbahStatus(dialogTolak.id, "Ditolak", alasanPenolakan.trim());
    setDialogTolak(null);
    setAlasanPenolakan("");
    setErrPenolakan("");
  };

  const filteredRetur = useMemo(() => {
    return returSparepart.filter((r) => {
      if (statusReturFilter !== "semua" && r.status !== statusReturFilter) return false;
      return true;
    });
  }, [returSparepart, statusReturFilter]);

  const renderStatusReturBadge = (status: StatusRetur) => {
    switch (status) {
      case "Diajukan":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
            <Clock className="size-3" /> Diajukan
          </span>
        );
      case "Diproses":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
            <ArrowDownUp className="size-3" /> Diproses
          </span>
        );
      case "Disetujui":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="size-3" /> Disetujui
          </span>
        );
      case "Barang Dikirim":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20">
            <Truck className="size-3" /> Barang Dikirim
          </span>
        );
      case "Selesai":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400 ring-1 ring-green-600/20">
            <PackageCheck className="size-3" /> Selesai
          </span>
        );
      case "Ditolak":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive ring-1 ring-destructive/20">
            <XCircle className="size-3" /> Ditolak
          </span>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ==========================================================================
  // TAB PENGGUNAAN SPAREPART (DARI MODUL OPERASIONAL SERVIS)
  // ==========================================================================
  const [searchPenggunaan, setSearchPenggunaan] = useState<string>("");
  const [filterPenggunaanStatus, setFilterPenggunaanStatus] = useState<string>("semua");

  // Data penggunaan terpadu: dari store penggunaan dan servis items
  const unifiedPenggunaan = useMemo(() => {
    const list: Array<{
      id: string;
      tanggal: string;
      servisId: string;
      servisNomor: string;
      sparepartId: string;
      jumlah: number;
      mekanik: string;
      pelanggan: string;
      statusServis: string;
      keterangan: string;
    }> = [];

    const seenKey = new Set<string>();

    for (const p of penggunaan) {
      const srv = servis.find((s) => s.nomor === p.servisNomor || s.id === p.servisId);
      const key = `${p.servisNomor || p.servisId}-${p.sparepartId}-${p.jumlah}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        list.push({
          id: p.id,
          tanggal: p.tanggal,
          servisId: p.servisId,
          servisNomor: p.servisNomor || srv?.nomor || p.servisId,
          sparepartId: p.sparepartId,
          jumlah: p.jumlah,
          mekanik: p.mekanik || srv?.mekanik || "—",
          pelanggan: p.pelanggan || srv?.pelanggan || "Pelanggan",
          statusServis: p.statusServis || srv?.status || "Diproses",
          keterangan: p.keterangan || srv?.pekerjaan || "Penggunaan operasional servis",
        });
      }
    }

    for (const s of servis) {
      if (s.items && s.items.length > 0) {
        for (const it of s.items) {
          const key = `${s.nomor}-${it.sparepartId}-${it.jumlah}`;
          if (!seenKey.has(key)) {
            seenKey.add(key);
            list.push({
              id: `srv-${s.id}-${it.sparepartId}`,
              tanggal: s.tanggal,
              servisId: s.id,
              servisNomor: s.nomor,
              sparepartId: it.sparepartId,
              jumlah: it.jumlah,
              mekanik: s.mekanik || "—",
              pelanggan: s.pelanggan || "Pelanggan",
              statusServis: s.status || "Diproses",
              keterangan: s.pekerjaan || s.catatan || `Servis ${s.nomor}`,
            });
          }
        }
      }
    }

    list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return list;
  }, [penggunaan, servis]);

  const filteredPenggunaan = useMemo(() => {
    return unifiedPenggunaan.filter((p) => {
      if (filterPenggunaanStatus !== "semua" && p.statusServis !== filterPenggunaanStatus) return false;
      if (searchPenggunaan.trim()) {
        const q = searchPenggunaan.toLowerCase();
        const noSrv = p.servisNomor.toLowerCase();
        const part = (namaPart.get(p.sparepartId) || p.sparepartId).toLowerCase();
        const mek = p.mekanik.toLowerCase();
        const pel = p.pelanggan.toLowerCase();
        if (!noSrv.includes(q) && !part.includes(q) && !mek.includes(q) && !pel.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [unifiedPenggunaan, filterPenggunaanStatus, searchPenggunaan, namaPart]);

  const renderStatusServisBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("selesai dibayar") || s.includes("lunas")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
          <CheckCircle2 className="size-3" /> Lunas
        </span>
      );
    }
    if (s.includes("selesai")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400 ring-1 ring-green-600/20">
          <PackageCheck className="size-3" /> Selesai
        </span>
      );
    }
    if (s.includes("pembayaran")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
          <Clock className="size-3" /> Menunggu Pembayaran
        </span>
      );
    }
    if (s.includes("proses") || s.includes("kerja")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
          <ArrowDownUp className="size-3" /> Diproses
        </span>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  // ==========================================================================
  // TAB RIWAYAT STOK (KARTU MUTASI STOK TERPADU KRONOLOGIS)
  // ==========================================================================
  const [filterRiwayatPartId, setFilterRiwayatPartId] = useState<string>("semua");
  const [filterRiwayatTanggalMulai, setFilterRiwayatTanggalMulai] = useState<string>("");
  const [filterRiwayatTanggalAkhir, setFilterRiwayatTanggalAkhir] = useState<string>("");
  const [filterRiwayatJenis, setFilterRiwayatJenis] = useState<string>("semua");
  const [searchRiwayat, setSearchRiwayat] = useState<string>("");

  const currentStockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const sp of sparepart) {
      map.set(sp.id, sp.stok);
    }
    return map;
  }, [sparepart]);

  const unifiedMovements = useMemo(() => {
    type MovementItem = {
      id: string;
      tanggal: string;
      sparepartId: string;
      jenis: "Masuk" | "Keluar";
      referensi: string;
      jumlah: number;
      keterangan: string;
    };

    const list: MovementItem[] = [];
    const seenRefs = new Set<string>();

    for (const r of riwayatStok) {
      let ref = r.referensi || "";
      if (!ref) {
        const m = r.keterangan?.match(
          /\b(BL-\d{4}-\d+|PB-\d{4}-\d+|SRV-\d{4}-\d+|RET-\d{4}-\d+|TRX-\d{4}-\d+|[A-Z]{2,4}-\d+)\b/i,
        );
        if (m) ref = m[1].toUpperCase();
      }
      const uniqueKey = `${r.sparepartId}-${ref}-${r.jenis}-${r.jumlah}-${r.tanggal}`;
      seenRefs.add(uniqueKey);

      list.push({
        id: r.id,
        tanggal: r.tanggal,
        sparepartId: r.sparepartId,
        jenis: r.jenis,
        referensi: ref || "—",
        jumlah: r.jumlah,
        keterangan: r.keterangan,
      });
    }

    for (const p of pembelian) {
      const uniqueKey = `${p.sparepartId}-${p.nomor}-Masuk-${p.jumlah}-${p.tanggal}`;
      if (!seenRefs.has(uniqueKey)) {
        seenRefs.add(uniqueKey);
        list.push({
          id: `pb-${p.id}`,
          tanggal: p.tanggal,
          sparepartId: p.sparepartId,
          jenis: "Masuk",
          referensi: p.nomor,
          jumlah: p.jumlah,
          keterangan: `Pembelian dari ${p.supplier}`,
        });
      }
    }

    for (const u of penggunaan) {
      const ref = u.servisNomor || u.servisId;
      const uniqueKey = `${u.sparepartId}-${ref}-Keluar-${u.jumlah}-${u.tanggal}`;
      if (!seenRefs.has(uniqueKey)) {
        seenRefs.add(uniqueKey);
        list.push({
          id: `pg-${u.id}`,
          tanggal: u.tanggal,
          sparepartId: u.sparepartId,
          jenis: "Keluar",
          referensi: ref,
          jumlah: u.jumlah,
          keterangan: `Dipakai servis ${ref} (${u.pelanggan || "Pelanggan"})`,
        });
      }
    }

    for (const r of returSparepart) {
      if (
        r.stokDikurangi ||
        r.status === "Disetujui" ||
        r.status === "Selesai" ||
        r.status === "Barang Dikirim"
      ) {
        const uniqueKey = `${r.sparepartId}-${r.nomorRetur}-Keluar-${r.jumlah}-${r.tanggal}`;
        if (!seenRefs.has(uniqueKey)) {
          seenRefs.add(uniqueKey);
          list.push({
            id: `ret-${r.id}`,
            tanggal: r.tanggal,
            sparepartId: r.sparepartId,
            jenis: "Keluar",
            referensi: r.nomorRetur,
            jumlah: r.jumlah,
            keterangan: `Retur ke ${r.supplier} (${r.alasan})`,
          });
        }
      }
    }

    list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return list;
  }, [riwayatStok, pembelian, penggunaan, returSparepart]);

  const sisaStokMap = useMemo(() => {
    const sisaMap = new Map<string, number>();
    const runningStock = new Map<string, number>();

    for (const [partId, stok] of currentStockMap.entries()) {
      runningStock.set(partId, stok);
    }

    for (const m of unifiedMovements) {
      const cur = runningStock.get(m.sparepartId) ?? 0;
      sisaMap.set(m.id, cur);

      if (m.jenis === "Masuk") {
        runningStock.set(m.sparepartId, Math.max(0, cur - m.jumlah));
      } else {
        runningStock.set(m.sparepartId, cur + m.jumlah);
      }
    }

    return sisaMap;
  }, [unifiedMovements, currentStockMap]);

  const filteredRiwayatStok = useMemo(() => {
    return unifiedMovements.filter((m) => {
      if (filterRiwayatPartId && filterRiwayatPartId !== "semua" && m.sparepartId !== filterRiwayatPartId) return false;
      const isRetur = m.referensi?.toUpperCase().startsWith("RET") || m.keterangan?.toLowerCase().includes("retur");
      if (filterRiwayatJenis === "Masuk" && m.jenis !== "Masuk") return false;
      if (filterRiwayatJenis === "Keluar" && (m.jenis !== "Keluar" || isRetur)) return false;
      if (filterRiwayatJenis === "Retur" && !isRetur) return false;
      if (filterRiwayatTanggalMulai && m.tanggal < filterRiwayatTanggalMulai) return false;
      if (filterRiwayatTanggalAkhir && m.tanggal > filterRiwayatTanggalAkhir) return false;
      if (searchRiwayat.trim()) {
        const query = searchRiwayat.toLowerCase();
        const partName = (namaPart.get(m.sparepartId) || m.sparepartId).toLowerCase();
        const ref = m.referensi.toLowerCase();
        const ket = m.keterangan.toLowerCase();
        if (!partName.includes(query) && !ref.includes(query) && !ket.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [
    unifiedMovements,
    filterRiwayatPartId,
    filterRiwayatJenis,
    filterRiwayatTanggalMulai,
    filterRiwayatTanggalAkhir,
    searchRiwayat,
    namaPart,
  ]);

  const statsRiwayat = useMemo(() => {
    let masuk = 0;
    let keluarServis = 0;
    let keluarRetur = 0;
    for (const m of unifiedMovements) {
      const isRetur = m.referensi?.toUpperCase().startsWith("RET") || m.keterangan?.toLowerCase().includes("retur");
      if (m.jenis === "Masuk") {
        masuk += m.jumlah;
      } else if (isRetur) {
        keluarRetur += m.jumlah;
      } else {
        keluarServis += m.jumlah;
      }
    }
    return {
      totalMutasi: unifiedMovements.length,
      stokMasuk: masuk,
      stokKeluar: keluarServis + keluarRetur,
      stokKeluarServis: keluarServis,
      stokRetur: keluarRetur,
      sparepartAktif: new Set(unifiedMovements.map((m) => m.sparepartId)).size,
    };
  }, [unifiedMovements]);

  const statsPenggunaan = useMemo(() => {
    let totalQty = 0;
    const distinctServis = new Set<string>();
    for (const p of unifiedPenggunaan) {
      totalQty += p.jumlah;
      if (p.servisNomor) distinctServis.add(p.servisNomor);
    }
    return {
      totalPenggunaan: unifiedPenggunaan.length,
      totalQty,
      totalServis: distinctServis.size,
    };
  }, [unifiedPenggunaan]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshStok(),
        refreshPembelian(),
        refreshRiwayatStok(),
        refreshPenggunaan(),
        refreshSparepart(),
      ]);
      toast.success("Data inventaris & mutasi stok berhasil diperbarui");
    } catch {
      toast.error("Gagal memperbarui data inventaris");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTanggalWaktu = (tgl?: string, waktu?: string) => {
    if (!tgl) return "—";
    const dateFormatted = tanggalPanjang(tgl);
    if (waktu) return `${dateFormatted} · ${waktu}`;
    if (tgl.includes("T")) {
      try {
        const d = new Date(tgl);
        if (!isNaN(d.getTime())) {
          const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          return `${dateFormatted} · ${timeStr}`;
        }
      } catch {}
    }
    return dateFormatted;
  };

  return (
    <>
      <PageHeader
        title="Catatan Stok"
        description="Catat pembelian sparepart dari supplier, riwayat pergerakan stok, dan penggunaan per servis."
      />

      <Tabs defaultValue="pembelian">
        <TabsList className="grid grid-cols-2 sm:flex">
          <TabsTrigger value="pembelian" className="gap-1.5">
            <ShoppingCart className="size-3.5" /> Pembelian
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="gap-1.5">
            <ArrowDownUp className="size-3.5" /> Riwayat Stok
          </TabsTrigger>
          <TabsTrigger value="penggunaan" className="gap-1.5">
            <PackageCheck className="size-3.5" /> Penggunaan
          </TabsTrigger>
          <TabsTrigger value="retur" className="gap-1.5">
            <RotateCcw className="size-3.5" /> Pengembalian (Retur)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pembelian" className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="size-4 text-primary" /> Catat Pembelian
              </CardTitle>
              <CardDescription>
                Input transaksi pembelian sparepart baru dari distributor / supplier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={simpan} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>
                    Pilih Sparepart <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.sparepartId}
                    onValueChange={(val) => {
                      const sp = sparepart.find((s) => s.id === val);
                      setForm((prev) => ({
                        ...prev,
                        sparepartId: val,
                        harga: sp ? sp.harga : prev.harga,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih sparepart..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sparepart.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.kode} · {s.nama} ({rupiah(s.harga)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Supplier / Distributor <span className="text-destructive">*</span>
                  </Label>
                  <ComboboxInput
                    value={form.supplier}
                    onChange={(v) => setForm((prev) => ({ ...prev, supplier: v }))}
                    onSelectOption={(opt) => setForm((prev) => ({ ...prev, supplier: opt.label }))}
                    options={supplierOptions}
                    placeholder="Pilih atau ketik nama supplier..."
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Tanggal</Label>
                    <Input
                      type="date"
                      value={form.tanggal}
                      onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jumlah</Label>
                    <NumberInput
                      value={form.jumlah}
                      onChange={(v) => setForm({ ...form, jumlah: Math.max(1, v) })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Harga Beli / Satuan</Label>
                  <NumberInput
                    value={form.harga}
                    onChange={(v) => setForm({ ...form, harga: v })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2 text-sm">
                  <span className="font-medium">Total</span>
                  <span className="font-display font-bold text-primary">{rupiah(form.jumlah * form.harga)}</span>
                </div>

                <Button type="submit" className="w-full gap-2">
                  <PackageCheck className="size-4" /> Simpan Pembelian
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daftar Pembelian</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {pembelian.length === 0 ? (
                <EmptyState
                  title="Belum ada pembelian"
                  description="Pembelian sparepart akan tampil di sini."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No.</TableHead>
                        <TableHead>Sparepart</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center w-24">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pembelian.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nomor}</TableCell>
                          <TableCell>{namaPart.get(p.sparepartId) ?? p.sparepartId ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{p.supplier}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {tanggalPanjang(p.tanggal)}
                          </TableCell>
                          <TableCell className="text-right">{p.jumlah}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {rupiah(p.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                title="Edit Pembelian"
                                onClick={() => bukaEditPembelian(p)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                title="Hapus Pembelian"
                                onClick={() => setHapusId(p.id)}
                              >
                                <Trash2 className="size-3.5" />
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
        </TabsContent>

        <TabsContent value="riwayat" className="mt-4 space-y-4">
          {/* STATS SUMMARY CARDS */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ArrowDownUp className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Total Catatan Mutasi</p>
                  <p className="text-lg font-bold">{statsRiwayat.totalMutasi} Log</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Total Stok Masuk</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    +{statsRiwayat.stokMasuk} Unit
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Stok Keluar Servis</p>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    -{statsRiwayat.stokKeluarServis} Unit
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <RotateCcw className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Retur Supplier</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    -{statsRiwayat.stokRetur} Unit
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Boxes className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Master Sparepart</p>
                  <p className="text-lg font-bold">{sparepart.length} Item</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowDownUp className="size-4 text-primary" /> Kartu Stok & Audit Mutasi Terpadu
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mt-1">
                  <span>Kronologis riwayat pergerakan stok:</span>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="size-3" /> Pembelian (+)
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                    <TrendingDown className="size-3" /> Pemakaian Servis (-)
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                    <RotateCcw className="size-3" /> Retur Supplier (-)
                  </span>
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
                disabled={isRefreshing}
                className="gap-1.5 self-start md:self-auto text-xs"
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Segarkan Data
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* FILTER BAR */}
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Filter Sparepart</Label>
                  <Select value={filterRiwayatPartId} onValueChange={setFilterRiwayatPartId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Semua Sparepart" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua Sparepart</SelectItem>
                      {sparepart.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.kode} · {sp.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tipe Mutasi</Label>
                  <Select value={filterRiwayatJenis} onValueChange={setFilterRiwayatJenis}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua Mutasi</SelectItem>
                      <SelectItem value="Masuk">Masuk (Pembelian)</SelectItem>
                      <SelectItem value="Keluar">Keluar (Servis)</SelectItem>
                      <SelectItem value="Retur">Pengembalian (Retur Supplier)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Dari Tanggal</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filterRiwayatTanggalMulai}
                    onChange={(e) => setFilterRiwayatTanggalMulai(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sampai Tanggal</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filterRiwayatTanggalAkhir}
                    onChange={(e) => setFilterRiwayatTanggalAkhir(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cari Kata Kunci</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari sparepart/ref..."
                      className="h-8 pl-8 text-xs"
                      value={searchRiwayat}
                      onChange={(e) => setSearchRiwayat(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {((filterRiwayatPartId !== "" && filterRiwayatPartId !== "semua") ||
                filterRiwayatJenis !== "semua" ||
                filterRiwayatTanggalMulai ||
                filterRiwayatTanggalAkhir ||
                searchRiwayat) && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    Menampilkan <strong>{filteredRiwayatStok.length}</strong> dari {unifiedMovements.length} mutasi
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFilterRiwayatPartId("semua");
                      setFilterRiwayatJenis("semua");
                      setFilterRiwayatTanggalMulai("");
                      setFilterRiwayatTanggalAkhir("");
                      setSearchRiwayat("");
                    }}
                  >
                    <X className="size-3" /> Reset Filter
                  </Button>
                </div>
              )}

              {/* TABLE */}
              {filteredRiwayatStok.length === 0 ? (
                <EmptyState
                  title="Belum ada pergerakan stok"
                  description={
                    filterRiwayatPartId !== "semua" || searchRiwayat || filterRiwayatTanggalMulai
                      ? "Tidak ada mutasi stok yang sesuai dengan filter pencarian."
                      : "Log mutasi stok masuk/keluar akan tampil secara otomatis di sini."
                  }
                />
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Tanggal & Waktu</TableHead>
                        <TableHead>Kode & Nama Sparepart</TableHead>
                        <TableHead>Tipe Mutasi</TableHead>
                        <TableHead>No. Referensi</TableHead>
                        <TableHead className="text-right">Kuantitas</TableHead>
                        <TableHead className="text-right">Stok Sisa (Balance)</TableHead>
                        <TableHead>Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRiwayatStok.map((m) => {
                        const sisa = sisaStokMap.get(m.id);
                        return (
                          <TableRow key={m.id} className="hover:bg-muted/30">
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {formatTanggalWaktu(m.tanggal)}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-foreground">
                                {namaPart.get(m.sparepartId) || m.sparepartId}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const isRetur =
                                  m.referensi?.toUpperCase().startsWith("RET") ||
                                  m.keterangan?.toLowerCase().includes("retur");
                                if (m.jenis === "Masuk") {
                                  return (
                                    <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 text-xs">
                                      <TrendingUp className="size-3" /> Masuk
                                    </Badge>
                                  );
                                }
                                if (isRetur) {
                                  return (
                                    <Badge className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20 text-xs">
                                      <RotateCcw className="size-3" /> Retur Supplier
                                    </Badge>
                                  );
                                }
                                return (
                                  <Badge className="gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/20 text-xs">
                                    <TrendingDown className="size-3" /> Keluar
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {m.referensi}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono font-semibold ${
                                m.jenis === "Masuk"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {m.jenis === "Masuk" ? `+${m.jumlah}` : `-${m.jumlah}`}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-foreground">
                              {sisa !== undefined ? sisa : "—"}
                            </TableCell>
                            <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={m.keterangan}>
                              {m.keterangan}
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
        </TabsContent>

        <TabsContent value="penggunaan" className="mt-4 space-y-4">
          {/* STATS SUMMARY CARDS */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <PackageCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Total Sparepart Terpakai</p>
                  <p className="text-lg font-bold">{statsPenggunaan.totalQty} Unit</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Pekerjaan Servis Terkait</p>
                  <p className="text-lg font-bold">{statsPenggunaan.totalServis} Servis</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Sinkronisasi Database</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Otomatis dari Operasional Servis
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Penggunaan Sparepart per Servis</CardTitle>
                <CardDescription>
                  Daftar mutasi stok keluar yang tercatat otomatis dari pekerjaan dan item servis pelanggan.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await refreshPenggunaan().catch(() => {});
                  toast.success("Data penggunaan sparepart berhasil diperbarui");
                }}
                className="gap-1.5 self-start md:self-auto text-xs"
              >
                <RefreshCw className="size-3.5" />
                Segarkan Data
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* FILTER & SEARCH */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari No. Servis, sparepart, mekanik, pelanggan..."
                    className="pl-8 text-xs"
                    value={searchPenggunaan}
                    onChange={(e) => setSearchPenggunaan(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={filterPenggunaanStatus} onValueChange={setFilterPenggunaanStatus}>
                    <SelectTrigger className="h-9 w-44 text-xs">
                      <SelectValue placeholder="Status Servis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua Status Servis</SelectItem>
                      <SelectItem value="Diproses">Diproses</SelectItem>
                      <SelectItem value="Menunggu Pembayaran">Menunggu Pembayaran</SelectItem>
                      <SelectItem value="Selesai">Selesai</SelectItem>
                      <SelectItem value="Selesai Dibayar">Selesai Dibayar / Lunas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredPenggunaan.length === 0 ? (
                <EmptyState
                  title="Belum ada data pemakaian sparepart"
                  description={
                    searchPenggunaan || filterPenggunaanStatus !== "semua"
                      ? "Tidak ada data pemakaian yang cocok dengan pencarian."
                      : "Pemakaian sparepart akan tercatat otomatis saat admin/mekanik menambahkan sparepart pada transaksi servis pelanggan."
                  }
                />
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Tanggal</TableHead>
                        <TableHead>No. Servis / SPK</TableHead>
                        <TableHead>Sparepart Digunakan</TableHead>
                        <TableHead>Pelanggan & Mekanik</TableHead>
                        <TableHead className="text-right">Jumlah Keluar</TableHead>
                        <TableHead>Status Servis</TableHead>
                        <TableHead>Keterangan Pekerjaan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPenggunaan.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {tanggalPanjang(p.tanggal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs font-semibold">
                              {p.servisNomor}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {namaPart.get(p.sparepartId) ?? p.sparepartId ?? "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div className="font-medium text-foreground">{p.pelanggan || "—"}</div>
                              <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                <UserCheck className="size-3" /> Mekanik: {p.mekanik || "—"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            -{p.jumlah} Unit
                          </TableCell>
                          <TableCell>
                            {renderStatusServisBadge(p.statusServis)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={p.keterangan}>
                            {p.keterangan}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retur" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
            {/* FORM PENGAJUAN RETUR */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <RotateCcw className="size-4 text-primary" /> Pengajuan Retur Pembelian ke Supplier
                </CardTitle>
                <CardDescription>
                  Ajukan pengembalian sparepart yang terhubung langsung ke transaksi pembelian asalnya.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={simpanRetur} className="space-y-4">
                  {/* STEP 1: PILIH SUPPLIER */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-primary" />
                      1. Pilih Supplier / PT Tujuan Retur <span className="text-destructive">*</span>
                    </Label>
                    <Select value={returSupplierId} onValueChange={handleSupplierChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Supplier / PT..." />
                      </SelectTrigger>
                      <SelectContent>
                        {supplier.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nama} {s.kontak ? `(${s.kontak})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* STEP 2: PILIH REFERENSI TRANSAKSI PEMBELIAN */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <FileText className="size-3.5 text-primary" />
                      2. Referensi Faktur / Pembelian Asal <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={returPembelianId}
                      onValueChange={handlePembelianChange}
                      disabled={!returSupplierId || uniquePembelianOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !returSupplierId
                              ? "Pilih supplier terlebih dahulu"
                              : uniquePembelianOptions.length === 0
                                ? "Belum ada riwayat pembelian dari supplier ini"
                                : "Pilih faktur pembelian asal..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {uniquePembelianOptions.map((pb) => (
                          <SelectItem key={pb.id} value={pb.id}>
                            {pb.nomor} · {tanggalPanjang(pb.tanggal)} ({pb.itemCount} item · {rupiah(pb.total)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {returSupplierId && uniquePembelianOptions.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Tidak ditemukan riwayat pembelian untuk supplier ini. Pastikan pembelian sudah dicatat dengan nama supplier yang sesuai.
                      </p>
                    )}
                  </div>

                  {/* STEP 3: DAFTAR BARANG DARI PEMBELIAN YANG DIPILIH */}
                  {returPembelianId && purchaseItems.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          3. Pilih Sparepart Yang Diretur
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {purchaseItems.length} item ditemukan
                        </span>
                      </div>
                      <div className="space-y-2">
                        {purchaseItems.map((item) => {
                          const isSelected = returSelectedPartId === item.sparepartId;
                          const isExhausted = item.maxRetur <= 0;

                          return (
                            <div
                              key={item.sparepartId}
                              className={`flex flex-col gap-2 rounded-md border p-2.5 text-sm transition-all sm:flex-row sm:items-center sm:justify-between ${
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : isExhausted
                                    ? "border-dashed border-border/60 bg-muted/40 opacity-60"
                                    : "border-border bg-card hover:border-primary/50"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-primary">{item.kode}</span>
                                  <span className="font-medium text-foreground">{item.nama}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span>Beli: {item.jumlahDibeli} {item.satuan}</span>
                                  <span>Harga: {rupiah(item.hargaBeli)}</span>
                                  <span>Diretur: {item.sudahDiretur} {item.satuan}</span>
                                  <span className="font-semibold text-foreground">
                                    Sisa Kuota: <span className={item.maxRetur > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-destructive"}>{item.maxRetur} {item.satuan}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-end sm:shrink-0">
                                {isExhausted ? (
                                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                    Kuota Habis
                                  </Badge>
                                ) : isSelected ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="default"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => setReturSelectedPartId("")}
                                  >
                                    <Check className="size-3.5" /> Terpilih
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleSelectItemForRetur(item.sparepartId)}
                                  >
                                    Pilih
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 4: FORM DETAIL RETUR (HANYA MUNCUL JIKA SUDAH PILIH BARANG) */}
                  {selectedItemInfo && (
                    <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/[0.02] p-3.5">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          4. Rincian & Alasan Retur
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Maksimal: {selectedItemInfo.maxRetur} {selectedItemInfo.satuan}
                        </Badge>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Tanggal Pengajuan</Label>
                          <Input
                            type="date"
                            value={returTanggal}
                            onChange={(e) => setReturTanggal(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center justify-between">
                            <span>Jumlah Retur</span>
                            <span className="text-xs text-muted-foreground">
                              Max: {selectedItemInfo.maxRetur}
                            </span>
                          </Label>
                          <NumberInput
                            value={returJumlah}
                            onChange={(v) => {
                              const clamped = Math.min(Math.max(1, v), selectedItemInfo.maxRetur);
                              setReturJumlah(clamped);
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Alasan Retur <span className="text-destructive">*</span></Label>
                        <Select value={returAlasan} onValueChange={setReturAlasan}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALASAN_RETUR_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {returAlasan === "Lainnya" && (
                        <div className="space-y-1.5">
                          <Label>Penjelasan Alasan Retur <span className="text-destructive">*</span></Label>
                          <Input
                            value={returAlasanDetail}
                            onChange={(e) => setReturAlasanDetail(e.target.value)}
                            placeholder="Jelaskan alasan retur secara spesifik..."
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label>Keterangan Tambahan (Opsional)</Label>
                        <Textarea
                          value={returKeterangan}
                          onChange={(e) => setReturKeterangan(e.target.value)}
                          placeholder="Contoh: Dus barang penyok, nomor seri fisik tidak terbaca, dll."
                          className="h-16 resize-none text-xs"
                        />
                      </div>

                      {/* TOTAL NILAI RETUR & NOTICE */}
                      <div className="rounded-md bg-muted/60 p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Harga Satuan Beli:</span>
                          <span className="font-mono">{rupiah(selectedItemInfo.hargaBeli)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span>Total Nilai Retur:</span>
                          <span className="font-display font-bold text-primary">
                            {rupiah(returJumlah * selectedItemInfo.hargaBeli)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                          Status retur awal adalah <strong>Diajukan</strong>. Stok di gudang <strong>TIDAK</strong> berkurang sampai pengajuan disetujui oleh admin/supplier.
                        </p>
                      </div>

                      <Button type="submit" className="w-full gap-2 font-medium shadow-sm">
                        <RotateCcw className="size-4" /> Ajukan Retur Pembelian
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* TABEL DAFTAR PENGEMBALIAN (RETUR) */}
            <Card>
              <CardHeader className="pb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Riwayat Retur Pembelian</CardTitle>
                  <CardDescription>
                    Kelola status persetujuan dan pengiriman barang retur ke supplier.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusReturFilter} onValueChange={setStatusReturFilter}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua Status</SelectItem>
                      {STATUS_RETUR_OPTIONS.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                {filteredRetur.length === 0 ? (
                  <EmptyState
                    title="Belum ada data retur"
                    description={
                      statusReturFilter !== "semua"
                        ? `Tidak ada data retur dengan status "${statusReturFilter}".`
                        : "Pengembalian sparepart ke supplier yang dicatat akan tampil di sini."
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No. Retur</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>No. Beli</TableHead>
                          <TableHead>Sparepart</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                          <TableHead className="text-right">Total Nilai</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRetur.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs font-semibold text-primary">
                              {r.nomorRetur || r.id}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                              {tanggalPanjang(r.tanggal)}
                            </TableCell>
                            <TableCell className="font-medium text-xs">
                              {r.supplier || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {r.nomorPembelian || (r.pembelianId ? nomorPembelian.get(r.pembelianId) ?? r.pembelianId : "—")}
                            </TableCell>
                            <TableCell className="text-xs">
                              {r.namaSparepart || namaPart.get(r.sparepartId) || r.sparepartId}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-xs whitespace-nowrap">
                              {r.jumlah}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold whitespace-nowrap">
                              {rupiah(r.totalNilai || (r.jumlah * (r.hargaSatuan || 0)))}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {renderStatusReturBadge(r.status)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="Lihat Detail & Kelola Status"
                                onClick={() => setDetailRetur(r)}
                              >
                                <Eye className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG EDIT PEMBELIAN */}
      <Dialog open={!!editPembelian} onOpenChange={(open) => !open && setEditPembelian(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pembelian Sparepart ({editPembelian?.nomor})</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSimpanEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Sparepart</Label>
              <ComboboxInput
                value={formEdit.sparepartId}
                onChange={(v) => {
                  const sp = sparepart.find(
                    (s) => s.id === v || s.nama.toLowerCase() === v.toLowerCase(),
                  );
                  setFormEdit({
                    ...formEdit,
                    sparepartId: v,
                    harga: formEdit.harga === 0 && sp ? sp.harga : formEdit.harga,
                  });
                }}
                options={sparepartOptions}
                placeholder="Pilih sparepart..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input
                value={formEdit.supplier}
                onChange={(e) => setFormEdit({ ...formEdit, supplier: e.target.value })}
                placeholder="Nama Supplier"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={formEdit.tanggal}
                  onChange={(e) => setFormEdit({ ...formEdit, tanggal: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah</Label>
                <NumberInput
                  value={formEdit.jumlah}
                  onChange={(v) => setFormEdit({ ...formEdit, jumlah: v })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Harga Beli / Satuan</Label>
              <NumberInput
                value={formEdit.harga}
                onChange={(v) => setFormEdit({ ...formEdit, harga: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2 text-sm">
              <span className="font-medium">Total Baru</span>
              <span className="font-display font-bold">{rupiah(formEdit.jumlah * formEdit.harga)}</span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPembelian(null)}>
                Batal
              </Button>
              <Button type="submit">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DIALOG HAPUS PEMBELIAN */}
      <ConfirmDialog
        open={!!hapusId}
        onOpenChange={(open) => !open && setHapusId(null)}
        title="Hapus Catatan Pembelian?"
        description="Apakah Anda yakin ingin menghapus catatan pembelian ini dari daftar?"
        onConfirm={handleKonfirmasiHapus}
      />

      {/* DIALOG DETAIL RETUR */}
      <Dialog open={!!detailRetur} onOpenChange={(open) => !open && setDetailRetur(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-4">
              <DialogTitle className="flex items-center gap-2 text-base">
                <RotateCcw className="size-4 text-primary" />
                Detail Retur: {detailRetur?.nomorRetur || detailRetur?.id}
              </DialogTitle>
              {detailRetur && renderStatusReturBadge(detailRetur.status)}
            </div>
            <DialogDescription>
              Informasi lengkap pengembalian sparepart ke supplier dan alur persetujuan.
            </DialogDescription>
          </DialogHeader>

          {detailRetur && (
            <div className="space-y-4 py-2 text-sm">
              {/* SUPPLIER & FAKTUR PEMBELIAN */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
                <div>
                  <span className="text-xs text-muted-foreground block">Supplier / PT Tujuan:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Building2 className="size-3.5 text-primary" />
                    {detailRetur.supplier || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Faktur Pembelian Asal:</span>
                  <span className="font-mono font-semibold text-foreground mt-0.5 block">
                    {detailRetur.nomorPembelian || (detailRetur.pembelianId ? nomorPembelian.get(detailRetur.pembelianId) ?? detailRetur.pembelianId : "—")}
                  </span>
                </div>
              </div>

              {/* SPAREPART & TOTAL */}
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <span className="text-xs text-muted-foreground block">Sparepart yang Diretur:</span>
                    <span className="font-medium text-foreground">
                      {detailRetur.namaSparepart || namaPart.get(detailRetur.sparepartId) || detailRetur.sparepartId}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {detailRetur.jumlah} unit
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground">Harga Beli Satuan:</span>
                    <p className="font-mono font-medium">{rupiah(detailRetur.hargaSatuan || 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Nilai Retur:</span>
                    <p className="font-mono font-bold text-primary">
                      {rupiah(detailRetur.totalNilai || (detailRetur.jumlah * (detailRetur.hargaSatuan || 0)))}
                    </p>
                  </div>
                </div>
              </div>

              {/* ALASAN & KETERANGAN */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-foreground">Alasan Pengembalian:</span>
                  <p className="text-muted-foreground mt-0.5">{detailRetur.alasan}</p>
                </div>
                {detailRetur.alasanDetail && (
                  <div>
                    <span className="font-semibold text-foreground">Penjelasan Spesifik:</span>
                    <p className="text-muted-foreground mt-0.5">{detailRetur.alasanDetail}</p>
                  </div>
                )}
                {detailRetur.keterangan && (
                  <div>
                    <span className="font-semibold text-foreground">Keterangan Tambahan:</span>
                    <p className="text-muted-foreground mt-0.5">{detailRetur.keterangan}</p>
                  </div>
                )}
              </div>

              {/* STATUS PEMOTONGAN STOK */}
              <div className="pt-1">
                {detailRetur.stokDikurangi ? (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    <span>Stok fisik gudang <strong>telah dipotong (-{detailRetur.jumlah})</strong> dan dicatat pada Riwayat Stok Masuk/Keluar.</span>
                  </div>
                ) : detailRetur.status === "Ditolak" ? (
                  <div className="flex flex-col gap-1 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive ring-1 ring-destructive/20">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <XCircle className="size-4 shrink-0" />
                      Retur Ditolak
                    </div>
                    <span>Alasan penolakan: {detailRetur.alasanPenolakan || "Tidak ada rincian alasan penolakan."}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                    <span>Stok fisik gudang <strong>belum dipotong</strong>. Stok akan berkurang otomatis saat retur disetujui.</span>
                  </div>
                )}
              </div>

              {/* WORKFLOW UPDATE STATUS */}
              <div className="border-t pt-3 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Perbarui Status Alur Retur:
                </span>
                <div className="flex flex-wrap gap-2">
                  {detailRetur.status === "Diajukan" && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => handleUbahStatus(detailRetur.id, "Diproses")}
                      >
                        <ArrowDownUp className="size-3.5" /> Proses Pengajuan
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleUbahStatus(detailRetur.id, "Disetujui")}
                      >
                        <CheckCircle2 className="size-3.5" /> Setujui & Potong Stok
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="gap-1 text-xs"
                        onClick={() => setDialogTolak(detailRetur)}
                      >
                        <XCircle className="size-3.5" /> Tolak Retur
                      </Button>
                    </>
                  )}

                  {detailRetur.status === "Diproses" && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleUbahStatus(detailRetur.id, "Disetujui")}
                      >
                        <CheckCircle2 className="size-3.5" /> Setujui & Potong Stok
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="gap-1 text-xs"
                        onClick={() => setDialogTolak(detailRetur)}
                      >
                        <XCircle className="size-3.5" /> Tolak Retur
                      </Button>
                    </>
                  )}

                  {detailRetur.status === "Disetujui" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="gap-1 text-xs bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleUbahStatus(detailRetur.id, "Barang Dikirim")}
                    >
                      <Truck className="size-3.5" /> Kirim Barang ke Supplier
                    </Button>
                  )}

                  {detailRetur.status === "Barang Dikirim" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="gap-1 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleUbahStatus(detailRetur.id, "Selesai")}
                    >
                      <PackageCheck className="size-3.5" /> Selesaikan Retur (Selesai)
                    </Button>
                  )}

                  {(detailRetur.status === "Selesai" || detailRetur.status === "Ditolak") && (
                    <p className="text-xs text-muted-foreground italic">
                      Retur ini telah berada pada status akhir ({detailRetur.status}) dan tidak dapat diubah lagi.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailRetur(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TOLAK RETUR */}
      <Dialog open={!!dialogTolak} onOpenChange={(open) => !open && setDialogTolak(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-4" /> Tolak Retur: {dialogTolak?.nomorRetur || dialogTolak?.id}
            </DialogTitle>
            <DialogDescription>
              Wajib memberikan alasan penolakan retur sparepart untuk dokumentasi bengkel dan supplier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="alasanPenolakan">
                Alasan Penolakan <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="alasanPenolakan"
                value={alasanPenolakan}
                onChange={(e) => {
                  setAlasanPenolakan(e.target.value);
                  if (errPenolakan) setErrPenolakan("");
                }}
                placeholder="Contoh: Melebihi batas waktu garansi retur supplier (maksimal 7 hari), segel barang rusak oleh mekanik..."
                className="h-24 resize-none text-xs"
              />
              {errPenolakan && (
                <p className="text-xs font-medium text-destructive">{errPenolakan}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogTolak(null);
                setAlasanPenolakan("");
                setErrPenolakan("");
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-1"
              onClick={konfirmasiTolakRetur}
            >
              <XCircle className="size-4" /> Konfirmasi Tolak Retur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
