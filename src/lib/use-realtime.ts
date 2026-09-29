import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/services/appbenk-service";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeSyncStatus = "connecting" | "connected" | "disconnected" | "fallback_polling";

export interface UseRealtimeOptions {
  onServisChange?: () => void | Promise<void>;
  onBookingChange?: () => void | Promise<void>;
  onPembayaranChange?: () => void | Promise<void>;
  onSparepartChange?: () => void | Promise<void>;
  onBengkelChange?: () => void | Promise<void>;
  onPaymentAccountsChange?: () => void | Promise<void>;
  enablePollingFallback?: boolean;
  pollingIntervalMs?: number;
  workshopId?: string;
  debug?: boolean;
}

/**
 * Hook Supabase Realtime Listener terpusat.
 * Mendengarkan postgres_changes pada tabel-tabel utama (servis, booking, pembayaran, sparepart, bengkel)
 * dan memicu revalidasi state / TanStack Query secara reaktif di latar belakang.
 */
export function useSupabaseRealtime(options: UseRealtimeOptions = {}) {
  const {
    onServisChange,
    onBookingChange,
    onPembayaranChange,
    onSparepartChange,
    onBengkelChange,
    onPaymentAccountsChange,
    enablePollingFallback = true,
    pollingIntervalMs = 15000,
    workshopId,
    debug = false,
  } = options;

  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  try {
    queryClient = useQueryClient();
  } catch {}

  const [status, setStatus] = useState<RealtimeSyncStatus>("connecting");

  // Simpan callbacks di ref agar subscription tidak dibuat ulang saat callback function berganti referensi
  const callbacksRef = useRef({
    onServisChange,
    onBookingChange,
    onPembayaranChange,
    onSparepartChange,
    onBengkelChange,
    onPaymentAccountsChange,
  });

  useEffect(() => {
    callbacksRef.current = {
      onServisChange,
      onBookingChange,
      onPembayaranChange,
      onSparepartChange,
      onBengkelChange,
      onPaymentAccountsChange,
    };
  }, [
    onServisChange,
    onBookingChange,
    onPembayaranChange,
    onSparepartChange,
    onBengkelChange,
    onPaymentAccountsChange,
  ]);

  // Debounce timers untuk mencegah spam fetch jika banyak event masuk bersamaan
  const timersRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  const debounce = useCallback((key: string, fn: () => void, delayMs = 300) => {
    if (timersRef.current[key]) {
      clearTimeout(timersRef.current[key]);
    }
    timersRef.current[key] = setTimeout(() => {
      fn();
      delete timersRef.current[key];
    }, delayMs);
  }, []);

  // Handler Event Servis
  const triggerServisSync = useCallback(() => {
    debounce("servis", async () => {
      if (debug) console.log("[Realtime] Triggering Servis sync...");
      try {
        await callbacksRef.current.onServisChange?.();
      } catch (err) {
        console.warn("[Realtime] onServisChange error:", err);
      }
      queryClient?.invalidateQueries({ queryKey: ["servis"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("appbenk_servis_updated"));
      }
    });
  }, [debounce, debug, queryClient]);

  // Handler Event Booking
  const triggerBookingSync = useCallback(() => {
    debounce("booking", async () => {
      if (debug) console.log("[Realtime] Triggering Booking sync...");
      try {
        await callbacksRef.current.onBookingChange?.();
      } catch (err) {
        console.warn("[Realtime] onBookingChange error:", err);
      }
      queryClient?.invalidateQueries({ queryKey: ["booking"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("appbenk_booking_updated"));
      }
    });
  }, [debounce, debug, queryClient]);

  // Handler Event Pembayaran
  const triggerPembayaranSync = useCallback(() => {
    debounce("pembayaran", async () => {
      if (debug) console.log("[Realtime] Triggering Pembayaran sync...");
      try {
        await callbacksRef.current.onPembayaranChange?.();
      } catch (err) {
        console.warn("[Realtime] onPembayaranChange error:", err);
      }
      // Pembayaran juga mempengaruhi status servis (lunas / menunggu verifikasi)
      triggerServisSync();
      queryClient?.invalidateQueries({ queryKey: ["pembayaran"] });
      queryClient?.invalidateQueries({ queryKey: ["servis"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("appbenk_pembayaran_updated"));
      }
    });
  }, [debounce, debug, queryClient, triggerServisSync]);

  // Handler Event Sparepart & Stok
  const triggerSparepartSync = useCallback(() => {
    debounce("sparepart", async () => {
      if (debug) console.log("[Realtime] Triggering Sparepart sync...");
      try {
        await callbacksRef.current.onSparepartChange?.();
      } catch (err) {
        console.warn("[Realtime] onSparepartChange error:", err);
      }
      queryClient?.invalidateQueries({ queryKey: ["sparepart"] });
      queryClient?.invalidateQueries({ queryKey: ["stok"] });
      queryClient?.invalidateQueries({ queryKey: ["riwayat_stok"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("appbenk_sparepart_updated"));
      }
    });
  }, [debounce, debug, queryClient]);

  // Handler Event Bengkel (Profil, Alamat, Koordinat)
  const triggerBengkelSync = useCallback(() => {
    debounce("bengkel", async () => {
      if (debug) console.log("[Realtime] Triggering Bengkel sync...");
      try {
        await callbacksRef.current.onBengkelChange?.();
      } catch (err) {
        console.warn("[Realtime] onBengkelChange error:", err);
      }
      queryClient?.invalidateQueries({ queryKey: ["bengkel"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("appbenk_bengkel_updated"));
      }
    });
  }, [debounce, debug, queryClient]);

  // Handler Event Akun Pembayaran (QRIS, Rekening)
  const triggerPaymentAccountsSync = useCallback(() => {
    debounce("payment_accounts", async () => {
      if (debug) console.log("[Realtime] Triggering Payment Accounts sync...");
      try {
        await callbacksRef.current.onPaymentAccountsChange?.();
      } catch (err) {
        console.warn("[Realtime] onPaymentAccountsChange error:", err);
      }
      queryClient?.invalidateQueries({ queryKey: ["payment_accounts"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("appbenk_payment_accounts_updated"));
      }
    });
  }, [debounce, debug, queryClient]);

  // Setup Supabase Realtime Channels
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus("fallback_polling");
      return;
    }

    let client: ReturnType<typeof supabase>;
    try {
      client = supabase();
    } catch {
      setStatus("fallback_polling");
      return;
    }

    const channelName = `appbenk-rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    let channel: RealtimeChannel;

    try {
      channel = client
        .channel(channelName)
        // 1. Tabel servis
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "servis" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on servis:", payload.eventType);
            triggerServisSync();
          },
        )
        // 2. Tabel booking_servis & booking
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "booking_servis" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on booking_servis:", payload.eventType);
            triggerBookingSync();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "booking" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on booking:", payload.eventType);
            triggerBookingSync();
          },
        )
        // 3. Tabel pembayaran
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pembayaran" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on pembayaran:", payload.eventType);
            triggerPembayaranSync();
          },
        )
        // 4. Tabel sparepart & penggunaan suku cadang
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sparepart" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on sparepart:", payload.eventType);
            triggerSparepartSync();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "detail_servis" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on detail_servis:", payload.eventType);
            triggerServisSync();
            triggerSparepartSync();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "penggunaan_sparepart" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on penggunaan_sparepart:", payload.eventType);
            triggerSparepartSync();
            triggerServisSync();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "stok_opname" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on stok_opname:", payload.eventType);
            triggerSparepartSync();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "riwayat_stok" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on riwayat_stok:", payload.eventType);
            triggerSparepartSync();
          },
        )
        // 5. Tabel bengkel (Alamat & koordinat)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bengkel" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on bengkel:", payload.eventType);
            triggerBengkelSync();
          },
        )
        // 6. Tabel workshop_payment_accounts (QRIS / Bank)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "workshop_payment_accounts" },
          (payload) => {
            if (debug) console.log("[Realtime] Event on workshop_payment_accounts:", payload.eventType);
            triggerPaymentAccountsSync();
          },
        )
        .subscribe((subStatus, err) => {
          if (debug) console.log("[Realtime] Subscription status:", subStatus, err);
          if (subStatus === "SUBSCRIBED") {
            setStatus("connected");
          } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
            setStatus("fallback_polling");
          } else if (subStatus === "CLOSED") {
            setStatus("disconnected");
          }
        });
    } catch (err) {
      console.warn("[Realtime] Gagal menginisialisasi channel realtime:", err);
      setStatus("fallback_polling");
    }

    // Cleanup: Unsubscribe dan hapus channel saat komponen unmount
    return () => {
      // Bersihkan pending timer
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
      timersRef.current = {};

      if (channel && client) {
        try {
          client.removeChannel(channel);
        } catch (e) {
          console.warn("[Realtime] Cleanup channel error:", e);
        }
      }
    };
  }, [
    triggerServisSync,
    triggerBookingSync,
    triggerPembayaranSync,
    triggerSparepartSync,
    triggerBengkelSync,
    triggerPaymentAccountsSync,
    debug,
  ]);

  // Fallback Polling Interval (sebagai pengaman jika koneksi websocket realtime terputus / di perangkat seluler)
  useEffect(() => {
    if (!enablePollingFallback) return;

    const intervalId = setInterval(() => {
      // Re-fetch data penting secara periodik di background
      triggerServisSync();
      triggerBookingSync();
      triggerPembayaranSync();
    }, Math.max(10000, pollingIntervalMs));

    return () => clearInterval(intervalId);
  }, [
    enablePollingFallback,
    pollingIntervalMs,
    triggerServisSync,
    triggerBookingSync,
    triggerPembayaranSync,
  ]);

  return {
    status,
    refreshAll: useCallback(() => {
      triggerServisSync();
      triggerBookingSync();
      triggerPembayaranSync();
      triggerSparepartSync();
      triggerBengkelSync();
      triggerPaymentAccountsSync();
    }, [
      triggerServisSync,
      triggerBookingSync,
      triggerPembayaranSync,
      triggerSparepartSync,
      triggerBengkelSync,
      triggerPaymentAccountsSync,
    ]),
  };
}
