import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Users, Wrench, Package, ArrowRight, Inbox, Wallet, Activity, Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
import { useStore, rupiah, MEKANIK } from "@/lib/store";

export const Route = createFileRoute("/_shell/owner/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Owner — AppBenk" },
      {
        name: "description",
        content:
          "Ringkasan bisnis bengkel: omzet, jumlah servis, pelanggan aktif, dan performa mekanik.",
      },
      { property: "og:title", content: "Dashboard Owner — AppBenk" },
      { property: "og:description", content: "Pantau kinerja bisnis bengkel secara menyeluruh." },
    ],
  }),
  component: DashboardOwner,
});

function DashboardOwner() {
  const { servis, pelanggan, sparepart, booking, pembayaran } = useStore();
  const omzet = servis.reduce((a, s) => a + s.total, 0);

  // Operational monitoring metrics (Admin features)
  const bookingMenunggu = useMemo(
    () => booking.filter((b) => b.status === "Menunggu Konfirmasi").length,
    [booking],
  );
  const servisAktif = useMemo(
    () => servis.filter((s) => s.status === "Diproses" || s.status === "Menunggu").length,
    [servis],
  );
  const pembayaranVerifikasi = useMemo(
    () => pembayaran.filter((p) => p.status === "Menunggu Verifikasi").length,
    [pembayaran],
  );
  const stokKritis = useMemo(
    () => sparepart.filter((p) => p.stok <= p.minStok).length,
    [sparepart],
  );

  const stats = [
    { label: "Total Omzet", value: rupiah(omzet), icon: TrendingUp, hint: "seluruh transaksi" },
    {
      label: "Total Servis",
      value: String(servis.length),
      icon: Wrench,
      hint: "pekerjaan tercatat",
    },
    {
      label: "Pelanggan Aktif",
      value: String(pelanggan.length),
      icon: Users,
      hint: "terdaftar di sistem",
    },
    { label: "Item Sparepart", value: String(sparepart.length), icon: Package, hint: "di katalog" },
  ];

  const [periode, setPeriode] = useState<"bulanan" | "tahunan">("tahunan");
  const [tahun, setTahun] = useState<string>("2026");

  const daftarTahun = useMemo(
    () =>
      Array.from(new Set(servis.map((s) => s.tanggal.slice(0, 4)))).sort((a, b) =>
        b.localeCompare(a),
      ),
    [servis],
  );

  const transaksi = useMemo(
    () => servis.filter((s) => s.status === "Selesai Dibayar" && s.tanggal.startsWith(tahun)),
    [servis, tahun],
  );

  const BULAN = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  const grafik = useMemo(() => {
    if (periode === "tahunan") {
      return BULAN.map((b, i) => ({
        label: b,
        nilai: transaksi
          .filter((s) => Number(s.tanggal.slice(5, 7)) === i + 1)
          .reduce((a, s) => a + s.total, 0),
      }));
    }
    const hari = new Map<string, number>();
    transaksi
      .filter((s) => s.tanggal.slice(5, 7) === "08")
      .forEach((s) =>
        hari.set(s.tanggal.slice(8, 10), (hari.get(s.tanggal.slice(8, 10)) ?? 0) + s.total),
      );
    return [...hari.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, nilai]) => ({ label: `${d} Agu`, nilai }));
  }, [transaksi, periode]);

  const totalPenjualan = transaksi.reduce((a, s) => a + s.total, 0);
  const rataPenjualan = transaksi.length ? Math.round(totalPenjualan / transaksi.length) : 0;

  const perMekanik = MEKANIK.map((m) => {
    const list = servis.filter((s) => s.mekanik === m);
    return { m, jumlah: list.length, nilai: list.reduce((a, s) => a + s.total, 0) };
  }).sort((a, b) => b.nilai - a.nilai);

  return (
    <>
      <PageHeader
        title="Dashboard Owner"
        description="Gambaran menyeluruh performa bisnis bengkel."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-l-4 border-l-primary">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <s.icon className="size-4 text-primary" />
              </div>
              <p className="mt-3 font-display text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── MONITORING OPERASIONAL BENGKEL (AKSES ADMIN) ── */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Monitoring Operasional Bengkel</CardTitle>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Akses Admin
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pantau langsung seluruh alur operasional dan transaksi bengkel Anda
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link to="/admin/dashboard">
              <Eye className="size-3.5" /> Dashboard Admin Lengkap
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/admin/booking"
              className="group flex items-center justify-between rounded-lg border bg-card p-3.5 transition-all hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <Inbox className="size-4.5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Booking Masuk</p>
                  <p className="text-base font-bold text-foreground">
                    {bookingMenunggu}{" "}
                    <span className="text-xs font-normal text-muted-foreground">Menunggu</span>
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/admin/servis"
              className="group flex items-center justify-between rounded-lg border bg-card p-3.5 transition-all hover:border-amber-500/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Wrench className="size-4.5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Servis Berjalan</p>
                  <p className="text-base font-bold text-foreground">
                    {servisAktif}{" "}
                    <span className="text-xs font-normal text-muted-foreground">Servis</span>
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/admin/pembayaran"
              className="group flex items-center justify-between rounded-lg border bg-card p-3.5 transition-all hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Wallet className="size-4.5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Verifikasi Bayar</p>
                  <p className="text-base font-bold text-foreground">
                    {pembayaranVerifikasi}{" "}
                    <span className="text-xs font-normal text-muted-foreground">Transaksi</span>
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/admin/stok"
              className="group flex items-center justify-between rounded-lg border bg-card p-3.5 transition-all hover:border-rose-500/50 hover:bg-rose-50/30 dark:hover:bg-rose-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                  <Package className="size-4.5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Stok Kritis</p>
                  <p className="text-base font-bold text-foreground">
                    {stokKritis}{" "}
                    <span className="text-xs font-normal text-muted-foreground">Item</span>
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
          <CardTitle className="text-base">Grafik Penjualan</CardTitle>
          <div className="flex gap-2">
            <Select value={tahun} onValueChange={setTahun}>
              <SelectTrigger className="w-32 bg-card" aria-label="Filter tahun penjualan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {daftarTahun.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={periode} onValueChange={(v) => setPeriode(v as typeof periode)}>
              <SelectTrigger className="w-36 bg-card" aria-label="Periode grafik">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulanan">Bulanan</SelectItem>
                <SelectItem value="tahunan">Tahunan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Total Penjualan", rupiah(totalPenjualan)],
              ["Transaksi", `${transaksi.length} transaksi`],
              ["Rata-rata Penjualan", rupiah(rataPenjualan)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {l}
                </p>
                <p className="mt-1 font-display text-lg font-bold">{v}</p>
              </div>
            ))}
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafik} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000000 ? `${v / 1000000}jt` : `${v / 1000}rb`
                  }
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={52}
                />
                <Tooltip
                  formatter={(v: number) => rupiah(v)}
                  cursor={{ className: "fill-muted" }}
                />
                <Bar
                  dataKey="nilai"
                  name="Penjualan"
                  className="fill-primary"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kontribusi Mekanik</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mekanik</TableHead>
                <TableHead className="text-right">Jumlah Servis</TableHead>
                <TableHead className="text-right">Nilai Servis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perMekanik.map((m) => (
                <TableRow key={m.m}>
                  <TableCell className="font-medium">{m.m}</TableCell>
                  <TableCell className="text-right">{m.jumlah}</TableCell>
                  <TableCell className="text-right">{rupiah(m.nilai)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
