import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Wrench,
  Search,
  RotateCcw,
  Building2,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ComboboxInput, type ComboboxOption } from "@/components/combobox-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useStore, type Mekanik } from "@/lib/store";

export const Route = createFileRoute("/_shell/admin/mekanik")({
  head: () => ({
    meta: [
      { title: "Kelola Mekanik — AppBenk" },
      {
        name: "description",
        content:
          "Kelola master data mekanik bengkel, spesialisasi, nomor kontak, dan status keaktifan teknisi.",
      },
      { property: "og:title", content: "Kelola Mekanik — AppBenk" },
      {
        property: "og:description",
        content: "Master data mekanik bengkel multi-cabang terpadu.",
      },
    ],
  }),
  component: KelolaMekanikAdmin,
});

const DAFTAR_SPESIALISASI = [
  "Mesin",
  "Kelistrikan",
  "Rem",
  "Kaki-kaki",
  "AC",
  "Ban",
  "Injeksi & ECU",
  "Transmisi",
  "Body & Cat",
  "Servis Ringan & Tune Up",
  "Umum",
];

const kosongMekanik = {
  nama: "",
  telepon: "",
  spesialisasi: "Mesin",
  status: "Aktif" as "Aktif" | "Tidak Aktif",
};

function KelolaMekanikAdmin() {
  const { user } = useAuth();
  const {
    mekanik,
    bengkel,
    servis,
    simpanMekanik,
    ubahStatusMekanik,
    hapusMekanik,
    refreshMekanik,
  } = useStore();

  // Multi-bengkel isolation: Bengkel aktif yang dikelola admin saat ini
  const bengkelAktifId = user?.bengkelId || "bengkel-001";
  const bengkelData = bengkel.find((b) => b.id === bengkelAktifId);
  const namaBengkel = bengkelData ? bengkelData.nama : "Bengkel Pusat";

  useEffect(() => {
    refreshMekanik(bengkelAktifId);
  }, [bengkelAktifId, refreshMekanik]);

  // Filter mekanik hanya untuk bengkel ini (ISOLASI MULTI-BENGKEL)
  const mekanikBengkel = useMemo(() => {
    return mekanik.filter((m) => !m.bengkelId || m.bengkelId === bengkelAktifId);
  }, [mekanik, bengkelAktifId]);

  // Daftar opsi spesialisasi untuk combobox modal
  const comboboxOptions = useMemo<ComboboxOption[]>(() => {
    const set = new Set<string>(DAFTAR_SPESIALISASI);
    mekanikBengkel.forEach((m) => {
      if (m.spesialisasi?.trim()) set.add(m.spesialisasi.trim());
    });
    return Array.from(set).map((s) => ({
      id: s,
      value: s,
      label: s,
    }));
  }, [mekanikBengkel]);

  // Daftar opsi spesialisasi dinamis untuk filter dropdown
  const opsiSpesialisasiFilter = useMemo(() => {
    const set = new Set<string>();
    DAFTAR_SPESIALISASI.forEach((s) => set.add(s));
    mekanikBengkel.forEach((m) => {
      if (m.spesialisasi?.trim()) set.add(m.spesialisasi.trim());
    });
    return Array.from(set);
  }, [mekanikBengkel]);

  // Hitung jumlah servis aktif saat ini per mekanik
  const pengerjaanAktifMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of servis) {
      if (s.status === "Diproses" || s.status === "Menunggu") {
        if (s.mekanik) {
          map.set(s.mekanik, (map.get(s.mekanik) ?? 0) + 1);
        }
      }
    }
    return map;
  }, [servis]);

  // Filter & Search State
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [spesialisasiFilter, setSpesialisasiFilter] = useState("semua");

  // Dialog State
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Mekanik | null>(null);
  const [form, setForm] = useState(kosongMekanik);
  const [hapus, setHapus] = useState<Mekanik | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isFiltered = q.trim() !== "" || statusFilter !== "semua" || spesialisasiFilter !== "semua";

  const resetFilter = () => {
    setQ("");
    setStatusFilter("semua");
    setSpesialisasiFilter("semua");
  };

  const daftarTersaring = useMemo(() => {
    const s = q.toLowerCase().trim();
    return mekanikBengkel.filter((m) => {
      if (statusFilter !== "semua" && m.status !== statusFilter) return false;
      if (spesialisasiFilter !== "semua") {
        const f = spesialisasiFilter.toLowerCase().trim();
        const mSpes = (m.spesialisasi || "").toLowerCase().trim();
        const match =
          mSpes === f ||
          mSpes.includes(f) ||
          f.includes(mSpes) ||
          (f === "rem" && mSpes.includes("pengereman")) ||
          (f === "pengereman" && mSpes.includes("rem"));
        if (!match) return false;
      }
      if (s) {
        const matchNama = m.nama.toLowerCase().includes(s);
        const matchTelp = m.telepon.toLowerCase().includes(s);
        const matchSpesialisasi = (m.spesialisasi || "").toLowerCase().includes(s);
        if (!matchNama && !matchTelp && !matchSpesialisasi) return false;
      }
      return true;
    });
  }, [mekanikBengkel, q, statusFilter, spesialisasiFilter]);

  // Statistik KPI bengkel
  const totalMekanik = mekanikBengkel.length;
  const totalAktif = mekanikBengkel.filter((m) => m.status === "Aktif").length;
  const totalTidakAktif = mekanikBengkel.filter((m) => m.status === "Tidak Aktif").length;
  const totalSedangNgerjain = mekanikBengkel.filter(
    (m) => (pengerjaanAktifMap.get(m.nama) ?? 0) > 0,
  ).length;

  const bukaTambah = () => {
    setEdit(null);
    setForm(kosongMekanik);
    setOpen(true);
  };

  const bukaEdit = (m: Mekanik) => {
    setEdit(m);
    setForm({
      nama: m.nama,
      telepon: m.telepon,
      spesialisasi: m.spesialisasi || "Mesin",
      status: m.status,
    });
    setOpen(true);
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error("Nama mekanik wajib diisi.");
      return;
    }
    if (!form.spesialisasi.trim()) {
      toast.error("Spesialisasi mekanik wajib diisi atau dipilih.");
      return;
    }

    setSubmitting(true);
    try {
      if (edit) {
        await simpanMekanik({
          id: edit.id,
          bengkelId: edit.bengkelId,
          nama: form.nama.trim(),
          telepon: form.telepon.trim(),
          spesialisasi: form.spesialisasi.trim(),
          status: form.status,
        });
        toast.success(`Data mekanik ${form.nama} berhasil diperbarui di Supabase.`);
      } else {
        await simpanMekanik({
          bengkelId: bengkelAktifId,
          nama: form.nama.trim(),
          telepon: form.telepon.trim(),
          spesialisasi: form.spesialisasi.trim(),
          status: form.status,
        });
        toast.success(`Mekanik baru ${form.nama} berhasil disimpan ke database Supabase (${namaBengkel}).`);
      }
      setOpen(false);
      await refreshMekanik(bengkelAktifId);
    } catch (err: any) {
      console.error("Error saving mekanik:", err);
      toast.error(`Gagal menyimpan data mekanik: ${err?.message || "Terjadi kesalahan database"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (m: Mekanik) => {
    const statusBaru = m.status === "Aktif" ? "Tidak Aktif" : "Aktif";
    try {
      await ubahStatusMekanik(m.id, statusBaru);
      toast.success(`Status ${m.nama} diubah menjadi ${statusBaru}.`);
    } catch {
      toast.error("Gagal mengubah status mekanik.");
    }
  };

  const konfirmasiHapus = async () => {
    if (!hapus) return;
    try {
      const res = await hapusMekanik(hapus.id);
      if (res.success) {
        toast.success(res.message || "Mekanik berhasil dihapus dari database.");
      } else {
        toast.warning(res.message);
      }
    } catch (err: any) {
      console.error("Error deleting mekanik:", err);
      toast.error(`Gagal menghapus mekanik: ${err?.message || "Terjadi kesalahan database"}`);
    } finally {
      setHapus(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Kelola Master Mekanik"
          description={`Kelola daftar teknisi mekanik khusus ${namaBengkel}. Menjamin operasional servis teralokasi dengan rapi.`}
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-9 gap-1.5 px-3 font-medium text-muted-foreground">
            <Building2 className="size-4 text-primary" />
            <span>{namaBengkel}</span>
          </Badge>
          <Button onClick={bukaTambah} className="gap-2 shrink-0">
            <Plus className="size-4" />
            Tambah Mekanik
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Mekanik</p>
              <h3 className="text-xl font-bold tracking-tight">{totalMekanik}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Mekanik Aktif</p>
              <h3 className="text-xl font-bold tracking-tight text-emerald-600">{totalAktif}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-muted p-2.5 text-muted-foreground">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tidak Aktif</p>
              <h3 className="text-xl font-bold tracking-tight text-muted-foreground">
                {totalTidakAktif}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
              <Wrench className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sedang Bertugas</p>
              <h3 className="text-xl font-bold tracking-tight text-amber-600">
                {totalSedangNgerjain}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama mekanik, kontak, atau spesialisasi..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Status</SelectItem>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>

              <Select value={spesialisasiFilter} onValueChange={setSpesialisasiFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Spesialisasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Spesialisasi</SelectItem>
                  {opsiSpesialisasiFilter.map((sp) => (
                    <SelectItem key={sp} value={sp}>
                      {sp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isFiltered && (
                <Button variant="ghost" size="icon" onClick={resetFilter} title="Reset Filter">
                  <RotateCcw className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel Mekanik */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Daftar Mekanik ({daftarTersaring.length} orang)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {daftarTersaring.length === 0 ? (
            <EmptyState
              title="Belum ada mekanik ditemukan"
              description={
                isFiltered
                  ? "Tidak ada data mekanik yang cocok dengan kriteria filter."
                  : `Mekanik untuk ${namaBengkel} belum didaftarkan. Klik tombol Tambah Mekanik untuk mendaftarkan teknisi baru.`
              }
              action={
                isFiltered ? (
                  <Button variant="outline" size="sm" onClick={resetFilter}>
                    Reset Filter
                  </Button>
                ) : (
                  <Button size="sm" onClick={bukaTambah}>
                    <Plus className="mr-1.5 size-4" /> Tambah Mekanik
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No.</TableHead>
                    <TableHead>Nama Mekanik</TableHead>
                    <TableHead>Spesialisasi</TableHead>
                    <TableHead>No. Telepon / WA</TableHead>
                    <TableHead className="text-center">Tugas Aktif</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daftarTersaring.map((m, idx) => {
                    const tugasAktif = pengerjaanAktifMap.get(m.nama) ?? 0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{m.nama}</div>
                          <div className="text-xs text-muted-foreground">ID: {m.id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-medium">
                            {m.spesialisasi}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {m.telepon ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="size-3.5 text-muted-foreground" />
                              {m.telepon}
                            </span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {tugasAktif > 0 ? (
                            <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
                              {tugasAktif} servis
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Siap tugas</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              m.status === "Aktif"
                                ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs"
                              onClick={() => toggleStatus(m)}
                              title={
                                m.status === "Aktif"
                                  ? "Nonaktifkan mekanik ini"
                                  : "Aktifkan mekanik ini"
                              }
                            >
                              {m.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => bukaEdit(m)}
                              title="Edit data mekanik"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => setHapus(m)}
                              title="Hapus mekanik"
                            >
                              <Trash2 className="size-4" />
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

      {/* Modal Tambah / Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{edit ? `Edit Mekanik — ${edit.nama}` : "Tambah Mekanik Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={simpan} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nama_mekanik">Nama Mekanik *</Label>
              <Input
                id="nama_mekanik"
                placeholder="Contoh: Andi Pratama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="spesialisasi">Spesialisasi *</Label>
                <span className="text-[11px] text-muted-foreground">Bisa ketik bebas atau pilih opsi</span>
              </div>
              <ComboboxInput
                value={form.spesialisasi}
                onChange={(v) => setForm({ ...form, spesialisasi: v })}
                options={comboboxOptions}
                placeholder="Ketik atau pilih spesialisasi..."
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Mesin", "Kelistrikan", "Rem", "Kaki-kaki", "AC", "Ban", "Injeksi", "Umum"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setForm({ ...form, spesialisasi: chip })}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      form.spesialisasi.toLowerCase() === chip.toLowerCase()
                        ? "border-primary bg-primary text-primary-foreground font-medium"
                        : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telepon">Nomor Telepon / WhatsApp</Label>
              <Input
                id="telepon"
                placeholder="Contoh: 0812-3456-7890"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status_mekanik">Status Keaktifan</Label>
              <Select
                value={form.status}
                onValueChange={(v: "Aktif" | "Tidak Aktif") => setForm({ ...form, status: v })}
              >
                <SelectTrigger id="status_mekanik">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif (Dapat Ditugaskan)</SelectItem>
                  <SelectItem value="Tidak Aktif">Tidak Aktif (Arsip)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>
                <strong>Bengkel:</strong> {namaBengkel} ({bengkelAktifId})
              </p>
              <p className="mt-0.5">
                Mekanik ini tersimpan di database Supabase dan hanya dapat dikelola oleh bengkel ini.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan ke Database..." : edit ? "Simpan Perubahan" : "Tambah Mekanik"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Hapus */}
      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(v) => !v && setHapus(null)}
        title={`Hapus Mekanik ${hapus?.nama}?`}
        description={`Mekanik "${hapus?.nama}" akan dihapus permanen dari database bengkel ${namaBengkel}. Pastikan teknisi tidak sedang menangani servis yang aktif.`}
        onConfirm={konfirmasiHapus}
      />
    </div>
  );
}

