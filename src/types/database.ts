/**
 * TypeScript definitions for AppBenk Database (15 Entities)
 * Sistem Bengkel Terpadu
 */

export type StatusBooking =
  | "menunggu_konfirmasi"
  | "disetujui"
  | "ditolak"
  | "menunggu_servis"
  | "sedang_dikerjakan"
  | "selesai"
  | "menunggu_pembayaran"
  | "lunas";

export type StatusServis = "menunggu" | "diproses" | "selesai" | "menunggu_pembayaran" | "lunas";

export type StatusPembayaran = "belum_dibayar" | "menunggu_verifikasi" | "lunas" | "ditolak";

export type MetodePembayaran = "cash" | "transfer" | "qris";

export type StatusStok = "tersedia" | "menipis" | "habis";

export type JenisRiwayatStok = "masuk" | "keluar" | "penyesuaian";

export interface WorkshopRow {
  id: string;
  name: string;
  code: string;
  owner_id?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkshopRole = "OWNER" | "ADMIN" | "MECHANIC" | "CUSTOMER";

export interface WorkshopMemberRow {
  id: string;
  workshop_id: string;
  user_id: string;
  role: WorkshopRole;
  created_at: string;
  updated_at: string;
}

export type PaymentAccountType = "bank_transfer" | "qris";

export interface WorkshopPaymentAccountRow {
  id: string;
  workshop_id: string;
  id_bengkel?: string | null;
  account_type: PaymentAccountType;
  provider: string;
  provider_account_id?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder_name?: string | null;
  qr_image_url?: string | null;
  display_name?: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationChannel = "EMAIL" | "WHATSAPP" | "IN_APP" | "in_app";

export type TipeNotifikasi = "booking" | "servis" | "pembayaran" | "info";

export interface NotifikasiRow {
  id: string;
  user_id: string;
  bengkel_id?: string | null;
  judul: string;
  pesan: string;
  tipe: TipeNotifikasi;
  tautan_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationLogRow {
  id: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  user_id?: string | null;
  channel: NotificationChannel;
  type: string;
  recipient: string;
  subject?: string | null;
  message: string;
  status: string;
  provider?: string | null;
  provider_message_id?: string | null;
  sent_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

export type PaketBengkel = "Basic" | "Premium";
export type StatusKlien = "Aktif" | "Nonaktif";

export interface BengkelRow {
  id_bengkel: string;
  workshop_id?: string | null;
  nama_bengkel: string;
  alamat: string | null;
  no_telepon: string | null;
  latitude?: number | null;
  longitude?: number | null;
  jam_operasional?: string | null;
  paket?: PaketBengkel;
  status?: StatusKlien;
  owner_nama?: string | null;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MekanikRow {
  id_mekanik: string;
  id_bengkel: string;
  workshop_id?: string | null;
  nama_mekanik: string;
  no_telepon: string | null;
  spesialisasi: string | null;
  status: "Aktif" | "Tidak Aktif";
  created_at: string;
  updated_at: string;
}

export interface PelangganRow {
  id_pelanggan: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  user_id: string | null;
  nama: string;
  no_hp: string | null;
  email: string;
  password?: string | null;
  alamat: string | null;
  created_at: string;
  updated_at: string;
}

export interface KendaraanRow {
  id_kendaraan: string;
  id_pelanggan: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  merk: string;
  tipe: string;
  tahun: number;
  nopol: string;
  kilometer?: number | null;
  created_at: string;
  updated_at: string;
}

export interface BookingServisRow {
  id_booking: string;
  nomor_booking: string;
  id_pelanggan: string;
  id_kendaraan: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  tanggal_booking: string;
  waktu_booking: string;
  jenis_servis: string;
  keluhan: string;
  id_mekanik?: string | null;
  mekanik_diinginkan: string | null;
  status_booking: StatusBooking;
  alasan_penolakan: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServisRow {
  id_servis: string;
  nomor_servis: string;
  id_booking: string | null;
  id_pelanggan: string;
  id_kendaraan: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  id_mekanik?: string | null;
  mekanik: string | null;
  jenis_servis: string | null;
  keluhan: string | null;
  pekerjaan?: string | null;
  hasil_pemeriksaan: string | null;
  estimasi_biaya: number;
  estimasi_waktu: string | null;
  biaya_jasa: number;
  biaya_sparepart: number;
  total_biaya: number;
  status_servis: StatusServis;
  tanggal_servis?: string | null;
  tanggal_mulai: string | null;
  estimasi_selesai: string | null;
  tanggal_selesai: string | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
}

export interface PembayaranRow {
  id_pembayaran: string;
  nomor_transaksi: string;
  no_transaksi?: string | null;
  id_servis: string;
  id_pelanggan: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  metode_pembayaran: MetodePembayaran;
  metode?: string | null;
  tanggal_bayar: string | null;
  total_bayar?: number;
  jumlah_bayar: number;
  status_pembayaran: StatusPembayaran;
  status?: string | null;
  bukti_pembayaran: string | null;
  bukti_url?: string | null;
  alasan_penolakan: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DetailServisRow {
  id_detail_servis: string;
  id_detail?: string;
  id_servis: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  id_sparepart: string | null;
  jumlah: number;
  qty?: number;
  keterangan: string | null;
  harga: number;
  harga_satuan?: number;
  subtotal?: number;
  created_at: string;
}

export interface SparepartRow {
  id_sparepart: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  kode?: string;
  nama?: string;
  nama_sparepart: string;
  kategori: string;
  satuan: string;
  harga: number;
  stok?: number;
  stok_tersedia: number;
  stok_minimum: number;
  status_stok: StatusStok;
  tanggal_update: string;
  created_at: string;
  updated_at: string;
}

export interface PenggunaanSparepartRow {
  id_penggunaan_sparepart: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  id_sparepart: string;
  id_servis: string;
  tanggal: string;
  jumlah: number;
  qty?: number;
  total_harga?: number;
  mekanik: string | null;
  keterangan: string | null;
  created_at: string;
}

export interface SupplierRow {
  id_supplier: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  nama_supplier?: string;
  nama?: string;
  kontak?: string | null;
  no_telepon?: string | null;
  telepon?: string | null;
  email?: string | null;
  alamat?: string | null;
  status?: "Aktif" | "Tidak Aktif";
  created_at: string;
  updated_at?: string;
}

export interface PembelianSparepartRow {
  id_pembelian_sparepart: string;
  id_pembelian?: string;
  nomor_pembelian: string;
  id_sparepart: string;
  id_supplier?: string | null;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  supplier: string;
  tanggal: string;
  jumlah: number;
  harga: number;
  total: number;
  status: "diterima" | "dibatalkan" | "retur";
  created_at: string;
}

export interface RiwayatStokRow {
  id_riwayat_stok: string;
  id_riwayat?: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  id_sparepart: string;
  jenis: JenisRiwayatStok;
  tipe?: string;
  jumlah: number;
  qty?: number;
  tanggal: string;
  keterangan: string | null;
  created_at: string;
}

export interface StokOpnameRow {
  id_stok_opname: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  tanggal: string;
  keterangan: string | null;
  total_item: number;
  selisih_total: number;
  created_at: string;
}

export type StatusReturDb =
  | "Diajukan"
  | "Diproses"
  | "Disetujui"
  | "Ditolak"
  | "Barang Dikirim"
  | "Selesai"
  | "diproses"
  | "disetujui"
  | "ditolak";

export interface ReturSparepartRow {
  id_retur_sparepart: string;
  nomor_retur?: string | null;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  id_supplier?: string | null;
  supplier?: string | null;
  id_pembelian_sparepart: string | null;
  nomor_pembelian?: string | null;
  id_sparepart: string;
  nama_sparepart?: string | null;
  jumlah: number;
  harga_satuan?: number;
  total_nilai?: number;
  tanggal: string;
  alasan: string;
  alasan_detail?: string | null;
  alasan_penolakan?: string | null;
  keterangan?: string | null;
  status: StatusReturDb;
  stok_dikurangi?: boolean;
  riwayat_stok_id?: string | null;
  created_at: string;
}

export interface LaporanRingkasanStokRow {
  id_ringkasan_stok: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  id_sparepart: string;
  stok_awal: number;
  stok_masuk: number;
  stok_keluar: number;
  stok_akhir: number;
  periode: string;
  created_at: string;
}

export interface AdminRow {
  id_admin: string;
  user_id: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  nama: string;
  email: string;
  no_hp: string | null;
  status: "aktif" | "nonaktif";
  created_at: string;
  updated_at: string;
}

export interface OwnerRow {
  id_owner: string;
  user_id: string;
  workshop_id?: string | null;
  id_bengkel?: string | null;
  nama: string;
  email: string;
  no_hp: string | null;
  status: "aktif" | "nonaktif";
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      pelanggan: {
        Row: PelangganRow;
        Insert: Partial<PelangganRow> & { nama: string; email: string };
        Update: Partial<PelangganRow>;
      };
      kendaraan: {
        Row: KendaraanRow;
        Insert: Partial<KendaraanRow> & {
          id_pelanggan: string;
          merk: string;
          tipe: string;
          tahun: number;
          nopol: string;
        };
        Update: Partial<KendaraanRow>;
      };
      booking_servis: {
        Row: BookingServisRow;
        Insert: Partial<BookingServisRow> & {
          nomor_booking: string;
          id_pelanggan: string;
          id_kendaraan: string;
          tanggal_booking: string;
          waktu_booking: string;
          jenis_servis: string;
          keluhan: string;
        };
        Update: Partial<BookingServisRow>;
      };
      servis: {
        Row: ServisRow;
        Insert: Partial<ServisRow> & {
          nomor_servis: string;
          id_pelanggan: string;
          id_kendaraan: string;
        };
        Update: Partial<ServisRow>;
      };
      pembayaran: {
        Row: PembayaranRow;
        Insert: Partial<PembayaranRow> & {
          nomor_transaksi: string;
          id_servis: string;
          id_pelanggan: string;
          metode_pembayaran: MetodePembayaran;
        };
        Update: Partial<PembayaranRow>;
      };
      detail_servis: {
        Row: DetailServisRow;
        Insert: Partial<DetailServisRow> & { id_servis: string; harga: number; jumlah: number };
        Update: Partial<DetailServisRow>;
      };
      sparepart: {
        Row: SparepartRow;
        Insert: SparepartRow;
        Update: Partial<SparepartRow>;
      };
      penggunaan_sparepart: {
        Row: PenggunaanSparepartRow;
        Insert: Partial<PenggunaanSparepartRow> & {
          id_sparepart: string;
          id_servis: string;
          jumlah: number;
        };
        Update: Partial<PenggunaanSparepartRow>;
      };
      pembelian_sparepart: {
        Row: PembelianSparepartRow;
        Insert: Partial<PembelianSparepartRow> & {
          nomor_pembelian: string;
          id_sparepart: string;
          supplier: string;
          jumlah: number;
          harga: number;
          total: number;
        };
        Update: Partial<PembelianSparepartRow>;
      };
      riwayat_stok: {
        Row: RiwayatStokRow;
        Insert: Partial<RiwayatStokRow> & {
          id_sparepart: string;
          jenis: JenisRiwayatStok;
          jumlah: number;
        };
        Update: Partial<RiwayatStokRow>;
      };
      stok_opname: {
        Row: StokOpnameRow;
        Insert: Partial<StokOpnameRow>;
        Update: Partial<StokOpnameRow>;
      };
      retur_sparepart: {
        Row: ReturSparepartRow;
        Insert: Partial<ReturSparepartRow> & {
          id_sparepart: string;
          jumlah: number;
          alasan: string;
        };
        Update: Partial<ReturSparepartRow>;
      };
      laporan_ringkasan_stok: {
        Row: LaporanRingkasanStokRow;
        Insert: Partial<LaporanRingkasanStokRow> & { id_sparepart: string; periode: string };
        Update: Partial<LaporanRingkasanStokRow>;
      };
      admin: {
        Row: AdminRow;
        Insert: Partial<AdminRow> & { user_id: string; nama: string; email: string };
        Update: Partial<AdminRow>;
      };
      owner: {
        Row: OwnerRow;
        Insert: Partial<OwnerRow> & { user_id: string; nama: string; email: string };
        Update: Partial<OwnerRow>;
      };
      bengkel: {
        Row: BengkelRow;
        Insert: Partial<BengkelRow> & { id_bengkel: string; nama_bengkel: string };
        Update: Partial<BengkelRow>;
      };
      mekanik: {
        Row: MekanikRow;
        Insert: Partial<MekanikRow> & { nama_mekanik: string; id_bengkel: string };
        Update: Partial<MekanikRow>;
      };
      supplier: {
        Row: SupplierRow;
        Insert: Partial<SupplierRow> & { nama: string };
        Update: Partial<SupplierRow>;
      };
      workshops: {
        Row: WorkshopRow;
        Insert: Partial<WorkshopRow> & { name: string; code: string };
        Update: Partial<WorkshopRow>;
      };
      workshop_members: {
        Row: WorkshopMemberRow;
        Insert: Partial<WorkshopMemberRow> & {
          workshop_id: string;
          user_id: string;
          role: WorkshopRole;
        };
        Update: Partial<WorkshopMemberRow>;
      };
      workshop_payment_accounts: {
        Row: WorkshopPaymentAccountRow;
        Insert: Partial<WorkshopPaymentAccountRow> & {
          workshop_id: string;
          account_type: PaymentAccountType;
        };
        Update: Partial<WorkshopPaymentAccountRow>;
      };
      notification_logs: {
        Row: NotificationLogRow;
        Insert: Partial<NotificationLogRow> & {
          channel: NotificationChannel;
          type: string;
          recipient: string;
          message: string;
        };
        Update: Partial<NotificationLogRow>;
      };
      customer_service_tickets: {
        Row: CSTicketRow;
        Insert: Partial<CSTicketRow> & {
          user_id: string;
          user_name: string;
          user_email: string;
          user_role: string;
          subjek: string;
          kategori: string;
          pesan: string;
        };
        Update: Partial<CSTicketRow>;
      };
      customer_service_messages: {
        Row: CSMessageRow;
        Insert: Partial<CSMessageRow> & {
          ticket_id: string;
          sender_user_id: string;
          sender_role: string;
          sender_name: string;
          message: string;
        };
        Update: Partial<CSMessageRow>;
      };
      system_logs: {
        Row: SystemLogRow;
        Insert: Partial<SystemLogRow> & {
          module: string;
          error_message: string;
        };
        Update: Partial<SystemLogRow>;
      };
    };
  };
}

export type StatusCSTicket = "Baru" | "Diproses" | "Menunggu Balasan" | "Selesai";

export type KategoriCSTicket =
  | "Bug/Error"
  | "Pembayaran"
  | "Login"
  | "Booking"
  | "Maps"
  | "Premium"
  | "Lainnya";

export interface CSTicketRow {
  id: string;
  ticket_number?: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: "pelanggan" | "admin" | "owner" | "super_admin" | string;
  bengkel_id?: string | null;
  bengkel_nama?: string | null;
  subjek: string;
  kategori: KategoriCSTicket | string;
  pesan: string;
  status: StatusCSTicket;
  created_at: string;
  updated_at: string;
}

export interface CSMessageRow {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  sender_role: "pelanggan" | "admin" | "owner" | "super_admin";
  sender_name: string;
  message: string;
  created_at: string;
}

export type StatusSystemLog = "Open" | "Investigasi" | "Selesai";

export interface SystemLogRow {
  id: string;
  bengkel_id?: string | null;
  bengkel_nama?: string | null;
  module: string;
  error_message: string;
  stack_trace?: string | null;
  status: StatusSystemLog;
  created_at: string;
}

export type StatusWorkshopApplication = "PENDING" | "APPROVED" | "REJECTED";

export interface WorkshopApplicationRow {
  id: string;
  user_id: string;
  nama_bengkel: string;
  alamat: string;
  no_telepon: string;
  owner_nama: string;
  owner_email: string;
  paket: "Basic" | "Premium";
  status: StatusWorkshopApplication;
  catatan_review?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  bengkel_id_result?: string | null;
  created_at: string;
  updated_at: string;
}

export type StatusAdminInvitation = "pending" | "accepted" | "expired" | "cancelled";

export interface AdminInvitationRow {
  id: string;
  id_bengkel: string;
  email: string;
  nama: string;
  token: string;
  created_by: string;
  expires_at: string;
  status: StatusAdminInvitation;
  accepted_by?: string | null;
  accepted_at?: string | null;
  created_at: string;
  updated_at: string;
}
