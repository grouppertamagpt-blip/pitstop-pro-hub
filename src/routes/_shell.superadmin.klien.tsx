import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  ShieldCheck,
  Power,
  PowerOff,
  Eye,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  ArrowUpDown,
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { superAdminService } from "@/services/appbenk-service";
import type { BengkelRow, PaketBengkel, StatusKlien } from "@/types/database";

export const Route = createFileRoute("/_shell/superadmin/klien")({
  head: () => ({
    meta: [
      { title: "Manajemen Klien Bengkel — Super Admin AppBenk" },
      {
        name: "description",
        content: "Kelola bengkel mitra, status operasional, dan pendaftaran klien baru.",
      },
    ],
  }),
  component: SuperAdminKlienPage,
});

function SuperAdminKlienPage() {
  const [clients, setClients] = useState<BengkelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | StatusKlien>("semua");

  // Modal Detail
  const [selectedClient, setSelectedClient] = useState<BengkelRow | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Modal Tambah Bengkel Baru
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newBengkel, setNewBengkel] = useState({
    namaBengkel: "",
    alamat: "",
    telepon: "",
    ownerNama: "",
    ownerEmail: "",
    passwordAwal: "",
    paket: "Basic" as PaketBengkel,
  });

  const loadClients = async () => {
    try {
      const data = await superAdminService.getAllBengkelClients();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        c.nama_bengkel.toLowerCase().includes(search.toLowerCase()) ||
        (c.owner_nama && c.owner_nama.toLowerCase().includes(search.toLowerCase())) ||
        (c.id_bengkel && c.id_bengkel.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = filterStatus === "semua" || c.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [clients, search, filterStatus]);

  const handleToggleStatus = async (client: BengkelRow) => {
    const nextStatus: StatusKlien = client.status === "Aktif" ? "Nonaktif" : "Aktif";
    const success = await superAdminService.updateBengkelStatus(client.id_bengkel, nextStatus);
    if (success) {
      toast.success(
        `Status ${client.nama_bengkel} sekarang ${nextStatus}!`,
      );
      loadClients();
    }
  };

  const handleCreateBengkel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBengkel.namaBengkel || !newBengkel.ownerNama || !newBengkel.ownerEmail) {
      toast.error("Nama Bengkel, Nama Owner, dan Email Owner wajib diisi.");
      return;
    }
    if (newBengkel.passwordAwal && newBengkel.passwordAwal.length < 6) {
      toast.error("Password awal minimal 6 karakter.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await superAdminService.createBengkelWithOwner({
        ...newBengkel,
        passwordAwal: newBengkel.passwordAwal || "Admin123!",
      });
      if (res.ok) {
        toast.success(`Bengkel ${newBengkel.namaBengkel} berhasil didaftarkan!`);
        setAddModalOpen(false);
        setNewBengkel({
          namaBengkel: "",
          alamat: "",
          telepon: "",
          ownerNama: "",
          ownerEmail: "",
          passwordAwal: "",
          paket: "Basic",
        });
        loadClients();
      } else {
        toast.error(res.error || "Gagal mendaftarkan bengkel.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Manajemen Klien Bengkel"
        description="Kelola seluruh bengkel mitra yang terdaftar di platform AppBenk, status operasional, dan pendaftaran klien baru."
        action={
          <Button onClick={() => setAddModalOpen(true)} className="gap-2">
            <Plus className="size-4" /> Tambah Bengkel Baru
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari ID, nama bengkel, owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="w-36 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Status</SelectItem>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead className="font-semibold">ID & Nama Bengkel</TableHead>
                <TableHead className="font-semibold">Owner & Kontak</TableHead>
                <TableHead className="font-semibold">Paket</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Tanggal Bergabung</TableHead>
                <TableHead className="text-right font-semibold">Aksi Kelola</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada bengkel yang sesuai dengan pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const isAktif = client.status !== "Nonaktif";

                  return (
                    <TableRow key={client.id_bengkel}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <p className="font-medium text-xs text-foreground">{client.nama_bengkel}</p>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {client.id_bengkel}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium">{client.owner_nama || "Owner Bengkel"}</p>
                        <p className="text-[11px] text-muted-foreground">{client.no_telepon || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="gap-1 text-[10px] border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <ShieldCheck className="size-3 text-slate-500" />
                          {client.paket || "Basic"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isAktif
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {isAktif ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {client.created_at
                          ? new Date(client.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "2026-01-15"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setSelectedClient(client);
                              setDetailModalOpen(true);
                            }}
                          >
                            <Eye className="size-3.5 mr-1" /> Detail
                          </Button>

                          {/* Toggle Status Aktif */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 text-[11px] ${
                              isAktif ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"
                            }`}
                            onClick={() => handleToggleStatus(client)}
                          >
                            {isAktif ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL DETAIL BENGKEL */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" /> Detail Klien Bengkel
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{selectedClient.nama_bengkel}</span>
                  <Badge variant="outline">{selectedClient.paket || "Basic"}</Badge>
                </div>
                <p className="font-mono text-muted-foreground">{selectedClient.id_bengkel}</p>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span>{selectedClient.alamat || "Alamat bengkel mitra"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-[11px]">Owner / Penanggung Jawab</p>
                  <p className="mt-1 font-bold text-foreground">{selectedClient.owner_nama || "Owner Bengkel"}</p>
                  <p className="text-muted-foreground text-[10px]">{selectedClient.owner_email || "-"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-[11px]">Nomor WhatsApp</p>
                  <p className="mt-1 font-bold text-foreground">{selectedClient.no_telepon || "-"}</p>
                  <p className="text-muted-foreground text-[10px]">Aktif untuk notifikasi</p>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="font-semibold text-primary">Paket Layanan Kemitraan</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Paket Basic Standar aktif mencakup modul operasional bengkel: pendaftaran, servis &amp; antrean, inventori, kasir &amp; pembayaran, dan nota digital.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TAMBAH BENGKEL BARU */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" /> Daftarkan Bengkel &amp; Owner Baru
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBengkel} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label>Nama Bengkel</Label>
              <Input
                placeholder="Contoh: Bengkel Sentosa Abadi"
                value={newBengkel.namaBengkel}
                onChange={(e) => setNewBengkel({ ...newBengkel, namaBengkel: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nomor WhatsApp Bengkel</Label>
                <Input
                  placeholder="0812-xxxx-xxxx"
                  value={newBengkel.telepon}
                  onChange={(e) => setNewBengkel({ ...newBengkel, telepon: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Paket Kemitraan</Label>
                <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-1 text-xs">
                  <span className="font-medium text-foreground">Paket Basic (Standar)</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    Standar Operasional
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Alamat Bengkel</Label>
              <Input
                placeholder="Alamat lengkap bengkel"
                value={newBengkel.alamat}
                onChange={(e) => setNewBengkel({ ...newBengkel, alamat: e.target.value })}
              />
            </div>

            <div className="border-t pt-3">
              <p className="font-semibold text-xs text-foreground mb-2">Akun Owner Bengkel</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nama Lengkap Owner</Label>
                  <Input
                    placeholder="Nama owner"
                    value={newBengkel.ownerNama}
                    onChange={(e) => setNewBengkel({ ...newBengkel, ownerNama: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email Owner (untuk Login)</Label>
                  <Input
                    type="email"
                    placeholder="owner@gmail.com"
                    value={newBengkel.ownerEmail}
                    onChange={(e) => setNewBengkel({ ...newBengkel, ownerEmail: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <Label>Password Awal</Label>
                <Input
                  type="password"
                  placeholder="Minimal 6 karakter (default: Admin123!)"
                  value={newBengkel.passwordAwal}
                  onChange={(e) => setNewBengkel({ ...newBengkel, passwordAwal: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Mendaftarkan..." : "Daftarkan Klien"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

