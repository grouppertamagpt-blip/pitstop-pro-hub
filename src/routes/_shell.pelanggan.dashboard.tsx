import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  CalendarPlus,
  Activity,
  Wallet,
  History,
  ArrowRight,
  Receipt,
  Download,
  Bell,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  CalendarX,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/page-header";
import { StatusBadge, BookingBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useStore, rupiah, tanggalPanjang } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/pelanggan/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Pelanggan — AppBenk" },
      {
        name: "description",
        content:
          "Pantau booking aktif, status servis, estimasi biaya, dan pembayaran kendaraan Anda.",
      },
      { property: "og:title", content: "Dashboard Pelanggan — AppBenk" },
      { property: "og:description", content: "Ringkasan servis kendaraan Anda dalam satu layar." },
    ],
  }),
  component: DashboardPelanggan,
});

function DashboardPelanggan() {
  const { user } = useAuth();
  const { servis, booking, notifikasi, refreshBooking, refreshServis } = useStore();

  useEffect(() => {
    refreshBooking?.().catch(() => {});
    refreshServis?.().catch(() => {});

    const handleSync = () => {
      refreshBooking?.().catch(() => {});
      refreshServis?.().catch(() => {});
    };

    window.addEventListener("appbenk_booking_updated", handleSync);
    window.addEventListener("appbenk_servis_updated", handleSync);
    window.addEventListener("appbenk_pembayaran_updated", handleSync);

    const interval = setInterval(handleSync, 10000);
    return () => {
      window.removeEventListener("appbenk_booking_updated", handleSync);
      window.removeEventListener("appbenk_servis_updated", handleSync);
      window.removeEventListener("appbenk_pembayaran_updated", handleSync);
      clearInterval(interval);
    };
  }, [refreshBooking, refreshServis]);

  const userNamaLower = (user?.nama || "").trim().toLowerCase();
  const userPelangganLower = (user?.pelanggan || "").trim().toLowerCase();
  const authId = user?.id;
  const pelangganId = user?.pelangganId;

  const isMilikSaya = (itemPelanggan?: string, itemCustomerId?: string) => {
    if (itemCustomerId && ((pelangganId && itemCustomerId === pelangganId) || (authId && itemCustomerId === authId))) return true;
    if (itemPelanggan) {
      const p = itemPelanggan.trim().toLowerCase();
      if (userNamaLower && p === userNamaLower) return true;
      if (userPelangganLower && p === userPelangganLower) return true;
    }
    return false;
  };

  const servisSaya = servis.filter((s) => isMilikSaya(s.pelanggan, (s as any).pelangganId || (s as any).idPelanggan));
  const bookingSaya = booking.filter((b) => isMilikSaya(b.pelanggan, b.customerId));
  const aktif = servisSaya.filter((s) => !["Selesai Dibayar"].includes(s.status));
  const tagihan = servisSaya.filter((s) => s.status === "Menunggu Pembayaran");
  const pembayaran = servisSaya
    .filter((s) => ["Menunggu Pembayaran", "Selesai Dibayar"].includes(s.status))
    .slice(0, 3);

  // Filter notifikasi khusus untuk pelanggan aktif
  const notifikasiPelanggan = notifikasi.filter((n) => {
    if (n.role === "semua") return true;
    if (n.role === "pelanggan") {
      if (n.customerId || n.userId || n.pelanggan) {
        const matchesCustomerId = Boolean(n.customerId && pelangganId && n.customerId === pelangganId);
        const matchesUserId = Boolean(n.userId && authId && n.userId === authId);
        const matchesNama = Boolean(
          n.pelanggan &&
            ((userNamaLower && n.pelanggan.trim().toLowerCase() === userNamaLower) ||
              (userPelangganLower && n.pelanggan.trim().toLowerCase() === userPelangganLower)),
        );
        return matchesCustomerId || matchesUserId || matchesNama;
      }
      return true;
    }
    return false;
  });

  // Booking yang baru diterima atau ditolak oleh admin
  const bookingPemberitahuan = bookingSaya.filter(
    (b) => b.status === "Diterima" || b.status === "Ditolak",
  );

  const stats = [
    {
      label: "Booking Aktif",
      value: bookingSaya.filter((b) => b.status !== "Ditolak").length,
      hint: "booking tercatat",
    },
    { label: "Servis Berjalan", value: aktif.length, hint: "belum selesai dibayar" },
    { label: "Menunggu Bayar", value: tagihan.length, hint: "tagihan aktif" },
    { label: "Total Riwayat", value: servisSaya.length, hint: "servis kendaraan" },
  ];

  const aksi = [
    { to: "/pelanggan/booking", label: "Buat Booking", icon: CalendarPlus },
    { to: "/pelanggan/status", label: "Status Servis", icon: Activity },
    { to: "/pelanggan/pembayaran", label: "Pembayaran", icon: Wallet },
    { to: "/pelanggan/riwayat", label: "Riwayat", icon: History },
  ] as const;

  return (
    <>
      <PageHeader
        title={`Halo, ${user?.nama}`}
        description="Ringkasan servis kendaraan Anda hari ini."
      />

      {/* Banner Notifikasi Status Booking Terbaru */}
      {bookingPemberitahuan.length > 0 && (
        <div className="space-y-3">
          {bookingPemberitahuan.slice(0, 2).map((b) => (
            <div
              key={`banner-${b.id}`}
              className={cn(
                "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border p-4 shadow-sm transition-all",
                b.status === "Diterima"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                  : "border-destructive/40 bg-destructive/10 text-destructive-foreground",
              )}
            >
              <div className="flex items-start gap-3">
                {b.status === "Diterima" ? (
                  <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="size-5" />
                  </div>
                ) : (
                  <div className="rounded-full bg-destructive/20 p-2 text-destructive shrink-0 mt-0.5">
                    <AlertCircle className="size-5" />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-sm">
                      {b.status === "Diterima"
                        ? `Booking ${b.nomor} Diterima Bengkel`
                        : `Booking ${b.nomor} Ditolak oleh Admin`}
                    </p>
                    <BookingBadge status={b.status} />
                  </div>
                  {b.status === "Diterima" ? (
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      bookingan diterima silahkan datang ke bengkel
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-destructive">
                      Alasan: {b.alasanTolak || "Tidak ada keterangan dari admin."}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Kendaraan: {b.kendaraan} ({b.plat}) · Jadwal: {tanggalPanjang(b.tanggal)} {b.waktu}
                  </p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant={b.status === "Diterima" ? "default" : "outline"}
                className="shrink-0 sm:self-center"
              >
                <Link to={b.status === "Diterima" ? "/pelanggan/status" : "/pelanggan/booking"}>
                  {b.status === "Diterima" ? "Lihat Booking" : "Kelola Booking"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-l-4 border-l-primary">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Aksi Cepat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {aksi.map((a) => (
            <Button key={a.to} asChild variant="outline" className="gap-2">
              <Link to={a.to}>
                <a.icon className="size-4" /> {a.label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-4 text-primary" /> Pembayaran Terbaru
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
            <Link to="/pelanggan/pembayaran" search={{}}>
              Semua <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {pembayaran.length === 0 ? (
            <EmptyState
              title="Belum ada pembayaran"
              description="Tagihan muncul setelah servis selesai dikerjakan."
            />
          ) : (
            pembayaran.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {s.noTransaksi} · {s.nomor}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {tanggalPanjang(s.tanggal)} · {s.kendaraan} · {rupiah(s.total)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={s.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/pelanggan/pembayaran" search={{ trx: s.noTransaksi }}>
                      Lihat Pembayaran
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to="/pelanggan/pembayaran" search={{ trx: s.noTransaksi }}>
                      <Download className="size-4" /> Download Nota
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Bagian Notifikasi Pelanggan */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4 text-primary" /> Notifikasi Pelanggan
            {notifikasiPelanggan.filter((n) => !n.dibaca).length > 0 && (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-600">
                {notifikasiPelanggan.filter((n) => !n.dibaca).length} Baru
              </span>
            )}
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
            <Link to="/pelanggan/booking">
              Lihat Booking <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifikasiPelanggan.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              <Bell className="mx-auto size-6 text-muted-foreground/40 mb-1.5" />
              <p className="font-medium">Belum ada notifikasi baru</p>
              <p className="text-[11px] text-muted-foreground/70">
                Pemberitahuan booking servis dan tagihan akan tampil di sini.
              </p>
            </div>
          ) : (
            notifikasiPelanggan.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-md border p-3 transition-colors",
                  !n.dibaca ? "border-primary/30 bg-primary/5" : "bg-card",
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {n.tipe === "booking" ? (
                    n.statusBooking === "Ditolak" || n.judul.toLowerCase().includes("ditolak") ? (
                      <div className="rounded-full bg-destructive/10 p-1.5 text-destructive shrink-0 mt-0.5">
                        <CalendarX className="size-4" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                        <CalendarCheck className="size-4" />
                      </div>
                    )
                  ) : (
                    <div className="rounded-full bg-primary/10 p-1.5 text-primary shrink-0 mt-0.5">
                      <Bell className="size-4" />
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-xs font-bold truncate", !n.dibaca ? "text-primary" : "text-foreground")}>
                        {n.judul}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(n.waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium leading-relaxed">
                      {n.pesan}
                    </p>
                  </div>
                </div>
                {n.link && (
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs shrink-0 gap-1 text-primary">
                    <Link
                      to={
                        (n.statusBooking === "Diterima" || n.judul.toLowerCase().includes("diterima")
                          ? "/pelanggan/status"
                          : n.link) as any
                      }
                    >
                      Buka <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Booking Saya</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
              <Link to="/pelanggan/booking">
                Kelola <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookingSaya.length === 0 ? (
              <EmptyState
                title="Belum ada booking"
                description="Buat booking servis pertama Anda."
              />
            ) : (
              bookingSaya.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-md border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold">
                      {b.nomor} · {b.jenis}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tanggalPanjang(b.tanggal)} · {b.waktu} · {b.kendaraan}
                    </p>
                    {b.status === "Diterima" && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        bookingan diterima silahkan datang ke bengkel
                      </p>
                    )}
                    {b.status === "Ditolak" && (
                      <p className="text-xs font-medium text-destructive">
                        Alasan: {b.alasanTolak || "Tidak ada keterangan dari admin."}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 sm:self-center">
                    <BookingBadge status={b.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Servis Terbaru</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
              <Link to="/pelanggan/riwayat">
                Riwayat <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {servisSaya.length === 0 ? (
              <EmptyState
                title="Belum ada servis"
                description="Riwayat servis akan tampil di sini."
              />
            ) : (
              servisSaya.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {s.nomor} · {s.pekerjaan}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tanggalPanjang(s.tanggal)} · {rupiah(s.total)}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
