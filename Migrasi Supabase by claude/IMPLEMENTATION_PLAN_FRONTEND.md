# IMPLEMENTATION_PLAN_FRONTEND.md — Rencana Aksi Frontend
## Integrasi Supabase, Cloudflare R2, dan Gemini BYOK — CoupleCash (Nuxt 3)

> Dokumen ini adalah panduan eksekusi teknis untuk tim frontend (Alfin Almustajab & tim) mengadaptasi kode Nuxt 3 existing agar terhubung ke arsitektur baru. Referensi silang: `PDD.md` (arsitektur), `SQL.md`/`DRIZLE.md` (skema), `DESIGN.md` (UI baru).

---

## 1. Instalasi Dependency Baru

```bash
npm install @supabase/supabase-js
npm install @google/generative-ai
npm install idb              # wrapper IndexedDB yang lebih ergonomis
# @aws-sdk/client-s3 HANYA di server (Nitro), bukan di client bundle
```

## 2. Konfigurasi Nuxt (`nuxt.config.ts`)

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-only (tidak ter-expose ke client)
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2AccountId: process.env.R2_ACCOUNT_ID,
    public: {
      // Aman diekspos ke client
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
});
```

## 3. Supabase Client (Composable)

`composables/useSupabase.ts`:

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function useSupabase() {
  if (!client) {
    const config = useRuntimeConfig();
    client = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
```

## 4. Migrasi `useAuthStore` ke Supabase Auth

```typescript
// stores/useAuthStore.ts
export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabase();
  const user = ref<null | { id: string; email: string }>(null);

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    user.value = { id: data.user.id, email: data.user.email! };
    return data;
  }

  async function register(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data; // trigger fn_handle_new_auth_user() otomatis membuat baris public.users
  }

  async function logout() {
    await supabase.auth.signOut();
    user.value = null;
  }

  // Dengarkan perubahan sesi (refresh token, dsb.)
  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user ? { id: session.user.id, email: session.user.email! } : null;
  });

  return { user, login, register, logout };
});
```

**Checklist migrasi Auth:**
- [ ] Hapus seluruh endpoint `server/api/auth/login.post.ts` & `register.post.ts` custom lama (digantikan Supabase Auth langsung dari client).
- [ ] Update `middleware/auth.global.ts` untuk mengecek `supabase.auth.getSession()`, bukan cookie JWT custom.
- [ ] Tambahkan halaman `auth/reset-password.vue` untuk alur reset password pasca-migrasi (lihat `MIGRATION.md` §3a).

## 5. Query Data via Supabase Client (RLS-aware)

Untuk operasi baca ringan yang aman dilakukan langsung dari client (RLS akan otomatis membatasi ke household user login):

```typescript
// stores/useTransactionsStore.ts
export const useTransactionsStore = defineStore('transactions', () => {
  const supabase = useSupabase();
  const transactions = ref<any[]>([]);

  async function fetchByPeriod(start: string, end: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, financial_accounts(name), categories(name, icon)')
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    transactions.value = data;
  }

  async function createManual(payload: NewTransactionInput) {
    const { data, error } = await supabase.from('transactions').insert(payload).select().single();
    if (error) throw error;
    transactions.value.unshift(data);
    return data;
  }

  return { transactions, fetchByPeriod, createManual };
});
```

> **Aturan tim**: operasi yang menyentuh data sensitif (vault credentials decrypt, AI context aggregation, storage presign) **tetap wajib** lewat Nitro `server/api/*` memakai `service_role` key — jangan pernah memindahkan logika itu ke client meskipun secara teknis RLS "mengizinkan" query langsung.

## 6. Upload Struk ke Cloudflare R2 (Alur Presigned URL)

### 6.1 Nitro Endpoint: `server/api/storage/presign.post.ts`

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export default defineEventHandler(async (event) => {
  const { fileName, fileType, bucket } = await readBody(event);
  const config = useRuntimeConfig();

  // Validasi tipe & bucket yang diizinkan
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(fileType)) {
    throw createError({ statusCode: 400, statusMessage: 'Tipe file tidak didukung' });
  }
  const allowedBuckets = ['couplecash-receipts', 'couplecash-avatars'];
  if (!allowedBuckets.includes(bucket)) {
    throw createError({ statusCode: 400, statusMessage: 'Bucket tidak valid' });
  }

  const user = await getAuthenticatedUser(event); // verifikasi JWT Supabase, ambil household_id
  const ext = fileName.split('.').pop();
  const objectKey = `${user.householdId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.r2AccessKeyId, secretAccessKey: config.r2SecretAccessKey },
  });

  const command = new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: fileType });
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 menit

  return { uploadUrl, objectKey };
});
```

### 6.2 Frontend: `ReceiptScanModal.vue` (logika upload)

```typescript
async function uploadReceiptFile(file: File) {
  uploadState.value = 'preparing';
  const { uploadUrl, objectKey } = await $fetch('/api/storage/presign', {
    method: 'POST',
    body: { fileName: file.name, fileType: file.type, bucket: 'couplecash-receipts' },
  });

  uploadState.value = 'uploading';
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      uploadProgress.value = Math.round((e.loaded / e.total) * 100);
    };
    xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error('Upload gagal')));
    xhr.onerror = () => reject(new Error('Upload gagal'));
    xhr.send(file);
  });

  uploadState.value = 'analyzing';
  return analyzeReceiptWithAi(objectKey); // lanjut ke Langkah 7
}
```

### 6.3 Menampilkan Gambar Struk (Presigned GET)

```typescript
// server/api/storage/view.get.ts — generate presigned GET URL saat dibutuhkan (bukan disimpan permanen)
export default defineEventHandler(async (event) => {
  const { objectKey, bucket } = getQuery(event);
  // ...verifikasi user berhak akses object ini (household match)...
  const command = new GetObjectCommand({ Bucket: bucket as string, Key: objectKey as string });
  const url = await getSignedUrl(r2, command, { expiresIn: 900 }); // 15 menit
  return { url };
});
```

## 7. Integrasi Gemini AI dengan BYOK

### 7.1 Composable Penyimpanan Key Terenkripsi Lokal

`composables/useGeminiKeyVault.ts`:

```typescript
import { openDB } from 'idb';

const DB_NAME = 'couplecash-ai-vault';
const STORE_NAME = 'keys';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) { db.createObjectStore(STORE_NAME); },
  });
}

async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

export function useGeminiKeyVault() {
  async function saveKey(apiKey: string, appPin: string) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await deriveKeyFromPin(appPin, salt);
    const enc = new TextEncoder().encode(apiKey);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, enc);

    const db = await getDb();
    await db.put(STORE_NAME, { ciphertext, iv, salt }, 'gemini_api_key');
  }

  async function getKey(appPin: string): Promise<string | null> {
    const db = await getDb();
    const record = await db.get(STORE_NAME, 'gemini_api_key');
    if (!record) return null;
    const cryptoKey = await deriveKeyFromPin(appPin, record.salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, cryptoKey, record.ciphertext);
    return new TextDecoder().decode(plain);
  }

  async function deleteKey() {
    const db = await getDb();
    await db.delete(STORE_NAME, 'gemini_api_key');
  }

  async function hasKey(): Promise<boolean> {
    const db = await getDb();
    return (await db.get(STORE_NAME, 'gemini_api_key')) !== undefined;
  }

  return { saveKey, getKey, deleteKey, hasKey };
}
```

### 7.2 Validasi Key Sebelum Disimpan (dipanggil dari `GeminiApiKeyCard.vue`)

```typescript
async function validateAndSaveKey(apiKey: string, appPin: string) {
  const { valid, error } = await $fetch('/api/ai/validate-key', {
    method: 'POST',
    headers: { 'X-Gemini-Api-Key': apiKey },
  });
  if (!valid) throw new Error(error ?? 'Kunci tidak valid');

  const vault = useGeminiKeyVault();
  await vault.saveKey(apiKey, appPin);
  await $fetch('/api/ai/settings', { method: 'PUT', body: { aiEnabled: true } }); // hanya flag, bukan key
}
```

`server/api/ai/validate-key.post.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export default defineEventHandler(async (event) => {
  const apiKey = getHeader(event, 'x-gemini-api-key');
  if (!apiKey) return { valid: false, error: 'Kunci kosong' };
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    await model.generateContent('ping'); // panggilan ringan untuk validasi
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e.status === 429 ? 'Kuota habis' : 'Kunci tidak valid' };
  }
  // PENTING: apiKey TIDAK ditulis ke log/variable persisten apapun di sini
});
```

### 7.3 Panggilan AI Receipt Scan dari Frontend

```typescript
async function analyzeReceiptWithAi(objectKey: string) {
  const vault = useGeminiKeyVault();
  const apiKey = await vault.getKey(appPinFromSession.value); // diambil dari sesi app-lock aktif
  if (!apiKey) {
    // Redirect ke AiFeatureLockedState, jangan lempar error teknis ke user
    return navigateTo('/akun/pengaturan/ai');
  }

  const result = await $fetch('/api/ai/analyze-receipt', {
    method: 'POST',
    headers: { 'X-Gemini-Api-Key': apiKey },
    body: { objectKey, bucket: 'couplecash-receipts' },
  });
  return result.data; // { amount, date, time, merchant, suggested_category, confidence }
}
```

### 7.4 Nitro Endpoint AI Receipt Analyzer (server-side, memakai key user + ambil object dari R2)

```typescript
// server/api/ai/analyze-receipt.post.ts
export default defineEventHandler(async (event) => {
  const apiKey = getHeader(event, 'x-gemini-api-key');
  if (!apiKey) throw createError({ statusCode: 401, statusMessage: 'AI_KEY_MISSING' });

  const { objectKey, bucket } = await readBody(event);
  const imageBase64 = await fetchObjectAsBase64FromR2(bucket, objectKey); // server-to-R2, kredensial server

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Ekstrak data dari struk ini menjadi JSON: { amount:number, date:"YYYY-MM-DD", time:"HH:mm", merchant:string, suggested_category:string, confidence:number }. Gunakan Rupiah tanpa desimal.`;
    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
      { text: prompt },
    ]);
    const json = JSON.parse(result.response.text());
    return { success: true, data: json };
  } catch (e: any) {
    const code = e.status === 401 ? 'AI_KEY_INVALID' : e.status === 429 ? 'AI_QUOTA_EXCEEDED' : 'AI_UNKNOWN_ERROR';
    throw createError({ statusCode: 400, statusMessage: code });
  }
});
```

## 8. Rencana Kerja per Halaman (Ringkas)

| Halaman/Komponen | Perubahan yang Dibutuhkan |
|---|---|
| `auth/login.vue`, `register.vue` | Ganti pemanggilan API custom → `useAuthStore` berbasis Supabase Auth |
| `auth/join-household.vue` | Tidak berubah signifikan (tetap invite code), pastikan `household_id` di-set setelah Supabase Auth sukses |
| `overview/index.vue` | Ganti fetch data akun/transaksi ke query Supabase client (RLS-aware) sesuai §5 |
| `input/kamera.vue` (`ReceiptScanModal.vue`) | Implementasi alur presigned upload R2 + progress bar (§6, `DESIGN.md` §3.3) |
| `akun/pengaturan/ai.vue` (baru) | Implementasi `GeminiApiKeyCard.vue` sesuai §7.1–7.2 |
| `wawasan/index.vue` (AI Chat) | Tambahkan pengecekan `hasKey()` sebelum render chat input; kirim header `X-Gemini-Api-Key` di setiap request chat |
| `akun/keamanan.vue` (Vault) | Tidak berubah signifikan — tetap enkripsi AES-256-GCM di server, hanya sumber datanya kini Supabase |
| Semua halaman `pages/akun/*` | Tambahkan slot `SyncStatusBadge.vue` di header sesuai `DESIGN.md` §3.4 |

## 9. Urutan Eksekusi yang Disarankan

Sebelum itu set up MCP Supabase dengan format yang telah saya siapkan di file `MCP_Supabase.md`
1. Setup Supabase client & migrasi Auth (§3–4) — deploy ke staging, uji login/register end-to-end.
2. Migrasi store data inti (transactions, accounts, budgets) ke query Supabase (§5) — verifikasi RLS tidak memblokir alur normal.
3. Implementasi storage presign + upload UI (§6) — uji upload & tampil ulang gambar struk.
4. Implementasi BYOK Gemini vault + validasi key (§7.1–7.2) — uji simpan/hapus/ganti key.
5. Sambungkan AI Receipt Scan & AI Chat ke endpoint baru (§7.3–7.4) — uji end-to-end dengan key Gemini asli (akun developer sendiri untuk testing).
6. QA regresi penuh seluruh fitur produk sesuai `SRS.md` sebelum dianggap siap cutover (lihat `MITIGATION.md` §6 Go/No-Go Checklist).
