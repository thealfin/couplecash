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
  <img src="https://img.shields.io/badge/Google_Gemini-2.5_s/d_3.8_Flash_%26_Pro-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI Multimodal" />
  <img src="https://img.shields.io/badge/Dark_Mode-OLED_True_Black-181A20?style=for-the-badge&logo=moon&logoColor=white" alt="Dark Mode" />
  <img src="https://img.shields.io/badge/AI_Chat-FinBot_Assistant-7C3AED?style=for-the-badge&logo=probot&logoColor=white" alt="FinBot AI Chat" />
  <img src="https://img.shields.io/badge/Export_Data-CSV_%26_Excel-107C41?style=for-the-badge&logo=microsoftexcel&logoColor=white" alt="Export CSV" />
  <img src="https://img.shields.io/badge/WebAuthn-FIDO2_Biometrics-10B981?style=for-the-badge&logo=fido&logoColor=white" alt="WebAuthn FIDO2" />
  <img src="https://img.shields.io/badge/AES--256--GCM-Zero_Knowledge_Vault-6366F1?style=for-the-badge&logo=shield&logoColor=white" alt="Vault Security" />
  <img src="https://img.shields.io/badge/PWA-Ready-9B51E0?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
</p>

---

## 📖 Daftar Isi

1. [Tentang CoupleCash](#-tentang-couplecash)
2. [Tampilan Antarmuka Aplikasi (Screenshots)](#-tampilan-antarmuka-aplikasi-screenshots)
3. [Fitur Unggulan Terbaru & Komprehensif](#-fitur-unggulan-terbaru--komprehensif)
   - [Pilihan Model AI Multimodal yang Variatif (Generasi 2.5 s/d 3.8)](#1-pilihan-model-ai-multimodal-yang-sangat-variatif-generasi-25-sd-38)
   - [Asisten Percakapan Finansial AI (FinBot AI Chat)](#2-asisten-percakapan-finansial-ai-finbot-ai-chat)
   - [Ekspor Data ke Format CSV & Microsoft Excel](#3-ekspor-data-ke-format-csv--microsoft-excel)
   - [Tema Gelap Penuh (Full OLED Dark Mode)](#4-tema-gelap-penuh-full-oled-dark-mode-experience)
   - [Kalender Finansial Adaptif & Analitik Terpadu](#5-kalender-finansial-adaptif--analitik-terpadu-ui-react-native)
   - [Transfer Antar Pos Akun Finansial](#6-transfer-pemindahan-saldo-antar-pos-akun)
   - [Dual-Ownership & Arus Kas Transparan](#7-dual-ownership--arus-kas-transparan)
   - [Pemindai Struk Kamera Hardware AI (Vision OCR)](#8-pemindai-struk-kamera-hardware-ai-vision-ocr)
   - [Mitigasi Pemisahan Hubungan & Penyelesaian Harta Bersama](#9-mitigasi-skenario-pemisahan-hubungan--penyelesaian-harta-bersama)
   - [Brankas Kredensial Keluarga & Biometrik WebAuthn FIDO2](#10-brankas-kredensial-keluarga--biometrik-webauthn-fido2)
   - [Manajemen Sesi Multi-Perangkat & Proteksi Login](#11-manajemen-sesi-multi-perangkat--proteksi-login)
   - [Progressive Web App (PWA) & Ergonomi UI Modern](#12-progressive-web-app-pwa--ergonomi-ui-modern)
4. [Teknologi & Stack Teknis (Tech Stack)](#-teknologi--stack-teknis-tech-stack)
5. [Arsitektur Sistem & Data Flow](#-arsitektur-sistem--data-flow)
6. [Skema Database Supabase PostgreSQL](#-skema-database-supabase-postgresql)
7. [Integrasi Server & Katalog API (`/server/api`)](#-integrasi-server--katalog-api-serverapi)
8. [Keamanan & Privasi Tingkat Tinggi (Zero-Knowledge, WebAuthn & BYOK)](#-keamanan--privasi-tingkat-tinggi-zero-knowledge-webauthn--byok)
9. [Panduan Instalasi & Menjalankan Aplikasi](#-panduan-instalasi--menjalankan-aplikasi)
10. [Konfigurasi Environment Variables (`.env`)](#-konfigurasi-environment-variables-env)

---

## 🌟 Tentang CoupleCash

**CoupleCash** adalah aplikasi progressive web application (PWA) manajemen keuangan modern dan asisten finansial cerdas yang dirancang khusus untuk pasangan suami istri dan keluarga harmonis. Aplikasi ini menjembatani transparansi keuangan bersama tanpa merampas kenyamanan privasi personal melalui pemisahan kepemilikan aset yang jelas (_Suami_, _Istri_, dan _Bersama_).

Didukung oleh kecerdasan buatan **Google Gemini Multimodal AI (Vision OCR & FinBot Conversational AI)** dengan arsitektur **BYOK (Bring Your Own Key)**, pasangan dapat memindai nota belanja instan, berkonsultasi seputar kesehatan arus kas, mengekspor laporan ke CSV/Excel, serta menikmati kenyamanan visual penuh dengan **OLED Dark Mode**.

---

## 📸 Tampilan Antarmuka Aplikasi (Screenshots)

Berikut adalah galeri tangkapan layar antarmuka CoupleCash di berbagai skenario penggunaan:

### 1. Fitur Baru: Asisten AI Chat, Pilihan Model & Tema Gelap

|                            Asisten AI Chat (FinBot)                            |                           Katalog Model Gemini Variatif                           |                              Tema Gelap (Dark Mode)                               |
| :----------------------------------------------------------------------------: | :-------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------: |
| <img src="docs/screenshots/12_ai_chat_finbot.png" width="260" alt="AI Chat" /> | <img src="docs/screenshots/14_pilihan_model_ai.png" width="260" alt="Model AI" /> | <img src="docs/screenshots/11_dark_mode_login.png" width="260" alt="Dark Mode" /> |
|      _Chat interaktif konsultasi arus kas dengan saran cepat & responsif_      |  _Pilihan luas model Gemini Flash vs Pro (2.5 s/d 3.8) tersinkronisasi terpusat_  |    _Palet warna hitam pekat OLED yang hemat baterai dan nyaman di mata malam_     |

### 2. Kalender Finansial Adaptif (Tampilan 1 Minggu, 2 Minggu, dan 1 Bulan)

|                              1 Minggu (7 Hari Adaptif)                              |                             2 Minggu (14 Hari Berjalan)                             |                             1 Bulan Penuh (Full Grid)                              |
| :---------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------: |
| <img src="docs/screenshots/13_kalender_finansial.jpg" width="260" alt="1 Minggu" /> | <img src="docs/screenshots/15_analitik_dark_2mgg.jpg" width="260" alt="2 Minggu" /> | <img src="docs/screenshots/16_analitik_dark_1bln.jpg" width="260" alt="1 Bulan" /> |
|             _Titik indikator pemasukan & pengeluaran + rincian harian_              |           _Perbandingan porsi belanja Suami vs Istri vs Bersama 14 hari_            |              _Grid kalender bulanan lengkap dengan navigasi chevron_               |

### 3. Dashboard Utama, Fitur Kamera OCR & Manajemen Finansial

|                              Dashboard Beranda Bersama                              |                                Kamera Scanner Struk AI                                |                                  Input Transaksi Cepat                                  |
| :---------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------: |
| <img src="docs/screenshots/02_beranda_dashboard.png" width="260" alt="Dashboard" /> | <img src="docs/screenshots/09_kamera_scanner.png" width="260" alt="Kamera Scanner" /> | <img src="docs/screenshots/08_input_transaksi.png" width="260" alt="Input Transaksi" /> |
|          _Saldo gabungan, proporsi kontribusi, pos rekening, dan tagihan_           |            _Hardware viewfinder live dengan laser reticle & OCR otomatis_             |            _Nominal chips cepat, split pos pembayaran, & transfer pos akun_             |

|                            Batas Anggaran (Budget)                            |                           Tabungan Impian (Goals)                           |                        Pengaturan Rumah Tangga                         |
| :---------------------------------------------------------------------------: | :-------------------------------------------------------------------------: | :--------------------------------------------------------------------: |
| <img src="docs/screenshots/04_budget.png" width="260" alt="Budget Bulanan" /> | <img src="docs/screenshots/05_goals.png" width="260" alt="Goals Bersama" /> | <img src="docs/screenshots/06_akun.png" width="260" alt="Menu Akun" /> |
|        _Pantau batas pengeluaran per pos kategori anti jebol anggaran_        |      _Progress tabungan bersama dengan rasio kontribusi suami & istri_      |     _Pengaturan identitas keluarga, status pasangan, dan brankas_      |

---

## 💎 Fitur Unggulan Terbaru & Komprehensif

### 1. Pilihan Model AI Multimodal yang Sangat Variatif (Generasi 2.5 s/d 3.8)

CoupleCash menghadirkan fleksibilitas mutakhir bagi pengguna untuk memilih mesin kecerdasan buatan Google Gemini sesuai preferensi kecepatan atau kedalaman analisis:

- **Dukungan Lintas Generasi & Seri**:
  - ⚡ **Gemini 2.5 Flash** (Default): Kecepatan kilat (~0.8 detik), sangat hemat token, optimal untuk pemindaian struk harian (kasir, minimarket, e-wallet) dan percakapan tanya-jawab ringkas.
  - 🧠 **Gemini 2.5 Pro**: Akurasi ekstra (~1.8 detik), penalaran multimodal mendalam untuk struk panjang apotek, kertas kusut, tinta termal pudar, dan struk berlipat.
  - 🚀 **Gemini 3.0 Flash & Pro**: Pemahaman multi-turn yang lebih luwes dan simulasi pelunasan hutang cerdas.
  - 🔬 **Gemini 3.1 s/d 3.8 Series**: Pilihan model eksperimental berkinerja tinggi untuk audit pos anggaran rumit.
  - 🌐 **Backward Compatibility**: Mendukung pula model Gemini 2.0 Flash dan Gemini 1.5 Flash.
- **Konfigurasi Tersinkronisasi**:
  - Model yang dipilih di menu **Akun ➔ Pengaturan Model AI** otomatis tersinkronisasi dengan opsi di **Bottom Sheet OCR Pemindai Kamera**.
- **Model BYOK (Bring Your Own Key)**:
  - Mendukung kunci API Google Gemini berformat standar (`AIza...`) maupun format generasi baru (`AQ...`).
  - Kunci dienkripsi dengan standar militer **AES-256-GCM** langsung di penyimpanan IndexedDB lokal browser pengguna.

### 2. Asisten Percakapan Finansial AI (FinBot AI Chat)

- **Floating Action Launcher Interaktif**: Tombol pintas melayang di pojok kanan bawah dengan animasi denyut visual (_pulse_) dan lencana bintang berkilau.
- **Tampilan Chat Modern & Ergonomis**:
  - Desain chat window modern yang terinspirasi dari aplikasi perpesanan instan terpopuler (WhatsApp).
  - Dilengkapi mekanisme cerdas pendeteksi keyboard virtual perangkat: saat keyboard aktif, bidang input chat dan riwayat percakapan otomatis bergeser ke posisi ideal sehingga pesan terakhir tetap terbaca utuh.
  - Form input diformat secara ketat agar browser tidak memunculkan saran sandi/kredensial yang mengganggu alur chat.
- **Saran Pertanyaan Cepat (Quick Chips)**:
  - _"Bagaimana kondisi arus kas kita bulan ini?"_
  - _"Kategori apa yang paling banyak menghabiskan anggaran?"_
  - _"Berapa perkiraan sisa uang tabungan sampai akhir bulan?"_
  - _"Berikan tips belanja hemat untuk pasangan baru."_
- **Konteks Finansial Real-time**: FinBot menganalisis transaksi nyata, status tagihan, dan saldo pos akun pasangan secara aman untuk memberikan saran keuangan objektif.

### 3. Ekspor Data ke Format CSV & Microsoft Excel

- **Multi-Table Export**:
  - 📄 **Riwayat Transaksi Kas**: Tanggal, waktu, tipe (Pemasukan/Pengeluaran/Transfer), kategori, pos akun, nominal Rupiah, pajak, kepemilikan (Suami/Istri/Bersama), nama merchant, dan catatan.
  - 🏦 **Pos Akun Finansial**: Nama akun, jenis rekening, kepemilikan, saldo saat ini, nomor rekening tersamarkan.
  - 📑 **Tagihan & Langganan**: Nama tagihan, nominal, tanggal jatuh tempo, siklus berulang, status (Lunas/Pending).
  - 📊 **Rencana Anggaran (Budgets)**: Kategori anggaran, batas pagu limit, realisasi pengeluaran, dan persentase utilisasi.
- **Filter Fleksibel**:
  - Seluruh Periode (All-time).
  - Bulan Berjalan (Current Month).
  - Rentang Tanggal Kustom (Custom Date Range Picker).
- **Keamanan Formula Injection (Anti-CSV Injection)**:
  - Seluruh nilai yang diawali karakter berbahaya (`=`, `+`, `-`, `@`, `\t`, `\r`) otomatis dinetralisir dengan tanda kutip aman (`'`) untuk melindungi perangkat pengguna saat file dibuka di Microsoft Excel atau Google Sheets.
- **Encoding Standar UTF-8 BOM (`\uFEFF`)**:
  - Menjamin format mata uang Rupiah dan simbol khusus terbaca sempurna tanpa teks acak atau masalah encoding.

### 4. Tema Gelap Penuh (Full OLED Dark Mode Experience)

- **3 Pilihan Preferensi Tema**:
  - ⚙️ **Otomatis**: Mengikuti tema sistem operasi perangkat secara real-time.
  - ☀️ **Terang (Light Mode)**: Nuansa cerah, bersih, dan lembut.
  - 🌙 **Gelap (Dark Mode)**: Warna hitam pekat elegan (`#0B0D12` & `#15171e`) bersahabat dengan layar OLED serta menghemat daya baterai.
- **Zero Color Leaking**:
  - Seluruh elemen telah disempurnakan: bilah navigasi bawah melengkung (_concave tabbar_), kartu kalender finansial, halaman analitik, kategori pengeluaran, kelola pos akun, form pelunasan hutang lunas, modal edit identitas keluarga, halaman penyelesaian harta bersama, hingga daftar tagihan tampil konsisten dalam mode gelap tanpa silau warna putih yang bocor.

### 5. Kalender Finansial Adaptif & Analitik Terpadu (UI React Native)

Mengadopsi antarmuka unggulan CoupleCash versi React Native:

- **Tampilan Terpisah**: Switcher atas yang intuitif antara **"Kalender Finansial"** dan **"Tren & Kategori"**.
- **Filter Rentang Waktu Adaptif**:
  - **1 Minggu**: Menampilkan 7 hari berjalan dengan nomor tanggal horizontal.
  - **2 Minggu**: Menampilkan 14 hari berjalan dalam 2 baris terstruktur.
  - **1 Bulan**: Menampilkan kalender grid 1 bulan penuh dengan hari Minggu berwarna merah cerah.
- **Indikator Titik Status Transaksi**:
  - 🟢 **Titik Hijau**: Ada mutasi pemasukan.
  - 🔴 **Titik Merah**: Ada mutasi pengeluaran.
  - 🟡 **Titik Kuning/Amber**: Ada pembayaran cicilan/hutang.
  - 🔵 **Pill Biru & Cincin Hari Ini**: Menandai tanggal yang sedang aktif dipilih.
- **Kartu Rincian Tanggal Terpilih**:
  - Side-by-side metric box: Box hijau untuk Total Pemasukan dan Box merah muda untuk Total Pengeluaran.
  - Daftar transaksi spesifik di hari tersebut lengkap dengan badge peran (Suami/Istri), catatan rekening, dan nominal.
- **Porsi Belanja Keluarga**:
  - Kartu pembanding proporsi pengeluaran Suami vs Istri vs Bersama dalam nominal Rupiah dan persentase.
- **Kategori Pengeluaran**:
  - Progress bar warna-warni, frekuensi transaksi `(Nx)`, nominal total, dan rasio belanja.

### 6. Transfer Pemindahan Saldo Antar Pos Akun

- Fitur mutasi saldo instan antar rekening/dompet keluarga (contoh: pemindahan saldo dari _BCA Rekening Utama_ ke _Gopay Operasional_, atau tarik tunai dari _Mandiri_ ke _Kas Fisik Rumah_).
- Dilengkapi ikon panah bolak-balik Material Symbols (`sync_alt`).
- Menghasilkan pencatatan mutasi ganda otomatis (pengurangan saldo akun asal dan penambahan saldo akun tujuan) secara atomik.

### 7. Dual-Ownership & Arus Kas Transparan

- **3 Tingkat Kepemilikan**: Setiap akun finansial, kategori, transaksi, anggaran, dan tagihan dapat ditandai sebagai:
  - 🔵 **Suami**: Akun atau beban milik suami.
  - 🔴 **Istri**: Akun atau beban milik istri.
  - 🟣 **Bersama**: Dana simpanan bersama keluarga.
- **Sensor Saldo Privasi**: Fitur sekali klik untuk menyembunyikan nominal saldo saat berada di ruang publik.

### 8. Pemindai Struk Kamera Hardware AI (Vision OCR)

- **Live Hardware Viewfinder**: Akses langsung ke kamera perangkat dengan deteksi otomatis kamera belakang (_environment_) pada ponsel dan webcam pada laptop.
- **Multimodal Extraction**: Membaca otomatis nama merchant/toko, tanggal, total pembayaran, subtotal, diskon, PPN/PB1, service charge, dan metode pembayaran.
- **Offline Cache & Async Cloud Backup**: Nota disimpan seketika di IndexedDB lokal pengguna, sementara pencadangan gambar ke Cloudflare R2 dijalankan secara asinkron di latar belakang.

### 9. Penyelesaian Harta Bersama & Pemisahan Data Bersih

- **Halaman Khusus Penyelesaian Harta (`/akun/harta-bersama`)**:
  - Langkah 1: **Inventarisasi Aset Bersama** (Pos akun bersama & target tabungan bersama).
  - Langkah 2: **Konfigurasi Pembagian Adil** (Opsi pembagian nominal Rp, persentase %, atau tetap dimiliki salah satu pihak).
  - Langkah 3: **Review Pemisahan & Non-Settlement Data** (Tagihan, kategori, dan anggaran personal dipisahkan mandiri tanpa konflik).
  - Langkah 4: **Konfirmasi Final & Pemutusan Hubungan Aman**.
- Menjamin tidak ada saldo atau riwayat transaksi pribadi yang terhapus secara sepihak.

### 10. Brankas Kredensial Keluarga & Biometrik WebAuthn FIDO2

- **Zero-Knowledge Architecture**: Enkripsi penuh sisi klien menggunakan **AES-256-GCM** dengan random 96-bit IV. Kunci master turunan disimpan dalam IndexedDB terisolasi; server hanya menyimpan ciphertext dan metadata tanpa kemampuan membaca konten rahasia.
- **Autentikasi Biometrik Perangkat Asli**: Buka brankas menggunakan sensor biometrik bawaan (Touch ID, Face ID, Windows Hello, Android Biometrics) berbasis standar **WebAuthn / FIDO2**.
- **PIN Cadangan Terproteksi Tinggi**: Proteksi PIN 4–8 digit dengan algoritma **PBKDF2** (SHA-256, 100.000 putaran bergaram unik).
- **Auto-Lock Lifecycle**: Penguncian otomatis berbasis durasi (Segera, 1m, 5m, 15m, 30m) serta penguncian instan saat jendela diminimize atau tab peramban disembunyikan.

---

## 🛠 Teknologi & Stack Teknis (Tech Stack)

| Kategori                          | Teknologi                                                 | Deskripsi / Peran                                                              |
| :-------------------------------- | :-------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **Frontend Framework**            | **Nuxt 4 (v4.5.2)** + **Vue 3 (v3.5.41)**                 | SSR/SPA modern berbasis Composition API dan file-based routing.                |
| **Styling & Design**              | **Tailwind CSS (v3.4)** + **Plus Jakarta Sans**           | Desain utility-first mobile responsif dengan dukungan OLED Dark Mode penuh.    |
| **Icons & Visuals**               | **Material Symbols Outlined**                             | Standar ikon Google konsisten, modern, dan bebas glitch emoji lintas platform. |
| **Backend / Server Engine**       | **Nitro (v2.13.4)**                                       | Fullstack TypeScript server routes terintegrasi di dalam Nuxt.                 |
| **Database & Auth**               | **Supabase (PostgreSQL 15)**                              | Relational database dengan Row Level Security (RLS) & Supabase Auth.           |
| **Database ORM & Types**          | **Drizzle ORM (v0.45)** + **postgres.js**                 | Type-safe SQL client, migrasi skema, dan UUIDv7 sequential primary keys.       |
| **Cloud Object Storage**          | **Cloudflare R2** via **AWS SDK S3**                      | Penyimpanan gambar struk & avatar tanpa biaya transfer egress data.            |
| **Artificial Intelligence**       | **Google Gemini API (@google/generative-ai)**             | Vision OCR struk multimodal dan FinBot Conversational AI Financial Advisor.    |
| **Ekspor Dokumen**                | **CSV Generator dengan UTF-8 BOM & Anti-Injection**       | Format tabel portabel kompatibel penuh dengan Microsoft Excel & Google Sheets. |
| **Autentikasi Biometrik (FIDO2)** | **SimpleWebAuthn (`@simplewebauthn/browser` & `server`)** | FIDO2 WebAuthn untuk autentikasi Sidik Jari, Face ID, dan Windows Hello.       |
| **Kriptografi & Hashing PIN**     | **Web Crypto API (AES-256-GCM) & PBKDF2 (100k rounds)**   | Zero-knowledge client-side encryption dan hashing PIN berkekuatan tinggi.      |
| **Local Offline Cache**           | **IndexedDB (`idb` v8)**                                  | Penyimpanan lokal untuk cache struk, offline draft, dan master encryption key. |

---

## 🏗 Arsitektur Sistem & Data Flow

```mermaid
graph TD
    subgraph Klien ["📱 Klien (Browser / Mobile PWA)"]
        UI["Vue 3 Nuxt Interface (Dark & Light Mode)"]
        FinBot["FinBot AI Chat & Action Launcher"]
        IDB[("IndexedDB Local Cache & BYOK")]
        WebCrypto["Web Crypto AES-256-GCM"]
        CameraAPI["Navigator MediaDevices Hardware Viewfinder"]
        CSVExport["CSV Generator & Sanitizer"]
    end

    subgraph Server ["⚡ Nitro Server Engine (Nuxt 4)"]
        APIAuth["/api/auth & users"]
        APIAI["/api/ai (Chat & Vision OCR)"]
        APITrx["/api/transactions & dashboard"]
        APIExport["/api/export (CSV & Excel)"]
        APISettlement["/api/couple/settlement"]
        APIStorage["/api/storage (Cloudflare R2)"]
    end

    subgraph Cloud ["☁️ Cloud Infrastructure & Services"]
        SupabaseAuth["Supabase GoTrue Auth"]
        SupabaseDB[("PostgreSQL Database (RLS)")]
        CloudflareR2[("Cloudflare R2 S3 Storage")]
        GeminiAPI["Google Gemini Multimodal API (2.5 s/d 3.8)"]
    end

    UI <--> FinBot
    UI <--> WebCrypto
    UI <--> IDB
    UI <--> CSVExport
    CameraAPI --> UI

    UI -- "HTTPS REST (Bearer JWT)" --> Server

    APIAuth <--> SupabaseAuth
    APITrx <--> SupabaseDB
    APIExport <--> SupabaseDB
    APISettlement <--> SupabaseDB
    APIAI -- "X-Gemini-Api-Key (BYOK)" --> GeminiAPI
    APIStorage <--> CloudflareR2
```

### Alur Pemindaian Struk AI (Vision OCR Pipeline):

1. **Pengambilan Gambar**: Pengguna mengambil foto struk di [`app/pages/input/kamera.vue`](file:///d:/All%20Project%20Website/CoupleCash/app/pages/input/kamera.vue).
2. **Kompresi & Cache Lokal**: Frame langsung dikonversi ke JPEG base64 dan disimpan di IndexedDB lokal pengguna secara instan.
3. **Dekripsi Kunci BYOK**: Kunci Gemini API didekripsi dari IndexedDB menggunakan Web Crypto API dan dikirimkan via header `X-Gemini-Api-Key`.
4. **Analisis Multimodal Nitro**: Endpoint Nitro `/api/ai/analyze-receipt` memanggil model Google Gemini (Flash / Pro) dengan output format terstruktur JSON.
5. **Cadangan Asinkron ke Cloud**: Secara paralel (asinkron), foto struk diunggah ke bucket Cloudflare R2 tanpa mengunci respons OCR pengguna.
6. **Sinkronisasi Transaksi**: Hasil ekstraksi dialirkan ke halaman review transaksi untuk dikonfirmasi dan disimpan ke Supabase PostgreSQL.

### Alur Kriptografi Brankas & Autentikasi Biometrik (Vault Security Pipeline):

1. **Registrasi Biometrik**: Klien meminta challenge WebAuthn ke `/api/security/webauthn/register/options`. Hardware autentikator (Windows Hello, Touch ID, Face ID) menghasilkan Public/Private Keypair lokal. Public Key disimpan ke tabel `user_biometric_credentials`, sedangkan Private Key tetap aman di dalam enclave hardware perangkat.
2. **Buka Brankas (Unlock)**: Saat pengguna melakukan sensor biometrik atau memasukkan PIN (PBKDF2), klien memverifikasi kredensial ke `/api/security/*` dan menerima token sesi brankas bertanda tangan.
3. **Dekripsi Sisi Klien**: Master Key didekripsi di browser lokal (Web Crypto AES-256-GCM). Data sandi didekripsi secara on-the-fly di memori peramban tanpa pernah mengirimkan teks sandi asli (plaintext) ke server.
4. **Auto-Lock & Memory Wipe**: Setelah timeout tercapai atau saat aplikasi berpindah tab/minimize, kunci enkripsi di memori langsung dihapus (zeroed out) dan status kembali terkunci.

---

## 🗄 Skema Database Supabase PostgreSQL

Basis data CoupleCash menggunakan PostgreSQL dengan identifikasi primer **UUIDv7** (time-ordered sequential UUIDs) untuk efisiensi performa indexing:

```mermaid
erDiagram
    households ||--o{ users : "memiliki anggota"
    households ||--o{ financial_accounts : "memiliki pos akun"
    households ||--o{ categories : "memiliki kategori"
    households ||--o{ transactions : "memiliki transaksi"
    households ||--o{ budgets : "memiliki pagu anggaran"
    households ||--o{ bills : "memiliki tagihan rutin"
    households ||--o{ goals : "memiliki target impian"
    households ||--o{ vault_credentials : "memiliki brankas"
    households ||--o{ ai_chat_sessions : "memiliki sesi chat ai"

    users ||--o{ transactions : "mencatat"
    users ||--o{ goals : "membuat"
    users ||--o{ vault_credentials : "pemilik"
    users ||--o{ user_biometric_credentials : "memiliki perangkat biometrik"
    users ||--o| ai_user_settings : "konfigurasi model ai"

    financial_accounts ||--o{ transactions : "sumber dana"
    categories ||--o{ transactions : "kategori beban"
    categories ||--o{ budgets : "kategori anggaran"
    bills ||--o| transactions : "menghasilkan transaksi"
    ai_chat_sessions ||--o{ ai_chat_messages : "memiliki pesan percakapan"
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

### 1. Manajemen Akun & Finansial (`/api/accounts`)

- `GET /api/accounts`: Mengambil seluruh daftar rekening bank, e-wallet, uang tunai, dan pos hutang.
- `POST /api/accounts`: Mendaftarkan pos akun finansial baru.
- `PUT /api/accounts/[id]`: Memperbarui data akun (nama, warna, icon, saldo awal).
- `DELETE /api/accounts/[id]`: Menghapus (soft delete) pos akun.
- `POST /api/accounts/pay-debt`: Melunasi pinjaman/hutang dan otomatis menyesuaikan saldo rekening pemotong.

### 2. Kecerdasan Buatan & OCR (`/api/ai`)

- `POST /api/ai/validate-key`: Validasi kunci API Gemini langsung ke Google AI Studio (`AIza...` atau `AQ...`).
- `POST /api/ai/analyze-receipt`: Analisis gambar struk berbasis Vision OCR untuk mengurai nominal, merchant, tanggal, dan PPN.
- `GET /api/ai/settings` & `PUT /api/ai/settings`: Sinkronisasi preferensi model AI (Gemini 2.5 s/d 3.8 Flash & Pro).
- `GET /api/ai/sessions` & `POST /api/ai/sessions`: Manajemen sesi percakapan asisten FinBot.
- `POST /api/ai/chat`: Streaming pesan percakapan konsultasi keuangan interaktif dengan AI.

### 3. Ekspor Laporan Data (`/api/export`)

- `GET /api/export/transactions`: Ekspor data riwayat transaksi kas (periode All, Current Month, atau Custom Date).
- `GET /api/export/accounts`: Ekspor data daftar pos rekening dan saldo keluarga.
- `GET /api/export/bills`: Ekspor daftar pengingat tagihan dan langganan berkala.
- `GET /api/export/budgets`: Ekspor daftar batas pagu anggaran per kategori.

### 4. Analitik & Kalender Arus Kas (`/api/analytics`)

- `GET /api/analytics`: Mengambil agregasi arus kas, perbandingan pemasukan vs pengeluaran, dan rasio belanja bulanan.
- `GET /api/analytics/calendar`: Data kalender adaptif (1w, 2w, 1m) per tanggal untuk visualisasi titik pemasukan, pengeluaran, dan kewajiban.

### 5. Transaksi & Dashboard (`/api/transactions`, `/api/dashboard`)

- `GET /api/dashboard`: Ringkasan instan saldo gabungan, saldo per individu, transaksi terbaru, dan tagihan mendekati tempo.
- `POST /api/transactions`: Mencatat transaksi pemasukan, pengeluaran, atau **transfer antar pos rekening**.

### 6. Hubungan Pasangan, Rumah Tangga & Harta Bersama (`/api/couple`)

- `POST /api/couple/generate-code`: Membuat 6-digit kode undangan rumah tangga.
- `POST /api/couple/verify-code`: Memasukkan kode pasangan untuk bergabung ke household yang sama.
- `PUT /api/couple/household`: Mengubah profil dan motto rumah tangga.
- `GET /api/couple/settlement/detect`: Memindai inventaris harta bersama (pos akun & goals) untuk persiapan pemisahan adil.
- `POST /api/couple/settlement/execute`: Mengeksekusi pembagian harta bersama dan pemisahan data bersih secara permanen.
- `POST /api/couple/unlink`: Memutus keterikatan household dengan pembersihan data terisolasi.

### 7. Penyimpanan Cloudflare R2 (`/api/storage`)

- `POST /api/storage/presign`: Membuat Signed URL S3 untuk upload langsung dari klien.
- `POST /api/storage/upload`: Proxy upload server untuk file nota transaksi.
- `GET /api/storage/view`: Mendapatkan link tampilan foto struk dengan masa berlaku terbatas.
- `DELETE /api/storage/delete`: Menghapus file fisik dari bucket Cloudflare R2.

### 8. Target Impian Bersama (`/api/goals`)

- `GET /api/goals` & `POST /api/goals`: Pengelolaan target impian tabungan.
- `POST /api/goals/contribute`: Setoran kontribusi tabungan dari suami atau istri ke pos impian.

### 9. Autentikasi Biometrik & Keamanan (`/api/security`)

- `POST /api/security/webauthn/register/options`: Menghasilkan options challenge WebAuthn FIDO2 untuk pendaftaran perangkat.
- `POST /api/security/webauthn/register/verify`: Memverifikasi attestation pendaftaran dan menyimpan public key perangkat.
- `POST /api/security/webauthn/authenticate/options`: Menghasilkan challenge autentikasi biometrik.
- `POST /api/security/webauthn/authenticate/verify`: Memverifikasi assertion biometrik dan menerbitkan signed vault authorization token.
- `GET /api/security/webauthn/devices`: Mengambil daftar autentikator biometrik terdaftar milik pengguna.
- `POST /api/security/webauthn/devices/revoke`: Mencabut akses biometrik perangkat yang hilang atau tidak digunakan lagi.
- `POST /api/security/pin/set`: Mengatur atau memperbarui PIN keamanan cadangan dengan hash PBKDF2 100.000 iterasi.
- `POST /api/security/pin/verify`: Memvalidasi PIN cadangan dan menerbitkan signed vault authorization token.

### 10. Brankas Kredensial Keluarga (`/api/vault`)

- `GET /api/vault`: Mengambil metadata kredensial dan ciphertext terenkripsi (server-side zero decryption).
- `POST /api/vault`: Menyimpan item kredensial baru terenkripsi AES-256-GCM dari sisi klien.
- `PUT /api/vault/[id]`: Memperbarui data kredensial terenkripsi.
- `DELETE /api/vault/[id]`: Menghapus (soft delete) kredensial dari brankas keluarga.
- `POST /api/vault/audit`: Mencatat log audit akses atau modifikasi brankas secara terstruktur.

---

## 🔐 Keamanan & Privasi Tingkat Tinggi (Zero-Knowledge, WebAuthn & BYOK)

CoupleCash dibangun berlandaskan prinsip **Defense-in-Depth** dan **Privacy by Design**:

1. **Arsitektur Brankas Zero-Knowledge (Client-Side AES-256-GCM)**: Enkripsi dan dekripsi kredensial dijalankan 100% pada browser klien. Server CoupleCash hanya menerima ciphertext terenkripsi dan tidak pernah memiliki kunci dekripsi.
2. **Autentikasi Biometrik FIDO2 / WebAuthn**: Autentikasi biometrik dieksekusi secara aman oleh chip enclave perangkat lokal tanpa pernah mengirim data biometrik ke jaringan.
3. **Proteksi PIN Cadangan PBKDF2 (100.000 Putaran)**: Derivasi kunci berbasis SHA-256 dengan 100.000 iterasi bergaram acak kebal dari serangan tabel pelangi (_rainbow table_).
4. **Model BYOK (Bring Your Own Key) untuk AI**: Kunci Google Gemini API dienkripsi AES-GCM dan disimpan secara privat di IndexedDB lokal pengguna.
5. **PostgreSQL Row Level Security (RLS)**: Setiap baris data dalam database Supabase PostgreSQL diproteksi kebijakan RLS ketat berbasis `household_id` dan `auth.uid()`.
6. **Sanitasi Formula Ekspor CSV**: Neutralisasi otomatis seluruh formula Excel berbahaya untuk menjamin keamanan file unduhan.
7. **Pembersihan Bersih Skenario Pemutusan Hubungan**: Data tagihan dan anggaran personal dipisahkan secara terisolasi saat hubungan rumah tangga berakhir.
8. **Audit Logging Terperinci**: Setiap operasi buka brankas, pendaftaran/pencabutan biometrik, dan pengubahan kredensial tercatat pada riwayat audit untuk transparansi pasangan.
9. **Manajemen Sesi Multi-Perangkat & Proteksi Login**: Deteksi login ganda terisolasi untuk mencegah konflik inkonsistensi data lokal dengan pemutusan sesi otomatis (*force logout*) pada perangkat lama.

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### Prasyarat:

- **Node.js**: Versi 20.x atau lebih baru (Disarankan Node.js 22 LTS / 24).
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
Dibuat oleh thealfin (seorang programer yang b aja) untuk keluarga harmonis yang bijak mengelola finansial bersama.
