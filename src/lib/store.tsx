import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useSupabaseRealtime } from "@/lib/use-realtime";
import {
  isSupabaseConfigured,
  pelangganService,
  kendaraanService,
  bookingService,
  servisService,
  sparepartService,
  pembayaranService,
  mekanikService,
  supplierService,
  workshopPaymentAccountsService,
  getLocalAccounts,
  notifikasiService,
  supabase,
} from "@/services/appbenk-service";
import type { WorkshopPaymentAccountRow, PaymentAccountType } from "@/types/database";

export type Bengkel = {
  id: string;
  nama: string;
  alamat: string;
  telepon: string;
  paket?: "Basic" | "Premium";
  status?: "Aktif" | "Nonaktif";
  ownerNama?: string;
  ownerEmail?: string;
  tanggalBergabung?: string;
  lat?: number;
  lng?: number;
  jamOperasional?: string;
};

export type Mekanik = {
  id: string;
  bengkelId: string;
  nama: string;
  telepon: string;
  spesialisasi: string;
  status: "Aktif" | "Tidak Aktif";
  createdAt: string;
};

export type Pelanggan = {
  id: string;
  userId?: string | undefined;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  /** Kendaraan utama (ringkasan). Detail lengkap ada di entitas Kendaraan. */
  kendaraan: string;
  plat: string;
};

/** Entitas Kendaraan (1 pelanggan : N kendaraan). */
export type Kendaraan = {
  id: string;
  pelangganId: string;
  merk: string;
  tipe: string;
  tahun: number;
  plat: string;
  kilometer: number;
};

/** Label ringkas kendaraan, dipakai pada booking & servis. */
export const labelKendaraan = (k: Kendaraan) => `${k.merk} ${k.tipe} ${k.tahun}`;

export type StatusServis =
  "Booking" | "Menunggu" | "Diproses" | "Selesai" | "Menunggu Pembayaran" | "Selesai Dibayar";

export const URUTAN_STATUS: StatusServis[] = [
  "Booking",
  "Menunggu",
  "Diproses",
  "Selesai",
  "Menunggu Pembayaran",
  "Selesai Dibayar",
];

export type ItemPart = {
  sparepartId: string;
  kode: string;
  nama: string;
  harga: number;
  jumlah: number;
};

export type MetodeBayar = "Cash" | "Transfer Bank" | "QRIS";

export type Servis = {
  id: string;
  nomor: string;
  bookingId?: string | undefined;
  pelangganId?: string | undefined;
  customerId?: string | undefined;
  userId?: string | undefined;
  pelanggan: string;
  telepon?: string | undefined;
  bengkelId?: string | undefined;
  mekanikId?: string | undefined;
  kendaraan: string;
  plat: string;
  jenis: string;
  keluhan: string;
  pekerjaan: string;
  mekanik: string;
  tanggal: string;
  status: StatusServis;
  sparepart: string;
  items: ItemPart[];
  catatan: string;
  biayaJasa: number;
  biayaPart: number;
  total: number;
  noTransaksi: string;
  metodeBayar?: MetodeBayar;
  /** Hasil pemeriksaan mekanik (ERD: servis.hasil_pemeriksaan). */
  hasilPemeriksaan?: string;
  /** Estimasi biaya awal sebelum pengerjaan. */
  estimasiBiaya?: number | undefined;
  /** Estimasi waktu pengerjaan, contoh "2 jam". */
  estimasiWaktu?: string | undefined;
  /** Estimasi durasi pengerjaan (alias untuk estimasiWaktu). */
  estimasiDurasi?: string | undefined;
  /** Estimasi tanggal/jam selesai pengerjaan. */
  estimasiSelesai?: string | undefined;
  tanggalMulai?: string | undefined;
  tanggalSelesai?: string | undefined;
};

/** Entitas Pembayaran / Transaksi (1 servis : 1 pembayaran). */
export type Pembayaran = {
  id: string;
  servisId: string;
  noTransaksi: string;
  metode: MetodeBayar;
  tanggalBayar: string;
  totalBayar: number;
  status: "Belum Dibayar" | "Menunggu Verifikasi" | "Lunas" | "Bukti Ditolak";
  /** Object URL until a managed object-storage backend is connected. */
  buktiUrl?: string;
  alasanTolak?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  bengkelId?: string;
  pelanggan?: string;
  kendaraan?: string;
  plat?: string;
  nomorServis?: string;
};

export type Notifikasi = {
  id: string;
  role: "admin" | "owner" | "pelanggan" | "semua";
  tipe: "pembayaran" | "booking" | "servis" | "sistem";
  judul: string;
  pesan: string;
  waktu: string;
  dibaca: boolean;
  link?: string | undefined;
  servisId?: string | undefined;
  noTransaksi?: string | undefined;
  pelanggan?: string | undefined;
  total?: number | undefined;
  buktiUrl?: string | undefined;
  bookingId?: string | undefined;
  customerId?: string | undefined;
  userId?: string | undefined;
  statusBooking?: StatusBooking | undefined;
};

export type StatusBooking = "Menunggu Konfirmasi" | "Diterima" | "Ditolak";

export type Booking = {
  id: string;
  nomor: string;
  pelanggan: string;
  /** Customer identity; never authorize customer data from display name. */
  customerId?: string;
  vehicleId?: string;
  bengkelId?: string | undefined;
  mekanikId?: string | undefined;
  kendaraan: string;
  plat: string;
  jenis: string;
  keluhan: string;
  tanggal: string;
  waktu: string;
  catatan: string;
  /** Mekanik yang diinginkan pelanggan (opsional). */
  mekanikDiinginkan?: string | undefined;
  /** Mekanik yang ditugaskan admin (opsional). */
  mekanikDitugaskan?: string | undefined;
  /** Alasan penolakan booking oleh admin. */
  alasanTolak?: string | undefined;
  /** ISO local date-time assigned by admin after approval. */
  estimasiSelesai?: string | undefined;
  status: StatusBooking;
};

export type Sparepart = {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  harga: number;
  stok: number;
  stokMinimum: number;
  terpakai: number;
  tanggalUpdate: string;
};

export type StatusStok = "Habis" | "Menipis" | "Aman";

export const statusStok = (sp?: Partial<Sparepart> | null): StatusStok => {
  if (!sp) return "Habis";
  const stok = Number(sp.stok ?? 0);
  const min = Number(sp.stokMinimum ?? 5);
  return stok <= 0 ? "Habis" : stok <= min ? "Menipis" : "Aman";
};

/** Log pergerakan stok (ERD: riwayat_stok). */
export type RiwayatStok = {
  id: string;
  sparepartId: string;
  jenis: "Masuk" | "Keluar";
  jumlah: number;
  tanggal: string;
  waktu?: string;
  referensi?: string;
  sisaStok?: number;
  keterangan: string;
};

export type Supplier = {
  id: string;
  bengkelId?: string | undefined;
  nama: string;
  kontak?: string | undefined;
  telepon?: string | undefined;
  email?: string | undefined;
  alamat?: string | undefined;
  status: "Aktif" | "Tidak Aktif";
};

/** Pembelian sparepart dari supplier. */
export type PembelianSparepart = {
  id: string;
  nomor: string;
  sparepartId: string;
  supplierId?: string | undefined;
  supplier: string;
  bengkelId?: string | undefined;
  tanggal: string;
  jumlah: number;
  harga: number;
  total: number;
  status: "Diterima";
};

/** Pemakaian sparepart pada sebuah servis. */
export type PenggunaanSparepart = {
  id: string;
  sparepartId: string;
  servisId: string;
  servisNomor: string;
  tanggal: string;
  jumlah: number;
  mekanik: string;
  pelanggan?: string;
  statusServis?: StatusServis | string;
  keterangan: string;
};

/** Entitas Stok Opname */
export type StokOpname = {
  id: string;
  tanggal: string;
  keterangan: string;
  totalItem: number;
  selisihTotal: number;
};

export type StatusRetur =
  "Diajukan" | "Diproses" | "Disetujui" | "Ditolak" | "Barang Dikirim" | "Selesai";

export const STATUS_RETUR_OPTIONS: StatusRetur[] = [
  "Diajukan",
  "Diproses",
  "Disetujui",
  "Ditolak",
  "Barang Dikirim",
  "Selesai",
];

export const ALASAN_RETUR_OPTIONS = [
  "Cacat / Rusak Pabrik",
  "Tidak Sesuai Spesifikasi",
  "Salah Kirim Barang",
  "Kelebihan Kirim",
  "Barang Kadaluwarsa / Usang",
  "Lainnya",
] as const;

/** Entitas Retur Sparepart ke Supplier / PT */
export type ReturSparepart = {
  id: string;
  nomorRetur: string;
  bengkelId?: string | undefined;
  supplierId: string;
  supplier: string;
  pembelianId: string;
  nomorPembelian: string;
  sparepartId: string;
  namaSparepart: string;
  jumlah: number;
  hargaSatuan: number;
  totalNilai: number;
  tanggal: string;
  alasan: string;
  alasanDetail?: string | undefined;
  alasanPenolakan?: string | undefined;
  keterangan?: string | undefined;
  status: StatusRetur;
  stokDikurangi: boolean;
  riwayatStokId?: string | undefined;
  createdAt?: string | undefined;
};

/** Entitas Laporan Ringkasan Stok */
export type LaporanRingkasanStok = {
  id: string;
  sparepartId: string;
  stokAwal: number;
  stokMasuk: number;
  stokKeluar: number;
  stokAkhir: number;
  periode: string;
};

export const JENIS_SERVIS = [
  "Servis Berkala",
  "Servis Mesin",
  "Servis Rem",
  "Servis AC",
  "Servis Kelistrikan",
  "Ganti Oli",
  "Pemeriksaan Kendaraan",
  "Lainnya",
];

const uid = () => Math.random().toString(36).slice(2, 9);

const pelangganAwal: Pelanggan[] = [
  {
    id: "pl-001",
    nama: "Budi Santoso",
    email: "budi@mail.test",
    telepon: "0812-3344-5566",
    alamat: "Jl. Merdeka No. 12, Bandung",
    kendaraan: "Honda Beat 2019",
    plat: "D 1234 ABC",
  },
  {
    id: "pl-002",
    nama: "Siti Rahmawati",
    email: "siti@mail.test",
    telepon: "0857-1122-9090",
    alamat: "Jl. Cihampelas No. 7, Bandung",
    kendaraan: "Yamaha NMAX 2021",
    plat: "D 5521 KJ",
  },
  {
    id: "pl-003",
    nama: "Agus Prasetyo",
    email: "agus@mail.test",
    telepon: "0813-7788-4455",
    alamat: "Jl. Sudirman No. 88, Cimahi",
    kendaraan: "Toyota Avanza 2017",
    plat: "D 9087 PL",
  },
  {
    id: "pl-004",
    nama: "Dewi Lestari",
    email: "dewi@mail.test",
    telepon: "0895-2211-3344",
    alamat: "Jl. Pasteur No. 45, Bandung",
    kendaraan: "Honda Vario 160",
    plat: "D 3311 QW",
  },
  {
    id: "pl-005",
    nama: "Rizky Ramadhan",
    email: "rizky@mail.test",
    telepon: "0821-9911-2233",
    alamat: "Jl. Buah Batu No. 21, Bandung",
    kendaraan: "Suzuki Satria FU",
    plat: "D 7742 ZX",
  },
  {
    id: "pl-006",
    nama: "Hendra Wijaya",
    email: "hendra@mail.test",
    telepon: "0877-6655-1010",
    alamat: "Jl. Kopo No. 90, Bandung",
    kendaraan: "Daihatsu Xenia 2015",
    plat: "D 6120 MN",
  },
];

const kendaraanAwal: Kendaraan[] = [
  {
    id: "kd-001",
    pelangganId: "pl-001",
    merk: "Honda",
    tipe: "Beat",
    tahun: 2019,
    plat: "D 1234 ABC",
    kilometer: 41200,
  },
  {
    id: "kd-002",
    pelangganId: "pl-001",
    merk: "Honda",
    tipe: "PCX",
    tahun: 2022,
    plat: "D 8890 GH",
    kilometer: 15600,
  },
  {
    id: "kd-003",
    pelangganId: "pl-002",
    merk: "Yamaha",
    tipe: "NMAX",
    tahun: 2021,
    plat: "D 5521 KJ",
    kilometer: 28750,
  },
  {
    id: "kd-004",
    pelangganId: "pl-003",
    merk: "Toyota",
    tipe: "Avanza",
    tahun: 2017,
    plat: "D 9087 PL",
    kilometer: 98400,
  },
  {
    id: "kd-005",
    pelangganId: "pl-004",
    merk: "Honda",
    tipe: "Vario 160",
    tahun: 2023,
    plat: "D 3311 QW",
    kilometer: 9200,
  },
  {
    id: "kd-006",
    pelangganId: "pl-005",
    merk: "Suzuki",
    tipe: "Satria FU",
    tahun: 2018,
    plat: "D 7742 ZX",
    kilometer: 52100,
  },
  {
    id: "kd-007",
    pelangganId: "pl-006",
    merk: "Daihatsu",
    tipe: "Xenia",
    tahun: 2015,
    plat: "D 6120 MN",
    kilometer: 132500,
  },
];

const mkServis = (s: Omit<Servis, "id" | "total" | "items"> & { items?: ItemPart[] }): Servis => ({
  items: [],
  ...s,
  id: uid(),
  total: s.biayaJasa + s.biayaPart,
});

const servisAwal: Servis[] = [
  mkServis({
    nomor: "SRV-2026-0148",
    pelanggan: "Budi Santoso",
    kendaraan: "Honda Beat 2019",
    plat: "D 1234 ABC",
    jenis: "Servis Ringan",
    keluhan: "Mesin kasar saat langsam",
    pekerjaan: "Servis ringan + ganti busi",
    mekanik: "Joko",
    tanggal: "2026-08-18",
    status: "Diproses",
    sparepart: "Busi NGK, Oli Federal 0.8L",
    catatan: "Disarankan ganti filter udara bulan depan",
    items: [
      { sparepartId: "sp-002", kode: "SP-002", nama: "Busi NGK CPR9EA", harga: 27000, jumlah: 1 },
      {
        sparepartId: "sp-001",
        kode: "SP-001",
        nama: "Oli Mesin AHM MPX 0.8L",
        harga: 48000,
        jumlah: 1,
      },
    ],
    biayaJasa: 70000,
    biayaPart: 75000,
    noTransaksi: "TRX-2026-0148",
  }),
  mkServis({
    nomor: "SRV-2026-0147",
    pelanggan: "Siti Rahmawati",
    kendaraan: "Yamaha NMAX 2021",
    plat: "D 5521 KJ",
    jenis: "Perbaikan Rem",
    keluhan: "Rem depan kurang pakem",
    pekerjaan: "Ganti kampas rem depan",
    mekanik: "Dedi",
    tanggal: "2026-08-18",
    status: "Menunggu",
    sparepart: "Kampas Rem Depan",
    catatan: "",
    items: [
      {
        sparepartId: "sp-003",
        kode: "SP-003",
        nama: "Kampas Rem Depan NMAX",
        harga: 95000,
        jumlah: 1,
      },
    ],
    biayaJasa: 60000,
    biayaPart: 95000,
    noTransaksi: "TRX-2026-0147",
  }),
  mkServis({
    nomor: "SRV-2026-0146",
    pelanggan: "Budi Santoso",
    kendaraan: "Honda Beat 2019",
    plat: "D 1234 ABC",
    jenis: "Ganti Oli",
    keluhan: "Ganti oli rutin bulanan",
    pekerjaan: "Ganti oli mesin",
    mekanik: "Joko",
    tanggal: "2026-08-12",
    status: "Menunggu Pembayaran",
    sparepart: "Oli AHM MPX 0.8L",
    catatan: "",
    items: [
      {
        sparepartId: "sp-001",
        kode: "SP-001",
        nama: "Oli Mesin AHM MPX 0.8L",
        harga: 48000,
        jumlah: 1,
      },
    ],
    biayaJasa: 25000,
    biayaPart: 48000,
    noTransaksi: "TRX-2026-0146",
  }),
  mkServis({
    nomor: "SRV-2026-0145",
    pelanggan: "Agus Prasetyo",
    kendaraan: "Toyota Avanza 2017",
    plat: "D 9087 PL",
    jenis: "Kaki-kaki",
    keluhan: "Bunyi pada kaki-kaki",
    pekerjaan: "Ganti link stabilizer",
    mekanik: "Rudi",
    tanggal: "2026-08-17",
    status: "Selesai Dibayar",
    sparepart: "Link Stabilizer x2",
    catatan: "Sudah test drive, aman",
    items: [
      {
        sparepartId: "sp-007",
        kode: "SP-007",
        nama: "Link Stabilizer Avanza",
        harga: 175000,
        jumlah: 2,
      },
    ],
    biayaJasa: 130000,
    biayaPart: 350000,
    noTransaksi: "TRX-2026-0145",
  }),
  mkServis({
    nomor: "SRV-2026-0144",
    pelanggan: "Budi Santoso",
    kendaraan: "Honda Beat 2019",
    plat: "D 1234 ABC",
    jenis: "Servis Ringan",
    keluhan: "Rantai kendur dan berisik",
    pekerjaan: "Setel & lumasi rantai",
    mekanik: "Dedi",
    tanggal: "2026-07-28",
    status: "Selesai Dibayar",
    sparepart: "Chain Lube",
    catatan: "Rantai mulai aus",
    biayaJasa: 35000,
    biayaPart: 20000,
    noTransaksi: "TRX-2026-0144",
  }),
  mkServis({
    nomor: "SRV-2026-0143",
    pelanggan: "Hendra Wijaya",
    kendaraan: "Daihatsu Xenia 2015",
    plat: "D 6120 MN",
    jenis: "Servis AC",
    keluhan: "AC kurang dingin",
    pekerjaan: "Servis AC + isi freon",
    mekanik: "Rudi",
    tanggal: "2026-08-14",
    status: "Selesai Dibayar",
    sparepart: "Freon R134a",
    catatan: "",
    items: [
      { sparepartId: "sp-008", kode: "SP-008", nama: "Freon R134a", harga: 120000, jumlah: 1 },
    ],
    biayaJasa: 230000,
    biayaPart: 120000,
    noTransaksi: "TRX-2026-0143",
  }),
  mkServis({
    nomor: "SRV-2025-0121",
    pelanggan: "Budi Santoso",
    kendaraan: "Honda Beat 2019",
    plat: "D 1234 ABC",
    jenis: "Servis Besar",
    keluhan: "Tarikan berat",
    pekerjaan: "Overhaul ringan mesin",
    mekanik: "Joko",
    tanggal: "2025-11-09",
    status: "Selesai Dibayar",
    sparepart: "Busi NGK",
    catatan: "",
    items: [
      { sparepartId: "sp-002", kode: "SP-002", nama: "Busi NGK CPR9EA", harga: 27000, jumlah: 2 },
    ],
    biayaJasa: 250000,
    biayaPart: 54000,
    noTransaksi: "TRX-2025-0121",
    metodeBayar: "Cash",
  }),
  mkServis({
    nomor: "SRV-2025-0118",
    pelanggan: "Siti Rahmawati",
    kendaraan: "Yamaha NMAX 2021",
    plat: "D 5521 KJ",
    jenis: "Ganti Oli",
    keluhan: "Servis rutin",
    pekerjaan: "Ganti oli mesin",
    mekanik: "Bayu",
    tanggal: "2025-06-21",
    status: "Selesai Dibayar",
    sparepart: "Oli AHM MPX",
    catatan: "",
    items: [
      {
        sparepartId: "sp-001",
        kode: "SP-001",
        nama: "Oli Mesin AHM MPX 0.8L",
        harga: 48000,
        jumlah: 1,
      },
    ],
    biayaJasa: 30000,
    biayaPart: 48000,
    noTransaksi: "TRX-2025-0118",
    metodeBayar: "QRIS",
  }),
];

const bookingAwal: Booking[] = [
  {
    id: uid(),
    nomor: "BK-2026-0032",
    pelanggan: "Budi Santoso",
    kendaraan: "Honda Beat 2019",
    plat: "D 1234 ABC",
    jenis: "Servis Besar",
    keluhan: "Tarikan berat & boros bensin",
    tanggal: "2026-08-20",
    waktu: "09:00",
    catatan: "Mohon dikerjakan pagi",
    mekanikDiinginkan: "Joko",
    status: "Menunggu Konfirmasi",
  },
  {
    id: uid(),
    nomor: "BK-2026-0031",
    pelanggan: "Dewi Lestari",
    kendaraan: "Honda Vario 160",
    plat: "D 3311 QW",
    jenis: "Ganti Oli",
    keluhan: "Ganti oli rutin",
    tanggal: "2026-08-19",
    waktu: "13:00",
    catatan: "",
    status: "Menunggu Konfirmasi",
  },
  {
    id: uid(),
    nomor: "BK-2026-0030",
    pelanggan: "Siti Rahmawati",
    kendaraan: "Yamaha NMAX 2021",
    plat: "D 5521 KJ",
    jenis: "Perbaikan Rem",
    keluhan: "Rem depan kurang pakem",
    tanggal: "2026-08-18",
    waktu: "10:30",
    catatan: "",
    mekanikDiinginkan: "Dedi",
    mekanikDitugaskan: "Dedi",
    status: "Diterima",
  },
  {
    id: uid(),
    nomor: "BK-2026-0029",
    pelanggan: "Rizky Ramadhan",
    kendaraan: "Suzuki Satria FU",
    plat: "D 7742 ZX",
    jenis: "Kelistrikan",
    keluhan: "Lampu utama mati",
    tanggal: "2026-08-16",
    waktu: "15:00",
    catatan: "",
    status: "Ditolak",
    alasanTolak: "Jadwal servis pada tanggal tersebut sudah penuh. Silakan pilih tanggal lain.",
  },
];

const sparepartAwal: Sparepart[] = [
  {
    id: "sp-001",
    kode: "SP-001",
    nama: "Oli Mesin AHM MPX2 0.8L",
    kategori: "Pelumas",
    satuan: "Botol",
    harga: 55000,
    stok: 27,
    stokMinimum: 10,
    terpakai: 22,
    tanggalUpdate: "2026-09-26",
  },
  {
    id: "sp-005",
    kode: "SP-002",
    nama: "Oli Gardan AHM 120ml",
    kategori: "Pelumas",
    satuan: "Botol",
    harga: 18000,
    stok: 35,
    stokMinimum: 10,
    terpakai: 8,
    tanggalUpdate: "2026-09-26",
  },
  {
    id: "sp-003",
    kode: "SP-003",
    nama: "Busi NGK Laser Iridium",
    kategori: "Pengapian",
    satuan: "Pcs",
    harga: 35000,
    stok: 20,
    stokMinimum: 5,
    terpakai: 14,
    tanggalUpdate: "2026-09-26",
  },
  {
    id: "sp-002",
    kode: "SP-004",
    nama: "Filter Udara Honda Matic",
    kategori: "Filter",
    satuan: "Pcs",
    harga: 45000,
    stok: 25,
    stokMinimum: 5,
    terpakai: 12,
    tanggalUpdate: "2026-09-26",
  },
  {
    id: "sp-004",
    kode: "SP-005",
    nama: "Kampas Rem Depan Nissin",
    kategori: "Pengereman",
    satuan: "Set",
    harga: 65000,
    stok: 18,
    stokMinimum: 5,
    terpakai: 9,
    tanggalUpdate: "2026-09-26",
  },
  {
    id: "sp-006",
    kode: "SP-006",
    nama: "V-Belt Kit Yamaha NMAX Original",
    kategori: "Transmisi",
    satuan: "Set",
    harga: 145000,
    stok: 12,
    stokMinimum: 3,
    terpakai: 4,
    tanggalUpdate: "2026-09-26",
  },
];

export const SATUAN_PART = ["Pcs", "Botol", "Set", "Unit", "Tabung", "Liter"];

export const bengkelAwal: Bengkel[] = [
  {
    id: "bengkel-001",
    nama: "AppBenk Motor Pusat",
    alamat: "Jl. Merdeka No. 45, Jakarta",
    telepon: "021-5550101",
    ownerNama: "Pak Budi",
    ownerEmail: "budi.owner@bengkel.com",
    paket: "Basic",
    status: "Aktif",
    lat: -6.2088,
    lng: 106.8456,
    jamOperasional: "Senin–Sabtu: 08.00–17.00 WIB",
  },
  {
    id: "bengkel-002",
    nama: "AppBenk Motor Cabang Timur",
    alamat: "Jl. Pemuda No. 12, Bekasi",
    telepon: "021-5550202",
    ownerNama: "Pak Budi",
    ownerEmail: "budi.owner@bengkel.com",
    paket: "Basic",
    status: "Aktif",
    lat: -6.2383,
    lng: 106.9756,
    jamOperasional: "Senin–Sabtu: 08.00–17.00 WIB",
  },
  {
    id: "bengkel-3247",
    nama: "bengkel budiyo",
    alamat: "gang dahlia jl kober, Rembang",
    telepon: "088227853955",
    ownerNama: "amatno",
    ownerEmail: "gbudi0080@gmail.com",
    paket: "Basic",
    status: "Aktif",
    lat: -6.7105,
    lng: 111.3415,
    jamOperasional: "Senin–Sabtu: 08.00–17.00 WIB",
  },
  {
    id: "bengkel-2307",
    nama: "Bengkel Fandi Motor",
    alamat: "Jl. Selaganggang, Kecamatan mrebet Kabupaten purbalingga.",
    telepon: "081234567890",
    ownerNama: "Fandi Nasir",
    ownerEmail: "fandinasir@gmail.com",
    paket: "Premium",
    status: "Aktif",
    lat: -7.3245975,
    lng: 109.352647,
    jamOperasional: "Senin–Sabtu: 08.00–17.00 WIB",
  },
];

export const mekanikAwal: Mekanik[] = [
  {
    id: "mk-001",
    bengkelId: "bengkel-001",
    nama: "Andi Pratamant",
    telepon: "08123456781",
    spesialisasi: "Mesin",
    status: "Aktif",
    createdAt: "2026-09-01",
  },
  {
    id: "mk-002",
    bengkelId: "bengkel-001",
    nama: "Budi Santoso",
    telepon: "08123456782",
    spesialisasi: "Kelistrikan",
    status: "Aktif",
    createdAt: "2026-09-01",
  },
  {
    id: "mk-1788834282861-xg0i",
    bengkelId: "bengkel-001",
    nama: "budi",
    telepon: "09876355",
    spesialisasi: "Kaki-kaki",
    status: "Aktif",
    createdAt: "2026-09-01",
  },
  {
    id: "mk-1788834361513-fs2d",
    bengkelId: "bengkel-001",
    nama: "amba tuner",
    telepon: "0887656776656",
    spesialisasi: "Bor up",
    status: "Aktif",
    createdAt: "2026-09-01",
  },
  {
    id: "mk-005",
    bengkelId: "bengkel-002",
    nama: "Deni Kurniawan",
    telepon: "08139988771",
    spesialisasi: "AC",
    status: "Aktif",
    createdAt: "2026-09-01",
  },
  {
    id: "mk-006",
    bengkelId: "bengkel-002",
    nama: "Eko Prasetyo",
    telepon: "08139988772",
    spesialisasi: "Kaki-kaki",
    status: "Aktif",
    createdAt: "2026-09-01",
  },
];

const pembelianAwal: PembelianSparepart[] = [
  {
    id: uid(),
    nomor: "PB-2026-0011",
    sparepartId: "sp-001",
    supplier: "PT Sinar Pelumas",
    tanggal: "2026-08-05",
    jumlah: 24,
    harga: 41000,
    total: 984000,
    status: "Diterima",
  },
  {
    id: uid(),
    nomor: "PB-2026-0010",
    sparepartId: "sp-003",
    supplier: "CV Rem Jaya",
    tanggal: "2026-07-28",
    jumlah: 10,
    harga: 78000,
    total: 780000,
    status: "Diterima",
  },
  {
    id: uid(),
    nomor: "PB-2026-0009",
    sparepartId: "sp-006",
    supplier: "Toko Ban Makmur",
    tanggal: "2026-07-19",
    jumlah: 12,
    harga: 182000,
    total: 2184000,
    status: "Diterima",
  },
];

const riwayatStokAwal: RiwayatStok[] = [
  {
    id: uid(),
    sparepartId: "sp-001",
    jenis: "Masuk",
    jumlah: 24,
    tanggal: "2026-08-05",
    keterangan: "Pembelian PB-2026-0011 · PT Sinar Pelumas",
  },
  {
    id: uid(),
    sparepartId: "sp-001",
    jenis: "Keluar",
    jumlah: 1,
    tanggal: "2026-08-18",
    keterangan: "Dipakai servis SRV-2026-0148",
  },
  {
    id: uid(),
    sparepartId: "sp-002",
    jenis: "Keluar",
    jumlah: 1,
    tanggal: "2026-08-18",
    keterangan: "Dipakai servis SRV-2026-0148",
  },
  {
    id: uid(),
    sparepartId: "sp-003",
    jenis: "Masuk",
    jumlah: 10,
    tanggal: "2026-07-28",
    keterangan: "Pembelian PB-2026-0010 · CV Rem Jaya",
  },
  {
    id: uid(),
    sparepartId: "sp-007",
    jenis: "Keluar",
    jumlah: 2,
    tanggal: "2026-08-17",
    keterangan: "Dipakai servis SRV-2026-0145",
  },
];

const penggunaanAwal: PenggunaanSparepart[] = [
  {
    id: uid(),
    sparepartId: "sp-002",
    servisId: "-",
    servisNomor: "SRV-2026-0148",
    tanggal: "2026-08-18",
    jumlah: 1,
    mekanik: "Joko",
    keterangan: "Ganti busi",
  },
  {
    id: uid(),
    sparepartId: "sp-001",
    servisId: "-",
    servisNomor: "SRV-2026-0148",
    tanggal: "2026-08-18",
    jumlah: 1,
    mekanik: "Joko",
    keterangan: "Ganti oli mesin",
  },
  {
    id: uid(),
    sparepartId: "sp-007",
    servisId: "-",
    servisNomor: "SRV-2026-0145",
    tanggal: "2026-08-17",
    jumlah: 2,
    mekanik: "Rudi",
    keterangan: "Ganti link stabilizer",
  },
];

const pembayaranAwal: Pembayaran[] = [
  {
    id: uid(),
    servisId: "-",
    noTransaksi: "TRX-2026-0145",
    metode: "Transfer Bank",
    tanggalBayar: "2026-08-17",
    totalBayar: 480000,
    status: "Lunas",
  },
  {
    id: uid(),
    servisId: "-",
    noTransaksi: "TRX-2026-0143",
    metode: "Cash",
    tanggalBayar: "2026-08-14",
    totalBayar: 350000,
    status: "Lunas",
  },
  {
    id: uid(),
    servisId: "-",
    noTransaksi: "TRX-2025-0121",
    metode: "Cash",
    tanggalBayar: "2025-11-09",
    totalBayar: 304000,
    status: "Lunas",
  },
  {
    id: uid(),
    servisId: "-",
    noTransaksi: "TRX-2025-0118",
    metode: "QRIS",
    tanggalBayar: "2025-06-21",
    totalBayar: 78000,
    status: "Lunas",
  },
];

const stokOpnameAwal: StokOpname[] = [
  {
    id: uid(),
    tanggal: "2026-08-30",
    keterangan: "Pemeriksaan stok fisik bulanan",
    totalItem: 8,
    selisihTotal: 0,
  },
];

const supplierAwal: Supplier[] = [
  {
    id: "sup-001",
    bengkelId: "bengkel-001",
    nama: "PT Maju Jaya",
    kontak: "Budi Santoso",
    telepon: "081234567890",
    email: "kontak@majujaya.com",
    alamat: "Jl. Industri Raya No. 45, Jakarta",
    status: "Aktif",
  },
  {
    id: "sup-002",
    bengkelId: "bengkel-001",
    nama: "Nissin Brake Official",
    kontak: "Rudi Heryanto",
    telepon: "082198765432",
    email: "sales@nissinbrake.id",
    alamat: "Kawasan Industri MM2100 Blok C-2, Cikarang",
    status: "Aktif",
  },
  {
    id: "sup-003",
    bengkelId: "bengkel-001",
    nama: "PT Astra Otoparts",
    kontak: "Hendra Wijaya",
    telepon: "081377889900",
    email: "support@astra-otoparts.com",
    alamat: "Jl. Pegangsaan Dua Km. 2.2, Kelapa Gading, Jakarta",
    status: "Aktif",
  },
  {
    id: "sup-004",
    bengkelId: "bengkel-001",
    nama: "Denso Sales Indonesia",
    kontak: "Agus Pratama",
    telepon: "085611223344",
    email: "info@densosales.co.id",
    alamat: "Jl. Gaya Motor I No. 6, Sunter II, Jakarta",
    status: "Aktif",
  },
  {
    id: "sup-005",
    bengkelId: "bengkel-001",
    nama: "PT Motul Indonesia Energy",
    kontak: "Dewi Lestari",
    telepon: "081822334455",
    email: "orders@motul.co.id",
    alamat: "Pacific Century Place Lt. 17, SCBD, Jakarta",
    status: "Aktif",
  },
];

const returAwal: ReturSparepart[] = [
  {
    id: "ret-001",
    nomorRetur: "RET-2026-001",
    bengkelId: "bengkel-001",
    supplierId: "sup-003",
    supplier: "PT Astra Otoparts",
    pembelianId: "BL-2026-004",
    nomorPembelian: "BL-2026-004",
    sparepartId: "sp-004",
    namaSparepart: "Filter Udara Aspira",
    jumlah: 2,
    hargaSatuan: 45000,
    totalNilai: 90000,
    tanggal: "2026-08-16",
    alasan: "Cacat / Rusak Pabrik",
    alasanDetail: "Kemasan filter udara rusak dan penyok dari supplier",
    alasanPenolakan: undefined,
    keterangan: "Barang cacat diterima saat unboxing kiriman",
    status: "Disetujui",
    stokDikurangi: true,
    createdAt: "2026-08-16T10:00:00.000Z",
  },
];

const laporanRingkasanAwal: LaporanRingkasanStok[] = [
  {
    id: uid(),
    sparepartId: "sp-001",
    stokAwal: 11,
    stokMasuk: 24,
    stokKeluar: 1,
    stokAkhir: 34,
    periode: "2026-08",
  },
  {
    id: uid(),
    sparepartId: "sp-002",
    stokAwal: 20,
    stokMasuk: 0,
    stokKeluar: 2,
    stokAkhir: 18,
    periode: "2026-08",
  },
  {
    id: uid(),
    sparepartId: "sp-003",
    stokAwal: 7,
    stokMasuk: 0,
    stokKeluar: 1,
    stokAkhir: 6,
    periode: "2026-08",
  },
];

export const MEKANIK = ["Joko", "Dedi", "Rudi", "Bayu"];

/** Daftar mekanik beserta spesialisasi untuk saran saat booking. */
export const MEKANIK_DETAIL: { nama: string; spesialis: string }[] = [
  { nama: "Joko", spesialis: "Mekanik Mesin" },
  { nama: "Dedi", spesialis: "Mekanik Rem & Kaki-kaki" },
  { nama: "Rudi", spesialis: "Mekanik AC & Kelistrikan" },
  { nama: "Bayu", spesialis: "Mekanik Umum" },
];

export type StatusTiket = "Menunggu" | "Diproses" | "Selesai";

export const KATEGORI_TIKET = [
  "Booking",
  "Servis",
  "Pembayaran",
  "Sparepart",
  "Akun",
  "Masalah Teknis",
  "Lainnya",
];

export type Tiket = {
  id: string;
  nomor: string;
  pengirim: string;
  peran: string;
  subjek: string;
  kategori: string;
  pesan: string;
  tanggal: string;
  status: StatusTiket;
  balasan?: string;
};

const tiketAwal: Tiket[] = [
  {
    id: uid(),
    nomor: "CS-001",
    pengirim: "Budi Santoso",
    peran: "Pelanggan",
    subjek: "Tidak dapat melakukan booking",
    kategori: "Booking",
    pesan: "Saat menekan Kirim Booking, jadwal tidak tersimpan.",
    tanggal: "2026-08-29",
    status: "Diproses",
    balasan: "Tim kami sedang memeriksa kendala ini.",
  },
  {
    id: uid(),
    nomor: "CS-002",
    pengirim: "Admin Bengkel",
    peran: "Admin Bengkel",
    subjek: "Laporan stok tidak sinkron",
    kategori: "Sparepart",
    pesan: "Stok sparepart pada laporan berbeda dengan katalog.",
    tanggal: "2026-08-27",
    status: "Selesai",
    balasan: "Sudah diperbaiki pada pembaruan terakhir.",
  },
];

export const KATEGORI_PART: string[] = [
  "Pelumas",
  "Pengereman",
  "Pengapian",
  "Filter",
  "Mesin",
  "Transmisi",
  "Kelistrikan",
  "Kaki-kaki",
  "AC",
  "Ban",
  "Umum",
];

export const totalItem = (items: ItemPart[]) => items.reduce((a, i) => a + i.harga * i.jumlah, 0);

export const ringkasanItem = (items: ItemPart[]) =>
  items.map((i) => `${i.nama} x${i.jumlah}`).join(", ");

/** Terapkan selisih pemakaian sparepart lama → baru ke stok (simulasi). */
function terapkanSelisih(list: Sparepart[], lama: ItemPart[], baru: ItemPart[]): Sparepart[] {
  const delta = new Map<string, number>();
  for (const i of lama) delta.set(i.sparepartId, (delta.get(i.sparepartId) ?? 0) - i.jumlah);
  for (const i of baru) delta.set(i.sparepartId, (delta.get(i.sparepartId) ?? 0) + i.jumlah);
  return list.map((sp) => {
    const d = delta.get(sp.id);
    if (!d) return sp;
    return { ...sp, stok: Math.max(0, sp.stok - d), terpakai: Math.max(0, sp.terpakai + d) };
  });
}

const hariIni = () => new Date().toISOString().slice(0, 10);

type Store = {
  pelanggan: Pelanggan[];
  kendaraan: Kendaraan[];
  servis: Servis[];
  sparepart: Sparepart[];
  booking: Booking[];
  pembayaran: Pembayaran[];
  riwayatStok: RiwayatStok[];
  pembelian: PembelianSparepart[];
  penggunaan: PenggunaanSparepart[];
  stokOpname: StokOpname[];
  returSparepart: ReturSparepart[];
  laporanRingkasanStok: LaporanRingkasanStok[];
  bengkel: Bengkel[];
  activeBengkelId: string;
  setActiveBengkelId: (id: string) => void;
  activeBengkel: Bengkel;
  updateBengkelInfo: (id: string, info: Partial<Bengkel>) => Promise<void>;
  refreshBengkel: () => Promise<void>;
  mekanik: Mekanik[];
  supplier: Supplier[];
  simpanPelanggan: (p: Omit<Pelanggan, "id"> & { id?: string }) => void;
  hapusPelanggan: (id: string) => void;
  refreshPelanggan: () => Promise<void>;
  simpanKendaraan: (k: Omit<Kendaraan, "id"> & { id?: string }) => Promise<void>;
  hapusKendaraan: (id: string) => void;
  simpanServis: (
    s: Omit<Servis, "id" | "nomor" | "total" | "noTransaksi" | "biayaPart" | "sparepart"> & {
      id?: string;
      nomor?: string;
    },
  ) => Promise<void>;
  ubahStatusServis: (id: string, status: StatusServis) => void;
  hapusServis: (id: string) => void;
  simpanSparepart: (
    s: Omit<Sparepart, "id" | "terpakai" | "tanggalUpdate"> & { id?: string; terpakai?: number },
  ) => Promise<{ success: boolean; data?: Sparepart; error?: string }>;
  hapusSparepart: (id: string) => Promise<{ success: boolean; softDeleted?: boolean; message?: string }>;
  sesuaikanStokSparepart: (payload: {
    idSparepart: string;
    newStok: number;
    keterangan?: string;
    tipeAksi?: "masuk" | "keluar" | "penyesuaian";
  }) => Promise<{ success: boolean; newStok?: number; error?: string }>;
  catatPembelian: (p: Omit<PembelianSparepart, "id" | "nomor" | "total" | "status">) => Promise<void>;
  ubahPembelian: (id: string, p: Partial<PembelianSparepart>) => Promise<void>;
  hapusPembelian: (id: string) => Promise<void>;
  simpanMekanik: (m: Omit<Mekanik, "id" | "createdAt"> & { id?: string }) => Promise<void>;
  ubahStatusMekanik: (id: string, status: "Aktif" | "Tidak Aktif") => Promise<void>;
  hapusMekanik: (id: string) => Promise<{ success: boolean; message?: string }>;
  refreshMekanik: (workshopId?: string) => Promise<void>;
  refreshSupplier: () => Promise<void>;
  simpanSupplier: (s: Omit<Supplier, "id"> & { id?: string }) => Promise<void>;
  refreshKendaraan: () => Promise<void>;
  refreshBooking: () => Promise<void>;
  refreshServis: () => Promise<void>;
  refreshPembayaran: (workshopId?: string) => Promise<void>;
  refreshRetur: () => Promise<void>;
  refreshStok: () => Promise<void>;
  refreshPembelian: () => Promise<void>;
  refreshRiwayatStok: () => Promise<void>;
  refreshPenggunaan: () => Promise<void>;
  refreshSparepart: () => Promise<void>;
  buatBooking: (b: Omit<Booking, "id" | "nomor" | "status">) => Booking;
  ubahStatusBooking: (id: string, status: StatusBooking, alasan?: string) => void;
  tugaskanMekanikBooking: (id: string, mekanik: string) => void;
  aturEstimasiBooking: (id: string, estimasiSelesai: string) => void;
  ajukanPembayaran: (id: string, metode: MetodeBayar, buktiUrl?: string) => void;
  verifikasiPembayaran: (
    servisId: string,
    disetujui: boolean,
    alasan?: string,
    verifier?: string,
  ) => void;
  catatStokOpname: (so: Omit<StokOpname, "id">) => void;
  catatReturSparepart: (
    r: Omit<ReturSparepart, "id" | "nomorRetur" | "stokDikurangi"> & {
      id?: string;
      nomorRetur?: string;
      stokDikurangi?: boolean;
    },
  ) => Promise<ReturSparepart>;
  ubahStatusRetur: (id: string, status: StatusRetur, alasanPenolakan?: string) => Promise<void>;
  workshopPaymentAccounts: WorkshopPaymentAccountRow[];
  simpanPaymentAccount: (acc: Partial<WorkshopPaymentAccountRow> & {
    workshop_id: string;
    account_type: PaymentAccountType;
  }) => Promise<WorkshopPaymentAccountRow>;
  togglePaymentAccountActive: (id: string, isActive: boolean) => Promise<void>;
  hapusPaymentAccount: (id: string) => Promise<void>;
  refreshPaymentAccounts: (workshopId?: string) => Promise<void>;
  tiket: Tiket[];
  buatTiket: (t: Omit<Tiket, "id" | "nomor" | "status" | "tanggal">) => Tiket;
  notifikasi: Notifikasi[];
  tambahNotifikasi: (n: Omit<Notifikasi, "id" | "waktu" | "dibaca">) => void;
  tambahNotifikasiRealtime: (n: Notifikasi) => void;
  tandaiNotifikasiDibaca: (id: string) => void;
  tandaiSemuaNotifikasiDibaca: (role?: string) => void;
  hapusNotifikasi: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

const bacaData = <T,>(kunci: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(`appbenk.data.${kunci}`) ?? "") as T;
  } catch {
    return fallback;
  }
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // KUNCI ID BENGKEL UNTUK ROLE ADMIN & OWNER (diambil permanen dari profil auth / relasi database)
  const lockedBengkelId = useMemo(() => {
    if (!user) return undefined;
    if (user.role === "admin") {
      const isAnzar =
        (user.email && user.email.toLowerCase().includes("anzar")) ||
        (user.nama && user.nama.toLowerCase().includes("anzar")) ||
        user.id === "usr-demo-1";
      return user.workshopId || user.bengkelId || (isAnzar ? "bengkel-2307" : "bengkel-001");
    }
    if (user.role === "owner") {
      const isFandi =
        (user.nama && user.nama.toLowerCase().includes("fandi")) ||
        (user.email && user.email.toLowerCase().includes("fandi"));
      const isAnzar =
        (user.email && user.email.toLowerCase().includes("anzar")) ||
        (user.nama && user.nama.toLowerCase().includes("anzar")) ||
        user.id === "usr-demo-1";

      if (user.workshopId || user.bengkelId) {
        return user.workshopId || user.bengkelId;
      }
      if (isFandi || isAnzar) {
        return "bengkel-2307";
      }
      const matched = bengkelAwal.find(
        (b) =>
          (user.email && b.ownerEmail && b.ownerEmail.toLowerCase() === user.email.toLowerCase()) ||
          (user.nama && b.ownerNama && b.ownerNama.toLowerCase() === user.nama.toLowerCase()),
      );
      if (matched) return matched.id;

      return "bengkel-2307";
    }
    return undefined;
  }, [user]);

  const [pelanggan, setPelanggan] = useState(() => bacaData("pelanggan", pelangganAwal));
  const [kendaraan, setKendaraan] = useState(() => bacaData("kendaraan", kendaraanAwal));
  const [servis, setServis] = useState(() => bacaData("servis", servisAwal));
  const [sparepart, setSparepart] = useState(() => bacaData("sparepart", sparepartAwal));
  const [booking, setBooking] = useState(() => bacaData("booking", bookingAwal));
  const [tiket, setTiket] = useState(tiketAwal);
  const [pembayaran, setPembayaran] = useState(() => bacaData("pembayaran", pembayaranAwal));
  const [riwayatStok, setRiwayatStok] = useState(riwayatStokAwal);
  const [pembelian, setPembelian] = useState(pembelianAwal);
  const [penggunaan, setPenggunaan] = useState(penggunaanAwal);
  const [stokOpname, setStokOpname] = useState(() => bacaData("stokOpname", stokOpnameAwal));
  const [returSparepart, setReturSparepart] = useState(() => bacaData("returSparepart", returAwal));
  const [laporanRingkasanStok, setLaporanRingkasanStok] = useState(() =>
    bacaData("laporanRingkasanStok", laporanRingkasanAwal),
  );
  const [bengkel, setBengkel] = useState<Bengkel[]>(() => {
    const loaded = bacaData("bengkel", bengkelAwal);
    if (typeof window !== "undefined") {
      return loaded.map((b) => {
        try {
          const locStr =
            localStorage.getItem(`appbenk_bengkel_location_${b.id}`) ||
            (b.id === "bengkel-2307" ? localStorage.getItem("appbenk_bengkel_location") : null);
          if (locStr) {
            const loc = JSON.parse(locStr);
            if (loc.lat && loc.lng) {
              return {
                ...b,
                lat: loc.lat,
                lng: loc.lng,
                nama: loc.nama || b.nama,
                alamat: (loc.alamat || b.alamat || "").replace(/\[geo:[^\]]+\]/gi, "").trim(),
                telepon: loc.telepon || b.telepon,
                jamOperasional: loc.jamOperasional || b.jamOperasional,
              };
            }
          }
        } catch {}
        return b;
      });
    }
    return loaded;
  });
  const [activeBengkelId, setActiveBengkelIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("appbenk_active_bengkel_id");
      if (saved && saved !== "bengkel-001") return saved;
    }
    return "bengkel-2307";
  });

  // Sinkronisasi dan kunci activeBengkelId untuk admin & owner secara reaktif
  useEffect(() => {
    if (lockedBengkelId) {
      if (activeBengkelId !== lockedBengkelId) {
        setActiveBengkelIdState(lockedBengkelId);
      }
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("appbenk_active_bengkel_id");
        if (stored !== lockedBengkelId) {
          localStorage.setItem("appbenk_active_bengkel_id", lockedBengkelId);
        }
      }
    }
  }, [lockedBengkelId, activeBengkelId]);

  const setActiveBengkelId = useCallback((id: string) => {
    // TOLAK MUTASI JIKA BUKAN SUPER_ADMIN (admin dan owner terkunci permanen pada bengkel milik/tugasnya)
    if (user && user.role !== "super_admin") {
      console.warn(
        `[StoreProvider] Mutasi bengkel ditolak untuk role ${user.role}. Pengguna terkunci permanen pada bengkel ${lockedBengkelId || user.bengkelId || "terdaftar"}.`
      );
      return;
    }
    setActiveBengkelIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("appbenk_active_bengkel_id", id);
    }
  }, [user, lockedBengkelId]);

  const activeBengkel = useMemo(() => {
    const targetId = lockedBengkelId || activeBengkelId;
    return (
      bengkel.find((b) => b.id === targetId) ||
      bengkel.find((b) => b.id === "bengkel-2307") ||
      bengkelAwal.find((b) => b.id === "bengkel-2307") ||
      bengkel[0] ||
      bengkelAwal[0]
    );
  }, [bengkel, activeBengkelId, lockedBengkelId]);

  const updateBengkelInfo = useCallback(
    async (id: string, info: Partial<Bengkel>) => {
      // Tolak pembaruan profil bengkel jika admin/owner mencoba mengubah bengkel di luar hak aksesnya
      if (user?.role === "admin" || user?.role === "owner") {
        const myBengkel = lockedBengkelId || user.bengkelId || user.workshopId;
        if (myBengkel && id !== myBengkel) {
          throw new Error("Akses ditolak: Hanya berhak mengelola bengkel milik/tugas Anda.");
        }
      }
      setBengkel((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...info } : b)),
      );

      const cleanAlamat = (info.alamat || "").replace(/\[geo:[^\]]+\]/gi, "").trim();

      if (typeof window !== "undefined") {
        try {
          const locObj = {
            nama: info.nama,
            alamat: cleanAlamat,
            telepon: info.telepon,
            lat: info.lat,
            lng: info.lng,
            jamOperasional: info.jamOperasional,
          };
          localStorage.setItem(`appbenk_bengkel_location_${id}`, JSON.stringify(locObj));
          localStorage.setItem("appbenk_bengkel_location", JSON.stringify(locObj));
          localStorage.setItem("appbenk_bengkel_loc", JSON.stringify(locObj));
          if (id === "bengkel-2307") {
            localStorage.setItem("appbenk_bengkel_location_bengkel-2307", JSON.stringify(locObj));
          }
        } catch {}
      }

      try {
        const { supabase } = await import("@/lib/supabase");
        const client = supabase();
        if (client) {
          const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };
          if (info.nama !== undefined) updatePayload.nama_bengkel = info.nama;
          if (info.telepon !== undefined) updatePayload.no_telepon = info.telepon;
          if (cleanAlamat !== undefined && cleanAlamat !== "") updatePayload.alamat = cleanAlamat;
          if (info.lat !== undefined && info.lat !== null) updatePayload.latitude = info.lat;
          if (info.lng !== undefined && info.lng !== null) updatePayload.longitude = info.lng;
          if (info.jamOperasional !== undefined) updatePayload.jam_operasional = info.jamOperasional;

          const { error } = await client
            .from("bengkel")
            .update(updatePayload)
            .eq("id_bengkel", id);

          if (error) {
            console.error("Gagal update bengkel ke Supabase:", error);
          }
        }
      } catch (err) {
        console.warn("Gagal update bengkel ke Supabase:", err);
      }
    },
    [],
  );

  const refreshBengkel = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase()
        .from("bengkel")
        .select("*")
        .order("nama_bengkel", { ascending: true });
      if (!error && data && data.length > 0) {
        setBengkel(
          data.map((b) => {
            const rawAlamat = b.alamat ?? "";
            const geoMatch = rawAlamat.match(/\[geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/i);
            const cleanAlamat = geoMatch ? rawAlamat.replace(geoMatch[0], "").trim() : rawAlamat;
            const defaultItem = bengkelAwal.find((ba) => ba.id === b.id_bengkel);
            const lat = b.latitude != null
              ? Number(b.latitude)
              : geoMatch
              ? parseFloat(geoMatch[1])
              : (defaultItem?.lat ?? (b.id_bengkel === "bengkel-2307" ? -7.3245975 : -6.2088));
            const lng = b.longitude != null
              ? Number(b.longitude)
              : geoMatch
              ? parseFloat(geoMatch[2])
              : (defaultItem?.lng ?? (b.id_bengkel === "bengkel-2307" ? 109.352647 : 106.8456));
            const jamOperasional = b.jam_operasional || defaultItem?.jamOperasional || "Senin–Sabtu: 08.00–17.00 WIB";

            return {
              id: b.id_bengkel,
              nama: b.nama_bengkel,
              alamat: cleanAlamat || defaultItem?.alamat || "",
              telepon: b.no_telepon ?? defaultItem?.telepon ?? "",
              lat,
              lng,
              jamOperasional,
              paket: (b.paket as any) || defaultItem?.paket || "Basic",
              status: (b.status as any) || defaultItem?.status || "Aktif",
              ownerNama: b.owner_nama || defaultItem?.ownerNama,
              ownerEmail: b.owner_email || defaultItem?.ownerEmail,
              tanggalBergabung: b.created_at ? b.created_at.slice(0, 10) : defaultItem?.tanggalBergabung,
            };
          }),
        );
      }
    } catch (err) {
      console.warn("Gagal refresh data bengkel:", err);
    }
  }, []);

  const [mekanik, setMekanik] = useState<Mekanik[]>(() => bacaData("mekanik", mekanikAwal));
  const [supplier, setSupplier] = useState<Supplier[]>(() => bacaData("supplier", supplierAwal));
  const [workshopPaymentAccounts, setWorkshopPaymentAccounts] = useState<WorkshopPaymentAccountRow[]>(() =>
    getLocalAccounts(),
  );

  const refreshPaymentAccounts = useCallback(async (workshopId?: string) => {
    try {
      const res = await workshopPaymentAccountsService.getAll(workshopId);
      setWorkshopPaymentAccounts(res);
    } catch {}
  }, []);

  const refreshPembayaran = useCallback(async (workshopId?: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const rawList = await pembayaranService.getAll(workshopId);
      if (!rawList || rawList.length === 0) return;

      const mapped: Pembayaran[] = rawList.map((p: any) => {
        const rawStatus = (p.status_pembayaran || p.status || "").toString().toLowerCase().trim();
        const st: StatusPembayaranDisplay =
          rawStatus === "lunas" || rawStatus === "paid" || rawStatus === "selesai dibayar"
            ? "Lunas"
            : rawStatus === "menunggu_verifikasi" || rawStatus === "menunggu verifikasi" || rawStatus === "pending"
              ? "Menunggu Verifikasi"
              : rawStatus === "ditolak" || rawStatus === "bukti ditolak" || rawStatus === "rejected"
                ? "Bukti Ditolak"
                : "Belum Dibayar";

        const rawMetode = (p.metode_pembayaran || p.metode || "").toString().toLowerCase().trim();
        const met: MetodeBayar =
          rawMetode.includes("qris")
            ? "QRIS"
            : rawMetode.includes("transfer") || rawMetode.includes("bank")
              ? "Transfer Bank"
              : "Cash";

        const noTrx = p.nomor_transaksi || p.no_transaksi || (p.id_servis ? `TRX-${p.id_servis}` : "TRX");
        const total = Number(p.jumlah_bayar || p.total_bayar || p.servis?.total_biaya || 0);
        const bukti = p.bukti_pembayaran || p.bukti_url || undefined;
        const wbId = p.id_bengkel || p.workshop_id || p.servis?.id_bengkel || undefined;
        const pelName = p.servis?.pelanggan?.nama || undefined;
        const kenDesc = p.servis?.kendaraan ? `${p.servis.kendaraan.merk} ${p.servis.kendaraan.tipe}`.trim() : undefined;
        const plat = p.servis?.kendaraan?.nopol || undefined;
        const noServis = p.servis?.nomor_servis || undefined;

        return {
          id: p.id_pembayaran,
          servisId: p.id_servis,
          noTransaksi: noTrx,
          metode: met,
          tanggalBayar: p.tanggal_bayar ? p.tanggal_bayar.slice(0, 10) : hariIni(),
          totalBayar: total,
          status: st,
          bengkelId: wbId,
          pelanggan: pelName,
          kendaraan: kenDesc,
          plat,
          nomorServis: noServis,
          ...(bukti ? { buktiUrl: bukti } : {}),
          ...(p.alasan_penolakan ? { alasanTolak: p.alasan_penolakan } : {}),
          ...(p.verified_at ? { verifiedAt: p.verified_at } : {}),
          ...(p.verified_by ? { verifiedBy: p.verified_by } : {}),
        };
      });

      setPembayaran((current) => {
        const nonConflict = current.filter(
          (loc) => !mapped.some((m) => m.id === loc.id || m.servisId === loc.servisId || m.noTransaksi === loc.noTransaksi)
        );
        return [...mapped, ...nonConflict];
      });
    } catch (err) {
      console.error("Gagal refresh pembayaran:", err);
    }
  }, []);

  useEffect(() => {
    refreshPaymentAccounts();
    refreshPembayaran();
    const handleAccountsUpdated = () => {
      refreshPaymentAccounts();
    };
    const handlePembayaranUpdated = () => {
      refreshPembayaran();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("appbenk_payment_accounts_updated", handleAccountsUpdated);
      window.addEventListener("appbenk_pembayaran_updated", handlePembayaranUpdated);
      window.addEventListener("storage", handleAccountsUpdated);
      window.addEventListener("storage", handlePembayaranUpdated);
      return () => {
        window.removeEventListener("appbenk_payment_accounts_updated", handleAccountsUpdated);
        window.removeEventListener("appbenk_pembayaran_updated", handlePembayaranUpdated);
        window.removeEventListener("storage", handleAccountsUpdated);
        window.removeEventListener("storage", handlePembayaranUpdated);
      };
    }
  }, [refreshPembayaran]);

  const simpanPaymentAccount = async (acc: Partial<WorkshopPaymentAccountRow> & {
    workshop_id: string;
    account_type: PaymentAccountType;
  }) => {
    const saved = await workshopPaymentAccountsService.saveAccount(acc);
    setWorkshopPaymentAccounts((prev) => {
      if (saved.account_type === "qris") {
        const wbId = saved.workshop_id || saved.id_bengkel;
        const withoutQris = prev.filter(
          (a) => !(a.account_type === "qris" && (a.workshop_id === wbId || a.id_bengkel === wbId))
        );
        return [saved, ...withoutQris];
      }
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    return saved;
  };

  const togglePaymentAccountActive = async (id: string, isActive: boolean) => {
    await workshopPaymentAccountsService.toggleActive(id, isActive);
    setWorkshopPaymentAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: isActive } : a)),
    );
  };

  const hapusPaymentAccount = async (id: string) => {
    await workshopPaymentAccountsService.deleteAccount(id);
    setWorkshopPaymentAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  useEffect(() => {
    window.localStorage.setItem("appbenk.data.pelanggan", JSON.stringify(pelanggan));
  }, [pelanggan]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.kendaraan", JSON.stringify(kendaraan));
  }, [kendaraan]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.servis", JSON.stringify(servis));
  }, [servis]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.sparepart", JSON.stringify(sparepart));
  }, [sparepart]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.booking", JSON.stringify(booking));
  }, [booking]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.pembayaran", JSON.stringify(pembayaran));
  }, [pembayaran]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.stokOpname", JSON.stringify(stokOpname));
  }, [stokOpname]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.returSparepart", JSON.stringify(returSparepart));
  }, [returSparepart]);
  useEffect(() => {
    window.localStorage.setItem(
      "appbenk.data.laporanRingkasanStok",
      JSON.stringify(laporanRingkasanStok),
    );
  }, [laporanRingkasanStok]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.bengkel", JSON.stringify(bengkel));
  }, [bengkel]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.mekanik", JSON.stringify(mekanik));
  }, [mekanik]);
  useEffect(() => {
    window.localStorage.setItem("appbenk.data.supplier", JSON.stringify(supplier));
  }, [supplier]);

  const [notifikasi, setNotifikasi] = useState<Notifikasi[]>(() => {
    const raw = bacaData<Notifikasi[]>("notifikasi", [
      {
        id: "notif-001",
        role: "admin",
        tipe: "pembayaran",
        judul: "Sistem Pembayaran AppBenk",
        pesan:
          "Sistem notifikasi pembayaran QRIS dan transfer telah siap menerima konfirmasi pelanggan.",
        waktu: new Date().toISOString(),
        dibaca: false,
      },
    ]);
    return raw.map((n) =>
      n.statusBooking === "Diterima" || n.judul.toLowerCase().includes("booking diterima")
        ? { ...n, link: "/pelanggan/status" }
        : n,
    );
  });

  useEffect(() => {
    window.localStorage.setItem("appbenk.data.notifikasi", JSON.stringify(notifikasi));
  }, [notifikasi]);

  const tambahNotifikasi = useCallback((n: Omit<Notifikasi, "id" | "waktu" | "dibaca">) => {
    const baru: Notifikasi = {
      ...n,
      id: uid(),
      waktu: new Date().toISOString(),
      dibaca: false,
    };
    setNotifikasi((prev) => [baru, ...prev]);

    if (isSupabaseConfigured()) {
      notifikasiService
        .create({
          user_id: n.userId ?? null,
          judul: n.judul,
          pesan: n.pesan,
          tipe: (n.tipe === "pembayaran" || n.tipe === "booking" || n.tipe === "servis") ? n.tipe : "info",
          tautan_url: n.link ?? null,
        })
        .catch(() => {});
    }
  }, []);

  const tambahNotifikasiRealtime = useCallback((n: Notifikasi) => {
    setNotifikasi((prev) => {
      if (prev.some((item) => item.id === n.id)) return prev;
      return [n, ...prev];
    });
  }, []);

  const tandaiNotifikasiDibaca = useCallback((id: string) => {
    setNotifikasi((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dibaca: true } : item)),
    );
    notifikasiService.markAsRead(id).catch(() => {});
  }, []);

  const tandaiSemuaNotifikasiDibaca = useCallback((role?: string) => {
    setNotifikasi((prev) =>
      prev.map((item) =>
        !role || item.role === role || item.role === "semua" ? { ...item, dibaca: true } : item,
      ),
    );
    notifikasiService.markAllAsRead({ role }).catch(() => {});
  }, []);

  const hapusNotifikasi = useCallback((id: string) => {
    setNotifikasi((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    Promise.allSettled([
      pelangganService.getAll(),
      kendaraanService.getAll(),
      sparepartService.getAll(),
      bookingService.getAll(),
      servisService.getAll(),
      pembayaranService.getAll(),
      sparepartService.getPembelian(),
      sparepartService.getPenggunaan(),
      sparepartService.getRiwayatStok(),
      sparepartService.getRetur(),
      mekanikService.getBengkel(),
      mekanikService.getMekanik(),
      supabase().from("detail_servis").select("*"),
      supplierService.getAll(),
    ])
      .then(
        ([
          pRes,
          kRes,
          spRes,
          bkRes,
          srvRes,
          pemRes,
          beliRes,
          pakaiRes,
          riwRes,
          returRes,
          bklRes,
          mekRes,
          detRes,
          suppRes,
        ]) => {
          let listPelanggan: Pelanggan[] = [];
          if (pRes.status === "fulfilled" && pRes.value.length > 0) {
            listPelanggan = pRes.value.map((p) => ({
              id: p.id_pelanggan,
              userId: p.user_id ?? undefined,
              nama: p.nama,
              email: p.email,
              telepon: p.no_hp ?? "",
              alamat: p.alamat ?? "",
              kendaraan: "",
              plat: "",
            }));
            setPelanggan(listPelanggan);
          }

          let listKendaraan: Kendaraan[] = [];
          if (kRes.status === "fulfilled" && kRes.value.length > 0) {
            listKendaraan = kRes.value.map((k) => ({
              id: k.id_kendaraan,
              pelangganId: k.id_pelanggan,
              merk: k.merk,
              tipe: k.tipe,
              tahun: k.tahun,
              plat: k.nopol,
              kilometer: k.kilometer || 0,
            }));
            setKendaraan(listKendaraan);
          }

          if (spRes.status === "fulfilled" && spRes.value.length > 0) {
            setSparepart(
              spRes.value.map((sp) => {
                let kat = sp.kategori;
                if (kat === "Oli") kat = "Pelumas";
                if (kat === "Rem") kat = "Pengereman";
                return {
                  id: sp.id_sparepart,
                  kode: (sp as any).kode || sp.id_sparepart,
                  nama: sp.nama_sparepart || (sp as any).nama || sp.id_sparepart,
                  kategori: kat || "Umum",
                  satuan: sp.satuan || "Pcs",
                  harga: Number(sp.harga || 0),
                  stok: Number(sp.stok_tersedia ?? (sp as any).stok ?? 0),
                  stokMinimum: Number(sp.stok_minimum ?? 5),
                  terpakai: 0,
                  tanggalUpdate: sp.tanggal_update ? sp.tanggal_update.slice(0, 10) : hariIni(),
                };
              }),
            );
          }

          if (bkRes.status === "fulfilled" && bkRes.value.length > 0) {
            setBooking(
              bkRes.value.map((b) => {
                const pel = listPelanggan.find((p) => p.id === b.id_pelanggan);
                const ken = listKendaraan.find((k) => k.id === b.id_kendaraan);
                return {
                  id: b.id_booking,
                  nomor: b.nomor_booking,
                  pelanggan: pel?.nama ?? "Pelanggan",
                  customerId: b.id_pelanggan,
                  vehicleId: b.id_kendaraan,
                  bengkelId: b.id_bengkel ?? "bengkel-001",
                  mekanikId: b.id_mekanik ?? undefined,
                  kendaraan: ken?.tipe ?? "Kendaraan",
                  plat: ken?.plat ?? "",
                  jenis: b.jenis_servis,
                  keluhan: b.keluhan,
                  tanggal: b.tanggal_booking,
                  waktu: b.waktu_booking,
                  catatan: "",
                  mekanikDiinginkan: b.mekanik_diinginkan ?? undefined,
                  status:
                    b.status_booking === "disetujui"
                      ? "Diterima"
                      : b.status_booking === "ditolak"
                        ? "Ditolak"
                        : "Menunggu Konfirmasi",
                };
              }),
            );
          }

          if (srvRes.status === "fulfilled" && srvRes.value.length > 0) {
            const detList: any[] =
              detRes && detRes.status === "fulfilled" && (detRes.value as any).data
                ? (detRes.value as any).data
                : [];
            const spList: any[] = spRes && spRes.status === "fulfilled" ? (spRes.value as any) : [];

            const bkList: any[] = bkRes && bkRes.status === "fulfilled" ? (bkRes.value as any) : [];

            setServis(
              srvRes.value.map((s) => {
                const pel = listPelanggan.find((p) => p.id === s.id_pelanggan);
                const ken = listKendaraan.find((k) => k.id === s.id_kendaraan);
                const bk = bkList.find((b: any) => b.id_booking === s.id_booking);
                const pelFromBk = bk ? listPelanggan.find((p) => p.id === bk.id_pelanggan) : undefined;
                const namaPelanggan =
                  pel?.nama ||
                  pelFromBk?.nama ||
                  s.pelanggan ||
                  "Pelanggan";
                const targetPelangganId = s.id_pelanggan || pel?.id || pelFromBk?.id || bk?.id_pelanggan || undefined;
                const targetUserId = pel?.userId || pelFromBk?.userId || undefined;

                const rawStatus = (s.status_servis || "").toLowerCase();
                const st: StatusServis =
                  rawStatus === "diproses" || rawStatus === "dikerjakan" || rawStatus === "menunggu_sparepart" || rawStatus === "proses"
                    ? "Diproses"
                    : rawStatus === "selesai"
                      ? "Selesai"
                      : rawStatus === "menunggu_pembayaran"
                        ? "Menunggu Pembayaran"
                        : rawStatus === "lunas" || rawStatus === "selesai dibayar"
                          ? "Selesai Dibayar"
                          : rawStatus === "booking"
                            ? "Booking"
                            : "Menunggu";

                const srvDetails = detList.filter((d: any) => d.id_servis === s.id_servis);
                const items: ItemPart[] = srvDetails.map((d: any) => {
                  const sp = spList.find((x: any) => x.id_sparepart === d.id_sparepart);
                  return {
                    sparepartId: d.id_sparepart || d.id_detail || d.id_detail_servis,
                    kode: sp?.id_sparepart || d.id_sparepart || "-",
                    nama: sp?.nama_sparepart || d.keterangan || "Sparepart",
                    harga: Number(d.harga || d.harga_satuan || sp?.harga || 0),
                    jumlah: Number(d.jumlah || d.qty || 1),
                  };
                });
                const ringkas = items.map((i) => `${i.nama} (${i.jumlah}x)`).join(", ");
                const totalPartCalc = items.reduce((sum, i) => sum + i.harga * i.jumlah, 0);

                return {
                  id: s.id_servis,
                  nomor: s.nomor_servis,
                  bookingId: s.id_booking ?? undefined,
                  pelanggan: namaPelanggan,
                  pelangganId: targetPelangganId,
                  customerId: targetPelangganId,
                  userId: targetUserId,
                  kendaraan: ken ? `${ken.merk} ${ken.tipe} ${ken.tahun}`.trim() : (bk ? `${bk.jenis_servis || "Kendaraan"}` : "Kendaraan"),
                  plat: ken?.plat || (ken as any)?.nopol || "",
                  bengkelId: s.id_bengkel ?? "bengkel-001",
                  mekanikId: s.id_mekanik ?? undefined,
                  jenis: s.jenis_servis ?? "Servis Umum",
                  keluhan: s.keluhan ?? "",
                  pekerjaan: s.pekerjaan || s.catatan || s.jenis_servis || "",
                  mekanik: s.mekanik ?? "Andi",
                  tanggal:
                    s.tanggal_servis || (s.created_at ? s.created_at.slice(0, 10) : hariIni()),
                  status: st,
                  sparepart: ringkas,
                  items: items,
                  catatan: s.catatan ?? "",
                  biayaJasa: Number(s.biaya_jasa || 0),
                  biayaPart: Number(s.biaya_sparepart || totalPartCalc || 0),
                  total: Number(s.total_biaya || 0),
                  noTransaksi: `TRX-${s.nomor_servis.replace("SRV-", "")}`,
                  estimasiBiaya: s.estimasi_biaya ? Number(s.estimasi_biaya) : undefined,
                  estimasiWaktu: s.estimasi_waktu ?? s.estimasi_durasi ?? undefined,
                  estimasiDurasi: s.estimasi_waktu ?? s.estimasi_durasi ?? undefined,
                  estimasiSelesai: s.estimasi_selesai ?? undefined,
                  tanggalMulai: s.tanggal_mulai ?? undefined,
                  tanggalSelesai: s.tanggal_selesai ?? undefined,
                };
              }),
            );
          }

          if (bklRes.status === "fulfilled" && bklRes.value.length > 0) {
            setBengkel(
              bklRes.value.map((b) => {
                const rawAlamat = b.alamat ?? "";
                const geoMatch = rawAlamat.match(/\[geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/i);
                const cleanAlamat = geoMatch ? rawAlamat.replace(geoMatch[0], "").trim() : rawAlamat;
                const defaultItem = bengkelAwal.find((ba) => ba.id === b.id_bengkel);
                const lat = b.latitude != null
                  ? Number(b.latitude)
                  : geoMatch
                  ? parseFloat(geoMatch[1])
                  : (defaultItem?.lat ?? (b.id_bengkel === "bengkel-2307" ? -7.3245975 : -6.2088));
                const lng = b.longitude != null
                  ? Number(b.longitude)
                  : geoMatch
                  ? parseFloat(geoMatch[2])
                  : (defaultItem?.lng ?? (b.id_bengkel === "bengkel-2307" ? 109.352647 : 106.8456));
                const jamOperasional = b.jam_operasional || defaultItem?.jamOperasional || "Senin–Sabtu: 08.00–17.00 WIB";

                if (typeof window !== "undefined") {
                  try {
                    const locObj = {
                      nama: b.nama_bengkel,
                      alamat: cleanAlamat || defaultItem?.alamat || "",
                      telepon: b.no_telepon ?? defaultItem?.telepon ?? "",
                      lat,
                      lng,
                      jamOperasional,
                    };
                    localStorage.setItem(`appbenk_bengkel_location_${b.id_bengkel}`, JSON.stringify(locObj));
                    if (b.id_bengkel === "bengkel-2307") {
                      localStorage.setItem("appbenk_bengkel_location", JSON.stringify(locObj));
                      localStorage.setItem("appbenk_bengkel_location_bengkel-2307", JSON.stringify(locObj));
                    }
                  } catch {}
                }

                return {
                  id: b.id_bengkel,
                  nama: b.nama_bengkel,
                  alamat: cleanAlamat || defaultItem?.alamat || "",
                  telepon: b.no_telepon ?? defaultItem?.telepon ?? "",
                  lat,
                  lng,
                  jamOperasional,
                  ownerNama:
                    b.owner_nama ||
                    (b.id_bengkel === "bengkel-001" || b.id_bengkel === "bengkel-002"
                      ? "Pak Budi"
                      : b.id_bengkel === "bengkel-3247"
                        ? "amatno"
                        : b.id_bengkel === "bengkel-2307"
                          ? "Fandi Nasir"
                          : "Pak Budi"),
                  ownerEmail: b.owner_email ?? defaultItem?.ownerEmail,
                  paket: (b.paket as any) ?? defaultItem?.paket ?? "Basic",
                  status: (b.status as any) ?? defaultItem?.status ?? "Aktif",
                  tanggalBergabung: b.created_at ? b.created_at.slice(0, 10) : defaultItem?.tanggalBergabung,
                };
              }),
            );
          }

          if (mekRes.status === "fulfilled" && mekRes.value.length > 0) {
            setMekanik(
              mekRes.value.map((m) => ({
                id: m.id_mekanik,
                bengkelId: m.id_bengkel,
                nama: m.nama_mekanik,
                telepon: m.no_telepon ?? "",
                spesialisasi: m.spesialisasi ?? "Umum",
                status: m.status,
                createdAt: m.created_at ? m.created_at.slice(0, 10) : hariIni(),
              })),
            );
          }

          if (pemRes.status === "fulfilled" && pemRes.value.length > 0) {
            setPembayaran(
              pemRes.value.map((p: any) => {
                const rawStatus = (p.status_pembayaran || p.status || "").toString().toLowerCase().trim();
                const st =
                  rawStatus === "lunas" || rawStatus === "paid" || rawStatus === "selesai dibayar"
                    ? "Lunas"
                    : rawStatus === "menunggu_verifikasi" || rawStatus === "menunggu verifikasi" || rawStatus === "pending"
                      ? "Menunggu Verifikasi"
                      : rawStatus === "ditolak" || rawStatus === "bukti ditolak" || rawStatus === "rejected"
                        ? "Bukti Ditolak"
                        : "Belum Dibayar";

                const rawMetode = (p.metode_pembayaran || p.metode || "").toString().toLowerCase().trim();
                const met: MetodeBayar =
                  rawMetode.includes("qris")
                    ? "QRIS"
                    : rawMetode.includes("transfer") || rawMetode.includes("bank")
                      ? "Transfer Bank"
                      : "Cash";

                const noTrx = p.nomor_transaksi || p.no_transaksi || (p.id_servis ? `TRX-${p.id_servis}` : "TRX");
                const total = Number(p.jumlah_bayar || p.total_bayar || p.servis?.total_biaya || 0);
                const bukti = p.bukti_pembayaran || p.bukti_url || undefined;
                const wbId = p.id_bengkel || p.workshop_id || p.servis?.id_bengkel || undefined;
                const pelName = p.servis?.pelanggan?.nama || undefined;
                const kenDesc = p.servis?.kendaraan ? `${p.servis.kendaraan.merk} ${p.servis.kendaraan.tipe}`.trim() : undefined;
                const plat = p.servis?.kendaraan?.nopol || undefined;
                const noServis = p.servis?.nomor_servis || undefined;

                return {
                  id: p.id_pembayaran,
                  servisId: p.id_servis,
                  noTransaksi: noTrx,
                  metode: met,
                  tanggalBayar: p.tanggal_bayar ? p.tanggal_bayar.slice(0, 10) : hariIni(),
                  totalBayar: total,
                  status: st,
                  bengkelId: wbId,
                  pelanggan: pelName,
                  kendaraan: kenDesc,
                  plat,
                  nomorServis: noServis,
                  ...(bukti ? { buktiUrl: bukti } : {}),
                  ...(p.alasan_penolakan ? { alasanTolak: p.alasan_penolakan } : {}),
                  ...(p.verified_at ? { verifiedAt: p.verified_at } : {}),
                  ...(p.verified_by ? { verifiedBy: p.verified_by } : {}),
                };
              }),
            );
          }

          if (beliRes.status === "fulfilled" && beliRes.value.length > 0) {
            const mappedBeli: PembelianSparepart[] = beliRes.value.map((b) => ({
              id: b.id_pembelian_sparepart || (b as any).id_pembelian || uid(),
              nomor: b.nomor_pembelian,
              sparepartId: b.id_sparepart,
              supplierId: b.id_supplier ?? undefined,
              supplier: b.supplier,
              tanggal: b.tanggal,
              jumlah: b.jumlah,
              harga: Number(b.harga || 0),
              total: Number(b.total || 0),
              status: "Diterima",
            }));
            setPembelian((current) => {
              const localOnly = current.filter(
                (loc) => !mappedBeli.some((sb) => sb.id === loc.id || sb.nomor === loc.nomor),
              );
              return [...localOnly, ...mappedBeli];
            });
          }

          if (riwRes.status === "fulfilled" && riwRes.value.length > 0) {
            const mappedRiw: RiwayatStok[] = riwRes.value.map((r) => ({
              id: r.id_riwayat_stok || (r as any).id_riwayat || uid(),
              sparepartId: r.id_sparepart,
              jenis: r.jenis === "keluar" || (r as any).tipe === "keluar" ? "Keluar" : "Masuk",
              jumlah: r.jumlah || (r as any).qty || 1,
              tanggal: r.tanggal ? r.tanggal.slice(0, 10) : hariIni(),
              keterangan: r.keterangan || "",
            }));
            setRiwayatStok((current) => {
              const localOnly = current.filter((loc) => !mappedRiw.some((sb) => sb.id === loc.id));
              return [...localOnly, ...mappedRiw];
            });
          }

          if (pakaiRes.status === "fulfilled" && pakaiRes.value.length > 0) {
            setPenggunaan(
              pakaiRes.value.map((p) => ({
                id: p.id_penggunaan_sparepart || (p as any).id_penggunaan || uid(),
                sparepartId: p.id_sparepart,
                servisId: p.id_servis,
                servisNomor: p.id_servis,
                tanggal: p.tanggal,
                jumlah: p.jumlah || (p as any).qty || 1,
                mekanik: p.mekanik || "",
                keterangan: p.keterangan || "",
              })),
            );
          }

          if (suppRes.status === "fulfilled" && suppRes.value.length > 0) {
            setSupplier(
              suppRes.value.map((s) => ({
                id: s.id_supplier,
                bengkelId: s.id_bengkel ?? "bengkel-001",
                nama: s.nama_supplier ?? s.nama ?? "Supplier",
                kontak: s.kontak ?? undefined,
                telepon: s.no_telepon ?? s.telepon ?? undefined,
                email: s.email ?? undefined,
                alamat: s.alamat ?? undefined,
                status: (s.status as "Aktif" | "Tidak Aktif") || "Aktif",
              })),
            );
          }

          if (returRes.status === "fulfilled" && returRes.value.length > 0) {
            const spList: any[] = spRes && spRes.status === "fulfilled" ? (spRes.value as any) : [];
            const beliList: any[] =
              beliRes && beliRes.status === "fulfilled" ? (beliRes.value as any) : [];

            const mappedRetur: ReturSparepart[] = returRes.value.map((r) => {
              const stRaw = String(r.status || "").toLowerCase();
              let normalizedStatus: StatusRetur = "Diajukan";
              if (stRaw === "selesai") normalizedStatus = "Selesai";
              else if (stRaw === "barang dikirim" || stRaw === "barang_dikirim")
                normalizedStatus = "Barang Dikirim";
              else if (stRaw === "disetujui") normalizedStatus = "Disetujui";
              else if (stRaw === "ditolak") normalizedStatus = "Ditolak";
              else if (stRaw === "diproses") normalizedStatus = "Diproses";
              else normalizedStatus = "Diajukan";

              const sp = spList.find(
                (x) => x.id_sparepart?.toLowerCase() === r.id_sparepart?.toLowerCase(),
              );
              const pemb = beliList.find(
                (b) =>
                  (b.id_pembelian_sparepart &&
                    b.id_pembelian_sparepart === r.id_pembelian_sparepart) ||
                  (b.nomor_pembelian &&
                    r.nomor_pembelian &&
                    b.nomor_pembelian.toLowerCase() === r.nomor_pembelian.toLowerCase()),
              );

              return {
                id: r.id_retur_sparepart,
                nomorRetur: r.nomor_retur || `RET-2026-${r.id_retur_sparepart.slice(-3)}`,
                bengkelId: r.id_bengkel || "bengkel-001",
                supplierId: r.id_supplier || (pemb as any)?.id_supplier || "sup-001",
                supplier: r.supplier || pemb?.supplier || "Supplier",
                pembelianId: r.id_pembelian_sparepart || pemb?.id_pembelian_sparepart || "",
                nomorPembelian: r.nomor_pembelian || pemb?.nomor_pembelian || "—",
                sparepartId: r.id_sparepart,
                namaSparepart: r.nama_sparepart || sp?.nama_sparepart || sp?.nama || "Sparepart",
                jumlah: Number(r.jumlah || 1),
                hargaSatuan: Number(r.harga_satuan || pemb?.harga || sp?.harga || 0),
                totalNilai: Number(
                  r.total_nilai ||
                    (r.jumlah || 1) * Number(r.harga_satuan || pemb?.harga || sp?.harga || 0),
                ),
                tanggal: r.tanggal ? r.tanggal.slice(0, 10) : hariIni(),
                alasan: r.alasan || "Cacat / Rusak Pabrik",
                alasanDetail: r.alasan_detail ?? undefined,
                alasanPenolakan: r.alasan_penolakan ?? undefined,
                keterangan: r.keterangan ?? undefined,
                status: normalizedStatus,
                stokDikurangi: Boolean(r.stok_dikurangi),
                riwayatStokId: r.riwayat_stok_id ?? undefined,
                createdAt: r.created_at,
              };
            });

            setReturSparepart((currentLocal) => {
              const localOnly = currentLocal.filter(
                (loc) =>
                  !mappedRetur.some(
                    (sb) =>
                      sb.id === loc.id ||
                      (sb.nomorRetur && loc.nomorRetur && sb.nomorRetur === loc.nomorRetur),
                  ),
              );
              return [...localOnly, ...mappedRetur];
            });

            // Sinkronisasi retur yang disetujui ke Riwayat Stok (Tab 2)
            setRiwayatStok((currentRiw) => {
              const additions: RiwayatStok[] = [];
              for (const r of mappedRetur) {
                if (
                  (r.stokDikurangi ||
                    r.status === "Disetujui" ||
                    r.status === "Selesai" ||
                    r.status === "Barang Dikirim") &&
                  !currentRiw.some((rw) => rw.keterangan?.includes(r.nomorRetur))
                ) {
                  additions.push({
                    id: r.riwayatStokId || `rw-${r.id}`,
                    sparepartId: r.sparepartId,
                    jenis: "Keluar",
                    jumlah: r.jumlah,
                    tanggal: r.tanggal,
                    keterangan: `Retur ${r.nomorRetur} (${r.supplier}) · ${r.alasan}`,
                  });
                }
              }
              if (additions.length === 0) return currentRiw;
              return [...additions, ...currentRiw];
            });
          }
        },
      )
      .catch(() => {});
  }, []);

  const value = useMemo<Store>(
    () => ({
      pelanggan,
      kendaraan,
      servis,
      sparepart,
      booking,
      tiket,
      pembayaran,
      riwayatStok,
      pembelian,
      penggunaan,
      stokOpname,
      returSparepart,
      laporanRingkasanStok,
      bengkel,
      mekanik,
      buatTiket: (t) => {
        const baru: Tiket = {
          ...t,
          id: uid(),
          nomor: `CS-${String(tiket.length + 1).padStart(3, "0")}`,
          tanggal: hariIni(),
          status: "Menunggu",
        };
        setTiket((l) => [baru, ...l]);
        return baru;
      },

      simpanPelanggan: (p) => {
        const isExisting = Boolean(p.id && pelanggan.some((x) => x.id === p.id));
        const id = p.id || uid();
        setPelanggan((list) =>
          isExisting
            ? list.map((x) => (x.id === p.id ? ({ ...x, ...p } as Pelanggan) : x))
            : [{ ...p, id } as Pelanggan, ...list],
        );
        if (isSupabaseConfigured()) {
          if (isExisting && p.id) {
            pelangganService
              .update(p.id, {
                nama: p.nama,
                email: p.email,
                ...(p.telepon ? { no_hp: p.telepon } : {}),
                ...(p.alamat ? { alamat: p.alamat } : {}),
              })
              .catch(() => {});
          } else {
            pelangganService
              .create({
                ...(p.id ? { id_pelanggan: p.id } : {}),
                ...(p.userId ? { user_id: p.userId } : {}),
                nama: p.nama,
                email: p.email,
                ...(p.telepon ? { no_hp: p.telepon } : {}),
                ...(p.alamat ? { alamat: p.alamat } : {}),
              })
              .catch(() => {});
          }
        }
      },
      hapusPelanggan: (id) => {
        setPelanggan((l) => l.filter((x) => x.id !== id));
        setKendaraan((l) => l.filter((x) => x.pelangganId !== id));
        if (isSupabaseConfigured()) {
          pelangganService.delete(id).catch(() => {});
        }
      },
      simpanKendaraan: async (k) => {
        const isExisting = Boolean(k.id && kendaraan.some((x) => x.id === k.id));
        const id =
          k.id || `kd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        setKendaraan((list) =>
          isExisting
            ? list.map((x) => (x.id === k.id ? ({ ...x, ...k } as Kendaraan) : x))
            : [{ ...k, id } as Kendaraan, ...list],
        );
        if (isSupabaseConfigured()) {
          if (isExisting && k.id) {
            try {
              await kendaraanService.update(k.id, {
                merk: k.merk,
                tipe: k.tipe,
                tahun: k.tahun,
                nopol: k.plat,
                kilometer: k.kilometer,
              });
            } catch (err) {
              console.error("Error updating kendaraan:", err);
              throw err;
            }
          } else {
            try {
              const created = await kendaraanService.create({
                id_kendaraan: id,
                id_pelanggan: k.pelangganId,
                merk: k.merk,
                tipe: k.tipe,
                tahun: k.tahun,
                nopol: k.plat,
                kilometer: k.kilometer,
              });
              if (created?.id_kendaraan && created.id_kendaraan !== id) {
                setKendaraan((list) =>
                  list.map((x) => (x.id === id ? { ...x, id: created.id_kendaraan } : x)),
                );
              }
            } catch (err) {
              // Rollback local state on error
              setKendaraan((list) => list.filter((x) => x.id !== id));
              console.error("Error creating kendaraan:", err);
              throw err;
            }
          }
        }
      },
      hapusKendaraan: (id) => {
        setKendaraan((l) => l.filter((x) => x.id !== id));
        if (isSupabaseConfigured()) {
          kendaraanService.delete(id).catch(() => {});
        }
      },
      simpanServis: async (s) => {
        const items = s.items ?? [];
        const lamaServis = s.id ? servis.find((x) => x.id === s.id) : undefined;
        const lama = lamaServis?.items ?? [];
        setSparepart((list) => terapkanSelisih(list, lama, items));
        const biayaPart = totalItem(items);
        const ringkas = ringkasanItem(items);
        const tgl = s.tanggal || hariIni();

        // Catat log riwayat stok & penggunaan sparepart untuk selisih pemakaian.
        const delta = new Map<string, number>();
        for (const i of lama) delta.set(i.sparepartId, (delta.get(i.sparepartId) ?? 0) - i.jumlah);
        for (const i of items) delta.set(i.sparepartId, (delta.get(i.sparepartId) ?? 0) + i.jumlah);

        let finalNomor = lamaServis?.nomor || s.nomor || "";

        setServis((list) => {
          const total = s.biayaJasa + biayaPart;
          let nomor = lamaServis?.nomor || s.nomor || "";
          if (s.id) {
            const foundInList = list.find((x) => x.id === s.id);
            if (!nomor && foundInList?.nomor) nomor = foundInList.nomor;
            finalNomor = nomor;
            return list.map((x) =>
              x.id === s.id
                ? {
                    ...x,
                    ...s,
                    nomor: x.nomor || nomor,
                    items,
                    biayaPart,
                    sparepart: ringkas,
                    total,
                  }
                : x,
            );
          } else {
            nomor = generateNextNomorServis(list);
            finalNomor = nomor;
            const seqSuffix = nomor.replace("SRV-", "");
            return [
              {
                ...s,
                pelangganId: s.pelangganId || (s as any).customerId,
                customerId: s.customerId || s.pelangganId,
                items,
                biayaPart,
                sparepart: ringkas,
                id: uid(),
                nomor,
                total,
                noTransaksi: `TRX-${seqSuffix}`,
              } as Servis,
              ...list,
            ];
          }
        });

        const idServis = s.id ?? uid();
        const logStok: RiwayatStok[] = [];
        const logPakai: PenggunaanSparepart[] = [];
        for (const [sparepartId, d] of delta) {
          if (!d) continue;
          logStok.push({
            id: uid(),
            sparepartId,
            jenis: d > 0 ? "Keluar" : "Masuk",
            jumlah: Math.abs(d),
            tanggal: tgl,
            referensi: finalNomor,
            keterangan:
              d > 0 ? `Dipakai servis ${finalNomor} (${s.pelanggan || "Pelanggan"})` : `Koreksi pemakaian servis ${finalNomor}`,
          });
          if (d > 0)
            logPakai.push({
              id: uid(),
              sparepartId,
              servisId: idServis,
              servisNomor: finalNomor,
              tanggal: tgl,
              jumlah: d,
              mekanik: s.mekanik,
              pelanggan: s.pelanggan,
              statusServis: s.status,
              keterangan: s.pekerjaan || s.jenis || `Servis ${finalNomor}`,
            });
        }
        if (logStok.length) setRiwayatStok((l) => [...logStok, ...l]);
        if (logPakai.length) setPenggunaan((l) => [...logPakai, ...l]);

        if (isSupabaseConfigured()) {
          try {
            // 1. Cari atau buat/update pelanggan di Supabase
            const existingPel = await pelangganService.getAll();
            let p = existingPel.find(
              (x) => x.nama.toLowerCase() === s.pelanggan.trim().toLowerCase(),
            );
            if (!p) {
              const safeSlug = s.pelanggan.toLowerCase().replace(/[^a-z0-9]/g, "_") || "customer";
              const randomEmail = `${safeSlug}_${Date.now().toString(36)}@appbenk.local`;
              p = await pelangganService.create({
                nama: s.pelanggan.trim(),
                email: randomEmail,
                ...(s.telepon ? { no_hp: s.telepon } : {}),
                alamat: "Pendaftaran langsung operasional servis",
              });
            } else if (s.telepon && p.no_hp !== s.telepon) {
              await pelangganService.update(p.id_pelanggan, { no_hp: s.telepon }).catch(() => {});
            }

            // 2. Cari atau buat/update kendaraan di Supabase
            const existingKen = await kendaraanService.getByPelanggan(p.id_pelanggan);
            let k = existingKen.find(
              (x) =>
                (s.plat && x.nopol.toLowerCase() === s.plat.trim().toLowerCase()) ||
                x.tipe.toLowerCase() === s.kendaraan.trim().toLowerCase(),
            );
            if (!k) {
              const merk = s.kendaraan.trim().split(" ")[0] || "Motor";
              k = await kendaraanService.create({
                id_pelanggan: p.id_pelanggan,
                merk,
                tipe: s.kendaraan || "Kendaraan",
                tahun: 2023,
                nopol: s.plat || "D 0000 XX",
              });
            }

            // 3. Konversi status ke format DB
            const dbStatus =
              s.status === "Menunggu"
                ? "menunggu"
                : s.status === "Diproses"
                  ? "diproses"
                  : s.status === "Selesai"
                    ? "selesai"
                    : s.status === "Menunggu Pembayaran"
                      ? "menunggu_pembayaran"
                      : "lunas";

            const selectedMekanik = mekanik.find((m) => m.nama === s.mekanik);
            const idMekanik = s.mekanikId || selectedMekanik?.id || undefined;
            const total = s.biayaJasa + biayaPart;

            // 4. Periksa apakah ini EDIT terhadap servis yang sudah ada di Supabase
            let isExisting = false;
            if (s.id) {
              const existingServis = await servisService.getById(s.id).catch(() => null);
              if (existingServis) {
                isExisting = true;
              }
            }

            if (isExisting && s.id) {
              // UPDATE SERVIS
              await servisService.update(s.id, {
                id_pelanggan: p.id_pelanggan,
                id_kendaraan: k.id_kendaraan,
                id_bengkel: s.bengkelId || "bengkel-001",
                id_mekanik: idMekanik ?? null,
                mekanik: s.mekanik,
                jenis_servis: s.jenis,
                keluhan: s.keluhan,
                pekerjaan: s.pekerjaan || s.catatan,
                biaya_jasa: s.biayaJasa,
                biaya_sparepart: biayaPart,
                total_biaya: total,
                status_servis: dbStatus as any,
                tanggal_servis: tgl,
                catatan: s.catatan || s.pekerjaan,
                estimasi_waktu: s.estimasiWaktu ?? s.estimasiDurasi ?? null,
                estimasi_selesai: s.estimasiSelesai
                  ? (() => {
                      try {
                        const d = new Date(s.estimasiSelesai);
                        return isNaN(d.getTime()) ? null : d.toISOString();
                      } catch {
                        return null;
                      }
                    })()
                  : null,
              });

              setServis((list) =>
                list.map((x) =>
                  x.id === s.id
                    ? {
                        ...x,
                        ...s,
                        pelangganId: p.id_pelanggan,
                        customerId: p.id_pelanggan,
                        estimasiSelesai: s.estimasiSelesai,
                        estimasiWaktu: s.estimasiWaktu ?? s.estimasiDurasi,
                        estimasiDurasi: s.estimasiWaktu ?? s.estimasiDurasi,
                      }
                    : x,
                ),
              );

              // Notifikasi estimasi diperbarui ke pelanggan
              if (s.estimasiSelesai || s.estimasiWaktu || s.estimasiDurasi) {
                let jamStr = s.estimasiWaktu || s.estimasiDurasi || "";
                if (s.estimasiSelesai) {
                  try {
                    const d = new Date(s.estimasiSelesai);
                    if (!isNaN(d.getTime())) {
                      jamStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":") + " WIB";
                    }
                  } catch {}
                }
                const notifEstimasiPesan = `Estimasi servis telah diperbarui. Pengerjaan diperkirakan selesai ${jamStr.includes("WIB") ? `pukul ${jamStr}` : jamStr}.`;
                
                tambahNotifikasi({
                  role: "pelanggan",
                  tipe: "servis",
                  judul: "Estimasi Servis Diperbarui",
                  pesan: notifEstimasiPesan,
                  link: "/pelanggan/status",
                  servisId: s.id,
                  pelanggan: s.pelanggan,
                  customerId: p.id_pelanggan,
                });

                notifikasiService.notifyCustomer({
                  customerId: p.id_pelanggan,
                  bengkelId: s.bengkelId || "bengkel-001",
                  judul: "Estimasi Servis Diperbarui",
                  pesan: notifEstimasiPesan,
                  tipe: "servis",
                  tautanUrl: "/pelanggan/status",
                }).catch(() => {});
              }

              // Update detail servis: hapus detail lama lalu masukkan yang baru
              try {
                await supabase().from("detail_servis").delete().eq("id_servis", s.id);
              } catch {}
              if (items.length > 0) {
                for (const it of items) {
                  await servisService
                    .addDetailServis({
                      id_servis: s.id,
                      id_sparepart: it.sparepartId,
                      jumlah: it.jumlah,
                      harga: it.harga,
                      keterangan: it.nama,
                    })
                    .catch(() => {});
                }
              }
            } else {
              // CREATE SERVIS BARU
              const createdServis = await servisService.create({
                id_servis: s.id,
                id_bengkel: s.bengkelId || "bengkel-001",
                id_mekanik: idMekanik,
                nomor_servis: finalNomor,
                id_pelanggan: p.id_pelanggan,
                id_kendaraan: k.id_kendaraan,
                mekanik: s.mekanik,
                jenis_servis: s.jenis,
                keluhan: s.keluhan,
                pekerjaan: s.pekerjaan || s.catatan,
                biaya_jasa: s.biayaJasa,
                biaya_sparepart: biayaPart,
                total_biaya: total,
                status_servis: dbStatus as any,
                tanggal_servis: tgl,
                catatan: s.catatan || s.pekerjaan,
                estimasi_waktu: s.estimasiWaktu ?? s.estimasiDurasi ?? null,
                estimasi_selesai: s.estimasiSelesai
                  ? (() => {
                      try {
                        const d = new Date(s.estimasiSelesai);
                        return isNaN(d.getTime()) ? null : d.toISOString();
                      } catch {
                        return null;
                      }
                    })()
                  : null,
              });

              if (createdServis?.id_servis) {
                setServis((list) =>
                  list.map((x) =>
                    x.nomor === finalNomor || x.id === idServis
                      ? {
                          ...x,
                          ...s,
                          id: createdServis.id_servis,
                          nomor: createdServis.nomor_servis,
                          pelangganId: createdServis.id_pelanggan || p.id_pelanggan,
                          customerId: createdServis.id_pelanggan || p.id_pelanggan,
                          estimasiSelesai: s.estimasiSelesai,
                          estimasiWaktu: s.estimasiWaktu ?? s.estimasiDurasi,
                          estimasiDurasi: s.estimasiWaktu ?? s.estimasiDurasi,
                        }
                      : x,
                  ),
                );
              }

              if (createdServis?.id_servis && items.length > 0) {
                for (const it of items) {
                  await servisService
                    .addDetailServis({
                      id_servis: createdServis.id_servis,
                      id_sparepart: it.sparepartId,
                      jumlah: it.jumlah,
                      harga: it.harga,
                      keterangan: it.nama,
                    })
                    .catch(() => {});
                }
              }
            }

            // Sinkronisasi otomatis stok & mutasi sparepart servis ke Supabase
            const targetServisId = (isExisting && s.id) ? s.id : (createdServis?.id_servis || s.id);
            if (targetServisId) {
              for (const [partId, d] of delta) {
                if (!d) continue;
                try {
                  const { data: spDb } = await supabase()
                    .from("sparepart")
                    .select("stok, stok_tersedia")
                    .eq("id_sparepart", partId)
                    .maybeSingle();

                  if (spDb) {
                    const newStok = Math.max(0, (spDb.stok ?? 0) - d);
                    const newTersedia = Math.max(0, (spDb.stok_tersedia ?? 0) - d);
                    await supabase()
                      .from("sparepart")
                      .update({
                        stok: newStok,
                        stok_tersedia: newTersedia,
                        status_stok: newStok <= 0 ? "habis" : newStok <= 5 ? "menipis" : "tersedia",
                        tanggal_update: new Date().toISOString(),
                      })
                      .eq("id_sparepart", partId);
                  }

                  const idRiw = `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                  await supabase()
                    .from("riwayat_stok")
                    .insert({
                      id_riwayat_stok: idRiw,
                      id_riwayat: idRiw,
                      id_sparepart: partId,
                      workshop_id: s.bengkelId || "bengkel-001",
                      id_bengkel: s.bengkelId || "bengkel-001",
                      tipe: d > 0 ? "keluar" : "masuk",
                      jenis: d > 0 ? "keluar" : "masuk",
                      qty: Math.abs(d),
                      jumlah: Math.abs(d),
                      tanggal: tgl,
                      keterangan:
                        d > 0
                          ? `Dipakai servis ${finalNomor} (${s.pelanggan || "Pelanggan"})`
                          : `Koreksi pemakaian servis ${finalNomor}`,
                    });
                } catch (stockErr) {
                  console.error("Gagal update stok/mutasi servis ke Supabase:", stockErr);
                }
              }

              // Sinkronkan tabel penggunaan_sparepart
              try {
                await supabase().from("penggunaan_sparepart").delete().eq("id_servis", targetServisId);
                for (const it of items) {
                  const idPeng = `pg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
                  await supabase().from("penggunaan_sparepart").insert({
                    id_penggunaan_sparepart: idPeng,
                    id_sparepart: it.sparepartId,
                    id_servis: targetServisId,
                    workshop_id: s.bengkelId || "bengkel-001",
                    id_bengkel: s.bengkelId || "bengkel-001",
                    tanggal: tgl,
                    jumlah: it.jumlah,
                    qty: it.jumlah,
                    total_harga: it.harga * it.jumlah,
                    mekanik: s.mekanik || null,
                    keterangan: `Servis ${finalNomor} (${s.pelanggan || "Pelanggan"}) · ${it.nama}`,
                  });
                }
              } catch (pengErr) {
                console.error("Gagal sinkronisasi tabel penggunaan_sparepart:", pengErr);
              }
            }
          } catch (err) {
            console.error("Gagal sinkronisasi servis ke Supabase:", err);
            throw err;
          }
        }
      },
      ubahStatusServis: (id, status) => {
        const targetServis = servis.find((x) => x.id === id);
        setServis((l) => l.map((x) => (x.id === id ? { ...x, status } : x)));
        setPenggunaan((l) =>
          l.map((x) => (x.servisId === id ? { ...x, statusServis: status } : x)),
        );

        if (targetServis && (status === "Diproses" || status === "Selesai")) {
          const statusText = status === "Diproses" ? "Diproses" : "Siap Diambil";
          const notifJudul = status === "Diproses" ? "Servis Sedang Diproses" : "Servis Selesai";
          const notifPesan = `Status kendaraan Anda sekarang: ${statusText}.`;

          tambahNotifikasi({
            role: "pelanggan",
            tipe: "servis",
            judul: notifJudul,
            pesan: notifPesan,
            link: "/pelanggan/status",
            servisId: targetServis.id,
            pelanggan: targetServis.pelanggan,
            customerId: targetServis.customerId || targetServis.pelangganId,
            userId: targetServis.userId,
          });

          notifikasiService
            .notifyCustomer({
              customerId: targetServis.customerId || targetServis.pelangganId,
              userId: targetServis.userId,
              bengkelId: targetServis.bengkelId,
              judul: notifJudul,
              pesan: notifPesan,
              tipe: "servis",
              tautanUrl: "/pelanggan/status",
            })
            .catch(() => {});
        }

        if (isSupabaseConfigured()) {
          const dbStatus =
            status === "Menunggu"
              ? "menunggu"
              : status === "Diproses"
                ? "diproses"
                : status === "Selesai"
                  ? "selesai"
                  : status === "Menunggu Pembayaran"
                    ? "menunggu_pembayaran"
                    : "lunas";
          servisService.updateStatus(id, dbStatus).catch(() => {});
        }
      },
      hapusServis: (id) => {
        const lama = servis.find((x) => x.id === id);
        setSparepart((list) => terapkanSelisih(list, lama?.items ?? [], []));
        if (lama?.items.length)
          setRiwayatStok((l) => [
            ...lama.items.map((i) => ({
              id: uid(),
              sparepartId: i.sparepartId,
              jenis: "Masuk" as const,
              jumlah: i.jumlah,
              tanggal: hariIni(),
              keterangan: `Pembatalan servis ${lama.nomor}`,
            })),
            ...l,
          ]);
        setPenggunaan((l) => l.filter((x) => x.servisId !== id));
        setServis((l) => l.filter((x) => x.id !== id));
        if (isSupabaseConfigured()) {
          servisService.delete(id).catch(() => {});
        }
      },

      simpanSparepart: async (s) => {
        const kodeBaru = s.kode?.trim() || generateNextKodeSparepart(sparepart);
        const spId = s.id || kodeBaru.toLowerCase();
        const parsedHarga = Math.max(0, Number(s.harga || 0));
        const parsedStok = Math.max(0, Math.round(Number(s.stok || 0)));
        const parsedMin = Math.max(0, Math.round(Number(s.stokMinimum ?? 5)));

        const oldPart = s.id ? sparepart.find((x) => x.id === s.id) : null;
        const diffStok = oldPart ? parsedStok - Number(oldPart.stok || 0) : 0;

        const partObj: Sparepart = {
          id: spId,
          kode: kodeBaru,
          nama: s.nama,
          kategori: s.kategori,
          satuan: s.satuan,
          harga: parsedHarga,
          stok: parsedStok,
          stokMinimum: parsedMin,
          terpakai: oldPart?.terpakai ?? s.terpakai ?? 0,
          tanggalUpdate: hariIni(),
        };

        if (isSupabaseConfigured()) {
          try {
            if (s.id) {
              await sparepartService.update(s.id, {
                kode: kodeBaru,
                nama: s.nama,
                nama_sparepart: s.nama,
                kategori: s.kategori,
                satuan: s.satuan,
                harga: parsedHarga,
                stok: parsedStok,
                stok_tersedia: parsedStok,
                stok_minimum: parsedMin,
              });

              // Jika stok berubah saat edit data sparepart, catat audit log ke riwayat_stok
              if (diffStok !== 0) {
                const idRiw = `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                await supabase()
                  .from("riwayat_stok")
                  .insert({
                    id_riwayat_stok: idRiw,
                    id_riwayat: idRiw,
                    id_sparepart: s.id,
                    tipe: diffStok > 0 ? "masuk" : "keluar",
                    jenis: "penyesuaian",
                    qty: Math.abs(diffStok),
                    jumlah: Math.abs(diffStok),
                    tanggal: hariIni(),
                    keterangan: `Penyesuaian stok saat update sparepart (${oldPart?.stok ?? 0} -> ${parsedStok})`,
                  })
                  .catch(() => {});
              }
            } else {
              await sparepartService.create({
                id_sparepart: spId,
                kode: kodeBaru,
                nama: s.nama,
                nama_sparepart: s.nama,
                kategori: s.kategori,
                satuan: s.satuan,
                harga: parsedHarga,
                stok: parsedStok,
                stok_tersedia: parsedStok,
                stok_minimum: parsedMin,
                status_stok:
                  parsedStok <= 0 ? "habis" : parsedStok <= parsedMin ? "menipis" : "tersedia",
                tanggal_update: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          } catch (err: any) {
            console.error("Gagal simpan sparepart ke Supabase:", err);
            throw err;
          }
        }

        setSparepart((list) =>
          s.id
            ? list.map((x) => (x.id === s.id ? partObj : x))
            : [partObj, ...list],
        );

        return { success: true, data: partObj };
      },

      sesuaikanStokSparepart: async (payload) => {
        const parsedStok = Math.max(0, Math.round(Number(payload.newStok)));
        if (!Number.isFinite(parsedStok)) throw new Error("Jumlah stok harus angka valid");

        const targetPart = sparepart.find((x) => x.id === payload.idSparepart);
        const oldStok = targetPart ? Number(targetPart.stok || 0) : 0;
        const diff = parsedStok - oldStok;

        if (isSupabaseConfigured()) {
          try {
            await sparepartService.adjustStok({
              idSparepart: payload.idSparepart,
              newStok: parsedStok,
              keterangan: payload.keterangan,
              tipeAksi: payload.tipeAksi,
            });
          } catch (err: any) {
            console.error("Gagal menyesuaikan stok ke Supabase:", err);
            throw err;
          }
        }

        setSparepart((list) =>
          list.map((sp) =>
            sp.id === payload.idSparepart
              ? { ...sp, stok: parsedStok, tanggalUpdate: hariIni() }
              : sp,
          ),
        );

        if (diff !== 0) {
          const jenisLog = payload.tipeAksi === "masuk" || diff > 0 ? ("Masuk" as const) : ("Keluar" as const);
          setRiwayatStok((list) => [
            {
              id: uid(),
              sparepartId: payload.idSparepart,
              jenis: jenisLog,
              jumlah: Math.abs(diff),
              tanggal: hariIni(),
              keterangan:
                payload.keterangan?.trim() ||
                `Penyesuaian stok (${oldStok} -> ${parsedStok})`,
            },
            ...list,
          ]);
        }

        return { success: true, newStok: parsedStok };
      },

      hapusSparepart: async (id) => {
        if (isSupabaseConfigured()) {
          try {
            const res = await sparepartService.delete(id);
            if (res.softDeleted) {
              // Jika foreign key constraint mencegah delete fisik, ubah stok menjadi 0 di store
              setSparepart((list) =>
                list.map((x) => (x.id === id ? { ...x, stok: 0 } : x)),
              );
              return res;
            }
            if (!res.success) {
              return res;
            }
          } catch (err: any) {
            console.error("Gagal menghapus sparepart dari Supabase:", err);
            throw err;
          }
        }

        setSparepart((l) => l.filter((x) => x.id !== id));
        return { success: true };
      },
      catatPembelian: async (p) => {
        let finalPartId = p.sparepartId.trim();
        const existing = sparepart.find(
          (sp) =>
            sp.id.toLowerCase() === finalPartId.toLowerCase() ||
            sp.kode.toLowerCase() === finalPartId.toLowerCase() ||
            sp.nama.toLowerCase() === finalPartId.toLowerCase(),
        );

        if (existing) {
          finalPartId = existing.id;
        } else if (finalPartId) {
          // Buat sparepart baru jika admin mengetik part baru secara manual
          const generatedCode = finalPartId.toUpperCase().startsWith("SP-")
            ? finalPartId.toUpperCase()
            : `SP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
          const newPart: Sparepart = {
            id: finalPartId,
            kode: generatedCode,
            nama: finalPartId,
            kategori: "Umum",
            satuan: "Pcs",
            harga: p.harga,
            stok: 0,
            stokMinimum: 5,
            terpakai: 0,
            tanggalUpdate: p.tanggal,
          };
          setSparepart((l) => [newPart, ...l]);
          if (isSupabaseConfigured()) {
            sparepartService
              .create({
                id_sparepart: finalPartId,
                nama_sparepart: finalPartId,
                kategori: "Umum",
                satuan: "Pcs",
                harga: p.harga,
                stok_tersedia: 0,
                stok_minimum: 5,
                status_stok: "tersedia",
                tanggal_update: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as any)
              .catch(() => {});
          }
        }

        const nomor = generateNextNomorPembelian(pembelian);
        const baru: PembelianSparepart = {
          ...p,
          sparepartId: finalPartId,
          id: uid(),
          nomor,
          total: p.jumlah * p.harga,
          status: "Diterima",
        };
        setPembelian((l) => [baru, ...l]);
        setRiwayatStok((l) => [
          {
            id: uid(),
            sparepartId: finalPartId,
            jenis: "Masuk",
            jumlah: p.jumlah,
            tanggal: p.tanggal,
            referensi: nomor,
            keterangan: `Pembelian ${nomor} · ${p.supplier}`,
          },
          ...l,
        ]);
        if (isSupabaseConfigured()) {
          try {
            await sparepartService.catatPembelian({
              nomor_pembelian: nomor,
              id_sparepart: finalPartId,
              supplier: p.supplier,
              tanggal: p.tanggal,
              jumlah: p.jumlah,
              harga: p.harga,
              total: p.jumlah * p.harga,
              id_bengkel: p.bengkelId || "bengkel-001",
            });
          } catch (err) {
            console.error("Gagal catat pembelian ke Supabase:", err);
          }
        }
      },

      ubahPembelian: async (id, p) => {
        const lama = pembelian.find((x) => x.id === id);
        if (!lama) return;

        const targetPartId = p.sparepartId ? p.sparepartId.trim() : lama.sparepartId;
        const newJumlah = p.jumlah ?? lama.jumlah;
        const newHarga = p.harga ?? lama.harga;
        const newSupplier = p.supplier ?? lama.supplier;
        const newTanggal = p.tanggal ?? lama.tanggal;
        const newTotal = newJumlah * newHarga;

        // Update riwayat stok
        setRiwayatStok((list) =>
          list.map((r) =>
            r.keterangan.includes(lama.nomor)
              ? {
                  ...r,
                  sparepartId: targetPartId,
                  jumlah: newJumlah,
                  tanggal: newTanggal,
                  keterangan: `Pembelian ${lama.nomor} · ${newSupplier}`,
                }
              : r,
          ),
        );

        // Update state pembelian
        setPembelian((list) =>
          list.map((x) =>
            x.id === id
              ? {
                  ...x,
                  sparepartId: targetPartId,
                  supplier: newSupplier,
                  tanggal: newTanggal,
                  jumlah: newJumlah,
                  harga: newHarga,
                  total: newTotal,
                }
              : x,
          ),
        );

        if (isSupabaseConfigured()) {
          sparepartService
            .updatePembelian(id, {
              id_sparepart: targetPartId,
              supplier: newSupplier,
              tanggal: newTanggal,
              jumlah: newJumlah,
              harga: newHarga,
              total: newTotal,
            })
            .catch((err) => console.error("Error updating pembelian in Supabase:", err));
        }
      },

      hapusPembelian: async (id) => {
        const lama = pembelian.find((x) => x.id === id);
        if (!lama) return;

        // Hapus pembelian dari state
        setPembelian((list) => list.filter((x) => x.id !== id));

        // Bersihkan riwayat stok pembelian tersebut
        setRiwayatStok((list) => list.filter((r) => !r.keterangan.includes(lama.nomor)));

        if (isSupabaseConfigured()) {
          sparepartService
            .deletePembelian(id)
            .catch((err) => console.error("Error deleting pembelian in Supabase:", err));
        }
      },

      simpanMekanik: async (m) => {
        if (m.id) {
          setMekanik((list) => list.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
          if (isSupabaseConfigured()) {
            await mekanikService.update(m.id, {
              nama_mekanik: m.nama,
              no_telepon: m.telepon || null,
              spesialisasi: m.spesialisasi || null,
              status: m.status,
            });
          }
        } else {
          const newId = `mk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const baru: Mekanik = {
            id: newId,
            bengkelId: m.bengkelId || "bengkel-001",
            nama: m.nama,
            telepon: m.telepon || "",
            spesialisasi: m.spesialisasi || "Umum",
            status: m.status || "Aktif",
            createdAt: hariIni(),
          };
          setMekanik((list) => [baru, ...list]);
          if (isSupabaseConfigured()) {
            const dbRes = await mekanikService.create({
              id_mekanik: newId,
              id_bengkel: m.bengkelId || "bengkel-001",
              nama_mekanik: m.nama,
              no_telepon: m.telepon || null,
              spesialisasi: m.spesialisasi || null,
              status: m.status || "Aktif",
            });
            if (dbRes?.id_mekanik) {
              setMekanik((list) =>
                list.map((x) => (x.id === newId ? { ...x, id: dbRes.id_mekanik } : x)),
              );
            }
          }
        }
      },

      ubahStatusMekanik: async (id, status) => {
        setMekanik((list) => list.map((x) => (x.id === id ? { ...x, status } : x)));
        if (isSupabaseConfigured()) {
          await mekanikService.update(id, { status });
        }
      },

      hapusMekanik: async (id) => {
        const target = mekanik.find((x) => x.id === id);
        if (!target) return { success: false, message: "Mekanik tidak ditemukan." };

        // Cek apakah mekanik sedang menangani servis aktif yang belum selesai
        const ongoingCount = servis.filter(
          (s) =>
            (s.status === "Diproses" || s.status === "Menunggu") &&
            (s.mekanik === target.nama || s.mekanikId === id),
        ).length;

        if (ongoingCount > 0) {
          return {
            success: false,
            message: `Mekanik ${target.nama} sedang menangani ${ongoingCount} pekerjaan servis aktif. Harap selesaikan atau alihkan servis sebelum menghapus.`,
          };
        }

        // Hapus langsung dari state lokal
        setMekanik((list) => list.filter((x) => x.id !== id));

        // Hapus langsung dari database Supabase
        if (isSupabaseConfigured()) {
          await mekanikService.delete(id);
        }

        return {
          success: true,
          message: `Mekanik ${target.nama} berhasil dihapus dari database.`,
        };
      },

      refreshMekanik: async (workshopId?: string) => {
        if (!isSupabaseConfigured()) return;
        const res = await mekanikService.getMekanik(workshopId);
        if (res) {
          const mapped = res.map((m) => ({
            id: m.id_mekanik,
            bengkelId: m.id_bengkel,
            nama: m.nama_mekanik,
            telepon: m.no_telepon ?? "",
            spesialisasi: m.spesialisasi ?? "Umum",
            status: m.status,
            createdAt: m.created_at ? m.created_at.slice(0, 10) : hariIni(),
          }));
          if (workshopId) {
            setMekanik((prev) => [
              ...mapped,
              ...prev.filter((x) => x.bengkelId && x.bengkelId !== workshopId),
            ]);
          } else {
            setMekanik(mapped);
          }
        }
      },
      refreshSupplier: async () => {
        if (!isSupabaseConfigured()) return;
        const res = await supplierService.getAll();
        if (res.length > 0) {
          setSupplier(
            res.map((s) => ({
              id: s.id_supplier,
              bengkelId: s.id_bengkel ?? "bengkel-001",
              nama: s.nama_supplier ?? s.nama ?? "Supplier",
              kontak: s.kontak ?? undefined,
              telepon: s.no_telepon ?? s.telepon ?? undefined,
              email: s.email ?? undefined,
              alamat: s.alamat ?? undefined,
              status: (s.status as "Aktif" | "Tidak Aktif") || "Aktif",
            })),
          );
        }
      },
      simpanSupplier: async (s) => {
        const idSupplier =
          s.id || `sup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const baru: Supplier = {
          ...s,
          id: idSupplier,
          bengkelId: s.bengkelId || "bengkel-001",
          status: s.status || "Aktif",
        };
        setSupplier((list) =>
          s.id ? list.map((x) => (x.id === s.id ? baru : x)) : [baru, ...list],
        );
        if (isSupabaseConfigured()) {
          try {
            await supplierService.create({
              id_supplier: idSupplier,
              ...(baru.bengkelId ? { id_bengkel: baru.bengkelId } : {}),
              nama_supplier: baru.nama,
              kontak: baru.kontak || null,
              no_telepon: baru.telepon || null,
              email: baru.email || null,
              alamat: baru.alamat || null,
              status: baru.status,
            });
          } catch (e) {
            console.error("Gagal simpan supplier ke Supabase:", e);
          }
        }
      },
      refreshPelanggan: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const res = await pelangganService.getAll();
          if (res && res.length > 0) {
            setPelanggan(
              res.map((p) => ({
                id: p.id_pelanggan,
                userId: p.user_id ?? undefined,
                nama: p.nama,
                email: p.email,
                telepon: p.no_hp ?? "",
                alamat: p.alamat ?? "",
                kendaraan: "",
                plat: "",
              })),
            );
          }
        } catch (e) {
          console.error("Gagal refresh pelanggan:", e);
        }
      },
      refreshKendaraan: async () => {
        if (!isSupabaseConfigured()) return;
        const res = await kendaraanService.getAll();
        if (res.length > 0) {
          setKendaraan(
            res.map((k) => ({
              id: k.id_kendaraan,
              pelangganId: k.id_pelanggan,
              merk: k.merk,
              tipe: k.tipe,
              tahun: k.tahun,
              plat: k.nopol,
              kilometer: k.kilometer || 0,
            })),
          );
        }
      },
      refreshBooking: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const [bkRes, pelRes, kenRes] = await Promise.all([
            bookingService.getAll(),
            pelangganService.getAll(),
            kendaraanService.getAll(),
          ]);
          if (bkRes.length > 0) {
            const mapped = bkRes.map((b) => {
              const pel = pelRes.find((p) => p.id_pelanggan === b.id_pelanggan);
              const ken = kenRes.find((k) => k.id_kendaraan === b.id_kendaraan);
              return {
                id: b.id_booking,
                nomor: b.nomor_booking,
                pelanggan: pel?.nama ?? "Pelanggan",
                customerId: b.id_pelanggan,
                vehicleId: b.id_kendaraan,
                bengkelId: b.id_bengkel ?? "bengkel-001",
                mekanikId: b.id_mekanik ?? undefined,
                kendaraan: ken ? `${ken.merk} ${ken.tipe} ${ken.tahun}` : "Kendaraan",
                plat: ken?.nopol ?? "",
                jenis: b.jenis_servis,
                keluhan: b.keluhan,
                tanggal: b.tanggal_booking,
                waktu: b.waktu_booking,
                catatan: "",
                mekanikDiinginkan: b.mekanik_diinginkan ?? undefined,
                status:
                  b.status_booking === "disetujui"
                    ? ("Diterima" as StatusBooking)
                    : b.status_booking === "ditolak"
                      ? ("Ditolak" as StatusBooking)
                      : ("Menunggu Konfirmasi" as StatusBooking),
                alasanTolak: b.alasan_penolakan ?? undefined,
              };
            });
            setBooking((currentLocal) => {
              const localOnly = currentLocal.filter(
                (loc) => !mapped.some((sb) => sb.id === loc.id || sb.nomor === loc.nomor),
              );
              return [...localOnly, ...mapped];
            });

            // Sinkronisasi otomatis notifikasi pelanggan dari data status booking
            setNotifikasi((prevNotif) => {
              let updated = [...prevNotif];
              for (const bk of mapped) {
                if (bk.status === "Diterima") {
                  const exists = updated.some(
                    (n) => n.bookingId === bk.id && n.statusBooking === "Diterima",
                  );
                  if (!exists) {
                    updated.unshift({
                      id: `notif-bk-terima-${bk.id}`,
                      role: "pelanggan",
                      tipe: "booking",
                      judul: `Booking Diterima (${bk.nomor})`,
                      pesan: "bookingan diterima silahkan datang ke bengkel",
                      link: "/pelanggan/status",
                      waktu: new Date().toISOString(),
                      dibaca: false,
                      bookingId: bk.id,
                      customerId: bk.customerId,
                      pelanggan: bk.pelanggan,
                      statusBooking: "Diterima",
                    });
                  }
                } else if (bk.status === "Ditolak") {
                  const exists = updated.some(
                    (n) => n.bookingId === bk.id && n.statusBooking === "Ditolak",
                  );
                  if (!exists) {
                    updated.unshift({
                      id: `notif-bk-tolak-${bk.id}`,
                      role: "pelanggan",
                      tipe: "booking",
                      judul: `Booking Ditolak (${bk.nomor})`,
                      pesan: bk.alasanTolak || "Tidak ada keterangan dari admin.",
                      link: "/pelanggan/booking",
                      waktu: new Date().toISOString(),
                      dibaca: false,
                      bookingId: bk.id,
                      customerId: bk.customerId,
                      pelanggan: bk.pelanggan,
                      statusBooking: "Ditolak",
                    });
                  }
                }
              }
              return updated;
            });
          }
        } catch (err) {
          console.error("Gagal refresh booking:", err);
        }
      },
      refreshRetur: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const [retRes, spRes, beliRes] = await Promise.all([
            sparepartService.getRetur(),
            sparepartService.getAll(),
            sparepartService.getPembelian(),
          ]);
          if (retRes.length > 0) {
            const spList = spRes ?? [];
            const beliList = beliRes ?? [];
            const mapped: ReturSparepart[] = retRes.map((r) => {
              const stRaw = String(r.status || "").toLowerCase();
              let normalizedStatus: StatusRetur = "Diajukan";
              if (stRaw === "selesai") normalizedStatus = "Selesai";
              else if (stRaw === "barang dikirim" || stRaw === "barang_dikirim")
                normalizedStatus = "Barang Dikirim";
              else if (stRaw === "disetujui") normalizedStatus = "Disetujui";
              else if (stRaw === "ditolak") normalizedStatus = "Ditolak";
              else if (stRaw === "diproses") normalizedStatus = "Diproses";
              else normalizedStatus = "Diajukan";

              const sp = spList.find((x) => x.id_sparepart === r.id_sparepart);
              const pemb = beliList.find(
                (b) =>
                  b.id_pembelian_sparepart === r.id_pembelian_sparepart ||
                  b.nomor_pembelian === r.nomor_pembelian,
              );

              return {
                id: r.id_retur_sparepart,
                nomorRetur: r.nomor_retur || `RET-2026-${r.id_retur_sparepart.slice(-3)}`,
                bengkelId: r.id_bengkel || "bengkel-001",
                supplierId: r.id_supplier || (pemb as any)?.id_supplier || "sup-001",
                supplier: r.supplier || pemb?.supplier || "Supplier",
                pembelianId: r.id_pembelian_sparepart || pemb?.id_pembelian_sparepart || "",
                nomorPembelian: r.nomor_pembelian || pemb?.nomor_pembelian || "—",
                sparepartId: r.id_sparepart,
                namaSparepart: r.nama_sparepart || sp?.nama_sparepart || "Sparepart",
                jumlah: Number(r.jumlah || 1),
                hargaSatuan: Number(r.harga_satuan || pemb?.harga || sp?.harga || 0),
                totalNilai: Number(
                  r.total_nilai ||
                    (r.jumlah || 1) * Number(r.harga_satuan || pemb?.harga || sp?.harga || 0),
                ),
                tanggal: r.tanggal ? r.tanggal.slice(0, 10) : hariIni(),
                alasan: r.alasan || "Cacat / Rusak Pabrik",
                alasanDetail: r.alasan_detail ?? undefined,
                alasanPenolakan: r.alasan_penolakan ?? undefined,
                keterangan: r.keterangan ?? undefined,
                status: normalizedStatus,
                stokDikurangi: Boolean(r.stok_dikurangi),
                riwayatStokId: r.riwayat_stok_id ?? undefined,
                createdAt: r.created_at,
              };
            });

            setReturSparepart((currentLocal) => {
              const localOnly = currentLocal.filter(
                (loc) =>
                  !mapped.some(
                    (sb) =>
                      sb.id === loc.id ||
                      (sb.nomorRetur && loc.nomorRetur && sb.nomorRetur === loc.nomorRetur),
                  ),
              );
              return [...localOnly, ...mapped];
            });

            // Sinkronisasi retur yang disetujui ke Riwayat Stok (Tab 2)
            setRiwayatStok((currentRiw) => {
              const additions: RiwayatStok[] = [];
              for (const r of mapped) {
                if (
                  (r.stokDikurangi ||
                    r.status === "Disetujui" ||
                    r.status === "Selesai" ||
                    r.status === "Barang Dikirim") &&
                  !currentRiw.some((rw) => rw.keterangan?.includes(r.nomorRetur))
                ) {
                  additions.push({
                    id: r.riwayatStokId || `rw-${r.id}`,
                    sparepartId: r.sparepartId,
                    jenis: "Keluar",
                    jumlah: r.jumlah,
                    tanggal: r.tanggal,
                    keterangan: `Retur ${r.nomorRetur} (${r.supplier}) · ${r.alasan}`,
                  });
                }
              }
              if (additions.length === 0) return currentRiw;
              return [...additions, ...currentRiw];
            });
          }
        } catch (err) {
          console.error("Gagal refresh retur:", err);
        }
      },
      refreshServis: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const [srvRes, pelRes, kenRes, detRes, spRes, bkRes] = await Promise.all([
            servisService.getAll(),
            pelangganService.getAll(),
            kendaraanService.getAll(),
            supabase().from("detail_servis").select("*"),
            sparepartService.getAll(),
            bookingService.getAll(),
          ]);

          const detList: any[] = detRes && (detRes as any).data ? (detRes as any).data : [];
          const spList: any[] = spRes ?? [];
          const bkList: any[] = bkRes ?? [];

          const mappedServis: Servis[] = (srvRes ?? []).map((s: any) => {
            const pel = pelRes.find((p: any) => p.id_pelanggan === s.id_pelanggan);
            const ken = kenRes.find((k: any) => k.id_kendaraan === s.id_kendaraan);
            const bk = bkList.find((b: any) => b.id_booking === s.id_booking);
            const pelFromBk = bk ? pelRes.find((p: any) => p.id_pelanggan === bk.id_pelanggan) : undefined;
            const namaPelanggan =
              pel?.nama ||
              pelFromBk?.nama ||
              s.pelanggan ||
              "Pelanggan";
            const targetPelangganId = s.id_pelanggan || pel?.id_pelanggan || pelFromBk?.id_pelanggan || bk?.id_pelanggan || undefined;
            const targetUserId = pel?.user_id || pelFromBk?.user_id || undefined;
            const kenDesc = ken
              ? `${ken.merk} ${ken.tipe} ${ken.tahun}`.trim()
              : (bk ? `${bk.jenis_servis || "Kendaraan"}` : "Kendaraan");
            const plat = ken?.nopol || ken?.plat || "";

            const rawStatus = (s.status_servis || "").toLowerCase();
            const st: StatusServis =
              rawStatus === "diproses" || rawStatus === "dikerjakan" || rawStatus === "menunggu_sparepart" || rawStatus === "proses"
                ? "Diproses"
                : rawStatus === "selesai"
                  ? "Selesai"
                  : rawStatus === "menunggu_pembayaran"
                    ? "Menunggu Pembayaran"
                    : rawStatus === "lunas" || rawStatus === "selesai dibayar"
                      ? "Selesai Dibayar"
                      : rawStatus === "booking"
                        ? "Booking"
                        : "Menunggu";

            const srvDetails = detList.filter((d: any) => d.id_servis === s.id_servis);
            const items: ItemPart[] = srvDetails.map((d: any) => {
              const sp = spList.find((x: any) => x.id_sparepart === d.id_sparepart);
              return {
                sparepartId: d.id_sparepart || d.id_detail || d.id_detail_servis,
                kode: sp?.id_sparepart || d.id_sparepart || "-",
                nama: sp?.nama_sparepart || d.keterangan || "Sparepart",
                harga: Number(d.harga || d.harga_satuan || sp?.harga || 0),
                jumlah: Number(d.jumlah || d.qty || 1),
              };
            });
            const ringkas = items.map((i) => `${i.nama} (${i.jumlah}x)`).join(", ");
            const totalPartCalc = items.reduce((sum, i) => sum + i.harga * i.jumlah, 0);

            return {
              id: s.id_servis,
              nomor: s.nomor_servis,
              bookingId: s.id_booking ?? undefined,
              pelanggan: namaPelanggan,
              pelangganId: targetPelangganId,
              customerId: targetPelangganId,
              userId: targetUserId,
              kendaraan: kenDesc,
              plat: plat,
              bengkelId: s.id_bengkel ?? "bengkel-001",
              mekanikId: s.id_mekanik ?? undefined,
              jenis: s.jenis_servis ?? "Servis Umum",
              keluhan: s.keluhan ?? "",
              pekerjaan: s.pekerjaan || s.catatan || s.jenis_servis || "",
              mekanik: s.mekanik ?? "Andi",
              tanggal: s.tanggal_servis || (s.created_at ? s.created_at.slice(0, 10) : hariIni()),
              status: st,
              sparepart: ringkas,
              items: items,
              catatan: s.catatan ?? "",
              biayaJasa: Number(s.biaya_jasa || 0),
              biayaPart: Number(s.biaya_sparepart || totalPartCalc || 0),
              total: Number(s.total_biaya || 0),
              noTransaksi: `TRX-${s.nomor_servis.replace("SRV-", "")}`,
              estimasiBiaya: s.estimasi_biaya ? Number(s.estimasi_biaya) : undefined,
              estimasiWaktu: s.estimasi_waktu ?? s.estimasi_durasi ?? undefined,
              estimasiDurasi: s.estimasi_waktu ?? s.estimasi_durasi ?? undefined,
              estimasiSelesai: s.estimasi_selesai ?? undefined,
              tanggalMulai: s.tanggal_mulai ?? undefined,
              tanggalSelesai: s.tanggal_selesai ?? undefined,
            };
          });

          // Auto-healing: Jika ada booking berstatus 'disetujui' di Supabase yang belum memiliki data servis
          const approvedBk = bkList.filter((b: any) => b.status_booking === "disetujui");
          for (const ab of approvedBk) {
            const alreadyInServis = mappedServis.some((ms) => ms.bookingId === ab.id_booking);
            if (!alreadyInServis) {
              try {
                const nextNomor = generateNextNomorServis(mappedServis);
                const srvId = `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
                const pel = pelRes.find((p: any) => p.id_pelanggan === ab.id_pelanggan);
                const ken = kenRes.find((k: any) => k.id_kendaraan === ab.id_kendaraan);
                const namaPel = pel?.nama || "Pelanggan";
                const descKen = ken ? `${ken.merk} ${ken.tipe} ${ken.tahun}`.trim() : "Kendaraan";
                const nopol = ken?.nopol || "";

                const created = await servisService.create({
                  id_servis: srvId,
                  nomor_servis: nextNomor,
                  id_booking: ab.id_booking,
                  id_bengkel: ab.id_bengkel || "bengkel-001",
                  id_pelanggan: ab.id_pelanggan,
                  id_kendaraan: ab.id_kendaraan,
                  id_mekanik: ab.id_mekanik ?? undefined,
                  mekanik: ab.mekanik_diinginkan || "Andi",
                  jenis_servis: ab.jenis_servis,
                  keluhan: ab.keluhan,
                  pekerjaan: ab.jenis_servis,
                  status_servis: "menunggu",
                  tanggal_mulai: ab.tanggal_booking || hariIni(),
                  estimasi_waktu: "1 - 2 Jam",
                  catatan: `[Booking ${ab.nomor_booking}] ${ab.keluhan}`,
                  biaya_jasa: 0,
                  biaya_sparepart: 0,
                  total_biaya: 0,
                });

                if (created) {
                  mappedServis.unshift({
                    id: created.id_servis,
                    nomor: created.nomor_servis,
                    bookingId: ab.id_booking,
                    pelanggan: namaPel,
                    pelangganId: ab.id_pelanggan,
                    customerId: ab.id_pelanggan,
                    userId: pel?.user_id,
                    kendaraan: descKen,
                    plat: nopol,
                    bengkelId: created.id_bengkel || "bengkel-001",
                    mekanikId: created.id_mekanik ?? undefined,
                    jenis: created.jenis_servis || ab.jenis_servis,
                    keluhan: created.keluhan || ab.keluhan,
                    pekerjaan: created.pekerjaan || ab.jenis_servis,
                    mekanik: created.mekanik || "Andi",
                    tanggal: created.tanggal_servis || ab.tanggal_booking || hariIni(),
                    status: "Menunggu",
                    sparepart: "",
                    items: [],
                    catatan: created.catatan || "",
                    biayaJasa: 0,
                    biayaPart: 0,
                    total: 0,
                    noTransaksi: `TRX-${created.nomor_servis.replace("SRV-", "")}`,
                  });
                }
              } catch (healErr) {
                console.warn("Auto-heal booking to servis failed:", healErr);
              }
            }
          }

          if (mappedServis.length > 0) {
            setServis((currentLocal) => {
              const localOnly = currentLocal.filter(
                (loc) =>
                  !mappedServis.some(
                    (sb) =>
                      sb.id === loc.id ||
                      sb.nomor === loc.nomor ||
                      (loc.bookingId && sb.bookingId === loc.bookingId),
                  ),
              );
              return [...localOnly, ...mappedServis];
            });

            // Sinkronkan data penggunaan sparepart dari servis
            const usageFromServis: PenggunaanSparepart[] = [];
            for (const s of mappedServis) {
              if (s.items && s.items.length > 0) {
                for (const it of s.items) {
                  usageFromServis.push({
                    id: `det-${s.id}-${it.sparepartId}`,
                    sparepartId: it.sparepartId,
                    servisId: s.id,
                    servisNomor: s.nomor,
                    tanggal: s.tanggal,
                    jumlah: it.jumlah,
                    mekanik: s.mekanik,
                    pelanggan: s.pelanggan,
                    statusServis: s.status,
                    keterangan: s.pekerjaan || s.catatan || `Servis ${s.nomor}`,
                  });
                }
              }
            }
            if (usageFromServis.length > 0) {
              setPenggunaan((current) => {
                const remainder = current.filter(
                  (c) =>
                    !usageFromServis.some(
                      (u) => u.servisNomor === c.servisNomor && u.sparepartId === c.sparepartId,
                    ),
                );
                return [...usageFromServis, ...remainder];
              });
            }
          }
        } catch (err) {
          console.error("Gagal refresh servis:", err);
        }
      },
      refreshSparepart: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const spRes = await sparepartService.getAll();
          if (spRes && spRes.length > 0) {
            setSparepart(
              spRes.map((sp) => {
                let kat = sp.kategori;
                if (kat === "Oli") kat = "Pelumas";
                if (kat === "Rem") kat = "Pengereman";
                return {
                  id: sp.id_sparepart,
                  kode: (sp as any).kode || sp.id_sparepart,
                  nama: sp.nama_sparepart || (sp as any).nama || sp.id_sparepart,
                  kategori: kat || "Umum",
                  satuan: sp.satuan || "Pcs",
                  harga: Number(sp.harga || 0),
                  stok: Number(sp.stok_tersedia ?? (sp as any).stok ?? 0),
                  stokMinimum: Number(sp.stok_minimum ?? 5),
                  terpakai: 0,
                  tanggalUpdate: sp.tanggal_update ? sp.tanggal_update.slice(0, 10) : hariIni(),
                };
              }),
            );
          }
        } catch (err) {
          console.error("Gagal refresh sparepart:", err);
        }
      },
      refreshPembelian: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const beliRes = await sparepartService.getPembelian();
          if (beliRes && beliRes.length > 0) {
            const mappedBeli: PembelianSparepart[] = beliRes.map((b) => ({
              id: b.id_pembelian_sparepart || (b as any).id_pembelian || uid(),
              nomor: b.nomor_pembelian,
              sparepartId: b.id_sparepart,
              supplierId: b.id_supplier ?? undefined,
              supplier: b.supplier,
              tanggal: b.tanggal,
              jumlah: b.jumlah,
              harga: Number(b.harga || 0),
              total: Number(b.total || 0),
              status: "Diterima",
            }));
            setPembelian(mappedBeli);
          }
        } catch (err) {
          console.error("Gagal refresh pembelian:", err);
        }
      },
      refreshRiwayatStok: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const riwRes = await sparepartService.getRiwayatStok();
          if (riwRes && riwRes.length > 0) {
            const mappedRiw: RiwayatStok[] = riwRes.map((r) => {
              const ket = r.keterangan || "";
              const matchRef = ket.match(/\b(BL-\d{4}-\d+|PB-\d{4}-\d+|SRV-\d{4}-\d+|RET-\d{4}-\d+|TRX-\d{4}-\d+|[A-Z]{2,4}-\d+)\b/i);
              return {
                id: r.id_riwayat_stok || (r as any).id_riwayat || uid(),
                sparepartId: r.id_sparepart,
                jenis: r.jenis === "keluar" || (r as any).tipe === "keluar" ? "Keluar" : "Masuk",
                jumlah: r.jumlah || (r as any).qty || 1,
                tanggal: r.tanggal ? r.tanggal.slice(0, 10) : hariIni(),
                referensi: matchRef ? matchRef[1].toUpperCase() : undefined,
                keterangan: ket,
              };
            });
            setRiwayatStok(mappedRiw);
          }
        } catch (err) {
          console.error("Gagal refresh riwayat stok:", err);
        }
      },
      refreshPenggunaan: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const [pakaiRes, srvRes, detRes, pelRes] = await Promise.all([
            sparepartService.getPenggunaan(),
            servisService.getAll(),
            supabase().from("detail_servis").select("*"),
            pelangganService.getAll(),
          ]);

          const srvList = srvRes ?? [];
          const detList: any[] = detRes && (detRes as any).data ? (detRes as any).data : [];
          const pelList = pelRes ?? [];

          const usageList: PenggunaanSparepart[] = [];
          for (const s of srvList) {
            const rawStatus = (s.status_servis || "").toLowerCase();
            const st: StatusServis =
              rawStatus === "diproses" || rawStatus === "dikerjakan" || rawStatus === "menunggu_sparepart" || rawStatus === "proses"
                ? "Diproses"
                : rawStatus === "selesai"
                  ? "Selesai"
                  : rawStatus === "menunggu_pembayaran"
                    ? "Menunggu Pembayaran"
                    : rawStatus === "lunas" || rawStatus === "selesai dibayar"
                      ? "Selesai Dibayar"
                      : "Menunggu";
            const pel = pelList.find((p: any) => p.id_pelanggan === s.id_pelanggan);
            const namaPel = pel?.nama || (s as any).pelanggan || "Pelanggan";

            const srvItems = detList.filter((d: any) => d.id_servis === s.id_servis);
            for (const d of srvItems) {
              usageList.push({
                id: `det-${d.id_detail || d.id_detail_servis || s.id_servis + '-' + d.id_sparepart}`,
                sparepartId: d.id_sparepart,
                servisId: s.id_servis,
                servisNomor: s.nomor_servis,
                tanggal: s.tanggal_servis || (s.created_at ? s.created_at.slice(0, 10) : hariIni()),
                jumlah: Number(d.jumlah || d.qty || 1),
                mekanik: s.mekanik || "Mekanik",
                pelanggan: namaPel,
                statusServis: st,
                keterangan: d.keterangan || s.pekerjaan || `Servis ${s.nomor_servis}`,
              });
            }
          }

          if (pakaiRes && pakaiRes.length > 0) {
            for (const p of pakaiRes) {
              const s = srvList.find((x: any) => x.id_servis === p.id_servis);
              const pel = s ? pelList.find((pl: any) => pl.id_pelanggan === s.id_pelanggan) : undefined;
              const alreadyInList = usageList.some((u) => u.servisId === p.id_servis && u.sparepartId === p.id_sparepart);
              if (!alreadyInList) {
                usageList.push({
                  id: p.id_penggunaan_sparepart || uid(),
                  sparepartId: p.id_sparepart,
                  servisId: p.id_servis,
                  servisNomor: s?.nomor_servis || p.id_servis,
                  tanggal: p.tanggal,
                  jumlah: p.jumlah || (p as any).qty || 1,
                  mekanik: p.mekanik || s?.mekanik || "Mekanik",
                  pelanggan: pel?.nama || (s as any)?.pelanggan || "Pelanggan",
                  statusServis: s?.status_servis ? (s.status_servis.toLowerCase().includes("selesai") ? "Selesai" : "Diproses") : "Diproses",
                  keterangan: p.keterangan || `Servis ${s?.nomor_servis || p.id_servis}`,
                });
              }
            }
          }
          if (usageList.length > 0) setPenggunaan(usageList);
        } catch (err) {
          console.error("Gagal refresh penggunaan:", err);
        }
      },
      refreshStok: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const [spRes, beliRes, riwRes, pakaiRes, returRes, srvRes, detRes, pelRes] = await Promise.all([
            sparepartService.getAll(),
            sparepartService.getPembelian(),
            sparepartService.getRiwayatStok(),
            sparepartService.getPenggunaan(),
            sparepartService.getRetur(),
            servisService.getAll(),
            supabase().from("detail_servis").select("*"),
            pelangganService.getAll(),
          ]);

          if (spRes && spRes.length > 0) {
            setSparepart(
              spRes.map((sp) => {
                let kat = sp.kategori;
                if (kat === "Oli") kat = "Pelumas";
                if (kat === "Rem") kat = "Pengereman";
                return {
                  id: sp.id_sparepart,
                  kode: sp.id_sparepart,
                  nama: sp.nama_sparepart,
                  kategori: kat,
                  satuan: sp.satuan,
                  harga: Number(sp.harga),
                  stok: sp.stok_tersedia ?? sp.stok ?? 0,
                  stokMinimum: sp.stok_minimum,
                  terpakai: 0,
                  tanggalUpdate: sp.tanggal_update ? sp.tanggal_update.slice(0, 10) : hariIni(),
                };
              }),
            );
          }

          if (beliRes && beliRes.length > 0) {
            setPembelian(
              beliRes.map((b) => ({
                id: b.id_pembelian_sparepart || (b as any).id_pembelian || uid(),
                nomor: b.nomor_pembelian,
                sparepartId: b.id_sparepart,
                supplierId: b.id_supplier ?? undefined,
                supplier: b.supplier,
                tanggal: b.tanggal,
                jumlah: b.jumlah,
                harga: Number(b.harga || 0),
                total: Number(b.total || 0),
                status: "Diterima",
              })),
            );
          }

          if (riwRes && riwRes.length > 0) {
            setRiwayatStok(
              riwRes.map((r) => {
                const ket = r.keterangan || "";
                const matchRef = ket.match(/\b(BL-\d{4}-\d+|PB-\d{4}-\d+|SRV-\d{4}-\d+|RET-\d{4}-\d+|TRX-\d{4}-\d+|[A-Z]{2,4}-\d+)\b/i);
                return {
                  id: r.id_riwayat_stok || (r as any).id_riwayat || uid(),
                  sparepartId: r.id_sparepart,
                  jenis: r.jenis === "keluar" || (r as any).tipe === "keluar" ? "Keluar" : "Masuk",
                  jumlah: r.jumlah || (r as any).qty || 1,
                  tanggal: r.tanggal ? r.tanggal.slice(0, 10) : hariIni(),
                  referensi: matchRef ? matchRef[1].toUpperCase() : undefined,
                  keterangan: ket,
                };
              }),
            );
          }

          const srvList = srvRes ?? [];
          const detList: any[] = detRes && (detRes as any).data ? (detRes as any).data : [];
          const pelList = pelRes ?? [];

          const usageList: PenggunaanSparepart[] = [];
          for (const s of srvList) {
            const rawStatus = (s.status_servis || "").toLowerCase();
            const st: StatusServis =
              rawStatus === "diproses" || rawStatus === "dikerjakan" || rawStatus === "menunggu_sparepart" || rawStatus === "proses"
                ? "Diproses"
                : rawStatus === "selesai"
                  ? "Selesai"
                  : rawStatus === "menunggu_pembayaran"
                    ? "Menunggu Pembayaran"
                    : rawStatus === "lunas" || rawStatus === "selesai dibayar"
                      ? "Selesai Dibayar"
                      : "Menunggu";
            const pel = pelList.find((p: any) => p.id_pelanggan === s.id_pelanggan);
            const namaPel = pel?.nama || (s as any).pelanggan || "Pelanggan";

            const srvItems = detList.filter((d: any) => d.id_servis === s.id_servis);
            for (const d of srvItems) {
              usageList.push({
                id: `det-${d.id_detail || d.id_detail_servis || s.id_servis + '-' + d.id_sparepart}`,
                sparepartId: d.id_sparepart,
                servisId: s.id_servis,
                servisNomor: s.nomor_servis,
                tanggal: s.tanggal_servis || (s.created_at ? s.created_at.slice(0, 10) : hariIni()),
                jumlah: Number(d.jumlah || d.qty || 1),
                mekanik: s.mekanik || "Mekanik",
                pelanggan: namaPel,
                statusServis: st,
                keterangan: d.keterangan || s.pekerjaan || `Servis ${s.nomor_servis}`,
              });
            }
          }

          if (pakaiRes && pakaiRes.length > 0) {
            for (const p of pakaiRes) {
              const s = srvList.find((x: any) => x.id_servis === p.id_servis);
              const pel = s ? pelList.find((pl: any) => pl.id_pelanggan === s.id_pelanggan) : undefined;
              const alreadyInList = usageList.some((u) => u.servisId === p.id_servis && u.sparepartId === p.id_sparepart);
              if (!alreadyInList) {
                usageList.push({
                  id: p.id_penggunaan_sparepart || uid(),
                  sparepartId: p.id_sparepart,
                  servisId: p.id_servis,
                  servisNomor: s?.nomor_servis || p.id_servis,
                  tanggal: p.tanggal,
                  jumlah: p.jumlah || (p as any).qty || 1,
                  mekanik: p.mekanik || s?.mekanik || "Mekanik",
                  pelanggan: pel?.nama || (s as any)?.pelanggan || "Pelanggan",
                  statusServis: s?.status_servis ? (s.status_servis.toLowerCase().includes("selesai") ? "Selesai" : "Diproses") : "Diproses",
                  keterangan: p.keterangan || `Servis ${s?.nomor_servis || p.id_servis}`,
                });
              }
            }
          }
          if (usageList.length > 0) setPenggunaan(usageList);

        } catch (err) {
          console.error("Gagal refresh stok:", err);
        }
      },
      buatBooking: (b) => {
        const idBooking = `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const seq = 1 + booking.length;
        const nomor = `BK-2026-${String(seq).padStart(4, "0")}`;
        const baru: Booking = {
          ...b,
          id: idBooking,
          nomor,
          status: "Menunggu Konfirmasi",
        };
        setBooking((l) => [baru, ...l]);

        // Notifikasi ke Admin & Owner: "Booking baru masuk dari [Nama Pelanggan] untuk [Kendaraan]."
        const notifBookingJudul = "Booking Baru Masuk";
        const notifBookingPesan = `Booking baru masuk dari ${b.pelanggan} untuk ${b.kendaraan}.`;

        tambahNotifikasi({
          role: "admin",
          tipe: "booking",
          judul: notifBookingJudul,
          pesan: notifBookingPesan,
          link: "/admin/booking",
          bookingId: idBooking,
          pelanggan: b.pelanggan,
        });

        notifikasiService
          .notifyWorkshopStaff({
            bengkelId: b.bengkelId || "bengkel-001",
            judul: notifBookingJudul,
            pesan: notifBookingPesan,
            tipe: "booking",
            tautanUrl: "/admin/booking",
          })
          .catch(() => {});

        if (isSupabaseConfigured() && b.customerId && b.vehicleId) {
          bookingService
            .create({
              id_booking: idBooking,
              id_bengkel: b.bengkelId || "bengkel-001",
              nomor_booking: baru.nomor,
              id_pelanggan: b.customerId,
              id_kendaraan: b.vehicleId,
              tanggal_booking: b.tanggal,
              waktu_booking: b.waktu,
              jenis_servis: b.jenis,
              keluhan: b.keluhan,
              mekanik_diinginkan: b.mekanikDiinginkan,
              id_mekanik: b.mekanikId ?? null,
            })
            .then((created) => {
              if (created?.id_booking && created.id_booking !== idBooking) {
                setBooking((l) =>
                  l.map((x) => (x.id === idBooking ? { ...x, id: created.id_booking } : x)),
                );
              }
            })
            .catch((err) => {
              console.error("Gagal simpan booking ke Supabase:", err);
            });
        }
        return baru;
      },
      ubahStatusBooking: (id, status, alasan) => {
        const targetBooking = booking.find((x) => x.id === id);

        setBooking((l) =>
          l.map((x) => {
            if (x.id !== id) return x;
            const { alasanTolak, ...rest } = x;
            return status === "Ditolak"
              ? { ...rest, status, alasanTolak: alasan ?? alasanTolak ?? "" }
              : { ...rest, status };
          }),
        );

        // Notifikasi untuk role pelanggan ketika bookingan diterima / ditolak oleh admin
        if (targetBooking) {
          if (status === "Diterima") {
            const pesanDisetujui = "Booking Anda telah Disetujui oleh bengkel.";
            tambahNotifikasi({
              role: "pelanggan",
              tipe: "booking",
              judul: `Booking Disetujui (${targetBooking.nomor})`,
              pesan: pesanDisetujui,
              link: "/pelanggan/status",
              bookingId: targetBooking.id,
              customerId: targetBooking.customerId,
              pelanggan: targetBooking.pelanggan,
              statusBooking: "Diterima",
            });

            notifikasiService
              .notifyCustomer({
                customerId: targetBooking.customerId,
                bengkelId: targetBooking.bengkelId,
                judul: "Booking Disetujui",
                pesan: pesanDisetujui,
                tipe: "booking",
                tautanUrl: "/pelanggan/status",
              })
              .catch(() => {});
          } else if (status === "Ditolak") {
            const keteranganPenolakan = (alasan || targetBooking.alasanTolak || "").trim();
            const pesanDitolak = `Booking Anda telah Ditolak oleh bengkel.${keteranganPenolakan ? ` Alasan: ${keteranganPenolakan}` : ""}`;
            tambahNotifikasi({
              role: "pelanggan",
              tipe: "booking",
              judul: `Booking Ditolak (${targetBooking.nomor})`,
              pesan: pesanDitolak,
              link: "/pelanggan/booking",
              bookingId: targetBooking.id,
              customerId: targetBooking.customerId,
              pelanggan: targetBooking.pelanggan,
              statusBooking: "Ditolak",
            });

            notifikasiService
              .notifyCustomer({
                customerId: targetBooking.customerId,
                bengkelId: targetBooking.bengkelId,
                judul: "Booking Ditolak",
                pesan: pesanDitolak,
                tipe: "booking",
                tautanUrl: "/pelanggan/booking",
              })
              .catch(() => {});
          }
        }

        if (status === "Diterima" && targetBooking) {
          // Cek apakah sudah ada servis untuk booking ini (cegah duplikasi)
          const sudahAda = servis.some((s) => s.bookingId === id);

            if (!sudahAda) {
              const nomorServis = generateNextNomorServis(servis);
              const srvId = `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
              const bengkelId = targetBooking.bengkelId || "bengkel-001";

              // Tentukan mekanik: penugasan resmi -> preferensi pelanggan -> mekanik aktif bengkel -> "Andi"
              let namaMekanik = targetBooking.mekanikDitugaskan || targetBooking.mekanikDiinginkan;
              let targetMekanikId = targetBooking.mekanikId;

              if (!namaMekanik) {
                const mkAktif = mekanik.find(
                  (m) => (!m.bengkelId || m.bengkelId === bengkelId) && m.status === "Aktif",
                );
                if (mkAktif) {
                  namaMekanik = mkAktif.nama;
                  targetMekanikId = mkAktif.id;
                } else {
                  namaMekanik = "Andi";
                }
              } else if (!targetMekanikId) {
                const mkFound = mekanik.find(
                  (m) => m.nama.toLowerCase() === namaMekanik!.toLowerCase(),
                );
                if (mkFound) targetMekanikId = mkFound.id;
              }

              const servisBaru: Servis = {
                id: srvId,
                nomor: nomorServis,
                bookingId: targetBooking.id,
                pelanggan: targetBooking.pelanggan,
                pelangganId: targetBooking.customerId,
                customerId: targetBooking.customerId,
                bengkelId: bengkelId,
                mekanikId: targetMekanikId,
                kendaraan: targetBooking.kendaraan,
                plat: targetBooking.plat,
                jenis: targetBooking.jenis,
                keluhan: targetBooking.keluhan,
                pekerjaan: targetBooking.jenis,
                mekanik: namaMekanik,
                tanggal: targetBooking.tanggal || hariIni(),
                status: "Menunggu",
                sparepart: "",
                items: [],
                catatan: targetBooking.catatan
                  ? `[Booking ${targetBooking.nomor}] ${targetBooking.catatan}`
                  : `[Booking ${targetBooking.nomor}] ${targetBooking.keluhan}`,
                biayaJasa: 0,
                biayaPart: 0,
                total: 0,
                noTransaksi: `TRX-${nomorServis.replace("SRV-", "")}`,
                estimasiWaktu: "1 - 2 Jam",
                estimasiSelesai: targetBooking.estimasiSelesai,
              };

              // Masukkan langsung ke operasional servis di state lokal & localStorage
              setServis((prev) =>
                prev.some((s) => s.bookingId === id) ? prev : [servisBaru, ...prev],
              );
              try {
                const currentSaved = JSON.parse(
                  window.localStorage.getItem("appbenk.data.servis") || "[]",
                );
                if (
                  !currentSaved.some((s: any) => s.id === srvId || s.bookingId === targetBooking.id)
                ) {
                  window.localStorage.setItem(
                    "appbenk.data.servis",
                    JSON.stringify([servisBaru, ...currentSaved]),
                  );
                }
              } catch {}

              if (isSupabaseConfigured()) {
                (async () => {
                  try {
                    let idPel = targetBooking.customerId;
                    if (!idPel) {
                      const existingPel = await pelangganService.getAll();
                      let p = existingPel.find(
                        (x) =>
                          x.nama.toLowerCase() === targetBooking.pelanggan.trim().toLowerCase(),
                      );
                      if (!p) {
                        const safeSlug =
                          targetBooking.pelanggan.toLowerCase().replace(/[^a-z0-9]/g, "_") ||
                          "customer";
                        const randomEmail = `${safeSlug}_${Date.now().toString(36)}@appbenk.local`;
                        p = await pelangganService.create({
                          nama: targetBooking.pelanggan.trim(),
                          email: randomEmail,
                          alamat: "Booking online",
                        });
                      }
                      idPel = p.id_pelanggan;
                    }

                    let idKen = targetBooking.vehicleId;
                    if (!idKen) {
                      const existingKen = await kendaraanService.getByPelanggan(idPel);
                      let k = existingKen.find(
                        (x) =>
                          (targetBooking.plat &&
                            x.nopol.toLowerCase() === targetBooking.plat.trim().toLowerCase()) ||
                          x.tipe.toLowerCase() === targetBooking.kendaraan.trim().toLowerCase(),
                      );
                      if (!k) {
                        const merk = targetBooking.kendaraan.trim().split(" ")[0] || "Motor";
                        k = await kendaraanService.create({
                          id_pelanggan: idPel,
                          merk,
                          tipe: targetBooking.kendaraan || "Kendaraan",
                          tahun: 2023,
                          nopol: targetBooking.plat || "D 0000 XX",
                        });
                      }
                      idKen = k.id_kendaraan;
                    }

                    const dbRes = await servisService.create({
                      id_servis: srvId,
                      nomor_servis: nomorServis,
                      id_booking: targetBooking.id,
                      id_bengkel: bengkelId,
                      id_pelanggan: idPel,
                      id_kendaraan: idKen,
                      id_mekanik: targetMekanikId || undefined,
                      mekanik: namaMekanik,
                      jenis_servis: targetBooking.jenis,
                      keluhan: targetBooking.keluhan,
                      catatan: servisBaru.catatan,
                      status_servis: "menunggu",
                      biaya_jasa: 0,
                      biaya_sparepart: 0,
                      total_biaya: 0,
                      tanggal_mulai: targetBooking.tanggal || hariIni(),
                      estimasi_waktu: "1 - 2 Jam",
                      estimasi_selesai: targetBooking.estimasiSelesai ?? null,
                    });

                    if (dbRes) {
                      setServis((list) =>
                        list.map((x) =>
                          x.id === srvId
                            ? {
                                ...x,
                                id: dbRes.id_servis,
                                nomor: dbRes.nomor_servis,
                                pelangganId: dbRes.id_pelanggan || x.pelangganId || idPel,
                                customerId: dbRes.id_pelanggan || x.customerId || idPel,
                                noTransaksi: `TRX-${dbRes.nomor_servis.replace("SRV-", "")}`,
                              }
                            : x,
                        ),
                      );
                    }
                  } catch (err) {
                    console.error("Gagal buat servis otomatis dari booking ke Supabase:", err);
                  }
                })();
              }
            }
          }

        if (isSupabaseConfigured()) {
          const dbStatus =
            status === "Diterima"
              ? "disetujui"
              : status === "Ditolak"
                ? "ditolak"
                : "menunggu_konfirmasi";
          bookingService.updateStatus(id, dbStatus, alasan).catch(() => {});
        }
      },
      tugaskanMekanikBooking: (id, mekanik) =>
        setBooking((l) => l.map((x) => (x.id === id ? { ...x, mekanikDitugaskan: mekanik } : x))),
      aturEstimasiBooking: (id, estimasiSelesai) =>
        setBooking((l) => l.map((x) => (x.id === id ? { ...x, estimasiSelesai } : x))),
      ajukanPembayaran: (id, metode, buktiUrl) => {
        const target = servis.find((x) => x.id === id || x.noTransaksi === id);
        if (!target) return;

        // Duplicate payment protection
        const existingPmb = pembayaran.find(
          (p) => p.servisId === target.id || p.noTransaksi === target.noTransaksi
        );
        if (existingPmb?.status === "Lunas" || target.status === "Selesai Dibayar") {
          console.warn("Pembayaran untuk servis ini sudah lunas.");
          return;
        }

        setServis((l) => l.map((x) => (x.id === target.id ? { ...x, metodeBayar: metode } : x)));

        const isCashMethod = metode === "Cash";
        const cleanBuktiUrl = isCashMethod ? undefined : buktiUrl;

        const newPmbItem: Pembayaran = {
          id: existingPmb?.id || uid(),
          servisId: target.id,
          noTransaksi: target.noTransaksi,
          metode,
          tanggalBayar: hariIni(),
          totalBayar: target.total,
          status: "Menunggu Verifikasi",
          bengkelId: target.bengkelId,
          pelanggan: target.pelanggan,
          kendaraan: target.kendaraan,
          plat: target.plat,
          nomorServis: target.nomor,
          alasanTolak: undefined,
          ...(cleanBuktiUrl ? { buktiUrl: cleanBuktiUrl } : {}),
        };

        setPembayaran((l) => [
          newPmbItem,
          ...l.filter((p) => p.servisId !== target.id && p.noTransaksi !== target.noTransaksi),
        ]);

        if (typeof window !== "undefined") {
          try {
            window.dispatchEvent(
              new CustomEvent("appbenk_pembayaran_updated", { detail: newPmbItem })
            );
          } catch {}
        }

        // Notifikasi ke Admin & Owner: "Pembayaran baru (TRX-[ID]) menunggu verifikasi."
        const notifTrxJudul = "Pembayaran Baru Menunggu Verifikasi";
        const notifTrxPesan = `Pembayaran baru (${target.noTransaksi}) menunggu verifikasi.`;

        tambahNotifikasi({
          role: "admin",
          tipe: "pembayaran",
          judul: notifTrxJudul,
          pesan: notifTrxPesan,
          link: `/admin/pembayaran?filter=menunggu_verifikasi&trx=${target.noTransaksi}`,
          servisId: target.id,
          noTransaksi: target.noTransaksi,
          pelanggan: target.pelanggan,
          total: target.total,
          buktiUrl: cleanBuktiUrl,
        });

        notifikasiService
          .notifyWorkshopStaff({
            bengkelId: target.bengkelId || "bengkel-001",
            judul: notifTrxJudul,
            pesan: notifTrxPesan,
            tipe: "pembayaran",
            tautanUrl: `/admin/pembayaran?filter=menunggu_verifikasi&trx=${target.noTransaksi}`,
          })
          .catch(() => {});

        if (isSupabaseConfigured()) {
          const m = metode === "Cash" ? "cash" : metode === "QRIS" ? "qris" : "transfer";
          pembayaranService
            .submitPembayaran(target.id, m, cleanBuktiUrl)
            .then(() => {
              refreshPembayaran(target.bengkelId);
            })
            .catch((err) => {
              console.warn("submitPembayaran sync failed:", err);
            });
        }
      },
      verifikasiPembayaran: (servisId, disetujui, alasan, verifier) => {
        if (!disetujui && !alasan?.trim()) return;
        const targetServis = servis.find((s) => s.id === servisId);
        setPembayaran((l) =>
          l.map((p) => {
            if (p.servisId !== servisId) return p;
            if (disetujui) {
              const { alasanTolak, ...rest } = p;
              return {
                ...rest,
                status: "Lunas",
                verifiedAt: new Date().toISOString(),
                ...(verifier ? { verifiedBy: verifier } : {}),
              } as Pembayaran;
            } else {
              const { verifiedAt, verifiedBy, ...rest } = p;
              return {
                ...rest,
                status: "Bukti Ditolak",
                alasanTolak: alasan?.trim() || "Bukti tidak sesuai",
              } as Pembayaran;
            }
          }),
        );
        if (disetujui) {
          setServis((l) =>
            l.map((s) => (s.id === servisId ? { ...s, status: "Selesai Dibayar" } : s)),
          );
        }

        if (typeof window !== "undefined") {
          try {
            window.dispatchEvent(
              new CustomEvent("appbenk_pembayaran_updated", { detail: { servisId, disetujui } })
            );
          } catch {}
        }

        // Kirim notifikasi status balik ke pelanggan sesuai spesifikasi
        // "Pembayaran Anda telah [Diterima (Lunas) / Ditolak dengan alasan: ...]."
        if (targetServis) {
          const notifPmbJudul = disetujui ? "Pembayaran Diterima (Lunas)" : "Pembayaran Ditolak";
          const notifPmbPesan = disetujui
            ? "Pembayaran Anda telah Diterima (Lunas)."
            : `Pembayaran Anda telah Ditolak dengan alasan: ${alasan?.trim() || "Bukti tidak valid"}.`;

          tambahNotifikasi({
            role: "pelanggan",
            tipe: "pembayaran",
            judul: notifPmbJudul,
            pesan: notifPmbPesan,
            link: `/pelanggan/pembayaran?trx=${targetServis.noTransaksi}`,
            servisId,
            noTransaksi: targetServis.noTransaksi,
            pelanggan: targetServis.pelanggan,
            total: targetServis.total,
            customerId: targetServis.customerId || targetServis.pelangganId,
            userId: targetServis.userId,
          });

          notifikasiService
            .notifyCustomer({
              customerId: targetServis.customerId || targetServis.pelangganId,
              userId: targetServis.userId,
              bengkelId: targetServis.bengkelId,
              judul: notifPmbJudul,
              pesan: notifPmbPesan,
              tipe: "pembayaran",
              tautanUrl: `/pelanggan/pembayaran?trx=${targetServis.noTransaksi}`,
            })
            .catch(() => {});
        }

        if (isSupabaseConfigured()) {
          pembayaranService
            .verifikasiPembayaran(servisId, disetujui, alasan, verifier)
            .catch((err) => {
              console.warn("verifikasiPembayaran sync failed:", err);
            });
        }
      },
      catatStokOpname: (so) => {
        const baru: StokOpname = { ...so, id: uid() };
        setStokOpname((l) => [baru, ...l]);
        if (isSupabaseConfigured()) {
          sparepartService
            .catatStokOpname({
              keterangan: so.keterangan,
              total_item: so.totalItem,
              selisih_total: so.selisihTotal,
            })
            .catch(() => {});
        }
      },
      catatReturSparepart: async (r) => {
        const idRetur =
          r.id || `ret-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const nextNomor = r.nomorRetur || generateNextNomorRetur(returSparepart);
        const tgl = r.tanggal || hariIni();
        const initialStatus: StatusRetur = r.status || "Diajukan";
        const spObj = sparepart.find(
          (x) =>
            x.id.toLowerCase() === r.sparepartId.toLowerCase() ||
            x.kode.toLowerCase() === r.sparepartId.toLowerCase() ||
            x.nama.toLowerCase() === r.sparepartId.toLowerCase(),
        );
        const finalPartId = spObj ? spObj.id : r.sparepartId;
        const namaPart = r.namaSparepart || spObj?.nama || "Sparepart";
        const harga = r.hargaSatuan || spObj?.harga || 0;
        const total = r.totalNilai || r.jumlah * harga;

        const baru: ReturSparepart = {
          id: idRetur,
          nomorRetur: nextNomor,
          bengkelId: r.bengkelId || "bengkel-001",
          supplierId: r.supplierId,
          supplier: r.supplier,
          pembelianId: r.pembelianId,
          nomorPembelian: r.nomorPembelian,
          sparepartId: finalPartId,
          namaSparepart: namaPart,
          jumlah: r.jumlah,
          hargaSatuan: harga,
          totalNilai: total,
          tanggal: tgl,
          alasan: r.alasan,
          alasanDetail: r.alasanDetail,
          alasanPenolakan: r.alasanPenolakan,
          keterangan: r.keterangan,
          status: initialStatus,
          stokDikurangi: false,
          createdAt: new Date().toISOString(),
        };

        // Simpan ke state retur tanpa langsung mengurangi stok (stok idempoten saat Disetujui/Selesai)
        setReturSparepart((l) => [baru, ...l]);

        if (isSupabaseConfigured()) {
          try {
            await sparepartService.catatRetur({
              id_retur_sparepart: idRetur,
              nomor_retur: nextNomor,
              ...(baru.bengkelId ? { id_bengkel: baru.bengkelId } : {}),
              id_supplier: baru.supplierId,
              supplier: baru.supplier,
              id_pembelian_sparepart: baru.pembelianId,
              nomor_pembelian: baru.nomorPembelian,
              id_sparepart: finalPartId,
              jumlah: baru.jumlah,
              harga_satuan: baru.hargaSatuan,
              total_nilai: baru.totalNilai,
              tanggal: baru.tanggal,
              alasan: baru.alasan,
              alasan_detail: baru.alasanDetail ?? null,
              alasan_penolakan: baru.alasanPenolakan ?? null,
              keterangan: baru.keterangan ?? null,
              status: initialStatus,
              stok_dikurangi: false,
            });
          } catch (err) {
            console.error("Gagal simpan retur ke Supabase:", err);
          }
        }

        return baru;
      },
      ubahStatusRetur: async (id, statusBaru, alasanPenolakan) => {
        const target = returSparepart.find((x) => x.id === id);
        if (!target) return;

        if (statusBaru === "Ditolak" && !alasanPenolakan?.trim()) {
          throw new Error("Alasan penolakan wajib diisi ketika retur ditolak.");
        }

        let harusKurangiStok = false;
        let idRiwayat: string | undefined = undefined;

        // Idempotensi pengurangan stok: hanya jika belum pernah dikurangi dan status mencapai Disetujui, Selesai, atau Barang Dikirim
        if (
          (statusBaru === "Disetujui" ||
            statusBaru === "Selesai" ||
            statusBaru === "Barang Dikirim") &&
          !target.stokDikurangi
        ) {
          harusKurangiStok = true;
          idRiwayat = `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        }

        setReturSparepart((list: ReturSparepart[]) =>
          list.map((r): ReturSparepart => {
            if (r.id !== id) return r;
            return {
              ...r,
              status: statusBaru,
              alasanPenolakan:
                statusBaru === "Ditolak"
                  ? (alasanPenolakan?.trim() ?? r.alasanPenolakan)
                  : r.alasanPenolakan,
              stokDikurangi: harusKurangiStok ? true : r.stokDikurangi,
              riwayatStokId: idRiwayat ?? r.riwayatStokId,
            };
          }),
        );

        if (harusKurangiStok) {
          const spObj = sparepart.find((x) => x.id === target.sparepartId);
          const currentStock = spObj ? spObj.stok : 0;
          const newStock = Math.max(0, currentStock - target.jumlah);

          // Update stok di state
          setSparepart((list) =>
            list.map((sp) =>
              sp.id === target.sparepartId
                ? { ...sp, stok: newStock, tanggalUpdate: hariIni() }
                : sp,
            ),
          );

          // Catat ke riwayat stok
          const riwayatEntry: RiwayatStok = {
            id: idRiwayat!,
            sparepartId: target.sparepartId,
            jenis: "Keluar",
            jumlah: target.jumlah,
            tanggal: hariIni(),
            keterangan: `Retur ${target.nomorRetur} (${target.supplier}) · ${target.alasan}`,
          };
          setRiwayatStok((list) => [riwayatEntry, ...list]);

          if (isSupabaseConfigured()) {
            sparepartService
              .catatRiwayatStok({
                ...(idRiwayat ? { id_riwayat_stok: idRiwayat } : {}),
                id_sparepart: target.sparepartId,
                jenis: "Keluar",
                jumlah: target.jumlah,
                tanggal: hariIni(),
                keterangan: `Retur ${target.nomorRetur} (${target.supplier}) · ${target.alasan}`,
              })
              .catch(() => {});

            sparepartService
              .update(target.sparepartId, {
                stok_tersedia: newStock,
                status_stok: newStock <= 0 ? "habis" : newStock <= 5 ? "menipis" : "tersedia",
              })
              .catch(() => {});
          }
        }

        if (isSupabaseConfigured()) {
          try {
            await sparepartService.updateStatusRetur(
              id,
              statusBaru,
              statusBaru === "Ditolak" ? (alasanPenolakan?.trim() ?? null) : undefined,
              harusKurangiStok ? true : undefined,
              idRiwayat,
            );
          } catch (err) {
            console.error("Gagal update status retur di Supabase:", err);
          }
        }
      },
      bengkel,
      activeBengkelId: lockedBengkelId || activeBengkelId,
      setActiveBengkelId,
      activeBengkel,
      updateBengkelInfo,
      refreshBengkel,
      supplier,
      workshopPaymentAccounts,
      simpanPaymentAccount,
      togglePaymentAccountActive,
      hapusPaymentAccount,
      refreshPaymentAccounts,
      refreshPembayaran,
      notifikasi,
      tambahNotifikasi,
      tambahNotifikasiRealtime,
      tandaiNotifikasiDibaca,
      tandaiSemuaNotifikasiDibaca,
      hapusNotifikasi,
    }),
    [
      pelanggan,
      kendaraan,
      servis,
      sparepart,
      booking,
      tiket,
      pembayaran,
      workshopPaymentAccounts,
      riwayatStok,
      pembelian,
      penggunaan,
      stokOpname,
      returSparepart,
      laporanRingkasanStok,
      bengkel,
      activeBengkelId,
      lockedBengkelId,
      setActiveBengkelId,
      activeBengkel,
      updateBengkelInfo,
      refreshBengkel,
      mekanik,
      supplier,
      notifikasi,
    ],
  );

  // Inisialisasi Supabase Realtime Listener global + revalidasi otomatis
  useSupabaseRealtime({
    onServisChange: value.refreshServis,
    onBookingChange: value.refreshBooking,
    onPembayaranChange: () => {
      value.refreshPembayaran(lockedBengkelId || activeBengkelId);
      value.refreshServis();
    },
    onSparepartChange: () => {
      value.refreshSparepart();
      value.refreshStok();
      value.refreshRiwayatStok();
    },
    onBengkelChange: value.refreshBengkel,
    onPaymentAccountsChange: () =>
      value.refreshPaymentAccounts(lockedBengkelId || activeBengkelId),
    enablePollingFallback: true,
    pollingIntervalMs: 15000,
    workshopId: lockedBengkelId || activeBengkelId,
  });

  // Initial load sinkronisasi saat aplikasi pertama kali dimuat
  useEffect(() => {
    value.refreshBengkel().catch(() => {});
    value.refreshServis().catch(() => {});
    value.refreshBooking().catch(() => {});
    value.refreshSparepart().catch(() => {});
    value.refreshMekanik().catch(() => {});
    value.refreshPelanggan().catch(() => {});
    value.refreshKendaraan().catch(() => {});
  }, []);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam StoreProvider");
  return ctx;
}

export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export const tanggalPanjang = (iso?: string | null) => {
  if (!iso) return "—";
  const str = String(iso).trim();
  const dateStr = str.includes("T") ? str : `${str}T00:00:00`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Menghasilkan kode sparepart berurutan otomatis (contoh: SP-001 -> SP-002, SP-004 -> SP-005, SP-008 -> SP-009). */
export function generateNextKodeSparepart(list?: Array<{ kode?: string | null } | null>): string {
  let maxNum = 0;
  if (Array.isArray(list)) {
    for (const item of list) {
      if (!item || !item.kode) continue;
      const match = item.kode.match(/SP[-_]?(\d+)/i) || item.kode.match(/(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  const nextNum = maxNum + 1;
  return `SP-${String(nextNum).padStart(3, "0")}`;
}

/** Menghasilkan nomor transaksi servis berurutan otomatis (contoh: SRV-2026-0001, SRV-2026-0002, SRV-2026-0011). */
export function generateNextNomorServis(list: Array<{ nomor?: string | null }>): string {
  let maxNum = 0;
  for (const item of list) {
    if (!item.nomor) continue;
    const parts = item.nomor.split("-");
    const lastPart = parts[parts.length - 1] ?? "";
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `SRV-2026-${String(nextNum).padStart(4, "0")}`;
}

/** Menghasilkan nomor retur berurutan otomatis (contoh: RET-2026-001, RET-2026-002, RET-2026-003). */
export function generateNextNomorRetur(list: Array<{ nomorRetur?: string | null }>): string {
  let maxNum = 0;
  for (const item of list) {
    if (!item.nomorRetur) continue;
    const match =
      item.nomorRetur.match(/RET[-_]?\d{4}[-_]?(\d+)/i) || item.nomorRetur.match(/RET[-_]?(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `RET-2026-${String(nextNum).padStart(3, "0")}`;
}

/** Menghasilkan nomor pembelian sparepart berurutan otomatis (contoh: BL-2026-001, BL-2026-002). */
export function generateNextNomorPembelian(list: Array<{ nomor?: string | null }>): string {
  let maxNum = 0;
  for (const item of list) {
    if (!item.nomor) continue;
    const match =
      item.nomor.match(/(?:BL|PB)[-_]?\d{4}[-_]?(\d+)/i) || item.nomor.match(/(?:BL|PB)[-_]?(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `BL-2026-${String(nextNum).padStart(3, "0")}`;
}

