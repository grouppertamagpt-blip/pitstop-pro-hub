import { supabase } from "@/lib/supabase";
export { supabase };
import type {
  PelangganRow,
  KendaraanRow,
  BookingServisRow,
  ServisRow,
  PembayaranRow,
  DetailServisRow,
  SparepartRow,
  PenggunaanSparepartRow,
  PembelianSparepartRow,
  RiwayatStokRow,
  StokOpnameRow,
  ReturSparepartRow,
  LaporanRingkasanStokRow,
  AdminRow,
  OwnerRow,
  BengkelRow,
  MekanikRow,
  StatusBooking,
  StatusServis,
  StatusPembayaran,
  MetodePembayaran,
  SupplierRow,
  StatusReturDb,
  WorkshopRow,
  WorkshopMemberRow,
  WorkshopPaymentAccountRow,
  PaymentAccountType,
  NotificationLogRow,
  SystemLogRow,
  CSTicketRow,
  CSMessageRow,
  PaketBengkel,
  StatusKlien,
  WorkshopApplicationRow,
  StatusWorkshopApplication,
  AdminInvitationRow,
  StatusAdminInvitation,
  TipeNotifikasi,
  NotifikasiRow,
} from "@/types/database";

/**
 * Check whether Supabase environment variables are properly defined.
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
  return Boolean(
    url && key && !url.includes("YOUR_PROJECT_REF") && !key.includes("YOUR_SUPABASE_ANON_KEY"),
  );
}

// ----------------------------------------------------------------------------
// 1. PELANGGAN SERVICE
// ----------------------------------------------------------------------------
export const pelangganService = {
  async getAll(workshopId?: string): Promise<PelangganRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase().from("pelanggan").select("*").order("created_at", { ascending: false });
    if (workshopId) {
      query = query.or(`workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getById(idPelanggan: string): Promise<PelangganRow | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase()
      .from("pelanggan")
      .select("*")
      .eq("id_pelanggan", idPelanggan)
      .single();
    if (error) return null;
    return data;
  },

  async getByUserId(userId: string): Promise<PelangganRow | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase()
      .from("pelanggan")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return null;
    return data;
  },

  async create(payload: {
    id_pelanggan?: string;
    workshop_id?: string;
    id_bengkel?: string;
    nama: string;
    email: string;
    no_hp?: string;
    alamat?: string;
    user_id?: string;
  }): Promise<PelangganRow> {
    const idPelanggan =
      payload.id_pelanggan ||
      `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    if (!isSupabaseConfigured()) {
      return {
        id_pelanggan: idPelanggan,
        user_id: payload.user_id ?? null,
        workshop_id: payload.workshop_id ?? payload.id_bengkel ?? "bengkel-001",
        id_bengkel: payload.id_bengkel ?? payload.workshop_id ?? "bengkel-001",
        nama: payload.nama,
        email: payload.email,
        no_hp: payload.no_hp ?? null,
        alamat: payload.alamat ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase()
      .from("pelanggan")
      .insert({
        id_pelanggan: idPelanggan,
        ...payload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(idPelanggan: string, payload: Partial<PelangganRow>): Promise<PelangganRow> {
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");
    const { data, error } = await supabase()
      .from("pelanggan")
      .update(payload)
      .eq("id_pelanggan", idPelanggan)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(idPelanggan: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase().from("pelanggan").delete().eq("id_pelanggan", idPelanggan);
    if (error) throw error;
  },
};

// ----------------------------------------------------------------------------
// 2. KENDARAAN SERVICE
// ----------------------------------------------------------------------------
export const kendaraanService = {
  async getByPelanggan(idPelanggan: string): Promise<KendaraanRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase()
      .from("kendaraan")
      .select("*")
      .eq("id_pelanggan", idPelanggan)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getAll(workshopId?: string): Promise<KendaraanRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase().from("kendaraan").select("*").order("created_at", { ascending: false });
    if (workshopId) {
      query = query.or(`workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: {
    id_kendaraan?: string;
    id_pelanggan: string;
    workshop_id?: string;
    id_bengkel?: string;
    merk: string;
    tipe: string;
    tahun: number;
    nopol: string;
    kilometer?: number;
  }): Promise<KendaraanRow> {
    const idKendaraan =
      payload.id_kendaraan ||
      `kd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    if (!isSupabaseConfigured()) {
      return {
        id_kendaraan: idKendaraan,
        ...payload,
        workshop_id: payload.workshop_id ?? payload.id_bengkel ?? "bengkel-001",
        id_bengkel: payload.id_bengkel ?? payload.workshop_id ?? "bengkel-001",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase()
      .from("kendaraan")
      .insert({
        id_kendaraan: idKendaraan,
        ...payload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(idKendaraan: string, payload: Partial<KendaraanRow>): Promise<KendaraanRow> {
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");
    const { data, error } = await supabase()
      .from("kendaraan")
      .update(payload)
      .eq("id_kendaraan", idKendaraan)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(idKendaraan: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase().from("kendaraan").delete().eq("id_kendaraan", idKendaraan);
    if (error) throw error;
  },
};

// ----------------------------------------------------------------------------
// 3. BOOKING SERVIS SERVICE
// ----------------------------------------------------------------------------
export const bookingService = {
  async getAll(workshopId?: string): Promise<BookingServisRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase()
      .from("booking_servis")
      .select("*")
      .order("tanggal_booking", { ascending: false });
    if (workshopId) {
      query = query.or(`workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getByPelanggan(idPelanggan: string): Promise<BookingServisRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase()
      .from("booking_servis")
      .select("*")
      .eq("id_pelanggan", idPelanggan)
      .order("tanggal_booking", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: {
    id_booking?: string;
    workshop_id?: string;
    id_bengkel?: string;
    nomor_booking: string;
    id_pelanggan: string;
    id_kendaraan: string;
    tanggal_booking: string;
    waktu_booking: string;
    jenis_servis: string;
    keluhan: string;
    mekanik_diinginkan?: string | undefined;
    id_mekanik?: string | null | undefined;
  }): Promise<BookingServisRow> {
    const idBooking =
      payload.id_booking ||
      `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const idBengkel = payload.workshop_id || payload.id_bengkel || "bengkel-001";
    if (!isSupabaseConfigured()) {
      return {
        id_booking: idBooking,
        workshop_id: idBengkel,
        id_bengkel: idBengkel,
        nomor_booking: payload.nomor_booking,
        id_pelanggan: payload.id_pelanggan,
        id_kendaraan: payload.id_kendaraan,
        tanggal_booking: payload.tanggal_booking,
        waktu_booking: payload.waktu_booking,
        jenis_servis: payload.jenis_servis,
        keluhan: payload.keluhan,
        id_mekanik: payload.id_mekanik ?? null,
        mekanik_diinginkan: payload.mekanik_diinginkan ?? null,
        status_booking: "menunggu_konfirmasi",
        alasan_penolakan: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Pastikan pelanggan ada di database Supabase untuk mencegah foreign key error
    try {
      const { data: existPel } = await supabase()
        .from("pelanggan")
        .select("id_pelanggan")
        .eq("id_pelanggan", payload.id_pelanggan)
        .maybeSingle();

      if (!existPel) {
        await supabase()
          .from("pelanggan")
          .insert({
            id_pelanggan: payload.id_pelanggan,
            workshop_id: idBengkel,
            id_bengkel: idBengkel,
            nama: "Pelanggan",
            email: `${payload.id_pelanggan}@appbenk.local`,
          });
      }
    } catch (e) {
      void e;
    }

    // Pastikan kendaraan ada di database Supabase untuk mencegah foreign key error
    try {
      const { data: existKen } = await supabase()
        .from("kendaraan")
        .select("id_kendaraan")
        .eq("id_kendaraan", payload.id_kendaraan)
        .maybeSingle();

      if (!existKen) {
        await supabase().from("kendaraan").insert({
          id_kendaraan: payload.id_kendaraan,
          id_pelanggan: payload.id_pelanggan,
          workshop_id: idBengkel,
          id_bengkel: idBengkel,
          merk: "Kendaraan",
          tipe: "Umum",
          tahun: 2024,
          nopol: "D 1234 BK",
        });
      }
    } catch (e) {
      void e;
    }

    const { data, error } = await supabase()
      .from("booking_servis")
      .insert({
        id_booking: idBooking,
        id_bengkel: idBengkel,
        ...payload,
        status_booking: "menunggu_konfirmasi",
      })
      .select()
      .single();
    if (error) throw error;

    if (data) {
      try {
        await notifikasiService.notifyWorkshopStaff({
          bengkelId: idBengkel,
          judul: "Booking Baru Masuk",
          pesan: `Booking baru masuk untuk layanan ${payload.jenis_servis}.`,
          tipe: "booking",
          tautanUrl: "/admin/booking",
        });
      } catch {}
    }

    return data;
  },

  async updateStatus(
    idBooking: string,
    status: StatusBooking,
    alasanPenolakan?: string,
  ): Promise<BookingServisRow> {
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");
    const updateData: Partial<BookingServisRow> = { status_booking: status };
    if (status === "ditolak") {
      if (!alasanPenolakan?.trim()) {
        throw new Error("Alasan penolakan wajib diisi ketika booking ditolak.");
      }
      updateData.alasan_penolakan = alasanPenolakan.trim();
    }
    const { data, error } = await supabase()
      .from("booking_servis")
      .update(updateData)
      .eq("id_booking", idBooking)
      .select()
      .single();
    if (error) throw error;

    if (data && (status === "disetujui" || status === "ditolak")) {
      try {
        const disetujui = status === "disetujui";
        const judul = disetujui ? "Booking Disetujui" : "Booking Ditolak";
        const pesan = disetujui
          ? "Booking Anda telah Disetujui oleh bengkel."
          : `Booking Anda telah Ditolak oleh bengkel.${alasanPenolakan?.trim() ? ` Alasan: ${alasanPenolakan.trim()}` : ""}`;
        await notifikasiService.notifyCustomer({
          customerId: data.id_pelanggan,
          bengkelId: data.id_bengkel || (data as any).workshop_id,
          judul,
          pesan,
          tipe: "booking",
          tautanUrl: disetujui ? "/pelanggan/status" : "/pelanggan/booking",
        });
      } catch {}
    }

    return data;
  },
};

// ----------------------------------------------------------------------------
// 4. SERVIS SERVICE
// ----------------------------------------------------------------------------
export const servisService = {
  async getAll(workshopId?: string): Promise<ServisRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase().from("servis").select("*").order("created_at", { ascending: false });
    if (workshopId) {
      query = query.eq("id_bengkel", workshopId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getById(idServis: string): Promise<ServisRow | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase()
      .from("servis")
      .select("*")
      .eq("id_servis", idServis)
      .single();
    if (error) return null;
    return data;
  },

  async create(payload: {
    id_servis?: string | undefined;
    workshop_id?: string | null | undefined;
    id_bengkel?: string | null | undefined;
    id_mekanik?: string | null | undefined;
    nomor_servis: string;
    id_booking?: string | null | undefined;
    id_pelanggan: string;
    id_kendaraan: string;
    mekanik?: string | null | undefined;
    jenis_servis?: string | null | undefined;
    keluhan?: string | null | undefined;
    pekerjaan?: string | null | undefined;
    hasil_pemeriksaan?: string | null | undefined;
    estimasi_biaya?: number | undefined;
    estimasi_waktu?: string | null | undefined;
    biaya_jasa?: number | undefined;
    biaya_sparepart?: number | undefined;
    total_biaya?: number | undefined;
    status_servis?: StatusServis | undefined;
    tanggal_servis?: string | null | undefined;
    tanggal_mulai?: string | null | undefined;
    estimasi_selesai?: string | null | undefined;
    tanggal_selesai?: string | null | undefined;
    catatan?: string | null | undefined;
  }): Promise<ServisRow> {
    const idServis =
      payload.id_servis ||
      `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const idBengkel = payload.id_bengkel || payload.workshop_id || "bengkel-001";

    if (!isSupabaseConfigured()) {
      const jasa = payload.biaya_jasa ?? 0;
      const part = payload.biaya_sparepart ?? 0;
      return {
        id_servis: idServis,
        nomor_servis: payload.nomor_servis,
        id_booking: payload.id_booking ?? null,
        id_pelanggan: payload.id_pelanggan,
        id_kendaraan: payload.id_kendaraan,
        workshop_id: idBengkel,
        id_bengkel: idBengkel,
        id_mekanik: payload.id_mekanik ?? null,
        mekanik: payload.mekanik ?? null,
        jenis_servis: payload.jenis_servis ?? null,
        keluhan: payload.keluhan ?? null,
        pekerjaan: payload.pekerjaan ?? null,
        hasil_pemeriksaan: payload.hasil_pemeriksaan ?? null,
        estimasi_biaya: payload.estimasi_biaya ?? 0,
        estimasi_waktu: payload.estimasi_waktu ?? null,
        biaya_jasa: jasa,
        biaya_sparepart: part,
        total_biaya: payload.total_biaya ?? jasa + part,
        status_servis: payload.status_servis ?? "menunggu",
        tanggal_servis: payload.tanggal_servis ?? null,
        tanggal_mulai: payload.tanggal_mulai ?? null,
        estimasi_selesai: payload.estimasi_selesai ?? null,
        tanggal_selesai: payload.tanggal_selesai ?? null,
        catatan: payload.catatan ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    // Servis table in Supabase has id_bengkel, but does NOT have workshop_id
    const { workshop_id: _wId, ...restPayload } = payload;
    let insertPayload: any = {
      ...restPayload,
      id_servis: idServis,
      id_bengkel: idBengkel,
    };
    const initialRes = await supabase().from("servis").insert(insertPayload).select().single();
    if (
      initialRes.error &&
      (initialRes.error.code === "23505" ||
        initialRes.error.message?.includes("servis_nomor_servis_key"))
    ) {
      // Recovery otomatis jika nomor servis mengalami tabrakan sequence
      const { data: existingRows } = await supabase().from("servis").select("nomor_servis");
      let maxNum = 0;
      if (existingRows) {
        for (const r of existingRows) {
          if (!r.nomor_servis) continue;
          const parts = r.nomor_servis.split("-");
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      const nextNomor = `SRV-2026-${String(maxNum + 1).padStart(4, "0")}`;
      insertPayload = { ...insertPayload, nomor_servis: nextNomor };
      const retryRes = await supabase().from("servis").insert(insertPayload).select().single();
      if (retryRes.error) throw retryRes.error;
      return retryRes.data;
    }
    if (initialRes.error) throw initialRes.error;
    return initialRes.data;
  },

  async update(idServis: string, payload: Partial<ServisRow>): Promise<ServisRow> {
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");
    const { workshop_id: _wId, ...cleanPayload } = payload as any;
    const { data, error } = await supabase()
      .from("servis")
      .update(cleanPayload)
      .eq("id_servis", idServis)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(idServis: string, status: StatusServis): Promise<ServisRow> {
    const updated = await this.update(idServis, { status_servis: status });
    if (status === "diproses" || status === "selesai") {
      try {
        const isDiproses = status === "diproses";
        const judul = isDiproses ? "Servis Sedang Diproses" : "Servis Selesai";
        const pesan = `Status kendaraan Anda sekarang: ${isDiproses ? "Diproses" : "Siap Diambil"}.`;
        await notifikasiService.notifyCustomer({
          customerId: updated.id_pelanggan,
          bengkelId: updated.id_bengkel || updated.workshop_id,
          judul,
          pesan,
          tipe: "servis",
          tautanUrl: "/pelanggan/status",
        });
      } catch {}
    }
    return updated;
  },

  async delete(idServis: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase().from("detail_servis").delete().eq("id_servis", idServis);
    } catch (e) {
      void e;
    }
    try {
      await supabase().from("pembayaran").delete().eq("id_servis", idServis);
    } catch (e) {
      void e;
    }
    const { error } = await supabase().from("servis").delete().eq("id_servis", idServis);
    if (error) throw error;
  },

  async getDetailServis(idServis: string): Promise<DetailServisRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase()
      .from("detail_servis")
      .select("*")
      .eq("id_servis", idServis);
    if (error) throw error;
    return data ?? [];
  },

  async addDetailServis(payload: {
    id_servis: string;
    id_sparepart?: string;
    jumlah: number;
    keterangan?: string;
    harga: number;
  }): Promise<DetailServisRow> {
    const idDetail = `dt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    if (!isSupabaseConfigured()) {
      return {
        id_detail_servis: idDetail,
        id_servis: payload.id_servis,
        id_sparepart: payload.id_sparepart ?? null,
        jumlah: payload.jumlah,
        keterangan: payload.keterangan ?? null,
        harga: payload.harga,
        created_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase()
      .from("detail_servis")
      .insert({
        id_detail: idDetail,
        id_detail_servis: idDetail,
        id_servis: payload.id_servis,
        id_sparepart: payload.id_sparepart ?? null,
        jumlah: payload.jumlah,
        qty: payload.jumlah,
        harga: payload.harga,
        harga_satuan: payload.harga,
        subtotal: payload.harga * payload.jumlah,
        keterangan: payload.keterangan ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ----------------------------------------------------------------------------
// 5. SPAREPART & STOK SERVICE
// ----------------------------------------------------------------------------
export const sparepartService = {
  async getAll(workshopId?: string): Promise<SparepartRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase().from("sparepart").select("*").order("id_sparepart", { ascending: true });
    if (workshopId) {
      query = query.or(
        `workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId},workshop_id.is.null`,
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<SparepartRow> & { id_sparepart: string; nama_sparepart: string }): Promise<SparepartRow> {
    if (!isSupabaseConfigured()) return payload as SparepartRow;
    const now = new Date().toISOString();
    const stokTersedia = Number(payload.stok_tersedia ?? payload.stok ?? 0);
    const stokMin = Number(payload.stok_minimum ?? 5);
    const insertPayload: any = {
      ...payload,
      kode: payload.kode || payload.id_sparepart.toUpperCase(),
      nama: payload.nama || payload.nama_sparepart,
      nama_sparepart: payload.nama_sparepart,
      kategori: payload.kategori || "Umum",
      satuan: payload.satuan || "Pcs",
      harga: Number(payload.harga || 0),
      stok: stokTersedia,
      stok_tersedia: stokTersedia,
      stok_minimum: stokMin,
      status_stok:
        payload.status_stok ||
        (stokTersedia <= 0 ? "habis" : stokTersedia <= stokMin ? "menipis" : "tersedia"),
      tanggal_update: payload.tanggal_update || now,
      created_at: payload.created_at || now,
      updated_at: payload.updated_at || now,
    };
    const { data, error } = await supabase().from("sparepart").insert(insertPayload).select().single();
    if (error) throw error;
    return data;
  },

  async update(idSparepart: string, payload: Partial<SparepartRow>): Promise<SparepartRow> {
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");
    const now = new Date().toISOString();
    const updatePayload: any = {
      ...payload,
      updated_at: now,
      tanggal_update: now,
    };

    if (payload.nama !== undefined && payload.nama_sparepart === undefined) {
      updatePayload.nama_sparepart = payload.nama;
    }
    if (payload.nama_sparepart !== undefined && payload.nama === undefined) {
      updatePayload.nama = payload.nama_sparepart;
    }
    if (payload.stok !== undefined && payload.stok_tersedia === undefined) {
      updatePayload.stok_tersedia = Number(payload.stok);
    }
    if (payload.stok_tersedia !== undefined && payload.stok === undefined) {
      updatePayload.stok = Number(payload.stok_tersedia);
    }
    if (payload.harga !== undefined) {
      updatePayload.harga = Number(payload.harga);
    }
    if (updatePayload.stok !== undefined) {
      const stokMin = Number(payload.stok_minimum ?? 5);
      updatePayload.status_stok =
        updatePayload.stok <= 0 ? "habis" : updatePayload.stok <= stokMin ? "menipis" : "tersedia";
    }

    const { data, error } = await supabase()
      .from("sparepart")
      .update(updatePayload)
      .eq("id_sparepart", idSparepart)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Stock Adjustment (Tambah / Kurang / Set Stok Fisik) dengan pencatatan audit log ke riwayat_stok
  async adjustStok(params: {
    idSparepart: string;
    newStok: number;
    keterangan?: string;
    tipeAksi?: "masuk" | "keluar" | "penyesuaian";
  }): Promise<{ sparepart: SparepartRow; diff: number }> {
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");
    const parsedStok = Math.max(0, Math.round(Number(params.newStok)));
    if (!Number.isFinite(parsedStok)) throw new Error("Jumlah stok harus berupa angka valid");

    // 1. Ambil data sparepart saat ini untuk menghitung selisih
    const { data: currentPart, error: fetchErr } = await supabase()
      .from("sparepart")
      .select("*")
      .eq("id_sparepart", params.idSparepart)
      .single();
    if (fetchErr) throw fetchErr;

    const currentStok = Number(currentPart.stok_tersedia ?? currentPart.stok ?? 0);
    const diff = parsedStok - currentStok;
    const now = new Date().toISOString();
    const tgl = now.slice(0, 10);
    const stokMin = Number(currentPart.stok_minimum ?? 5);

    // 2. Update stok pada tabel master sparepart
    const { data: updatedPart, error: updateErr } = await supabase()
      .from("sparepart")
      .update({
        stok: parsedStok,
        stok_tersedia: parsedStok,
        status_stok: parsedStok <= 0 ? "habis" : parsedStok <= stokMin ? "menipis" : "tersedia",
        tanggal_update: now,
        updated_at: now,
      })
      .eq("id_sparepart", params.idSparepart)
      .select()
      .single();
    if (updateErr) throw updateErr;

    // 3. Catat audit entry ke tabel riwayat_stok jika ada perubahan
    if (diff !== 0) {
      const idRiw = `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const jenisLog = params.tipeAksi || (diff > 0 ? "masuk" : "keluar");
      const defaultKet =
        diff > 0
          ? `Penyesuaian stok masuk (+${diff}) · Total: ${parsedStok}`
          : `Penyesuaian stok keluar (${diff}) · Total: ${parsedStok}`;

      try {
        await supabase().from("riwayat_stok").insert({
          id_riwayat_stok: idRiw,
          id_riwayat: idRiw,
          id_sparepart: params.idSparepart,
          tipe: diff > 0 ? "masuk" : "keluar",
          jenis: jenisLog,
          qty: Math.abs(diff),
          jumlah: Math.abs(diff),
          tanggal: tgl,
          keterangan: params.keterangan?.trim() || defaultKet,
        });
      } catch (logErr) {
        console.warn("Gagal mencatat audit log riwayat_stok:", logErr);
      }
    }

    return { sparepart: updatedPart, diff };
  },

  async delete(idSparepart: string): Promise<{ success: boolean; softDeleted?: boolean; message?: string }> {
    if (!isSupabaseConfigured()) return { success: true };
    const { error } = await supabase().from("sparepart").delete().eq("id_sparepart", idSparepart);
    if (error) {
      // Error code 23503: foreign_key_violation
      if (error.code === "23503" || error.message?.toLowerCase().includes("foreign key")) {
        // Implementasi soft-delete: tandai status_stok menjadi habis
        try {
          await supabase()
            .from("sparepart")
            .update({
              status_stok: "habis",
              updated_at: new Date().toISOString(),
            })
            .eq("id_sparepart", idSparepart);
        } catch {}

        return {
          success: false,
          softDeleted: true,
          message:
            "Sparepart tidak dapat dihapus permanen karena masih tercatat dalam riwayat servis/pembelian. Status stok telah dinonaktifkan.",
        };
      }
      throw error;
    }
    return { success: true };
  },

  // Penggunaan sparepart (mengurangi stok dan mencatat log riwayat mutasi keluar)
  async catatPenggunaan(payload: {
    id_penggunaan_sparepart?: string;
    id_sparepart: string;
    id_servis: string;
    jumlah: number;
    workshop_id?: string;
    id_bengkel?: string;
    mekanik?: string;
    keterangan?: string;
    tanggal?: string;
    total_harga?: number;
  }): Promise<PenggunaanSparepartRow> {
    const idPembelianOrPenggunaan = payload.id_penggunaan_sparepart || crypto.randomUUID();
    const wbId = payload.workshop_id ?? payload.id_bengkel ?? "bengkel-001";
    const tgl = payload.tanggal ?? new Date().toISOString().slice(0, 10);
    const rowPayload: PenggunaanSparepartRow = {
      id_penggunaan_sparepart: idPembelianOrPenggunaan,
      id_sparepart: payload.id_sparepart,
      id_servis: payload.id_servis,
      workshop_id: wbId,
      id_bengkel: wbId,
      tanggal: tgl,
      jumlah: payload.jumlah,
      qty: payload.jumlah,
      total_harga: payload.total_harga ?? 0,
      mekanik: payload.mekanik ?? null,
      keterangan: payload.keterangan ?? null,
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      return rowPayload;
    }

    const { data, error } = await supabase()
      .from("penggunaan_sparepart")
      .insert({
        id_penggunaan_sparepart: idPembelianOrPenggunaan,
        id_sparepart: payload.id_sparepart,
        id_servis: payload.id_servis,
        tanggal: tgl,
        jumlah: payload.jumlah,
        qty: payload.jumlah,
        total_harga: payload.total_harga ?? 0,
        mekanik: payload.mekanik ?? null,
        keterangan: payload.keterangan ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    // 1. Kurangi stok di master sparepart
    try {
      const { data: sp } = await supabase()
        .from("sparepart")
        .select("stok, stok_tersedia")
        .eq("id_sparepart", payload.id_sparepart)
        .maybeSingle();

      if (sp) {
        const newStok = Math.max(0, (sp.stok ?? 0) - payload.jumlah);
        const newTersedia = Math.max(0, (sp.stok_tersedia ?? 0) - payload.jumlah);
        await supabase()
          .from("sparepart")
          .update({
            stok: newStok,
            stok_tersedia: newTersedia,
            status_stok: newStok <= 0 ? "habis" : newStok <= 5 ? "menipis" : "tersedia",
            tanggal_update: new Date().toISOString(),
          })
          .eq("id_sparepart", payload.id_sparepart);
      }
    } catch (e) {
      console.error("Gagal update stok penggunaan sparepart:", e);
    }

    // 2. Catat ke riwayat mutasi stok (Keluar)
    try {
      const idRiw = `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await supabase()
        .from("riwayat_stok")
        .insert({
          id_riwayat_stok: idRiw,
          id_riwayat: idRiw,
          id_sparepart: payload.id_sparepart,
          tipe: "keluar",
          jenis: "keluar",
          qty: payload.jumlah,
          jumlah: payload.jumlah,
          tanggal: tgl,
          keterangan: payload.keterangan || "Penggunaan operasional servis",
        });
    } catch (e) {
      console.error("Gagal catat riwayat stok keluar pemakaian:", e);
    }

    return data;
  },

  // Pembelian sparepart (otomatis menambah stok master sparepart & log riwayat mutasi masuk)
  async catatPembelian(payload: {
    id_pembelian_sparepart?: string;
    nomor_pembelian: string;
    id_sparepart: string;
    supplier: string;
    jumlah: number;
    harga: number;
    total: number;
    workshop_id?: string;
    id_bengkel?: string;
    id_supplier?: string | null;
    tanggal?: string;
    status?: "diterima" | "dibatalkan" | "retur";
  }): Promise<PembelianSparepartRow> {
    const idPembelian = payload.id_pembelian_sparepart || crypto.randomUUID();
    const wbId = payload.workshop_id ?? payload.id_bengkel ?? "bengkel-001";
    const tgl = payload.tanggal ?? new Date().toISOString().slice(0, 10);
    const rowPayload: PembelianSparepartRow = {
      id_pembelian_sparepart: idPembelian,
      id_pembelian: idPembelian,
      nomor_pembelian: payload.nomor_pembelian,
      id_sparepart: payload.id_sparepart,
      id_supplier: payload.id_supplier ?? null,
      supplier: payload.supplier,
      workshop_id: wbId,
      id_bengkel: wbId,
      tanggal: tgl,
      jumlah: payload.jumlah,
      harga: payload.harga,
      total: payload.total,
      status: payload.status ?? "diterima",
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      return rowPayload;
    }

    const { data, error } = await supabase()
      .from("pembelian_sparepart")
      .insert({
        id_pembelian_sparepart: idPembelian,
        id_pembelian: idPembelian,
        nomor_pembelian: payload.nomor_pembelian,
        id_sparepart: payload.id_sparepart,
        id_supplier: payload.id_supplier ?? null,
        supplier: payload.supplier,
        id_bengkel: wbId,
        tanggal: tgl,
        jumlah: payload.jumlah,
        harga: payload.harga,
        total: payload.total,
        status: payload.status ?? "diterima",
      })
      .select()
      .single();
    if (error) throw error;

    // Catat log riwayat mutasi stok (Masuk)
    try {
      const idRiw = `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await supabase()
        .from("riwayat_stok")
        .insert({
          id_riwayat_stok: idRiw,
          id_riwayat: idRiw,
          id_sparepart: payload.id_sparepart,
          tipe: "masuk",
          jenis: "masuk",
          qty: payload.jumlah,
          jumlah: payload.jumlah,
          tanggal: tgl,
          keterangan: `Pembelian ${payload.nomor_pembelian} · ${payload.supplier}`,
        });
    } catch (e) {
      console.error("Gagal catat riwayat stok masuk pembelian:", e);
    }

    return data;
  },

  async getRiwayatStok(idSparepart?: string): Promise<RiwayatStokRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase().from("riwayat_stok").select("*").order("tanggal", { ascending: false });
    if (idSparepart) query = query.eq("id_sparepart", idSparepart);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getPembelian(workshopId?: string): Promise<PembelianSparepartRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase()
      .from("pembelian_sparepart")
      .select("*")
      .order("tanggal", { ascending: false });
    if (workshopId) {
      query = query.eq("id_bengkel", workshopId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async updatePembelian(
    idPembelian: string,
    payload: Partial<PembelianSparepartRow>,
  ): Promise<PembelianSparepartRow> {
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");

    // Ambil data lama sebelum diupdate untuk penyesuaian selisih stok
    const { data: oldData } = await supabase()
      .from("pembelian_sparepart")
      .select("*")
      .eq("id_pembelian_sparepart", idPembelian)
      .maybeSingle();

    const { data, error } = await supabase()
      .from("pembelian_sparepart")
      .update(payload)
      .eq("id_pembelian_sparepart", idPembelian)
      .select()
      .single();
    if (error) throw error;

    // Perbarui catatan di riwayat_stok jika ada perubahan
    if (oldData && (payload.jumlah !== undefined || payload.id_sparepart !== undefined || payload.tanggal || payload.supplier)) {
      const newPartId = payload.id_sparepart || oldData.id_sparepart;
      const newJumlah = payload.jumlah !== undefined ? Number(payload.jumlah) : Number(oldData.jumlah || 0);
      if (oldData.nomor_pembelian) {
        await supabase()
          .from("riwayat_stok")
          .update({
            id_sparepart: newPartId,
            jumlah: newJumlah,
            qty: newJumlah,
            ...(payload.tanggal ? { tanggal: payload.tanggal } : {}),
            keterangan: `Pembelian ${oldData.nomor_pembelian} · ${payload.supplier || oldData.supplier}`,
          })
          .ilike("keterangan", `%${oldData.nomor_pembelian}%`);
      }
    }

    return data;
  },

  async deletePembelian(idPembelian: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { data: oldData } = await supabase()
      .from("pembelian_sparepart")
      .select("*")
      .eq("id_pembelian_sparepart", idPembelian)
      .maybeSingle();

    if (oldData && oldData.nomor_pembelian) {
      // Bersihkan riwayat mutasi stok terkait nomor pembelian ini
      await supabase()
        .from("riwayat_stok")
        .delete()
        .ilike("keterangan", `%${oldData.nomor_pembelian}%`);
    }

    const { error } = await supabase()
      .from("pembelian_sparepart")
      .delete()
      .eq("id_pembelian_sparepart", idPembelian);
    if (error) throw error;
  },

  async getPenggunaan(): Promise<PenggunaanSparepartRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase()
      .from("penggunaan_sparepart")
      .select("*")
      .order("tanggal", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async catatStokOpname(payload: {
    keterangan: string;
    total_item: number;
    selisih_total: number;
    workshop_id?: string;
    id_bengkel?: string;
  }): Promise<StokOpnameRow> {
    if (!isSupabaseConfigured()) {
      return {
        id_stok_opname: crypto.randomUUID(),
        workshop_id: payload.workshop_id ?? payload.id_bengkel ?? "bengkel-001",
        id_bengkel: payload.id_bengkel ?? payload.workshop_id ?? "bengkel-001",
        tanggal: new Date().toISOString().slice(0, 10),
        keterangan: payload.keterangan,
        total_item: payload.total_item,
        selisih_total: payload.selisih_total,
        created_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase().from("stok_opname").insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async catatRetur(payload: {
    id_retur_sparepart?: string;
    nomor_retur?: string;
    workshop_id?: string;
    id_bengkel?: string;
    id_supplier?: string | null;
    supplier?: string;
    id_pembelian_sparepart?: string | null;
    nomor_pembelian?: string;
    id_sparepart: string;
    nama_sparepart?: string;
    jumlah: number;
    harga_satuan?: number;
    total_nilai?: number;
    tanggal?: string;
    alasan: string;
    alasan_detail?: string | null;
    alasan_penolakan?: string | null;
    keterangan?: string | null;
    status?: StatusReturDb;
    stok_dikurangi?: boolean;
    riwayat_stok_id?: string | null;
  }): Promise<ReturSparepartRow> {
    const idRetur = payload.id_retur_sparepart || crypto.randomUUID();
    const tgl = payload.tanggal || new Date().toISOString().slice(0, 10);
    const initialStatus = payload.status ?? "Diajukan";
    const wbId = payload.workshop_id || payload.id_bengkel || "bengkel-001";

    if (!isSupabaseConfigured()) {
      return {
        id_retur_sparepart: idRetur,
        nomor_retur: payload.nomor_retur ?? null,
        workshop_id: wbId,
        id_bengkel: wbId,
        id_supplier: payload.id_supplier ?? null,
        supplier: payload.supplier ?? null,
        id_pembelian_sparepart: payload.id_pembelian_sparepart ?? null,
        nomor_pembelian: payload.nomor_pembelian ?? null,
        id_sparepart: payload.id_sparepart,
        nama_sparepart: payload.nama_sparepart ?? null,
        jumlah: payload.jumlah,
        harga_satuan: payload.harga_satuan ?? 0,
        total_nilai: payload.total_nilai ?? 0,
        tanggal: tgl,
        alasan: payload.alasan,
        alasan_detail: payload.alasan_detail ?? null,
        alasan_penolakan: payload.alasan_penolakan ?? null,
        keterangan: payload.keterangan ?? null,
        status: initialStatus,
        stok_dikurangi: payload.stok_dikurangi ?? false,
        riwayat_stok_id: payload.riwayat_stok_id ?? null,
        created_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase()
      .from("retur_sparepart")
      .insert({
        id_retur_sparepart: idRetur,
        nomor_retur: payload.nomor_retur,
        workshop_id: wbId,
        id_bengkel: wbId,
        id_supplier: payload.id_supplier,
        supplier: payload.supplier,
        id_pembelian_sparepart: payload.id_pembelian_sparepart,
        nomor_pembelian: payload.nomor_pembelian,
        id_sparepart: payload.id_sparepart,
        jumlah: payload.jumlah,
        harga_satuan: payload.harga_satuan,
        total_nilai: payload.total_nilai,
        tanggal: tgl,
        alasan: payload.alasan,
        alasan_detail: payload.alasan_detail,
        alasan_penolakan: payload.alasan_penolakan,
        keterangan: payload.keterangan,
        status: initialStatus,
        stok_dikurangi: payload.stok_dikurangi ?? false,
        riwayat_stok_id: payload.riwayat_stok_id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatusRetur(
    idRetur: string,
    status: StatusReturDb,
    alasanPenolakan?: string | null,
    stokDikurangi?: boolean,
    riwayatStokId?: string | null,
  ): Promise<ReturSparepartRow> {
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");

    // Ambil data retur saat ini
    const { data: currentRetur } = await supabase()
      .from("retur_sparepart")
      .select("*")
      .eq("id_retur_sparepart", idRetur)
      .maybeSingle();

    const isApprovalState =
      status === "Disetujui" || status === "Selesai" || status === "Barang Dikirim";
    const needsStockDeduction =
      isApprovalState &&
      (!currentRetur?.stok_dikurangi || stokDikurangi === true);

    let finalRiwayatId = riwayatStokId ?? currentRetur?.riwayat_stok_id ?? null;

    if (needsStockDeduction && currentRetur && !currentRetur.stok_dikurangi) {
      const partId = currentRetur.id_sparepart;
      const qtyRetur = Number(currentRetur.jumlah || 1);
      finalRiwayatId = finalRiwayatId || `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // 1. Kurangi stok fisik sparepart
      try {
        const { data: sp } = await supabase()
          .from("sparepart")
          .select("stok, stok_tersedia")
          .eq("id_sparepart", partId)
          .maybeSingle();

        if (sp) {
          const newStok = Math.max(0, (sp.stok ?? 0) - qtyRetur);
          const newTersedia = Math.max(0, (sp.stok_tersedia ?? 0) - qtyRetur);
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
      } catch (e) {
        console.error("Gagal mengurangi stok master saat retur disetujui:", e);
      }

      // 2. Catat log mutasi pengembalian barang (Keluar)
      try {
        await supabase()
          .from("riwayat_stok")
          .insert({
            id_riwayat_stok: finalRiwayatId,
            id_riwayat: finalRiwayatId,
            id_sparepart: partId,
            tipe: "keluar",
            jenis: "keluar",
            qty: qtyRetur,
            jumlah: qtyRetur,
            tanggal: currentRetur.tanggal || new Date().toISOString().slice(0, 10),
            keterangan: `Retur ${currentRetur.nomor_retur || idRetur} (${currentRetur.supplier || "Supplier"}) · ${currentRetur.alasan}`,
          });
      } catch (e) {
        console.error("Gagal mencatat mutasi stok keluar retur:", e);
      }
    }

    const updatePayload: Partial<ReturSparepartRow> = { status };
    if (alasanPenolakan !== undefined) updatePayload.alasan_penolakan = alasanPenolakan;
    if (needsStockDeduction) updatePayload.stok_dikurangi = true;
    else if (stokDikurangi !== undefined) updatePayload.stok_dikurangi = stokDikurangi;
    if (finalRiwayatId) updatePayload.riwayat_stok_id = finalRiwayatId;

    const { data, error } = await supabase()
      .from("retur_sparepart")
      .update(updatePayload)
      .eq("id_retur_sparepart", idRetur)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async catatRiwayatStok(payload: {
    id_riwayat_stok?: string;
    id_sparepart: string;
    workshop_id?: string;
    id_bengkel?: string;
    jenis: "masuk" | "keluar" | "Masuk" | "Keluar";
    jumlah: number;
    tanggal?: string;
    keterangan?: string | null;
  }): Promise<RiwayatStokRow> {
    const jenisDb: "masuk" | "keluar" =
      payload.jenis.toLowerCase() === "keluar" ? "keluar" : "masuk";
    const wbId = payload.workshop_id || payload.id_bengkel || "bengkel-001";
    const insertPayload = {
      id_riwayat_stok:
        payload.id_riwayat_stok || `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      id_sparepart: payload.id_sparepart,
      workshop_id: wbId,
      id_bengkel: wbId,
      jenis: jenisDb,
      jumlah: payload.jumlah,
      tanggal: payload.tanggal || new Date().toISOString().slice(0, 10),
      keterangan: payload.keterangan ?? null,
    };
    if (!isSupabaseConfigured()) {
      return {
        ...insertPayload,
        created_at: new Date().toISOString(),
      } as RiwayatStokRow;
    }
    const { data, error } = await supabase()
      .from("riwayat_stok")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getRetur(workshopId?: string): Promise<ReturSparepartRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase()
      .from("retur_sparepart")
      .select("*")
      .order("created_at", { ascending: false });
    if (workshopId) {
      query = query.or(`workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },
};

// ----------------------------------------------------------------------------
// 6. PEMBAYARAN SERVICE
// ----------------------------------------------------------------------------
const LOCAL_ACCOUNTS_KEY = "appbenk_workshop_payment_accounts";

let isTableAvailable = true;
let isStorageBucketAvailable = true;

function safeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getLocalAccounts(workshopId?: string): WorkshopPaymentAccountRow[] {
  const wbId = workshopId || "bengkel-001";
  // Default demo accounts for bengkel-001
  const defaults: WorkshopPaymentAccountRow[] = [
    {
      id: "acc-bank-001",
      workshop_id: "bengkel-001",
      id_bengkel: "bengkel-001",
      account_type: "bank_transfer",
      provider: "MANUAL",
      provider_account_id: "bca-001",
      bank_name: "BCA",
      account_number: "8735091234",
      account_holder_name: "PT AppBenk Motor Pusat",
      qr_image_url: null,
      display_name: "Rekening Utama Bengkel (BCA)",
      is_active: true,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "acc-bank-002",
      workshop_id: "bengkel-001",
      id_bengkel: "bengkel-001",
      account_type: "bank_transfer",
      provider: "MANUAL",
      provider_account_id: "mandiri-001",
      bank_name: "Bank Mandiri",
      account_number: "1370019882231",
      account_holder_name: "AppBenk Motor Pusat",
      qr_image_url: null,
      display_name: "Rekening Operasional (Mandiri)",
      is_active: true,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "acc-qris-001",
      workshop_id: "bengkel-001",
      id_bengkel: "bengkel-001",
      account_type: "qris",
      provider: "MANUAL",
      provider_account_id: "qris-001",
      bank_name: null,
      account_number: null,
      account_holder_name: null,
      qr_image_url: null,
      display_name: "QRIS Standar Nasional AppBenk Motor",
      is_active: true,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  let currentList: WorkshopPaymentAccountRow[] = defaults;
  if (typeof window !== "undefined") {
    try {
      const existing = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentList = parsed;
        }
      } else {
        localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(defaults));
      }
    } catch {}

    // Sinkronkan QRIS spesifik dari appbenk_qris_active_${workshopId} dan appbenk_qris_image_data_${workshopId} jika ada
    try {
      const wsRaw = workshopId ? localStorage.getItem(`appbenk_qris_active_${workshopId}`) : null;
      const wsImg = workshopId ? localStorage.getItem(`appbenk_qris_image_data_${workshopId}`) : null;
      const directQrisRaw = wsRaw || (workshopId ? null : localStorage.getItem("appbenk_qris_active"));
      const fallbackImage = wsImg || (workshopId ? null : localStorage.getItem("appbenk_qris_image_data"));
      let qrisObj = directQrisRaw ? JSON.parse(directQrisRaw) : null;

      if (!qrisObj && fallbackImage) {
        qrisObj = {
          id: `acc-qris-${wbId}`,
          workshop_id: wbId,
          id_bengkel: wbId,
          account_type: "qris",
          provider: "MANUAL",
          provider_account_id: "qris-manual",
          qr_image_url: fallbackImage,
          display_name: "QRIS Bengkel",
          is_active: true,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else if (qrisObj && fallbackImage && !qrisObj.qr_image_url) {
        qrisObj.qr_image_url = fallbackImage;
      }

      if (qrisObj) {
        const targetWb = qrisObj.workshop_id || qrisObj.id_bengkel || wbId;
        const withoutQris = currentList.filter(
          (a) => !(a.account_type === "qris" && (a.workshop_id === targetWb || a.id_bengkel === targetWb))
        );
        const existingQris = currentList.find(
          (a) => a.account_type === "qris" && (a.workshop_id === targetWb || a.id_bengkel === targetWb)
        );

        const existingTime = existingQris ? new Date(existingQris.updated_at || existingQris.created_at || 0).getTime() : 0;
        const qrisObjTime = new Date(qrisObj.updated_at || qrisObj.created_at || 0).getTime();

        let mergedQris: WorkshopPaymentAccountRow;
        if (existingQris && existingTime > qrisObjTime && existingQris.qr_image_url) {
          mergedQris = existingQris;
        } else {
          mergedQris = {
            ...(existingQris || defaults.find((d) => d.account_type === "qris")!),
            ...qrisObj,
            account_type: "qris",
            workshop_id: targetWb,
            id_bengkel: targetWb,
          };
        }
        currentList = [...withoutQris, mergedQris];
      }
    } catch {}
  }

  if (workshopId) {
    return currentList.filter(
      (a) => a.workshop_id === workshopId || a.id_bengkel === workshopId,
    );
  }
  return currentList;
}

export function saveLocalAccount(item: WorkshopPaymentAccountRow) {
  try {
    const list = getLocalAccounts();
    const wbId = item.workshop_id || item.id_bengkel || "bengkel-001";
    if (item.account_type === "qris") {
      // Hapus entri QRIS lama untuk workshop ini dan masukkan entri terbaru
      const withoutQris = list.filter(
        (a) => !(a.account_type === "qris" && (a.workshop_id === wbId || a.id_bengkel === wbId))
      );
      withoutQris.push(item);
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(withoutQris));
      localStorage.setItem("appbenk_qris_active", JSON.stringify(item));
      localStorage.setItem(`appbenk_qris_active_${wbId}`, JSON.stringify(item));
      if (item.id_bengkel && item.id_bengkel !== wbId) {
        localStorage.setItem(`appbenk_qris_active_${item.id_bengkel}`, JSON.stringify(item));
      }
      if (item.qr_image_url) {
        localStorage.setItem("appbenk_qris_image_data", item.qr_image_url);
        localStorage.setItem(`appbenk_qris_image_data_${wbId}`, item.qr_image_url);
        if (item.id_bengkel && item.id_bengkel !== wbId) {
          localStorage.setItem(`appbenk_qris_image_data_${item.id_bengkel}`, item.qr_image_url);
        }
      }
    } else {
      const idx = list.findIndex((a) => a.id === item.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item };
      } else {
        list.push(item);
      }
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(list));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("appbenk_payment_accounts_updated", { detail: item }),
      );
    }
  } catch {}
}

function toggleLocalAccountActive(id: string, isActive: boolean) {
  try {
    const list = getLocalAccounts();
    const acc = list.find((a) => a.id === id);
    if (acc) {
      acc.is_active = isActive;
      acc.updated_at = new Date().toISOString();
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(list));
      if (acc.account_type === "qris") {
        const wbId = acc.workshop_id || acc.id_bengkel || "bengkel-001";
        localStorage.setItem("appbenk_qris_active", JSON.stringify(acc));
        localStorage.setItem(`appbenk_qris_active_${wbId}`, JSON.stringify(acc));
        if (acc.id_bengkel && acc.id_bengkel !== wbId) {
          localStorage.setItem(`appbenk_qris_active_${acc.id_bengkel}`, JSON.stringify(acc));
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("appbenk_payment_accounts_updated", { detail: acc }),
        );
      }
    }
  } catch {}
}

function deleteLocalAccount(id: string) {
  try {
    const list = getLocalAccounts();
    const target = list.find((a) => a.id === id);
    const filtered = list.filter((a) => a.id !== id);
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(filtered));
    if (target?.account_type === "qris") {
      const wbId = target.workshop_id || target.id_bengkel || "bengkel-001";
      localStorage.removeItem(`appbenk_qris_active_${wbId}`);
      localStorage.removeItem(`appbenk_qris_image_data_${wbId}`);
      localStorage.removeItem("appbenk_qris_active");
      localStorage.removeItem("appbenk_qris_image_data");
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("appbenk_payment_accounts_updated", { detail: { id, deleted: true } }),
      );
    }
  } catch {}
}

export const workshopPaymentAccountsService = {
  async getAll(workshopId?: string): Promise<WorkshopPaymentAccountRow[]> {
    if (!isSupabaseConfigured() || !isTableAvailable) return getLocalAccounts(workshopId);
    try {
      let query = supabase()
        .from("workshop_payment_accounts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (workshopId) {
        query = query.or(`workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId}`);
      }
      const { data, error } = await query;
      if (error) {
        if (error.code === "PGRST205" || (error as any).code === "42P01") {
          isTableAvailable = false;
        }
        return getLocalAccounts(workshopId);
      }
      if (data && data.length > 0) {
        try {
          localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(data));
        } catch {}
        return data as WorkshopPaymentAccountRow[];
      }
      // Supabase kosong untuk workshopId ini — STRICT: jangan pernah ambil akun workshop lain!
      // Coba periksa apakah server backend memiliki file QRIS untuk bengkel ini
      if (workshopId) {
        try {
          const srvRes = await fetch(`/api/workshop/qris?id_bengkel=${encodeURIComponent(workshopId)}`);
          if (srvRes.ok) {
            const srvData = await srvRes.json();
            if (srvData?.ok && srvData?.qris_url) {
              const serverQris: WorkshopPaymentAccountRow = {
                id: `qris-${workshopId}`,
                workshop_id: workshopId,
                id_bengkel: workshopId,
                account_type: "qris",
                provider: "MANUAL",
                provider_account_id: "qris-manual",
                qr_image_url: srvData.qris_url,
                display_name: "QRIS Bengkel",
                is_active: srvData.is_active ?? true,
                status: "active",
                created_at: srvData.updated_at || new Date().toISOString(),
                updated_at: srvData.updated_at || new Date().toISOString(),
              };
              saveLocalAccount(serverQris);
              return [serverQris];
            }
          }
        } catch {}
      }
      // Fallback ke localStorage terisolasi workshopId
      return getLocalAccounts(workshopId);
    } catch {
      return getLocalAccounts(workshopId);
    }
  },

  async getActive(workshopId?: string): Promise<WorkshopPaymentAccountRow[]> {
    const list = await this.getAll(workshopId);
    return list.filter((a) => a.is_active);
  },

  async saveAccount(account: Partial<WorkshopPaymentAccountRow> & {
    workshop_id: string;
    account_type: PaymentAccountType;
  }): Promise<WorkshopPaymentAccountRow> {
    const wbId = account.workshop_id || "bengkel-001";
    const now = new Date().toISOString();

    const isValidUUID = (id?: string) =>
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    const hasValidUuid = isValidUUID(account.id);
    const targetId = hasValidUuid ? account.id! : safeUUID();

    const item: WorkshopPaymentAccountRow = {
      id: targetId,
      workshop_id: wbId,
      id_bengkel: wbId,
      account_type: account.account_type,
      provider: account.provider || (account.account_type === "qris" ? "QRIS_MANUAL" : "MANUAL"),
      provider_account_id: account.provider_account_id || (account.account_type === "qris" ? "qris-manual" : "manual"),
      bank_name: account.bank_name ?? null,
      account_number: account.account_number ?? null,
      account_holder_name: account.account_holder_name ?? null,
      qr_image_url: account.qr_image_url ?? null,
      display_name: account.display_name ?? null,
      is_active: account.is_active ?? true,
      status: account.status || "active",
      created_at: account.created_at || now,
      updated_at: now,
    };

    saveLocalAccount(item);

    if (isSupabaseConfigured() && isTableAvailable) {
      try {
        let existingId: string | null = null;

        // Untuk QRIS, cari apakah sudah ada row QRIS di Supabase untuk bengkel ini
        if (account.account_type === "qris") {
          const { data: existingQris, error: selErr } = await supabase()
            .from("workshop_payment_accounts")
            .select("id")
            .eq("account_type", "qris")
            .or(`workshop_id.eq.${wbId},id_bengkel.eq.${wbId}`)
            .limit(1)
            .maybeSingle();

          if (selErr && (selErr.code === "PGRST205" || (selErr as any).code === "42P01")) {
            isTableAvailable = false;
          } else if (existingQris?.id) {
            existingId = existingQris.id;
          }
        } else if (hasValidUuid) {
          existingId = account.id!;
        }

        if (isTableAvailable) {
          if (existingId) {
            item.id = existingId;
            const { data, error } = await supabase()
              .from("workshop_payment_accounts")
              .update(item)
              .eq("id", existingId)
              .select()
              .single();
            if (!error && data) {
              saveLocalAccount(data as WorkshopPaymentAccountRow);
              return data as WorkshopPaymentAccountRow;
            } else if (error && (error.code === "PGRST205" || (error as any).code === "42P01")) {
              isTableAvailable = false;
            }
          } else {
            const { data, error } = await supabase()
              .from("workshop_payment_accounts")
              .insert(item)
              .select()
              .single();
            if (!error && data) {
              saveLocalAccount(data as WorkshopPaymentAccountRow);
              return data as WorkshopPaymentAccountRow;
            } else if (error && (error.code === "PGRST205" || (error as any).code === "42P01")) {
              isTableAvailable = false;
            }
          }
        }

        if (account.account_type === "qris" && item.qr_image_url) {
          try {
            await supabase()
              .from("bengkel")
              .update({
                qris_image_url: item.qr_image_url,
                updated_at: now,
              } as any)
              .eq("id_bengkel", wbId);
          } catch {}
        }
      } catch (err: any) {
        console.warn("Supabase saveAccount fallback to local:", err.message);
      }
    }
    return item;
  },

  async toggleActive(id: string, isActive: boolean): Promise<boolean> {
    toggleLocalAccountActive(id, isActive);
    if (isSupabaseConfigured() && isTableAvailable) {
      try {
        await supabase()
          .from("workshop_payment_accounts")
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq("id", id);
      } catch {}
    }
    return true;
  },

  async deleteAccount(id: string): Promise<boolean> {
    deleteLocalAccount(id);
    if (isSupabaseConfigured() && isTableAvailable) {
      try {
        await supabase().from("workshop_payment_accounts").delete().eq("id", id);
      } catch {}
    }
    return true;
  },
};

export const storagePaymentService = {
  async uploadQRIS(workshopId: string, file: File): Promise<string> {
    const wbId = workshopId || "bengkel-001";
    const ext = file.name.split(".").pop() || "png";

    // 1. Coba upload via endpoint backend /api/upload/qris (paling stabil & terisolasi per-workshop)
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workshop_id", wbId);
      formData.append("id_bengkel", wbId);

      const res = await fetch("/api/upload/qris", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.ok && json?.url) {
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`appbenk_qris_image_data_${wbId}`, json.url);
            } catch {}
          }
          return json.url;
        }
      }
    } catch (err) {
      console.warn("Upload via /api/upload/qris failed, trying bucket/canvas fallback:", err);
    }

    const path = `${wbId}/qris/${Date.now()}-${safeUUID().slice(0, 6)}.${ext}`;

    if (isSupabaseConfigured() && isStorageBucketAvailable) {
      try {
        const uploadPromise = supabase()
          .storage
          .from("payment-assets")
          .upload(path, file, { upsert: true, contentType: file.type || "image/png" });

        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error("Storage timeout") }), 2000),
        );

        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

        if (!error && data?.path) {
          const { data: urlData } = supabase()
            .storage
            .from("payment-assets")
            .getPublicUrl(data.path);
          if (urlData?.publicUrl) {
            return urlData.publicUrl;
          }
        } else {
          isStorageBucketAvailable = false;
        }
      } catch (err) {
        isStorageBucketAvailable = false;
        console.warn("Upload payment-assets fallback to optimized data URL:", err);
      }
    }

    // Optimasi gambar ke Data URL dengan background putih (agar PNG transparan tidak menjadi hitam)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) {
          resolve("");
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxDim = 600;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const optimized = canvas.toDataURL("image/jpeg", 0.85);

            // Sync ke server backend juga secara async
            try {
              fetch("/api/upload/qris", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workshop_id: wbId, id_bengkel: wbId, image: optimized }),
              }).catch(() => {});
            } catch {}

            resolve(optimized);
          } else {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  },

  async uploadBuktiPembayaran(workshopId: string, nomorTransaksi: string, file: File | Blob, customFileName?: string): Promise<string> {
    const wbId = workshopId || "bengkel-001";
    const safeTrx = (nomorTransaksi || "TRX").replace(/[^a-zA-Z0-9_-]/g, "_");
    const origName = (file as any)?.name || customFileName || "bukti.jpg";
    const ext = origName.split(".").pop() || "jpg";

    // 1. Coba upload via endpoint backend /api/upload/bukti jika tersedia di environment browser
    if (typeof window !== "undefined") {
      try {
        const formData = new FormData();
        formData.append("file", file, origName);
        formData.append("workshop_id", wbId);
        formData.append("id_bengkel", wbId);
        formData.append("no_transaksi", safeTrx);

        const res = await fetch("/api/upload/bukti", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.url) {
            return json.url;
          }
        }
      } catch (err) {
        console.warn("Upload via /api/upload/bukti failed, trying storage bucket/data URL:", err);
      }
    }

    const path = `${wbId}/payments/${safeTrx}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase()
          .storage
          .from("payment-assets")
          .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });

        if (!error && data?.path) {
          const { data: urlData } = supabase()
            .storage
            .from("payment-assets")
            .getPublicUrl(data.path);
          if (urlData?.publicUrl) {
            return urlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn("Upload storage bukti pembayaran fallback to data URL:", err);
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};

export const notificationLogService = {
  async log(payload: {
    workshop_id?: string | null;
    id_bengkel?: string | null;
    user_id?: string | null;
    channel?: "EMAIL" | "WHATSAPP" | "IN_APP" | "in_app";
    type: string;
    recipient: string;
    subject?: string | null;
    message: string;
    status?: string;
  }): Promise<NotificationLogRow> {
    const wbId = payload.workshop_id || payload.id_bengkel || "bengkel-001";
    const newLog: NotificationLogRow = {
      id: crypto.randomUUID(),
      workshop_id: wbId,
      id_bengkel: wbId,
      user_id: payload.user_id ?? null,
      channel: payload.channel || "in_app",
      type: payload.type,
      recipient: payload.recipient,
      subject: payload.subject ?? null,
      message: payload.message,
      status: payload.status || "sent",
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase()
          .from("notification_logs")
          .insert(newLog)
          .select()
          .single();
        if (!error && data) return data as NotificationLogRow;
      } catch (err) {
        console.warn("notification_logs insert failed:", err);
      }
    }
    return newLog;
  },

  async getAll(workshopId?: string, userId?: string): Promise<NotificationLogRow[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      let query = supabase().from("notification_logs").select("*").order("created_at", { ascending: false });
      if (workshopId) {
        query = query.or(`workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId}`);
      }
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query;
      if (error) return [];
      return (data as NotificationLogRow[]) ?? [];
    } catch {
      return [];
    }
  },
};

function getLocalNotifikasiList(): NotifikasiRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("appbenk.data.notifikasi_db");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalNotifikasiList(list: NotifikasiRow[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("appbenk.data.notifikasi_db", JSON.stringify(list.slice(0, 100)));
  } catch {}
}

export const notifikasiService = {
  async getForUser(params: {
    userId?: string;
    bengkelId?: string;
    role?: string;
  }): Promise<NotifikasiRow[]> {
    if (!isSupabaseConfigured()) {
      return this.getLocalFiltered(params);
    }
    try {
      let query = supabase()
        .from("notifikasi")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (params.userId) {
        if (params.bengkelId && (params.role === "admin" || params.role === "owner")) {
          query = query.or(`user_id.eq.${params.userId},bengkel_id.eq.${params.bengkelId},user_id.is.null`);
        } else {
          query = query.eq("user_id", params.userId);
        }
      } else if (params.bengkelId) {
        query = query.eq("bengkel_id", params.bengkelId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Gagal fetch notifikasi dari Supabase, fallback lokal:", error.message);
        return this.getLocalFiltered(params);
      }
      return (data as NotifikasiRow[]) ?? [];
    } catch (err) {
      console.warn("Exception getForUser notifikasi:", err);
      return this.getLocalFiltered(params);
    }
  },

  getLocalFiltered(params: { userId?: string; bengkelId?: string; role?: string }): NotifikasiRow[] {
    const list = getLocalNotifikasiList();
    return list.filter((n) => {
      if (params.userId && n.user_id === params.userId) return true;
      if (params.bengkelId && n.bengkel_id === params.bengkelId) {
        if (params.role === "admin" || params.role === "owner") return true;
      }
      if (!n.user_id && !n.bengkel_id) return true;
      return false;
    });
  },

  async create(payload: {
    user_id?: string | null;
    bengkel_id?: string | null;
    judul: string;
    pesan: string;
    tipe: TipeNotifikasi;
    tautan_url?: string | null;
  }): Promise<NotifikasiRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newRow: NotifikasiRow = {
      id,
      user_id: payload.user_id ?? (null as any),
      bengkel_id: payload.bengkel_id ?? null,
      judul: payload.judul,
      pesan: payload.pesan,
      tipe: payload.tipe,
      tautan_url: payload.tautan_url ?? null,
      is_read: false,
      created_at: now,
    };

    // Save to local fallback
    const currentList = getLocalNotifikasiList();
    saveLocalNotifikasiList([newRow, ...currentList]);

    if (!isSupabaseConfigured()) {
      return newRow;
    }

    try {
      const { data, error } = await supabase()
        .from("notifikasi")
        .insert({
          id,
          user_id: payload.user_id ?? null,
          bengkel_id: payload.bengkel_id ?? null,
          judul: payload.judul,
          pesan: payload.pesan,
          tipe: payload.tipe,
          tautan_url: payload.tautan_url ?? null,
          is_read: false,
          created_at: now,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.warn("Gagal insert notifikasi ke Supabase (fallback aktif):", error.message);
        return newRow;
      }
      return (data as NotifikasiRow) ?? newRow;
    } catch (err) {
      console.warn("Exception create notifikasi:", err);
      return newRow;
    }
  },

  async markAsRead(id: string): Promise<void> {
    const list = getLocalNotifikasiList();
    saveLocalNotifikasiList(list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));

    if (!isSupabaseConfigured()) return;
    try {
      await supabase().from("notifikasi").update({ is_read: true }).eq("id", id);
    } catch (err) {
      console.warn("Exception markAsRead notifikasi:", err);
    }
  },

  async markAllAsRead(params: { userId?: string; bengkelId?: string; role?: string }): Promise<void> {
    const list = getLocalNotifikasiList();
    saveLocalNotifikasiList(
      list.map((n) => {
        let match = false;
        if (params.userId && n.user_id === params.userId) match = true;
        if (params.bengkelId && n.bengkel_id === params.bengkelId && (params.role === "admin" || params.role === "owner")) match = true;
        if (!params.userId && !params.bengkelId) match = true;
        return match ? { ...n, is_read: true } : n;
      }),
    );

    if (!isSupabaseConfigured()) return;
    try {
      let query = supabase().from("notifikasi").update({ is_read: true }).eq("is_read", false);
      if (params.userId) {
        if (params.bengkelId && (params.role === "admin" || params.role === "owner")) {
          query = query.or(`user_id.eq.${params.userId},bengkel_id.eq.${params.bengkelId}`);
        } else {
          query = query.eq("user_id", params.userId);
        }
      } else if (params.bengkelId) {
        query = query.eq("bengkel_id", params.bengkelId);
      }
      await query;
    } catch (err) {
      console.warn("Exception markAllAsRead notifikasi:", err);
    }
  },

  async getWorkshopStaffUserIds(bengkelId: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const uids = new Set<string>();
      const [adminsRes, ownersRes] = await Promise.allSettled([
        supabase().from("admin").select("user_id").eq("id_bengkel", bengkelId),
        supabase().from("owner").select("user_id").eq("id_bengkel", bengkelId),
      ]);

      if (adminsRes.status === "fulfilled" && adminsRes.value.data) {
        adminsRes.value.data.forEach((r: any) => {
          if (r.user_id) uids.add(r.user_id);
        });
      }
      if (ownersRes.status === "fulfilled" && ownersRes.value.data) {
        ownersRes.value.data.forEach((r: any) => {
          if (r.user_id) uids.add(r.user_id);
        });
      }
      return Array.from(uids);
    } catch {
      return [];
    }
  },

  async notifyWorkshopStaff(params: {
    bengkelId: string;
    judul: string;
    pesan: string;
    tipe: TipeNotifikasi;
    tautanUrl: string;
  }): Promise<void> {
    const staffIds = await this.getWorkshopStaffUserIds(params.bengkelId);

    // Insert broadcast row with bengkel_id
    await this.create({
      bengkel_id: params.bengkelId,
      user_id: null,
      judul: params.judul,
      pesan: params.pesan,
      tipe: params.tipe,
      tautan_url: params.tautanUrl,
    });

    // Also insert specifically for each staff member user_id
    for (const uid of staffIds) {
      await this.create({
        bengkel_id: params.bengkelId,
        user_id: uid,
        judul: params.judul,
        pesan: params.pesan,
        tipe: params.tipe,
        tautan_url: params.tautanUrl,
      });
    }
  },

  async notifyCustomer(params: {
    userId?: string | null;
    customerId?: string | null;
    bengkelId?: string | null;
    judul: string;
    pesan: string;
    tipe: TipeNotifikasi;
    tautanUrl: string;
  }): Promise<void> {
    let targetUserId = params.userId;
    if (!targetUserId && params.customerId) {
      try {
        const pel = await pelangganService.getById(params.customerId);
        if (pel?.user_id) {
          targetUserId = pel.user_id;
        }
      } catch {}
    }

    await this.create({
      user_id: targetUserId ?? null,
      bengkel_id: params.bengkelId ?? null,
      judul: params.judul,
      pesan: params.pesan,
      tipe: params.tipe,
      tautan_url: params.tautanUrl,
    });
  },
};


export const pembayaranService = {
  async getAll(workshopId?: string): Promise<PembayaranRow[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const query = supabase()
        .from("pembayaran")
        .select("*, servis(id_bengkel, nomor_servis, total_biaya, pelanggan(nama, no_hp, email), kendaraan(merk, tipe, nopol))")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) {
        const { data: fallbackData } = await supabase()
          .from("pembayaran")
          .select("*")
          .order("created_at", { ascending: false });
        let list = (fallbackData as PembayaranRow[]) ?? [];
        if (workshopId) {
          list = list.filter((r: any) => (r.id_bengkel || r.workshop_id) === workshopId);
        }
        return list;
      }

      let rows = (data as any[]) ?? [];
      if (workshopId) {
        rows = rows.filter((r) => {
          const wb = r.id_bengkel || r.workshop_id || r.servis?.id_bengkel;
          return wb === workshopId;
        });
      }

      return rows.map((r) => ({
        ...r,
        id_bengkel: r.id_bengkel || r.servis?.id_bengkel || null,
        workshop_id: r.workshop_id || r.servis?.id_bengkel || null,
      })) as PembayaranRow[];
    } catch {
      return [];
    }
  },

  async getByServis(idServis: string): Promise<PembayaranRow | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase()
        .from("pembayaran")
        .select("*, servis(id_bengkel, nomor_servis, total_biaya, pelanggan(nama, no_hp, email), kendaraan(merk, tipe, nopol))")
        .eq("id_servis", idServis)
        .maybeSingle();
      if (error || !data) return null;
      return {
        ...data,
        id_bengkel: (data as any).id_bengkel || (data as any).servis?.id_bengkel || null,
        workshop_id: (data as any).workshop_id || (data as any).servis?.id_bengkel || null,
      } as PembayaranRow;
    } catch {
      return null;
    }
  },

  async create(payload: {
    nomor_transaksi: string;
    id_servis: string;
    id_pelanggan: string;
    workshop_id?: string;
    id_bengkel?: string;
    metode_pembayaran: MetodePembayaran;
    jumlah_bayar: number;
    status_pembayaran?: StatusPembayaran;
    bukti_pembayaran?: string;
  }): Promise<PembayaranRow> {
    const wbId = payload.workshop_id || payload.id_bengkel || "bengkel-001";
    const now = new Date().toISOString();
    const metLower = (payload.metode_pembayaran || "cash").toLowerCase();
    const metDisplay = metLower === "qris" ? "QRIS" : metLower === "transfer" ? "Transfer Bank" : "Cash";
    const stLower = (payload.status_pembayaran || "belum_dibayar").toLowerCase();
    const stDisplay =
      stLower === "lunas"
        ? "Lunas"
        : stLower === "menunggu_verifikasi"
          ? "Menunggu Verifikasi"
          : stLower === "ditolak"
            ? "Bukti Ditolak"
            : "Belum Dibayar";

    if (!isSupabaseConfigured()) {
      return {
        id_pembayaran: crypto.randomUUID(),
        nomor_transaksi: payload.nomor_transaksi,
        no_transaksi: payload.nomor_transaksi,
        id_servis: payload.id_servis,
        id_pelanggan: payload.id_pelanggan,
        workshop_id: wbId,
        id_bengkel: wbId,
        metode_pembayaran: payload.metode_pembayaran,
        metode: metDisplay,
        tanggal_bayar: now,
        jumlah_bayar: payload.jumlah_bayar,
        total_bayar: payload.jumlah_bayar,
        status_pembayaran: (payload.status_pembayaran ?? "belum_dibayar") as StatusPembayaran,
        status: stDisplay,
        bukti_pembayaran: payload.bukti_pembayaran ?? null,
        bukti_url: payload.bukti_pembayaran ?? null,
        alasan_penolakan: null,
        verified_by: null,
        verified_at: null,
        created_at: now,
        updated_at: now,
      };
    }

    const insertData: any = {
      id_pembayaran: `pmb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      nomor_transaksi: payload.nomor_transaksi,
      no_transaksi: payload.nomor_transaksi,
      id_servis: payload.id_servis,
      id_pelanggan: payload.id_pelanggan,
      metode_pembayaran: metLower,
      metode: metDisplay,
      tanggal_bayar: now,
      jumlah_bayar: payload.jumlah_bayar,
      total_bayar: payload.jumlah_bayar,
      status_pembayaran: stLower,
      status: stDisplay,
      bukti_pembayaran: payload.bukti_pembayaran ?? null,
      bukti_url: payload.bukti_pembayaran ?? null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase()
      .from("pembayaran")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      id_bengkel: wbId,
      workshop_id: wbId,
    } as PembayaranRow;
  },

  async submitPembayaran(
    idServis: string,
    metode: MetodePembayaran,
    buktiUrl?: string,
  ): Promise<PembayaranRow> {
    if (metode === "transfer" && !buktiUrl) {
      throw new Error("Bukti pembayaran transfer bank wajib diunggah.");
    }
    if (metode === "qris" && !buktiUrl) {
      throw new Error("Bukti pembayaran QRIS wajib diunggah.");
    }
    if (metode === "cash") {
      buktiUrl = undefined;
    }

    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");

    // Fetch service info — pastikan kolom query ada di tabel servis
    const { data: srv, error: srvErr } = await supabase()
      .from("servis")
      .select("nomor_servis, id_pelanggan, total_biaya, id_bengkel, pelanggan(nama)")
      .eq("id_servis", idServis)
      .maybeSingle();

    if (srvErr) {
      console.warn("Gagal mengambil data servis untuk pembayaran:", srvErr);
    }

    const wbId = srv?.id_bengkel || "bengkel-001";
    const customerName = (srv?.pelanggan as any)?.nama || "Pelanggan";

    // Duplicate payment protection
    const { data: existing } = await supabase()
      .from("pembayaran")
      .select("*")
      .eq("id_servis", idServis)
      .maybeSingle();

    if (existing?.status_pembayaran === "lunas" || (existing as any)?.status === "Lunas") {
      throw new Error("Pembayaran untuk servis ini sudah lunas. Pembayaran ganda tidak diizinkan.");
    }

    const now = new Date().toISOString();
    const metLower = (metode || "cash").toLowerCase();
    const metDisplay = metLower === "qris" ? "QRIS" : metLower === "transfer" ? "Transfer Bank" : "Cash";
    const stLower = "menunggu_verifikasi";
    const stDisplay = "Menunggu Verifikasi";
    const noTrx = srv?.nomor_servis
      ? `TRX-${srv.nomor_servis.replace("SRV-", "")}`
      : `TRX-${Date.now().toString(36).toUpperCase()}`;
    const totalAmount = Number(srv?.total_biaya || 0);

    let result: PembayaranRow;

    if (existing?.id_pembayaran) {
      const updateData: any = {
        nomor_transaksi: noTrx,
        no_transaksi: noTrx,
        metode_pembayaran: metLower,
        metode: metDisplay,
        tanggal_bayar: now,
        jumlah_bayar: totalAmount,
        total_bayar: totalAmount,
        status_pembayaran: stLower,
        status: stDisplay,
        bukti_pembayaran: buktiUrl ?? null,
        bukti_url: buktiUrl ?? null,
        alasan_penolakan: null,
        updated_at: now,
      };

      const res = await supabase()
        .from("pembayaran")
        .update(updateData)
        .eq("id_pembayaran", existing.id_pembayaran)
        .select()
        .single();

      if (res.error) throw res.error;
      result = res.data as PembayaranRow;
    } else {
      const insertData: any = {
        id_pembayaran: `pmb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        nomor_transaksi: noTrx,
        no_transaksi: noTrx,
        id_servis: idServis,
        id_pelanggan: srv?.id_pelanggan,
        metode_pembayaran: metLower,
        metode: metDisplay,
        tanggal_bayar: now,
        jumlah_bayar: totalAmount,
        total_bayar: totalAmount,
        status_pembayaran: stLower,
        status: stDisplay,
        bukti_pembayaran: buktiUrl ?? null,
        bukti_url: buktiUrl ?? null,
        created_at: now,
        updated_at: now,
      };

      const res = await supabase()
        .from("pembayaran")
        .insert(insertData)
        .select()
        .single();

      if (res.error) throw res.error;
      result = res.data as PembayaranRow;
    }

    // Send in-app notification to Admin
    let notifSubject = "Pembayaran Menunggu Verifikasi";
    let notifMsg = `Pelanggan ${customerName} telah mengirim pembayaran untuk transaksi ${noTrx}.`;
    if (metLower === "qris") {
      notifSubject = "Pembayaran QRIS Menunggu Verifikasi";
      notifMsg = `Pelanggan ${customerName} telah mengirim bukti pembayaran QRIS untuk transaksi ${noTrx}.`;
    } else if (metLower === "transfer") {
      notifSubject = "Pembayaran Transfer Menunggu Verifikasi";
      notifMsg = `Pelanggan ${customerName} telah mengirim bukti transfer untuk transaksi ${noTrx}.`;
    } else if (metLower === "cash") {
      notifSubject = "Pembayaran Cash Menunggu Verifikasi";
      notifMsg = `Pelanggan ${customerName} telah mengonfirmasi pembayaran secara tunai untuk transaksi ${noTrx}.`;
    }

    try {
      await notificationLogService.log({
        workshop_id: wbId,
        id_bengkel: wbId,
        channel: "in_app",
        type: "pembayaran",
        recipient: "admin",
        subject: notifSubject,
        message: notifMsg,
        status: "sent",
      });
      await notifikasiService.notifyWorkshopStaff({
        bengkelId: wbId,
        judul: notifSubject,
        pesan: `Pembayaran baru (${noTrx}) menunggu verifikasi.`,
        tipe: "pembayaran",
        tautanUrl: `/admin/pembayaran?filter=menunggu_verifikasi&trx=${noTrx}`,
      });
    } catch {}

    return {
      ...result,
      id_bengkel: wbId,
      workshop_id: wbId,
    };
  },

  async verifikasiPembayaran(
    idServis: string,
    disetujui: boolean,
    alasan?: string,
    verifiedBy?: string,
  ): Promise<PembayaranRow> {
    if (!disetujui && !alasan?.trim()) {
      throw new Error("Alasan penolakan bukti pembayaran wajib diisi.");
    }
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");

    const now = new Date().toISOString();
    const updatePayload: any = {
      status_pembayaran: disetujui ? "lunas" : "ditolak",
      status: disetujui ? "Lunas" : "Bukti Ditolak",
      alasan_penolakan: disetujui ? null : (alasan?.trim() ?? null),
      verified_by: verifiedBy ?? null,
      verified_at: now,
      updated_at: now,
    };

    let { data, error } = await supabase()
      .from("pembayaran")
      .update(updatePayload)
      .eq("id_servis", idServis)
      .select()
      .maybeSingle();

    if (error) {
      delete updatePayload.verified_by;
      delete updatePayload.verified_at;
      const res = await supabase()
        .from("pembayaran")
        .update(updatePayload)
        .eq("id_servis", idServis)
        .select()
        .single();
      data = res.data;
    }

    // Jika pembayaran disetujui, otomatis ubah status servis menjadi lunas
    if (disetujui) {
      try {
        await servisService.updateStatus(idServis, "lunas");
      } catch (err) {
        console.warn("Sinkronisasi status servis gagal:", err);
      }
    }

    // Kirim notifikasi ke pelanggan
    try {
      const srv = await servisService.getById(idServis);
      const noTrx = data?.nomor_transaksi || srv?.nomor_servis || "TRX";
      const totalBayar = data?.jumlah_bayar || srv?.total_biaya || 0;
      const notifSubject = disetujui ? "Pembayaran Berhasil Diverifikasi" : "Pembayaran Ditolak";
      const notifMsg = disetujui
        ? `Pembayaran transaksi ${noTrx} sebesar Rp ${totalBayar.toLocaleString("id-ID")} telah diverifikasi oleh Admin.`
        : `Pembayaran transaksi ${noTrx} ditolak. Alasan: ${alasan?.trim() || "Bukti tidak valid"}`;

      await notificationLogService.log({
        workshop_id: srv?.workshop_id || srv?.id_bengkel || "bengkel-001",
        id_bengkel: srv?.id_bengkel || srv?.workshop_id || "bengkel-001",
        channel: "in_app",
        type: "pembayaran",
        recipient: srv?.id_pelanggan || "pelanggan",
        subject: notifSubject,
        message: notifMsg,
        status: "sent",
      });
      await notifikasiService.notifyCustomer({
        customerId: srv?.id_pelanggan,
        bengkelId: srv?.id_bengkel || srv?.workshop_id,
        judul: disetujui ? "Pembayaran Diterima (Lunas)" : "Pembayaran Ditolak",
        pesan: disetujui
          ? "Pembayaran Anda telah Diterima (Lunas)."
          : `Pembayaran Anda telah Ditolak dengan alasan: ${alasan?.trim() || "Bukti tidak valid"}.`,
        tipe: "pembayaran",
        tautanUrl: `/pelanggan/pembayaran?trx=${noTrx}`,
      });
    } catch {}

    return data as PembayaranRow;
  },
};

// ----------------------------------------------------------------------------
// 7. ADMIN & OWNER SERVICE
// ----------------------------------------------------------------------------
export const roleService = {
  async getAdmin(userId: string): Promise<AdminRow | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase()
      .from("admin")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) return null;
    return data;
  },

  async getOwner(userId: string): Promise<OwnerRow | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase()
      .from("owner")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) return null;
    return data;
  },

  async getAllAdmins(): Promise<AdminRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase().from("admin").select("*");
    if (error) throw error;
    return data ?? [];
  },
};

// ----------------------------------------------------------------------------
// 8. MASTER MEKANIK & BENGKEL SERVICE
// ----------------------------------------------------------------------------
export const mekanikService = {
  async getBengkel(): Promise<BengkelRow[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase()
        .from("bengkel")
        .select("*")
        .order("nama_bengkel", { ascending: true });
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn("Gagal getBengkel dari tabel bengkel:", e);
    }
    return [];
  },

  async getMekanik(idBengkel?: string): Promise<MekanikRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase().from("mekanik").select("*").order("nama_mekanik", { ascending: true });
    if (idBengkel) {
      query = query.eq("id_bengkel", idBengkel);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: {
    id_mekanik?: string;
    bengkel_id?: string;
    workshop_id?: string;
    id_bengkel: string;
    nama_mekanik: string;
    no_telepon?: string | null;
    spesialisasi?: string | null;
    status?: "Aktif" | "Tidak Aktif";
  }): Promise<MekanikRow> {
    const idMekanik =
      payload.id_mekanik || `mk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const idBengkel = payload.id_bengkel || payload.bengkel_id || payload.workshop_id || "bengkel-001";

    if (!isSupabaseConfigured()) {
      return {
        id_mekanik: idMekanik,
        id_bengkel: idBengkel,
        nama_mekanik: payload.nama_mekanik,
        no_telepon: payload.no_telepon ?? null,
        spesialisasi: payload.spesialisasi ?? null,
        status: payload.status ?? "Aktif",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase()
      .from("mekanik")
      .insert({
        id_mekanik: idMekanik,
        id_bengkel: idBengkel,
        nama_mekanik: payload.nama_mekanik,
        no_telepon: payload.no_telepon ?? null,
        spesialisasi: payload.spesialisasi ?? null,
        status: payload.status ?? "Aktif",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(idMekanik: string, payload: Partial<MekanikRow> & Record<string, any>): Promise<MekanikRow> {
    if (!isSupabaseConfigured()) throw new Error("Supabase tidak aktif");
    const { workshop_id, bengkelId, ...cleanPayload } = payload;
    const { data, error } = await supabase()
      .from("mekanik")
      .update(cleanPayload)
      .eq("id_mekanik", idMekanik)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(idMekanik: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase().from("mekanik").delete().eq("id_mekanik", idMekanik);
    if (error) throw error;
  },
};

// ----------------------------------------------------------------------------
// 9. SUPPLIER SERVICE
// ----------------------------------------------------------------------------
export const supplierService = {
  async getAll(workshopId?: string): Promise<SupplierRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase().from("supplier").select("*").order("nama_supplier", { ascending: true });
    if (workshopId) {
      query = query.or(`workshop_id.eq.${workshopId},id_bengkel.eq.${workshopId}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getById(idSupplier: string): Promise<SupplierRow | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase()
      .from("supplier")
      .select("*")
      .eq("id_supplier", idSupplier)
      .single();
    if (error) return null;
    return data;
  },

  async create(payload: Partial<SupplierRow> & { nama_supplier: string }): Promise<SupplierRow> {
    const idSupplier =
      payload.id_supplier ||
      `sup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const wbId = payload.workshop_id || payload.id_bengkel || "bengkel-001";
    const newSupplier: SupplierRow = {
      id_supplier: idSupplier,
      workshop_id: wbId,
      id_bengkel: wbId,
      nama_supplier: payload.nama_supplier,
      kontak: payload.kontak ?? null,
      no_telepon: payload.no_telepon ?? null,
      email: payload.email ?? null,
      alamat: payload.alamat ?? null,
      status: payload.status ?? "Aktif",
      created_at: new Date().toISOString(),
    };
    if (!isSupabaseConfigured()) return newSupplier;
    const { data, error } = await supabase().from("supplier").insert(newSupplier).select().single();
    if (error) throw error;
    return data;
  },
};

// ----------------------------------------------------------------------------
// 10. MULTI-TENANT WORKSHOP SERVICE
// ----------------------------------------------------------------------------
export const workshopService = {
  async getAll(): Promise<WorkshopRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase()
      .from("workshops")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<WorkshopRow | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase()
      .from("workshops")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    return data;
  },

  async createWorkshop(payload: {
    id: string;
    name: string;
    code: string;
    owner_id?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    google_place_id?: string | null;
  }): Promise<WorkshopRow> {
    if (!isSupabaseConfigured()) {
      return {
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase().from("workshops").insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async getMembers(workshopId: string): Promise<WorkshopMemberRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase()
      .from("workshop_members")
      .select("*")
      .eq("workshop_id", workshopId);
    if (error) throw error;
    return data ?? [];
  },

  async addMember(payload: {
    workshop_id: string;
    user_id: string;
    role: "OWNER" | "ADMIN" | "MECHANIC" | "CUSTOMER";
  }): Promise<WorkshopMemberRow> {
    if (!isSupabaseConfigured()) {
      return {
        id: crypto.randomUUID(),
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase()
      .from("workshop_members")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getUserMemberships(userId: string): Promise<WorkshopMemberRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase()
      .from("workshop_members")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  },

  async getPaymentAccounts(workshopId: string): Promise<WorkshopPaymentAccountRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase()
      .from("workshop_payment_accounts")
      .select("*")
      .eq("workshop_id", workshopId);
    if (error) throw error;
    return data ?? [];
  },

  async createPaymentAccount(payload: {
    workshop_id: string;
    provider?: string;
    provider_account_id: string;
    account_type?: PaymentAccountType;
    is_active?: boolean;
  }): Promise<WorkshopPaymentAccountRow> {
    const newAcc: WorkshopPaymentAccountRow = {
      id: crypto.randomUUID(),
      workshop_id: payload.workshop_id,
      id_bengkel: payload.workshop_id,
      account_type: payload.account_type || "bank_transfer",
      provider: payload.provider || "XENDIT",
      provider_account_id: payload.provider_account_id,
      bank_name: null,
      account_number: null,
      account_holder_name: null,
      qr_image_url: null,
      display_name: null,
      status: "active",
      is_active: payload.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!isSupabaseConfigured()) {
      return newAcc;
    }
    const { data, error } = await supabase()
      .from("workshop_payment_accounts")
      .insert(newAcc)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getNotificationLogs(workshopId?: string): Promise<NotificationLogRow[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase()
      .from("notification_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (workshopId) {
      query = query.eq("workshop_id", workshopId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async createNotificationLog(payload: {
    workshop_id?: string | null;
    user_id?: string | null;
    channel: "EMAIL" | "WHATSAPP" | "IN_APP";
    type: string;
    recipient: string;
    subject?: string | null;
    message: string;
    status?: string;
    provider?: string | null;
    provider_message_id?: string | null;
  }): Promise<NotificationLogRow> {
    const newLog = {
      ...payload,
      status: payload.status || "sent",
      sent_at: new Date().toISOString(),
    };
    if (!isSupabaseConfigured()) {
      return {
        id: crypto.randomUUID(),
        ...newLog,
        created_at: new Date().toISOString(),
      };
    }
    const { data, error } = await supabase()
      .from("notification_logs")
      .insert(newLog)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ----------------------------------------------------------------------------
// 19. SUPER ADMIN & CLIENT MANAGEMENT SERVICE
// ----------------------------------------------------------------------------
const LOCAL_BENGKEL_KEY = "appbenk_bengkel_clients_list";
const LOCAL_CS_TICKETS_KEY = "appbenk_cs_tickets_list";
const LOCAL_CS_MESSAGES_KEY = "appbenk_cs_messages_list";
const LOCAL_SYSTEM_LOGS_KEY = "appbenk_system_logs_list";

export const superAdminService = {
  async getPlatformStats(): Promise<{
    totalBengkel: number;
    totalUser: number;
    bengkelBasic: number;
    bengkelPremium: number;
    tiketBelumSelesai: number;
    errorHariIni: number;
  }> {
    const clients = await this.getAllBengkelClients();
    const tickets = await customerServiceTicketService.getAllTickets();
    const logs = await systemLogService.getAllLogs();

    let totalUser = 0;
    if (isSupabaseConfigured()) {
      try {
        const { count } = await supabase()
          .from("profiles")
          .select("*", { count: "exact", head: true });
        totalUser = count || 0;
      } catch {}
    }

    if (totalUser === 0) {
      // Fallback perkiraan
      totalUser = clients.length * 15 + 24;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const errorHariIni = logs.filter(
      (l) => l.created_at && l.created_at.slice(0, 10) === todayStr,
    ).length;

    const tiketBelumSelesai = tickets.filter((t) => t.status !== "Selesai").length;
    const bengkelBasic = clients.filter((c) => c.paket !== "Premium").length;
    const bengkelPremium = clients.filter((c) => c.paket === "Premium").length;

    return {
      totalBengkel: clients.length,
      totalUser,
      bengkelBasic,
      bengkelPremium,
      tiketBelumSelesai,
      errorHariIni,
    };
  },

  async getAllBengkelClients(): Promise<BengkelRow[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase()
          .from("bengkel")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          try {
            localStorage.setItem(LOCAL_BENGKEL_KEY, JSON.stringify(data));
          } catch {}
          return data as BengkelRow[];
        }
      } catch {}
    }

    // Fallback data lokal / default
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(LOCAL_BENGKEL_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }

    const defaultBengkel: BengkelRow[] = [
      {
        id_bengkel: "bengkel-001",
        nama_bengkel: "AppBenk Pusat (Bengkel Utama)",
        alamat: "Jl. Veteran No. 45, Jakarta",
        no_telepon: "0812-9876-5432",
        paket: "Premium",
        status: "Aktif",
        owner_nama: "Budi Santoso",
        owner_email: "owner.pusat@gmail.com",
        created_at: "2026-01-15T08:00:00Z",
        updated_at: "2026-09-23T10:00:00Z",
      },
      {
        id_bengkel: "bengkel-002",
        nama_bengkel: "Pitstop Jaya Motor",
        alamat: "Jl. Diponegoro No. 12, Bandung",
        no_telepon: "0813-8888-9999",
        paket: "Basic",
        status: "Aktif",
        owner_nama: "Ahmad Wijaya",
        owner_email: "ahmad.pitstop@gmail.com",
        created_at: "2026-03-10T09:30:00Z",
        updated_at: "2026-09-20T11:00:00Z",
      },
      {
        id_bengkel: "bengkel-003",
        nama_bengkel: "Karya Mandiri Service",
        alamat: "Jl. Pemuda No. 78, Surabaya",
        no_telepon: "0819-2233-4455",
        paket: "Basic",
        status: "Aktif",
        owner_nama: "Dewi Lestari",
        owner_email: "dewi.karyamandiri@gmail.com",
        created_at: "2026-05-18T14:15:00Z",
        updated_at: "2026-09-18T16:00:00Z",
      },
    ];
    try {
      localStorage.setItem(LOCAL_BENGKEL_KEY, JSON.stringify(defaultBengkel));
    } catch {}
    return defaultBengkel;
  },

  async updateBengkelStatus(idBengkel: string, status: StatusKlien): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase()
          .from("bengkel")
          .update({ status, updated_at: new Date().toISOString() })
          .or(`id_bengkel.eq.${idBengkel},workshop_id.eq.${idBengkel}`);
      } catch {}
    }
    // Update local cache
    if (typeof window !== "undefined") {
      try {
        const clients = await this.getAllBengkelClients();
        const updated = clients.map((c) =>
          c.id_bengkel === idBengkel || c.workshop_id === idBengkel ? { ...c, status } : c,
        );
        localStorage.setItem(LOCAL_BENGKEL_KEY, JSON.stringify(updated));
      } catch {}
    }
    return true;
  },

  async updateBengkelTier(idBengkel: string, paket: PaketBengkel): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase()
          .from("bengkel")
          .update({ paket, updated_at: new Date().toISOString() })
          .or(`id_bengkel.eq.${idBengkel},workshop_id.eq.${idBengkel}`);
      } catch {}
    }
    // Update local cache
    if (typeof window !== "undefined") {
      try {
        const clients = await this.getAllBengkelClients();
        const updated = clients.map((c) =>
          c.id_bengkel === idBengkel || c.workshop_id === idBengkel ? { ...c, paket } : c,
        );
        localStorage.setItem(LOCAL_BENGKEL_KEY, JSON.stringify(updated));
      } catch {}
    }
    return true;
  },

  async createBengkelWithOwner(payload: {
    namaBengkel: string;
    alamat: string;
    telepon: string;
    ownerNama: string;
    ownerEmail: string;
    passwordAwal: string;
    paket: PaketBengkel;
  }): Promise<{ ok: boolean; bengkelId?: string; error?: string }> {
    const newBengkelId = `bengkel-${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();

    const newBengkel: BengkelRow = {
      id_bengkel: newBengkelId,
      workshop_id: newBengkelId,
      nama_bengkel: payload.namaBengkel,
      alamat: payload.alamat,
      no_telepon: payload.telepon,
      paket: payload.paket,
      status: "Aktif",
      owner_nama: payload.ownerNama,
      owner_email: payload.ownerEmail,
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (isSupabaseConfigured()) {
      try {
        // 1. Simpan data bengkel ke Supabase
        await supabase().from("bengkel").insert(newBengkel);

        // 2. Buat akun owner dengan isolated client (agar super admin tidak ter-logout)
        const url = import.meta.env["VITE_SUPABASE_URL"] as string;
        const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string;
        if (url && key) {
          const { createClient } = await import("@supabase/supabase-js");
          const isolatedAuth = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: signUpData } = await isolatedAuth.auth.signUp({
            email: payload.ownerEmail,
            password: payload.passwordAwal,
            options: {
              data: {
                full_name: payload.ownerNama,
                role: "owner",
                workshop_id: newBengkelId,
                id_bengkel: newBengkelId,
              },
            },
          });

          // 3. Masukkan ke tabel public.owner jika user berhasil terdaftar
          const ownerUserId = signUpData?.user?.id;
          if (ownerUserId) {
            await supabase().from("owner").insert({
              id_owner: `own-${newBengkelId.slice(-4)}`,
              user_id: ownerUserId,
              nama: payload.ownerNama,
              email: payload.ownerEmail,
              no_hp: payload.telepon,
              id_bengkel: newBengkelId,
              workshop_id: newBengkelId,
            });
          }
        }
      } catch (err: any) {
        console.warn("Gagal simpan bengkel ke Supabase, fallback lokal:", err?.message);
      }
    }

    // Simpan ke local storage
    if (typeof window !== "undefined") {
      try {
        const clients = await this.getAllBengkelClients();
        localStorage.setItem(LOCAL_BENGKEL_KEY, JSON.stringify([newBengkel, ...clients]));
      } catch {}
    }

    return { ok: true, bengkelId: newBengkelId };
  },
};

// ----------------------------------------------------------------------------
// 20. SYSTEM ERROR MONITOR LOGS SERVICE
// ----------------------------------------------------------------------------
export const systemLogService = {
  async getAllLogs(): Promise<SystemLogRow[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase()
          .from("system_logs")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          try {
            localStorage.setItem(LOCAL_SYSTEM_LOGS_KEY, JSON.stringify(data));
          } catch {}
          return data as SystemLogRow[];
        }
      } catch {}
    }

    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(LOCAL_SYSTEM_LOGS_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }

    const defaultLogs: SystemLogRow[] = [
      {
        id: "log-1",
        bengkel_id: "bengkel-001",
        bengkel_nama: "AppBenk Pusat",
        module: "Google Maps",
        error_message: "Maps API connection timeout (OVER_QUERY_LIMIT)",
        stack_trace: "Error: Maps Geocoding limit reached\n  at fetchBengkelLocation (bengkel-map.tsx:142)\n  at async loadMap",
        status: "Open",
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "log-2",
        bengkel_id: "bengkel-002",
        bengkel_nama: "Pitstop Jaya Motor",
        module: "Midtrans / QRIS",
        error_message: "Webhook callback delay (Response 504 Gateway)",
        stack_trace: "NetworkError: 504 Gateway Timeout\n  at verifyPaymentStatus (appbenk-service.ts:1310)",
        status: "Investigasi",
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "log-3",
        bengkel_id: "bengkel-001",
        bengkel_nama: "AppBenk Pusat",
        module: "WhatsApp Gateway",
        error_message: "Invalid device token authorization",
        stack_trace: "WablasAPIError: 401 Unauthorized token\n  at sendNotification (whatsapp.ts:88)",
        status: "Selesai",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    try {
      localStorage.setItem(LOCAL_SYSTEM_LOGS_KEY, JSON.stringify(defaultLogs));
    } catch {}
    return defaultLogs;
  },

  async logError(payload: {
    bengkelId?: string | null;
    bengkelNama?: string | null;
    module: string;
    errorMessage: string;
    stackTrace?: string | null;
  }): Promise<void> {
    const newLog: SystemLogRow = {
      id: crypto.randomUUID(),
      bengkel_id: payload.bengkelId || "bengkel-001",
      bengkel_nama: payload.bengkelNama || "AppBenk Workshop",
      module: payload.module,
      error_message: payload.errorMessage,
      stack_trace: payload.stackTrace || null,
      status: "Open",
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase().from("system_logs").insert(newLog);
      } catch {}
    }

    if (typeof window !== "undefined") {
      try {
        const logs = await this.getAllLogs();
        localStorage.setItem(LOCAL_SYSTEM_LOGS_KEY, JSON.stringify([newLog, ...logs]));
      } catch {}
    }
  },

  async updateLogStatus(id: string, status: "Open" | "Investigasi" | "Selesai"): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase().from("system_logs").update({ status }).eq("id", id);
      } catch {}
    }
    if (typeof window !== "undefined") {
      try {
        const logs = await this.getAllLogs();
        const updated = logs.map((l) => (l.id === id ? { ...l, status } : l));
        localStorage.setItem(LOCAL_SYSTEM_LOGS_KEY, JSON.stringify(updated));
      } catch {}
    }
    return true;
  },
};

export function logSystemError(
  module: string,
  errorMessage: string,
  stackTrace?: string | null,
  bengkelId?: string,
) {
  systemLogService.logError({
    module,
    errorMessage,
    stackTrace,
    bengkelId: bengkelId || "bengkel-001",
  }).catch(() => {});
}

// ----------------------------------------------------------------------------
// 21. CUSTOMER SERVICE TICKETS & MESSAGING SERVICE
// ----------------------------------------------------------------------------
export const customerServiceTicketService = {
  async getAllTickets(): Promise<CSTicketRow[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase()
          .from("customer_service_tickets")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          try {
            localStorage.setItem(LOCAL_CS_TICKETS_KEY, JSON.stringify(data));
          } catch {}
          return data as CSTicketRow[];
        }
      } catch {}
    }

    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(LOCAL_CS_TICKETS_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Bersihkan mock ticket lama yang mengandung teks hardcoded QRIS atau cs-mock-1 lama
            const cleaned = parsed.filter(
              (t: CSTicketRow) =>
                t.id !== "cs-mock-1" &&
                !t.pesan?.includes("upload bukti pembayaran QRIS tapi status masih menunggu"),
            );
            // Pastikan data Anzar Amanah selalu terhubung ke Bengkel Fandi Motor
            const sanitized = cleaned.map((t: CSTicketRow) => {
              if (
                (t.user_email && t.user_email.toLowerCase().includes("anzar")) ||
                (t.user_name && t.user_name.toLowerCase().includes("anzar"))
              ) {
                return {
                  ...t,
                  user_name: "Anzar Amanah",
                  user_email: "anzaramanah@gmail.com",
                  user_role: "admin_bengkel",
                  bengkel_id: "bengkel-2307",
                  bengkel_nama: "Bengkel Fandi Motor",
                };
              }
              return t;
            });
            if (sanitized.length > 0) {
              localStorage.setItem(LOCAL_CS_TICKETS_KEY, JSON.stringify(sanitized));
              return sanitized;
            }
          }
        }
      } catch {}
    }

    const defaultTickets: CSTicketRow[] = [
      {
        id: "cs-sample-1",
        ticket_number: "CS-0001",
        user_id: "usr-demo-2",
        user_name: "Ahmad Wijaya",
        user_email: "ahmad.pitstop@gmail.com",
        user_role: "owner",
        bengkel_id: "bengkel-002",
        bengkel_nama: "Pitstop Jaya Motor",
        subjek: "Panduan setup operasional & pencetakan nota servis",
        kategori: "Bantuan Operasional",
        pesan: "Halo tim AppBenk, kami ingin menanyakan panduan konfigurasi format pencetakan nota dan alur servis untuk bengkel kami.",
        status: "Diproses",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ];
    try {
      localStorage.setItem(LOCAL_CS_TICKETS_KEY, JSON.stringify(defaultTickets));
    } catch {}
    return defaultTickets;
  },

  async getMyTickets(userId: string, userEmail?: string, workshopId?: string): Promise<CSTicketRow[]> {
    let supabaseTickets: CSTicketRow[] = [];
    if (isSupabaseConfigured() && userId) {
      try {
        let q = supabase()
          .from("customer_service_tickets")
          .select("*")
          .order("created_at", { ascending: false });
        if (userEmail) {
          q = q.or(`user_id.eq.${userId},user_email.ilike.${userEmail}`);
        } else {
          q = q.eq("user_id", userId);
        }
        const { data, error } = await q;
        if (!error && Array.isArray(data) && data.length > 0) {
          supabaseTickets = data as CSTicketRow[];
        }
      } catch {}
    }

    const all = await this.getAllTickets();
    const isAnzar =
      (userEmail && userEmail.toLowerCase().includes("anzar")) ||
      userId === "usr-demo-1";

    const localFiltered = all.filter((t) => {
      const matchId = t.user_id === userId;
      const matchEmail =
        userEmail &&
        t.user_email &&
        t.user_email.toLowerCase() === userEmail.toLowerCase();
      const matchAnzar =
        isAnzar &&
        ((t.user_email && t.user_email.toLowerCase().includes("anzar")) ||
          (t.user_name && t.user_name.toLowerCase().includes("anzar")));
      const matchWorkshop =
        workshopId &&
        t.bengkel_id &&
        (t.bengkel_id === workshopId || (isAnzar && t.bengkel_id === "bengkel-2307"));
      return matchId || matchEmail || matchAnzar || matchWorkshop;
    });

    const map = new Map<string, CSTicketRow>();
    localFiltered.forEach((t) => map.set(t.id, t));
    supabaseTickets.forEach((t) => map.set(t.id, t));
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return merged;
  },

  async createTicket(payload: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
    bengkelId?: string;
    bengkelNama?: string;
    subjek: string;
    kategori: string;
    pesan: string;
  }): Promise<CSTicketRow> {
    const all = await this.getAllTickets();
    const nextNum = `CS-${String(all.length + 1).padStart(4, "0")}`;
    const newId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const isAnzar =
      (payload.userEmail && payload.userEmail.toLowerCase().includes("anzar")) ||
      (payload.userName && payload.userName.toLowerCase().includes("anzar"));

    const normalizedRole =
      payload.userRole === "admin"
        ? "admin_bengkel"
        : payload.userRole || "admin_bengkel";
    const workshopId = isAnzar ? "bengkel-2307" : payload.bengkelId || "bengkel-2307";
    const workshopName = isAnzar
      ? "Bengkel Fandi Motor"
      : payload.bengkelNama || "Bengkel Fandi Motor";
    const finalUserName = isAnzar ? "Anzar Amanah" : payload.userName;
    const finalUserEmail = isAnzar ? "anzaramanah@gmail.com" : payload.userEmail;

    const newTicket: CSTicketRow = {
      id: newId,
      ticket_number: nextNum,
      user_id: payload.userId,
      user_name: finalUserName,
      user_email: finalUserEmail,
      user_role: normalizedRole,
      bengkel_id: workshopId,
      bengkel_nama: workshopName,
      subjek: payload.subjek,
      kategori: payload.kategori,
      pesan: payload.pesan,
      status: "Baru",
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 1. Simpan pesan pertama ke percakapan tiket
    await this.sendMessage({
      ticketId: newId,
      senderUserId: payload.userId,
      senderRole: normalizedRole as any,
      senderName: finalUserName,
      message: payload.pesan,
    });

    // 2. Simpan tiket ke localStorage terlebih dahulu agar instan tersedia
    try {
      const updated = [newTicket, ...all.filter((t) => t.id !== newId)];
      localStorage.setItem(LOCAL_CS_TICKETS_KEY, JSON.stringify(updated));
    } catch {}

    // 3. Simpan ke Supabase jika tersedia
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase()
          .from("customer_service_tickets")
          .insert({
            id: newId,
            user_id: payload.userId,
            user_name: finalUserName,
            user_email: finalUserEmail,
            user_role: normalizedRole,
            bengkel_id: workshopId,
            bengkel_nama: workshopName,
            subjek: payload.subjek,
            kategori: payload.kategori,
            pesan: payload.pesan,
            status: "Baru",
          })
          .select()
          .single();

        if (!error && data) {
          await this.sendMessage({
            ticketId: data.id,
            senderUserId: payload.userId,
            senderRole: normalizedRole as any,
            senderName: finalUserName,
            message: payload.pesan,
          });
          try {
            const updated = [
              data as CSTicketRow,
              ...all.filter((t) => t.id !== data.id && t.id !== newId),
            ];
            localStorage.setItem(LOCAL_CS_TICKETS_KEY, JSON.stringify(updated));
          } catch {}
          return data as CSTicketRow;
        }
      } catch {}
    }

    return newTicket;
  },

  async getTicketMessages(ticketId: string): Promise<CSMessageRow[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase()
          .from("customer_service_messages")
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });
        if (!error && data) return data as CSMessageRow[];
      } catch {}
    }

    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(`${LOCAL_CS_MESSAGES_KEY}_${ticketId}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  },

  async sendMessage(payload: {
    ticketId: string;
    senderUserId: string;
    senderRole: "pelanggan" | "admin" | "owner" | "super_admin";
    senderName: string;
    message: string;
    updateTicketStatusTo?: "Baru" | "Diproses" | "Menunggu Balasan" | "Selesai";
  }): Promise<CSMessageRow> {
    const newMsg: CSMessageRow = {
      id: crypto.randomUUID(),
      ticket_id: payload.ticketId,
      sender_user_id: payload.senderUserId,
      sender_role: payload.senderRole,
      sender_name: payload.senderName,
      message: payload.message,
      created_at: new Date().toISOString(),
    };

    // Tentukan auto-status: Jika Super Admin membalas -> "Diproses" atau "Menunggu Balasan"
    let nextStatus = payload.updateTicketStatusTo;
    if (!nextStatus) {
      if (payload.senderRole === "super_admin") {
        nextStatus = "Diproses";
      } else {
        nextStatus = "Menunggu Balasan";
      }
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase().from("customer_service_messages").insert({
          ticket_id: payload.ticketId,
          sender_user_id: payload.senderUserId,
          sender_role: payload.senderRole,
          sender_name: payload.senderName,
          message: payload.message,
        });
        if (nextStatus) {
          await supabase()
            .from("customer_service_tickets")
            .update({ status: nextStatus, updated_at: new Date().toISOString() })
            .eq("id", payload.ticketId);
        }
      } catch {}
    }

    // Update lokal
    if (typeof window !== "undefined") {
      try {
        const existing = await this.getTicketMessages(payload.ticketId);
        localStorage.setItem(
          `${LOCAL_CS_MESSAGES_KEY}_${payload.ticketId}`,
          JSON.stringify([...existing, newMsg]),
        );
        if (nextStatus) {
          const all = await this.getAllTickets();
          const updated = all.map((t) =>
            t.id === payload.ticketId
              ? { ...t, status: nextStatus!, updated_at: new Date().toISOString() }
              : t,
          );
          localStorage.setItem(LOCAL_CS_TICKETS_KEY, JSON.stringify(updated));
        }
      } catch {}
    }

    return newMsg;
  },

  async updateTicketStatus(
    ticketId: string,
    status: "Baru" | "Diproses" | "Menunggu Balasan" | "Selesai",
  ): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase()
          .from("customer_service_tickets")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", ticketId);
      } catch {}
    }
    if (typeof window !== "undefined") {
      try {
        const all = await this.getAllTickets();
        const updated = all.map((t) =>
          t.id === ticketId ? { ...t, status, updated_at: new Date().toISOString() } : t,
        );
        localStorage.setItem(LOCAL_CS_TICKETS_KEY, JSON.stringify(updated));
      } catch {}
    }
    return true;
  },
};

// ----------------------------------------------------------------------------
// 17. WORKSHOP ONBOARDING APPLICATION SERVICE
// ----------------------------------------------------------------------------
export const workshopApplicationService = {
  async getLatestApplication(userId: string): Promise<WorkshopApplicationRow | null> {
    if (!isSupabaseConfigured()) {
      throw new Error("Layanan Supabase belum dikonfigurasi.");
    }

    const { data, error } = await supabase()
      .from("workshop_applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to query workshop_applications from Supabase:", error);
      throw error;
    }

    return (data as WorkshopApplicationRow | null) ?? null;
  },

  async getAllApplications(): Promise<WorkshopApplicationRow[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase()
      .from("workshop_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to query all workshop_applications:", error);
      throw error;
    }

    return (data as WorkshopApplicationRow[]) ?? [];
  },

  async createApplication(payload: {
    userId: string;
    namaBengkel: string;
    alamat: string;
    noTelepon: string;
    ownerNama: string;
    ownerEmail: string;
    paket: "Basic" | "Premium";
  }): Promise<{ data?: WorkshopApplicationRow; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        error: "Layanan pengajuan bengkel sedang tidak tersedia. Silakan coba lagi.",
      };
    }

    try {
      const { data, error } = await supabase()
        .from("workshop_applications")
        .insert({
          user_id: payload.userId,
          nama_bengkel: payload.namaBengkel.trim(),
          alamat: payload.alamat.trim(),
          no_telepon: payload.noTelepon.trim(),
          owner_nama: payload.ownerNama.trim(),
          owner_email: payload.ownerEmail.trim().toLowerCase(),
          paket: payload.paket,
          status: "PENDING",
        })
        .select("*")
        .single();

      if (error) {
        if (
          error.code === "23505" ||
          error.message.includes("idx_one_pending_app_per_user") ||
          error.message.toLowerCase().includes("unique")
        ) {
          return {
            error:
              "Pengajuan pendaftaran bengkel Anda masih dalam proses peninjauan. Silakan tunggu persetujuan dari tim AppBenk.",
          };
        }
        return { error: error.message };
      }

      return { data: data as WorkshopApplicationRow };
    } catch (err: any) {
      return {
        error:
          err?.message ||
          "Terjadi kesalahan saat menyimpan pengajuan pendaftaran bengkel.",
      };
    }
  },

  async approveApplication(
    applicationId: string,
  ): Promise<{ ok: boolean; error?: string; id_bengkel?: string }> {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: "Layanan Supabase belum dikonfigurasi." };
    }

    try {
      const { data, error } = await supabase().rpc("approve_workshop_application", {
        p_application_id: applicationId,
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data && typeof data === "object") {
        if (data.ok === false) {
          return { ok: false, error: data.error || "Gagal menyetujui pengajuan bengkel." };
        }
        return { ok: true, id_bengkel: data.id_bengkel };
      }

      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || "Terjadi kesalahan saat memproses persetujuan pengajuan.",
      };
    }
  },

  async rejectApplication(
    applicationId: string,
    alasan: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: "Layanan Supabase belum dikonfigurasi." };
    }

    try {
      const { data, error } = await supabase().rpc("reject_workshop_application", {
        p_application_id: applicationId,
        p_alasan: alasan.trim(),
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data && typeof data === "object") {
        if (data.ok === false) {
          return { ok: false, error: data.error || "Gagal menolak pengajuan bengkel." };
        }
        return { ok: true };
      }

      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || "Terjadi kesalahan saat memproses penolakan pengajuan.",
      };
    }
  },
};

// ----------------------------------------------------------------------------
// 18. ADMIN INVITATION SERVICE (OWNER -> STAFF ADMIN ONBOARDING)
// ----------------------------------------------------------------------------
export const adminInvitationService = {
  async getWorkshopAdmins(bengkelId: string): Promise<AdminRow[]> {
    if (!isSupabaseConfigured() || !bengkelId) return [];

    try {
      const { data, error } = await supabase()
        .from("admin")
        .select("*")
        .eq("id_bengkel", bengkelId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as AdminRow[]) ?? [];
    } catch (err) {
      console.error("Failed to query workshop admins:", err);
      return [];
    }
  },

  async getWorkshopInvitations(bengkelId: string): Promise<AdminInvitationRow[]> {
    if (!isSupabaseConfigured() || !bengkelId) return [];

    try {
      const { data, error } = await supabase()
        .from("admin_invitations")
        .select("*")
        .eq("id_bengkel", bengkelId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as AdminInvitationRow[]) ?? [];
    } catch (err) {
      console.error("Failed to query workshop invitations:", err);
      return [];
    }
  },

  async createInvitation(
    nama: string,
    email: string,
    bengkelId?: string,
  ): Promise<{
    ok: boolean;
    error?: string;
    token?: string;
    invitation_id?: string;
    email?: string;
    expires_at?: string;
    activation_link?: string;
    data?: {
      invitation_id?: string;
      nama?: string;
      email?: string;
      bengkel_id?: string;
      token?: string;
      status?: string;
      expires_at?: string;
      activation_link?: string;
    };
  }> {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: "Layanan Supabase belum dikonfigurasi." };
    }

    const cleanNama = nama.trim();
    const envAppUrl = (
      (typeof import.meta !== "undefined" && (import.meta as any).env?.["VITE_APP_URL"]) ||
      (typeof process !== "undefined" && (process.env?.["VITE_APP_URL"] || process.env?.["APP_URL"])) ||
      ""
    ).trim().replace(/\/$/, "");

    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : (envAppUrl || "http://localhost:8080");

    // 1. Coba panggil HTTP POST /api/invite
    try {
      const session = await supabase().auth.getSession();
      const tokenHeader = session.data?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokenHeader) headers["Authorization"] = `Bearer ${tokenHeader}`;

      const res = await fetch("/api/invite", {
        method: "POST",
        headers,
        body: JSON.stringify({ nama: cleanNama, email: cleanEmail, bengkel_id: bengkelId }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          const actLink = json.activation_link || `${origin}/accept-invite?token=${json.token}`;
          return {
            ok: true,
            token: json.token,
            invitation_id: json.data?.invitation_id || json.invitation_id,
            email: json.data?.email || cleanEmail,
            expires_at: json.data?.expires_at,
            activation_link: actLink,
            data: {
              ...json.data,
              activation_link: actLink,
            },
          };
        }
        if (json.error) {
          return { ok: false, error: json.error };
        }
      }
    } catch {
      // jika fetch /api/invite tidak tersedia (misal static context), fallback ke RPC langsung
    }

    // 1. Coba panggil RPC create_admin_invitation
    try {
      const { data: rpcData, error: rpcError } = await supabase().rpc("create_admin_invitation", {
        p_nama: cleanNama,
        p_email: cleanEmail,
      });

      if (!rpcError && rpcData && typeof rpcData === "object" && rpcData.ok !== false) {
        const actLink = `${origin}/accept-invite?token=${rpcData.token}`;
        return {
          ok: true,
          token: rpcData.token,
          invitation_id: rpcData.invitation_id,
          email: rpcData.email || cleanEmail,
          expires_at: rpcData.expires_at,
          activation_link: actLink,
          data: {
            invitation_id: rpcData.invitation_id,
            nama: cleanNama,
            email: rpcData.email || cleanEmail,
            bengkel_id: rpcData.id_bengkel,
            token: rpcData.token,
            status: "pending",
            expires_at: rpcData.expires_at,
            activation_link: actLink,
          },
        };
      }

      // Jika RPC mengembalikan pesan error bisnis spesifik (misal: sudah terdaftar aktif)
      if (rpcData && typeof rpcData === "object" && rpcData.ok === false) {
        const errMsg = rpcData.error || "";
        if (errMsg.includes("sudah terdaftar aktif") || errMsg.includes("wajib diisi")) {
          return { ok: false, error: errMsg };
        }
      }
    } catch {
      // lanjut ke fallback direct insert
    }

    // 2. Fallback tangguh: Direct Insert ke public.admin_invitations
    try {
      const { data: authData } = await supabase().auth.getUser();
      const currentAuthUser = authData?.user;
      if (!currentAuthUser) {
        return { ok: false, error: "Sesi login Anda tidak aktif. Silakan masuk kembali." };
      }

      // Resolusi ID Bengkel pemanggil
      let resolvedBengkelId = bengkelId?.trim();
      if (!resolvedBengkelId) {
        // Cek profiles
        const { data: prof } = await supabase()
          .from("profiles")
          .select("id_bengkel")
          .eq("id", currentAuthUser.id)
          .maybeSingle();
        if (prof?.id_bengkel) resolvedBengkelId = prof.id_bengkel;
      }
      if (!resolvedBengkelId) {
        // Cek owner
        const { data: own } = await supabase()
          .from("owner")
          .select("id_bengkel")
          .or(`user_id.eq.${currentAuthUser.id},email.ilike.${currentAuthUser.email}`)
          .maybeSingle();
        if (own?.id_bengkel) resolvedBengkelId = own.id_bengkel;
      }
      if (!resolvedBengkelId) {
        resolvedBengkelId = "bengkel-001";
      }

      // Cek apakah admin sudah aktif di bengkel ini
      const { data: existingAdmin } = await supabase()
        .from("admin")
        .select("id_admin")
        .eq("id_bengkel", resolvedBengkelId)
        .ilike("email", cleanEmail)
        .eq("status", "aktif")
        .maybeSingle();

      if (existingAdmin) {
        return {
          ok: false,
          error: "Staf dengan email ini sudah terdaftar aktif sebagai Admin di bengkel Anda.",
        };
      }

      // Batalkan undangan pending lama untuk email dan bengkel ini
      await supabase()
        .from("admin_invitations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id_bengkel", resolvedBengkelId)
        .ilike("email", cleanEmail)
        .eq("status", "pending");

      // Generate token acak unik (48 karakter hex)
      const rawToken =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? (crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")).slice(0, 48)
          : Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);

      const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

      const { data: inserted, error: insertError } = await supabase()
        .from("admin_invitations")
        .insert({
          id_bengkel: resolvedBengkelId,
          nama: cleanNama,
          email: cleanEmail,
          token: rawToken,
          created_by: currentAuthUser.id,
          expires_at: expiresAt,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        return {
          ok: false,
          error: insertError.message || "Gagal menyimpan tautan undangan ke database.",
        };
      }

      const actLink = `${origin}/accept-invite?token=${rawToken}`;
      return {
        ok: true,
        token: rawToken,
        invitation_id: inserted?.id,
        email: cleanEmail,
        expires_at: expiresAt,
        activation_link: actLink,
        data: {
          invitation_id: inserted?.id,
          nama: cleanNama,
          email: cleanEmail,
          bengkel_id: resolvedBengkelId,
          token: rawToken,
          status: "pending",
          expires_at: expiresAt,
          activation_link: actLink,
        },
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || "Terjadi kesalahan saat memproses pembuatan undangan staf admin.",
      };
    }
  },

  async getInvitationByToken(token: string): Promise<{
    ok: boolean;
    error?: string;
    data?: {
      email: string;
      nama: string;
      id_bengkel: string;
      nama_bengkel: string;
      expires_at: string;
    };
  }> {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: "Layanan Supabase belum dikonfigurasi." };
    }

    try {
      const { data, error } = await supabase().rpc("get_invitation_by_token", {
        p_token: token.trim(),
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data && typeof data === "object") {
        if (data.ok === false) {
          return { ok: false, error: data.error || "Tautan undangan tidak valid atau kedaluwarsa." };
        }
        return {
          ok: true,
          data: {
            email: data.email,
            nama: data.nama,
            id_bengkel: data.id_bengkel,
            nama_bengkel: data.nama_bengkel,
            expires_at: data.expires_at,
          },
        };
      }

      return { ok: false, error: "Data undangan tidak ditemukan." };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || "Terjadi kesalahan saat memeriksa tautan undangan.",
      };
    }
  },

  async claimInvitation(token: string): Promise<{
    ok: boolean;
    error?: string;
    id_bengkel?: string;
    role?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: "Layanan Supabase belum dikonfigurasi." };
    }

    try {
      const { data, error } = await supabase().rpc("claim_admin_invitation", {
        p_token: token.trim(),
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data && typeof data === "object") {
        if (data.ok === false) {
          return { ok: false, error: data.error || "Gagal mengklaim undangan staf admin." };
        }
        return {
          ok: true,
          id_bengkel: data.id_bengkel,
          role: data.role || "admin",
        };
      }

      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || "Terjadi kesalahan saat mengklaim undangan.",
      };
    }
  },
};





