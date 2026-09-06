INI ADALAH PROMT MENTAHAN NYA
========================================================================================================
Adjusment & Update: Perbaiki sistem pasangan (icon avatar nama user dan pasangan yang ada pojok kanan atas aplikasi) ketika user sudah mempunyai pasangan maka tampilan akan memberikan informasi bahwa pasangan telah tersambungkan, dan ada nama keluarga nya dan bisa di lihat detailnya serta bisa di edit detail juga ada icon rantai putus untuk melepaskan hubungan (akan tetap akan ada menu baru untuk penyelesaian harta gono-gini yang akan di breakdown di menu update harta gono-gini) jadi ketika user sudah mempunyai pasangan maka tampilan pembuatan kode pasangan dan input kode pasangan akan di gantikan dengan detail keluarga bersama pasangan berikut dengan segala informasi nya

Adjustment & Update: Untuk sebuah rekening yang awalnya di catat sebagai debt/hutang/kewajiban maka akan ada menu tambahan ketika user berhasil melunasi tanggungan hutang maka user bisa menyesuaikan kembali nama pos akun tersebut dan icon/kategori pos akun nya (nanti pos akun debt akan menjadi pos akun biasa jika sudah di lunasi) 

Adjustment Update: di menu input manual (pengeluaran) ketika user mempunyai tanggungan hutang maka hutang/debt tersebut akan otomatis masuk pada kategori pengeluaran (bisa di bayar/lunasi hutang nya dari pos akun yang lain)

Adjustment: Pindahkan posisi button untuk "Bayar&catat" Tagihan yang semula berada di tengah pindah menjadi di pojok atas kanan bagan tagihan (di samping icon titik 3)

Adjustment: icon + pada pojok bagan tagihan di menu beranda agar menyimpan perintah untuk direct ke page /tagihan (tidak bisa membuat tagihan saat user masih berada di menu beranda)


========================================================================================================
Update: Tambahkan titik 3 di bagan² tagihan (untuk mengedit detail tagihan baik nama, nominal waktu dll) 
Tambahkan pilihan icon untuk detail jenis tagihan 

Update: 

========================================================================================================
Bug Fixing: Pada menu ai review perbaiki sistem ai untuk pembaca struk nya, integrasi kan secara benar untuk ai nya (berikan sistem dimana model yang akan di pilih adalah model gemini 2.5 ke atas (yang mampu untuk membaca dan menganalisa sebuah teks yang ada di gambar) set up untuk sebuah menu yang khusus melihat preview gambar yang bisa memberikan waktu untuk ai melakukan analisa teks/angka yang ada di gambar struk/media yang di lampirkan (tiru sistem google lens -> ai analisis -> hasil -> halaman preview untuk di koreksi apakah ada input yang salah, detail transaksi dan kategori transaksi yang di analisa ai


===============================================================================================================================================================================================================================================================================================================
INI FINAL PROMT 

mega promt task UPDATE, ADJUSTMENT, & BUG FIXING

Anda bertindak sebagai Senior Full-Stack Engineer, Product Engineer, UI/UX Engineer, dan QA Engineer untuk project aplikasi CoupleCash.

TUJUAN UTAMA:
Lakukan adjustment, update, bug fixing, dan penyempurnaan sistem CoupleCash berdasarkan requirement di bawah ini.

JANGAN membuat ulang aplikasi dari awal.

JANGAN melakukan redesign besar-besaran.

Pertahankan:
- struktur aplikasi yang sudah ada
- routing yang sudah berjalan
- design system CoupleCash
- warna utama
- typography
- spacing
- radius
- card style
- icon style
- bottom navigation
- pola modal
- pola button
- pola input
- responsive behavior
- state management
- database/storage architecture
- fitur yang sudah berjalan

Prioritaskan:
1. Reuse component existing.
2. Reuse data model existing.
3. Reuse utility/function existing.
4. Reuse routing existing.
5. Jangan membuat duplicate logic.
6. Jangan merusak fitur existing.
7. Jangan menghapus data user.
8. Jangan mengganti struktur data secara destructive tanpa migration/fallback.
9. Setiap perubahan harus backward-compatible terhadap data lama.

==================================================
A. KONTEKS UI EXISTING
==================================================

Gunakan seluruh element project untuk reference.

CoupleCash memiliki:
- Header CoupleCash
- avatar user dan pasangan di pojok kanan atas
- sistem pasangan / household
- bottom navigation:
  - Beranda
  - Analitik
  - tombol + (dengan 3 menu: catat manual, kamera ai & budget)
  - Goals
  - Akun

Pada halaman Akun terdapat:
- informasi keluarga
- status sinkronisasi
- Kelola Akun Finansial
- Kategori Transaksi
- Kelola Tagihan & Langganan
- Biometrik
- Preferensi Tema
- AI / Gemini BYOK

Pada halaman AI terdapat:
- AI Keuangan Pribadi
- Scan Struk AI
- Insight Bulanan
- Chat AI
- Gemini API Key / BYOK
- informasi keamanan penyimpanan API Key

Pada halaman Tagihan terdapat:
- Total Belum Bayar
- Perlu Bayar
- Sudah Lunas
- filter Semua / Belum Bayar / Lunas
- search
- card tagihan
- tombol Bayar & Catat
- tombol hapus

Pada Beranda terdapat:
- Hutang & Kewajiban
- Total Kewajiban
- Transaksi Terakhir

Pada halaman Catat Transaksi:
- Pengeluaran
- Pemasukan
- tagihan tertunda
- nominal
- kategori
- dompet/rekening
- tanggal
- catatan

Pertahankan bahasa UI Indonesia. 

(ini adalah hasil dari ai yang terbatas untuk data lengkapnya silahkan analisa seluruh element yang ada di project couplecash)

==================================================
B. OBJECTIVE PRIORITAS
==================================================

Implementasikan 5 kelompok perubahan:

1. SISTEM PASANGAN / KELUARGA
2. TRANSFORMASI DEBT ACCOUNT MENJADI AKUN BIASA SETELAH LUNAS (beberapa konsepnya sudah di terapkan di project, untuk sekarang sebagai penyempurnaan)
3. DEBT TERINTEGRASI KE INPUT TRANSAKSI PENGELUARAN
4. PENYEMPURNAAN MODUL TAGIHAN & LANGGANAN
5. PERBAIKAN TOTAL SISTEM AI SCAN STRUK / RECEIPT OCR

Semua perubahan harus terintegrasi satu sama lain.

==================================================
1. UPDATE SISTEM PASANGAN / KELUARGA
==================================================

CURRENT PROBLEM:

Saat user belum mempunyai pasangan, sistem menampilkan:
- Buat Kode Undangan
- Masukkan Kode Pasangan

Ketika user sudah mempunyai pasangan, sistem harus berubah menjadi mode "Connected Household".

--------------------------------------------------
1.1 STATE PASANGAN
--------------------------------------------------

Buat minimal state:

partnerStatus:

- "single"
- "pending"
- "connected"

Jika:
single:
    tampilkan flow pembuatan / input kode pasangan.

Jika:
pending:
    tampilkan informasi bahwa undangan sedang menunggu pasangan.

Jika:
connected:
    JANGAN lagi menampilkan:
    - Buat Kode Undangan
    - Masukkan Kode Pasangan

Sebaliknya tampilkan:
    - detail keluarga
    - informasi user
    - informasi pasangan
    - status hubungan
    - detail household
    - tombol edit
    - tombol unlink / putuskan hubungan

--------------------------------------------------
1.2 HEADER AVATAR
--------------------------------------------------

Perbaiki icon avatar user + pasangan di pojok kanan atas.

Jika single:
    tampilkan avatar user.

Jika connected:
    tampilkan avatar user + avatar pasangan seperti existing design.

Ketika avatar/header tersebut ditekan:

Jika connected:
    buka halaman/modal:
    "Keluarga [Family Name]"

Contoh:
    Keluarga Bahagia

Subtitle:
    Budi (Suami) & Siti (Istri)

Tampilkan informasi:
    - Nama keluarga
    - Nama user
    - Nama pasangan
    - Role user
    - Role pasangan
    - Status koneksi
    - Tanggal terhubung jika data tersedia
    - informasi household

--------------------------------------------------
1.3 DETAIL KELUARGA
--------------------------------------------------

Buat halaman atau modal detail:

TITLE:
"Detail Keluarga"

SECTION:
"Informasi Keluarga"

Fields:
- Nama Keluarga
- Status
- Anggota
- Tanggal Terhubung

SECTION:
"Anggota Keluarga"

User Card:
- avatar
- nama
- role
- status

Partner Card:
- avatar
- nama
- role
- status

Actions:
- "Edit Detail Keluarga"
- "Kelola Hubungan"

--------------------------------------------------
1.4 EDIT DETAIL KELUARGA
--------------------------------------------------

User dapat mengubah:

- Nama keluarga
- Nama tampilan keluarga jika field tersebut tersedia
- role / label pasangan jika sistem memang sudah mendukungnya

Jangan mengubah identitas authentication user secara tidak sengaja.

Gunakan validation.

Nama keluarga:
- wajib diisi
- trim whitespace
- minimal karakter reasonable
- cegah value kosong

Setelah save:
- update state
- persist data
- update semua UI yang menggunakan family name
- jangan membutuhkan reload manual.

--------------------------------------------------
1.5 UNLINK / PUTUSKAN HUBUNGAN
--------------------------------------------------

Tambahkan icon:

"Rantai Putus"

Action:
"Putuskan Hubungan"

JANGAN langsung unlink ketika icon ditekan.

Tampilkan confirmation dialog.

TITLE:
"Putuskan Hubungan?"

BODY:
"Anda akan melepaskan hubungan dengan pasangan. Data keuangan pribadi tetap dipertahankan."

Berikan warning bahwa data bersama / household dapat memiliki konsekuensi terhadap akses data.

Button:
- Batal
- Putuskan Hubungan

Gunakan destructive action style existing.

--------------------------------------------------
1.6 IMPORTANT: PEMBAGIAN HARTA BERSAMA / ASSET SETTLEMENT
--------------------------------------------------

JANGAN menghapus data aset/harta ketika unlink.

JANGAN otomatis menghapus transaksi.

JANGAN otomatis menghapus rekening.

JANGAN melakukan settlement secara otomatis.

Setelah user memilih unlink, sistem harus siap untuk fitur:

"Penyesuaian Harta Bersama"

atau

"Penyelesaian Harta Bersama"

Fitur ini akan dikembangkan pada update berikutnya.

Untuk sekarang:
- siapkan data relationship/state
- siapkan entry point/menu
- jangan implementasikan settlement logic kompleks jika belum diminta
- jangan membuat asumsi pembagian aset 50:50 (tawarkan berbagai metode pembagian sebagai berikut: 
        50:50
        60:40
        nominal tertentu
        seluruh aset ke satu pihak
        aset dijual lalu hasil dibagi
        satu pihak mengambil aset dan membayar kompensasi kepada pihak lain
        aset masih dalam proses
        aset bukan bagian dari pembagian
        kewajiban mengikuti pihak tertentu
    )
- jangan memindahkan kepemilikan aset secara otomatis

==================================================
2. DEBT ACCOUNT → NORMAL ACCOUNT SETELAH LUNAS
==================================================

CURRENT PROBLEM:

Sebuah pos akun/rekening dapat dicatat sebagai:

- debt
- hutang
- kewajiban

Contoh:
- Honest (Kartu Kredit)
- Atoome (Kartu Kredit)

Ketika hutang berhasil dilunasi, akun tidak boleh selamanya dianggap sebagai debt.

--------------------------------------------------
2.1 STATUS ACCOUNT
--------------------------------------------------

Pastikan account memiliki lifecycle yang jelas.

Contoh:

accountType:
- asset
- cash
- bank
- ewallet
- debt
- liability

Dan:

debtStatus:
- active
- partially_paid
- paid_off

Jangan mencampurkan accountType dan payment status secara sembarangan.

--------------------------------------------------
2.2 SETELAH HUTANG LUNAS
--------------------------------------------------

Ketika:

outstandingDebt === 0

maka:

debtStatus = "paid_off"

Tampilkan action:

"Jadikan Pos Akun Biasa"

atau:

"Sesuaikan Pos Akun"

User kemudian dapat mengubah:

- Nama pos akun
- Icon
- Kategori / jenis pos akun

Contoh:

Sebelumnya:
"Honest"
Kartu Kredit
Saldo -Rp2.000.000

Setelah lunas:

User dapat mengubah:
"Honest"
menjadi:
"Tabungan Liburan"

dan memilih icon baru.

--------------------------------------------------
2.3 IMPORTANT
--------------------------------------------------

Jangan langsung menghapus history debt.

History transaksi hutang harus tetap ada.

Jangan mengubah transaksi lama secara destructive.

Yang berubah adalah status dan metadata current account.

Pastikan histori tetap menunjukkan bahwa transaksi tersebut sebelumnya terkait debt.

--------------------------------------------------
2.4 UI
--------------------------------------------------

Pada account yang sudah lunas:

Status:
"Sudah Lunas"

Tambahkan action:
"Sesuaikan Pos Akun"

Modal:

"Pos Akun Sudah Lunas"

Description:
"Hutang ini telah dilunasi. Anda dapat menggunakan kembali pos akun ini sebagai akun biasa."

Fields:
- Nama Pos Akun
- Icon
- Jenis Akun

Button:
"Simpan Perubahan"

==================================================
3. DEBT TERINTEGRASI KE INPUT TRANSAKSI
==================================================

CURRENT PROBLEM:

Ketika user mempunyai hutang/debt aktif, debt tersebut harus dapat dibayar dari pos akun lain melalui:

Catat Transaksi → Pengeluaran.

--------------------------------------------------
3.1 CATEGORY
--------------------------------------------------

Pada:

/transaksi
atau halaman Catat Transaksi

ketika:
transactionType = expense

dan terdapat active debts,

maka kategori pengeluaran harus memiliki group:

"Hutang & Kewajiban"

Contoh:

Kategori:
- Belanja
- Makanan
- Transportasi
- Tagihan
- Hiburan
- Kesehatan
- Pendidikan
- Hutang & Kewajiban
- DLL (sesuai input yang di lakukan oleh user)

--------------------------------------------------
3.2 ACTIVE DEBT
--------------------------------------------------

Ketika user memilih:

"Hutang & Kewajiban"

tampilkan daftar debt aktif.

Contoh:

Bayar Hutang

[ Honest ]
Saldo Hutang:
Rp2.000.000

[ Atoome ]
Saldo Hutang:
Rp500.000

User memilih salah satu.

--------------------------------------------------
3.3 SOURCE ACCOUNT
--------------------------------------------------

User tetap memilih:

"Dari Pos Akun"

Contoh:

BCA Utama
Rp10.000.000

Kemudian:

Bayar:
Rp500.000

Debt:
Honest

Result:

BCA Utama:
- Rp500.000

Honest:
- outstanding debt berkurang Rp500.000

Jika outstanding menjadi 0:
- debtStatus = paid_off

--------------------------------------------------
3.4 VALIDATION
--------------------------------------------------

Jangan izinkan:

payment > outstandingDebt

kecuali existing business logic memang mengizinkan overpayment.

Jika tidak diizinkan:

Tampilkan:
"Nominal pembayaran melebihi sisa hutang."

Jika nominal = outstanding:
status menjadi:
"Sudah Lunas"

Jika nominal < outstanding:
status:
"Sebagian Dibayar"

--------------------------------------------------
3.5 TRANSACTION METADATA
--------------------------------------------------

Transaction harus dapat menyimpan reference:

transactionType:
"debt_payment"

relatedDebtId:
"..."

sourceAccountId:
"..."

amount:
...

Jangan hanya mengandalkan nama kategori.

Gunakan ID/reference yang stabil.

==================================================
4. UPDATE MODUL TAGIHAN & LANGGANAN
==================================================

==================================================
4.1 BUTTON "BAYAR & CATAT"
==================================================

CURRENT:

Button "Bayar & Catat" berada di tengah/area card.

CHANGE:

Pindahkan button:

"Bayar & Catat"

ke:

POJOK KANAN ATAS CARD TAGIHAN

posisinya berada di sekitar header card, dekat icon:

"⋮"

Three-dot menu.

Contoh struktur:

┌──────────────────────────────┐
│ Air PDAM        ⋮            │
│ Rp120.000                   │
│ Jatuh tempo: ...            │
│                              │
│                    Bayar & Catat
└──────────────────────────────┘

Pastikan tidak bertabrakan dengan:
- title
- status
- icon
- responsive layout

gunakan layout yang tetap nyaman disentuh.

--------------------------------------------------
4.2 THREE-DOT MENU
--------------------------------------------------

Tambahkan icon:

⋮

pada setiap card tagihan.

Ketika ditekan tampilkan bottom sheet / dropdown.

Menu minimal:

- Edit Tagihan
- Tandai Sudah Dibayar
- Duplikat / Jadikan Rutin jika existing system mendukung
- Hapus Tagihan

Jangan tampilkan action yang tidak supported.

--------------------------------------------------
4.3 EDIT TAGIHAN
--------------------------------------------------

User dapat mengedit:

- Nama tagihan
- Nominal
- Icon
- Kategori / jenis tagihan
- Tanggal jatuh tempo
- Frekuensi
- Status
- Pemilik / anggota jika supported
- Catatan
- Reminder

Gunakan existing form component jika tersedia.

Validation:
- nama wajib
- nominal > 0
- tanggal valid
- recurring interval valid

--------------------------------------------------
4.4 ICON TAGIHAN
--------------------------------------------------

Tambahkan pilihan icon untuk jenis tagihan.

Contoh:

Air:
💧 / water icon

Listrik:
⚡ / electricity icon

Internet:
wifi icon

BPJS:
health icon

Pendidikan:
school icon

Sewa:
home icon

Streaming:
play/video icon

Telepon:
phone icon

Asuransi:
shield icon

Kartu Kredit:
credit card icon

Lainnya:
receipt icon

IMPORTANT:

Gunakan icon library yang sudah digunakan project.

JANGAN menggunakan emoji sebagai icon UI jika design system existing menggunakan SVG/icon library.

Icon harus:
- konsisten
- vector
- scalable
- accessible
- mempunyai fallback.

Simpan icon sebagai stable identifier.

Contoh:
icon = "water"

Bukan:
icon = "💧"

--------------------------------------------------
4.5 PLUS BUTTON PADA BAGAN TAGIHAN
--------------------------------------------------

Pada Beranda terdapat card/section tagihan.

Jika terdapat icon:

"+"

di pojok card tersebut:

Fungsinya BUKAN membuat tagihan secara langsung.

Ketika ditekan:

navigate ke:

/tagihan

atau route tagihan existing.

JANGAN membuka create modal dari Beranda.

JANGAN membuat tagihan langsung dari Beranda.

Flow:

Beranda
↓
Tap "+"
↓
/tagihan
↓
User dapat melihat daftar tagihan
↓
User memilih "Tambah"
↓
Create Tagihan

Dengan demikian Beranda hanya menjadi shortcut navigation.

==================================================
5. AI RECEIPT SCANNER / AI REVIEW
==================================================

INI ADALAH BUG FIXING PRIORITAS TINGGI.

Current UI sudah mempunyai:

"Scan Struk AI"

dan halaman AI menggunakan:

Gemini API Key / BYOK.

Namun sistem pembacaan struk harus diperbaiki agar benar-benar menjalankan:

IMAGE
↓
AI VISION
↓
OCR / TEXT EXTRACTION
↓
STRUCTURED DATA
↓
USER REVIEW
↓
CONFIRM
↓
TRANSACTION

==================================================
5.1 MODEL REQUIREMENT
==================================================

Gunakan Gemini model yang mendukung multimodal image understanding dan mampu membaca teks/angka dari gambar. (untuk testing gunakan saja API Key saya berikut: "AIzaSyCC4IPTLSoNSDcgWe7mtVb1GJ2PCYxm3iE" untuk gambar recipt pakai foto yang ada di cloudflare receipts/a99265b4-2cf3-441c-83da-0515a1a4ff0c-1000502951.jpg link url "https://dash.cloudflare.com/c9e81d0b0012a878520be7db0614166f/r2/default/buckets/couplecash/objects/receipts/a99265b4-2cf3-441c-83da-0515a1a4ff0c-1000502951.jpg/details?prefix=receipts%2F" )

Minimum:
Gemini 2.5 atau lebih tinggi.

JANGAN hardcode model lama di bawah 2.5.

Buat model configuration terpusat.

Contoh konsep:

SUPPORTED_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
]

Jika API/provider saat runtime menyediakan model stable yang lebih baru >= 2.5:
gunakan model tersebut sesuai compatibility.

Jangan mengasumsikan semua model yang tersedia selalu memiliki nama yang sama.

Buat model resolver/config sehingga mudah diubah.

Prioritaskan model yang:
- multimodal
- image capable
- structured output capable
- suitable untuk OCR/receipt understanding.

==================================================
5.2 SECURITY / BYOK
==================================================

API Key berasal dari user sendiri.

Jangan:
- hardcode API key
- commit API key
- mengirim API key ke server aplikasi jika arsitektur BYOK memang local
- log API key
- menampilkan full API key di console
- menyimpan API key plaintext jika existing architecture sudah menggunakan encryption.

Pertahankan konsep:

BYOK = Bring Your Own Key

API Key disimpan secara lokal dengan mekanisme existing.

Jika existing implementation menggunakan:
IndexedDB + Web Crypto / AES-GCM

pertahankan mekanisme tersebut.

==================================================
5.3 SCAN FLOW
==================================================

Ketika user menekan:

"Scan Struk AI"

Flow harus:

STEP 1
Check API Key.

Jika belum ada:

Tampilkan:
"Kunci AI Belum Diatur"

Button:
"Atur API Key Sekarang"

Navigate ke halaman konfigurasi AI.

Jika API Key aktif:
lanjut scanner.

--------------------------------------------------

STEP 2
Buka scanner.

UI harus memiliki:

- camera preview
- upload from gallery
- close button
- capture button
- flash jika supported
- frame/crop guide
- status AI

Pertahankan visual scanner existing.

--------------------------------------------------

STEP 3
User mengambil foto / memilih gambar.

Setelah image didapat:

JANGAN langsung membuat transaksi.

Tampilkan:

"Menyiapkan Struk..."

Kemudian:

"AI sedang membaca struk..."

Berikan loading/progress state yang jelas.

Contoh:

Mendeteksi:
✓ Merchant (merchant_name)
✓ Tanggal
✓ Item (note)
✓ Total (amount)
✓ Pajak (untuk sekarang karena belum ada nama row tax di db dan konfigurasi api dan UI nya,  langsung buatkan skema update database di menu transaksi untuk input pajak serta ingrasi API dan UI nya (terapkan juga input tax dan ). buat sebuah row tax_amount)
✓ Metode pembayaran (buatkan row payment_method untuk nantinya ada input berupa enum: QRIS, Kartu Debit, Kartu Kredit, Transfer Bank, Virtual Account) (hanya berlaku untuk tipe pembayaran non cash/tunai & crypto)
✓ Pos akun finansial yang di pakai (financial_accounts) 

===== UNTUK PENJELASAN LEBIH LENGKAPNYA ADA DI file  D:\All Project Website\CoupleCash\Adjudtment Update Bug Fixing\note adjustment, update & bug fixing.md ========= 

Progress tidak boleh mengklaim progress nyata jika API tidak menyediakan progress.

Jika progress tidak bisa diketahui:
gunakan indeterminate loading animation.

--------------------------------------------------
5.4 IMAGE PREPROCESSING
--------------------------------------------------

Sebelum dikirim ke Gemini:

lakukan preprocessing jika diperlukan:

- resize image
- compression reasonable
- correct orientation
- preserve text readability
- optional crop
- remove unnecessary metadata

Jangan melakukan compression berlebihan yang membuat teks buram.

Jika kamera menghasilkan resolusi sangat besar:
optimalkan ukuran payload.

==================================================
5.5 GEMINI PROMPT
==================================================

AI harus diarahkan menjadi receipt extraction engine.

Gunakan structured output.

AI harus mencoba membaca:

merchantName
transactionDate
transactionTime
items
subtotal
discount
tax
serviceCharge
total
paymentMethod
currency
category
notes

Untuk item:

name
quantity
unitPrice
totalPrice

Jika data tidak ditemukan:

gunakan null.

JANGAN mengarang data.

Jika angka tidak terbaca:
null

Jika tanggal tidak terbaca:
null

Jika merchant tidak terbaca:
null

AI harus membedakan:

"tidak terlihat"

dengan

"terlihat tetapi ambigu".

==================================================
5.6 OUTPUT JSON
==================================================

Gunakan struktur data semacam:

{
  "merchantName": null,
  "transactionDate": null,
  "transactionTime": null,
  "items": [],
  "subtotal": null,
  "discount": null,
  "tax": null,
  "serviceCharge": null,
  "total": null,
  "paymentMethod": null,
  "suggestedCategory": null,
  "confidence": {
    "merchantName": 0,
    "transactionDate": 0,
    "total": 0,
    "category": 0
  }
}

Tambahkan field:

needsReview: true

AI tidak boleh langsung membuat transaction hanya berdasarkan output model.

==================================================
5.7 PREVIEW / REVIEW PAGE
==================================================

SETELAH AI selesai:

Jangan langsung submit.

Buka:

"Review Hasil Scan"

Halaman ini harus menampilkan:

SECTION 1:
Preview gambar struk.

User dapat:
- zoom
- melihat gambar
- retake
- replace image

SECTION 2:
"Hasil Pembacaan AI"

Fields:

Nama Merchant
Tanggal
Waktu
Total
Subtotal
Diskon
Pajak
Metode Pembayaran
Kategori

SECTION 3:
"Item Belanja"

List:

Item
Qty
Harga

User dapat edit semua hasil AI.

--------------------------------------------------
5.8 AI CONFIDENCE
--------------------------------------------------

Jika confidence rendah:

beri visual indicator:

"Perlu diperiksa"

Contoh:

Total:
Rp128.500
⚠ Periksa hasil pembacaan

Jika confidence tinggi:
✓ Terbaca dengan baik

Jangan menggunakan confidence sebagai fakta absolut.

Confidence hanya indikator bantuan.

--------------------------------------------------
5.9 CATEGORY AI
--------------------------------------------------

AI boleh memberikan:

suggestedCategory

Contoh:

Merchant:
Indomaret

Suggested:
Belanja Harian

User tetap dapat mengganti.

Kategori harus mengambil dari kategori transaksi existing.

Jika AI menghasilkan kategori yang tidak ada:

mapping ke kategori existing.

Jika tidak ada mapping:
"Lainnya"

JANGAN otomatis membuat kategori baru tanpa persetujuan user.

--------------------------------------------------
5.10 CONFIRM TRANSACTION
--------------------------------------------------

Setelah user memeriksa hasil:

Button:

"Simpan Transaksi"

atau:

"Konfirmasi & Simpan"

Setelah dikonfirmasi:

buat transaction menggunakan data hasil review.

Transaction harus menyimpan:

- merchant
- amount
- date
- category
- account
- note
- source = "ai_receipt"
- receipt image reference jika architecture mendukung

==================================================
5.11 ERROR HANDLING
==================================================

Tangani minimal:

1. API Key tidak ada
2. API Key invalid
3. API quota habis
4. network error
5. timeout
6. image terlalu besar
7. image tidak terbaca
8. bukan gambar struk
9. Gemini gagal mengembalikan JSON
10. output JSON malformed
11. total tidak ditemukan
12. AI menghasilkan data ambigu

Contoh:

Jika bukan struk:

"Struk tidak dapat dikenali. Coba gunakan foto yang lebih jelas."

Jika API error:

"AI tidak dapat memproses gambar saat ini."

Berikan:
"Coba Lagi"

Jangan menampilkan raw API error kepada user.

==================================================
6. AI REVIEW PAGE
==================================================

Pada halaman AI yang existing:

Card:

"AI Keuangan Pribadi"

Tetap pertahankan:

- Scan Struk AI
- Insight Bulanan
- Chat AI

Untuk:

"Scan Struk AI"

pastikan benar-benar mengarah ke scanner yang telah diperbaiki.

Status API:

Jika active:
"AI Siap"

Jika inactive:
"Atur API Key"

Jika error:
"Periksa API Key"

==================================================
7. DATA CONSISTENCY
==================================================

Semua update harus menjaga konsistensi data.

Contoh debt payment:

source account:
-100.000

debt:
-100.000 outstanding

transaction:
+ debt_payment record

Jika debt = 0:
paid_off

Jangan hanya mengubah UI.

Update:
- database/local storage
- state
- derived calculations
- dashboard
- account balance
- transaction history
- debt summary

==================================================
8. STATE MANAGEMENT
==================================================

Jangan membuat state duplikat jika data sudah tersedia di global/store/database.

Gunakan single source of truth.

Contoh:

Household:
householdStore

Accounts:
accountStore

Transactions:
transactionStore

Bills:
billStore

AI:
aiStore

Jika project menggunakan architecture berbeda:
ikuti architecture existing.

==================================================
9. ROUTING
==================================================

Gunakan route existing jika sudah tersedia.

Expected conceptual routes:

/beranda
/analitik
/goals
/akun
/tagihan
/transaksi
/ai
/ai/scan
/ai/review
/akun/ai
/keluarga
/keluarga/edit

JANGAN membuat duplicate route apabila route equivalent sudah tersedia.

==================================================
10. RESPONSIVE MOBILE UI
==================================================

Target utama adalah mobile.

Gunakan screenshot sebagai baseline.

Pertahankan:

- bottom navigation fixed
- floating + button
- card radius
- spacing
- typography
- touch target minimum yang nyaman
- safe area

Pastikan:

three-dot menu
Bayar & Catat
Edit
Delete
buttons

tidak saling overlap.

Untuk small screens:
gunakan wrapping / bottom sheet.

==================================================
11. ACCESSIBILITY
==================================================

Semua interactive icon harus mempunyai:

aria-label / accessible label.

Contoh:

icon rantai putus:
"Putuskan hubungan"

three-dot:
"Menu tagihan"

plus:
"Buka tagihan"

camera:
"Ambil foto struk"

gallery:
"Pilih gambar struk"

delete:
"Hapus tagihan"

==================================================
12. BACKWARD COMPATIBILITY
==================================================

Data existing harus tetap dapat dibaca.

Jika field baru dibutuhkan:

gunakan default value.

Contoh:

debtStatus:
existing debt → "active"

icon:
existing bill tanpa icon → fallback "receipt"

partnerStatus:
existing connected household → derive dari existing relationship data.

Jangan membuat migration yang menghapus data.

==================================================
13. EDGE CASES
==================================================

Handle:

- user tidak punya pasangan
- invitation pending
- pasangan terhubung
- pasangan unlink
- household name kosong
- debt sebagian dibayar
- debt lunas
- debt payment lebih besar dari hutang
- account debt sudah lunas
- account debt digunakan kembali
- bill sudah lunas
- bill overdue
- bill recurring
- user menghapus bill
- user edit bill
- AI API key belum tersedia
- API key invalid
- AI timeout
- foto struk blur
- foto bukan struk
- struk tidak memiliki total
- struk menggunakan format tanggal berbeda
- user membatalkan review
- user mengganti hasil AI
- user submit dua kali

==================================================
14. TRANSACTION SAFETY
==================================================

Pastikan tombol:

"Simpan Transaksi"

tidak menyebabkan duplicate transaction jika ditekan berkali-kali.

Gunakan:
- loading state
- disabled state
- idempotency jika architecture mendukung

Setelah berhasil:

show success feedback:

"Transaksi berhasil disimpan"

==================================================
15. TESTING
==================================================

Setelah implementasi:

Jalankan:

- lint
- typecheck
- unit test
- build
- existing test suite

Jika ada test infrastructure:
tambahkan test untuk:

A. Partner
- single → connected
- connected → edit
- connected → unlink confirmation

B. Debt
- active debt
- partial payment
- full payment
- paid-off account conversion

C. Bill
- edit
- delete
- icon selection
- three-dot menu
- Beranda + → /tagihan

D. AI
- no API key
- valid API key
- invalid API key
- image upload
- AI extraction
- malformed JSON
- review
- edit result
- save transaction
- duplicate prevention

==================================================
16. ACCEPTANCE CRITERIA
==================================================

FEATURE 1:
Jika user sudah memiliki pasangan, UI tidak lagi menampilkan:

"Buat Kode Undangan"

dan

"Masukkan Kode Pasangan"

Tetapi menampilkan:

Detail Keluarga
+
Nama keluarga
+
User
+
Pasangan
+
Edit
+
Putuskan Hubungan

--------------------------------------------------

FEATURE 2:

Jika debt sudah lunas:

user dapat mengubah:
- nama account
- icon
- jenis account

menjadi account biasa.

History tetap aman.

--------------------------------------------------

FEATURE 3:

Debt aktif muncul pada:

Catat Transaksi → Pengeluaran → Hutang & Kewajiban

dan dapat dibayar dari account lain.

--------------------------------------------------

FEATURE 4:

Button:

"Bayar & Catat"

berada di pojok kanan atas card tagihan.

Three-dot menu tersedia.

--------------------------------------------------

FEATURE 5:

Icon "+" pada section tagihan di Beranda:

WAJIB navigate ke:

/tagihan

dan tidak membuat tagihan langsung.

--------------------------------------------------

FEATURE 6:

Setiap tagihan memiliki:

⋮

untuk edit/manage.

User dapat mengubah:
- nama
- nominal
- icon
- tanggal
- recurring
- kategori
- reminder
- metadata yang didukung.

--------------------------------------------------

FEATURE 7:

Scan Struk AI:

Camera/Gallery
↓
Image Preview
↓
Gemini Vision
↓
OCR / extraction
↓
Structured result
↓
Review page
↓
User correction
↓
Confirm
↓
Transaction

JANGAN:

Camera
↓
AI
↓
langsung transaction

==================================================
17. IMPORTANT ENGINEERING RULES
==================================================

JANGAN:

- rewrite seluruh aplikasi
- membuat dummy data sebagai pengganti database existing
- membuat fake AI response
- menggunakan setTimeout untuk berpura-pura AI sedang bekerja
- hardcode hasil OCR
- hardcode API Key
- menyimpan API Key di source code
- menghapus data existing
- mengubah UI unrelated
- mengubah bottom navigation
- membuat duplicate components
- membuat duplicate route
- menggunakan emoji sebagai replacement icon system
- mengabaikan error handling
- langsung menyimpan hasil AI tanpa review

JIKA menemukan implementasi existing yang hampir benar:

PERBAIKI implementation tersebut.

Jangan membuat sistem paralel.

==================================================
18. DEVELOPMENT WORKFLOW
==================================================

Sebelum coding:

1. Scan struktur project.
2. Identifikasi framework.
3. Identifikasi routing.
4. Identifikasi state management.
5. Identifikasi database/storage.
6. Cari component:
   - account
   - household
   - partner
   - bills
   - transaction
   - AI
   - scanner
7. Cari existing Gemini integration.
8. Cari existing API key encryption/storage.
9. Cari existing icon system.
10. Cari existing test.

Setelah memahami architecture:

buat implementation plan internal.

Kemudian implementasikan secara incremental.

Setelah setiap kelompok selesai:
- typecheck
- lint
- test
- build

Jangan menunggu sampai seluruh fitur selesai untuk menemukan error.

==================================================
19. PRIORITY ORDER
==================================================

PRIORITY 1:
AI Receipt Scanner Bug Fix

PRIORITY 2:
Partner / Household Connected State

PRIORITY 3:
Debt Payment → Transaction Integration

PRIORITY 4:
Debt Paid-Off → Normal Account Conversion

PRIORITY 5:
Bill Management / Three Dot / Edit / Icon

PRIORITY 6:
Beranda Bill "+" Navigation

PRIORITY 7:
Final UI polish + regression testing

==================================================
20. FINAL VERIFICATION
==================================================

Sebelum menyatakan pekerjaan selesai, lakukan audit:

[ ] Partner connected state bekerja
[ ] Family detail bekerja
[ ] Edit family bekerja
[ ] Unlink confirmation bekerja
[ ] Debt payment bekerja
[ ] Debt balance ter-update
[ ] Paid-off state bekerja
[ ] Account conversion bekerja
[ ] Bill three-dot bekerja
[ ] Bill edit bekerja
[ ] Bill icon bekerja
[ ] Bayar & Catat berada di posisi baru
[ ] Beranda bill "+" menuju /tagihan
[ ] AI API Key validation bekerja
[ ] Gemini >= 2.5 digunakan
[ ] Image upload bekerja
[ ] Camera flow bekerja
[ ] AI vision bekerja
[ ] Structured extraction bekerja
[ ] Review screen bekerja
[ ] User dapat mengedit hasil AI
[ ] Transaction baru hanya dibuat setelah confirmation
[ ] Error handling bekerja
[ ] Duplicate transaction dicegah
[ ] Existing data aman
[ ] Existing feature tidak rusak
[ ] Responsive mobile aman
[ ] lint pass
[ ] typecheck pass
[ ] test pass
[ ] production build pass

==================================================
FINAL INSTRUCTION
==================================================

Implementasikan requirement di atas langsung ke existing CoupleCash codebase.

Jangan hanya membuat UI mockup.

Semua button harus benar-benar berfungsi.

Semua state harus benar-benar terhubung dengan data.

Semua perubahan harus mempertahankan architecture existing.

Jika ada bagian requirement yang bertentangan dengan implementation existing, prioritaskan:
1. data integrity
2. existing architecture
3. business logic
4. requirement baru
5. visual polish

Jika menemukan bug tambahan yang secara langsung disebabkan oleh perubahan ini, perbaiki juga.

Setelah selesai, berikan ringkasan:
- file/component yang diubah
- feature yang berhasil diimplementasikan
- bug yang diperbaiki
- migration/data model yang ditambahkan
- test yang dijalankan
- hasil build
- issue yang masih membutuhkan keputusan product owner

Jangan mengklaim fitur "berhasil" jika implementation sebenarnya masih mock/dummy.