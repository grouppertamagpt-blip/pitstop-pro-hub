-- Migration: Enable Supabase Realtime for Core Tables
-- Tables: servis, booking_servis, pembayaran, sparepart, detail_servis, penggunaan_sparepart, stok_opname, riwayat_stok, bengkel, workshop_payment_accounts

-- 1. Pastikan publikasi supabase_realtime ada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Set REPLICA IDENTITY FULL agar payload event UPDATE & DELETE menyertakan data lengkap
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'servis') THEN
    ALTER TABLE public.servis REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'booking_servis') THEN
    ALTER TABLE public.booking_servis REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pembayaran') THEN
    ALTER TABLE public.pembayaran REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sparepart') THEN
    ALTER TABLE public.sparepart REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'detail_servis') THEN
    ALTER TABLE public.detail_servis REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'penggunaan_sparepart') THEN
    ALTER TABLE public.penggunaan_sparepart REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stok_opname') THEN
    ALTER TABLE public.stok_opname REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'riwayat_stok') THEN
    ALTER TABLE public.riwayat_stok REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bengkel') THEN
    ALTER TABLE public.bengkel REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workshop_payment_accounts') THEN
    ALTER TABLE public.workshop_payment_accounts REPLICA IDENTITY FULL;
  END IF;
END $$;

-- 3. Tambahkan tabel-tabel utama ke publikasi supabase_realtime
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'servis',
    'booking_servis',
    'pembayaran',
    'sparepart',
    'detail_servis',
    'penggunaan_sparepart',
    'stok_opname',
    'riwayat_stok',
    'bengkel',
    'workshop_payment_accounts'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
      END IF;
    END IF;
  END LOOP;
END $$;
