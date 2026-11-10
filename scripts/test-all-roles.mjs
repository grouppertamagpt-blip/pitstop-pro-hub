import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)[1].trim();
const anonKey = env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)[1].trim();

console.log("=== VERIFYING ALL APPBENK ROLES ===");

async function testRole(name, email, password) {
  console.log(`\n======================================================`);
  console.log(`Testing: [${name}] Email: ${email}`);
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (authErr || !authData.user) {
    console.error(`❌ Auth FAILED: ${authErr?.message}`);
    return false;
  }

  console.log(`✓ Auth OK (ID: ${authData.user.id})`);

  // 1. Fetch Profile
  const { data: profile, error: profErr } = await client
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (profErr) {
    console.error("❌ Profile fetch error:", profErr.message);
    return false;
  }

  console.log(`✓ Profile: Role = [${profile.role}], Bengkel = [${profile.id_bengkel || "none"}], Name = [${profile.full_name}]`);

  // 2. Test Customer Service tickets (RLS check for super_admin vs user)
  const { data: tickets, error: tkErr } = await client
    .from("customer_service_tickets")
    .select("ticket_number, subjek, status")
    .limit(3);

  if (tkErr) {
    console.log(`  Tickets access: ${tkErr.message}`);
  } else {
    console.log(`✓ CS Tickets accessible: ${tickets.length} record(s)`);
  }

  // 3. Test System Logs (Super Admin only)
  const { data: logs, error: lgErr } = await client
    .from("system_logs")
    .select("module, error_message")
    .limit(3);

  if (lgErr) {
    console.log(`  System logs: ${lgErr.message}`);
  } else {
    console.log(`✓ System logs accessible: ${logs.length} record(s)`);
  }

  // 4. Test Core Tables (servis, booking_servis, sparepart)
  const { data: srv } = await client.from("servis").select("id_servis, nomor_servis").limit(3);
  const { data: bkg } = await client.from("booking_servis").select("id_booking, nomor_booking").limit(3);
  const { data: sp } = await client.from("sparepart").select("id_sparepart, nama_sparepart").limit(3);
  console.log(`✓ Core data: ${srv?.length || 0} servis, ${bkg?.length || 0} booking, ${sp?.length || 0} sparepart`);
  return true;
}

await testRole("PELANGGAN", "roniyahaha@gmail.com", "roni123");
await testRole("OWNER (Fandi)", "fandinasir@gmail.com", "fandi123");
await testRole("OWNER (owner@gmail.com)", "owner@gmail.com", "owner123");
await testRole("ADMIN (Anzar)", "anzaramanah@gmail.com", "anzar123");
await testRole("SUPER ADMIN (grouppertamagpt@gmail.com)", "grouppertamagpt@gmail.com", "superadmin123");
