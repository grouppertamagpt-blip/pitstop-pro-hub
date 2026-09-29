import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  Wallet,
  Download,
  CheckCircle2,
  Receipt,
  QrCode,
  CreditCard,
  Building2,
  Clock,
  Printer,
  ExternalLink,
  Smartphone,
  Eye,
  AlertCircle,
  FileCheck,
  Sparkles,
  UploadCloud,
  Copy,
  Check,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { unduhNota } from "@/lib/nota";
import {
  useStore,
  rupiah,
  tanggalPanjang,
  type MetodeBayar,
  type Servis,
} from "@/lib/store";
import {
  storagePaymentService,
  type WorkshopPaymentAccountRow,
} from "@/services/appbenk-service";

export const Route = createFileRoute("/_shell/pelanggan/pembayaran")({
  validateSearch: (search: Record<string, unknown>): { trx?: string } =>
    typeof search["trx"] === "string" ? { trx: search["trx"] } : {},
  head: () => ({
    meta: [
      { title: "Pembayaran & Tagihan — AppBenk" },
      {
        name: "description",
        content:
          "Lihat nomor transaksi, rincian jasa dan sparepart, total biaya, bayar servis dengan QRIS, Transfer Bank, atau Cash, dan unduh bukti pembayaran.",
      },
      { property: "og:title", content: "Pembayaran & Tagihan — AppBenk" },
      {
        property: "og:description",
        content: "Detail tagihan, pembayaran manual (QRIS, Transfer, Cash), dan nota servis kendaraan Anda.",
      },
    ],
  }),
  component: PembayaranPelanggan,
});

const METODE: { id: MetodeBayar; label: string; desc: string; icon: any }[] = [
  {
    id: "QRIS" as MetodeBayar,
    label: "QRIS (Semua E-Wallet & M-Banking)",
    desc: "Scan QRIS resmi bengkel via GoPay, OVO, DANA, BCA, Mandiri, BRI, dll. Unggah bukti pembayaran.",
    icon: QrCode,
  },
  {
    id: "Transfer Bank" as MetodeBayar,
    label: "Transfer Rekening Bank",
    desc: "Transfer ke rekening resmi bengkel dan unggah foto/screenshot bukti transfer.",
    icon: Building2,
  },
  {
    id: "Cash" as MetodeBayar,
    label: "Tunai / Kasir Bengkel",
    desc: "Konfirmasi pembayaran tunai langsung di meja kasir bengkel saat pengambilan unit.",
    icon: Wallet,
  },
];

export interface BuktiBayarData {
  noTransaksi: string;
  nomorServis: string;
  gatewayRef: string;
  waktu: string;
  pelanggan: string;
  kendaraan: string;
  plat: string;
  mekanik: string;
  jenisServis: string;
  biayaJasa: number;
  biayaPart: number;
  total: number;
  metode: string;
  items: Array<{ nama: string; jumlah: number; harga: number }>;
}

function PembayaranPelanggan() {
  const { user } = useAuth();
  const { trx } = Route.useSearch();
  const {
    servis,
    ajukanPembayaran,
    pelanggan,
    pembayaran,
    booking,
    bengkel,
    workshopPaymentAccounts,
    refreshPaymentAccounts,
    refreshPembayaran,
    refreshServis,
  } = useStore();

  const currentBengkel = bengkel[0];

  const nama = user?.pelanggan || user?.nama || "";
  const profil = pelanggan.find(
    (p) => p.nama === nama || (user?.pelangganId && p.id === user.pelangganId),
  );

  const userNamaLower = (user?.nama || "").trim().toLowerCase();
  const userPelangganLower = (user?.pelanggan || "").trim().toLowerCase();
  const authId = user?.id;
  const pelangganId = user?.pelangganId;

  const isMilikSaya = (s: Servis) => {
    if (
      pelangganId &&
      ((s as any).pelangganId === pelangganId || (s as any).idPelanggan === pelangganId)
    )
      return true;
    if (
      authId &&
      ((s as any).pelangganId === authId || (s as any).idPelanggan === authId)
    )
      return true;
    if (s.pelanggan) {
      const p = s.pelanggan.trim().toLowerCase();
      if (userNamaLower && p === userNamaLower) return true;
      if (userPelangganLower && p === userPelangganLower) return true;
    }
    if (s.bookingId) {
      const bk = booking?.find((b) => b.id === s.bookingId);
      if (bk) {
        if (pelangganId && bk.customerId === pelangganId) return true;
        if (authId && bk.customerId === authId) return true;
        const bkp = bk.pelanggan?.trim().toLowerCase();
        if (userNamaLower && bkp === userNamaLower) return true;
        if (userPelangganLower && bkp === userPelangganLower) return true;
      }
    }
    return false;
  };

  const transaksi = servis.filter(
    (s) =>
      (isMilikSaya(s) || (trx && (s.noTransaksi === trx || s.id === trx))) &&
      ["Menunggu Pembayaran", "Selesai Dibayar"].includes(s.status),
  );
  const belumLunas = transaksi.filter((s) => s.status === "Menunggu Pembayaran");

  const targetTrx = trx ? servis.find((s) => s.noTransaksi === trx || s.id === trx) : null;
  const [pilih, setPilih] = useState<string | null>(
    targetTrx?.id ?? trx ?? belumLunas[0]?.id ?? transaksi[0]?.id ?? null,
  );

  // Dialog States
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<Servis | null>(null);

  const detail =
    transaksi.find((s) => s.id === pilih || s.noTransaksi === pilih) ??
    modalItem ??
    transaksi[0] ??
    null;

  const targetWorkshopId =
    detail?.bengkelId ||
    (detail as any)?.id_bengkel ||
    (detail as any)?.workshop_id ||
    user?.bengkelId ||
    currentBengkel?.id;

  const activeWorkshop =
    (targetWorkshopId ? bengkel.find((b) => b.id === targetWorkshopId) : null) || currentBengkel;
  const bengkelNama = activeWorkshop?.nama || currentBengkel?.nama || "AppBenk Workshop & Service";
  const bengkelKota =
    (activeWorkshop?.alamat ? activeWorkshop.alamat.split(",")[0] : null) ||
    (currentBengkel?.alamat ? currentBengkel.alamat.split(",")[0] : null) ||
    "Yogyakarta";

  const [bayarOpen, setBayarOpen] = useState(false);
  const [metode, setMetode] = useState<MetodeBayar>("QRIS");
  const [sukses, setSukses] = useState(false);
  const [bukti, setBukti] = useState<string | undefined>();
  const [namaBukti, setNamaBukti] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Bukti Preview modal
  const [previewBuktiOpen, setPreviewBuktiOpen] = useState(false);
  const [previewBuktiUrl, setPreviewBuktiUrl] = useState<string | null>(null);

  // Bukti Pembayaran Digital (E-Receipt) State
  const [buktiModalOpen, setBuktiModalOpen] = useState(false);
  const [buktiData, setBuktiData] = useState<BuktiBayarData | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Active accounts from workshop settings (multi-tenant scoped)
  const activeBankAccounts = useMemo(() => {
    const list = (workshopPaymentAccounts || []).filter(
      (a) =>
        a.account_type === "bank_transfer" &&
        a.is_active &&
        (!targetWorkshopId || a.workshop_id === targetWorkshopId || a.id_bengkel === targetWorkshopId),
    );
    if (list.length > 0) return list;
    return [
      {
        id: "default-bca",
        account_type: "bank_transfer",
        bank_name: "Bank BCA",
        account_number: "8830-192-881",
        account_holder_name: bengkelNama,
        is_active: true,
      },
      {
        id: "default-mandiri",
        account_type: "bank_transfer",
        bank_name: "Bank Mandiri",
        account_number: "132-00-9921-002",
        account_holder_name: bengkelNama,
        is_active: true,
      },
      {
        id: "default-bri",
        account_type: "bank_transfer",
        bank_name: "Bank BRI",
        account_number: "0341-01-002931-501",
        account_holder_name: bengkelNama,
        is_active: true,
      },
    ];
  }, [workshopPaymentAccounts, targetWorkshopId, bengkelNama]);

  const activeQRIS = useMemo(() => {
    // Kumpulkan seluruh kandidat akun QRIS dari semua layer data
    const candidates: (WorkshopPaymentAccountRow & { _source?: string })[] = [];

    const getTime = (item: any) => {
      if (!item) return 0;
      const t = item.updated_at || item.created_at;
      if (!t) return 0;
      const parsed = new Date(t).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    // Helper: ambil QRIS dari array, coba match workshopId, fallback ke semua jika kosong
    const addFromArray = (arr: any[], source: string) => {
      if (!arr || !arr.length) return;
      const qrisAll = arr.filter((a: any) => a.account_type === "qris");
      const matched = targetWorkshopId
        ? qrisAll.filter(
            (a: any) =>
              a.workshop_id === targetWorkshopId || a.id_bengkel === targetWorkshopId,
          )
        : qrisAll;
      // Kalau ada yang cocok pakai itu, kalau tidak pakai semua (fallback lintas workshop)
      const toAdd = matched.length > 0 ? matched : qrisAll;
      candidates.push(...toAdd.map((c: any) => ({ ...c, _source: source })));
    };

    // 1. Dari store
    addFromArray(workshopPaymentAccounts || [], "store");

    // 2. Dari localStorage list
    if (typeof window !== "undefined") {
      try {
        const rawList = localStorage.getItem("appbenk_workshop_payment_accounts");
        if (rawList) {
          const parsed = JSON.parse(rawList);
          if (Array.isArray(parsed)) addFromArray(parsed, "localList");
        }
      } catch {}
    }

    // 3. Direct localStorage keys — SELALU sertakan tanpa filter workshopId (final fallback)
    let fallbackImage: string | null = null;
    if (typeof window !== "undefined") {
      try {
        // Key ber-scope workshop
        if (targetWorkshopId) {
          const wsRaw = localStorage.getItem(`appbenk_qris_active_${targetWorkshopId}`);
          if (wsRaw) {
            const parsed = JSON.parse(wsRaw);
            candidates.push({ ...parsed, _source: "directWorkshop" });
          }
          fallbackImage = localStorage.getItem(`appbenk_qris_image_data_${targetWorkshopId}`);
        }
        // Key global — SELALU sertakan tanpa filter, sebagai last resort
        const globalRaw = localStorage.getItem("appbenk_qris_active");
        if (globalRaw) {
          const parsed = JSON.parse(globalRaw);
          candidates.push({ ...parsed, _source: "directGlobal" });
        }
        if (!fallbackImage) {
          fallbackImage = localStorage.getItem("appbenk_qris_image_data");
        }
      } catch {}
    }

    // Urutkan kandidat berdasarkan updated_at DESC (paling baru di paling depan)
    candidates.sort((a, b) => getTime(b) - getTime(a));

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = candidates.filter((c) => {
      if (!c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    // Prioritaskan kandidat paling baru yang memiliki qr_image_url valid
    const bestWithImage = unique.find((c) => Boolean(c.qr_image_url && c.qr_image_url.trim().length > 0));
    const best = bestWithImage || unique[0];

    if (!best && !fallbackImage) return null;

    let finalImageUrl = best?.qr_image_url?.trim() || fallbackImage || null;

    // Cache-busting untuk gambar remote HTTP/HTTPS agar browser tidak menampilkan gambar cache lama
    if (finalImageUrl && (finalImageUrl.startsWith("http://") || finalImageUrl.startsWith("https://"))) {
      const cacheBustTime = getTime(best) || Date.now();
      if (!finalImageUrl.includes("t=")) {
        const sep = finalImageUrl.includes("?") ? "&" : "?";
        finalImageUrl = `${finalImageUrl}${sep}t=${cacheBustTime}`;
      }
    }

    const isActive = best?.is_active !== undefined ? Boolean(best.is_active) : true;

    return {
      ...(best || {}),
      display_name: best?.display_name || "QRIS Standar Nasional AppBenk",
      qr_image_url: finalImageUrl,
      is_active: isActive,
    };
  }, [workshopPaymentAccounts, targetWorkshopId]);

  const isQrisActive = activeQRIS ? activeQRIS.is_active !== false : true;

  const daftarMetode = useMemo(() => {
    if (!isQrisActive) {
      return METODE.filter((m) => m.id !== "QRIS");
    }
    return METODE;
  }, [isQrisActive]);

  const [qrisImageError, setQrisImageError] = useState(false);

  useEffect(() => {
    refreshPaymentAccounts(targetWorkshopId);
    refreshPembayaran(targetWorkshopId);
    refreshServis?.();

    const handleUpdated = () => {
      refreshPaymentAccounts(targetWorkshopId);
      refreshPembayaran(targetWorkshopId);
      refreshServis?.();
    };

    if (typeof window === "undefined") return;
    window.addEventListener("appbenk_payment_accounts_updated", handleUpdated);
    window.addEventListener("appbenk_pembayaran_updated", handleUpdated);
    window.addEventListener("appbenk_servis_updated", handleUpdated);
    window.addEventListener("storage", handleUpdated);

    // Polling fallback 10 detik agar status pembayaran & tagihan pelanggan selalu sinkron
    const interval = setInterval(handleUpdated, 10000);

    return () => {
      window.removeEventListener("appbenk_payment_accounts_updated", handleUpdated);
      window.removeEventListener("appbenk_pembayaran_updated", handleUpdated);
      window.removeEventListener("appbenk_servis_updated", handleUpdated);
      window.removeEventListener("storage", handleUpdated);
      clearInterval(interval);
    };
  }, [targetWorkshopId, refreshPaymentAccounts, refreshPembayaran, refreshServis]);

  useEffect(() => {
    setQrisImageError(false);
  }, [activeQRIS?.qr_image_url]);

  useEffect(() => {
    if (!isQrisActive && metode === "QRIS") {
      setMetode("Transfer Bank");
    }
  }, [isQrisActive, metode]);

  useEffect(() => {
    if (trx) {
      const found = servis.find((s) => s.noTransaksi === trx || s.id === trx);
      if (found) {
        setPilih(found.id);
        setModalItem(found);
      }
    }
  }, [trx, servis]);

  const currentPayment = useMemo(() => {
    if (!detail) return null;
    return (
      pembayaran.find(
        (p) => p.servisId === detail.id || p.noTransaksi === detail.noTransaksi,
      ) ?? null
    );
  }, [detail, pembayaran]);

  const isLunas = detail?.status === "Selesai Dibayar" || currentPayment?.status === "Lunas";
  const isMenungguVerifikasi = !isLunas && currentPayment?.status === "Menunggu Verifikasi";
  const isDitolak = !isLunas && currentPayment?.status === "Bukti Ditolak";

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} berhasil disalin ke clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const bukaDetailModal = (s: Servis) => {
    setPilih(s.id);
    setModalItem(s);
    setDetailModalOpen(true);
  };

  const bukaModalBayar = (s?: Servis | null) => {
    const target = s || detail || modalItem || (transaksi && transaksi[0]);
    if (!target) {
      toast.error("Data tagihan transaksi tidak ditemukan.");
      return;
    }
    setPilih(target.id);
    setModalItem(target);
    setSukses(false);
    setMetode(isQrisActive ? "QRIS" : "Transfer Bank");
    setBukti(undefined);
    setNamaBukti("");
    setSelectedFile(null);
    setFileInputKey((prev) => prev + 1);
    setBayarOpen(true);
  };

  const konfirmasiManual = async (s?: Servis | null) => {
    const target = s || detail || modalItem || (transaksi && transaksi[0]);
    if (!target) {
      toast.error("Data tagihan transaksi tidak ditemukan.");
      return;
    }

    // Duplicate check
    const pmb = pembayaran.find(
      (p) => p.servisId === target.id || p.noTransaksi === target.noTransaksi,
    );
    if (
      target.status === "Selesai Dibayar" ||
      pmb?.status === "Lunas"
    ) {
      toast.error("Tagihan ini sudah lunas!");
      return;
    }

    if (metode === "Transfer Bank" && !bukti && !selectedFile) {
      toast.error("Bukti transfer bank wajib diunggah untuk verifikasi.");
      return;
    }

    if (metode === "QRIS" && !bukti && !selectedFile) {
      toast.error(
        "Silakan unggah screenshot atau tangkap layar bukti pembayaran QRIS Anda.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      let finalBuktiUrl = bukti;

      // Upload file asli ke backend/storage jika ada
      if (selectedFile && metode !== "Cash") {
        try {
          const uploadedUrl = await storagePaymentService.uploadBuktiPembayaran(
            targetWorkshopId || "bengkel-001",
            target.noTransaksi,
            selectedFile
          );
          if (uploadedUrl) {
            finalBuktiUrl = uploadedUrl;
          }
        } catch (uploadErr) {
          console.warn("Upload file to storage failed, using data URL fallback:", uploadErr);
        }
      }

      // Submit payment - strictly updates status to 'Menunggu Verifikasi' and resets rejection reason
      ajukanPembayaran(target.id, metode, metode === "Cash" ? undefined : finalBuktiUrl);

      // Tutup modal agar pelanggan langsung melihat banner status "Sedang Diverifikasi"
      setBayarOpen(false);
      setSukses(false);
      setBukti(undefined);
      setNamaBukti("");
      setSelectedFile(null);

      // Refresh pembayaran data
      await refreshPembayaran(targetWorkshopId);

      if (metode === "Cash") {
        toast.success(
          `Pengajuan pembayaran tunai ${target.noTransaksi} terkirim! Admin bengkel akan memverifikasi saat pembayaran diterima di kasir.`,
        );
      } else {
        toast.success(
          `Bukti pembayaran ${metode} ${target.noTransaksi} berhasil dikirim! Menunggu verifikasi admin bengkel.`,
        );
      }
    } catch (err: any) {
      console.error("Gagal mengirim pembayaran:", err);
      toast.error(err?.message || "Gagal mengirim pembayaran. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateDemoEwalletScreenshot = (
    provider: "DANA" | "GoPay" | "OVO" | "ShopeePay",
    s: Servis,
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = 440;
    canvas.height = 760;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let primaryColor = "#108EE9";
    let secondaryColor = "#0D71B9";
    if (provider === "GoPay") {
      primaryColor = "#00AA13";
      secondaryColor = "#008810";
    } else if (provider === "OVO") {
      primaryColor = "#4C3494";
      secondaryColor = "#392470";
    } else if (provider === "ShopeePay") {
      primaryColor = "#EE4D2D";
      secondaryColor = "#C43A1E";
    }

    const grad = ctx.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, secondaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 160);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("14:30", 24, 28);
    ctx.font = "12px sans-serif";
    ctx.fillText("📶 4G  🔋 95%", canvas.width - 95, 28);

    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${provider} · Pembayaran Berhasil`, canvas.width / 2, 75);

    ctx.font = "12px sans-serif";
    ctx.fillText("Standar Pembayaran QRIS Nasional", canvas.width / 2, 98);

    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(20, 120, 400, 580, 16);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 175, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 12, 175);
    ctx.lineTo(canvas.width / 2 - 3, 184);
    ctx.lineTo(canvas.width / 2 + 14, 165);
    ctx.stroke();

    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Transaksi QRIS Berhasil!", canvas.width / 2, 230);

    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = primaryColor;
    ctx.fillText(rupiah(s.total), canvas.width / 2, 268);

    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText(
      `Merchant: ${bengkelNama}`,
      canvas.width / 2,
      292,
    );

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 315);
    ctx.lineTo(400, 315);
    ctx.stroke();

    const drawRow = (lbl: string, val: string, y: number) => {
      ctx.textAlign = "left";
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#64748B";
      ctx.fillText(lbl, 40, y);

      ctx.textAlign = "right";
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#1E293B";
      ctx.fillText(val, 400, y);
    };

    const now = new Date().toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    drawRow("No. Transaksi", s.noTransaksi, 350);
    drawRow("Waktu Bayar", now, 385);
    drawRow("Metode Bayar", `QRIS (${provider})`, 420);
    drawRow("Kendaraan", `${s.kendaraan} (${s.plat})`, 455);
    drawRow("Pelanggan", s.pelanggan, 490);
    drawRow("ID Ref Transaksi", `REF-${Date.now().toString().slice(-8)}`, 525);
    drawRow("Biaya Admin", "Rp 0 (Gratis)", 560);

    ctx.fillStyle = "#F1F5F9";
    ctx.beginPath();
    ctx.roundRect(40, 585, 360, 60, 8);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(
      "Simpan screenshot ini sebagai bukti transaksi resmi.",
      canvas.width / 2,
      610,
    );
    ctx.fillText("Standar QRIS Nasional · AppBenk Official", canvas.width / 2, 630);

    const dataUrl = canvas.toDataURL("image/png");
    setBukti(dataUrl);
    setNamaBukti(`screenshot_${provider.toLowerCase()}_${s.noTransaksi}.png`);
    toast.success(`Screenshot bukti bayar ${provider} siap dilampirkan!`);
  };

  const unggahBukti = (file?: File) => {
    if (!file) return;
    if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/i.test(file.type) && !/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) {
      toast.error("Format bukti harus JPG, JPEG, PNG, WEBP, atau PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran bukti maksimal 5 MB.");
      return;
    }
    setSelectedFile(file);
    setNamaBukti(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setBukti(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const tampilkanBuktiPembayaran = (s: Servis) => {
    const gwRef = `PAY-${s.noTransaksi.replace(/[^a-zA-Z0-9]/g, "")}`;
    const nowStr = new Date().toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "medium",
    });
    setBuktiData({
      noTransaksi: s.noTransaksi,
      nomorServis: s.nomor,
      gatewayRef: gwRef,
      waktu: nowStr,
      pelanggan: s.pelanggan,
      kendaraan: s.kendaraan,
      plat: s.plat,
      mekanik: s.mekanik,
      jenisServis: s.jenis,
      biayaJasa: s.biayaJasa,
      biayaPart: s.biayaPart,
      total: s.total,
      metode: s.metodeBayar || "QRIS",
      items: s.items.map((i) => ({
        nama: i.nama,
        jumlah: i.jumlah,
        harga: i.harga,
      })),
    });
    setBuktiModalOpen(true);
  };

  const cetakStruk = () => {
    window.print();
  };

  return (
    <>
      <PageHeader
        title="Pembayaran & Tagihan"
        description="Kelola pembayaran servis kendaraan Anda secara transparan melalui QRIS, Transfer Bank, atau Cash, dan unduh bukti pembayaran resmi."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-warning shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Belum Dibayar
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-warning-foreground">
              {rupiah(belumLunas.reduce((a, s) => a + s.total, 0))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {belumLunas.length} tagihan aktif
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sudah Dibayar (Lunas)
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-success">
              {rupiah(
                transaksi
                  .filter((s) => s.status === "Selesai Dibayar")
                  .reduce((a, s) => a + s.total, 0),
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {transaksi.filter((s) => s.status === "Selesai Dibayar").length} transaksi
              tuntas
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Riwayat Transaksi
            </p>
            <p className="mt-2 font-display text-2xl font-bold">{transaksi.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Termasuk Cash, Transfer & QRIS
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DETAIL AKTIF ATAS (JIKA ADA PILIHAN) */}
      {detail && (
        <Card className="overflow-hidden border-2 shadow-sm transition-all hover:border-primary/30">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b bg-muted/20 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold sm:text-lg">
              <Receipt className="size-5 text-primary" /> Detail Tagihan: {detail.noTransaksi}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />

              {/* Action Buttons based on status */}
              {isLunas ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => tampilkanBuktiPembayaran(detail)}
                    className="gap-1.5"
                  >
                    <FileCheck className="size-4 text-success" /> Bukti Pembayaran
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      unduhNota(detail, profil);
                      toast.success("Nota diunduh");
                    }}
                  >
                    <Download className="size-4" /> Unduh Nota
                  </Button>
                </>
              ) : isMenungguVerifikasi ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="gap-1.5 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold cursor-default"
                >
                  <Clock className="size-4" /> Menunggu Verifikasi Admin
                </Button>
              ) : isDitolak ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    bukaModalBayar(detail);
                  }}
                  className="gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="size-4" /> Bayar Ulang / Upload Bukti Baru
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    bukaModalBayar(detail);
                  }}
                  className="gap-1.5 shadow-sm cursor-pointer"
                >
                  <QrCode className="size-4" /> Bayar Sekarang
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            {/* Status Banners */}
            {isLunas && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-bold text-sm">Pembayaran Telah Lunas</p>
                  <p className="text-emerald-700/80 dark:text-emerald-300/80">
                    Pembayaran servis ini telah diverifikasi dan disetujui oleh Admin Bengkel.
                  </p>
                </div>
              </div>
            )}

            {isMenungguVerifikasi && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-start gap-3">
                  <Clock className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Pembayaran Sedang Diverifikasi Admin Bengkel</p>
                    <p className="text-amber-700/80 dark:text-amber-300/80">
                      Metode: <span className="font-semibold">{currentPayment?.metode || "Manual"}</span>. Pembayaran Anda sedang diperiksa oleh Admin Bengkel. Status akan otomatis berubah menjadi Lunas setelah disetujui.
                    </p>
                  </div>
                </div>
                {Boolean(currentPayment?.buktiUrl || (currentPayment as any)?.bukti_pembayaran) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewBuktiUrl(
                        currentPayment?.buktiUrl ||
                          (currentPayment as any)?.bukti_pembayaran ||
                          null,
                      );
                      setPreviewBuktiOpen(true);
                    }}
                    className="shrink-0 gap-1 border-amber-500/40 text-amber-800 hover:bg-amber-100/50 dark:text-amber-200 cursor-pointer"
                  >
                    <Eye className="size-3.5" /> Lihat Bukti Saya
                  </Button>
                )}
              </div>
            )}

            {isDitolak && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                <div className="flex items-start gap-3">
                  <AlertCircle className="size-5 shrink-0 text-destructive mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Pengajuan Pembayaran Ditolak</p>
                    <p className="text-destructive/90">
                      Alasan dari Admin:{" "}
                      <span className="font-bold">
                        {currentPayment?.alasanTolak ||
                          (currentPayment as any)?.alasan_penolakan ||
                          "Bukti transfer tidak terbaca / nominal belum sesuai."}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Silakan lakukan pembayaran ulang atau unggah bukti transfer yang valid.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    bukaModalBayar(detail);
                  }}
                  className="shrink-0 gap-1 cursor-pointer"
                >
                  <UploadCloud className="size-3.5" /> Unggah Bukti Baru
                </Button>
              </div>
            )}

            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info label="No. Transaksi" value={detail.noTransaksi} />
              <Info label="No. Servis" value={detail.nomor} />
              <Info label="Tanggal Servis" value={tanggalPanjang(detail.tanggal)} />
              <Info label="Nama Pelanggan" value={detail.pelanggan} />
              <Info label="Kendaraan & Plat" value={`${detail.kendaraan} · ${detail.plat}`} />
              <Info
                label="Metode Pembayaran"
                value={
                  currentPayment?.metode ||
                  detail.metodeBayar ||
                  (isLunas ? "QRIS / Transfer" : "Belum dipilih")
                }
              />
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Rincian Servis & Sparepart</TableHead>
                    <TableHead className="w-20 text-center">Jumlah</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <span className="block font-medium">Biaya Jasa — {detail.jenis}</span>
                      <span className="block text-xs text-muted-foreground">
                        {detail.pekerjaan || "Pengerjaan servis berkala & perbaikan teknisi"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">1</TableCell>
                    <TableCell className="text-right">{rupiah(detail.biayaJasa)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {rupiah(detail.biayaJasa)}
                    </TableCell>
                  </TableRow>
                  {detail.items.map((i) => (
                    <TableRow key={i.sparepartId}>
                      <TableCell>
                        <span className="block font-medium">{i.nama}</span>
                        <span className="block text-xs text-muted-foreground">{i.kode}</span>
                      </TableCell>
                      <TableCell className="text-center">{i.jumlah}</TableCell>
                      <TableCell className="text-right">{rupiah(i.harga)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {rupiah(i.harga * i.jumlah)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {detail.items.length === 0 && detail.biayaPart > 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>Sparepart ({detail.sparepart || "—"})</TableCell>
                      <TableCell className="text-right font-medium">
                        {rupiah(detail.biayaPart)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-muted/50 to-muted/80 p-4 border">
              <div>
                <span className="block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Tagihan Pembayaran
                </span>
                <span className="text-xs text-muted-foreground">
                  {isLunas
                    ? "Status: Pembayaran Lunas"
                    : isMenungguVerifikasi
                    ? "Status: Menunggu Verifikasi Admin"
                    : "Status: Menunggu Pembayaran"}
                </span>
              </div>
              <span className="font-display text-2xl font-bold text-primary">
                {rupiah(detail.total)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TABEL SEMUA TRANSAKSI */}
      <Card>
        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle className="text-base font-bold">Daftar Transaksi Pembayaran</CardTitle>
          <p className="text-xs text-muted-foreground">
            Klik "Lihat Detail" untuk memeriksa rincian lengkap servis, biaya, dan nota pembayaran resmi Anda.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          {transaksi.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-8" />}
              title="Belum ada transaksi pembayaran"
              description="Tagihan servis akan muncul otomatis setelah pengerjaan selesai di bengkel."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Transaksi</TableHead>
                    <TableHead>Detail Servis & Kendaraan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Total Biaya</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaksi.map((s) => {
                    const pmb = pembayaran.find(
                      (p) => p.servisId === s.id || p.noTransaksi === s.noTransaksi,
                    );
                    const rowLunas =
                      s.status === "Selesai Dibayar" || pmb?.status === "Lunas";
                    const rowMenunggu =
                      !rowLunas && pmb?.status === "Menunggu Verifikasi";
                    const rowDitolak = !rowLunas && pmb?.status === "Bukti Ditolak";

                    return (
                      <TableRow
                        key={s.id}
                        className={s.id === detail?.id ? "bg-primary/5" : undefined}
                      >
                        <TableCell className="font-bold font-mono">
                          {s.noTransaksi}
                        </TableCell>
                        <TableCell>
                          <span className="block font-medium">
                            {s.jenis} · {s.pekerjaan || s.nomor}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {s.kendaraan} ({s.plat}) · Mekanik: {s.mekanik}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {tanggalPanjang(s.tanggal)}
                        </TableCell>
                        <TableCell className="text-right font-display font-bold">
                          {rupiah(s.total)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <StatusBadge status={s.status} />
                            {rowMenunggu && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                <Clock className="size-3" /> Verifikasi Admin
                              </span>
                            )}
                            {rowDitolak && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive border border-destructive/30">
                                <AlertCircle className="size-3" /> Bukti Ditolak
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 shadow-2xs hover:border-primary hover:text-primary"
                            onClick={() => bukaDetailModal(s)}
                          >
                            <Eye className="size-3.5" /> Detail
                          </Button>
                          {rowLunas ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="gap-1 shadow-2xs"
                              onClick={() => tampilkanBuktiPembayaran(s)}
                            >
                              <FileCheck className="size-3.5 text-success" /> Bukti
                            </Button>
                          ) : rowMenunggu ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300"
                              onClick={() => {
                                setPilih(s.id);
                                const buktiSrc =
                                  pmb?.buktiUrl || (pmb as any)?.bukti_pembayaran;
                                if (buktiSrc) {
                                  setPreviewBuktiUrl(buktiSrc);
                                  setPreviewBuktiOpen(true);
                                } else {
                                  toast.info(
                                    "Pembayaran Anda sedang menunggu verifikasi oleh Admin Bengkel.",
                                  );
                                }
                              }}
                            >
                              <Clock className="size-3.5" /> Menunggu
                            </Button>
                          ) : rowDitolak ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => bukaModalBayar(s)}
                            >
                              <UploadCloud className="size-3.5" /> Unggah Ulang
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="gap-1 shadow-xs"
                              onClick={() => bukaModalBayar(s)}
                            >
                              <QrCode className="size-3.5" /> Bayar
                            </Button>
                          )}
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

      {/* -------------------------------------------------------------------- */}
      {/* 1. DIALOG DETAIL TRANSAKSI LENGKAP */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Receipt className="size-5 text-primary" /> Detail Transaksi & Servis
            </DialogTitle>
          </DialogHeader>

          {modalItem && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <p className="font-display text-xl font-bold font-mono">
                    {modalItem.noTransaksi}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No. Servis: {modalItem.nomor} · {tanggalPanjang(modalItem.tanggal)}
                  </p>
                </div>
                <StatusBadge status={modalItem.status} />
              </div>

              {/* Data Kendaraan & Mekanik */}
              <div className="grid gap-2.5 sm:grid-cols-2 text-sm">
                <Info label="Nama Pelanggan" value={modalItem.pelanggan} />
                <Info
                  label="Kendaraan"
                  value={`${modalItem.kendaraan} (${modalItem.plat})`}
                />
                <Info
                  label="Mekanik Bertugas"
                  value={modalItem.mekanik || "Teknisi Bengkel"}
                />
                <Info label="Jenis Servis" value={modalItem.jenis} />
              </div>

              {modalItem.keluhan && (
                <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                  <span className="font-semibold text-foreground">Keluhan Awal:</span>{" "}
                  <span className="text-muted-foreground">{modalItem.keluhan}</span>
                </div>
              )}

              {/* Tabel Rincian */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rincian Biaya Pengerjaan & Suku Cadang
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead>Rincian</TableHead>
                        <TableHead className="w-16 text-center">Qty</TableHead>
                        <TableHead className="text-right">Harga</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <span className="font-medium">
                            Jasa Servis ({modalItem.jenis})
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {modalItem.pekerjaan || "Pengerjaan perbaikan teknisi"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">1</TableCell>
                        <TableCell className="text-right">
                          {rupiah(modalItem.biayaJasa)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {rupiah(modalItem.biayaJasa)}
                        </TableCell>
                      </TableRow>
                      {modalItem.items.map((i) => (
                        <TableRow key={i.sparepartId}>
                          <TableCell>
                            <span className="font-medium">{i.nama}</span>
                            <span className="block text-xs text-muted-foreground">
                              {i.kode}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{i.jumlah}</TableCell>
                          <TableCell className="text-right">{rupiah(i.harga)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {rupiah(i.harga * i.jumlah)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Total & Status Bayar */}
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4 border">
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block">
                    Total Biaya Servis
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Metode:{" "}
                    {modalItem.metodeBayar ||
                      (modalItem.status === "Selesai Dibayar"
                        ? "QRIS / Transfer"
                        : "Belum ditentukan")}
                  </span>
                </div>
                <span className="font-display text-2xl font-bold text-primary">
                  {rupiah(modalItem.total)}
                </span>
              </div>

              <DialogFooter className="flex-row flex-wrap justify-between gap-2 sm:justify-between pt-2">
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                  Tutup
                </Button>
                <div className="flex items-center gap-2">
                  {modalItem.status === "Menunggu Pembayaran" ? (
                    <Button
                      onClick={() => {
                        setDetailModalOpen(false);
                        bukaModalBayar(modalItem);
                      }}
                      className="gap-1.5"
                    >
                      <QrCode className="size-4" /> Bayar Sekarang
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDetailModalOpen(false);
                          tampilkanBuktiPembayaran(modalItem);
                        }}
                        className="gap-1.5"
                      >
                        <FileCheck className="size-4 text-success" /> Bukti Bayar
                      </Button>
                      <Button
                        onClick={() => {
                          unduhNota(modalItem, profil);
                          toast.success("Nota berhasil diunduh");
                        }}
                        className="gap-1.5"
                      >
                        <Download className="size-4" /> Unduh Nota
                      </Button>
                    </>
                  )}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/* 2. DIALOG PEMBAYARAN MANUAL (QRIS, TRANSFER BANK, CASH) */}
      {/* -------------------------------------------------------------------- */}
      <Dialog
        open={bayarOpen}
        onOpenChange={(v) => {
          setBayarOpen(v);
          if (!v) setSukses(false);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" /> Pembayaran Servis
            </DialogTitle>
          </DialogHeader>

          {!detail ? null : sukses ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shadow-xs">
                <CheckCircle2 className="size-10" />
              </div>
              <div className="space-y-1.5 px-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  {metode === "Cash"
                    ? "Pengajuan Bayar Tunai Berhasil Dikirim!"
                    : `Pengajuan Pembayaran ${metode} Berhasil!`}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {metode === "Cash"
                    ? "Silakan lakukan pembayaran uang tunai di meja kasir bengkel saat mengambil kendaraan. Admin bengkel akan menyetujui transaksi setelah menerima uang tunai."
                    : "Bukti pembayaran Anda telah terkirim. Admin bengkel telah menerima notifikasi dan akan segera memeriksa serta memverifikasi mutasi pembayaran Anda."}
                </p>
              </div>

              <div className="mx-auto max-w-sm rounded-xl border bg-muted/30 p-3 text-left text-xs space-y-2">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">No. Transaksi</span>
                  <span className="font-mono font-bold text-foreground">
                    {detail.noTransaksi}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span className="font-bold text-primary">{rupiah(detail.total)}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Metode Bayar</span>
                  <span className="font-semibold text-foreground">{metode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status Pembayaran</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Menunggu Verifikasi Admin
                  </span>
                </div>
              </div>

              {bukti && (
                <div className="mx-auto max-w-xs rounded-xl border bg-card p-2 text-left">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                    Bukti yang Diunggah:
                  </p>
                  <img
                    src={bukti}
                    alt="Bukti Pembayaran"
                    className="max-h-52 w-auto mx-auto rounded-lg border object-contain shadow-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 truncate text-center">
                    {namaBukti || "bukti_pembayaran.png"}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={() => {
                    setBayarOpen(false);
                    setSukses(false);
                  }}
                  className="w-full sm:w-auto px-8"
                >
                  Selesai & Pantau Status
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Ringkasan Tagihan */}
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">No. Transaksi</span>
                  <span className="font-mono font-bold">{detail.noTransaksi}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Kendaraan</span>
                  <span className="font-medium">
                    {detail.kendaraan} ({detail.plat})
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2 font-display text-base font-bold items-center">
                  <span>Total Tagihan</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary text-xl font-bold">
                      {rupiah(detail.total)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleCopy(String(detail.total), "Nominal total")}
                      title="Salin nominal total"
                    >
                      {copiedText === String(detail.total) ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Pemilihan Metode */}
              <div className="space-y-2">
                <Label className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Pilih Metode Pembayaran
                </Label>
                <div className="grid gap-2">
                  {daftarMetode.map((m) => {
                    const IconComponent = m.icon;
                    const isSelected = metode === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setMetode(m.id)}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xs"
                            : "hover:bg-muted/50 border-border"
                        }`}
                      >
                        <div
                          className={`mt-0.5 rounded-lg p-2 ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <IconComponent className="size-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm leading-snug">{m.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ---------------- QRIS CONTAINER ---------------- */}
              {metode === "QRIS" && (
                <div className="space-y-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-b from-primary/5 via-background to-muted/20 p-4">
                  {/* Header QRIS */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 items-center justify-center rounded-md bg-red-600 px-2.5 text-xs font-black tracking-widest text-white shadow-sm">
                        QRIS
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-none">
                          QRIS Resmi Bengkel
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {activeQRIS?.display_name ||
                            bengkelNama}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* LANGKAH 1: SCAN QRIS */}
                  <div className="rounded-xl border bg-card p-3 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        1
                      </span>
                      <p className="text-xs font-bold text-foreground">
                        Scan QRIS dengan Aplikasi E-Wallet / Mobile Banking Anda
                      </p>
                    </div>

                    {activeQRIS?.qr_image_url && !qrisImageError ? (
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border">
                        <img
                          src={activeQRIS.qr_image_url}
                          alt="QRIS Bengkel AppBenk"
                          className="max-h-72 w-auto object-contain rounded-lg border shadow-xs"
                          onError={() => setQrisImageError(true)}
                        />
                        <p className="mt-2 font-display text-base font-bold text-slate-900">
                          {rupiah(detail.total)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {activeQRIS.display_name || bengkelNama}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-xl border border-dashed text-center space-y-2">
                        <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                          <AlertCircle className="size-5" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          QRIS Belum Dikonfigurasi
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                          Pembayaran QRIS sedang disiapkan oleh admin bengkel. Silakan gunakan metode transfer bank atau tunai.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* LANGKAH 2: UNGGAH BUKTI PEMBAYARAN */}
                  <div className="space-y-3 rounded-xl border bg-card p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          2
                        </span>
                        <p className="text-xs font-bold text-foreground">
                          Unggah Tangkap Layar (Screenshot) Bukti Transfer{" "}
                          <span className="text-destructive">*</span>
                        </p>
                      </div>
                      {bukti && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="size-3" /> Bukti Terlampir
                        </span>
                      )}
                    </div>

                    {bukti ? (
                      <div className="relative rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 p-3 text-center space-y-2">
                        <img
                          src={bukti}
                          alt="Pratinjau Bukti"
                          className="max-h-56 w-auto mx-auto rounded-lg border shadow-sm object-contain"
                        />
                        <div className="flex items-center justify-between gap-2 px-1">
                          <p className="text-[11px] font-medium text-foreground truncate max-w-[200px]">
                            {namaBukti || "screenshot_pembayaran.png"}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBukti(undefined);
                              setNamaBukti("");
                              setSelectedFile(null);
                              setFileInputKey((prev) => prev + 1);
                            }}
                            className="h-7 text-xs text-destructive hover:text-destructive"
                          >
                            Hapus / Ganti
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <label
                          htmlFor="bukti-qris"
                          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 p-4 text-center hover:border-primary/70 transition-colors bg-muted/10 cursor-pointer"
                        >
                          <Smartphone className="size-8 text-muted-foreground mb-1.5" />
                          <span className="text-xs font-bold text-primary hover:underline">
                            Pilih File Screenshot / Foto Bukti Bayar
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            JPG, PNG, atau PDF (maksimal 5 MB)
                          </span>
                          <input
                            key={`bukti-qris-${fileInputKey}`}
                            id="bukti-qris"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/*,application/pdf"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) unggahBukti(f);
                            }}
                            className="hidden"
                          />
                        </label>

                        {/* FITUR BANTUAN SCREENSHOT DEMO */}
                        <div className="rounded-lg border bg-muted/30 p-2.5 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 font-semibold text-primary">
                            <Sparkles className="size-3.5 text-amber-500" />
                            <span>Simulasi Cepat (Buat Bukti E-Wallet Demo):</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Gunakan salah satu tombol e-wallet di bawah untuk membuat screenshot bukti transfer instan untuk pengujian:
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => generateDemoEwalletScreenshot("DANA", detail)}
                              className="h-7 text-[11px] gap-1 border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                            >
                              📸 DANA
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                generateDemoEwalletScreenshot("GoPay", detail)
                              }
                              className="h-7 text-[11px] gap-1 border-emerald-400 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                            >
                              📸 GoPay
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => generateDemoEwalletScreenshot("OVO", detail)}
                              className="h-7 text-[11px] gap-1 border-purple-400 text-purple-700 dark:text-purple-300 hover:bg-purple-50"
                            >
                              📸 OVO
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                generateDemoEwalletScreenshot("ShopeePay", detail)
                              }
                              className="h-7 text-[11px] gap-1 border-orange-400 text-orange-700 dark:text-orange-300 hover:bg-orange-50"
                            >
                              📸 ShopeePay
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------- TRANSFER BANK CONTAINER ---------------- */}
              {metode === "Transfer Bank" && (
                <div className="space-y-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-b from-primary/5 via-background to-muted/20 p-4">
                  {/* Rekening Resmi Bengkel Aktif */}
                  <div className="rounded-xl border bg-card p-3.5 space-y-2.5">
                    <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      Rekening Resmi Bengkel ({bengkelNama}):
                    </p>
                    <div className="space-y-2">
                      {activeBankAccounts.map((acc, idx) => (
                        <div
                          key={acc.id || idx}
                          className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5"
                        >
                          <div>
                            <p className="font-bold text-sm text-foreground">
                              {acc.bank_name}
                            </p>
                            <p className="font-mono text-sm font-semibold tracking-wide text-primary">
                              {acc.account_number}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              a.n. {acc.account_holder_name}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleCopy(
                                acc.account_number || "",
                                `Nomor rekening ${acc.bank_name}`,
                              )
                            }
                            className="gap-1 text-xs"
                          >
                            {copiedText === acc.account_number ? (
                              <>
                                <Check className="size-3 text-success" /> Tersalin
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" /> Salin Rekening
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nominal Transfer Box */}
                  <div className="flex items-center justify-between rounded-xl border bg-card p-3">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Nominal yang Harus Ditransfer:
                      </p>
                      <p className="font-display text-lg font-bold text-primary">
                        {rupiah(detail.total)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(String(detail.total), "Nominal transfer")}
                      className="gap-1 text-xs"
                    >
                      {copiedText === String(detail.total) ? (
                        <>
                          <Check className="size-3 text-success" /> Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" /> Salin Nominal
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Unggah Bukti Transfer */}
                  <div className="space-y-2.5 rounded-xl border bg-card p-3">
                    <Label
                      htmlFor="bukti-transfer"
                      className="font-bold text-xs text-foreground"
                    >
                      Unggah Bukti Transfer Bank <span className="text-destructive">*</span>
                    </Label>
                    {bukti ? (
                      <div className="relative rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 p-3 text-center space-y-2">
                        <img
                          src={bukti}
                          alt="Bukti Transfer"
                          className="max-h-56 w-auto mx-auto rounded-lg border shadow-sm object-contain"
                        />
                        <div className="flex items-center justify-between gap-2 px-1">
                          <p className="text-[11px] font-medium text-foreground truncate max-w-[200px]">
                            {namaBukti || "bukti_transfer.png"}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBukti(undefined);
                              setNamaBukti("");
                              setSelectedFile(null);
                              setFileInputKey((prev) => prev + 1);
                            }}
                            className="h-7 text-xs text-destructive hover:text-destructive"
                          >
                            Hapus / Ganti
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          key={`bukti-transfer-${fileInputKey}`}
                          id="bukti-transfer"
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) unggahBukti(f);
                          }}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Format JPG, JPEG, PNG, WEBP, atau PDF. Ukuran maksimal 5 MB.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------- CASH / KASIR ---------------- */}
              {metode === "Cash" && (
                <div className="rounded-2xl border-2 border-primary/30 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Banknote className="size-6" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">
                        Pembayaran Tunai di Kasir Bengkel
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Anda dapat membayar langsung secara tunai kepada kasir di bengkel{" "}
                        <strong>{bengkelNama}</strong> saat mengambil kendaraan Anda.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">No. Transaksi</span>
                      <span className="font-mono font-bold">{detail.noTransaksi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Nominal Tunai</span>
                      <span className="font-display font-bold text-primary text-sm">
                        {rupiah(detail.total)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Setelah Anda menekan tombol konfirmasi di bawah, status tagihan akan tercatat sebagai <strong>Menunggu Verifikasi</strong>. Kasir bengkel akan memverifikasi dan menandai tagihan Lunas setelah menerima uang tunai.
                  </p>
                </div>
              )}

              <DialogFooter className="gap-2 sm:justify-between pt-2">
                <Button variant="outline" onClick={() => setBayarOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => konfirmasiManual(detail)}
                  className="gap-2 shadow-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 className="size-4" />
                  {isSubmitting
                    ? "Mengirim..."
                    : metode === "Cash"
                    ? "Konfirmasi Bayar Tunai (Cash)"
                    : `Kirim Bukti Pembayaran (${metode})`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/* 3. DIALOG BUKTI PEMBAYARAN DIGITAL (E-RECEIPT RESMI) */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={buktiModalOpen} onOpenChange={setBuktiModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="size-5 text-success" /> Bukti Pembayaran Digital
            </DialogTitle>
          </DialogHeader>

          {buktiData && (
            <div className="space-y-4 py-2">
              <div
                ref={printRef}
                className="rounded-2xl border-2 border-dashed border-primary/30 bg-card p-5 shadow-sm space-y-4 text-sm"
              >
                {/* Header Struk */}
                <div className="text-center border-b pb-4 space-y-1">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success mb-2">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h3 className="font-display text-lg font-black tracking-tight text-foreground uppercase">
                    {bengkelNama}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Pitstop Pro Hub · Solusi Perawatan Kendaraan Terpadu
                  </p>
                  <div className="inline-block rounded-full bg-success/10 px-3 py-0.5 text-xs font-bold text-success mt-1">
                    PEMBAYARAN LUNAS / TERVERIFIKASI
                  </div>
                </div>

                {/* Metadata Transaksi */}
                <div className="grid grid-cols-2 gap-2 text-xs border-b pb-3">
                  <div>
                    <span className="text-muted-foreground block">No. Transaksi:</span>
                    <span className="font-mono font-bold text-foreground">
                      {buktiData.noTransaksi}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">No. Servis:</span>
                    <span className="font-mono font-bold text-foreground">
                      {buktiData.nomorServis}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Ref. Pembayaran:</span>
                    <span className="font-mono text-[11px] text-foreground">
                      {buktiData.gatewayRef}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Waktu Pembayaran:</span>
                    <span className="text-[11px] text-foreground">{buktiData.waktu}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Pelanggan:</span>
                    <span className="font-semibold text-foreground">
                      {buktiData.pelanggan}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Kendaraan:</span>
                    <span className="font-semibold text-foreground">
                      {buktiData.kendaraan} ({buktiData.plat})
                    </span>
                  </div>
                </div>

                {/* Rincian Tagihan */}
                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Rincian Pembayaran
                  </p>
                  <div className="flex justify-between py-1 border-b border-muted">
                    <span>Jasa Servis ({buktiData.jenisServis})</span>
                    <span className="font-medium">{rupiah(buktiData.biayaJasa)}</span>
                  </div>
                  {buktiData.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between py-1 border-b border-muted text-muted-foreground"
                    >
                      <span>
                        {it.nama} ({it.jumlah}x)
                      </span>
                      <span>{rupiah(it.harga * it.jumlah)}</span>
                    </div>
                  ))}
                  {buktiData.items.length === 0 && buktiData.biayaPart > 0 && (
                    <div className="flex justify-between py-1 border-b border-muted text-muted-foreground">
                      <span>Sparepart & Bahan</span>
                      <span>{rupiah(buktiData.biayaPart)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 font-display text-base font-bold text-foreground">
                    <span>TOTAL DIBAYAR</span>
                    <span className="text-primary">{rupiah(buktiData.total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Metode Bayar</span>
                    <span className="font-bold text-foreground">{buktiData.metode}</span>
                  </div>
                </div>

                {/* Footer Struk */}
                <div className="border-t pt-3 text-center space-y-1 text-[11px] text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Terima kasih telah mempercayakan kendaraan Anda pada kami!
                  </p>
                  <p className="text-[10px]">
                    Struk ini adalah bukti pembayaran digital yang sah dan telah diverifikasi oleh Admin Bengkel.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <DialogFooter className="flex-row flex-wrap justify-between gap-2 sm:justify-between pt-2">
                <Button variant="outline" onClick={() => setBuktiModalOpen(false)}>
                  Tutup
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={cetakStruk} className="gap-1.5">
                    <Printer className="size-4" /> Cetak Bukti
                  </Button>
                  <Button
                    onClick={() => {
                      if (detail) unduhNota(detail, profil);
                    }}
                    className="gap-1.5 shadow-xs"
                  >
                    <Download className="size-4" /> Unduh Nota PDF/HTML
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/* 4. MODAL PREVIEW BUKTI PEMBAYARAN CUSTOMER */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={previewBuktiOpen} onOpenChange={setPreviewBuktiOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="size-5 text-primary" /> Bukti Pembayaran yang Diunggah
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-center">
            {previewBuktiUrl ? (
              <img
                src={previewBuktiUrl}
                alt="Bukti Transfer"
                className="max-h-[70vh] w-auto mx-auto rounded-lg border object-contain shadow-sm"
              />
            ) : (
              <p className="text-xs text-muted-foreground py-8">
                Tidak ada berkas bukti gambar yang tersedia.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewBuktiOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate font-semibold text-foreground text-sm mt-0.5">{value}</p>
    </div>
  );
}
