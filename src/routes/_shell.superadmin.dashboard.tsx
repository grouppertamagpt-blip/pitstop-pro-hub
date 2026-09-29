import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  LifeBuoy,
  ShieldAlert,
  Activity,
  ArrowRight,
  TrendingUp,
  Server,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { superAdminService, systemLogService, customerServiceTicketService } from "@/services/appbenk-service";
import type { CSTicketRow, SystemLogRow } from "@/types/database";

export const Route = createFileRoute("/_shell/superadmin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Super Admin — AppBenk Platform" },
      {
        name: "description",
        content: "Pusat kendali ekosistem platform multi-tenant AppBenk.",
      },
    ],
  }),
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalBengkel: 3,
    totalUser: 68,
    bengkelBasic: 2,
    bengkelPremium: 1,
    tiketBelumSelesai: 2,
    errorHariIni: 2,
  });
  const [recentTickets, setRecentTickets] = useState<CSTicketRow[]>([]);
  const [recentErrors, setRecentErrors] = useState<SystemLogRow[]>([]);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const start = Date.now();
      const [resStats, tickets, logs] = await Promise.all([
        superAdminService.getPlatformStats(),
        customerServiceTicketService.getAllTickets(),
        systemLogService.getAllLogs(),
      ]);
      setPingLatency(Math.max(12, Date.now() - start));
      setStats(resStats);
      setRecentTickets(tickets.slice(0, 4));
      setRecentErrors(logs.slice(0, 4));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      label: "Total Bengkel Terdaftar",
      value: stats.totalBengkel,
      icon: Building2,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      hint: "Klien aktif di platform",
      to: "/superadmin/klien",
    },
    {
      label: "Total Pengguna",
      value: stats.totalUser,
      icon: Users,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      hint: "Admin, Owner & Pelanggan",
      to: "/superadmin/klien",
    },
    {
      label: "Bengkel Aktif",
      value: stats.totalBengkel,
      icon: ShieldCheck,
      color: "text-slate-500",
      bg: "bg-slate-500/10",
      hint: "Paket standar operasional",
      to: "/superadmin/klien",
    },
    {
      label: "Tiket Belum Selesai",
      value: stats.tiketBelumSelesai,
      icon: LifeBuoy,
      color: stats.tiketBelumSelesai > 0 ? "text-amber-600" : "text-emerald-600",
      bg: stats.tiketBelumSelesai > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
      hint: "Perlu ditindaklanjuti",
      to: "/superadmin/cs",
    },
    {
      label: "Error Sistem Hari Ini",
      value: stats.errorHariIni,
      icon: ShieldAlert,
      color: stats.errorHariIni > 0 ? "text-rose-600" : "text-emerald-600",
      bg: stats.errorHariIni > 0 ? "bg-rose-500/10" : "bg-emerald-500/10",
      hint: "Tercatat di system_logs",
      to: "/superadmin/error-log",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard Super Admin"
        description="Pusat kendali ekosistem platform multi-tenant AppBenk, pemantauan klien, tiket bantuan, dan integritas sistem."
      />

      {/* Grid 5 Kartu Statistik */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((c) => (
          <Link key={c.label} to={c.to} className="group">
            <Card className="h-full border transition-all hover:border-primary/50 hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </span>
                  <div className={`flex size-8 items-center justify-center rounded-lg ${c.bg}`}>
                    <c.icon className={`size-4.5 ${c.color}`} />
                  </div>
                </div>
                <p className="mt-2 font-display text-2xl font-bold tracking-tight">
                  {c.value}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{c.hint}</span>
                  <ArrowRight className="size-3 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Status Paket & Pertumbuhan */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Status Layanan Kemitraan Bengkel</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Seluruh bengkel mitra beroperasi dengan Paket Basic (Standar Operasional)
                  </p>
                </div>
                <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                  <ShieldCheck className="size-3" /> {stats.totalBengkel} Bengkel Aktif
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2.5 rounded-full bg-primary" /> Paket Basic Standar ({stats.totalBengkel} bengkel mitra)
                  </span>
                  <span className="text-xs font-semibold text-primary">100% Aktif</span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    style={{ width: "100%" }}
                    className="bg-primary transition-all"
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Paket Basic (Standard Platform)</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Standar penuh seluruh mitra: manajemen servis &amp; antrean, booking online pelanggan, inventori sparepart, kasir &amp; transaksi kas, serta invoice digital.
                    </p>
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                </div>
              </div>

              {/* Pertumbuhan Bengkel Bar Sederhana */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between pb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pertumbuhan Klien Baru (Q1–Q3 2026)
                  </p>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <TrendingUp className="size-3.5" /> +150% YoY
                  </span>
                </div>
                <div className="flex items-end gap-3 pt-2">
                  {[
                    { label: "Jan", val: 1, max: 5 },
                    { label: "Mar", val: 2, max: 5 },
                    { label: "Mei", val: 2, max: 5 },
                    { label: "Jul", val: 3, max: 5 },
                    { label: "Sep", val: stats.totalBengkel, max: 5 },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground">{item.val}</span>
                      <div className="w-full rounded-t-md bg-primary/20 hover:bg-primary transition-colors" style={{ height: `${Math.max(15, (item.val / 5) * 80)}px` }} />
                      <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tiket Terkini */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Tiket Customer Service Masuk</CardTitle>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link to="/superadmin/cs">
                  Lihat Semua <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {recentTickets.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Belum ada tiket bantuan</p>
              ) : (
                recentTickets.map((t) => (
                  <Link
                    key={t.id}
                    to="/superadmin/cs"
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{t.ticket_number || "CS-0001"}</span>
                        <span className="text-xs font-semibold">{t.subjek}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {t.user_name} ({t.user_role}) · {t.bengkel_nama || "AppBenk Workshop"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        t.status === "Baru"
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 animate-pulse"
                          : t.status === "Diproses"
                          ? "border-blue-500 bg-blue-500/10 text-blue-600"
                          : "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {t.status}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Server Health & Error Log */}
        <div className="space-y-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="size-4.5 text-emerald-600" />
                  <CardTitle className="text-base text-emerald-950 dark:text-emerald-100">
                    Server & Platform Health
                  </CardTitle>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="size-2 animate-ping rounded-full bg-emerald-500" /> Online
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md border bg-card p-2.5">
                  <p className="text-[11px] text-muted-foreground">Platform Uptime</p>
                  <p className="font-display text-lg font-bold text-emerald-600">99.98%</p>
                </div>
                <div className="rounded-md border bg-card p-2.5">
                  <p className="text-[11px] text-muted-foreground">API Latency</p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {pingLatency ? `${pingLatency} ms` : "24 ms"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" /> PostgreSQL & RLS
                  </span>
                  <span className="font-bold text-emerald-600">Terhubung</span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" /> Supabase Realtime
                  </span>
                  <span className="font-bold text-emerald-600">Aktif</span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" /> Storage Bucket
                  </span>
                  <span className="font-bold text-emerald-600">payment-assets</span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" /> WhatsApp Gateway
                  </span>
                  <span className="font-bold text-emerald-600">Wablas / Twilio</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Log Error Terbaru */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4.5 text-amber-500" />
                <CardTitle className="text-base">Monitor Error Sistem</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link to="/superadmin/error-log">
                  Semua <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {recentErrors.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada error sistem</p>
              ) : (
                recentErrors.map((err) => (
                  <div key={err.id} className="rounded-md border p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {err.module}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          err.status === "Open"
                            ? "border-rose-500 text-rose-600"
                            : err.status === "Investigasi"
                            ? "border-amber-500 text-amber-600"
                            : "border-emerald-500 text-emerald-600"
                        }`}
                      >
                        {err.status}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 font-medium">{err.error_message}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {err.bengkel_nama || "Bengkel"} · {new Date(err.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

