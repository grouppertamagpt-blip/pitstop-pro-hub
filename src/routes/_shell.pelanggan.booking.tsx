import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { CalendarPlus, Car, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { BookingBadge } from "@/components/status-badge";
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
  tanggalPanjang,
  labelKendaraan,
  JENIS_SERVIS,
} from "@/lib/store";
import { BengkelMap, DEMO_BENGKEL_LOCATION, type BengkelLocation } from "@/components/bengkel-map";

export const Route = createFileRoute("/_shell/pelanggan/booking")({
  head: () => ({
    meta: [
      { title: "Booking Servis — AppBenk" },
      {
        name: "description",
        content:
          "Buat booking servis kendaraan: pilih jenis servis, tanggal, waktu, dan tuliskan keluhan Anda.",
      },
      { property: "og:title", content: "Booking Servis — AppBenk" },
      {
        property: "og:description",
        content: "Booking servis kendaraan dengan mudah dari mana saja.",
      },
    ],
  }),
  component: BookingPelanggan,
});

function BookingPelanggan() {
  const { user } = useAuth();
  const {
    booking,
    pelanggan,
    kendaraan,
    bengkel,
    activeBengkelId,
    activeBengkel,
    mekanik,
    buatBooking,
    simpanPelanggan,
    refreshBengkel,
    refreshMekanik,
    refreshBooking,
    refreshKendaraan,
  } = useStore();

  useEffect(() => {
    refreshBengkel?.();
    refreshMekanik?.();
    refreshBooking?.();
    refreshKendaraan?.();
  }, [refreshBengkel, refreshMekanik, refreshBooking, refreshKendaraan]);

  const profil = useMemo(() => {
    if (!user) return undefined;
    return pelanggan.find(
      (p) =>
        (user.pelangganId && p.id === user.pelangganId) ||
        (user.id && (p.id === user.id || p.userId === user.id)) ||
        (user.email && p.email?.toLowerCase() === user.email.toLowerCase()) ||
        (user.nama && p.nama?.trim().toLowerCase() === user.nama.trim().toLowerCase()) ||
        (user.pelanggan && p.nama?.trim().toLowerCase() === user.pelanggan.trim().toLowerCase()),
    );
  }, [pelanggan, user]);

  const kendaraanSaya = useMemo(() => {
    const pId = user?.pelangganId || profil?.id;
    const uId = user?.id;
    return kendaraan.filter(
      (k) =>
        (pId && k.pelangganId === pId) ||
        (uId && k.pelangganId === uId),
    );
  }, [kendaraan, profil, user]);

  const utama = kendaraanSaya[0];

  const preferredBengkelId = useMemo(() => {
    return (
      activeBengkelId ||
      activeBengkel?.id ||
      bengkel.find((b) => b.id === "bengkel-2307")?.id ||
      bengkel[0]?.id ||
      "bengkel-2307"
    );
  }, [activeBengkelId, activeBengkel, bengkel]);

  const kosong = {
    bengkelId: preferredBengkelId,
    vehicleId: utama?.id ?? "",
    kendaraan: utama ? labelKendaraan(utama) : "",
    plat: utama?.plat ?? "",
    jenis: "",
    keluhan: "",
    tanggal: "",
    waktu: "",
    catatan: "",
    mekanikDiinginkan: "",
    mekanikId: "",
    jenisLainnya: "",
  };

  const [form, setForm] = useState(kosong);
  const [err, setErr] = useState<Partial<Record<keyof typeof kosong, string>>>({});

  // Sync form vehicle when registered vehicles are loaded or change
  useEffect(() => {
    if (kendaraanSaya.length > 0 && !form.vehicleId) {
      const first = kendaraanSaya[0];
      if (first) {
        setForm((prev) => ({
          ...prev,
          vehicleId: first.id,
          kendaraan: labelKendaraan(first),
          plat: first.plat,
        }));
      }
    }
  }, [kendaraanSaya, form.vehicleId]);

  // Semua mekanik aktif dari data master admin
  const mekanikTersedia = useMemo(() => {
    const targetBengkel = form.bengkelId || bengkel[0]?.id || "bengkel-001";
    const cabang = mekanik.filter(
      (m) => (!m.bengkelId || m.bengkelId === targetBengkel) && m.status === "Aktif",
    );
    if (cabang.length > 0) return cabang;
    return mekanik.filter((m) => m.status === "Aktif");
  }, [mekanik, form.bengkelId, bengkel]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof err = {};
    if (!form.vehicleId || !form.kendaraan.trim()) {
      next.kendaraan = "Pilih kendaraan yang akan diservis.";
    }
    if (!form.jenis) next.jenis = "Pilih jenis servis.";
    if (!form.keluhan.trim()) next.keluhan = "Keluhan kendaraan wajib diisi.";
    if (form.jenis === "Lainnya" && !form.jenisLainnya.trim())
      next.jenisLainnya = "Jelaskan jenis servis yang dibutuhkan.";
    if (!form.tanggal) next.tanggal = "Pilih tanggal booking.";
    if (!form.waktu) next.waktu = "Pilih waktu booking.";
    setErr(next);
    if (Object.keys(next).length) return;

    const targetCustomerId =
      user?.pelangganId ||
      profil?.id ||
      (user?.id ? `pl-${user.id.slice(0, 8)}` : `pl-${Date.now().toString(36)}`);

    if (!profil && user) {
      simpanPelanggan({
        id: targetCustomerId,
        userId: user.id,
        nama: user.nama || "Pelanggan",
        email: user.email,
        telepon: user.telepon ?? "",
        alamat: "",
        kendaraan: form.kendaraan,
        plat: form.plat,
      });
    }

    const { jenisLainnya, ...bookingForm } = form;
    const baru = buatBooking({
      ...bookingForm,
      bengkelId: form.bengkelId || "bengkel-001",
      mekanikDiinginkan: form.mekanikDiinginkan.trim() || undefined,
      mekanikId: form.mekanikId || undefined,
      jenis: form.jenis === "Lainnya" ? jenisLainnya.trim() : form.jenis,
      pelanggan: user?.nama || profil?.nama || "Pelanggan",
      customerId: targetCustomerId,
      vehicleId: form.vehicleId,
    });
    toast.success(`Booking ${baru.nomor} dibuat — menunggu konfirmasi admin`);

    const defaultKendaraan = kendaraanSaya[0];
    setForm({
      ...kosong,
      vehicleId: defaultKendaraan ? defaultKendaraan.id : "",
      kendaraan: defaultKendaraan ? labelKendaraan(defaultKendaraan) : "",
      plat: defaultKendaraan ? defaultKendaraan.plat : "",
    });
  };

  const milikSaya = useMemo(() => {
    const userNamaLower = (user?.nama || "").trim().toLowerCase();
    const userPelangganLower = (user?.pelanggan || "").trim().toLowerCase();
    const profilId = profil?.id;
    const authId = user?.id;

    return booking.filter((b) => {
      if (b.customerId) {
        if (profilId && b.customerId === profilId) return true;
        if (authId && b.customerId === authId) return true;
      }
      if (b.pelanggan) {
        const bNama = b.pelanggan.trim().toLowerCase();
        if (userNamaLower && bNama === userNamaLower) return true;
        if (userPelangganLower && bNama === userPelangganLower) return true;
      }
      return false;
    });
  }, [booking, user, profil]);

  const [, setLocVersion] = useState(0);
  useEffect(() => {
    const handleLocUpdate = () => setLocVersion((v) => v + 1);
    window.addEventListener("appbenk_bengkel_location_updated", handleLocUpdate);
    return () => window.removeEventListener("appbenk_bengkel_location_updated", handleLocUpdate);
  }, []);

  // Sync default workshop to active workshop (Bengkel Fandi Motor)
  useEffect(() => {
    if (preferredBengkelId && (!form.bengkelId || form.bengkelId === "bengkel-001")) {
      setForm((prev) => ({
        ...prev,
        bengkelId: preferredBengkelId,
      }));
    }
  }, [preferredBengkelId]);

  const getBengkelLoc = (bId: string): BengkelLocation => {
    const targetId = bId || preferredBengkelId;
    const selectedBengkel =
      bengkel.find((b) => b.id === targetId) ||
      bengkel.find((b) => b.id === "bengkel-2307") ||
      activeBengkel;

    const cleanBengkelAlamat = (selectedBengkel?.alamat || "").replace(/\[geo:[^\]]+\]/gi, "").trim();

    // 1. Prioritas Utama: Ambil langsung dari data store/database yang sedang aktif/dipilih
    if (selectedBengkel && (selectedBengkel.lat || selectedBengkel.alamat)) {
      return {
        nama: selectedBengkel.nama || "Bengkel Fandi Motor",
        alamat: cleanBengkelAlamat || "Jl. Selaganggang, Kecamatan mrebet Kabupaten purbalingga.",
        telepon: selectedBengkel.telepon || "081234567890",
        jamOperasional: selectedBengkel.jamOperasional || "Senin–Sabtu: 08.00–17.00 WIB",
        lat: selectedBengkel.lat ?? -7.3245975,
        lng: selectedBengkel.lng ?? 109.352647,
      };
    }

    // 2. Fallback: localStorage
    try {
      const savedWs = localStorage.getItem(`appbenk_bengkel_location_${targetId}`);
      if (savedWs) {
        const parsed = JSON.parse(savedWs);
        if (parsed.lat && parsed.lng) {
          return {
            nama: parsed.nama || selectedBengkel?.nama || "Bengkel Fandi Motor",
            alamat:
              cleanBengkelAlamat ||
              (parsed.alamat || "").replace(/\[geo:[^\]]+\]/gi, "").trim() ||
              "Jl. Selaganggang, Kecamatan mrebet Kabupaten purbalingga.",
            telepon: parsed.telepon || selectedBengkel?.telepon || "081234567890",
            jamOperasional:
              parsed.jamOperasional ||
              selectedBengkel?.jamOperasional ||
              "Senin–Sabtu: 08.00–17.00 WIB",
            lat: parsed.lat,
            lng: parsed.lng,
          };
        }
      }
    } catch {}

    // 3. Default Bengkel Fandi Motor
    return {
      nama: selectedBengkel?.nama || "Bengkel Fandi Motor",
      alamat: cleanBengkelAlamat || "Jl. Selaganggang, Kecamatan mrebet Kabupaten purbalingga.",
      telepon: selectedBengkel?.telepon || "081234567890",
      jamOperasional: selectedBengkel?.jamOperasional || "Senin–Sabtu: 08.00–17.00 WIB",
      lat: -7.3245975,
      lng: 109.352647,
    };
  };

  return (
    <>
      <PageHeader
        title="Booking Servis"
        description="Ajukan jadwal servis kendaraan Anda ke bengkel."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Form Booking</CardTitle>
            </CardHeader>
            <CardContent>
            {kendaraanSaya.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4">
                <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Car className="size-8" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="font-semibold text-base text-foreground">
                    Wajib Mengisi Kendaraan Terlebih Dahulu
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sebelum mengajukan booking servis, Anda diharuskan mendaftarkan minimal 1 kendaraan di menu <strong>Kendaraan Saya</strong> agar riwayat dan data servis tercatat dengan tepat.
                  </p>
                </div>
                <Button asChild className="gap-2">
                  <Link to="/pelanggan/kendaraan">
                    <Car className="size-4" /> Buka Halaman Kendaraan Saya
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Pilih Cabang Bengkel</Label>
                  <Select
                    value={form.bengkelId}
                    onValueChange={(v) =>
                      setForm({ ...form, bengkelId: v, mekanikDiinginkan: "", mekanikId: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Cabang Bengkel" />
                    </SelectTrigger>
                    <SelectContent>
                      {bengkel.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Pilih Kendaraan Anda <span className="text-destructive">*</span></Label>
                    <Link
                      to="/pelanggan/kendaraan"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      + Kelola Kendaraan
                    </Link>
                  </div>
                  <Select
                    value={form.vehicleId || kendaraanSaya[0]?.id || ""}
                    onValueChange={(v) => {
                      const k = kendaraanSaya.find((x) => x.id === v);
                      if (k) {
                        setForm({
                          ...form,
                          vehicleId: k.id,
                          kendaraan: labelKendaraan(k),
                          plat: k.plat,
                        });
                        setErr((prev) => {
                          const next = { ...prev };
                          delete next.kendaraan;
                          return next;
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kendaraan yang akan diservis" />
                    </SelectTrigger>
                    <SelectContent>
                      {kendaraanSaya.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {labelKendaraan(k)} · {k.plat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err.kendaraan && <p className="text-xs text-destructive">{err.kendaraan}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Kendaraan Terpilih</span>
                    <span className="font-semibold text-foreground">
                      {form.kendaraan || (utama ? labelKendaraan(utama) : "—")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Nomor Polisi</span>
                    <span className="font-semibold text-foreground">
                      {form.plat || utama?.plat || "—"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Jenis Servis</Label>
                  <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis servis" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_SERVIS.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err.jenis && <p className="text-xs text-destructive">{err.jenis}</p>}
                </div>
                {form.jenis === "Lainnya" && (
                  <div className="space-y-1.5">
                    <Label>Jelaskan jenis servis yang dibutuhkan</Label>
                    <Input
                      value={form.jenisLainnya}
                      onChange={(e) => setForm({ ...form, jenisLainnya: e.target.value })}
                    />
                    {err.jenisLainnya && (
                      <p className="text-xs text-destructive">{err.jenisLainnya}</p>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Jelaskan keluhan atau masalah kendaraan Anda</Label>
                  <Textarea
                    value={form.keluhan}
                    onChange={(e) => setForm({ ...form, keluhan: e.target.value })}
                    placeholder="Contoh: Mesin terasa bergetar saat dinyalakan, rem berbunyi, AC kurang dingin, dll."
                  />
                  {err.keluhan && <p className="text-xs text-destructive">{err.keluhan}</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Tanggal Booking</Label>
                    <Input
                      type="date"
                      value={form.tanggal}
                      onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    />
                    {err.tanggal && <p className="text-xs text-destructive">{err.tanggal}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Waktu Booking</Label>
                    <Input
                      type="time"
                      value={form.waktu}
                      onChange={(e) => setForm({ ...form, waktu: e.target.value })}
                    />
                    {err.waktu && <p className="text-xs text-destructive">{err.waktu}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Preferensi Mekanik (Opsional)</Label>
                  <Select
                    value={
                      form.mekanikId ||
                      (form.mekanikDiinginkan
                        ? mekanik.find((x) => x.nama === form.mekanikDiinginkan)?.id
                        : "") ||
                      "tanpa_preferensi"
                    }
                    onValueChange={(v) => {
                      if (v === "tanpa_preferensi") {
                        setForm((prev) => ({ ...prev, mekanikDiinginkan: "", mekanikId: "" }));
                      } else {
                        const m = mekanik.find((x) => x.id === v || x.nama === v);
                        setForm((prev) => ({
                          ...prev,
                          mekanikDiinginkan: m ? m.nama : "",
                          mekanikId: m ? m.id : v,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Serahkan kepada bengkel (Tanpa Preferensi)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tanpa_preferensi">
                        Serahkan kepada bengkel (Tanpa Preferensi)
                      </SelectItem>
                      {mekanikTersedia.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nama} — Spesialisasi: {m.spesialisasi || "Teknisi Umum"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Pilih teknisi yang Anda sukai dari data mekanik kami, atau serahkan kepada bengkel untuk penugasan terbaik.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Catatan Tambahan</Label>
                  <Textarea
                    value={form.catatan}
                    onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                    placeholder="Opsional"
                  />
                </div>
                <Button type="submit" className="w-full gap-2">
                  <CalendarPlus className="size-4" /> Kirim Booking
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kolom Kanan: Peta Lokasi Bengkel & Di Bawahnya: Booking Saya */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              Lokasi Bengkel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4 px-4">
            <BengkelMap
              bengkel={getBengkelLoc(form.bengkelId)}
              height={220}
              showInfo
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking Saya</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {milikSaya.length === 0 ? (
              <EmptyState
                title="Belum ada booking"
                description="Booking yang Anda buat akan muncul di sini."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Booking</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead>Mekanik</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milikSaya.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.nomor}</TableCell>
                        <TableCell>{b.jenis}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {tanggalPanjang(b.tanggal)} · {b.waktu}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="block">Diinginkan: {b.mekanikDiinginkan || "—"}</span>
                          <span className="block">
                            Ditugaskan: {b.mekanikDitugaskan || "Belum ditentukan"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <BookingBadge status={b.status} />
                          {b.status === "Diterima" && (
                            <div className="mt-1.5 space-y-0.5">
                              <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                bookingan diterima silahkan datang ke bengkel
                              </span>
                              {b.estimasiSelesai && (
                                <span className="block text-[11px] text-muted-foreground">
                                  Estimasi selesai: {new Date(b.estimasiSelesai).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} WIB
                                </span>
                              )}
                            </div>
                          )}
                          {b.status === "Ditolak" && (
                            <div className="mt-1.5 space-y-0.5">
                              <span className="block max-w-56 text-xs font-medium text-destructive">
                                Alasan: {b.alasanTolak || "Tidak ada keterangan dari admin."}
                              </span>
                            </div>
                          )}
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
    </div>
  </>
  );
}
