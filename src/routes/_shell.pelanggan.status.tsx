import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, CheckCircle2, CreditCard, ArrowRight, Receipt } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/page-header";
import { StatusBadge, BookingBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useStore, tanggalPanjang, URUTAN_STATUS } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/pelanggan/status")({
  head: () => ({
    meta: [
      { title: "Status Servis — AppBenk" },
      {
        name: "description",
        content: "Pantau perkembangan servis kendaraan Anda dari booking hingga selesai dibayar.",
      },
      { property: "og:title", content: "Status Servis — AppBenk" },
      {
        property: "og:description",
        content: "Perkembangan servis kendaraan Anda secara real time.",
      },
    ],
  }),
  component: StatusPelanggan,
});

function StatusPelanggan() {
  const { user } = useAuth();
  const { servis, booking, refreshServis, refreshBooking } = useStore();

  // Auto-update & Realtime listener untuk status pengerjaan servis pelanggan
  useEffect(() => {
    refreshServis?.().catch(() => {});
    refreshBooking?.().catch(() => {});

    const handleSync = () => {
      refreshServis?.().catch(() => {});
      refreshBooking?.().catch(() => {});
    };

    window.addEventListener("appbenk_servis_updated", handleSync);
    window.addEventListener("appbenk_booking_updated", handleSync);
    window.addEventListener("appbenk_pembayaran_updated", handleSync);

    // Polling fallback setiap 10 detik saat pelanggan memantau progres servis
    const interval = setInterval(handleSync, 10000);

    return () => {
      window.removeEventListener("appbenk_servis_updated", handleSync);
      window.removeEventListener("appbenk_booking_updated", handleSync);
      window.removeEventListener("appbenk_pembayaran_updated", handleSync);
      clearInterval(interval);
    };
  }, [refreshServis, refreshBooking]);
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

  const daftar = servis.filter((s) => {
    if (isMilikSaya(s.pelanggan, (s as any).pelangganId || (s as any).idPelanggan)) return true;
    if (s.bookingId) {
      const bk = booking.find((b) => b.id === s.bookingId);
      if (bk && isMilikSaya(bk.pelanggan, bk.customerId)) return true;
    }
    return false;
  });
  const bookingMenunggu = booking.filter(
    (b) => isMilikSaya(b.pelanggan, b.customerId) && b.status === "Menunggu Konfirmasi",
  );
  const bookingDitolak = booking.filter((b) => isMilikSaya(b.pelanggan, b.customerId) && b.status === "Ditolak");

  return (
    <>
      <PageHeader
        title="Status Servis"
        description="Ikuti setiap tahapan pengerjaan kendaraan Anda."
      />

      {bookingMenunggu.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Menunggu Konfirmasi Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookingMenunggu.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {b.nomor} · {b.jenis}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tanggalPanjang(b.tanggal)} · {b.waktu}
                  </p>
                </div>
                <BookingBadge status={b.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {bookingDitolak.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking Ditolak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookingDitolak.map((b) => (
              <div
                key={b.id}
                className="space-y-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {b.nomor} · {b.jenis}
                  </p>
                  <BookingBadge status={b.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {tanggalPanjang(b.tanggal)} · {b.waktu} · {b.kendaraan}
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-destructive">Alasan: </span>
                  {b.alasanTolak || "Tidak ada keterangan dari admin."}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {daftar.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Activity className="size-8" />}
              title="Belum ada servis berjalan"
              description="Buat booking untuk memulai servis."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {daftar.map((s) => {
            const idx = URUTAN_STATUS.indexOf(s.status);
            return (
              <Card key={s.id}>
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-base">
                      {s.nomor} · {s.jenis}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.kendaraan} · {s.plat} · Mekanik {s.mekanik} · {tanggalPanjang(s.tanggal)}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p>
                      <span className="text-muted-foreground">Keluhan:</span> {s.keluhan}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Pekerjaan:</span> {s.pekerjaan}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <ol className="flex flex-wrap gap-2">
                      {URUTAN_STATUS.map((st, i) => (
                        <li
                          key={st}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                            i <= idx
                              ? "border-primary/40 bg-primary/10 font-semibold text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {i <= idx && <CheckCircle2 className="size-3.5" />}
                          {st}
                        </li>
                      ))}
                    </ol>
                    {s.status === "Menunggu Pembayaran" && (
                      <div className="flex justify-end shrink-0 sm:self-center">
                        <Button asChild size="sm" className="gap-1.5 font-semibold shadow-xs">
                          <Link to="/pelanggan/pembayaran" search={{ trx: s.noTransaksi }}>
                            <CreditCard className="size-4" /> Detail <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    )}
                    {s.status === "Selesai Dibayar" && (
                      <div className="flex justify-end shrink-0 sm:self-center">
                        <Button asChild size="sm" variant="outline" className="gap-1.5 font-semibold shadow-xs">
                          <Link to="/pelanggan/pembayaran" search={{ trx: s.noTransaksi }}>
                            <Receipt className="size-4" /> Detail <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
