import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Inbox, CalendarClock, Loader2, CheckCircle2, Package, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore, tanggalPanjang } from "@/lib/store";

export const Route = createFileRoute("/_shell/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin Bengkel — AppBenk" },
      {
        name: "description",
        content:
          "Ringkasan booking masuk, servis hari ini, servis berjalan, dan stok sparepart bengkel.",
      },
      { property: "og:title", content: "Dashboard Admin Bengkel — AppBenk" },
      {
        property: "og:description",
        content: "Kendalikan operasional bengkel harian dari satu dashboard.",
      },
    ],
  }),
  component: DashboardAdmin,
});

function DashboardAdmin() {
  const { servis, sparepart, booking, refreshBooking, refreshServis, refreshSparepart } = useStore();

  useEffect(() => {
    refreshBooking?.().catch(() => {});
    refreshServis?.().catch(() => {});
    refreshSparepart?.().catch(() => {});

    const handleSync = () => {
      refreshBooking?.().catch(() => {});
      refreshServis?.().catch(() => {});
      refreshSparepart?.().catch(() => {});
    };

    window.addEventListener("appbenk_booking_updated", handleSync);
    window.addEventListener("appbenk_servis_updated", handleSync);
    window.addEventListener("appbenk_sparepart_updated", handleSync);

    const interval = setInterval(handleSync, 10000);
    return () => {
      window.removeEventListener("appbenk_booking_updated", handleSync);
      window.removeEventListener("appbenk_servis_updated", handleSync);
      window.removeEventListener("appbenk_sparepart_updated", handleSync);
      clearInterval(interval);
    };
  }, [refreshBooking, refreshServis, refreshSparepart]);

  const hariIni = new Date().toISOString().slice(0, 10);

  const stats = [
    {
      label: "Booking Masuk",
      value: booking.filter((b) => b.status === "Menunggu Konfirmasi").length,
      icon: Inbox,
      hint: "menunggu konfirmasi",
    },
    {
      label: "Servis Hari Ini",
      value: servis.filter((s) => s.tanggal === hariIni).length,
      icon: CalendarClock,
      hint: "masuk hari ini",
    },
    {
      label: "Sedang Berjalan",
      value: servis.filter((s) => s.status === "Diproses").length,
      icon: Loader2,
      hint: "dikerjakan mekanik",
    },
    {
      label: "Servis Selesai",
      value: servis.filter((s) => ["Selesai", "Selesai Dibayar"].includes(s.status)).length,
      icon: CheckCircle2,
      hint: "sudah rampung",
    },
    { label: "Sparepart", value: sparepart.length, icon: Package, hint: "item di katalog" },
  ];

  const aktivitas = [
    ...booking
      .slice(0, 3)
      .map((b) => ({
        id: b.id,
        teks: `Booking ${b.nomor} dari ${b.pelanggan}`,
        ket: `${b.jenis} · ${b.status}`,
        tanggal: b.tanggal,
      })),
    ...servis
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        teks: `Servis ${s.nomor} — ${s.pelanggan}`,
        ket: `${s.pekerjaan} · ${s.status}`,
        tanggal: s.tanggal,
      })),
  ].sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  return (
    <>
      <PageHeader
        title="Dashboard Admin Bengkel"
        description="Ringkasan operasional bengkel hari ini."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="border-l-4 border-l-primary">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <s.icon className="size-4 text-primary" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Servis Terbaru</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
              <Link to="/admin/servis">
                Kelola <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Servis</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Mekanik</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servis.slice(0, 6).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nomor}</TableCell>
                      <TableCell>{s.pelanggan}</TableCell>
                      <TableCell>{s.mekanik}</TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {tanggalPanjang(s.tanggal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
              <Link to="/admin/booking">
                Booking <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {aktivitas.slice(0, 6).map((a) => (
              <div key={a.teks} className="rounded-md border p-3">
                <p className="text-sm font-medium">{a.teks}</p>
                <p className="text-xs text-muted-foreground">
                  {a.ket} · {tanggalPanjang(a.tanggal)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
