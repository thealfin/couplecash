# CoupleCash

## Smart Cash Flow & Financial Management for Couples

<p align="center">
  <img src="public/pwa-icon.png" alt="CoupleCash Logo" width="120" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(70,72,212,0.35);" />
</p>

<p align="center">
  <b><i>"Keuangan Kita, Satu Misi. Kelola uang bersama jadi lebih hangat, transparan, dan tanpa drama."</i></b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Nuxt-4.5.2-00DC82?style=for-the-badge&logo=nuxtdotjs&logoColor=white" alt="Nuxt 4" />
  <img src="https://img.shields.io/badge/Vue-3.5.41-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Cloudflare_R2-Storage-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare R2" />
  <img src="https://img.shields.io/badge/Google_Gemini-2.5_Flash_%26_Pro-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/WebAuthn-FIDO2_Biometrics-10B981?style=for-the-badge&logo=fido&logoColor=white" alt="WebAuthn FIDO2" />
  <img src="https://img.shields.io/badge/AES--256--GCM-Zero_Knowledge_Vault-6366F1?style=for-the-badge&logo=shield&logoColor=white" alt="Vault Security" />
  <img src="https://img.shields.io/badge/PWA-Ready-9B51E0?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
</p>

---

## 📖 Daftar Isi

1. [Tentang CoupleCash](#-tentang-couplecash)
2. [Tampilan Antarmuka Aplikasi (Screenshots)](#-tampilan-antarmuka-aplikasi-screenshots)
3. [Fitur Unggulan & Elemen Aplikasi](#-fitur-unggulan--elemen-aplikasi)
4. [Teknologi & Stack Teknis (Tech Stack)](#-teknologi--stack-teknis-tech-stack)
5. [Arsitektur Sistem & Data Flow](#-arsitektur-sistem--data-flow)
6. [Skema Database Supabase PostgreSQL](#-skema-database-supabase-postgresql)
7. [Integrasi Server & Katalog API (`/server/api`)](#-integrasi-server--katalog-api-serverapi)
8. [Keamanan & Privasi Tingkat Tinggi (Zero-Knowledge, WebAuthn & BYOK)](#-keamanan--privasi-tingkat-tinggi-zero-knowledge-webauthn--byok)
9. [Panduan Instalasi & Menjalankan Aplikasi](#-panduan-instalasi--menjalankan-aplikasi)
10. [Konfigurasi Environment Variables (`.env`)](#-konfigurasi-environment-variables-env)

---

## 🌟 Tentang CoupleCash

**CoupleCash** adalah aplikasi progressive web application (PWA) manajemen keuangan modern yang dirancang khusus untuk pasangan suami istri dan keluarga. Aplikasi ini memfasilitasi keterbukaan finansial tanpa menghilangkan privasi personal melalui pemisahan kepemilikan aset (_Suami_, _Istri_, dan _Bersama_).

Didukung oleh kecerdasan buatan **Google Gemini Multimodal AI (Vision OCR)** dengan konsep **BYOK (Bring Your Own Key)**, pasangan dapat memindai nota dan struk belanjaan secara instan tanpa mengorbankan privasi data keuangan mereka.

---

## 📸 Tampilan Antarmuka Aplikasi (Screenshots)

Berikut adalah galeri tangkapan layar antarmuka asli CoupleCash pada perangkat mobile:

|                             1. Masuk / Onboarding                             |                                2. Dashboard Beranda Bersama                                 |                          3. Kalender & Analitik Finansial                           |
| :---------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------: |
| <img src="docs/screenshots/01_auth_login.png" width="260" alt="Login Page" /> | <img src="docs/screenshots/02_beranda_dashboard.png" width="260" alt="Dashboard Beranda" /> | <img src="docs/screenshots/03_analitik.png" width="260" alt="Analitik Finansial" /> |
|       _Halaman autentikasi bersih dengan Google OAuth & Email/Password_       |             _Total saldo bersama, pembagian proporsi suami/istri, dan pos akun_             |       _Kalender arus kas harian dengan status pemasukan, beban, dan tagihan_        |

|                         4. Monitoring Budget Bulanan                          |                          5. Target Impian (Goals)                           |                     6. Manajemen Akun & Household                      |
| :---------------------------------------------------------------------------: | :-------------------------------------------------------------------------: | :--------------------------------------------------------------------: |
| <img src="docs/screenshots/04_budget.png" width="260" alt="Budget Bulanan" /> | <img src="docs/screenshots/05_goals.png" width="260" alt="Goals Bersama" /> | <img src="docs/screenshots/06_akun.png" width="260" alt="Menu Akun" /> |
|   _Batas pengeluaran per pos kategori dengan indikator visual over-budget_    |     _Tabungan bersama impian dengan tracking kontribusi suami & istri_      |   _Pengaturan rumah tangga (BuTi), status sinkronisasi, dan brankas_   |

|                           7. Pengaturan Asisten AI (BYOK)                           |                             8. Input Transaksi Manual Cepat                             |                              9. Kamera Pemindai Struk AI                              |
| :---------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------: |
| <img src="docs/screenshots/07_pengaturan_ai.png" width="260" alt="Pengaturan AI" /> | <img src="docs/screenshots/08_input_transaksi.png" width="260" alt="Input Transaksi" /> | <img src="docs/screenshots/09_kamera_scanner.png" width="260" alt="Kamera Scanner" /> |
|     _Konfigurasi terpusat Google Gemini (AIza... & AQ...) terenkripsi AES-GCM_      |          _Pencatatan fleksibel dengan nominal chips cepat & split pembayaran_           |            _Viewfinder hardware responsif dengan laser reticle & Live OCR_            |

<p align="center">
  <img src="docs/screenshots/10_ai_ocr_sheet.png" width="340" alt="AI OCR Engine Bottom Sheet" /><br>
  <i>Bottom Sheet Pengaturan Mesin OCR AI: Pilihan Gemini 2.5 Flash / Pro & Auto-Deskew Enhancer</i>
</p>

---

## 💎 Fitur Unggulan & Elemen Aplikasi

### 1. Dual-Ownership & Transparent Cash Flow

- **3 Tingkat Kepemilikan**: Setiap akun finansial, kategori, transaksi, anggaran, dan tagihan dapat ditandai sebagai:
  - 🔵 **Suami**: Akun atau beban milik suami.
  - 🔴 **Istri**: Akun atau beban milik istri.
  - 🟣 **Bersama**: Dana simpanan bersama keluarga.
- **Sensor Saldo Privasi**: Fitur sekali klik untuk menyembunyikan nominal saldo saat berada di ruang publik.

### 2. Sinkronisasi Real-Time & Household Pairing

- **Invite Code Unik**: Hubungkan akun pasangan melalui 6-karakter kode verifikasi rumah tangga.
- **Status Hubungan**: Kelola nama rumah tangga, motto keluarga, tanggal awal periode pembukuan (cut-off gaji), dan opsi pemutusan hubungan data dengan aman.

### 3. Pemindai Struk Cerdas Berbasis AI (Vision OCR)

- **Live Hardware Viewfinder**: Akses langsung ke kamera perangkat dengan deteksi otomatis kamera belakang (_environment_) pada ponsel dan webcam pada laptop.
- **Multimodal Extraction**: Membaca otomatis nama merchant/toko, tanggal, total pembayaran, subtotal, diskon, PPN/PB1, service charge, dan metode pembayaran.
- **Varian Model Google Gemini**:
  - **Gemini 2.5 Flash**: Ekstraksi super cepat (~800ms) hemat kuota token.
  - **Gemini 2.5 Pro**: Analisis presisi tinggi untuk struk kusut, buram, struk apotek panjang, atau tulisan tangan.
- **Offline Cache & Async Cloud Backup**: Nota disimpan seketika di IndexedDB lokal pengguna, sementara pencadangan gambar ke Cloudflare R2 dijalankan secara asinkron di latar belakang.

### 4. Anggaran (Budgeting) & Notifikasi Over-Budget

- Penetapan batas pagu pengeluaran bulanan per kategori.
- Progress bar interaktif dengan deteksi batas toleransi (_Over Budget Warning_).

### 5. Target Impian (Goals / Tabungan Bersama)

- Pantau progres tabungan liburan, dana pendidikan anak, atau pembelian rumah.
- Perhitungan proporsi kontribusi persentase antara Suami dan Istri secara otomatis.

### 6. Pengingat Tagihan & Langganan (Bills)

- Pencatatan pengeluaran rutin bulanan (listrik, internet, BPJS, streaming).
- Pelunasan satu klik (_Pay Bill_) yang otomatis mencatat transaksi pengeluaran dan memotong saldo akun finansial terkait.

### 7. Brankas Kredensial Digital (Secure Vault) & Autentikasi Biometrik (WebAuthn / FIDO2)

- **Zero-Knowledge Architecture**: Enkripsi penuh sisi klien menggunakan **AES-256-GCM** dengan random 96-bit IV. Kunci master turunan disimpan dalam IndexedDB terisolasi; server hanya menyimpan ciphertext dan metadata tanpa kemampuan membaca konten rahasia.
- **Autentikasi Biometrik Perangkat Asli**: Buka brankas menggunakan sensor biometrik bawaan (Touch ID, Face ID, Windows Hello, Android Biometrics) berbasis standar **WebAuthn / FIDO2**.
- **PIN Cadangan Terproteksi Tinggi**: Proteksi PIN 4–8 digit dengan algoritma **PBKDF2** (SHA-256, 100.000 putaran bergaram unik).
- **Multi-Device Credential Management**: Dukungan pendaftaran banyak perangkat biometrik per pengguna dengan kemampuan pencabutan hak akses (_revocation_) instan.
- **Auto-Lock Lifecycle**: Penguncian otomatis berbasis durasi (Segera, 1m, 5m, 15m, 30m) serta penguncian instan saat jendela diminimize atau tab peramban disembunyikan.
- **Audit Logging Terperinci**: Setiap operasi buka brankas, pendaftaran/pencabutan biometrik, dan pengubahan kredensial tercatat pada riwayat audit untuk transparansi pasangan.

### 8. Mitigasi Skenario Pemisahan Hubungan & Harta Bersama

- **Halaman Simulasi Pembagian Harta Bersama (`/akun/harta-bersama`)**: Memfasilitasi perhitungan dan penyelesaian aset finansial secara transparan dan adil jika terjadi pemisahan hubungan.
- **5 Metode Pembagian Harta**:
  - ⚖️ **Bagi Rata (50% : 50%)**: Pembagian simetris separuh untuk masing-masing pihak.
  - 📊 **Proporsional Kontribusi Riil**: Dihitung otomatis berdasarkan rekam jejak kontribusi nyata Suami vs Istri pada pos tabungan dan goals.
  - 👨 **Sepenuhnya Milik Suami (100% : 0%)**: Penyerahan aset penuh ke pihak suami.
  - 👩 **Sepenuhnya Milik Istri (0% : 100%)**: Penyerahan aset penuh ke pihak istri.
  - ✏️ **Kustom Persentase Manual**: Fleksibilitas menentukan rasio pembagian sesuai kesepakatan bersama.
- **Pembersihan Data Terisolasi (Clean Data Separation)**:
  - Saat hubungan rumah tangga diputus (_unlink_), sistem membersihkan tagihan, anggaran, dan pos akun personal sehingga hanya data dengan kontribusi nyata dari pengguna yang dipertahankan.
  - Mencegah data tagihan atau transaksi pribadi salah satu pasangan tertinggal di akun mantan pasangannya.

### 9. Manajemen Sesi Multi-Perangkat & Proteksi Login

- **Deteksi Login Ganda Terisolasi**: Jika perangkat ke-2 melakukan login pada akun yang sama, sistem secara aman mengakhiri sesi perangkat ke-1 (_force logout_) dengan notifikasi instruksi yang jelas demi mencegah konflik data.

### 10. Progressive Web App (PWA) & Ergonomi UI Modern

- **Instalasi PWA Native-like**: Dapat diinstal langsung ke homescreen di Android, iOS, Windows, dan macOS tanpa bilah navigasi peramban.
- **Tata Letak & Spacing Berstandar**: Struktur kartu bagan berbalut padding ergonomis (`p-5 sm:p-6`) yang mencegah teks menyentuh garis tepi border, serta dialog modal PIN dan kredensial yang presisi di tengah layar (`m-auto`).

---

## 🛠 Teknologi & Stack Teknis (Tech Stack)

| Kategori                          | Teknologi                                                 | Deskripsi / Peran                                                              |
| :-------------------------------- | :-------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **Frontend Framework**            | **Nuxt 4 (v4.5.2)** + **Vue 3 (v3.5.41)**                 | SSR/SPA modern berbasis Composition API dan file-based routing.                |
| **Styling & Design**              | **Tailwind CSS (v3.4)** + **Plus Jakarta Sans**           | Desain utility-first mobile responsif dengan warna dinamis & micro-animations. |
| **Backend / Server Engine**       | **Nitro (v2.13.4)**                                       | Fullstack TypeScript server routes terintegrasi di dalam Nuxt.                 |
| **Database & Auth**               | **Supabase (PostgreSQL 15)**                              | Relational database dengan Row Level Security (RLS) & Supabase Auth.           |
| **Database ORM & Types**          | **Drizzle ORM (v0.45)** + **postgres.js**                 | Type-safe SQL client dan query builder.                                        |
| **Cloud Object Storage**          | **Cloudflare R2** via **AWS SDK S3**                      | Penyimpanan gambar struk & avatar tanpa biaya transfer egress data.            |
| **Artificial Intelligence**       | **Google Gemini API (@google/generative-ai)**             | Multimodal AI Vision untuk OCR struk dan asisten keuangan interaktif.          |
| **Autentikasi Biometrik (FIDO2)** | **SimpleWebAuthn (`@simplewebauthn/browser` & `server`)** | FIDO2 WebAuthn untuk autentikasi Sidik Jari, Face ID, dan Windows Hello.       |
| **Kriptografi & Hashing PIN**     | **Web Crypto API (AES-256-GCM) & PBKDF2 (100k rounds)**   | Zero-knowledge client-side encryption dan hashing PIN berkekuatan tinggi.      |
| **Local Offline Cache**           | **IndexedDB (`idb` v8)**                                  | Penyimpanan lokal untuk cache struk, offline draft, dan master encryption key. |
| **Pengujian & Otomasi**           | **Playwright (v1.62)** & **Vitest / Native Test Suites**  | Validasi end-to-end, penangkapan screenshot, dan verifikasi vault security.    |

---

## 🏗 Arsitektur Sistem & Data Flow

```mermaid
graph TD
    subgraph Klien ["📱 Klien (Browser / Mobile PWA)"]
        UI["Vue 3 Nuxt Interface"]
        IDB[("IndexedDB Local Cache")]
        WebCrypto["Web Crypto AES-GCM"]
        CameraAPI["Navigator MediaDevices"]
    end

    subgraph Server ["⚡ Nitro Server Engine (Nuxt 4)"]
        APIAuth["/api/auth & users"]
        APIAI["/api/ai (Analyze & Chat)"]
        APITrx["/api/transactions & dashboard"]
        APIStorage["/api/storage (Presign & Upload)"]
    end

    subgraph Cloud ["☁️ Cloud Infrastructure & Services"]
        SupabaseAuth["Supabase GoTrue Auth"]
        SupabaseDB[("PostgreSQL Database (RLS)")]
        CloudflareR2[("Cloudflare R2 S3 Storage")]
        GeminiAPI["Google Gemini 2.5 API"]
    end

    UI <--> WebCrypto
    UI <--> IDB
    CameraAPI --> UI

    UI -- "HTTPS REST (Bearer JWT)" --> Server

    APIAuth <--> SupabaseAuth
    APITrx <--> SupabaseDB
    APIAI -- "X-Gemini-Api-Key (BYOK)" --> GeminiAPI
    APIStorage <--> CloudflareR2
```

### Alur Pemindaian Struk AI (Vision OCR Pipeline):

1. Pengguna mengambil foto struk di [`app/pages/input/kamera.vue`](file:///d:/All%20Project%20Website/CoupleCash/app/pages/input/kamera.vue).
2. Frame langsung dikonversi ke JPEG base64 dan disimpan di IndexedDB lokal pengguna secara instan.
3. Kunci Gemini API didekripsi dari IndexedDB menggunakan Web Crypto API dan dikirimkan via header `X-Gemini-Api-Key`.
4. Endpoint Nitro `/api/ai/analyze-receipt` memanggil model Google Gemini (Flash / Pro) dengan output format terstruktur JSON.
5. Secara paralel (asinkron), foto struk diunggah ke bucket Cloudflare R2 tanpa mengunci respons OCR pengguna.
6. Hasil ekstraksi dialirkan ke halaman review transaksi untuk dikonfirmasi dan disimpan ke Supabase PostgreSQL.

### Alur Kriptografi Brankas & Autentikasi Biometrik (Vault Security Pipeline):

1. **Registrasi Biometrik**: Klien meminta challenge WebAuthn ke `/api/security/webauthn/register/options`. Hardware autentikator (Windows Hello, Touch ID, Face ID) menghasilkan Public/Private Keypair lokal. Public Key disimpan ke tabel `user_biometric_credentials`, sedangkan Private Key tetap aman di dalam enclave hardware perangkat.
2. **Buka Brankas (Unlock)**: Saat pengguna melakukan sensor biometrik atau memasukkan PIN (PBKDF2), klien memverifikasi kredensial ke `/api/security/*` dan menerima token sesi brankas bertanda tangan.
3. **Dekripsi Sisi Klien**: Master Key didekripsi di browser lokal (Web Crypto AES-256-GCM). Data sandi didekripsi secara on-the-fly di memori peramban tanpa pernah mengirimkan teks sandi asli (plaintext) ke server.
4. **Auto-Lock & Memory Wipe**: Setelah timeout tercapai atau saat aplikasi berpindah tab/minimize, kunci enkripsi di memori langsung dihapus (zeroed out) dan status kembali terkunci.

---

## 🗄 Skema Database Supabase PostgreSQL

Basis data CoupleCash menggunakan PostgreSQL dengan identifikasi primer **UUIDv7** (time-ordered sequential UUIDs) untuk efisiensi indexing:

```mermaid
erDiagram
    households ||--o{ users : "memiliki anggota"
    households ||--o{ financial_accounts : "memiliki pos akun"
    households ||--o{ categories : "memiliki kategori"
    households ||--o{ transactions : "memiliki transaksi"
    households ||--o{ budgets : "memiliki pagu anggaran"
    households ||--o{ bills : "memiliki tagihan rutin"
    households ||--o{ recurring_assets : "memiliki aset rutin"
    households ||--o{ goals : "memiliki target impian"
    households ||--o{ vault_credentials : "memiliki brankas"
    households ||--o{ ai_chat_sessions : "memiliki sesi chat ai"

    users ||--o{ transactions : "mencatat"
    users ||--o{ goals : "membuat"
    users ||--o{ vault_credentials : "pemilik"
    users ||--o{ user_biometric_credentials : "memiliki perangkat biometrik"
    users ||--o| ai_user_settings : "konfigurasi ai"

    financial_accounts ||--o{ transactions : "sumber dana"
    categories ||--o{ transactions : "kategori beban"
    categories ||--o{ budgets : "kategori anggaran"
    bills ||--o| transactions : "menghasilkan transaksi"
    ai_chat_sessions ||--o{ ai_chat_messages : "memiliki pesan"
```

### Rincian Tabel Utama:

1. **`households`**: Data entitas rumah tangga pasangan.
   - `id` (UUIDv7 PK), `name`, `invite_code` (Unique), `currency` (IDR), `period_start_day`, `motto`.
2. **`users`**: Profil pengguna yang terhubung ke `auth.users`.
   - `id` (UUIDv7 PK), `auth_user_id` (FK), `household_id` (FK), `role` (`suami` / `istri`), `full_name`, `email`, `avatar_object_key`, `biometric_enabled`, `theme`, `language`, `pin_hash`, `pin_salt`.
3. **`financial_accounts`**: Rekening bank, dompet digital, kartu kredit, atau pinjaman.
   - `id`, `household_id`, `owner_type` (`suami`/`istri`/`bersama`), `account_type` (`bank`/`ewallet`/`cash`/`credit`/`debt`), `name`, `current_balance`, `initial_balance`, `account_number_masked`.
4. **`categories`**: Kategori pengeluaran dan pemasukan.
   - `id`, `household_id`, `type` (`income`/`expense`), `name`, `icon`, `color_token`, `applies_to`.
5. **`transactions`**: Riwayat transaksi kas.
   - `id`, `household_id`, `account_id`, `category_id`, `recorded_by_user_id`, `type`, `amount`, `transaction_date`, `merchant_name`, `source` (`manual`/`ai_scan`), `receipt_object_key`, `receipt_storage` (`cloudflare_r2`), `tax_amount`, `payment_method`.
6. **`budgets`**: Batas anggaran per kategori periode bulanan.
   - `id`, `household_id`, `category_id`, `limit_amount`, `period_start`, `period_end`.
7. **`bills`**: Pengingat tagihan dan langganan berkala.
   - `id`, `household_id`, `name`, `amount`, `due_date`, `is_recurring`, `recurrence_rule`, `status` (`pending`/`paid`), `linked_transaction_id`.
8. **`goals`**: Target tabungan bersama.
   - `id`, `household_id`, `name`, `target_amount`, `target_date`, `partner_1_contribution`, `partner_2_contribution`, `status`.
9. **`vault_credentials`**: Kredensial rahasia keluarga terenkripsi AES-256-GCM.
   - `id`, `household_id`, `owner_user_id`, `platform_type`, `platform_name`, `username_masked`, `secret_encrypted`, `secret_encryption_iv`, `encryption_version`, `encryption_algorithm`, `is_deleted`.
10. **`user_biometric_credentials`**: Kredensial autentikator FIDO2 / WebAuthn per perangkat.
    - `id`, `user_id`, `credential_id` (Unique text), `public_key` (BYTEA), `counter` (BIGINT), `device_type`, `aaguid`, `is_revoked`, `last_used_at`, `created_at`.
11. **`ai_user_settings`**, **`ai_chat_sessions`**, **`ai_chat_messages`**: Riwayat interaksi asisten keuangan cerdas.
12. **`audit_logs`**: Rekam jejak audit aktivitas rumah tangga, brankas, pencabutan biometrik, dan perubahan status untuk transparansi penuh kedua pasangan.

---

## 🔌 Integrasi Server & Katalog API (`/server/api`)

Seluruh endpoint server dibangun di atas arsitektur Nitro Server Routes yang terbagi dalam modular domain:

### 1. Manajemen Akun & Finansial (`/api/accounts`)

- `GET /api/accounts`: Mengambil seluruh daftar rekening bank, e-wallet, uang tunai, dan pos hutang.
- `POST /api/accounts`: Mendaftarkan pos akun finansial baru.
- `PUT /api/accounts/[id]`: Memperbarui data akun (nama, warna, icon, saldo awal).
- `DELETE /api/accounts/[id]`: Menghapus (soft delete) pos akun.
- `POST /api/accounts/pay-debt`: Melunasi pinjaman/hutang dan otomatis menyesuaikan saldo rekening pemotong.

### 2. Kecerdasan Buatan & OCR (`/api/ai`)

- `POST /api/ai/validate-key`: Validasi kunci API Gemini langsung ke Google AI API (Mendukung prefix `AIza...` dan format baru `AQ...`).
- `POST /api/ai/analyze-receipt`: Analisis gambar struk berbasis Vision AI untuk mengurai nominal, merchant, tanggal, dan PPN.
- `GET /api/ai/settings` & `PUT /api/ai/settings`: Sinkronisasi preferensi model AI dan status aktivasi.
- `GET /api/ai/sessions` & `POST /api/ai/sessions`: Manajemen riwayat percakapan konsultasi finansial.
- `POST /api/ai/chat`: Streaming interaksi pesan dengan Gemini Financial Advisor.

### 3. Analitik & Kalender Arus Kas (`/api/analytics`)

- `GET /api/analytics`: Mengambil agregasi arus kas, perbandingan pemasukan vs pengeluaran, dan rasio belanja bulanan.
- `GET /api/analytics/calendar`: Data transaksi kalender per tanggal untuk visualisasi titik status pemasukan, beban, dan tagihan.

### 4. Transaksi & Dashboard (`/api/transactions`, `/api/dashboard`)

- `GET /api/dashboard`: Ringkasan instan saldo gabungan, saldo per individu, transaksi terbaru, dan tagihan jatuh tempo.
- `POST /api/transactions`: Mencatat transaksi pemasukan, pengeluaran, atau transfer antar pos rekening.

### 5. Anggaran & Pagu Belanja (`/api/budgets`)

- `GET /api/budgets`: Menghitung penggunaan anggaran terhadap transaksi nyata di periode berjalan.
- `POST /api/budgets`, `PUT /api/budgets/[id]`, `DELETE /api/budgets/[id]`: Operasi CRUD anggaran kategori.

### 6. Tagihan & Langganan (`/api/bills`)

- `GET /api/bills` & `POST /api/bills`: Pencatatan tagihan listrik, internet, cicilan, dan asuransi.
- `POST /api/bills/pay`: Bayar tagihan satu klik dengan pembuatan transaksi otomatis.

### 7. Hubungan Pasangan & Rumah Tangga (`/api/couple`)

- `POST /api/couple/generate-code`: Membuat 6-digit kode undangan rumah tangga.
- `POST /api/couple/verify-code`: Memasukkan kode pasangan untuk bergabung ke household yang sama.
- `PUT /api/couple/household`: Mengubah profil dan motto rumah tangga.
- `GET /api/couple/settlement`: Mengambil skenario simulasi pembagian harta bersama dan kontribusi riil pasangan.
- `POST /api/couple/unlink`: Memutus keterikatan household secara terisolasi dengan mitigasi pembersihan data bersih.

### 8. Penyimpanan Cloudflare R2 (`/api/storage`)

- `POST /api/storage/presign`: Membuat Signed URL S3 untuk upload langsung dari klien.
- `POST /api/storage/upload`: Proxy upload server untuk file nota transaksi.
- `GET /api/storage/view`: Mendapatkan link tampilan foto struk dengan masa berlaku terbatas.
- `DELETE /api/storage/delete`: Menghapus file fisik dari bucket Cloudflare R2.

### 9. Target Impian Bersama (`/api/goals`)

- `GET /api/goals` & `POST /api/goals`: Pengelolaan target impian tabungan.
- `POST /api/goals/contribute`: Setoran kontribusi tabungan dari suami atau istri ke pos impian.

### 10. Autentikasi Biometrik & Keamanan (`/api/security`)

- `POST /api/security/webauthn/register/options`: Menghasilkan options challenge WebAuthn FIDO2 untuk pendaftaran perangkat.
- `POST /api/security/webauthn/register/verify`: Memverifikasi attestation pendaftaran dan menyimpan public key perangkat.
- `POST /api/security/webauthn/authenticate/options`: Menghasilkan challenge autentikasi biometrik.
- `POST /api/security/webauthn/authenticate/verify`: Memverifikasi assertion biometrik dan menerbitkan signed vault authorization token.
- `GET /api/security/webauthn/devices`: Mengambil daftar autentikator biometrik terdaftar milik pengguna.
- `POST /api/security/webauthn/devices/revoke`: Mencabut akses biometrik perangkat yang hilang atau tidak digunakan lagi.
- `POST /api/security/pin/set`: Mengatur atau memperbarui PIN keamanan cadangan dengan hash PBKDF2 100.000 iterasi.
- `POST /api/security/pin/verify`: Memvalidasi PIN cadangan dan menerbitkan signed vault authorization token.

### 11. Brankas Kredensial Keluarga (`/api/vault`)

- `GET /api/vault`: Mengambil metadata kredensial dan ciphertext terenkripsi (server-side zero decryption).
- `POST /api/vault`: Menyimpan item kredensial baru terenkripsi AES-256-GCM dari sisi klien.
- `PUT /api/vault/[id]`: Memperbarui data kredensial terenkripsi.
- `DELETE /api/vault/[id]`: Menghapus (soft delete) kredensial dari brankas keluarga.
- `POST /api/vault/audit`: Mencatat log audit akses atau modifikasi brankas secara terstruktur.

---

## 🔐 Keamanan & Privasi Tingkat Tinggi (Zero-Knowledge, WebAuthn & BYOK)

CoupleCash dibangun berlandaskan arsitektur **Defense-in-Depth** dan prinsip **Privacy by Design**:

1. **Arsitektur Brankas Zero-Knowledge (Client-Side AES-256-GCM)**:
   - Enkripsi dan dekripsi kredensial rahasia keluarga dijalankan 100% pada peramban klien menggunakan Web Crypto API dengan IV acak 96-bit. Server CoupleCash hanya menerima ciphertext terenkripsi dan **tidak pernah memiliki akses atau kunci untuk mendekripsi isi brankas**.
2. **Autentikasi Biometrik FIDO2 / WebAuthn**:
   - Mendukung autentikator platform bawaan (Touch ID, Face ID, Windows Hello, Android Biometrics).
   - **Zero Biometric Storage**: Server tidak pernah meminta, menerima, ataupun menyimpan data sidik jari atau wajah pengguna. Verifikasi identitas sepenuhnya dieksekusi secara aman oleh enclave perangkat keras lokal.
3. **Proteksi PIN Cadangan Kuat (PBKDF2 100.000 Rounds)**:
   - PIN cadangan 4–8 digit diproteksi menggunakan fungsi derivasi kunci **PBKDF2** (SHA-256) dengan 100.000 putaran bergaram unik (_salted_) sehingga kebal terhadap serangan brute-force dan tabel pelangi (_rainbow table_).
4. **Model BYOK (Bring Your Own Key) untuk AI**:
   - Kunci Google Gemini API dienkripsi AES-GCM 256-bit dan hanya disimpan di IndexedDB lokal browser pengguna. Server tidak menyimpan API key pengguna secara permanen di database publik.
5. **PostgreSQL Row Level Security (RLS) & Isolasi Multi-Household**:
   - Setiap baris data dalam database Supabase PostgreSQL diproteksi oleh kebijakan RLS ketat berbasis `household_id` dan `auth.uid()`. Pasangan dari rumah tangga lain tidak dapat melihat atau memodifikasi data keluarga Anda.
6. **Auto-Lock Lifecycle & Session Memory Wipe**:
   - Sesi brankas dilengkapi timer otomatis (Segera s/d 30 menit). Saat timeout tercapai atau saat aplikasi diminimize/berpindah tab, kunci dalam memori langsung dihapus (_memory wipe_) demi menjaga privasi visual.
7. **Pengecualian Cache Service Worker (No-Store Policy)**:
   - Service worker PWA dikonfigurasi untuk mengecualikan rute sensitif `/api/vault` dan `/api/security` serta mematuhi header `Cache-Control: no-store` demi mencegah kebocoran data terenkripsi ke penyimpanan cache offline browser.
8. **Data Masking & Transparansi Sesi**:
   - Nomor rekening, nomor kartu, dan data rahasia disamarkan (_masked_) pada antarmuka. Riwayat akses dan perubahan brankas tercatat pada audit log untuk keterbukaan penuh kedua pasangan.

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### Prasyarat:

- **Node.js**: Versi 20.x atau lebih baru (Disarankan Node.js 22 LTS / 25).
- **Package Manager**: `npm` atau `pnpm`.
- Akun **Supabase** (PostgreSQL + Auth).
- Akun **Cloudflare R2** (S3 Storage).
- Kunci API **Google AI Studio** (Gemini API Key).

### Langkah Instalasi:

1. **Clone repositori**:

   ```bash
   git clone https://github.com/thealfin/CoupleCash.git
   cd CoupleCash
   ```

2. **Install dependensi**:

   ```bash
   npm install
   ```

3. **Siapkan berkas lingkungan (`.env`)**:
   Salin dari template `.env.example`:

   ```bash
   cp .env.example .env
   ```

   Isi konfigurasi sesuai kredensial Supabase dan Cloudflare R2 Anda.

4. **Jalankan Development Server**:

   ```bash
   npm run dev
   ```

   Buka peramban Anda di `http://localhost:3000`.

5. **Build untuk Production**:
   ```bash
   npm run build
   node .output/server/index.mjs
   ```

---

## ⚙️ Konfigurasi Environment Variables (`.env`)

Pastikan variabel-variabel berikut terisi dengan benar di file `.env` Anda:

```env
# ── Supabase Database & Auth ──
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="eyJhbGciOi..."
SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
DATABASE_URL="postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:6543/postgres"

# ── Nuxt Public Runtime Config ──
NUXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NUXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."

# ── Cloudflare R2 Object Storage ──
R2_BUCKET_NAME="couplecash"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_ACCOUNT_ID="your-cloudflare-account-id"
```

---

## 📄 Lisensi

Hak Cipta © 2026 **CoupleCash Project**. Seluruh hak cipta dilindungi undang-undang.
Dibuat oleh thealfin (seorang programer yang b aja) untuk keluarga harmonis yang bijak mengelola finansial.
