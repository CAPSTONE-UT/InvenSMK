declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
};

import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_PASSWORD ?? "DemoInventaris!2026";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  {
    email: "admin@demo.invensmk.local",
    fullName: "Admin Demo",
    staffId: "DEMO-ADMIN-001",
    schoolUnit: "Administrasi Sekolah",
    role: "admin",
  },
  {
    email: "petugas@demo.invensmk.local",
    fullName: "Petugas Inventaris Demo",
    staffId: "DEMO-PETUGAS-001",
    schoolUnit: "Sarana dan Prasarana",
    role: "inventory_officer",
  },
  {
    email: "guru@demo.invensmk.local",
    fullName: "Guru Demo",
    staffId: "DEMO-GURU-001",
    schoolUnit: "Guru",
    role: "staff",
  },
  {
    email: "siswa@demo.invensmk.local",
    fullName: "Siswa Demo",
    staffId: "DEMO-SISWA-001",
    schoolUnit: "XI RPL 1",
    role: "staff",
  },
] as const;

const categorySeeds = [
  { name: "Elektronik", description: "Perangkat elektronik dan multimedia" },
  { name: "Peralatan Kelas", description: "Perlengkapan untuk kegiatan belajar" },
  { name: "Olahraga", description: "Peralatan olahraga sekolah" },
  { name: "Laboratorium", description: "Peralatan praktik dan laboratorium" },
];

const itemSeeds = [
  { barcode: "DEMO-LAPTOP-001", name: "Laptop Lenovo ThinkPad", category: "Elektronik", location: "Lab Komputer", condition: "good", status: "borrowed", acquired_at: "2025-01-15", notes: "Laptop untuk praktik pemrograman" },
  { barcode: "DEMO-PROYECTOR-001", name: "Proyektor Epson", category: "Elektronik", location: "Ruang Guru", condition: "good", status: "borrowed", acquired_at: "2024-08-20", notes: "Termasuk kabel HDMI" },
  { barcode: "DEMO-CHROMEBOOK-001", name: "Chromebook Acer", category: "Elektronik", location: "Lab Komputer", condition: "good", status: "available", acquired_at: "2025-02-01", notes: null },
  { barcode: "DEMO-WHITEBOARD-001", name: "Papan Tulis Lipat", category: "Peralatan Kelas", location: "Gudang A", condition: "minor_damage", status: "available", acquired_at: "2023-07-10", notes: "Salah satu roda sedikit longgar" },
  { barcode: "DEMO-BASKETBALL-001", name: "Bola Basket", category: "Olahraga", location: "Gudang Olahraga", condition: "good", status: "available", acquired_at: "2025-01-05", notes: null },
  { barcode: "DEMO-MICROSCOPE-001", name: "Mikroskop Binokuler", category: "Laboratorium", location: "Lab Biologi", condition: "damaged", status: "damaged", acquired_at: "2022-06-12", notes: "Lensa objektif perlu diperiksa" },
  { barcode: "DEMO-SPEAKER-001", name: "Speaker Aktif", category: "Elektronik", location: "Aula", condition: "good", status: "available", acquired_at: "2024-10-01", notes: null },
  { barcode: "DEMO-TOOLKIT-001", name: "Toolkit Elektronika", category: "Laboratorium", location: "Lab Elektronika", condition: "good", status: "available", acquired_at: "2025-03-12", notes: "Set obeng dan multimeter" },
] as const;

const seededLoans = {
  active: "a1000000-0000-4000-8000-000000000001",
  overdue: "a1000000-0000-4000-8000-000000000002",
  returned: "a1000000-0000-4000-8000-000000000003",
} as const;

function must<T>(data: T | null, error: { message: string } | null, action: string): T {
  if (error) throw new Error(`${action}: ${error.message}`);
  if (data === null) throw new Error(`${action}: data tidak ditemukan`);
  return data;
}

async function findAuthUser(email: string) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Mencari akun ${email}: ${error.message}`);
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
}

async function ensureAccounts() {
  const userIds = new Map<string, string>();

  for (const account of accounts) {
    let user = await findAuthUser(account.email);
    if (user) {
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: account.fullName,
          staff_id: account.staffId,
          school_unit: account.schoolUnit,
        },
      });
      user = must(data.user, error, `Memperbarui akun ${account.email}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: account.fullName,
          staff_id: account.staffId,
          school_unit: account.schoolUnit,
        },
      });
      user = must(data.user, error, `Membuat akun ${account.email}`);
    }

    const { error } = await supabase.from("school_staff_profiles").upsert(
      {
        user_id: user.id,
        full_name: account.fullName,
        staff_id: account.staffId,
        school_unit: account.schoolUnit,
        role: account.role,
        account_status: "active",
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(`Menyimpan profil ${account.email}: ${error.message}`);
    userIds.set(account.email, user.id);
  }

  const adminId = userIds.get("admin@demo.invensmk.local");
  const officerId = userIds.get("petugas@demo.invensmk.local");
  const teacherId = userIds.get("guru@demo.invensmk.local");
  const studentId = userIds.get("siswa@demo.invensmk.local");
  if (!adminId || !officerId || !teacherId || !studentId) throw new Error("Akun demo tidak lengkap");
  return { adminId, officerId, teacherId, studentId };
}

async function seedInventory() {
  const categoryNames = categorySeeds.map(({ name }) => name);
  const { data: existingCategories, error: categoryQueryError } = await supabase
    .from("categories")
    .select("id, name")
    .in("name", categoryNames);
  const rows = must(existingCategories, categoryQueryError, "Membaca kategori");
  const categoryIds = new Map(rows.map((category) => [category.name, category.id]));

  for (const category of categorySeeds) {
    if (categoryIds.has(category.name)) continue;
    const { data, error } = await supabase.from("categories").insert(category).select("id").single();
    categoryIds.set(category.name, must(data, error, `Membuat kategori ${category.name}`).id);
  }

  const itemRows = itemSeeds.map(({ category, ...item }) => {
    const categoryId = categoryIds.get(category);
    if (!categoryId) throw new Error(`Kategori ${category} tidak ditemukan`);
    return { ...item, category_id: categoryId };
  });
  const { error: itemUpsertError } = await supabase.from("items").upsert(itemRows, { onConflict: "barcode" });
  if (itemUpsertError) throw new Error(`Menyimpan barang: ${itemUpsertError.message}`);

  const { data, error } = await supabase
    .from("items")
    .select("id, barcode")
    .in("barcode", itemSeeds.map(({ barcode }) => barcode));
  const items = must(data, error, "Membaca barang demo");
  return new Map(items.map((item) => [item.barcode, item.id]));
}

async function seedLoans(
  itemIds: Map<string, string>,
  users: { officerId: string; teacherId: string; studentId: string },
) {
  const now = Date.now();
  const days = (value: number) => new Date(now + value * 24 * 60 * 60 * 1000).toISOString();
  const laptopId = itemIds.get("DEMO-LAPTOP-001");
  const projectorId = itemIds.get("DEMO-PROYECTOR-001");
  const chromebookId = itemIds.get("DEMO-CHROMEBOOK-001");
  if (!laptopId || !projectorId || !chromebookId) throw new Error("Barang untuk contoh peminjaman tidak ditemukan");

  const loans = [
    { id: seededLoans.active, item_id: laptopId, borrower_id: users.studentId, officer_id: users.officerId, borrowed_at: days(-1), due_at: days(7), status: "active", returned_at: null, return_officer_id: null, return_condition: null, notes: "Untuk praktik pemrograman" },
    { id: seededLoans.overdue, item_id: projectorId, borrower_id: users.teacherId, officer_id: users.officerId, borrowed_at: days(-10), due_at: days(-2), status: "active", returned_at: null, return_officer_id: null, return_condition: null, notes: "Dipakai untuk presentasi kelas" },
    { id: seededLoans.returned, item_id: chromebookId, borrower_id: users.studentId, officer_id: users.officerId, borrowed_at: days(-14), due_at: days(-10), status: "returned", returned_at: days(-11), return_officer_id: users.officerId, return_condition: "good", notes: "Untuk tugas kelompok" },
  ];
  const { error: loansError } = await supabase.from("loans").upsert(loans, { onConflict: "id" });
  if (loansError) throw new Error(`Menyimpan peminjaman: ${loansError.message}`);

  const logs = [
    { id: "b1000000-0000-4000-8000-000000000001", item_id: laptopId, loan_id: seededLoans.active, condition: "good", event: "borrowed", notes: "Untuk praktik pemrograman", recorded_by: users.officerId, recorded_at: days(-1) },
    { id: "b1000000-0000-4000-8000-000000000002", item_id: projectorId, loan_id: seededLoans.overdue, condition: "good", event: "borrowed", notes: "Dipakai untuk presentasi kelas", recorded_by: users.officerId, recorded_at: days(-10) },
    { id: "b1000000-0000-4000-8000-000000000003", item_id: chromebookId, loan_id: seededLoans.returned, condition: "good", event: "borrowed", notes: "Untuk tugas kelompok", recorded_by: users.officerId, recorded_at: days(-14) },
    { id: "b1000000-0000-4000-8000-000000000004", item_id: chromebookId, loan_id: seededLoans.returned, condition: "good", event: "returned", notes: "Dikembalikan dalam kondisi baik", recorded_by: users.officerId, recorded_at: days(-11) },
  ];
  const { error: logsError } = await supabase.from("condition_logs").upsert(logs, { onConflict: "id" });
  if (logsError) throw new Error(`Menyimpan riwayat kondisi: ${logsError.message}`);
}

async function main() {
  const users = await ensureAccounts();
  const itemIds = await seedInventory();
  await seedLoans(itemIds, users);
  console.log("Seed demo selesai. Akun: admin, petugas, guru, siswa.");
  console.log(`Password semua akun: ${demoPassword}`);
  console.log("Data mencakup kategori, barang tersedia/rusak/dipinjam, serta peminjaman aktif, terlambat, dan selesai.");
}

main().catch((error: unknown) => {
  console.error("Seed demo gagal:", error);
  process.exitCode = 1;
});
